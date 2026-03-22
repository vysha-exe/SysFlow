import { NextResponse } from "next/server";
import { computeFrontAnalytics } from "@/lib/front-analytics";
import { ensureFrontIntervalsMigrated } from "@/lib/front-interval-migrate";
import { connectToDatabase } from "@/lib/mongodb";
import { getSystemForSession } from "@/lib/system-for-user";
import { HeadmateFrontIntervalModel } from "@/models/headmate-front-interval";
import { HeadmateModel } from "@/models/headmate";

/**
 * Sanity cap on requested window span (not on how much data exists).
 * “All time” uses from epoch → now (~55y); must be allowed. Work stays bounded by the
 * 15k interval limit below.
 */
const MAX_RANGE_MS = 600 * 366 * 86400000; // ~600 calendar years

export async function GET(req: Request) {
  const ctx = await getSystemForSession();
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const fromIso = searchParams.get("from");
  const toIso = searchParams.get("to");
  const timeZone =
    searchParams.get("timeZone")?.trim() || "UTC";

  if (!fromIso || !toIso) {
    return NextResponse.json(
      { error: "Query params `from` and `to` (ISO datetimes) are required." },
      { status: 400 },
    );
  }

  const fromMs = new Date(fromIso).getTime();
  const toMs = new Date(toIso).getTime();
  if (Number.isNaN(fromMs) || Number.isNaN(toMs) || fromMs >= toMs) {
    return NextResponse.json({ error: "Invalid time range." }, { status: 400 });
  }
  if (toMs - fromMs > MAX_RANGE_MS) {
    return NextResponse.json(
      { error: "Time range is too large." },
      { status: 400 },
    );
  }

  await connectToDatabase();
  await ensureFrontIntervalsMigrated(ctx.systemId);

  const raw = await HeadmateFrontIntervalModel.find({
    systemId: ctx.systemId,
    startedAt: { $lt: new Date(toMs) },
    $or: [{ endedAt: null }, { endedAt: { $gt: new Date(fromMs) } }],
  })
    .limit(15000)
    .lean();

  const intervals = raw.map((r) => ({
    id: String(r._id),
    headmateId: r.headmateId ? String(r.headmateId) : null,
    startedAt: r.startedAt.toISOString(),
    endedAt: r.endedAt ? r.endedAt.toISOString() : null,
  }));

  const headmates = await HeadmateModel.find({ systemId: ctx.systemId }).lean();
  const nameMap = new Map(
    headmates.map((h) => [String(h._id), String(h.name ?? "—")]),
  );

  const analytics = computeFrontAnalytics(
    intervals,
    nameMap,
    { fromMs, toMs },
    timeZone,
  );

  return NextResponse.json({ analytics });
}
