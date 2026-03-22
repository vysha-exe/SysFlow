import mongoose from "mongoose";
import { HeadmateModel } from "@/models/headmate";
import type { Types } from "mongoose";

/**
 * Parse and dedupe string ids from JSON body; validates format.
 * Returns error message or list of ObjectIds.
 */
export function parseHeadmateIdsFromBody(raw: unknown): {
  ok: true;
  ids: mongoose.Types.ObjectId[];
} | { ok: false; error: string } {
  const rawIds = Array.isArray(raw) ? raw : [];
  const headmateObjectIds: mongoose.Types.ObjectId[] = [];
  const seen = new Set<string>();
  for (const item of rawIds) {
    if (typeof item !== "string") continue;
    const s = item.trim();
    if (!s || seen.has(s)) continue;
    seen.add(s);
    try {
      headmateObjectIds.push(new mongoose.Types.ObjectId(s));
    } catch {
      return { ok: false, error: "Invalid headmate id." };
    }
  }
  return { ok: true, ids: headmateObjectIds };
}

export async function assertHeadmatesBelongToSystem(
  systemId: Types.ObjectId,
  headmateObjectIds: mongoose.Types.ObjectId[],
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (headmateObjectIds.length === 0) return { ok: true };
  const count = await HeadmateModel.countDocuments({
    systemId,
    _id: { $in: headmateObjectIds },
  });
  if (count !== headmateObjectIds.length) {
    return {
      ok: false,
      error: "One or more selected headmates are not in your system.",
    };
  }
  return { ok: true };
}
