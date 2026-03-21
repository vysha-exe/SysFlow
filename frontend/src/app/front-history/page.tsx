import { connectToDatabase } from "@/lib/mongodb";
import { ensureDefaultHeadmates } from "@/lib/seed-headmates";
import { getSystemForSession } from "@/lib/system-for-user";
import { formatDateTime, formatDuration } from "@/lib/time";
import { FrontSessionModel } from "@/models/frontSession";
import { HeadmateModel } from "@/models/headmate";

export const dynamic = "force-dynamic";

export default async function FrontHistoryPage() {
  const ctx = await getSystemForSession();

  if (!ctx) {
    return (
      <section className="space-y-4">
        <h1 className="text-2xl font-semibold">Front History</h1>
        <p className="text-sm text-zinc-600">Sign in to see your front sessions.</p>
      </section>
    );
  }

  await connectToDatabase();
  await ensureDefaultHeadmates(ctx.systemId);

  const sessions = await FrontSessionModel.find({ systemId: ctx.systemId })
    .sort({ startedAt: -1 })
    .limit(50)
    .lean();

  const headmates = await HeadmateModel.find({ systemId: ctx.systemId }).lean();
  const nameFor = (id: string) =>
    headmates.find((h) => String(h._id) === id)?.name ?? "?";

  return (
    <section className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Front History</h1>
        <p className="text-sm text-zinc-600">
          Session timeline with start/end and participant list.
        </p>
      </div>

      <div className="space-y-3">
        {sessions.length === 0 ? (
          <p className="text-sm text-zinc-600">No front sessions yet.</p>
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
                className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h2 className="text-base font-semibold">{names}</h2>
                    <p className="text-xs text-zinc-500">
                      Start: {formatDateTime(startIso)}
                    </p>
                    <p className="text-xs text-zinc-500">
                      {ended && endIso
                        ? `End: ${formatDateTime(endIso)}`
                        : "Active session"}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-2 py-1 text-xs font-medium ${
                      ended
                        ? "bg-zinc-100 text-zinc-700"
                        : "bg-green-100 text-green-700"
                    }`}
                  >
                    {ended ? "Completed" : "Active"}
                  </span>
                </div>
                <p className="mt-2 text-sm text-zinc-700">
                  Duration: {formatDuration(startIso, endIso)}
                </p>
                {session.note && (
                  <p className="mt-2 text-sm text-zinc-600">{session.note}</p>
                )}
              </article>
            );
          })
        )}
      </div>
    </section>
  );
}
