import { journalEntries, headmates } from "@/lib/mock-data";
import { formatDateTime } from "@/lib/time";

export default function JournalPage() {
  return (
    <section className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Journal</h1>
        <p className="text-sm text-muted-foreground">
          MVP journal feed with timestamps, linked headmates, and privacy level.
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
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  {formatDateTime(entry.createdAt)}
                </p>
                <p className="rounded-full bg-muted px-2 py-1 text-xs text-muted-foreground">
                  {entry.privacyLevel.replaceAll("_", " ")}
                </p>
              </div>
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
