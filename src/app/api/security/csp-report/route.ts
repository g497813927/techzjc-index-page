import { NextResponse } from "next/server";
import { redactNavigationUrl } from "@/lib/browserSecurity";
import { readLimitedRequestBody } from "@/lib/readLimitedRequestBody";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAX_BODY_LENGTH = 24_000;

function boundedString(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.slice(0, maxLength) : "";
}

function boundedNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function sanitizeReport(value: unknown, requestUrl: string) {
  if (!value || typeof value !== "object") {
    return null;
  }

  const outer = value as Record<string, unknown>;
  const nested = outer["csp-report"] ?? outer.body ?? outer;
  if (!nested || typeof nested !== "object") {
    return null;
  }

  const report = nested as Record<string, unknown>;
  return {
    document: redactNavigationUrl(
      boundedString(report["document-uri"] ?? report.documentURL, 2_000) ||
        requestUrl,
      requestUrl,
    ),
    blocked: redactNavigationUrl(
      boundedString(report["blocked-uri"] ?? report.blockedURL, 2_000) ||
        "about:blank",
      requestUrl,
    ),
    referrer: redactNavigationUrl(
      boundedString(report.referrer, 2_000) || "about:blank",
      requestUrl,
    ),
    effectiveDirective: boundedString(
      report["effective-directive"] ?? report.effectiveDirective,
      80,
    ),
    violatedDirective: boundedString(
      report["violated-directive"] ?? report.violatedDirective,
      120,
    ),
    disposition: boundedString(report.disposition, 20),
    sourceFile: redactNavigationUrl(
      boundedString(report["source-file"] ?? report.sourceFile, 2_000) ||
        "about:blank",
      requestUrl,
    ),
    lineNumber: boundedNumber(report["line-number"] ?? report.lineNumber),
    columnNumber: boundedNumber(
      report["column-number"] ?? report.columnNumber,
    ),
    statusCode: boundedNumber(report["status-code"] ?? report.statusCode),
  };
}

export async function POST(request: Request) {
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

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const rawReports = Array.isArray(parsed) ? parsed.slice(0, 10) : [parsed];
  const reports = rawReports
    .map((report) => sanitizeReport(report, request.url))
    .filter((report) => report !== null);
  if (reports.length === 0) {
    return NextResponse.json({ error: "Invalid report." }, { status: 400 });
  }

  for (const report of reports) {
    console.warn({
      type: "csp-violation",
      receivedAt: new Date().toISOString(),
      report,
      userAgent: boundedString(request.headers.get("user-agent"), 300),
      deployment:
        process.env.VERCEL_ENV ??
        (process.env.IN_FC === "true" ? "fc" : "unknown"),
      commit: process.env.NEXT_PUBLIC_COMMIT_SHA ?? "unknown",
    });
  }

  return new NextResponse(null, {
    status: 204,
    headers: { "Cache-Control": "no-store, max-age=0" },
  });
}
