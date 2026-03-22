import mongoose from "mongoose";
import { ensureFrontIntervalsMigrated } from "@/lib/front-interval-migrate";
import { HeadmateFrontIntervalModel } from "@/models/headmate-front-interval";
import { HeadmateModel } from "@/models/headmate";

async function assertHeadmateInSystem(
  systemId: mongoose.Types.ObjectId,
  headmateId: mongoose.Types.ObjectId,
) {
  const hm = await HeadmateModel.findOne({
    _id: headmateId,
    systemId,
  }).lean();
  if (!hm) {
    throw new Error("Headmate not found for this system.");
  }
}

async function openIntervalsForSystem(systemId: mongoose.Types.ObjectId) {
  return HeadmateFrontIntervalModel.find({ systemId, endedAt: null }).lean();
}

async function openEmptyFrontSegment(
  systemId: mongoose.Types.ObjectId,
  now: Date,
) {
  await HeadmateFrontIntervalModel.updateMany(
    { systemId, endedAt: null, headmateId: null },
    { $set: { endedAt: now } },
  );
  await HeadmateFrontIntervalModel.create({
    systemId,
    headmateId: null,
    startedAt: now,
    endedAt: null,
    note: "",
  });
}

export type FrontActionResult =
  | { changed: true }
  | { changed: false; reason: "already_in_state" };

export type ActiveFrontSessionLean = {
  _id: mongoose.Types.ObjectId;
  systemId: mongoose.Types.ObjectId;
  headmateIds: mongoose.Types.ObjectId[];
  startedAt: Date;
  endedAt: null;
};

export async function getActiveFrontSession(
  systemId: mongoose.Types.ObjectId,
): Promise<ActiveFrontSessionLean | null> {
  await ensureFrontIntervalsMigrated(systemId);

  const opens = await openIntervalsForSystem(systemId);
  if (opens.length === 0) return null;

  const headmateIds = opens
    .map((o) => o.headmateId)
    .filter((id): id is mongoose.Types.ObjectId => id != null);

  const startedAt = new Date(
    Math.min(...opens.map((o) => o.startedAt.getTime())),
  );

  return {
    _id: opens[0]._id,
    systemId,
    headmateIds,
    startedAt,
    endedAt: null,
  };
}

function currentHeadmateIdsFromOpens(
  opens: { headmateId: mongoose.Types.ObjectId | null }[],
) {
  return opens
    .map((o) => o.headmateId)
    .filter((id): id is mongoose.Types.ObjectId => id != null)
    .map((id) => String(id));
}

/**
 * Co-front: open a new interval only for this headmate (startedAt = now).
 * Existing fronters keep their intervals and timers. Empty-front placeholders are closed.
 */
export async function addToFront(
  systemId: mongoose.Types.ObjectId,
  headmateId: mongoose.Types.ObjectId,
): Promise<FrontActionResult> {
  await ensureFrontIntervalsMigrated(systemId);
  await assertHeadmateInSystem(systemId, headmateId);

  const opens = await openIntervalsForSystem(systemId);
  const current = currentHeadmateIdsFromOpens(opens);

  if (current.includes(String(headmateId))) {
    return { changed: false, reason: "already_in_state" };
  }

  const now = new Date();

  await HeadmateFrontIntervalModel.updateMany(
    { systemId, endedAt: null, headmateId: null },
    { $set: { endedAt: now } },
  );

  await HeadmateFrontIntervalModel.create({
    systemId,
    headmateId,
    startedAt: now,
    endedAt: null,
    note: "",
  });

  return { changed: true };
}

/**
 * Solo front: end everyone else’s open intervals; this headmate keeps theirs if already fronting.
 * If they were not fronting, open a new interval for them.
 */
export async function setAsFront(
  systemId: mongoose.Types.ObjectId,
  headmateId: mongoose.Types.ObjectId,
): Promise<FrontActionResult> {
  await ensureFrontIntervalsMigrated(systemId);
  await assertHeadmateInSystem(systemId, headmateId);

  const opens = await openIntervalsForSystem(systemId);
  const cur = currentHeadmateIdsFromOpens(opens);

  if (cur.length === 1 && cur[0] === String(headmateId)) {
    return { changed: false, reason: "already_in_state" };
  }

  const now = new Date();

  await HeadmateFrontIntervalModel.updateMany(
    {
      systemId,
      endedAt: null,
      headmateId: { $ne: headmateId },
    },
    { $set: { endedAt: now } },
  );

  const stillOpen = await openIntervalsForSystem(systemId);
  const targetStillFronting = stillOpen.some(
    (o) => o.headmateId != null && String(o.headmateId) === String(headmateId),
  );

  if (!targetStillFronting) {
    await HeadmateFrontIntervalModel.create({
      systemId,
      headmateId,
      startedAt: now,
      endedAt: null,
      note: "",
    });
  }

  return { changed: true };
}

/**
 * Remove one headmate’s open interval only. Other fronters unchanged.
 * If no headmates remain fronting, start a new empty-front segment.
 */
export async function removeFromFront(
  systemId: mongoose.Types.ObjectId,
  headmateId: mongoose.Types.ObjectId,
): Promise<FrontActionResult> {
  await ensureFrontIntervalsMigrated(systemId);
  await assertHeadmateInSystem(systemId, headmateId);

  const opens = await openIntervalsForSystem(systemId);
  if (opens.length === 0) {
    return { changed: false, reason: "already_in_state" };
  }

  const cur = currentHeadmateIdsFromOpens(opens);
  if (!cur.includes(String(headmateId))) {
    return { changed: false, reason: "already_in_state" };
  }

  const now = new Date();

  await HeadmateFrontIntervalModel.updateMany(
    { systemId, headmateId, endedAt: null },
    { $set: { endedAt: now } },
  );

  const stillOpen = await openIntervalsForSystem(systemId);
  const stillFronters = currentHeadmateIdsFromOpens(stillOpen);
  if (stillFronters.length === 0) {
    await openEmptyFrontSegment(systemId, now);
  }

  return { changed: true };
}

export type ActiveOpenInterval = {
  id: string;
  headmateId: string | null;
  note: string;
  startedAt: string;
};

/** Open front interval rows (for notes, per-headmate timers, etc.). */
export async function getActiveOpenIntervals(
  systemId: mongoose.Types.ObjectId,
): Promise<ActiveOpenInterval[]> {
  await ensureFrontIntervalsMigrated(systemId);
  const opens = await openIntervalsForSystem(systemId);
  return opens.map((o) => ({
    id: String(o._id),
    headmateId: o.headmateId ? String(o.headmateId) : null,
    note: typeof o.note === "string" ? o.note : "",
    startedAt: o.startedAt.toISOString(),
  }));
}
