import { NextResponse } from "next/server";
import mongoose from "mongoose";
import {
  canonicalJournalAnchorPayload,
  memoPayloadFromHashHex,
  sha256HexOfString,
} from "@/lib/journal-anchor-hash";
import { serializeJournalEntry } from "@/lib/journal-serialize";
import { connectToDatabase } from "@/lib/mongodb";
import { getSystemForSession } from "@/lib/system-for-user";
import { getAnchorClusterFromEnv, sendMemoTransaction } from "@/lib/solana-anchor";
import { JournalEntryModel } from "@/models/journal-entry";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * POST /api/journal/:id/anchor
 * Commits SHA-256(canonical entry) to Solana via Memo program (server-funded).
 * Requires SOLANA_ANCHOR_SECRET_KEY and optional SOLANA_CLUSTER / SOLANA_RPC_URL.
 */
export async function POST(_request: Request, context: RouteContext) {
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

  const entry = await JournalEntryModel.findOne({
    _id: entryId,
    systemId: ctx.systemId,
  });
  if (!entry) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const headmateIds = Array.isArray(entry.headmateIds)
    ? entry.headmateIds.map((h) => String(h))
    : [];
  const title = typeof entry.title === "string" ? entry.title.trim() : "";
  const updatedAt = (entry.updatedAt ?? entry.createdAt ?? new Date()).toISOString();

  const canonical = canonicalJournalAnchorPayload({
    entryId: String(entry._id),
    systemId: String(entry.systemId),
    title,
    content: entry.content,
    headmateIds,
    updatedAtIso: updatedAt,
  });
  const hashHex = sha256HexOfString(canonical);
  const memo = memoPayloadFromHashHex(hashHex);
  const cluster = getAnchorClusterFromEnv();

  const existing = entry.anchor as
    | { hash?: string; txSignature?: string }
    | undefined;
  if (existing?.hash === hashHex && existing?.txSignature) {
    return NextResponse.json({
      entry: serializeJournalEntry(entry.toObject()),
      alreadyAnchored: true,
    });
  }

  try {
    const { signature, slot } = await sendMemoTransaction(memo);
    entry.set("anchor", {
      hash: hashHex,
      txSignature: signature,
      cluster,
      slot,
      anchoredAt: new Date(),
    });
    await entry.save();

    return NextResponse.json({
      entry: serializeJournalEntry(entry.toObject()),
      alreadyAnchored: false,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Anchor failed.";
    if (
      msg.includes("SOLANA_ANCHOR_SECRET_KEY") ||
      msg.includes("not set") ||
      msg.includes("decode")
    ) {
      return NextResponse.json(
        {
          error:
            "Journal anchoring is not configured. Set SOLANA_ANCHOR_SECRET_KEY (base64 keypair) and optionally SOLANA_CLUSTER / SOLANA_RPC_URL on the server.",
        },
        { status: 503 },
      );
    }
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
