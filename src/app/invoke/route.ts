import { GET as healthCheck } from "../api/healthz/route";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  if (
    process.env.IN_FC !== "true" ||
    !request.headers.get("x-fc-request-id")
  ) {
    return new Response(null, { status: 404 });
  }

  return healthCheck();
}
