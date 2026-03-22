/**
 * Front history list order:
 * 1. **All active** (`endedAt == null`) first — then everything else.
 * 2. Within each group: newer `startedAt` first.
 * 3. Stable tie-break on `_id`.
 */
export function sortFrontHistoryIntervals<
  T extends {
    startedAt: Date;
    endedAt: Date | null;
    _id: unknown;
  },
>(rows: T[]): T[] {
  return [...rows].sort((a, b) => {
    const aActive = a.endedAt == null ? 1 : 0;
    const bActive = b.endedAt == null ? 1 : 0;
    if (bActive !== aActive) return bActive - aActive;

    const ta = a.startedAt.getTime();
    const tb = b.startedAt.getTime();
    if (tb !== ta) return tb - ta;

    return String(a._id).localeCompare(String(b._id));
  });
}
