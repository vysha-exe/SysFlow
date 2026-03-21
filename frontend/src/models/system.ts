import mongoose, { Schema, model } from "mongoose";

const headmateFieldTemplateSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    fieldLabels: [{ type: String, trim: true }],
  },
  { _id: true },
);

const systemSchema = new Schema(
  {
    ownerUserId: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    name: { type: String, required: true },
    username: { type: String, required: true, unique: true },
    description: { type: String, default: "" },
    iconUrl: { type: String },
    /** Reusable label-only layouts for new headmates (values filled in the editor). */
    headmateTemplates: { type: [headmateFieldTemplateSchema], default: [] },
    defaultHeadmateTemplateId: { type: Schema.Types.ObjectId, default: null },
  },
  { timestamps: true },
);

// Avoid stale schema in Next.js dev (hot reload): old model would omit new paths like headmateTemplates.
if (mongoose.models.System) {
  delete mongoose.models.System;
}

export const SystemModel = model("System", systemSchema);
