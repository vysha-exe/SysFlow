import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { addToFront, removeFromFront, setAsFront } from "@/lib/front-actions";
import { connectToDatabase } from "@/lib/mongodb";
import { getSystemForSession } from "@/lib/system-for-user";

type Body = {
  action: "add" | "set" | "remove";
  headmateId: string;
};

export async function POST(request: Request) {
  const ctx = await getSystemForSession();
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: Body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { action, headmateId } = body;
  if (!action || !headmateId) {
    return NextResponse.json(
      { error: "action and headmateId are required." },
      { status: 400 },
    );
  }

  if (!["add", "set", "remove"].includes(action)) {
    return NextResponse.json({ error: "Invalid action." }, { status: 400 });
  }

  let hid: mongoose.Types.ObjectId;
  try {
    hid = new mongoose.Types.ObjectId(headmateId);
  } catch {
    return NextResponse.json({ error: "Invalid headmateId." }, { status: 400 });
  }

  await connectToDatabase();

  try {
    const result =
      action === "add"
        ? await addToFront(ctx.systemId, hid)
        : action === "set"
          ? await setAsFront(ctx.systemId, hid)
          : await removeFromFront(ctx.systemId, hid);

    return NextResponse.json({
      ok: true,
      changed: result.changed,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
