import { NextRequest, NextResponse } from "next/server";
import { match } from "@formatjs/intl-localematcher";
import Negotiator from "negotiator";
import { HEADER_KEY } from "@/constants/headers";
import {
  firstHeaderListValue,
  isAllowedApplicationHost,
  normalizeHostHeader,
} from "@/lib/browserSecurity";
const locales = ["zh-CN", "en-US"];

const TRUSTED_ORIGINS = ["cdn.techzjc.net"];

function getLocale(request: { headers: Headers }): string {
  const ranges = (request.headers.get("accept-language") || "")
    .split(",")
    .flatMap((preference) => {
      const [language, ...parameters] = preference.trim().split(";");
      if (language.trim() === "*") return [["*", ...parameters].join(";")];
      try {
        // Normalize individually so malformed tags cannot discard valid ones.
        // Extensions do not affect our language choice; Intl removes them
        // safely, including private-use subtags the matcher's regex mishandles.
        const baseName = new Intl.Locale(language.trim()).baseName;
        return [[baseName, ...parameters].join(";")];
      } catch {
        return [];
      }
    });

  // Evaluate explicit exclusions before best-fit mapping changes specificity.
  // A regional preference cannot override en;q=0 for an en-US response, while
  // the more specific en-US;q=0.5 can. The fallback wildcard keeps otherwise
  // unmentioned locales eligible for best-fit matching, even with '*;q=0'.
  const eligibleLocales = new Negotiator({
    headers: {
      "accept-language": [
        ...ranges.filter((range) => range.split(";")[0] !== "*"),
        "*",
      ].join(","),
    },
  }).languages(locales);
  const preferences = ranges.flatMap((preference) => {
    const [baseName, ...parameters] = preference.split(";");
    if (baseName === "*" || !new Negotiator({
      headers: { "accept-language": preference },
    }).language()) {
      // Keep negative regional ranges scoped: en-GB;q=0 does not reject en-US.
      return [preference];
    }
    const supported = match([baseName], eligibleLocales, "");
    if (!supported) return [];

    // Supported locales keep their exact specificity. Other positive variants
    // express a language-level preference after safe best-fit matching.
    const range = locales.includes(baseName)
      ? baseName
      : new Intl.Locale(supported).language;
    return [[range, ...parameters].join(";")];
  });
  const headers = { "accept-language": preferences.join(",") };
  // Passing available locales retains wildcard weights and q=0 exclusions.
  // English remains the tie-breaker and the fallback when none is acceptable.
  return new Negotiator({ headers }).languages(["en-US", "zh-CN"])[0] || "en-US";
}

const SCANNER_PATTERNS = [
  /\/\.env/i,

  /^\/wp-admin(?:\/|$)/i,
  /^\/wp-content\//i,
  /^\/wp-includes\//i,

  /\/[a-z0-9_-]+\.php$/i,

  /^\/\.git/i,
  /^\/\.svn/i,
];

