function handle(req: Request) {
  const acceptLanguage = req.headers.get("accept-language") || "";
  const locale = acceptLanguage.split(",")[0] || "en-US";
  const request_url = new URL(req.url);
  const path = request_url.pathname;

  const message = locale.toLowerCase().startsWith('zh')
    ? `一个野生的扫描器出现了！野生的扫描器对 ${path} 使出了 ${req.method}…没有击中 ${path}！` :
    `A wild scanner appeared! The wild scanner used ${req.method} on ${path}… It missed ${path}!`;

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
export const TRACE = handle;
