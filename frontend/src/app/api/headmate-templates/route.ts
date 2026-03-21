import { NextResponse } from "next/server";
import mongoose from "mongoose";
import {
  HEADMATE_TEMPLATE_NAME_MAX,
  HEADMATE_TEMPLATES_MAX,
  normalizeFieldLabels,
  type HeadmateTemplateDto,
} from "@/lib/headmate-templates";
import { connectToDatabase } from "@/lib/mongodb";
import { getSystemForSession } from "@/lib/system-for-user";
import { SystemModel } from "@/models/system";

function serialize(
  system: {
    headmateTemplates?: Array<{ _id: unknown; name: string; fieldLabels?: unknown }>;
    defaultHeadmateTemplateId?: unknown;
  },
): { templates: HeadmateTemplateDto[]; defaultTemplateId: string | null } {
  const templates = (system.headmateTemplates ?? []).map((t) => ({
    id: String(t._id),
    name: t.name,
    fieldLabels: Array.isArray(t.fieldLabels)
      ? t.fieldLabels.map((x) => String(x))
      : [],
  }));
  const defaultTemplateId = system.defaultHeadmateTemplateId
    ? String(system.defaultHeadmateTemplateId)
    : null;
  return { templates, defaultTemplateId };
}

function mongoIdForTemplate(clientId: string | undefined): mongoose.Types.ObjectId {
  if (clientId && /^[a-fA-F0-9]{24}$/.test(clientId)) {
    return new mongoose.Types.ObjectId(clientId);
  }
  return new mongoose.Types.ObjectId();
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

  return NextResponse.json(serialize(system));
}

type PutBody = {
  templates?: unknown;
  defaultTemplateId?: string | null;
};

export async function PUT(request: Request) {
  const ctx = await getSystemForSession();
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: PutBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!Array.isArray(body.templates)) {
    return NextResponse.json(
      { error: "templates must be an array." },
      { status: 400 },
    );
  }

  if (body.templates.length > HEADMATE_TEMPLATES_MAX) {
    return NextResponse.json(
      { error: `At most ${HEADMATE_TEMPLATES_MAX} templates allowed.` },
      { status: 400 },
    );
  }

  const mapped: Array<{
    _id: mongoose.Types.ObjectId;
    name: string;
    fieldLabels: string[];
  }> = [];

  /** Maps client `id` (including temp-* ids) to the Mongo _id for this save. */
  const clientIdToMongoId = new Map<string, mongoose.Types.ObjectId>();

  for (let i = 0; i < body.templates.length; i++) {
    const raw = body.templates[i];
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
      return NextResponse.json(
        { error: "Invalid template entry." },
        { status: 400 },
      );
    }
    const item = raw as Record<string, unknown>;
    const clientId =
      typeof item.id === "string" && item.id.length > 0
        ? item.id
        : `__idx_${i}`;
    const name =
      typeof item.name === "string"
        ? item.name.trim().slice(0, HEADMATE_TEMPLATE_NAME_MAX)
        : "";
    if (!name) {
      return NextResponse.json(
        { error: "Each template needs a non-empty name." },
        { status: 400 },
      );
    }
    const fieldLabels = normalizeFieldLabels(item.fieldLabels);
    const mongoId = mongoIdForTemplate(
      /^[a-fA-F0-9]{24}$/.test(clientId) ? clientId : undefined,
    );
    mapped.push({
      _id: mongoId,
      name,
      fieldLabels,
    });
    clientIdToMongoId.set(clientId, mongoId);
  }

  let defaultHeadmateTemplateId: mongoose.Types.ObjectId | null = null;
  if (
    body.defaultTemplateId &&
    typeof body.defaultTemplateId === "string" &&
    clientIdToMongoId.has(body.defaultTemplateId)
  ) {
    defaultHeadmateTemplateId = clientIdToMongoId.get(body.defaultTemplateId)!;
  }

  await connectToDatabase();

  const systemDoc = await SystemModel.findById(ctx.systemId);
  if (!systemDoc) {
    return NextResponse.json({ error: "System not found." }, { status: 404 });
  }

  systemDoc.set("headmateTemplates", mapped);
  systemDoc.set("defaultHeadmateTemplateId", defaultHeadmateTemplateId);
  systemDoc.markModified("headmateTemplates");
  await systemDoc.save();

  const system = await SystemModel.findById(ctx.systemId).lean();
  if (!system) {
    return NextResponse.json({ error: "System not found." }, { status: 404 });
  }

  return NextResponse.json(serialize(system));
}
