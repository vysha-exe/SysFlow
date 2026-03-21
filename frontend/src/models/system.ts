import { Schema, model, models } from "mongoose";

const systemSchema = new Schema(
  {
    ownerUserId: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    name: { type: String, required: true },
    username: { type: String, required: true, unique: true },
    description: { type: String, default: "" },
    iconUrl: { type: String },
  },
  { timestamps: true },
);

export const SystemModel = models.System || model("System", systemSchema);
