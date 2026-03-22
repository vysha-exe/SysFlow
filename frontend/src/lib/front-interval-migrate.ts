import mongoose from "mongoose";
import { FrontSessionModel } from "@/models/frontSession";
import { HeadmateFrontIntervalModel } from "@/models/headmate-front-interval";

/**
 * One-time per system: expand legacy `FrontSession` rows into per-headmate intervals.
 * Skips if this system already has any interval documents.
 */
export async function ensureFrontIntervalsMigrated(
  systemId: mongoose.Types.ObjectId,
): Promise<void> {
  const existing = await HeadmateFrontIntervalModel.countDocuments({ systemId });
  if (existing > 0) return;

  const sessions = await FrontSessionModel.find({ systemId })
    .sort({ startedAt: 1 })
    .lean();

  const docs: Array<{
    systemId: mongoose.Types.ObjectId;
    headmateId: mongoose.Types.ObjectId | null;
    startedAt: Date;
    endedAt: Date | null;
    note: string;
  }> = [];

  for (const s of sessions) {
    const ids = (s.headmateIds ?? []) as mongoose.Types.ObjectId[];
    const note = typeof s.note === "string" ? s.note : "";
    if (ids.length === 0) {
      docs.push({
        systemId,
        headmateId: null,
        startedAt: s.startedAt,
        endedAt: s.endedAt ?? null,
        note,
      });
    } else {
      for (const hid of ids) {
        docs.push({
          systemId,
          headmateId: hid,
          startedAt: s.startedAt,
          endedAt: s.endedAt ?? null,
          note,
        });
      }
    }
  }

  if (docs.length > 0) {
    await HeadmateFrontIntervalModel.insertMany(docs);
  }
}
