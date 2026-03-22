import mongoose from "mongoose";

export type LeanFrontInterval = {
  _id: mongoose.Types.ObjectId;
  systemId: mongoose.Types.ObjectId;
  headmateId: mongoose.Types.ObjectId | null;
  startedAt: Date;
  endedAt: Date | null;
  note?: string;
};

/**
 * Merge intervals that share the same time window and note (typical co-front rows)
 * into legacy-shaped “sessions” for APIs that still expect `headmateIds[]`.
 */
export function groupIntervalsToSessions(intervals: LeanFrontInterval[]) {
  const map = new Map<
    string,
    {
      _id: mongoose.Types.ObjectId;
      systemId: mongoose.Types.ObjectId;
      headmateIds: mongoose.Types.ObjectId[];
      startedAt: Date;
      endedAt: Date | null;
      note: string;
    }
  >();

  for (const row of intervals) {
    const endKey = row.endedAt ? row.endedAt.getTime() : "null";
    const key = `${row.startedAt.getTime()}|${endKey}|${row.note ?? ""}`;
    if (!map.has(key)) {
      map.set(key, {
        _id: row._id,
        systemId: row.systemId,
        headmateIds: [],
        startedAt: row.startedAt,
        endedAt: row.endedAt,
        note: row.note ?? "",
      });
    }
    const g = map.get(key)!;
    if (row.headmateId) {
      g.headmateIds.push(row.headmateId);
    }
  }

  return [...map.values()].sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime());
}
