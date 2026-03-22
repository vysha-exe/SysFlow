import { createHash } from "node:crypto";

/**
 * Canonical JSON for anchoring: stable field order and sorted headmate ids.
 * Changing this format bumps the `v` field and changes hashes (by design).
 */
export function canonicalJournalAnchorPayload(input: {
  entryId: string;
  systemId: string;
  title: string;
  content: string;
  headmateIds: string[];
  updatedAtIso: string;
}): string {
  const headmateIds = [...input.headmateIds].map(String).sort();
  return JSON.stringify({
    v: 1,
    entryId: input.entryId,
    systemId: input.systemId,
    title: input.title,
    content: input.content,
    headmateIds,
    updatedAt: input.updatedAtIso,
  });
}

export function sha256HexOfString(utf8: string): string {
  return createHash("sha256").update(utf8, "utf8").digest("hex");
}

/** Memo payload: short prefix + 64-char hex (fits Solana memo limits). */
export function memoPayloadFromHashHex(hashHex: string): string {
  return `sysflow:v1:${hashHex}`;
}
