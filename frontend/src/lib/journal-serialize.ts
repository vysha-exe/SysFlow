export type JournalAnchorInfo = {
  hash: string;
  txSignature: string;
  cluster: string;
  slot: number;
  anchoredAt: string;
};

export type SerializedJournalEntry = {
  id: string;
  systemId: string;
  title: string;
  content: string;
  headmateIds: string[];
  createdAt: string;
  updatedAt: string;
  anchor: JournalAnchorInfo | null;
};

function serializeAnchor(
  raw: unknown,
): JournalAnchorInfo | null {
  if (!raw || typeof raw !== "object") return null;
  const a = raw as Record<string, unknown>;
  const hash = typeof a.hash === "string" ? a.hash : "";
  const txSignature = typeof a.txSignature === "string" ? a.txSignature : "";
  const cluster = typeof a.cluster === "string" ? a.cluster : "";
  const slot = typeof a.slot === "number" && Number.isFinite(a.slot) ? a.slot : 0;
  const anchoredAt =
    a.anchoredAt instanceof Date
      ? a.anchoredAt.toISOString()
      : typeof a.anchoredAt === "string"
        ? a.anchoredAt
        : "";
  if (!hash || !txSignature || !cluster || !anchoredAt) return null;
  return { hash, txSignature, cluster, slot, anchoredAt };
}

export function serializeJournalEntry(doc: {
  _id: unknown;
  systemId: unknown;
  title?: string;
  content: string;
  headmateIds?: unknown;
  createdAt?: Date;
  updatedAt?: Date;
  anchor?: unknown;
}): SerializedJournalEntry {
  const ids = Array.isArray(doc.headmateIds)
    ? doc.headmateIds.map((id) => String(id))
    : [];
  const title = typeof doc.title === "string" ? doc.title.trim() : "";
  return {
    id: String(doc._id),
    systemId: String(doc.systemId),
    title,
    content: doc.content,
    headmateIds: ids,
    createdAt: (doc.createdAt ?? new Date()).toISOString(),
    updatedAt: (doc.updatedAt ?? doc.createdAt ?? new Date()).toISOString(),
    anchor: serializeAnchor(doc.anchor),
  };
}
