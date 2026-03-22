import { randomBytes } from "node:crypto";
import { connectToDatabase } from "@/lib/mongodb";
import { SystemModel } from "@/models/system";
import { UserModel } from "@/models/user";

/** Email-local slug length (matches previous behavior). */
const USERNAME_BASE_MAX = 18;
/** Hard cap so `base_N` / `base_hex` stays reasonable for indexes and URLs. */
const USERNAME_MAX_LEN = 40;

function toBaseUsername(value: string) {
  const slug =
    value.toLowerCase().replace(/[^a-z0-9_]/g, "_").slice(0, USERNAME_BASE_MAX) ||
    "sysflow_user";
  return slug.slice(0, USERNAME_BASE_MAX);
}

function isDuplicateKeyError(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code?: number }).code === 11000
  );
}

function duplicateKeyHasField(err: unknown, field: string): boolean {
  const keyValue = (err as { keyValue?: Record<string, unknown> }).keyValue;
  return keyValue != null && field in keyValue;
}

/**
 * Picks a system username not present at check time. Callers must still handle
 * race conditions (two signups concurrently) with a create retry on duplicate key.
 */
async function generateUniqueUsername(base: string): Promise<string> {
  const normalizedBase = toBaseUsername(base);

  const tryCandidate = async (candidate: string): Promise<string | null> => {
    const trimmed =
      candidate.length > USERNAME_MAX_LEN
        ? candidate.slice(0, USERNAME_MAX_LEN)
        : candidate;
    const existing = await SystemModel.findOne({ username: trimmed })
      .select("_id")
      .lean();
    return existing ? null : trimmed;
  };

  // Sequential: base, base_1, base_2, …
  const maxSequential = 100;
  for (let attempt = 0; attempt <= maxSequential; attempt++) {
    const candidate =
      attempt === 0 ? normalizedBase : `${normalizedBase}_${attempt}`;
    const ok = await tryCandidate(candidate);
    if (ok) return ok;
  }

  // Rare: many collisions — random suffix (still bounded attempts).
  for (let i = 0; i < 25; i++) {
    const suffix = randomBytes(3).toString("hex");
    const stem = normalizedBase.slice(0, Math.max(1, USERNAME_BASE_MAX - 1 - suffix.length));
    const ok = await tryCandidate(`${stem}_${suffix}`);
    if (ok) return ok;
  }

  throw new Error("Unable to generate a unique system username.");
}

const CREATE_USERNAME_RETRIES = 12;

export async function ensureUserSystem(userId: string, name: string, email: string) {
  await connectToDatabase();

  const existing = await SystemModel.findOne({ ownerUserId: userId }).lean();
  if (existing) return;

  const base = toBaseUsername(email.split("@")[0]);

  for (let attempt = 0; attempt < CREATE_USERNAME_RETRIES; attempt++) {
    const username =
      attempt === 0
        ? await generateUniqueUsername(base)
        : await generateUniqueUsername(`${base}_${randomBytes(2).toString("hex")}`);

    try {
      const displayBase = name.trim() || "SysFlow user";
      await SystemModel.create({
        ownerUserId: userId,
        /** Short display name; UI shows `${name}'s System` (see `formatSystemTitle`). */
        name: displayBase,
        username,
        description: "New SysFlow system profile.",
      });
      return;
    } catch (e) {
      if (!isDuplicateKeyError(e)) throw e;

      // Same user, parallel ensureUserSystem: another request created the system first.
      if (duplicateKeyHasField(e, "ownerUserId")) {
        const now = await SystemModel.findOne({ ownerUserId: userId }).lean();
        if (now) return;
        throw e;
      }

      // Username taken between check and insert, or unique index race — retry.
      if (duplicateKeyHasField(e, "username")) {
        continue;
      }

      throw e;
    }
  }

  throw new Error("Could not create system: too many username conflicts. Try again.");
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
