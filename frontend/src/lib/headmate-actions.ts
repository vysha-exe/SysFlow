import mongoose from "mongoose";
import { FrontSessionModel } from "@/models/frontSession";
import { HeadmateModel } from "@/models/headmate";
import { removeFromFront } from "@/lib/front-actions";

/**
 * Deletes a headmate: removes them from front if needed, scrubs their id from
 * all front-session history rows, then deletes the document.
 */
export async function deleteHeadmate(
  systemId: mongoose.Types.ObjectId,
  headmateId: mongoose.Types.ObjectId,
) {
  const hm = await HeadmateModel.findOne({ _id: headmateId, systemId });
  if (!hm) {
    throw new Error("Headmate not found for this system.");
  }

  const active = await FrontSessionModel.findOne({ systemId, endedAt: null }).lean();
  const onFront = active?.headmateIds?.some(
    (id: unknown) => String(id) === String(headmateId),
  );
  if (onFront) {
    await removeFromFront(systemId, headmateId);
  }

  await FrontSessionModel.updateMany(
    { systemId, headmateIds: headmateId },
    { $pull: { headmateIds: headmateId } },
  );

  await HeadmateModel.deleteOne({ _id: headmateId, systemId });
}
