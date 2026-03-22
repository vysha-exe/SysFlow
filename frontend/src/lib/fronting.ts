import { Types } from "mongoose";
import {
  addToFront,
  getActiveFrontSession,
  removeFromFront,
  setAsFront,
} from "@/lib/front-actions";
import { ensureFrontIntervalsMigrated } from "@/lib/front-interval-migrate";
import { groupIntervalsToSessions } from "@/lib/group-front-intervals";
import { parseStoredCustomFields } from "@/lib/custom-fields";
import { getSystemNameBase } from "@/lib/system-display-name";
import { getCurrentSystem } from "@/lib/current-system";
import { compareHeadmateNameAsc } from "@/lib/headmate-sort";
import { connectToDatabase } from "@/lib/mongodb";
import { headmates as mockHeadmates } from "@/lib/mock-data";
import { HeadmateFrontIntervalModel } from "@/models/headmate-front-interval";
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
    })),
  );
}

export async function getFrontStateForCurrentSystem() {
  await connectToDatabase();
  const system = await getCurrentSystem();
  if (!system) return null;

  const systemId = String(system._id);
  const systemOid = new Types.ObjectId(systemId);
  await ensureHeadmates(systemId);
  await ensureFrontIntervalsMigrated(systemOid);

  const [headmatesRaw, intervalsRaw] = await Promise.all([
    HeadmateModel.find({ systemId }).lean(),
    HeadmateFrontIntervalModel.find({ systemId }).sort({ startedAt: -1 }).lean(),
  ]);

  const headmatesSorted = [...headmatesRaw].sort(compareHeadmateNameAsc);
  const sessions = groupIntervalsToSessions(intervalsRaw);
  const activeLean = await getActiveFrontSession(systemOid);

  return {
    system: {
      id: String(system._id),
      name: getSystemNameBase(String(system.name ?? "")),
      username: system.username as string,
      description: (system.description as string) ?? "",
    },
    headmates: headmatesSorted.map((headmate) => ({
      id: String(headmate._id),
      name: headmate.name as string,
      pronouns: headmate.pronouns as string,
      description: headmate.description as string,
      customFields: parseStoredCustomFields(headmate.customFields),
    })),
    frontSessions: sessions.map((session) => ({
      id: String(session._id),
      headmateIds: session.headmateIds.map((id) => String(id)),
      startedAt: session.startedAt.toISOString(),
      endedAt: session.endedAt ? session.endedAt.toISOString() : undefined,
      note: session.note || undefined,
    })),
    activeSession: activeLean
      ? {
          id: String(activeLean._id),
          headmateIds: activeLean.headmateIds.map((id) => String(id)),
          startedAt: activeLean.startedAt.toISOString(),
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
  const systemOid = new Types.ObjectId(systemId);
  await ensureHeadmates(systemId);

  const headmate = await HeadmateModel.findOne({ _id: headmateId, systemId }).lean();
  if (!headmate) {
    throw new Error("Headmate not found for this system.");
  }

  const hid = new Types.ObjectId(headmateId);

  if (action === "add") {
    await addToFront(systemOid, hid);
  } else if (action === "set") {
    await setAsFront(systemOid, hid);
  } else if (action === "remove") {
    await removeFromFront(systemOid, hid);
  }

  return getFrontStateForCurrentSystem();
}
