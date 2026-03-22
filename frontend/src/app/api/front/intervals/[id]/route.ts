import mongoose from "mongoose";
import { NextResponse } from "next/server";
import { ensureFrontIntervalsMigrated } from "@/lib/front-interval-migrate";
import { closeOtherOpenIntervalsForSlot } from "@/lib/front-interval-open-rules";
import { connectToDatabase } from "@/lib/mongodb";
import { getSystemForSession } from "@/lib/system-for-user";
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

type RouteCtx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, ctx: RouteCtx) {
  const sessionCtx = await getSystemForSession();
  if (!sessionCtx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await ctx.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }
  const intervalId = new mongoose.Types.ObjectId(id);

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

  await connectToDatabase();
  await ensureFrontIntervalsMigrated(sessionCtx.systemId);

  const doc = await HeadmateFrontIntervalModel.findOne({
    _id: intervalId,
    systemId: sessionCtx.systemId,
  });
  if (!doc) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if ("headmateId" in b) {
    const parsed = parseOptionalObjectId(b.headmateId);
    if (parsed === "invalid") {
      return NextResponse.json({ error: "Invalid headmateId" }, { status: 400 });
    }
    if (parsed) {
      const hm = await HeadmateModel.findOne({
        _id: parsed,
        systemId: sessionCtx.systemId,
      }).lean();
      if (!hm) {
        return NextResponse.json({ error: "Headmate not found" }, { status: 400 });
      }
    }
    doc.headmateId = parsed;
  }

  if ("startedAt" in b) {
    const d = parseDate(b.startedAt);
    if (!d) {
      return NextResponse.json(
        { error: "startedAt must be a valid ISO date string" },
        { status: 400 },
      );
    }
    doc.startedAt = d;
  }

  let endedAtExplicit = false;
  if ("endedAt" in b) {
    endedAtExplicit = true;
    if (b.endedAt === null) {
      doc.endedAt = null;
    } else {
      const end = parseDate(b.endedAt);
      if (!end) {
        return NextResponse.json(
          { error: "endedAt must be null or a valid ISO date string" },
          { status: 400 },
        );
      }
      doc.endedAt = end;
    }
  }

  if ("note" in b) {
    doc.note = typeof b.note === "string" ? b.note : "";
  }

  const end = doc.endedAt;
  if (end && end.getTime() <= doc.startedAt.getTime()) {
    return NextResponse.json(
      { error: "endedAt must be after startedAt" },
      { status: 400 },
    );
  }

  if (doc.endedAt == null) {
    await closeOtherOpenIntervalsForSlot(
      sessionCtx.systemId,
      doc.headmateId ?? null,
      doc._id,
    );
  }

  await doc.save();

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

export async function DELETE(_req: Request, ctx: RouteCtx) {
  const sessionCtx = await getSystemForSession();
  if (!sessionCtx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await ctx.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  await connectToDatabase();
  await ensureFrontIntervalsMigrated(sessionCtx.systemId);

  const res = await HeadmateFrontIntervalModel.deleteOne({
    _id: id,
    systemId: sessionCtx.systemId,
  });

  if (res.deletedCount === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
