import { NextResponse } from "next/server";
import {
  firstHeaderListValue,
  normalizeHostAuthority,
  redactNavigationUrl,
} from "@/lib/browserSecurity";
import { readLimitedRequestBody } from "@/lib/readLimitedRequestBody";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAX_BODY_LENGTH = 12_000;
const ALLOWED_ACTIONS = new Set(["blocked", "cancelled", "confirmed"]);
const ALLOWED_TRIGGERS = new Set(["link", "window-open"]);

function boundedString(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.slice(0, maxLength) : "";
}

function sanitizeLocation(value: unknown) {
  if (!value || typeof value !== "object") {
    return null;
  }

  const location = value as Record<string, unknown>;
  return {
    protocol: boundedString(location.protocol, 16),
    hostname: boundedString(location.hostname, 253),
    port: boundedString(location.port, 5),
    pathname: "[redacted]",
    queryKeys: [],
    hadFragment: location.hadFragment === true,
  };
}

function getEffectiveRequestOrigin(request: Request) {
  const requestUrl = new URL(request.url);
  const forwardedHostHeader = request.headers.get("x-forwarded-host");
  const hostHeader = request.headers.get("host");
  const rawHost =
    forwardedHostHeader !== null
      ? firstHeaderListValue(forwardedHostHeader)
      : (hostHeader ?? requestUrl.host);
  const host = normalizeHostAuthority(rawHost);
  const forwardedProtocol = firstHeaderListValue(
    request.headers.get("x-forwarded-proto"),
  ).toLowerCase();
  const protocol =
    forwardedProtocol === "http" || forwardedProtocol === "https"
      ? `${forwardedProtocol}:`
      : requestUrl.protocol;

  if (!host) {
    return null;
  }

  try {
    return new URL(`${protocol}//${host}`).origin;
  } catch {
    return null;
  }
}

function isAllowedBrowserOrigin(request: Request) {
  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite && fetchSite !== "same-origin") {
    return false;
  }

  const origin = request.headers.get("origin");
  if (!origin) {
    return false;
  }

  try {
    const effectiveRequestOrigin = getEffectiveRequestOrigin(request);
    return (
      effectiveRequestOrigin !== null &&
      new URL(origin).origin === effectiveRequestOrigin
    );
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  if (!isAllowedBrowserOrigin(request)) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const bodyResult = await readLimitedRequestBody(request, MAX_BODY_LENGTH);
  if (!bodyResult.ok) {
    return NextResponse.json(
      {
        error:
          bodyResult.reason === "too-large"
            ? "Payload too large."
            : "Unable to read request body.",
      },
      { status: bodyResult.reason === "too-large" ? 413 : 400 },
    );
  }
  const rawBody = bodyResult.text;

  let body: Record<string, unknown>;
  try {
    const parsed = JSON.parse(rawBody);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new TypeError("Expected an object.");
    }
    body = parsed as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const action = boundedString(body.action, 20);
  const trigger = boundedString(body.trigger, 20);
  const source = sanitizeLocation(body.source);
  const destination = sanitizeLocation(body.destination);
  if (
    body.version !== 1 ||
    !ALLOWED_ACTIONS.has(action) ||
    !ALLOWED_TRIGGERS.has(trigger) ||
    !source ||
    !destination
  ) {
    return NextResponse.json({ error: "Invalid event." }, { status: 400 });
  }

  console.warn({
    type: "outbound-navigation",
    version: 1,
    eventId: boundedString(body.eventId, 64),
    action,
    trigger,
    reason: boundedString(body.reason, 40),
    occurredAt: boundedString(body.occurredAt, 40),
    receivedAt: new Date().toISOString(),
    userInitiated: body.userInitiated === true,
    source,
    destination,
    requestPage: redactNavigationUrl(
      request.headers.get("referer") ?? request.url,
      request.url,
    ),
    userAgent: boundedString(request.headers.get("user-agent"), 300),
    deployment:
      process.env.VERCEL_ENV ?? (process.env.IN_FC === "true" ? "fc" : "unknown"),
    commit: process.env.NEXT_PUBLIC_COMMIT_SHA ?? "unknown",
  });

  return new NextResponse(null, {
    status: 204,
    headers: { "Cache-Control": "no-store, max-age=0" },
  });
}
