import { NextResponse } from "next/server";
import {
  applyFrontActionForCurrentSystem,
  getFrontStateForCurrentSystem,
} from "@/lib/fronting";

export async function GET() {
  const state = await getFrontStateForCurrentSystem();
  if (!state) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json(state);
}

export async function POST(request: Request) {
  const body = (await request.json()) as {
    action?: "add" | "set" | "remove";
    headmateId?: string;
  };

  if (!body.action || !body.headmateId) {
    return NextResponse.json(
      { error: "action and headmateId are required." },
      { status: 400 },
    );
  }

  if (!["add", "set", "remove"].includes(body.action)) {
    return NextResponse.json({ error: "Invalid action." }, { status: 400 });
  }

  try {
    const state = await applyFrontActionForCurrentSystem(body.action, body.headmateId);
    if (!state) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json(state);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to update front state." },
      { status: 400 },
    );
  }
}
