import { NextResponse } from "next/server";
import {
  normalizeCustomFieldsForStorage,
  parseStoredCustomFields,
} from "@/lib/custom-fields";
import { DESCRIPTION_MAX_CHARS } from "@/lib/display-limits";
import { connectToDatabase } from "@/lib/mongodb";
import { compareHeadmateNameAsc } from "@/lib/headmate-sort";
import { ensureDefaultHeadmates } from "@/lib/seed-headmates";
import { getSystemForSession } from "@/lib/system-for-user";
import { HeadmateModel } from "@/models/headmate";

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

export async function GET() {
  const ctx = await getSystemForSession();
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectToDatabase();
  await ensureDefaultHeadmates(ctx.systemId);

  const list = await HeadmateModel.find({ systemId: ctx.systemId }).lean();
  list.sort(compareHeadmateNameAsc);

  const headmates = list.map(serializeHeadmate);

  return NextResponse.json({ headmates });
}

type CreateBody = {
  name?: string;
  pronouns?: string;
  description?: string;
  customFields?: unknown;
};

export async function POST(request: Request) {
  const ctx = await getSystemForSession();
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: CreateBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name || name.length > 200) {
    return NextResponse.json(
      { error: "Name is required (max 200 characters)." },
      { status: 400 },
    );
  }

  const pronouns =
    typeof body.pronouns === "string" ? body.pronouns.trim().slice(0, 200) : "";
  const description =
    typeof body.description === "string"
      ? body.description.trim().slice(0, DESCRIPTION_MAX_CHARS)
      : "";

  await connectToDatabase();

  const doc = await HeadmateModel.create({
    systemId: ctx.systemId,
    name,
    pronouns,
    description,
    customFields: normalizeCustomFieldsForStorage(body.customFields),
  });

  const headmate = serializeHeadmate(doc.toObject());
  return NextResponse.json({ headmate }, { status: 201 });
}
