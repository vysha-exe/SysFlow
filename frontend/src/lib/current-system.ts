import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { isAuthBypassEnabled } from "@/lib/auth-bypass";
import { ensureUserSystem } from "@/lib/accounts";
import { connectToDatabase } from "@/lib/mongodb";
import { SystemModel } from "@/models/system";
import { UserModel } from "@/models/user";

export async function getCurrentSystem() {
  await connectToDatabase();

  if (isAuthBypassEnabled()) {
    // Always use the dedicated dev user + their system — never pick a random system
    // from the DB (that breaks headmates/front APIs and confuses testing).
    const devEmail = "dev-bypass@sysflow.local";
    let devUser = await UserModel.findOne({ email: devEmail });
    if (!devUser) {
      devUser = await UserModel.create({
        email: devEmail,
        name: "Dev Bypass User",
        provider: "credentials",
      });
    }

    await ensureUserSystem(String(devUser._id), devUser.name, devUser.email);
    const system = await SystemModel.findOne({ ownerUserId: devUser._id }).lean();

    return system;
  }

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;

  return SystemModel.findOne({ ownerUserId: session.user.id }).lean();
}
