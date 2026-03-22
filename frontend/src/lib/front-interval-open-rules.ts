import mongoose from "mongoose";
import { HeadmateFrontIntervalModel } from "@/models/headmate-front-interval";

/** At most one open interval per headmate slot (including “empty” headmateId: null). */
export async function closeOtherOpenIntervalsForSlot(
  systemId: mongoose.Types.ObjectId,
  headmateId: mongoose.Types.ObjectId | null,
  exceptId: mongoose.Types.ObjectId,
) {
  const filter =
    headmateId != null
      ? { systemId, headmateId, endedAt: null, _id: { $ne: exceptId } }
      : { systemId, headmateId: null, endedAt: null, _id: { $ne: exceptId } };

  await HeadmateFrontIntervalModel.updateMany(filter, {
    $set: { endedAt: new Date() },
  });
}

/** Before creating a new open interval for this slot, end any existing open row. */
export async function closeAllOpenIntervalsForSlot(
  systemId: mongoose.Types.ObjectId,
  headmateId: mongoose.Types.ObjectId | null,
) {
  const filter =
    headmateId != null
      ? { systemId, headmateId, endedAt: null }
      : { systemId, headmateId: null, endedAt: null };

  await HeadmateFrontIntervalModel.updateMany(filter, {
    $set: { endedAt: new Date() },
  });
}
