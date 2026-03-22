"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { FrontIntervalNoteModal } from "@/components/front-interval-note-modal";
import { FrontTimer } from "@/components/front-timer";
import { formatDateTime } from "@/lib/time";

export type OpenIntervalDto = {
  id: string;
  headmateId: string | null;
  note: string;
  startedAt: string;
};

export type DashboardActivePayload = {
  fronters: { id: string; name: string }[];
  intervals: OpenIntervalDto[];
};

export function DashboardCurrentFront({
  initialActive,
}: {
  initialActive: DashboardActivePayload | null;
}) {
  const router = useRouter();
  const [active, setActive] = useState<DashboardActivePayload | null>(
    initialActive,
  );
  const [noteFor, setNoteFor] = useState<{
    intervalId: string;
    label: string;
    note: string;
  } | null>(null);
  const [busyRemoveId, setBusyRemoveId] = useState<string | null>(null);
  const [removeError, setRemoveError] = useState("");

  useEffect(() => {
    setActive(initialActive);
  }, [initialActive]);

  const refresh = useCallback(async () => {
    const res = await fetch("/api/front/active", { credentials: "include" });
    if (!res.ok) return;
    const data = (await res.json()) as {
      active: {
        fronters: { id: string; name: string }[];
        intervals: OpenIntervalDto[];
      } | null;
    };
    if (!data.active) {
      setActive(null);
      return;
    }
    setActive({
      fronters: data.active.fronters,
      intervals: data.active.intervals,
    });
  }, []);

  async function handleRemoveFromFront(headmateId: string) {
    setRemoveError("");
    setBusyRemoveId(headmateId);
    try {
      const res = await fetch("/api/front", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "remove", headmateId }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setRemoveError(data.error ?? "Could not remove from front.");
        return;
      }
      await refresh();
      router.refresh();
    } finally {
      setBusyRemoveId(null);
    }
  }

  if (!active) {
    return (
      <p className="mt-3 text-sm text-muted-foreground">No active front session.</p>
    );
  }

  const emptyInterval = active.intervals.find((i) => i.headmateId == null);

  return (
    <>
      <div className="mt-3 space-y-3">
        {removeError ? (
          <p className="text-sm text-destructive" role="alert">
            {removeError}
          </p>
        ) : null}
        {active.fronters.length > 0 ? (
          <ul className="space-y-3">
            {active.fronters.map((f) => {
              const intv = active.intervals.find((i) => i.headmateId === f.id);
              if (!intv) return null;
              const hasNote = intv.note.trim().length > 0;
              const removing = busyRemoveId === f.id;
              const removeDisabled = Boolean(busyRemoveId);
              return (
                <li
                  key={f.id}
                  className="rounded-lg border border-border/80 bg-muted/15 px-3 py-2.5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <p className="text-sm font-semibold text-foreground">{f.name}</p>
                    <div className="flex shrink-0 flex-wrap justify-end gap-1">
                      <button
                        type="button"
                        disabled={removeDisabled}
                        className="rounded-md border border-border bg-muted px-2 py-1 text-[11px] font-medium text-foreground hover:bg-muted/80 disabled:opacity-50"
                        onClick={() =>
                          setNoteFor({
                            intervalId: intv.id,
                            label: f.name,
                            note: intv.note,
                          })
                        }
                      >
                        {hasNote ? "Edit note" : "Add note"}
                      </button>
                      <button
                        type="button"
                        disabled={removeDisabled}
                        className="rounded-md border border-destructive/40 bg-destructive/10 px-2 py-1 text-[11px] font-medium text-destructive hover:bg-destructive/20 disabled:opacity-50"
                        onClick={() => void handleRemoveFromFront(f.id)}
                      >
                        {removing ? "…" : "Remove from front"}
                      </button>
                    </div>
                  </div>
                  <div className="mt-1.5">
                    <FrontTimer startIso={intv.startedAt} />
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Since {formatDateTime(intv.startedAt)}
                  </p>
                </li>
              );
            })}
          </ul>
        ) : null}

        {emptyInterval ? (
          <div className="rounded-lg border border-dashed border-border bg-muted/10 px-3 py-2.5">
            <p className="text-sm font-medium text-muted-foreground">No one fronting</p>
            <div className="mt-1.5">
              <FrontTimer startIso={emptyInterval.startedAt} />
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Since {formatDateTime(emptyInterval.startedAt)}
            </p>
            <button
              type="button"
              className="mt-2 rounded-md border border-border bg-muted px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-muted/80"
              onClick={() =>
                setNoteFor({
                  intervalId: emptyInterval.id,
                  label: "Empty front",
                  note: emptyInterval.note,
                })
              }
            >
              {emptyInterval.note.trim() ? "Edit note" : "Add note"} (empty front)
            </button>
          </div>
        ) : null}

        {active.fronters.length === 0 && !emptyInterval ? (
          <p className="text-sm text-muted-foreground">No front data to display.</p>
        ) : null}
      </div>

      {noteFor ? (
        <FrontIntervalNoteModal
          intervalId={noteFor.intervalId}
          title={`Note — ${noteFor.label}`}
          initialNote={noteFor.note}
          onClose={() => setNoteFor(null)}
          onSaved={() => {
            void refresh();
            router.refresh();
          }}
        />
      ) : null}
    </>
  );
}
