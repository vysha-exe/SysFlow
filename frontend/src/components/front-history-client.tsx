"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { FrontAnalyticsPanel } from "@/components/front-analytics-panel";
import { formatDateTime, formatDuration } from "@/lib/time";

type IntervalRow = {
  id: string;
  headmateId: string | null;
  startedAt: string;
  endedAt: string | null;
  note: string;
  isActive: boolean;
};

type HeadmateOpt = { id: string; name: string };

function isoToDatetimeLocal(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function datetimeLocalToIso(value: string) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

type FrontTab = "timeline" | "analytics";

export function FrontHistoryClient() {
  const [tab, setTab] = useState<FrontTab>("timeline");
  const [intervals, setIntervals] = useState<IntervalRow[]>([]);
  const [headmates, setHeadmates] = useState<HeadmateOpt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const [editing, setEditing] = useState<IntervalRow | null>(null);
  const [adding, setAdding] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<IntervalRow | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [iRes, hRes] = await Promise.all([
        fetch("/api/front/intervals", { credentials: "include" }),
        fetch("/api/headmates", { credentials: "include" }),
      ]);
      if (iRes.status === 401 || hRes.status === 401) {
        setError("You need to be signed in.");
        setIntervals([]);
        setHeadmates([]);
        return;
      }
      if (!iRes.ok) {
        const d = await iRes.json().catch(() => ({}));
        throw new Error((d.error as string) || "Could not load front history.");
      }
      if (!hRes.ok) {
        const d = await hRes.json().catch(() => ({}));
        throw new Error((d.error as string) || "Could not load headmates.");
      }
      const iData = (await iRes.json()) as { intervals: IntervalRow[] };
      const hData = (await hRes.json()) as {
        headmates: { id: string; name: string }[];
      };
      setIntervals(iData.intervals);
      setHeadmates(hData.headmates.map((h) => ({ id: h.id, name: h.name })));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const nameFor = useCallback(
    (id: string | null) => {
      if (!id) return "No one fronting";
      return headmates.find((h) => h.id === id)?.name ?? "?";
    },
    [headmates],
  );

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Front History</h1>
          <p className="text-sm text-muted-foreground">
            Timeline, notes, and analytics for front segments. Co-fronting is one row per
            headmate; times can differ when people join or leave separately.
          </p>
        </div>
        {tab === "timeline" ? (
          <button
            type="button"
            className="rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
            disabled={loading || saving}
            onClick={() => setAdding(true)}
          >
            Add entry
          </button>
        ) : null}
      </div>

      <div
        className="inline-flex rounded-lg border border-border bg-muted/40 p-0.5"
        role="tablist"
        aria-label="Front history sections"
      >
        <button
          type="button"
          role="tab"
          aria-selected={tab === "timeline"}
          className={`rounded-md px-4 py-2 text-sm font-medium transition ${
            tab === "timeline"
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
          onClick={() => setTab("timeline")}
        >
          Timeline
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "analytics"}
          className={`rounded-md px-4 py-2 text-sm font-medium transition ${
            tab === "analytics"
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
          onClick={() => setTab("analytics")}
        >
          Analytics
        </button>
      </div>

      {tab === "timeline" ? (
        <>
          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}

          {loading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : intervals.length === 0 ? (
            <p className="text-sm text-muted-foreground">No front history yet.</p>
          ) : (
            <div className="space-y-3">
              {intervals.map((row) => {
                const startIso = row.startedAt;
                const endIso = row.endedAt;
                return (
                  <article
                    key={row.id}
                    className="rounded-xl border border-border bg-card p-4 shadow-sm"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <h2 className="text-base font-semibold text-foreground">
                          {nameFor(row.headmateId)}
                        </h2>
                        <p className="text-xs text-muted-foreground">
                          Start: {formatDateTime(startIso)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {endIso ? `End: ${formatDateTime(endIso)}` : "Active (no end time)"}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <span
                          className={`rounded-full px-2 py-1 text-xs font-medium ${
                            row.isActive
                              ? "bg-primary/15 text-primary"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {row.isActive ? "Active" : "Completed"}
                        </span>
                      </div>
                    </div>
                    <p className="mt-2 text-sm text-card-foreground">
                      Duration: {formatDuration(startIso, endIso ?? undefined)}
                    </p>
                    {row.note ? (
                      <p className="mt-2 text-sm text-muted-foreground">{row.note}</p>
                    ) : null}
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        className="rounded-md border border-border px-3 py-1.5 text-sm hover:bg-muted"
                        disabled={saving}
                        onClick={() => setEditing(row)}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="rounded-md border border-destructive/40 px-3 py-1.5 text-sm text-destructive hover:bg-destructive/10"
                        disabled={saving}
                        onClick={() => setPendingDelete(row)}
                      >
                        Delete
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </>
      ) : (
        <FrontAnalyticsPanel />
      )}

      {editing ? (
        <IntervalEditModal
          key={editing.id}
          title="Edit front segment"
          initial={editing}
          headmates={headmates}
          saving={saving}
          onClose={() => setEditing(null)}
          onSave={async (payload) => {
            setSaving(true);
            try {
              const res = await fetch(`/api/front/intervals/${editing.id}`, {
                method: "PATCH",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
              });
              const data = await res.json().catch(() => ({}));
              if (!res.ok) {
                throw new Error((data.error as string) || "Could not save.");
              }
              setEditing(null);
              await load();
            } finally {
              setSaving(false);
            }
          }}
        />
      ) : null}

      {adding ? (
        <IntervalEditModal
          key="add"
          title="Add front segment"
          initial={null}
          headmates={headmates}
          saving={saving}
          onClose={() => setAdding(false)}
          onSave={async (payload) => {
            setSaving(true);
            try {
              const res = await fetch("/api/front/intervals", {
                method: "POST",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
              });
              const data = await res.json().catch(() => ({}));
              if (!res.ok) {
                throw new Error((data.error as string) || "Could not create.");
              }
              setAdding(false);
              await load();
            } finally {
              setSaving(false);
            }
          }}
        />
      ) : null}

      {pendingDelete ? (
        <DeleteSegmentModal
          row={pendingDelete}
          nameFor={nameFor}
          onClose={() => setPendingDelete(null)}
          onDeleted={async () => {
            setPendingDelete(null);
            await load();
          }}
        />
      ) : null}
    </section>
  );
}

type EditPayload = {
  headmateId: string | null;
  startedAt: string;
  endedAt: string | null;
  note: string;
};

function IntervalEditModal(props: {
  title: string;
  initial: IntervalRow | null;
  headmates: HeadmateOpt[];
  saving: boolean;
  onClose: () => void;
  onSave: (p: EditPayload) => Promise<void>;
}) {
  const { title, initial, headmates, saving, onClose, onSave } = props;

  const [headmateId, setHeadmateId] = useState<string>(
    initial ? (initial.headmateId ?? "") : "",
  );
  const [startLocal, setStartLocal] = useState(() =>
    initial ? isoToDatetimeLocal(initial.startedAt) : isoToDatetimeLocal(new Date().toISOString()),
  );
  const [active, setActive] = useState(initial ? initial.endedAt == null : false);
  const [endLocal, setEndLocal] = useState(() =>
    initial?.endedAt ? isoToDatetimeLocal(initial.endedAt) : "",
  );
  const [note, setNote] = useState(initial?.note ?? "");
  const [formError, setFormError] = useState("");

  function handleClose() {
    setFormError("");
    onClose();
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setFormError("");

    const startedIso = datetimeLocalToIso(startLocal);
    if (!startedIso) {
      setFormError("Choose a valid start date and time.");
      return;
    }

    let endedAt: string | null;
    if (active) {
      endedAt = null;
    } else {
      const endIso = datetimeLocalToIso(endLocal);
      if (!endIso) {
        setFormError('End date and time are required when "still fronting" is unchecked.');
        return;
      }
      if (endIso && new Date(endIso).getTime() <= new Date(startedIso).getTime()) {
        setFormError("End must be after start.");
        return;
      }
      endedAt = endIso;
    }

    const hid = headmateId === "" ? null : headmateId;

    try {
      await onSave({
        headmateId: hid,
        startedAt: startedIso,
        endedAt,
        note,
      });
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Something went wrong.");
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="front-interval-modal-title"
      aria-describedby={formError ? "front-interval-modal-error" : undefined}
    >
      <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl border border-border bg-card p-4 shadow-lg">
        <h2 id="front-interval-modal-title" className="text-lg font-semibold text-foreground">
          {title}
        </h2>

        {formError ? (
          <p
            id="front-interval-modal-error"
            className="mt-3 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
            role="alert"
          >
            {formError}
          </p>
        ) : null}

        <form className="mt-4 space-y-3" onSubmit={(e) => void submit(e)} noValidate>
          <div>
            <label className="text-xs font-medium text-muted-foreground" htmlFor="hm">
              Who was fronting
            </label>
            <select
              id="hm"
              className="mt-1 w-full rounded-md border border-border bg-background px-2 py-2 text-sm"
              value={headmateId}
              onChange={(e) => {
                setHeadmateId(e.target.value);
                setFormError("");
              }}
            >
              <option value="">No one (empty front)</option>
              {headmates.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground" htmlFor="start">
              Start (local)
            </label>
            <input
              id="start"
              type="datetime-local"
              className="mt-1 w-full rounded-md border border-border bg-background px-2 py-2 text-sm"
              value={startLocal}
              onChange={(e) => {
                setStartLocal(e.target.value);
                setFormError("");
              }}
            />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={active}
              onChange={(e) => {
                setActive(e.target.checked);
                setFormError("");
              }}
            />
            Still fronting (no end time)
          </label>
          {!active ? (
            <div>
              <label className="text-xs font-medium text-muted-foreground" htmlFor="end">
                End (local)
              </label>
              <input
                id="end"
                type="datetime-local"
                className="mt-1 w-full rounded-md border border-border bg-background px-2 py-2 text-sm"
                value={endLocal}
                onChange={(e) => {
                  setEndLocal(e.target.value);
                  setFormError("");
                }}
              />
            </div>
          ) : null}
          <div>
            <label className="text-xs font-medium text-muted-foreground" htmlFor="note">
              Note (optional)
            </label>
            <textarea
              id="note"
              className="mt-1 w-full rounded-md border border-border bg-background px-2 py-2 text-sm"
              rows={2}
              value={note}
              onChange={(e) => {
                setNote(e.target.value);
                setFormError("");
              }}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              className="rounded-md border border-border px-3 py-2 text-sm"
              disabled={saving}
              onClick={handleClose}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
              disabled={saving}
            >
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function DeleteSegmentModal(props: {
  row: IntervalRow;
  nameFor: (id: string | null) => string;
  onClose: () => void;
  onDeleted: () => Promise<void>;
}) {
  const { row, nameFor, onClose, onDeleted } = props;
  const [working, setWorking] = useState(false);
  const [modalError, setModalError] = useState("");

  async function confirmDelete() {
    setWorking(true);
    setModalError("");
    try {
      const res = await fetch(`/api/front/intervals/${row.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error((data.error as string) || "Delete failed.");
      }
      await onDeleted();
    } catch (e) {
      setModalError(e instanceof Error ? e.message : "Delete failed.");
    } finally {
      setWorking(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-segment-title"
      aria-describedby={modalError ? "delete-segment-error" : "delete-segment-desc"}
    >
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-4 shadow-lg">
        <h2 id="delete-segment-title" className="text-lg font-semibold text-foreground">
          Delete front segment?
        </h2>
        <p id="delete-segment-desc" className="mt-2 text-sm text-muted-foreground">
          This removes one history row for{" "}
          <span className="font-medium text-foreground">{nameFor(row.headmateId)}</span>
          <span className="block mt-1">
            {formatDateTime(row.startedAt)}
            {row.endedAt ? ` → ${formatDateTime(row.endedAt)}` : " → (still fronting)"}
          </span>
          This cannot be undone.
        </p>

        {modalError ? (
          <p
            id="delete-segment-error"
            className="mt-3 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
            role="alert"
          >
            {modalError}
          </p>
        ) : null}

        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            className="rounded-md border border-border px-3 py-2 text-sm"
            disabled={working}
            onClick={() => {
              setModalError("");
              onClose();
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            className="rounded-md bg-destructive px-3 py-2 text-sm font-medium text-destructive-foreground disabled:opacity-50"
            disabled={working}
            onClick={() => void confirmDelete()}
          >
            {working ? "Deleting…" : "Delete segment"}
          </button>
        </div>
      </div>
    </div>
  );
}
