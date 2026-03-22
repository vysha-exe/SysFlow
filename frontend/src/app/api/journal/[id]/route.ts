import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { JOURNAL_CONTENT_MAX_CHARS } from "@/lib/display-limits";
import { parseJournalTitle } from "@/lib/journal-title";
import {
  assertHeadmatesBelongToSystem,
  parseHeadmateIdsFromBody,
} from "@/lib/journal-headmate-ids";
import { serializeJournalEntry } from "@/lib/journal-serialize";
import { connectToDatabase } from "@/lib/mongodb";
import { ensureDefaultHeadmates } from "@/lib/seed-headmates";
import { getSystemForSession } from "@/lib/system-for-user";
import { JournalEntryModel } from "@/models/journal-entry";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  const ctx = await getSystemForSession();
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  let entryId: mongoose.Types.ObjectId;
  try {
    entryId = new mongoose.Types.ObjectId(id);
  } catch {
    return NextResponse.json({ error: "Invalid entry id." }, { status: 400 });
  }

  let body: { title?: string; content?: string; headmateIds?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const titleParsed = parseJournalTitle(body.title);
  if (!titleParsed.ok) {
    return NextResponse.json({ error: titleParsed.error }, { status: 400 });
  }

  const content =
    typeof body.content === "string"
      ? body.content.trim().slice(0, JOURNAL_CONTENT_MAX_CHARS)
      : "";

  if (!content) {
    return NextResponse.json(
      {
        error: `Journal text is required (max ${JOURNAL_CONTENT_MAX_CHARS.toLocaleString()} characters).`,
      },
      { status: 400 },
    );
  }

  const parsed = parseHeadmateIdsFromBody(body.headmateIds);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  await connectToDatabase();
  await ensureDefaultHeadmates(ctx.systemId);

  const belongs = await assertHeadmatesBelongToSystem(ctx.systemId, parsed.ids);
  if (!belongs.ok) {
    return NextResponse.json({ error: belongs.error }, { status: 400 });
  }

  const existing = await JournalEntryModel.findOne({
    _id: entryId,
    systemId: ctx.systemId,
  });
  if (!existing) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  existing.title = titleParsed.title;
  existing.content = content;
  existing.headmateIds = parsed.ids;
  await existing.save();

  return NextResponse.json({ entry: serializeJournalEntry(existing.toObject()) });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const ctx = await getSystemForSession();
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  let entryId: mongoose.Types.ObjectId;
  try {
    entryId = new mongoose.Types.ObjectId(id);
  } catch {
    return NextResponse.json({ error: "Invalid entry id." }, { status: 400 });
  }

  await connectToDatabase();

  const result = await JournalEntryModel.deleteOne({
    _id: entryId,
    systemId: ctx.systemId,
  });

  if (result.deletedCount === 0) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
