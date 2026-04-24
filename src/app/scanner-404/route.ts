function handle(req: Request) {
  const acceptLanguage = req.headers.get("accept-language") || "";
  const locale = acceptLanguage.split(",")[0] || "en-US";
  const request_url = new URL(req.url);
  const path = request_url.pathname;
  // Get the IP address of the client making the request so that it can be later used for analytics
  // Additional step pending - might later use a third-party service to check if the IP is from a known botnet or scanner network
  // As traffics would first hit the CDN layer (if not directly accessing the origin server), we can check for headers
  // that are specifically added by the CDN to identify the real client IP
  const cdnRealIp = req.headers.get("ali-cdn-real-ip");
  const forwardedFor = req.headers.get("x-forwarded-for");
  const forwardedIp = forwardedFor?.split(",")?.[0]?.trim();
  const rawip = cdnRealIp || forwardedIp || "unknown";

  const message = locale.toLowerCase().startsWith("zh")
    ? `一个野生的扫描器出现了！野生的扫描器对 ${path} 使出了 ${req.method}…没有击中 ${path}！` :
    `A wild scanner appeared! The wild scanner used ${req.method} on ${path}… It missed ${path}!`;
  
  if (process.env.NEXT_PUBLIC_SENTRY_SEND_DEFAULT_PII === "true") {
    // Log for analytics, but truncate the last octet of the IP for privacy reasons (use subnet-level IP for analytics)
    // and threat intelligence purposes

    // Check if the ip is IPv4 or IPv6, and truncate accordingly
    let truncatedIp = "unknown";
    if (rawip.includes(".")) {
      // IPv4
      const octets = rawip.split(".");
      if (octets.length === 4) {
        truncatedIp = `${octets[0]}.${octets[1]}.${octets[2]}.0/24`;
      } else {
        truncatedIp = "invalid-ip";
      }
    } else if (rawip.includes(":")) {
      // IPv6
      const hextets = rawip.split(":");
      if (hextets.length >= 2) {
        truncatedIp = `${hextets[0]}:${hextets[1]}::/32`;
      } else {
        truncatedIp = "invalid-ip";
      }
    }

    // Log the scanner activity with the truncated IP for analytics and threat intelligence purposes
    console.log(
      {
        method: req.method,
        path,
        locale,
        truncatedIp
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
