import mongoose from "mongoose";
import { NextResponse } from "next/server";
import { ensureFrontIntervalsMigrated } from "@/lib/front-interval-migrate";
import { closeAllOpenIntervalsForSlot } from "@/lib/front-interval-open-rules";
import { connectToDatabase } from "@/lib/mongodb";
import { getSystemForSession } from "@/lib/system-for-user";
import { sortFrontHistoryIntervals } from "@/lib/sort-front-intervals";
import { HeadmateFrontIntervalModel } from "@/models/headmate-front-interval";
import { HeadmateModel } from "@/models/headmate";

function parseOptionalObjectId(
  v: unknown,
): mongoose.Types.ObjectId | null | "invalid" {
  if (v === null || v === undefined || v === "") return null;
  if (typeof v !== "string" || !mongoose.Types.ObjectId.isValid(v)) {
    return "invalid";
  }
  return new mongoose.Types.ObjectId(v);
}

function parseDate(v: unknown): Date | null {
  if (v === null || v === undefined) return null;
  if (typeof v !== "string") return null;
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

export async function GET() {
  const ctx = await getSystemForSession();
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectToDatabase();
  await ensureFrontIntervalsMigrated(ctx.systemId);

  const [activeRows, completedRows] = await Promise.all([
    HeadmateFrontIntervalModel.find({
      systemId: ctx.systemId,
      endedAt: null,
    }).lean(),
    HeadmateFrontIntervalModel.find({
      systemId: ctx.systemId,
      endedAt: { $ne: null },
    })
      .sort({ startedAt: -1 })
      .limit(400)
      .lean(),
  ]);

  const raw = [...activeRows, ...completedRows];
  const rows = sortFrontHistoryIntervals(raw).slice(0, 200);

  const intervals = rows.map((r) => ({
    id: String(r._id),
    headmateId: r.headmateId ? String(r.headmateId) : null,
    startedAt: r.startedAt.toISOString(),
    endedAt: r.endedAt ? r.endedAt.toISOString() : null,
    note: r.note ?? "",
    isActive: r.endedAt == null,
  }));

  return NextResponse.json({ intervals });
}

export async function POST(req: Request) {
  const ctx = await getSystemForSession();
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const b = body as Record<string, unknown>;
  const headmateIdParsed = parseOptionalObjectId(b.headmateId);
  if (headmateIdParsed === "invalid") {
    return NextResponse.json({ error: "Invalid headmateId" }, { status: 400 });
  }

  const startedAt = parseDate(b.startedAt);
  if (!startedAt) {
    return NextResponse.json(
      { error: "startedAt must be a valid ISO date string" },
      { status: 400 },
    );
  }

  let endedAt: Date | null;
  if (b.endedAt === undefined || b.endedAt === null) {
    endedAt = null;
  } else {
    const end = parseDate(b.endedAt);
    if (!end) {
      return NextResponse.json(
        { error: "endedAt must be null or a valid ISO date string" },
        { status: 400 },
      );
    }
    endedAt = end;
  }

  if (endedAt && endedAt.getTime() <= startedAt.getTime()) {
    return NextResponse.json(
      { error: "endedAt must be after startedAt" },
      { status: 400 },
    );
  }

  const note = typeof b.note === "string" ? b.note : "";

  await connectToDatabase();
  await ensureFrontIntervalsMigrated(ctx.systemId);

  if (headmateIdParsed) {
    const hm = await HeadmateModel.findOne({
      _id: headmateIdParsed,
      systemId: ctx.systemId,
    }).lean();
    if (!hm) {
      return NextResponse.json({ error: "Headmate not found" }, { status: 400 });
    }
  }

  if (endedAt == null) {
    await closeAllOpenIntervalsForSlot(ctx.systemId, headmateIdParsed);
  }

  const doc = await HeadmateFrontIntervalModel.create({
    systemId: ctx.systemId,
    headmateId: headmateIdParsed,
    startedAt,
    endedAt,
    note,
  });

  return NextResponse.json({
    interval: {
      id: String(doc._id),
      headmateId: doc.headmateId ? String(doc.headmateId) : null,
      startedAt: doc.startedAt.toISOString(),
      endedAt: doc.endedAt ? doc.endedAt.toISOString() : null,
      note: doc.note ?? "",
      isActive: doc.endedAt == null,
    },
  });
}
