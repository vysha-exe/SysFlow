import mongoose, { Schema, model } from "mongoose";

const journalEntrySchema = new Schema(
  {
    systemId: { type: Schema.Types.ObjectId, ref: "System", required: true, index: true },
    title: { type: String, default: "", trim: true },
    content: { type: String, required: true },
    /** Headmates credited as authors (optional). */
    headmateIds: [{ type: Schema.Types.ObjectId, ref: "Headmate" }],
  },
  { timestamps: true },
);

// Avoid stale schema in Next.js dev (hot reload): old model would omit `title` and saves would drop it.
if (mongoose.models.JournalEntry) {
  delete mongoose.models.JournalEntry;
}

export const JournalEntryModel = model("JournalEntry", journalEntrySchema);
