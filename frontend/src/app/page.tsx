import { FrontTimer } from "@/components/front-timer";
import { getActiveFrontSession } from "@/lib/front-actions";
import { connectToDatabase } from "@/lib/mongodb";
import { ensureDefaultHeadmates } from "@/lib/seed-headmates";
import { getSystemForSession } from "@/lib/system-for-user";
import { formatDateTime } from "@/lib/time";
import { HeadmateModel } from "@/models/headmate";
import { SystemModel } from "@/models/system";

export const dynamic = "force-dynamic";

export default async function Home() {
  const ctx = await getSystemForSession();

  if (!ctx) {
    return (
      <section className="space-y-6">
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <h1 className="text-2xl font-semibold text-foreground">SysFlow</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Sign in to see your system dashboard, headmates, and front tracking.
          </p>
        </div>
      </section>
    );
  }

  await connectToDatabase();
  await ensureDefaultHeadmates(ctx.systemId);

  const system = await SystemModel.findById(ctx.systemId).lean();
  const activeSession = await getActiveFrontSession(ctx.systemId);
  const headmateDocs = await HeadmateModel.find({ systemId: ctx.systemId }).lean();
  const nameFor = (id: string) =>
    headmateDocs.find((h) => String(h._id) === id)?.name ?? "?";

  const hmIds = activeSession?.headmateIds ?? [];
  const hasFronters = hmIds.length > 0;
  const currentFronters = hmIds.map((id: unknown) => nameFor(String(id)));

  return (
    <section className="space-y-6">
      <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
        <p className="text-sm text-muted-foreground">System</p>
        <h1 className="text-2xl font-semibold text-foreground">
          {system?.name ?? "Your system"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">@{system?.username}</p>
        <p className="mt-3 text-sm text-card-foreground">{system?.description}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <article className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <h2 className="text-lg font-semibold text-foreground">Current Front</h2>
          {activeSession ? (
            <div className="mt-3 space-y-2">
              {hasFronters ? (
                <>
                  <p className="text-sm text-muted-foreground">{currentFronters.join(", ")}</p>
                  <FrontTimer startIso={activeSession.startedAt.toISOString()} />
                </>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground">No one fronting</p>
                  <FrontTimer startIso={activeSession.startedAt.toISOString()} />
                </>
              )}
              <p className="text-xs text-muted-foreground">
                Started {formatDateTime(activeSession.startedAt.toISOString())}
              </p>
            </div>
          ) : (
            <p className="mt-3 text-sm text-muted-foreground">No active front session.</p>
          )}
        </article>

        <article className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <h2 className="text-lg font-semibold text-foreground">Quick actions</h2>
          <ul className="mt-3 space-y-2 text-sm text-card-foreground">
            <li>
              Go to <strong>Headmates</strong> to add to front, set as front, or remove
              from front.
            </li>
            <li>
              Each change starts a <strong>new session</strong> and appears in{" "}
              <strong>Front history</strong> (including when no one is fronting).
            </li>
            <li>
              <strong>Add to front</strong> = co-front. <strong>Set as front</strong> =
              solo front.
            </li>
          </ul>
        </article>
      </div>
    </section>
  );
}
