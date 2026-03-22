import { NextResponse } from "next/server";
import { ensureFrontIntervalsMigrated } from "@/lib/front-interval-migrate";
import { connectToDatabase } from "@/lib/mongodb";
import { getSystemForSession } from "@/lib/system-for-user";
import { HeadmateFrontIntervalModel } from "@/models/headmate-front-interval";

/** Completed front intervals only (excludes open rows). */
export async function GET() {
  const ctx = await getSystemForSession();
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectToDatabase();
  await ensureFrontIntervalsMigrated(ctx.systemId);

  const rows = await HeadmateFrontIntervalModel.find({
    systemId: ctx.systemId,
    endedAt: { $ne: null },
  })
    .sort({ startedAt: -1 })
    .limit(100)
    .lean();

  const intervals = rows.map((r) => ({
    id: String(r._id),
    headmateId: r.headmateId ? String(r.headmateId) : null,
    startedAt: r.startedAt.toISOString(),
    endedAt: r.endedAt ? r.endedAt.toISOString() : null,
    note: r.note ?? "",
  }));

  return NextResponse.json({ intervals });
}
