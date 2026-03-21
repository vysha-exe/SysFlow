type DbConnectionErrorProps = {
  message?: string;
};

export function DbConnectionError({ message }: DbConnectionErrorProps) {
  return (
    <section className="space-y-4">
      <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-5 text-card-foreground shadow-sm">
        <h1 className="text-lg font-semibold text-destructive">Can’t reach the database</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          The app stops here so the page doesn’t load forever. Usually this means MongoDB isn’t
          running or <code className="rounded bg-muted px-1 py-0.5 text-xs">MONGODB_URI</code> in{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">frontend/.env.local</code> is wrong.
        </p>
        {message ? (
          <p className="mt-3 rounded-md bg-muted/80 p-2 font-mono text-xs text-muted-foreground">
            {message}
          </p>
        ) : null}
        <ul className="mt-4 list-inside list-disc text-sm text-muted-foreground">
          <li>Local: install/start MongoDB, then use something like</li>
          <li className="mt-1 font-mono text-xs">
            MONGODB_URI=mongodb://127.0.0.1:27017/sysflow
          </li>
          <li className="mt-2">Atlas: paste your SRV URI from the cluster connect dialog.</li>
          <li className="mt-2">Restart <code className="rounded bg-muted px-1">npm run dev</code> after changing env.</li>
        </ul>
      </div>
    </section>
  );
}
