import { Schema, model, models } from "mongoose";

const frontSessionSchema = new Schema(
  {
    systemId: { type: Schema.Types.ObjectId, ref: "System", required: true, index: true },
    headmateIds: [
      { type: Schema.Types.ObjectId, ref: "Headmate", required: true, index: true },
    ],
    startedAt: { type: Date, required: true, index: true },
    endedAt: { type: Date, default: null, index: true },
    note: { type: String, default: "" },
  },
  { timestamps: true },
);

export const FrontSessionModel =
  models.FrontSession || model("FrontSession", frontSessionSchema);
