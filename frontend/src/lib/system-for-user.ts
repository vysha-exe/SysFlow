import { getServerSession } from "next-auth";
import mongoose from "mongoose";
import { authOptions } from "@/lib/auth-options";
import { connectToDatabase } from "@/lib/mongodb";
import { SystemModel } from "@/models/system";

export async function getSystemForSession() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;

  await connectToDatabase();

  const system = await SystemModel.findOne({
    ownerUserId: new mongoose.Types.ObjectId(session.user.id),
  }).lean();

  if (!system) return null;

  return {
    userId: session.user.id,
    systemId: system._id as mongoose.Types.ObjectId,
  };
}
