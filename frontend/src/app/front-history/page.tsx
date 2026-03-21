import { DbConnectionError } from "@/components/db-connection-error";
import { isAuthBypassEnabled } from "@/lib/auth-bypass";
import { connectToDatabase } from "@/lib/mongodb";
import { ensureDefaultHeadmates } from "@/lib/seed-headmates";
import { getSystemForSession } from "@/lib/system-for-user";
import { formatDateTime, formatDuration } from "@/lib/time";
import { FrontSessionModel } from "@/models/frontSession";
import { HeadmateModel } from "@/models/headmate";

export const dynamic = "force-dynamic";

export default async function FrontHistoryPage() {
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
          <h1 className="text-2xl font-semibold text-foreground">Front History</h1>
          <p className="text-sm text-destructive">
            Dev bypass is on but the database did not return a system. Fix{" "}
            <code className="rounded bg-muted px-1 text-foreground">MONGODB_URI</code> and restart the dev server.
          </p>
        </section>
      );
    }
    return (
      <section className="space-y-4">
        <h1 className="text-2xl font-semibold text-foreground">Front History</h1>
        <p className="text-sm text-muted-foreground">Sign in to see your front sessions.</p>
      </section>
    );
  }

  let sessions;
  let headmates;
  try {
    await connectToDatabase();
    await ensureDefaultHeadmates(ctx.systemId);

    [sessions, headmates] = await Promise.all([
      FrontSessionModel.find({ systemId: ctx.systemId })
        .sort({ startedAt: -1 })
        .limit(50)
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
  const nameFor = (id: string) =>
    headmates.find((h) => String(h._id) === id)?.name ?? "?";

  return (
    <section className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Front History</h1>
        <p className="text-sm text-muted-foreground">
          Session timeline with start/end and participant list.
        </p>
      </div>

      <div className="space-y-3">
        {sessions.length === 0 ? (
          <p className="text-sm text-muted-foreground">No front sessions yet.</p>
        ) : (
          sessions.map((session) => {
            const names =
              session.headmateIds.length === 0
                ? "No one fronting"
                : session.headmateIds
                    .map((id: unknown) => nameFor(String(id)))
                    .join(", ");
            const ended = Boolean(session.endedAt);
            const startIso = session.startedAt.toISOString();
            const endIso = session.endedAt?.toISOString();

            return (
              <article
                key={String(session._id)}
                className="rounded-xl border border-border bg-card p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h2 className="text-base font-semibold text-foreground">{names}</h2>
                    <p className="text-xs text-muted-foreground">
                      Start: {formatDateTime(startIso)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {ended && endIso
                        ? `End: ${formatDateTime(endIso)}`
                        : "Active session"}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-2 py-1 text-xs font-medium ${
                      ended
                        ? "bg-muted text-muted-foreground"
                        : "bg-primary/15 text-primary"
                    }`}
                  >
                    {ended ? "Completed" : "Active"}
                  </span>
                </div>
                <p className="mt-2 text-sm text-card-foreground">
                  Duration: {formatDuration(startIso, endIso)}
                </p>
                {session.note && (
                  <p className="mt-2 text-sm text-muted-foreground">{session.note}</p>
                )}
              </article>
            );
          })
        )}
      </div>
    </section>
  );
}
