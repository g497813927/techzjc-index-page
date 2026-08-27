const APPLICATION_HOSTNAMES = new Set(["techzjc.com", "test-cn.techzjc.com"]);
const MAX_EXTERNAL_LINK_ENTRIES = 1_024;
const MAX_EXTERNAL_LINK_URL_LENGTH = 2_048;
const MAX_EXTERNAL_LINK_REVISION_LENGTH = 128;
const MAX_EXTERNAL_LINK_RESPONSE_AGE_MS = 15 * 60 * 1_000;
const MAX_CLOCK_SKEW_MS = 5 * 60 * 1_000;
const SAFE_NAVIGATION_PROTOCOLS = new Set([
  "http:",
  "https:",
  "mailto:",
  "tel:",
]);

type Environment = Readonly<Record<string, string | undefined>>;

export type NavigationDecision = "allow" | "confirm" | "block";

export interface NavigationClassification {
  decision: NavigationDecision;
  url?: URL;
  reason: string;
}

export interface NavigationOptions {
  currentUrl: string | URL;
  trustedHostnames?: readonly string[];
  trustedUrls?: Iterable<string | URL>;
}

export interface ExternalLinkManifestValidationOptions {
  now?: number | Date;
  maxEntries?: number;
  expectedRevision?: string;
}

export type ExternalLinkManifestValidationResult =
  | {
      ok: true;
      revision: string;
      issuedAt: string;
      servedAt: string;
      expiresAt: string;
      urls: Set<string>;
    }
  | {
      ok: false;
      reason: string;
    };

export interface RedactedNavigationUrl {
  protocol: string;
  hostname: string;
  port: string;
  pathname: string;
  queryKeys: string[];
  hadFragment: boolean;
}

export interface ExternalLinkManifestVersion {
  revision: string;
  issuedAtMs: number;
  servedAtMs: number;
  urls: ReadonlySet<string>;
}

export interface ContentSecurityPolicyOptions {
  isDevelopment?: boolean;
}

type ParsedHostAuthority = {
  authority: string;
  hostname: string;
};

export function unwrapApiEnvelope(value: unknown): unknown | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  const envelope = value as Record<string, unknown>;
  if (
    envelope.code !== 0 ||
    typeof envelope.message !== "string" ||
    !("data" in envelope)
  ) {
    return null;
  }
  return envelope.data;
}

export function normalizeHostname(value: string | null | undefined): string {
  if (!value) {
    return "";
  }

  const firstValue = value.split(",")[0]?.trim();
  if (!firstValue) {
    return "";
  }

  try {
    const parsed = new URL(
      firstValue.includes("://") ? firstValue : `https://${firstValue}`,
    );
    return parsed.hostname.toLowerCase().replace(/\.$/, "");
  } catch {
    return "";
  }
}

/** Select the leftmost value from a comma-separated forwarding header. */
export function firstHeaderListValue(value: string | null | undefined): string {
  return value?.split(",")[0]?.trim() ?? "";
}

