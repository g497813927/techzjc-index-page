import { NextRequest, NextResponse } from "next/server";
import { match } from '@formatjs/intl-localematcher';
import Negotiator from 'negotiator';
const locales = ['zh-CN', 'en-US'];

function getLocale(request: { headers: Headers }): string {
  const headers = { 'accept-language': request.headers.get("accept-language") || '' };
  const languages = new Negotiator({ headers }).languages()
  console.log("Accepted languages:", languages);
  console.log("Available locales:", locales);
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

  if (
    pathname === '/favicon.ico' ||
    pathname === '/robots.txt' ||
    pathname === '/sitemap.xml' ||
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/assets/') ||
    pathname.startsWith('/photos/')
  ) {
    return;
  }


  if (SCANNER_PATTERNS.some(re => re.test(pathname))) {
    return NextResponse.rewrite(new URL('/scanner-404', req.url));
  }

  const pathnameHasLocale = locales.some(locale => pathname.startsWith(`/${locale}`));

  if (pathnameHasLocale) {
    // Locale is already in the pathname, we treat user preference as is and set cookie
    const locale = pathname.split('/')[1];
    const response = NextResponse.next();
    response.cookies.set('locale', locale, { path: '/' });
    return response;
  }

  const locale = getLocale(req as unknown as { headers: Headers });

  // Check if localstorage preference exists (only works on client side)
  const preferedLocale = req.cookies.get('locale')?.value;
  if (preferedLocale && locales.includes(preferedLocale)) {
    req.nextUrl.pathname = `/${preferedLocale}${pathname}`;
    return NextResponse.rewrite(req.nextUrl);
  }
  const response = NextResponse.rewrite(req.nextUrl);
  response.cookies.set('locale', locale, { path: '/' });
  req.nextUrl.pathname = `/${locale}${pathname}`;
  return NextResponse.rewrite(req.nextUrl, response);
}

export const config = {
  matcher: [
    '/((?!_next).*)'
  ]
};
