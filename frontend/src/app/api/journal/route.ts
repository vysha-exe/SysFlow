import { NextResponse } from "next/server";
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

export async function GET() {
  const ctx = await getSystemForSession();
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectToDatabase();
  await ensureDefaultHeadmates(ctx.systemId);

  const list = await JournalEntryModel.find({ systemId: ctx.systemId })
    .sort({ createdAt: -1 })
    .limit(200)
    .lean();

  return NextResponse.json({
    entries: list.map(serializeJournalEntry),
  });
}

type PostBody = {
  title?: string;
  content?: string;
  headmateIds?: unknown;
};

export async function POST(request: Request) {
  const ctx = await getSystemForSession();
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: PostBody;
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
    typeof body.content === "string" ? body.content.trim().slice(0, JOURNAL_CONTENT_MAX_CHARS) : "";

  if (!content) {
    return NextResponse.json(
      { error: `Journal text is required (max ${JOURNAL_CONTENT_MAX_CHARS.toLocaleString()} characters).` },
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

  const headmateObjectIds = parsed.ids;

  const doc = await JournalEntryModel.create({
    systemId: ctx.systemId,
    title: titleParsed.title,
    content,
    headmateIds: headmateObjectIds,
  });

  return NextResponse.json({ entry: serializeJournalEntry(doc.toObject()) }, { status: 201 });
}
