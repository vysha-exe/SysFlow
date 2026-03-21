import { Types } from "mongoose";
import { getCurrentSystem } from "@/lib/current-system";
import { connectToDatabase } from "@/lib/mongodb";
import { headmates as mockHeadmates } from "@/lib/mock-data";
import { FrontSessionModel } from "@/models/front-session";
import { HeadmateModel } from "@/models/headmate";

type FrontAction = "add" | "set" | "remove";

async function ensureHeadmates(systemId: string) {
  const count = await HeadmateModel.countDocuments({ systemId });
  if (count > 0) return;

  await HeadmateModel.insertMany(
    mockHeadmates.map((headmate) => ({
      systemId,
      name: headmate.name,
      pronouns: headmate.pronouns,
      description: headmate.description,
      customFields: headmate.customFields,
      privacyLevel: headmate.privacyLevel,
    })),
  );
}

export async function getFrontStateForCurrentSystem() {
  await connectToDatabase();
  const system = await getCurrentSystem();
  if (!system) return null;

  const systemId = String(system._id);
  await ensureHeadmates(systemId);

  const [headmates, frontSessions] = await Promise.all([
    HeadmateModel.find({ systemId }).sort({ createdAt: 1 }).lean(),
    FrontSessionModel.find({ systemId }).sort({ startedAt: -1 }).lean(),
  ]);

  const activeSession = frontSessions.find((session) => !session.endedAt) ?? null;

  return {
    system: {
      id: String(system._id),
      name: system.name as string,
      username: system.username as string,
      description: (system.description as string) ?? "",
    },
    headmates: headmates.map((headmate) => ({
      id: String(headmate._id),
      name: headmate.name as string,
      pronouns: headmate.pronouns as string,
      description: headmate.description as string,
      customFields: Object.fromEntries(
        headmate.customFields instanceof Map
          ? headmate.customFields.entries()
          : Object.entries((headmate.customFields as Record<string, string>) ?? {}),
      ),
      privacyLevel: headmate.privacyLevel as
        | "public"
        | "friends_only"
        | "trusted_friends_only"
        | "private",
    })),
    frontSessions: frontSessions.map((session) => ({
      id: String(session._id),
      headmateIds: (session.headmateIds as Types.ObjectId[]).map((id) => String(id)),
      startedAt: new Date(session.startedAt as Date).toISOString(),
      endedAt: session.endedAt ? new Date(session.endedAt as Date).toISOString() : undefined,
      note: (session.note as string) || undefined,
    })),
    activeSession: activeSession
      ? {
          id: String(activeSession._id),
          headmateIds: (activeSession.headmateIds as Types.ObjectId[]).map((id) => String(id)),
          startedAt: new Date(activeSession.startedAt as Date).toISOString(),
        }
      : null,
  };
}

export async function applyFrontActionForCurrentSystem(
  action: FrontAction,
  headmateId: string,
) {
  await connectToDatabase();
  const system = await getCurrentSystem();
  if (!system) return null;

  const systemId = String(system._id);
  await ensureHeadmates(systemId);

  const headmate = await HeadmateModel.findOne({ _id: headmateId, systemId }).lean();
  if (!headmate) {
    throw new Error("Headmate not found for this system.");
  }

  const activeSession = await FrontSessionModel.findOne({
    systemId,
    endedAt: null,
  }).sort({ startedAt: -1 });

  const now = new Date();
  const currentIds = activeSession
    ? activeSession.headmateIds.map((id: Types.ObjectId) => String(id))
    : [];
  const alreadyFronting = currentIds.includes(headmateId);

  if (action === "add") {
    if (!alreadyFronting) {
      if (activeSession) {
        activeSession.headmateIds = [...activeSession.headmateIds, new Types.ObjectId(headmateId)];
        await activeSession.save();
      } else {
        await FrontSessionModel.create({
          systemId,
          headmateIds: [headmateId],
          startedAt: now,
          endedAt: null,
        });
      }
    }
  }

  if (action === "set") {
    if (!activeSession) {
      await FrontSessionModel.create({
        systemId,
        headmateIds: [headmateId],
        startedAt: now,
        endedAt: null,
      });
    } else if (!(currentIds.length === 1 && currentIds[0] === headmateId)) {
      activeSession.endedAt = now;
      await activeSession.save();
      await FrontSessionModel.create({
        systemId,
        headmateIds: [headmateId],
        startedAt: now,
        endedAt: null,
      });
    }
  }

  if (action === "remove" && activeSession && alreadyFronting) {
    const remaining = currentIds.filter((id: string) => id !== headmateId);
    if (remaining.length === 0) {
      activeSession.endedAt = now;
    } else {
      activeSession.headmateIds = remaining.map((id: string) => new Types.ObjectId(id));
    }
    await activeSession.save();
  }

  return getFrontStateForCurrentSystem();
}
