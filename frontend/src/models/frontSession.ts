import { Schema, model, models } from "mongoose";

const frontSessionSchema = new Schema(
  {
    systemId: { type: Schema.Types.ObjectId, ref: "System", required: true, index: true },
    headmateIds: [{ type: Schema.Types.ObjectId, ref: "Headmate" }],
    startedAt: { type: Date, required: true },
    /** null / missing = active session */
    endedAt: { type: Date, default: null },
    note: { type: String },
  },
  { timestamps: true },
);

frontSessionSchema.index({ systemId: 1, endedAt: 1 });

export const FrontSessionModel =
  models.FrontSession || model("FrontSession", frontSessionSchema);
