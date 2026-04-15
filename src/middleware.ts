import { NextRequest, NextResponse } from "next/server";

export function middleware(req: NextRequest) {
  if (req.method === "TRACE") {
    const acceptLanguage = req.headers.get("accept-language") || "";
    const locale = acceptLanguage.split(",")[0].split(";")[0].trim() || "en-US";
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
  return NextResponse.next();
}

export const config = {
  matcher: "/scanner-404",
};
