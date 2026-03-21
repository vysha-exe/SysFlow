import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { ensureDefaultHeadmates } from "@/lib/seed-headmates";
import { getSystemForSession } from "@/lib/system-for-user";
import { HeadmateModel } from "@/models/headmate";

export async function GET() {
  const ctx = await getSystemForSession();
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectToDatabase();
  await ensureDefaultHeadmates(ctx.systemId);

  const list = await HeadmateModel.find({ systemId: ctx.systemId })
    .sort({ createdAt: 1 })
    .lean();

  const headmates = list.map((h) => ({
    id: String(h._id),
    systemId: String(h.systemId),
    name: h.name,
    pronouns: h.pronouns,
    description: h.description,
    customFields: (h.customFields as Record<string, string>) ?? {},
    privacyLevel: h.privacyLevel,
  }));

  return NextResponse.json({ headmates });
}