/** Parse an HTTP Host authority without accepting URL syntax or credentials. */
function parseHostAuthority(
  value: string | null | undefined,
): ParsedHostAuthority | null {
  const source = value ?? "";
  const raw = source.trim().toLowerCase();
  if (
    !raw ||
    source !== source.trim() ||
    /[\s/\\@?#,]/.test(raw) ||
    raw.includes("://")
  ) {
    return null;
  }

  const match = raw.startsWith("[")
    ? /^(\[::1\])(?::(\d{1,5}))?$/.exec(raw)
    : /^([a-z0-9.-]+)(?::(\d{1,5}))?$/.exec(raw);
  if (!match) {
    return null;
  }

  const port = match[2];
  if (port && (Number(port) < 1 || Number(port) > 65_535)) {
    return null;
  }

  const authorityHostname = match[1];
  const hostname = authorityHostname.replace(/\.$/, "");
  const authority = port
    ? `${authorityHostname}:${port}`
    : authorityHostname;

  try {
    const parsed = new URL(`http://${authority}`);
    if (parsed.hostname.toLowerCase() !== authorityHostname) {
      return null;
    }
  } catch {
    return null;
  }

  return {
    authority,
    hostname,
  };
}

export function normalizeHostAuthority(
  value: string | null | undefined,
): string {
  return parseHostAuthority(value)?.authority ?? "";
}

export function normalizeHostHeader(value: string | null | undefined): string {
  return parseHostAuthority(value)?.hostname ?? "";
}

export function isLoopbackHostname(hostname: string): boolean {
  const normalized = normalizeHostname(hostname);
  return (
    normalized === "localhost" ||
    normalized === "127.0.0.1" ||
    normalized === "[::1]" ||
    normalized === "::1"
  );
}

export function isOwnedSiteHostname(hostname: string): boolean {
  const normalized = normalizeHostname(hostname);
  return APPLICATION_HOSTNAMES.has(normalized);
}

/**
 * Canonicalize a navigation target for exact allowlist comparison. Path case,
 * query values/order, and fragments remain significant because hash routers
 * may assign client-side behavior to fragment values.
 */
export function canonicalizeNavigationUrl(
  rawDestination: string | URL,
  baseUrl?: string | URL,
): string | null {
  let destination: URL;

  try {
    destination = baseUrl
      ? new URL(rawDestination, baseUrl)
      : new URL(rawDestination);
  } catch {
    return null;
  }

  if (!SAFE_NAVIGATION_PROTOCOLS.has(destination.protocol)) {
    return null;
  }

  if (destination.username || destination.password) {
    return null;
  }

  if (destination.protocol === "http:" || destination.protocol === "https:") {
    const hostname = normalizeHostname(destination.hostname);
    if (!hostname) {
      return null;
    }
    destination.hostname = hostname;
  }

  return destination.href;
}

/**
 * Validate the public external-link manifest before it can influence browser
 * navigation. Invalid, expired, or oversized manifests deliberately produce no
 * trusted URL set so callers can fail closed to their confirmation flow.
 */
export function validateExternalLinkManifest(
  value: unknown,
  options: ExternalLinkManifestValidationOptions = {},
): ExternalLinkManifestValidationResult {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { ok: false, reason: "invalid-document" };
  }

  const manifest = value as Record<string, unknown>;
  if (manifest.schemaVersion !== 1) {
    return { ok: false, reason: "unsupported-schema" };
  }

  if (
    typeof manifest.revision !== "string" ||
    manifest.revision.length === 0 ||
    manifest.revision.length > MAX_EXTERNAL_LINK_REVISION_LENGTH ||
    manifest.revision.trim() !== manifest.revision
  ) {
    return { ok: false, reason: "invalid-revision" };
  }
  if (
    options.expectedRevision !== undefined &&
    manifest.revision !== options.expectedRevision
  ) {
    return { ok: false, reason: "unexpected-revision" };
  }

  if (typeof manifest.expiresAt !== "string") {
    return { ok: false, reason: "invalid-expiry" };
  }
  const expiresAt = Date.parse(manifest.expiresAt);
  const configuredNow =
    options.now instanceof Date ? options.now.getTime() : options.now;
  const now =
    typeof configuredNow === "number" && Number.isFinite(configuredNow)
      ? configuredNow
      : Date.now();
  if (!Number.isFinite(expiresAt)) {
    return { ok: false, reason: "invalid-expiry" };
  }
  if (expiresAt <= now) {
    return { ok: false, reason: "expired" };
  }

  if (typeof manifest.issuedAt !== "string") {
    return { ok: false, reason: "invalid-issued-at" };
  }
  const issuedAt = Date.parse(manifest.issuedAt);
  if (!Number.isFinite(issuedAt) || issuedAt > now + MAX_CLOCK_SKEW_MS) {
    return { ok: false, reason: "invalid-issued-at" };
  }

  if (typeof manifest.servedAt !== "string") {
    return { ok: false, reason: "invalid-served-at" };
  }
  const servedAt = Date.parse(manifest.servedAt);
  if (
    !Number.isFinite(servedAt) ||
    servedAt < issuedAt ||
    servedAt > now + MAX_CLOCK_SKEW_MS ||
    now - servedAt > MAX_EXTERNAL_LINK_RESPONSE_AGE_MS
  ) {
    return { ok: false, reason: "stale-response" };
  }

  if (!Array.isArray(manifest.urls)) {
    return { ok: false, reason: "invalid-urls" };
  }
  const requestedLimit = Number.isSafeInteger(options.maxEntries)
    ? Number(options.maxEntries)
    : MAX_EXTERNAL_LINK_ENTRIES;
  const maxEntries = Math.min(
    MAX_EXTERNAL_LINK_ENTRIES,
    Math.max(0, requestedLimit),
  );
  if (manifest.urls.length > maxEntries) {
    return { ok: false, reason: "too-many-urls" };
  }

  const urls = new Set<string>();
  for (const rawUrl of manifest.urls) {
    if (
      typeof rawUrl !== "string" ||
      rawUrl.length === 0 ||
      rawUrl.length > MAX_EXTERNAL_LINK_URL_LENGTH
    ) {
      return { ok: false, reason: "invalid-url" };
    }

    const canonicalUrl = canonicalizeNavigationUrl(rawUrl);
    if (!canonicalUrl) {
      return { ok: false, reason: "invalid-url" };
    }
    urls.add(canonicalUrl);
  }

  return {
    ok: true,
    revision: manifest.revision,
    issuedAt: manifest.issuedAt,
    servedAt: manifest.servedAt,
    expiresAt: manifest.expiresAt,
    urls,
  };
}

