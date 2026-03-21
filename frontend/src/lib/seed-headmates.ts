import mongoose from "mongoose";
import { HeadmateModel } from "@/models/headmate";

const DEFAULT_HEADMATES = [
  {
    name: "Alex",
    pronouns: "they/them",
    description: "Grounded and focused during planning tasks.",
    customFields: { role: "organizer", energy: "steady" },
    privacyLevel: "friends_only" as const,
  },
  {
    name: "River",
    pronouns: "she/they",
    description: "Creative and social, often fronts in evenings.",
    customFields: { role: "social", notes: "likes journaling" },
    privacyLevel: "trusted_friends_only" as const,
  },
  {
    name: "Kai",
    pronouns: "he/him",
    description: "Protective and quick to assess risk.",
    customFields: { role: "protector" },
    privacyLevel: "private" as const,
  },
];

export async function ensureDefaultHeadmates(systemId: mongoose.Types.ObjectId) {
  const count = await HeadmateModel.countDocuments({ systemId });
  if (count > 0) return;

  await HeadmateModel.insertMany(
    DEFAULT_HEADMATES.map((h) => ({
      systemId,
      name: h.name,
      pronouns: h.pronouns,
      description: h.description,
      customFields: h.customFields,
      privacyLevel: h.privacyLevel,
    })),
  );
}
