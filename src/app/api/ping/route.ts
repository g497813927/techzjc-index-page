export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  return new Response("pong", {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store, max-age=0, must-revalidate",
    },
  });
}
