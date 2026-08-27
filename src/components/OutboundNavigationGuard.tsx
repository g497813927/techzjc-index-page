"use client";

import { useEffect } from "react";
import {
  canonicalizeNavigationUrl,
  classifyNavigation,
  redactNavigationUrl,
  shouldAdoptExternalLinkManifest,
  unwrapApiEnvelope,
  validateExternalLinkManifest,
} from "@/lib/browserSecurity";

type GuardCopy = {
  confirm: string;
  blocked: string;
};

type AuditAction = "blocked" | "cancelled" | "confirmed";
type AuditTrigger = "link" | "window-open";

const AUDIT_ENDPOINT = "/api/security/navigation";
const MAX_AUDIT_EVENTS_PER_PAGE = 24;
const EXTERNAL_LINK_MANIFEST_REVISION = "2026-08-27-1";
const EXTERNAL_LINK_MANIFEST_URL =
  `https://api.techzjc.com/v1/navigation/external-links?revision=${encodeURIComponent(EXTERNAL_LINK_MANIFEST_REVISION)}`;
const EXTERNAL_LINK_CACHE_KEY =
  `techzjc:external-links:v1:${EXTERNAL_LINK_MANIFEST_REVISION}`;
const LEGACY_EXTERNAL_LINK_CACHE_KEY = "techzjc:external-links:v1";
const EXTERNAL_LINK_REFRESH_INTERVAL_MS = 5 * 60 * 1_000;
const EXTERNAL_LINK_CACHE_MAX_AGE_MS = 15 * 60 * 1_000;
const MAX_EXTERNAL_LINK_MANIFEST_LENGTH = 2_250_000;
const EMPTY_TRUSTED_URLS: readonly string[] = [];

type ActiveExternalLinkManifest = {
  revision: string;
  issuedAt: string;
  issuedAtMs: number;
  servedAt: string;
  servedAtMs: number;
  expiresAt: string;
  expiresAtMs: number;
  cachedAtMs: number;
  usableUntilMs: number;
  urls: Set<string>;
};

function parseExternalLinkManifest(
  value: unknown,
  now = Date.now(),
  cachedAtMs = now,
): ActiveExternalLinkManifest | null {
  const validated = validateExternalLinkManifest(value, {
    now,
    expectedRevision: EXTERNAL_LINK_MANIFEST_REVISION,
  });
  if (!validated.ok) {
    return null;
  }

  const expiresAtMs = Date.parse(validated.expiresAt);
  const issuedAtMs = Date.parse(validated.issuedAt);
  const servedAtMs = Date.parse(validated.servedAt);
  if (
    !Number.isFinite(expiresAtMs) ||
    !Number.isFinite(issuedAtMs) ||
    !Number.isFinite(servedAtMs) ||
    expiresAtMs <= now ||
    !Number.isFinite(cachedAtMs) ||
    cachedAtMs > now ||
    now - cachedAtMs > EXTERNAL_LINK_CACHE_MAX_AGE_MS
  ) {
    return null;
  }

  return {
    revision: validated.revision,
    issuedAt: validated.issuedAt,
    issuedAtMs,
    servedAt: validated.servedAt,
    servedAtMs,
    expiresAt: validated.expiresAt,
    expiresAtMs,
    cachedAtMs,
    usableUntilMs: Math.min(
      expiresAtMs,
      cachedAtMs + EXTERNAL_LINK_CACHE_MAX_AGE_MS,
    ),
    urls: validated.urls,
  };
}

function readCachedExternalLinkManifest() {
  try {
    const cached = window.localStorage.getItem(EXTERNAL_LINK_CACHE_KEY);
    if (!cached) {
      return null;
    }
    if (cached.length > MAX_EXTERNAL_LINK_MANIFEST_LENGTH) {
      window.localStorage.removeItem(EXTERNAL_LINK_CACHE_KEY);
      return null;
    }

    const cachedDocument = JSON.parse(cached) as Record<string, unknown>;
    const parsed = parseExternalLinkManifest(
      cachedDocument,
      Date.now(),
      typeof cachedDocument.cachedAtMs === "number"
        ? cachedDocument.cachedAtMs
        : Number.NaN,
    );
    if (!parsed) {
      window.localStorage.removeItem(EXTERNAL_LINK_CACHE_KEY);
    }
    return parsed;
  } catch {
    return null;
  }
}

