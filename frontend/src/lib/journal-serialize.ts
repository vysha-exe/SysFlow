export type SerializedJournalEntry = {
  id: string;
  systemId: string;
  title: string;
  content: string;
  headmateIds: string[];
  createdAt: string;
  updatedAt: string;
};

export function serializeJournalEntry(doc: {
  _id: unknown;
  systemId: unknown;
  title?: string;
  content: string;
  headmateIds?: unknown;
  createdAt?: Date;
  updatedAt?: Date;
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
  };
}
