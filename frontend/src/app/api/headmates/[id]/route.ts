import { NextResponse } from "next/server";
import mongoose from "mongoose";
import {
  normalizeCustomFieldsForStorage,
  parseStoredCustomFields,
} from "@/lib/custom-fields";
import { DESCRIPTION_MAX_CHARS } from "@/lib/display-limits";
import { deleteHeadmate } from "@/lib/headmate-actions";
import { connectToDatabase } from "@/lib/mongodb";
import { getSystemForSession } from "@/lib/system-for-user";
import { HeadmateModel } from "@/models/headmate";

type RouteContext = { params: Promise<{ id: string }> };

function serializeHeadmate(h: {
  _id: unknown;
  systemId: unknown;
  name: string;
  pronouns?: string;
  description?: string;
  customFields?: unknown;
}) {
  return {
    id: String(h._id),
    systemId: String(h.systemId),
    name: h.name,
    pronouns: h.pronouns ?? "",
    description: h.description ?? "",
    customFields: parseStoredCustomFields(h.customFields),
  };
}

type PatchBody = {
  name?: string;
  pronouns?: string;
  description?: string;
  customFields?: unknown;
};

export async function PATCH(request: Request, context: RouteContext) {
  const ctx = await getSystemForSession();
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  let hid: mongoose.Types.ObjectId;
  try {
    hid = new mongoose.Types.ObjectId(id);
  } catch {
    return NextResponse.json({ error: "Invalid id." }, { status: 400 });
  }

  let body: PatchBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  await connectToDatabase();

  const existing = await HeadmateModel.findOne({
    _id: hid,
    systemId: ctx.systemId,
  });
  if (!existing) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  if (body.name !== undefined) {
    const name = typeof body.name === "string" ? body.name.trim() : "";
    if (!name || name.length > 200) {
      return NextResponse.json(
        { error: "Name must be 1–200 characters." },
        { status: 400 },
      );
    }
    existing.name = name;
  }
  if (body.pronouns !== undefined) {
    existing.pronouns =
      typeof body.pronouns === "string" ? body.pronouns.trim().slice(0, 200) : "";
  }
  if (body.description !== undefined) {
    existing.description =
      typeof body.description === "string"
        ? body.description.trim().slice(0, DESCRIPTION_MAX_CHARS)
        : "";
  }
  if (body.customFields !== undefined) {
    existing.customFields = normalizeCustomFieldsForStorage(body.customFields);
  }

  await existing.save();

  const headmate = serializeHeadmate(existing.toObject());
  return NextResponse.json({ headmate });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const ctx = await getSystemForSession();
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  let hid: mongoose.Types.ObjectId;
  try {
    hid = new mongoose.Types.ObjectId(id);
  } catch {
    return NextResponse.json({ error: "Invalid id." }, { status: 400 });
  }

  await connectToDatabase();

  try {
    await deleteHeadmate(ctx.systemId, hid);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to delete";
    if (message.includes("not found")) {
      return NextResponse.json({ error: message }, { status: 404 });
    }
    return NextResponse.json({ error: message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
