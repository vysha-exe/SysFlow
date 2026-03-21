import { connectToDatabase } from "@/lib/mongodb";
import { SystemModel } from "@/models/system";
import { UserModel } from "@/models/user";

function toBaseUsername(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9_]/g, "_").slice(0, 18) || "sysflow_user";
}

async function generateUniqueUsername(base: string) {
  let candidate = base;
  let attempt = 0;

  while (true) {
    // Small bounded loop for unique usernames.
    const existing = await SystemModel.findOne({ username: candidate }).lean();
    if (!existing) return candidate;

    attempt += 1;
    candidate = `${base}_${attempt}`;
  }
}

export async function ensureUserSystem(userId: string, name: string, email: string) {
  await connectToDatabase();

  const existing = await SystemModel.findOne({ ownerUserId: userId }).lean();
  if (existing) return;

  const base = toBaseUsername(email.split("@")[0]);
  const username = await generateUniqueUsername(base);

  await SystemModel.create({
    ownerUserId: userId,
    name: `${name}'s System`,
    username,
    description: "New SysFlow system profile.",
  });
}

export async function upsertGoogleUser(params: {
  email: string;
  name: string;
  image?: string | null;
}) {
  await connectToDatabase();

  const user = await UserModel.findOneAndUpdate(
    { email: params.email.toLowerCase() },
    {
      $set: {
        name: params.name,
        image: params.image ?? undefined,
        provider: "google",
      },
      $setOnInsert: {
        email: params.email.toLowerCase(),
      },
    },
    { new: true, upsert: true },
  );

  await ensureUserSystem(String(user._id), user.name, user.email);
}
