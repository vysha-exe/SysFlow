import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { getSystemForSession } from "@/lib/system-for-user";
import { FrontSessionModel } from "@/models/frontSession";

export async function GET() {
  const ctx = await getSystemForSession();
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectToDatabase();

  const sessions = await FrontSessionModel.find({
    systemId: ctx.systemId,
    endedAt: { $ne: null },
  })
    .sort({ startedAt: -1 })
    .limit(50)
    .lean();

  const items = sessions.map((s) => ({
    id: String(s._id),
    systemId: String(s.systemId),
    headmateIds: s.headmateIds.map((id: unknown) => String(id)),
    startedAt: s.startedAt.toISOString(),
    endedAt: s.endedAt ? s.endedAt.toISOString() : null,
    note: s.note,
  }));

  return NextResponse.json({ sessions: items });
}
