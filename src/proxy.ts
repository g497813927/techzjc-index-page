import { NextRequest, NextResponse } from "next/server";
import { match } from '@formatjs/intl-localematcher';
import Negotiator from 'negotiator';
const locales = ['zh-CN', 'en-US'];

const TRUSTED_ORIGINS = [
  'cdn.techzjc.net',
  'techzjcontainer-zoxmrhoyde.cn-hangzhou-vpc.fcapp.run'
];
const ALLOWED_DOMAINS = [
  "techzjc.com",
  "test-cn.techzjc.com"
];
const INVALID_HOSTS = ["", "0.0.0.0"];
const HEADER_KEY = 'x-origin-auth';

function getLocale(request: { headers: Headers }): string {
  const headers = { 'accept-language': request.headers.get("accept-language") || '' };
  const languages = new Negotiator({ headers }).languages();
  const locale = match(languages, locales, 'en-US');
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
  const { pathname } = req.nextUrl;

  const rawHost = (req.headers.get("host") || "").toLowerCase();
  const xfHostRaw = (req.headers.get("x-forwarded-host") || "").toLowerCase();
  const host = (rawHost || xfHostRaw).split(",")[0].trim();
  const hasRealHost = !INVALID_HOSTS.includes(host);

  const isLocalhost = host.split(':')[0] === 'localhost' || host.split(':')[0] === '127.0.0.1';

  if (TRUSTED_ORIGINS.includes(host)) {
    const authHeader = req.headers.get(HEADER_KEY);
    const expectedAuth = process.env.CDN_ORIGIN_AUTH;

    if (!expectedAuth) {
      console.warn('CDN_ORIGIN_AUTH is not configured; skipping origin auth check for TRUSTED_ORIGINS requests.');
      return new NextResponse(
        "Internal Server Error",
        { status: 500 }
      );
    } else if (!authHeader || authHeader !== expectedAuth) {
      return NextResponse.rewrite(new URL('/scanner-404', req.url));
    }
  // Ensure that Vercel preview & local development are not blocked if not using a trusted origin.
  // if in production mode, block it
  } else if (
    !ALLOWED_DOMAINS.includes(host) && 
    process.env.VERCEL_ENV !== 'preview' && 
    process.env.NODE_ENV !== 'development' && 
    !isLocalhost && 
    hasRealHost
  ) {
    return NextResponse.rewrite(new URL('/scanner-404', req.url));
  }

  if (
    pathname === '/favicon.ico' ||
    pathname === '/robots.txt' ||
    pathname === '/sitemap.xml' ||
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/assets/') ||
    pathname.startsWith('/photos/')
  ) {
    return NextResponse.next();
  }

  // Add redirect for old index_en-US.html path so that
  // search engines can update their links
  if (pathname === "/index_en-US.html") {
    const url = req.nextUrl.clone();
    url.pathname = '/en-US';
    return NextResponse.redirect(url, 301);
  }


  if (SCANNER_PATTERNS.some(re => re.test(pathname))) {
    return NextResponse.rewrite(new URL('/scanner-404', req.url));
  }

  const pathnameHasLocale = locales.some(locale => pathname === `/${locale}` || pathname.startsWith(`/${locale}/`));

  if (pathnameHasLocale) {
    // Locale is already in the pathname, we treat user preference as is and set cookie
    const locale = pathname.split('/')[1];
    const response = NextResponse.next();
    response.cookies.set('locale', locale, { path: '/' });
    return response;
  }

  const locale = getLocale(req as unknown as { headers: Headers });

  // Check if localstorage preference exists (only works on client side)
  const preferredLocale = req.cookies.get('locale')?.value;
  if (preferredLocale && locales.includes(preferredLocale)) {
    const url = req.nextUrl.clone();
    url.pathname = `/${preferredLocale}${pathname}`;
    return NextResponse.rewrite(url);
  }
  const url = req.nextUrl.clone();
  url.pathname = `/${locale}${pathname}`;
  const response = NextResponse.rewrite(url);
  response.cookies.set('locale', locale, { path: '/' });
  return response;
}

export const config = {
  matcher: ["/:path*"]
};
