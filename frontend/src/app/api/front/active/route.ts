import mongoose from "mongoose";
import { NextResponse } from "next/server";
import {
  getActiveFrontSession,
  getActiveOpenIntervals,
} from "@/lib/front-actions";
import { connectToDatabase } from "@/lib/mongodb";
import { getSystemForSession } from "@/lib/system-for-user";
import { HeadmateModel } from "@/models/headmate";

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

  const [intervals, headmateIds] = await Promise.all([
    getActiveOpenIntervals(ctx.systemId),
    Promise.resolve(session.headmateIds.map((id: unknown) => String(id))),
  ]);

  let fronters: { id: string; name: string }[] = [];
  if (headmateIds.length > 0) {
    const hm = await HeadmateModel.find({
      systemId: ctx.systemId,
      _id: {
        $in: headmateIds.map((id) => new mongoose.Types.ObjectId(id)),
      },
    }).lean();
    const nameBy = new Map(
      hm.map((h) => [String(h._id), String(h.name ?? "—")]),
    );
    fronters = headmateIds.map((id) => ({
      id,
      name: nameBy.get(id) ?? "?",
    }));
  }

  return NextResponse.json({
    active: {
      id: String(session._id),
      systemId: String(session.systemId),
      headmateIds,
      fronters,
      startedAt: session.startedAt.toISOString(),
      intervals,
    },
  });
}
