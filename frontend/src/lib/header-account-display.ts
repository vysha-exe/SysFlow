import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { DEV_BYPASS_USER_EMAIL, isAuthBypassEnabled } from "@/lib/auth-bypass";
import { connectToDatabase } from "@/lib/mongodb";
import { UserModel } from "@/models/user";

/**
 * Account name for the shell header — read from MongoDB so it stays in sync with
 * the system profile display name (`users.name` ↔ `systems.name` base).
 */
export async function getHeaderAccountDisplay(): Promise<{
  /** Shown next to nav; same as signup / system profile display name when synced. */
  primaryLabel: string | null;
  /** Usually email; used for `title` tooltip. */
  detail: string | null;
  mode: "bypass" | "signed_in" | "guest";
}> {
  if (isAuthBypassEnabled()) {
    await connectToDatabase();
    const dev = await UserModel.findOne({ email: DEV_BYPASS_USER_EMAIL })
      .select("name email")
      .lean();
    return {
      primaryLabel: dev?.name?.trim() || "Dev bypass",
      detail: dev?.email ?? null,
      mode: "bypass",
    };
  }

  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return { primaryLabel: null, detail: null, mode: "guest" };
  }

  // `session.user.name` is refreshed from MongoDB in `authOptions.callbacks.session`
  // so it matches the system profile display name after edits.
  return {
    primaryLabel: session.user.name?.trim() || session.user.email || null,
    detail: session.user.email ?? null,
    mode: "signed_in",
  };
}
