import { NextRequest, NextResponse } from "next/server";

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

  if (SCANNER_PATTERNS.some(re => re.test(pathname))) {
    return NextResponse.rewrite(new URL('/scanner-404', req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/:path*"],
};