/**
 * Prevent a cached manifest from being replaced by an older or conflicting
 * document. A publisher must advance `issuedAt` when changing a revision or
 * URL set; repeated responses for the same document may only advance servedAt.
 */
export function shouldAdoptExternalLinkManifest(
  candidate: ExternalLinkManifestVersion,
  current: ExternalLinkManifestVersion | null,
): boolean {
  if (!current) {
    return true;
  }
  if (candidate.issuedAtMs !== current.issuedAtMs) {
    return candidate.issuedAtMs > current.issuedAtMs;
  }
  if (
    candidate.revision !== current.revision ||
    candidate.servedAtMs < current.servedAtMs ||
    candidate.urls.size !== current.urls.size
  ) {
    return false;
  }
  return [...candidate.urls].every((url) => current.urls.has(url));
}

export function calculateExternalLinkManifestUsableUntil(
  expiresAtMs: number,
  servedAtMs: number,
  cachedAtMs: number,
  cacheMaxAgeMs: number,
): number {
  if (
    ![expiresAtMs, servedAtMs, cachedAtMs, cacheMaxAgeMs].every(Number.isFinite) ||
    cacheMaxAgeMs < 0
  ) {
    return Number.NaN;
  }

  return Math.min(
    expiresAtMs,
    servedAtMs + MAX_EXTERNAL_LINK_RESPONSE_AGE_MS,
    cachedAtMs + cacheMaxAgeMs,
  );
}

export function getConfiguredVercelHostnames(env: Environment): string[] {
  return [
    env.VERCEL_URL,
    env.VERCEL_BRANCH_URL,
    env.VERCEL_PROJECT_PRODUCTION_URL,
  ]
    .map(normalizeHostname)
    .filter(
      (hostname, index, hostnames) =>
        Boolean(hostname) && hostnames.indexOf(hostname) === index,
    );
}

/**
 * Decide whether an incoming Host header belongs to this application.
 * Vercel hosts are exact values supplied by Vercel; this deliberately avoids
 * trusting every tenant under the shared vercel.app suffix.
 */
export function isAllowedApplicationHost(
  hostHeader: string | null | undefined,
  env: Environment,
): boolean {
  const hostname = normalizeHostHeader(hostHeader);
  if (!hostname) {
    return false;
  }

  if (APPLICATION_HOSTNAMES.has(hostname)) {
    return true;
  }

  if (getConfiguredVercelHostnames(env).includes(hostname)) {
    return true;
  }

  return env.NODE_ENV === "development" && isLoopbackHostname(hostname);
}

