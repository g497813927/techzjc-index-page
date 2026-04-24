function handle(req: Request) {
  const acceptLanguage = req.headers.get("accept-language") || "";
  const locale = acceptLanguage.split(",")[0] || "en-US";
  const request_url = new URL(req.url);
  const path = request_url.pathname;
  // Get the IP address of the client making the request so that it can be later used for analytics
  // Additional steps pending - might later use a third-party service to check if the IP is from a known botnet or scanner network
  // As traffics would first hit the CDN layer (if not directly accessing the origin server), we can check for headers
  // that are specifically added by the CDN to identify the real client IP
  const ip = req.headers.get("ali-cdn-real-ip") || req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown";

  const message = locale.toLowerCase().startsWith('zh')
    ? `一个野生的扫描器出现了！野生的扫描器对 ${path} 使出了 ${req.method}…没有击中 ${path}！` :
    `A wild scanner appeared! The wild scanner used ${req.method} on ${path}… It missed ${path}!`;
  
  if (process.env.NEXT_PUBLIC_SENTRY_SEND_DEFAULT_PII === "true") {
    // Log for analytics
    console.log(
      {
        method: req.method,
        path,
        locale,
        ip
      }
    )
  }

  return new Response(
    message.trim(),
    {
        status: 404,
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "Cache-Control": "no-store, max-age=0"
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
