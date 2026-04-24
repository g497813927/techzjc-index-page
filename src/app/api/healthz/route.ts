import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const isCnBuild = process.env.IN_FC === "true";

export async function GET() {
  return NextResponse.json(
    {
      status: "ok",
      service: "techzjc-index",
      region:
        process.env.VERCEL_REGION ?? (isCnBuild ? "cn-hangzhou" : "unknown"),
      timestamp: new Date().toISOString(),
      commit: process.env.NEXT_PUBLIC_COMMIT_SHA ?? "unknown",
    },
    {
      headers: {
        "Cache-Control": "no-store, max-age=0, must-revalidate",
      },
    },
  );
}
