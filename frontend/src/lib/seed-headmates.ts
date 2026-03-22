import mongoose from "mongoose";
import { HeadmateModel } from "@/models/headmate";

const DEFAULT_HEADMATES = [
  {
    name: "Alex",
    pronouns: "they/them",
    description: "",
    customFields: [{ key: "role", value: "organizer" }],
  },
  {
    name: "River",
    pronouns: "she/they",
    description: "",
    customFields: [
      { key: "role", value: "social" },
      { key: "notes", value: "likes journaling" },
    ],
  },
  {
    name: "Kai",
    pronouns: "he/him",
    description: "",
    customFields: [{ key: "role", value: "protector" }],
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
    })),
  );
}
