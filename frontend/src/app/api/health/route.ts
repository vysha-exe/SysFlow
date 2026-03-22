import { NextResponse } from "next/server";

/**
 * Lightweight liveness check for Vercel / monitoring.
 * For MongoDB connectivity use GET /api/health/mongo
 */
export async function GET() {
  return NextResponse.json({
    ok: true,
    service: "sysflow-web",
    time: new Date().toISOString(),
  });
}
