import mongoose from "mongoose";
import { FrontSessionModel } from "@/models/frontSession";
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

/** Ends any active session (`endedAt: null`) and creates a new one — each row is a history segment. */
async function transitionToNewFrontState(
  systemId: mongoose.Types.ObjectId,
  newHeadmateIds: mongoose.Types.ObjectId[],
) {
  const now = new Date();

  await FrontSessionModel.updateMany(
    { systemId, endedAt: null },
    { $set: { endedAt: now } },
  );

  return FrontSessionModel.create({
    systemId,
    headmateIds: newHeadmateIds,
    startedAt: now,
    endedAt: null,
  });
}

export type FrontActionResult =
  | { changed: true }
  | { changed: false; reason: "already_in_state" };

export async function getActiveFrontSession(systemId: mongoose.Types.ObjectId) {
  return FrontSessionModel.findOne({
    systemId,
    endedAt: null,
  }).lean();
}

function idsEqual(a: mongoose.Types.ObjectId[], b: mongoose.Types.ObjectId[]) {
  if (a.length !== b.length) return false;
  const as = [...a].map(String).sort();
  const bs = [...b].map(String).sort();
  return as.every((v, i) => v === bs[i]);
}

/** Co-front: new session = previous fronters + this headmate (new history row). */
export async function addToFront(
  systemId: mongoose.Types.ObjectId,
  headmateId: mongoose.Types.ObjectId,
): Promise<FrontActionResult> {
  await assertHeadmateInSystem(systemId, headmateId);

  const active = await FrontSessionModel.findOne({ systemId, endedAt: null }).lean();
  const current = (active?.headmateIds ?? []).map((id: unknown) => String(id));

  if (current.includes(String(headmateId))) {
    return { changed: false, reason: "already_in_state" };
  }

  const nextIds = [...(active?.headmateIds ?? []), headmateId];
  await transitionToNewFrontState(systemId, nextIds);
  return { changed: true };
}

/** Solo front: new session = only this headmate. No-op if already the sole fronter. */
export async function setAsFront(
  systemId: mongoose.Types.ObjectId,
  headmateId: mongoose.Types.ObjectId,
): Promise<FrontActionResult> {
  await assertHeadmateInSystem(systemId, headmateId);

  const active = await FrontSessionModel.findOne({ systemId, endedAt: null }).lean();
  const cur = active?.headmateIds ?? [];

  if (cur.length === 1 && String(cur[0]) === String(headmateId)) {
    return { changed: false, reason: "already_in_state" };
  }

  await transitionToNewFrontState(systemId, [headmateId]);
  return { changed: true };
}

/** Remove one headmate; may become empty (new session with `[]` is logged). */
export async function removeFromFront(
  systemId: mongoose.Types.ObjectId,
  headmateId: mongoose.Types.ObjectId,
): Promise<FrontActionResult> {
  await assertHeadmateInSystem(systemId, headmateId);

  const active = await FrontSessionModel.findOne({ systemId, endedAt: null }).lean();
  if (!active) {
    return { changed: false, reason: "already_in_state" };
  }

  const cur = active.headmateIds.map((id: unknown) => String(id));
  if (!cur.includes(String(headmateId))) {
    return { changed: false, reason: "already_in_state" };
  }

  const nextIds = active.headmateIds.filter(
    (id: unknown) => String(id) !== String(headmateId),
  );
  await transitionToNewFrontState(systemId, nextIds);
  return { changed: true };
}
