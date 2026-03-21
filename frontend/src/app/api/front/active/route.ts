import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { getActiveFrontSession } from "@/lib/front-actions";
import { getSystemForSession } from "@/lib/system-for-user";

export async function GET() {
  const ctx = await getSystemForSession();
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectToDatabase();
  const session = await getActiveFrontSession(ctx.systemId);

  if (!session) {
    return NextResponse.json({ active: null });
  }

  return NextResponse.json({
    active: {
      id: String(session._id),
      systemId: String(session.systemId),
      headmateIds: session.headmateIds.map((id: unknown) => String(id)),
      startedAt: session.startedAt.toISOString(),
    },
  });
}
