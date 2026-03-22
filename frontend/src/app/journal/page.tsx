import { DbConnectionError } from "@/components/db-connection-error";
import { JournalPageClient } from "@/components/journal-page-client";
import { isAuthBypassEnabled } from "@/lib/auth-bypass";
import { compareHeadmateNameAsc } from "@/lib/headmate-sort";
import { serializeJournalEntry } from "@/lib/journal-serialize";
import { connectToDatabase } from "@/lib/mongodb";
import { ensureDefaultHeadmates } from "@/lib/seed-headmates";
import { getSystemForSession } from "@/lib/system-for-user";
import { HeadmateModel } from "@/models/headmate";
import { JournalEntryModel } from "@/models/journal-entry";

export const dynamic = "force-dynamic";

export default async function JournalPage() {
  let ctx;
  try {
    ctx = await getSystemForSession();
  } catch (e) {
    return (
      <DbConnectionError
        message={e instanceof Error ? e.message : "Database connection failed."}
      />
    );
  }

  if (!ctx) {
    if (isAuthBypassEnabled()) {
      return (
        <section className="space-y-4">
          <h1 className="text-2xl font-semibold text-foreground">Journal</h1>
          <p className="text-sm text-destructive">
            Dev bypass is on but the database did not return a system. Fix{" "}
            <code className="rounded bg-muted px-1 text-foreground">MONGODB_URI</code> and restart the dev server.
          </p>
        </section>
      );
    }
    return (
      <section className="space-y-4">
        <h1 className="text-2xl font-semibold text-foreground">Journal</h1>
        <p className="text-sm text-muted-foreground">Sign in to keep a journal for your system.</p>
      </section>
    );
  }

  let entries;
  let headmates;
  try {
    await connectToDatabase();
    await ensureDefaultHeadmates(ctx.systemId);

    [entries, headmates] = await Promise.all([
      JournalEntryModel.find({ systemId: ctx.systemId })
        .sort({ createdAt: -1 })
        .limit(200)
        .lean(),
      HeadmateModel.find({ systemId: ctx.systemId }).lean(),
    ]);
  } catch (e) {
    return (
      <DbConnectionError
        message={e instanceof Error ? e.message : "Database connection failed."}
      />
    );
  }

  headmates.sort(compareHeadmateNameAsc);

  const headmateOptions = headmates.map((h) => ({
    id: String(h._id),
    name: h.name,
  }));

  const serializedEntries = entries.map((doc) =>
    serializeJournalEntry({
      _id: doc._id,
      systemId: doc.systemId,
      title: (doc as { title?: string }).title,
      content: doc.content as string,
      headmateIds: doc.headmateIds,
      createdAt: doc.createdAt as Date,
      updatedAt: doc.updatedAt as Date,
    }),
  );

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Journal</h1>
        <p className="text-sm text-muted-foreground">
          Private entries for your system. Tag who wrote each note when you want to.
        </p>
      </div>

      <div className="space-y-3">
        <JournalPageClient entries={serializedEntries} headmates={headmateOptions} />
      </div>
    </section>
  );
}