export function classifyNavigation(
  rawDestination: string | URL,
  options: NavigationOptions,
): NavigationClassification {
  let currentUrl: URL;
  let destination: URL;

  try {
    currentUrl = new URL(options.currentUrl);
    destination = new URL(rawDestination, currentUrl);
  } catch {
    return { decision: "block", reason: "invalid-url" };
  }

  if (!SAFE_NAVIGATION_PROTOCOLS.has(destination.protocol)) {
    return { decision: "block", url: destination, reason: "unsafe-protocol" };
  }

  if (destination.username || destination.password) {
    return { decision: "block", url: destination, reason: "url-credentials" };
  }

  if (
    (destination.protocol === "http:" || destination.protocol === "https:") &&
    destination.origin === currentUrl.origin
  ) {
    return { decision: "allow", url: destination, reason: "same-origin" };
  }

  if (
    destination.protocol === "https:" &&
    destination.port === "" &&
    isOwnedSiteHostname(destination.hostname)
  ) {
    return { decision: "allow", url: destination, reason: "application-host" };
  }

  if (
    (destination.protocol === "http:" || destination.protocol === "https:") &&
    isLoopbackHostname(currentUrl.hostname) &&
    isLoopbackHostname(destination.hostname)
  ) {
    return { decision: "allow", url: destination, reason: "local-development" };
  }

  const configuredHosts = (options.trustedHostnames ?? [])
    .map(normalizeHostname)
    .filter(Boolean);
  if (
    destination.protocol === "https:" &&
    destination.port === "" &&
    configuredHosts.includes(normalizeHostname(destination.hostname))
  ) {
    return { decision: "allow", url: destination, reason: "deployment-host" };
  }

  const canonicalDestination = canonicalizeNavigationUrl(destination);
  if (canonicalDestination && options.trustedUrls) {
    for (const rawTrustedUrl of options.trustedUrls) {
      if (canonicalizeNavigationUrl(rawTrustedUrl) === canonicalDestination) {
        return {
          decision: "allow",
          url: destination,
          reason: "allowlisted-url",
        };
      }
    }
  }

  return { decision: "confirm", url: destination, reason: "untrusted-link" };
}

/**
 * Return only fields useful for incident correlation. Paths, queries,
 * fragments, credentials, and mail addresses are intentionally never retained.
 */
export function redactNavigationUrl(
  rawUrl: string | URL,
  baseUrl?: string | URL,
): RedactedNavigationUrl {
  let parsed: URL;
  try {
    parsed = baseUrl ? new URL(rawUrl, baseUrl) : new URL(rawUrl);
  } catch {
    return {
      protocol: "invalid",
      hostname: "",
      port: "",
      pathname: "",
      queryKeys: [],
      hadFragment: false,
    };
  }

  const isWebUrl = parsed.protocol === "http:" || parsed.protocol === "https:";
  return {
    protocol: parsed.protocol.slice(0, 16),
    hostname: isWebUrl ? normalizeHostname(parsed.hostname).slice(0, 253) : "",
    port: isWebUrl ? parsed.port.slice(0, 5) : "",
    pathname: "[redacted]",
    queryKeys: [],
    hadFragment: Boolean(parsed.hash),
  };
}

/**
 * A cache-safe CSP for the statically rendered site. `unsafe-inline` is kept
 * for Next.js hydration data, the theme bootstrap, JSON-LD, and existing React
 * inline styles. External executable code remains restricted to the app and
 * the two explicitly used analytics providers.
 */
export function buildContentSecurityPolicy(
  options: ContentSecurityPolicyOptions = {},
): string {
  const scriptSources = [
    "'self'",
    "'unsafe-inline'",
    ...(options.isDevelopment ? ["'unsafe-eval'"] : []),
    "https://www.googletagmanager.com",
    "https://va.vercel-scripts.com",
  ];
  const connectSources = [
    "'self'",
    "https://www.google-analytics.com",
    "https://*.google-analytics.com",
    "https://*.analytics.google.com",
    "https://www.googletagmanager.com",
    "https://api.techzjc.com",
    "https://vitals.vercel-insights.com",
    "https://*.ingest.us.sentry.io",
    "https://*.ingest.sentry.io",
    ...(options.isDevelopment ? ["ws:"] : []),
  ];

  const directives: string[][] = [
    ["default-src", "'self'"],
    ["base-uri", "'self'"],
    ["script-src", ...scriptSources],
    ["script-src-attr", "'none'"],
    ["style-src", "'self'", "'unsafe-inline'"],
    [
      "img-src",
      "'self'",
      "data:",
      "blob:",
      "https://static.techzjc.com",
      "https://www.google-analytics.com",
      "https://*.google-analytics.com",
      "https://www.googletagmanager.com",
    ],
    ["font-src", "'self'", "data:"],
    ["connect-src", ...connectSources],
    [
      "frame-src",
      "'self'",
      "https://www.googletagmanager.com",
      "https://giscus.app",
      "https://player.bilibili.com",
    ],
    ["media-src", "'self'", "https://static.techzjc.com"],
    ["worker-src", "'self'", "blob:"],
    ["manifest-src", "'self'"],
    ["object-src", "'none'"],
    ["form-action", "'self'"],
    ["frame-ancestors", "'none'"],
    ["report-uri", "/api/security/csp-report"],
  ];

  return directives.map((directive) => `${directive.join(" ")};`).join(" ");
}
