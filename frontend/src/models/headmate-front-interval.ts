import { Schema, model, models } from "mongoose";

/** One continuous front segment for a single headmate (or empty front when headmateId is null). */
const headmateFrontIntervalSchema = new Schema(
  {
    systemId: { type: Schema.Types.ObjectId, ref: "System", required: true, index: true },
    /** null = “no one fronting” segment (same idea as headmateIds: [] on legacy FrontSession) */
    headmateId: { type: Schema.Types.ObjectId, ref: "Headmate", default: null, index: true },
    startedAt: { type: Date, required: true, index: true },
    endedAt: { type: Date, default: null, index: true },
    note: { type: String, default: "" },
  },
  { timestamps: true },
);

headmateFrontIntervalSchema.index({ systemId: 1, endedAt: 1 });
headmateFrontIntervalSchema.index({ systemId: 1, headmateId: 1, endedAt: 1 });

export const HeadmateFrontIntervalModel =
  models.HeadmateFrontInterval ||
  model("HeadmateFrontInterval", headmateFrontIntervalSchema);
