import { HEADER_KEY } from "@/constants/headers";
import { getClientIp, truncateIp } from "./route-logic.mjs";

function handle(req: Request) {
  const acceptLanguage = req.headers.get("accept-language") || "";
  const locale = acceptLanguage.split(",")[0] || "en-US";
  const requestUrl = new URL(req.url);
  const path = requestUrl.pathname;

  const message = locale.toLowerCase().startsWith("zh")
    ? `一个野生的扫描器出现了！野生的扫描器对 ${path} 使出了 ${req.method}…没有击中 ${path}！`
    : `A wild scanner appeared! The wild scanner used ${req.method} on ${path}… It missed ${path}!`;

  if (process.env.SCANNER_404_LOG_REQUESTS === "true") {
    // Check whether the request is coming from the CDN or visiting directly by checking the X-Origin-Auth header
    const originAuth = req.headers.get(HEADER_KEY);
    const cdnOriginAuth = process.env.CDN_ORIGIN_AUTH;
    const clientIp = getClientIp({
      originAuth,
      cdnOriginAuth,
      aliCdnRealIp: req.headers.get("ali-cdn-real-ip"),
      forwardedIp: req.headers.get("x-forwarded-for"),
      realIp: req.headers.get("x-real-ip"),
    });
    const rawIp = clientIp.rawIp;
    const ipSource = clientIp.source;

    const truncatedIp = truncateIp(rawIp);

    // Log the scanner activity with the truncated IP for analytics and threat intelligence purposes
    // Note: This site is not a site that provides any user-specific functionality
    // at the same time, its type is a personal website so DO NOT over-complicate the IP anonymization logic,
    // for GDPR compliance. At the same time, it should be pretty low volume traffic, so storing cost is not a concern for now.
    console.log(
      {
        type: "scanner-404",
        method: req.method,
        path: path.length > 100 ? path.slice(0, 100) + "..." : path,
        locale: locale.length > 20 ? locale.slice(0, 20) + "..." : locale,
        truncatedIp,
        ipSource,
      }
    );
  }

  return new Response(
    message.trim(),
    {
      status: 404,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store, max-age=0",
      },
    },
  );
}

export const GET = handle;
export const POST = handle;
export const PUT = handle;
export const DELETE = handle;
export const PATCH = handle;
export const OPTIONS = handle;
export const HEAD = handle;
