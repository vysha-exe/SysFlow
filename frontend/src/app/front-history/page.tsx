import { DbConnectionError } from "@/components/db-connection-error";
import { FrontHistoryClient } from "@/components/front-history-client";
import { isAuthBypassEnabled } from "@/lib/auth-bypass";
import { getSystemForSession } from "@/lib/system-for-user";

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
            <code className="rounded bg-muted px-1 text-foreground">MONGODB_URI</code> and restart
            the dev server.
          </p>
        </section>
      );
    }
    return (
      <section className="space-y-4">
        <h1 className="text-2xl font-semibold text-foreground">Front History</h1>
        <p className="text-sm text-muted-foreground">Sign in to see your front history.</p>
      </section>
    );
  }

  return <FrontHistoryClient />;
}
