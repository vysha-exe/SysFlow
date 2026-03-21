import { FrontTimer } from "@/components/front-timer";
import { frontSessions, headmates, systemProfile } from "@/lib/mock-data";
import { formatDateTime } from "@/lib/time";

export default function Home() {
  const activeSession = frontSessions.find((session) => !session.endedAt);
  const currentFronters =
    activeSession?.headmateIds
      .map((id) => headmates.find((headmate) => headmate.id === id))
      .filter(Boolean) ?? [];

  return (
    <section className="space-y-6">
      <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
        <p className="text-sm text-zinc-500">System</p>
        <h1 className="text-2xl font-semibold">{systemProfile.name}</h1>
        <p className="mt-1 text-sm text-zinc-600">@{systemProfile.username}</p>
        <p className="mt-3 text-sm text-zinc-700">{systemProfile.description}</p>
      </div>

      <div className="rounded-xl border border-blue-300 bg-blue-50 p-4 text-sm text-blue-900">
        Backend pivoted to MongoDB. User accounts now support email/password and
        Google sign-in.
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <article className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
          <h2 className="text-lg font-semibold">Current Front</h2>
          {activeSession ? (
            <div className="mt-3 space-y-2">
              <p className="text-sm text-zinc-600">
                {currentFronters.map((headmate) => headmate?.name).join(", ")}
              </p>
              <FrontTimer startIso={activeSession.startedAt} />
              <p className="text-xs text-zinc-500">
                Started {formatDateTime(activeSession.startedAt)}
              </p>
            </div>
          ) : (
            <p className="mt-3 text-sm text-zinc-600">No active front session.</p>
          )}
        </article>

        <article className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
          <h2 className="text-lg font-semibold">MVP Progress</h2>
          <ul className="mt-3 space-y-2 text-sm text-zinc-700">
            <li>System profile scaffolded</li>
            <li>Headmate profile list scaffolded</li>
            <li>Front history timeline scaffolded</li>
            <li>Journal list scaffolded</li>
            <li>Privacy levels modeled in types</li>
          </ul>
        </article>
      </div>
    </section>
  );
}
