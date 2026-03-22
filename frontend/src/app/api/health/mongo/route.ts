import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";

/**
 * Quick check that MongoDB is reachable (no secrets in response).
 * GET /api/health/mongo
 */
export async function GET() {
  try {
    const conn = await connectToDatabase();
    const state = conn.connection.readyState;
    const ok = state === 1;
    return NextResponse.json({
      ok,
      readyState: state,
      name: conn.connection.name,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json(
      {
        ok: false,
        error: message,
      },
      { status: 503 },
    );
  }
}
