import { DbConnectionError } from "@/components/db-connection-error";
import { DashboardCurrentFront } from "@/components/dashboard-current-front";
import { SystemProfileEditor } from "@/components/system-profile-editor";
import { isAuthBypassEnabled } from "@/lib/auth-bypass";
import {
  getActiveFrontSession,
  getActiveOpenIntervals,
} from "@/lib/front-actions";
import { connectToDatabase } from "@/lib/mongodb";
import { ensureDefaultHeadmates } from "@/lib/seed-headmates";
import { getSystemNameBase } from "@/lib/system-display-name";
import { getSystemForSession } from "@/lib/system-for-user";
import { HeadmateModel } from "@/models/headmate";
import { SystemModel } from "@/models/system";

export const dynamic = "force-dynamic";

export default async function Home() {
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
        <section className="space-y-6">
          <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-6 shadow-sm">
            <h1 className="text-xl font-semibold text-destructive">Dev bypass on, but no system context</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Auth is disabled, but the app could not load or create the dev user in MongoDB. Check{" "}
              <code className="rounded bg-muted px-1">MONGODB_URI</code> in{" "}
              <code className="rounded bg-muted px-1">.env.local</code>, Atlas IP access list, and restart{" "}
              <code className="rounded bg-muted px-1">npm run dev</code>.
            </p>
          </div>
        </section>
      );
    }
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

  let system;
  let activeSession;
  let headmateDocs;
  try {
    await connectToDatabase();
    await ensureDefaultHeadmates(ctx.systemId);

    [system, activeSession, headmateDocs] = await Promise.all([
      SystemModel.findById(ctx.systemId).lean(),
      getActiveFrontSession(ctx.systemId),
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
    headmateDocs.find((h) => String(h._id) === id)?.name ?? "?";

  const hmIds = activeSession?.headmateIds ?? [];
  const openIntervals = activeSession
    ? await getActiveOpenIntervals(ctx.systemId)
    : [];
  const fronters = hmIds.map((id: unknown) => ({
    id: String(id),
    name: nameFor(String(id)),
  }));
  const initialActive = activeSession
    ? {
        fronters,
        intervals: openIntervals,
      }
    : null;

  const systemInitial =
    system && system._id
      ? {
          id: String(system._id),
          name: getSystemNameBase(system.name ?? ""),
          username: system.username ?? "",
          description: system.description ?? "",
        }
      : null;

  return (
    <section className="space-y-6">
      {systemInitial ? (
        <SystemProfileEditor initial={systemInitial} />
      ) : (
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <p className="text-sm text-muted-foreground">System</p>
          <h1 className="text-2xl font-semibold text-foreground">Your system</h1>
          <p className="mt-2 text-sm text-muted-foreground">Could not load system profile.</p>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <article className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <h2 className="text-lg font-semibold text-foreground">Current Front</h2>
          <DashboardCurrentFront initialActive={initialActive} />
        </article>

        <article className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <h2 className="text-lg font-semibold text-foreground">Quick actions</h2>
          <ul className="mt-3 space-y-2 text-sm text-card-foreground">
            <li>
              Go to <strong>Headmates</strong> to add to front, set as front, or remove
              from front.
            </li>
            <li>
              <strong>Add / remove from front</strong> only starts or ends that
              headmate&apos;s segment — other co-fronters keep their own timers.
            </li>
            <li>
              <strong>Set as front</strong> ends everyone else&apos;s segment. Empty front
              and full history are in <strong>Front history</strong>.
            </li>
          </ul>
        </article>
      </div>
    </section>
  );
}