export function proxy(req: NextRequest) {
  // TRACE is universally scanner noise; route handlers cannot export a TRACE
  // handler, so intercept it here before any other routing logic.
  if (req.method === "TRACE") {
    const locale = getLocale(req as unknown as { headers: Headers });
    const path = req.nextUrl.pathname;
    const message = locale.toLowerCase().startsWith("zh")
      ? `一个野生的扫描器出现了！野生的扫描器对 ${path} 使出了 ${req.method}…没有击中 ${path}！`
      : `A wild scanner appeared! The wild scanner used ${req.method} on ${path}… It missed ${path}!`;
    return new NextResponse(message.trim(), {
      status: 404,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store, max-age=0",
      },
    });
  }

  let { pathname } = req.nextUrl;

  const host = normalizeHostHeader(
    firstHeaderListValue(req.headers.get("x-forwarded-host")) ||
      req.headers.get("host"),
  );

  if (TRUSTED_ORIGINS.includes(host)) {
    const authHeader = req.headers.get(HEADER_KEY);
    const expectedAuth = process.env.CDN_ORIGIN_AUTH;

    if (!expectedAuth) {
      console.warn(
        "CDN_ORIGIN_AUTH is not configured; skipping origin auth check for TRUSTED_ORIGINS requests.",
      );
      return new NextResponse("Internal Server Error", { status: 500 });
    } else if (!authHeader || authHeader !== expectedAuth) {
      return NextResponse.rewrite(new URL("/scanner-404", req.url));
    }
    // Ensure that Vercel preview & local development are not blocked if not using a trusted origin.
    // if in production mode, block it
  } else if (
    !isAllowedApplicationHost(host, process.env) &&
    // As FC already has its own security mechanism to gate access (e.g.
    // API Gateway with auth token check (checks CDN's X-Origin-Auth header already at API Gateway layer,
    // which happens before reaching FC, so no need to re-check at FC proxy layer here),
    // FC only allows internal access (as they are using VPC domain, cn-hangzhou-vpc.fcapp.run, ref: /s.yaml:24,33, binding rules not shown in s.yaml)),
    // require APP code signing checks (function auth) when API Gateway invokes FC (which is done at both API Gateway layer and FC layer,
    // ref: /s.yaml:25-37)), skip these checks when in FC environment
    process.env.IN_FC !== "true"
  ) {
    return NextResponse.rewrite(new URL("/scanner-404", req.url));
  }

  if (SCANNER_PATTERNS.some((re) => re.test(pathname))) {
    return NextResponse.rewrite(new URL("/scanner-404", req.url));
  }

  if (
    (pathname === "/invoke" && process.env.IN_FC === "true") ||
    pathname === "/favicon.ico" ||
    pathname === "/robots.txt" ||
    pathname === "/sitemap.xml" ||
    pathname.startsWith("/api/") ||
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/photos/")
  ) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/assets/")) {
    return NextResponse.next();
  }

  // Add redirect for old index_en-US.html path so that
  // search engines can update their links
  if (pathname === "/index_en-US.html") {
    const url = req.nextUrl.clone();
    url.pathname = "/en-US";
    return NextResponse.redirect(url, 301);
  }

  const pathnameHasLocale = locales.some(
    (locale) => pathname === `/${locale}` || pathname.startsWith(`/${locale}/`),
  );
  const isMarkdownRequested = req.headers
    .get("accept")
    ?.includes("text/markdown");

  if (pathnameHasLocale) {
    // The explicit pathname is authoritative. Avoid setting a cookie on this
    // response: Set-Cookie makes an otherwise static locale page uncacheable at
    // both Vercel and the outer CDN.
    const locale = pathname.split("/")[1];
    // If markdown is requested, head to /markdown route handler
    if (isMarkdownRequested) {
      const url = req.nextUrl.clone();
      // Check if pathname starts with /{locale}/markdown, if not, rewrite to /{locale}/markdown/{rest_of_path}
      if (pathname.startsWith(`/${locale}/markdown`)) {
        url.pathname = pathname;
      } else {
        const localePrefix = `/${locale}`;
        const restOfPath = pathname.slice(localePrefix.length);
        url.pathname = `${localePrefix}/markdown${restOfPath}`;
      }
      return NextResponse.rewrite(url);
    }
    return NextResponse.next();
  }

  const locale = getLocale(req as unknown as { headers: Headers });

  // Check if localstorage preference exists (only works on client side)
  const preferredLocale = req.cookies.get("locale")?.value;
  if (preferredLocale && locales.includes(preferredLocale)) {
    const url = req.nextUrl.clone();
    if (isMarkdownRequested) {
      // If markdown is requested, head to /markdown route handler
      if (!pathname.startsWith(`/markdown`)) {
        pathname = `/markdown${pathname}`;
      }
    }
    url.pathname = `/${preferredLocale}${pathname}`;
    return NextResponse.rewrite(url);
  }
  const url = req.nextUrl.clone();
  if (isMarkdownRequested) {
    if (!pathname.startsWith(`/markdown`)) {
      pathname = `/markdown${pathname}`;
    }
  }
  url.pathname = `/${locale}${pathname}`;
  return NextResponse.rewrite(url);
}

export const config = {
  matcher: ["/:path*"],
};
