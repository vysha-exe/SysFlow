"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";

export function FrontIntervalNoteModal({
  intervalId,
  title,
  initialNote,
  onClose,
  onSaved,
}: {
  intervalId: string;
  title: string;
  initialNote: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [note, setNote] = useState(initialNote);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/front/intervals/${intervalId}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error((data.error as string) || "Could not save note.");
      }
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save note.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="front-note-modal-title"
    >
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-4 shadow-lg">
        <h2
          id="front-note-modal-title"
          className="text-lg font-semibold text-foreground"
        >
          {title}
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Saved on this front segment. View or edit the full timeline on{" "}
          <Link
            href="/front-history"
            className="font-medium text-primary underline underline-offset-2 hover:text-primary/90"
          >
            Front history
          </Link>
          .
        </p>

        {error ? (
          <p
            className="mt-3 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
            role="alert"
          >
            {error}
          </p>
        ) : null}

        <form className="mt-4 space-y-3" onSubmit={(e) => void submit(e)}>
          <label className="block text-sm">
            <span className="text-muted-foreground">Note</span>
            <textarea
              className="mt-1 min-h-[120px] w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
              value={note}
              onChange={(e) => {
                setNote(e.target.value);
                setError("");
              }}
              placeholder="How are you feeling? Context for this front?"
              autoFocus
            />
          </label>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              className="rounded-md border border-border px-3 py-2 text-sm"
              disabled={saving}
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
              disabled={saving}
            >
              {saving ? "Saving…" : "Save note"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
