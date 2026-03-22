import mongoose, { Schema, model } from "mongoose";

const journalEntrySchema = new Schema(
  {
    systemId: { type: Schema.Types.ObjectId, ref: "System", required: true, index: true },
    title: { type: String, default: "", trim: true },
    content: { type: String, required: true },
    /** Headmates credited as authors (optional). */
    headmateIds: [{ type: Schema.Types.ObjectId, ref: "Headmate" }],
    /** Optional: SHA-256 commitment anchored on Solana (hash only; memo tx). Cleared when entry body changes. */
    anchor: {
      hash: { type: String },
      txSignature: { type: String },
      cluster: { type: String },
      slot: { type: Number },
      anchoredAt: { type: Date },
    },
  },
  { timestamps: true },
);

// Avoid stale schema in Next.js dev (hot reload): old model would omit `title` and saves would drop it.
if (mongoose.models.JournalEntry) {
  delete mongoose.models.JournalEntry;
}

export const JournalEntryModel = model("JournalEntry", journalEntrySchema);
