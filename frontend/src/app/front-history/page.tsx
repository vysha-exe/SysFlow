import { frontSessions, headmates } from "@/lib/mock-data";
import { formatDateTime, formatDuration } from "@/lib/time";

export default function FrontHistoryPage() {
  return (
    <section className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Front History</h1>
        <p className="text-sm text-zinc-600">
          Session timeline with start/end and participant list.
        </p>
      </div>

      <div className="space-y-3">
        {frontSessions.map((session) => {
          const names = session.headmateIds
            .map((id) => headmates.find((headmate) => headmate.id === id)?.name)
            .filter(Boolean)
            .join(", ");
          const ended = Boolean(session.endedAt);

          return (
            <article
              key={session.id}
              className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h2 className="text-base font-semibold">{names}</h2>
                  <p className="text-xs text-zinc-500">
                    Start: {formatDateTime(session.startedAt)}
                  </p>
                  <p className="text-xs text-zinc-500">
                    {ended
                      ? `End: ${formatDateTime(session.endedAt as string)}`
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
                Duration: {formatDuration(session.startedAt, session.endedAt)}
              </p>
              {session.note && (
                <p className="mt-2 text-sm text-zinc-600">{session.note}</p>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}
