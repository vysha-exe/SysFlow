import { Schema, model, models } from "mongoose";

const privacyLevel = [
  "public",
  "friends_only",
  "trusted_friends_only",
  "private",
] as const;

const headmateSchema = new Schema(
  {
    systemId: { type: Schema.Types.ObjectId, ref: "System", required: true, index: true },
    name: { type: String, required: true },
    pronouns: { type: String, default: "" },
    description: { type: String, default: "" },
    /** Ordered list of { key, value }; legacy plain objects are still supported at read time. */
    customFields: { type: Schema.Types.Mixed, default: [] },
    privacyLevel: {
      type: String,
      enum: privacyLevel,
      default: "private",
    },
    iconUrl: { type: String },
  },
  { timestamps: true },
);

export const HeadmateModel = models.Headmate || model("Headmate", headmateSchema);
