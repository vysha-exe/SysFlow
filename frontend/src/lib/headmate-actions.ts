import mongoose from "mongoose";
import { removeFromFront } from "@/lib/front-actions";
import { ensureFrontIntervalsMigrated } from "@/lib/front-interval-migrate";
import { HeadmateFrontIntervalModel } from "@/models/headmate-front-interval";
import { FrontSessionModel } from "@/models/frontSession";
import { HeadmateModel } from "@/models/headmate";

/**
 * Deletes a headmate: removes them from front if needed, removes their front
 * interval history, scrubs legacy session rows, then deletes the document.
 */
export async function deleteHeadmate(
  systemId: mongoose.Types.ObjectId,
  headmateId: mongoose.Types.ObjectId,
) {
  const hm = await HeadmateModel.findOne({ _id: headmateId, systemId });
  if (!hm) {
    throw new Error("Headmate not found for this system.");
  }

  await ensureFrontIntervalsMigrated(systemId);

  const opens = await HeadmateFrontIntervalModel.find({
    systemId,
    endedAt: null,
    headmateId,
  }).lean();
  if (opens.length > 0) {
    await removeFromFront(systemId, headmateId);
  }

  await HeadmateFrontIntervalModel.deleteMany({ systemId, headmateId });

  await FrontSessionModel.updateMany(
    { systemId, headmateIds: headmateId },
    { $pull: { headmateIds: headmateId } },
  );

  await HeadmateModel.deleteOne({ _id: headmateId, systemId });
}
