import { journalEntries, headmates } from "@/lib/mock-data";
import { formatDateTime } from "@/lib/time";

export default function JournalPage() {
  return (
    <section className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Journal</h1>
        <p className="text-sm text-muted-foreground">
          MVP journal feed with timestamps and linked headmates.
        </p>
      </div>

      <div className="space-y-3">
        {journalEntries.map((entry) => {
          const names = entry.headmateIds
            .map((id) => headmates.find((headmate) => headmate.id === id)?.name)
            .filter(Boolean)
            .join(", ");

          return (
            <article
              key={entry.id}
              className="rounded-xl border border-border bg-card p-4 shadow-sm"
            >
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                {formatDateTime(entry.createdAt)}
              </p>
              <p className="mt-2 text-sm text-card-foreground">{entry.content}</p>
              {names && (
                <p className="mt-2 text-xs text-muted-foreground">By: {names}</p>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}
