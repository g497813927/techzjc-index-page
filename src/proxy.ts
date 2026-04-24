import { NextRequest, NextResponse } from "next/server";
import { match } from "@formatjs/intl-localematcher";
import Negotiator from "negotiator";
const locales = ["zh-CN", "en-US"];

const TRUSTED_ORIGINS = ["cdn.techzjc.net"];
const ALLOWED_DOMAINS = ["techzjc.com", "test-cn.techzjc.com"];
const HEADER_KEY = "x-origin-auth";

function getLocale(request: { headers: Headers }): string {
  const headers = {
    "accept-language": request.headers.get("accept-language") || "",
  };
  const languages = new Negotiator({ headers }).languages();
  const locale = match(languages, locales, "en-US");
  return locale;
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

  const rawHost = (req.headers.get("host") || "").toLowerCase();
  const xForwardedHostRaw = (
    req.headers.get("x-forwarded-host") || ""
  ).toLowerCase();
  const host = (xForwardedHostRaw || rawHost).split(",")[0].trim();

  const isLocalhost =
    host.split(":")[0] === "localhost" || host.split(":")[0] === "127.0.0.1";

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
    !ALLOWED_DOMAINS.includes(host) &&
    process.env.VERCEL_ENV !== "preview" &&
    process.env.NODE_ENV !== "development" &&
    !isLocalhost &&
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
    pathname === "/favicon.ico" ||
    pathname === "/robots.txt" ||
    pathname === "/sitemap.xml" ||
    pathname.startsWith("/api/") ||
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/assets/") ||
    pathname.startsWith("/photos/")
  ) {
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
    // Locale is already in the pathname, we treat user preference as is and set cookie
    const locale = pathname.split("/")[1];
    const response = NextResponse.next();
    response.cookies.set("locale", locale, { path: "/" });
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
      const rewriteResponse = NextResponse.rewrite(url);
      rewriteResponse.cookies.set("locale", locale, { path: "/" });
      return rewriteResponse;
    }
    return response;
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
  const response = NextResponse.rewrite(url);
  response.cookies.set("locale", locale, { path: "/" });
  return response;
}

export const config = {
  matcher: ["/:path*"],
};