function cacheExternalLinkManifest(manifest: ActiveExternalLinkManifest) {
  try {
    window.localStorage.setItem(
      EXTERNAL_LINK_CACHE_KEY,
      JSON.stringify({
        schemaVersion: 1,
        revision: manifest.revision,
        issuedAt: manifest.issuedAt,
        servedAt: manifest.servedAt,
        expiresAt: manifest.expiresAt,
        cachedAtMs: manifest.cachedAtMs,
        urls: [...manifest.urls],
      }),
    );
  } catch {
    // The in-memory manifest remains usable when storage is unavailable.
  }
}

async function fetchExternalLinkManifest(signal: AbortSignal) {
  const response = await fetch(EXTERNAL_LINK_MANIFEST_URL, {
    cache: "no-cache",
    credentials: "omit",
    headers: { Accept: "application/json" },
    mode: "cors",
    referrerPolicy: "no-referrer",
    signal,
  });
  if (!response.ok) {
    return null;
  }

  const declaredLength = Number(response.headers.get("content-length") ?? 0);
  if (declaredLength > MAX_EXTERNAL_LINK_MANIFEST_LENGTH) {
    return null;
  }

  const rawManifest = await response.text();
  if (rawManifest.length > MAX_EXTERNAL_LINK_MANIFEST_LENGTH) {
    return null;
  }

  try {
    return parseExternalLinkManifest(
      unwrapApiEnvelope(JSON.parse(rawManifest)),
    );
  } catch {
    return null;
  }
}

