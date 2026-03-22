import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { DESCRIPTION_MAX_CHARS } from "@/lib/display-limits";
import { connectToDatabase } from "@/lib/mongodb";
import { getSystemNameBase } from "@/lib/system-display-name";
import { getSystemForSession } from "@/lib/system-for-user";
import {
  SYSTEM_DISPLAY_NAME_MAX_LEN,
  SYSTEM_DISPLAY_NAME_MIN_LEN,
  normalizeSystemUsername,
  validateSystemUsername,
} from "@/lib/system-profile";
import { SystemModel } from "@/models/system";
import { UserModel } from "@/models/user";

function serializeSystem(s: {
  _id: unknown;
  name: string;
  username: string;
  description?: string;
}) {
  return {
    id: String(s._id),
    /** Base display name (not including `'s System`). */
    name: getSystemNameBase(s.name),
    username: s.username,
    description: s.description ?? "",
  };
}

export async function GET() {
  const ctx = await getSystemForSession();
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectToDatabase();
  const system = await SystemModel.findById(ctx.systemId).lean();
  if (!system) {
    return NextResponse.json({ error: "System not found." }, { status: 404 });
  }

  return NextResponse.json({ system: serializeSystem(system) });
}

type PatchBody = {
  name?: string;
  username?: string;
  description?: string;
};

export async function PATCH(request: Request) {
  const ctx = await getSystemForSession();
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: PatchBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (
    body.name === undefined &&
    body.username === undefined &&
    body.description === undefined
  ) {
    return NextResponse.json(
      { error: "Provide at least one of: name, username, description." },
      { status: 400 },
    );
  }

  await connectToDatabase();

  const existing = await SystemModel.findById(ctx.systemId);
  if (!existing) {
    return NextResponse.json({ error: "System not found." }, { status: 404 });
  }

  if (body.name !== undefined) {
    const name = typeof body.name === "string" ? body.name.trim() : "";
    if (
      name.length < SYSTEM_DISPLAY_NAME_MIN_LEN ||
      name.length > SYSTEM_DISPLAY_NAME_MAX_LEN
    ) {
      return NextResponse.json(
        {
          error: `Display name must be ${SYSTEM_DISPLAY_NAME_MIN_LEN}–${SYSTEM_DISPLAY_NAME_MAX_LEN} characters.`,
        },
        { status: 400 },
      );
    }
    existing.name = name;
  }

  if (body.username !== undefined) {
    const raw = typeof body.username === "string" ? body.username : "";
    const username = normalizeSystemUsername(raw);
    const usernameError = validateSystemUsername(username);
    if (usernameError) {
      return NextResponse.json({ error: usernameError }, { status: 400 });
    }

    if (username !== existing.username) {
      const taken = await SystemModel.findOne({
        username,
        _id: { $ne: existing._id },
      })
        .select("_id")
        .lean();
      if (taken) {
        return NextResponse.json(
          {
            error:
              "That username is already taken by another system. Each account needs a unique handle (lowercase letters, numbers, and underscores), just like when your system was first created. Try a small change or add a word.",
          },
          { status: 409 },
        );
      }
    }
    existing.username = username;
  }

  if (body.description !== undefined) {
    existing.description =
      typeof body.description === "string"
        ? body.description.trim().slice(0, DESCRIPTION_MAX_CHARS)
        : "";
  }

  try {
    await existing.save();
  } catch (e) {
    const code = typeof e === "object" && e !== null && "code" in e ? (e as { code?: number }).code : undefined;
    if (code === 11000) {
      return NextResponse.json(
        {
          error:
            "That username is already taken by another system. Each account needs a unique handle (lowercase letters, numbers, and underscores), just like when your system was first created. Try a small change or add a word.",
        },
        { status: 409 },
      );
    }
    throw e;
  }

  if (body.name !== undefined) {
    let ownerId: mongoose.Types.ObjectId;
    try {
      ownerId = new mongoose.Types.ObjectId(ctx.userId);
    } catch {
      return NextResponse.json(
        { error: "Could not sync display name: invalid account id." },
        { status: 500 },
      );
    }
    const userRes = await UserModel.updateOne(
      { _id: ownerId },
      { $set: { name: existing.name } },
    );
    if (userRes.matchedCount === 0) {
      return NextResponse.json(
        {
          error:
            "System profile was saved, but your account record was not found to update the display name. Try signing out and back in.",
        },
        { status: 500 },
      );
    }
  }

  return NextResponse.json({ system: serializeSystem(existing.toObject()) });
}