function createEventId() {
  const bytes = new Uint8Array(16);
  globalThis.crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function interpolate(message: string, destination: string) {
  return message.replace("{destination}", destination);
}

function destinationLabel(url?: URL) {
  if (!url) {
    return "unknown";
  }
  return url.hostname || url.protocol.replace(/:$/, "");
}

function findAnchor(event: MouseEvent) {
  const fromPath = event
    .composedPath()
    .find((target): target is HTMLAnchorElement =>
      target instanceof HTMLAnchorElement,
    );

  if (fromPath) {
    return fromPath;
  }

  return event.target instanceof Element
    ? event.target.closest<HTMLAnchorElement>("a[href]")
    : null;
}

export function OutboundNavigationGuard({
  copy,
  trustedHostnames,
}: {
  copy: GuardCopy;
  trustedHostnames: string[];
}) {
  useEffect(() => {
    let auditEventsSent = 0;
    try {
      // Pre-revision caches could be overwritten by an older deployed tab.
      window.localStorage.removeItem(LEGACY_EXTERNAL_LINK_CACHE_KEY);
    } catch {
      // Storage is optional; the revision-scoped cache remains fail-closed.
    }
    let activeManifest = readCachedExternalLinkManifest();
    let allowlistRequest: AbortController | null = null;
    let disposed = false;

    const getTrustedUrls = () => {
      if (!activeManifest || activeManifest.usableUntilMs <= Date.now()) {
        activeManifest = null;
        try {
          window.localStorage.removeItem(EXTERNAL_LINK_CACHE_KEY);
        } catch {
          // Storage is optional; an empty set keeps navigation fail-closed.
        }
        return EMPTY_TRUSTED_URLS;
      }

      return activeManifest.urls;
    };

    const refreshExternalLinkManifest = async () => {
      if (allowlistRequest) {
        return;
      }

      const controller = new AbortController();
      allowlistRequest = controller;
      try {
        const manifest = await fetchExternalLinkManifest(controller.signal);
        if (
          !disposed &&
          manifest &&
          shouldAdoptExternalLinkManifest(manifest, activeManifest)
        ) {
          activeManifest = manifest;
          cacheExternalLinkManifest(manifest);
        }
      } catch {
        // A still-valid cached manifest may be used; otherwise links confirm.
      } finally {
        if (allowlistRequest === controller) {
          allowlistRequest = null;
        }
      }
    };

    const classifyDestination = (rawDestination: string | URL) => {
      const currentUrl = window.location.href;
      const canonicalDestination = canonicalizeNavigationUrl(
        rawDestination,
        currentUrl,
      );
      const trustedUrls = getTrustedUrls();
      const options = {
        currentUrl,
        trustedHostnames,
        trustedUrls,
      };

      if (!canonicalDestination) {
        const result = classifyNavigation(rawDestination, options);
        return result.decision === "block"
          ? result
          : {
              decision: "block" as const,
              url: result.url,
              reason: "invalid-url",
            };
      }

      const result = classifyNavigation(canonicalDestination, options);
      if (
        result.decision === "confirm" &&
        trustedUrls === EMPTY_TRUSTED_URLS
      ) {
        return { ...result, reason: "allowlist-unavailable" };
      }

      return result;
    };

    const record = (
      action: AuditAction,
      trigger: AuditTrigger,
      rawDestination: string | URL,
      reason: string,
      userInitiated: boolean,
    ) => {
      if (auditEventsSent >= MAX_AUDIT_EVENTS_PER_PAGE) {
        return;
      }
      auditEventsSent += 1;

      const payload = JSON.stringify({
        version: 1,
        eventId: createEventId(),
        action,
        trigger,
        reason,
        occurredAt: new Date().toISOString(),
        userInitiated,
        source: redactNavigationUrl(window.location.href),
        destination: redactNavigationUrl(rawDestination, window.location.href),
      });
      const body = new Blob([payload], { type: "application/json" });

      if (navigator.sendBeacon?.(AUDIT_ENDPOINT, body)) {
        return;
      }

      void fetch(AUDIT_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: payload,
        credentials: "same-origin",
        keepalive: true,
      }).catch(() => undefined);
    };

    const handleLinkActivation = (event: MouseEvent) => {
      const anchor = findAnchor(event);
      if (!anchor?.href) {
        return;
      }

      const result = classifyDestination(anchor.href);

      if (result.decision === "allow") {
        if (anchor.target.toLowerCase() === "_blank") {
          anchor.relList.add("noopener", "noreferrer");
        }
        return;
      }

      if (result.decision === "block" || !event.isTrusted) {
        event.preventDefault();
        event.stopImmediatePropagation();
        record(
          "blocked",
          "link",
          result.url ?? anchor.href,
          result.reason,
          event.isTrusted,
        );
        if (event.isTrusted) {
          window.alert(interpolate(copy.blocked, destinationLabel(result.url)));
        }
        return;
      }

      const confirmed = window.confirm(
        interpolate(copy.confirm, destinationLabel(result.url)),
      );
      record(
        confirmed ? "confirmed" : "cancelled",
        "link",
        result.url ?? anchor.href,
        result.reason,
        true,
      );

      if (!confirmed) {
        event.preventDefault();
        event.stopImmediatePropagation();
      } else if (anchor.target.toLowerCase() === "_blank") {
        anchor.relList.add("noopener", "noreferrer");
      }
    };

    const handleLinkClick = (event: MouseEvent) => {
      if (event.button === 0) {
        handleLinkActivation(event);
      }
    };

    const handleLinkAuxClick = (event: MouseEvent) => {
      if (event.button === 1) {
        handleLinkActivation(event);
      }
    };

    const originalOpen = window.open;
    const guardedOpen: typeof window.open = (url, target, features) => {
      const externalWindowFeatures = [features, "noopener", "noreferrer"]
        .filter(Boolean)
        .join(",");

      if (url === undefined || url === "") {
        const openedWindow = originalOpen.call(
          window,
          url,
          target,
          externalWindowFeatures,
        );
        try {
          if (openedWindow) {
            openedWindow.opener = null;
          }
        } catch {
          // Modern browsers normally return null for a noopener popup.
        }
        return openedWindow;
      }

      const result = classifyDestination(url);

      if (result.decision === "allow") {
        return originalOpen.call(window, url, target, externalWindowFeatures);
      }

      const userInitiated = navigator.userActivation?.isActive ?? false;
      if (result.decision === "block") {
        record(
          "blocked",
          "window-open",
          result.url ?? url,
          result.reason,
          userInitiated,
        );
        if (userInitiated) {
          window.alert(interpolate(copy.blocked, destinationLabel(result.url)));
        }
        return null;
      }

      const confirmed = window.confirm(
        interpolate(copy.confirm, destinationLabel(result.url)),
      );
      record(
        confirmed ? "confirmed" : "cancelled",
        "window-open",
        result.url ?? url,
        result.reason,
        userInitiated,
      );

      return confirmed
        ? originalOpen.call(window, url, target, externalWindowFeatures)
        : null;
    };

    void refreshExternalLinkManifest();
    const refreshInterval = window.setInterval(
      () => void refreshExternalLinkManifest(),
      EXTERNAL_LINK_REFRESH_INTERVAL_MS,
    );
    document.addEventListener("click", handleLinkClick, true);
    document.addEventListener("auxclick", handleLinkAuxClick, true);
    window.open = guardedOpen;

    return () => {
      disposed = true;
      window.clearInterval(refreshInterval);
      allowlistRequest?.abort();
      document.removeEventListener("click", handleLinkClick, true);
      document.removeEventListener("auxclick", handleLinkAuxClick, true);
      if (window.open === guardedOpen) {
        window.open = originalOpen;
      }
    };
  }, [copy.blocked, copy.confirm, trustedHostnames]);

  return null;
}
