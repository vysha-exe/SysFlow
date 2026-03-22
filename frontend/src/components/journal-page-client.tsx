"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { HeadmateMultiSelect } from "@/components/headmate-multi-select";
import {
  JOURNAL_CARD_PREVIEW_CHARS,
  JOURNAL_CONTENT_MAX_CHARS,
  JOURNAL_TITLE_MAX_CHARS,
} from "@/lib/display-limits";
import type { SerializedJournalEntry } from "@/lib/journal-serialize";
import { formatDateTime } from "@/lib/time";

export type JournalHeadmateOption = { id: string; name: string };

type Props = {
  entries: SerializedJournalEntry[];
  headmates: JournalHeadmateOption[];
};

function displayJournalTitle(title: string): string {
  const t = title.trim();
  return t.length > 0 ? t : "Untitled";
}

/** Start/end of local calendar day from `YYYY-MM-DD`. */
function localDayBounds(dateStr: string): { start: number; end: number } | null {
  const parts = dateStr.split("-").map(Number);
  if (parts.length !== 3) return null;
  const [y, m, d] = parts;
  if (!y || !m || !d) return null;
  const start = new Date(y, m - 1, d, 0, 0, 0, 0).getTime();
  const end = new Date(y, m - 1, d, 23, 59, 59, 999).getTime();
  return { start, end };
}

function entryPassesFilters(
  entry: SerializedJournalEntry,
  titleQuery: string,
  dateFrom: string,
  dateTo: string,
  authorIds: Set<string>,
): boolean {
  if (titleQuery.trim()) {
    const q = titleQuery.trim().toLowerCase();
    if (!displayJournalTitle(entry.title).toLowerCase().includes(q)) {
      return false;
    }
  }

  const written = new Date(entry.createdAt).getTime();

  if (dateFrom.trim()) {
    const b = localDayBounds(dateFrom.trim());
    if (b && written < b.start) return false;
  }
  if (dateTo.trim()) {
    const b = localDayBounds(dateTo.trim());
    if (b && written > b.end) return false;
  }

  if (authorIds.size > 0) {
    const tagged = entry.headmateIds.some((id) => authorIds.has(id));
    if (!tagged) return false;
  }

  return true;
}

export function JournalPageClient({ entries, headmates }: Props) {
  const router = useRouter();
  const [modalOpen, setModalOpen] = useState(false);
  const [mode, setMode] = useState<"create" | "edit">("create");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const [viewEntry, setViewEntry] = useState<SerializedJournalEntry | null>(null);
  const [pendingDeleteEntry, setPendingDeleteEntry] =
    useState<SerializedJournalEntry | null>(null);

  const [filterTitle, setFilterTitle] = useState("");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");
  const [filterAuthorIds, setFilterAuthorIds] = useState<Set<string>>(new Set());

  const filteredEntries = useMemo(() => {
    return entries.filter((e) =>
      entryPassesFilters(e, filterTitle, filterDateFrom, filterDateTo, filterAuthorIds),
    );
  }, [entries, filterTitle, filterDateFrom, filterDateTo, filterAuthorIds]);

  const hasActiveFilters =
    filterTitle.trim() !== "" ||
    filterDateFrom.trim() !== "" ||
    filterDateTo.trim() !== "" ||
    filterAuthorIds.size > 0;

  const hasAdvancedFilters =
    filterDateFrom.trim() !== "" ||
    filterDateTo.trim() !== "" ||
    filterAuthorIds.size > 0;

  const closeModal = useCallback(() => {
    if (busy) return;
    setModalOpen(false);
    setEditingId(null);
    setError("");
    setTitle("");
    setContent("");
    setSelectedIds(new Set());
  }, [busy]);

  const closeView = useCallback(() => {
    setViewEntry(null);
  }, []);

  const closeDeleteConfirm = useCallback(() => {
    if (busy) return;
    setPendingDeleteEntry(null);
  }, [busy]);

  function openCreate() {
    setMode("create");
    setEditingId(null);
    setTitle("");
    setContent("");
    setSelectedIds(new Set());
    setError("");
    setModalOpen(true);
  }

  function openEdit(entry: SerializedJournalEntry) {
    setMode("edit");
    setEditingId(entry.id);
    setTitle(entry.title);
    setContent(entry.content);
    setSelectedIds(new Set(entry.headmateIds));
    setError("");
    setModalOpen(true);
  }

  function clearFilters() {
    setFilterTitle("");
    setFilterDateFrom("");
    setFilterDateTo("");
    setFilterAuthorIds(new Set());
  }

  useEffect(() => {
    if (!modalOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !busy) closeModal();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [modalOpen, busy, closeModal]);

  useEffect(() => {
    if (!viewEntry) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") closeView();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [viewEntry, closeView]);

  useEffect(() => {
    if (!pendingDeleteEntry) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !busy) closeDeleteConfirm();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [pendingDeleteEntry, busy, closeDeleteConfirm]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);

    const payload = {
      title,
      content,
      headmateIds: Array.from(selectedIds),
    };

    const url =
      mode === "create" ? "/api/journal" : `/api/journal/${editingId}`;
    const method = mode === "create" ? "POST" : "PATCH";

    const response = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    let data: { error?: string } = {};
    const text = await response.text();
    try {
      data = text ? (JSON.parse(text) as typeof data) : {};
    } catch {
      setError(`Server error (${response.status}). Try again.`);
      setBusy(false);
      return;
    }

    if (!response.ok) {
      setError(data.error ?? "Could not save entry.");
      setBusy(false);
      return;
    }

    setBusy(false);
    closeModal();
    router.refresh();
  }

  async function executeDelete(id: string) {
    setBusy(true);
    const response = await fetch(`/api/journal/${id}`, { method: "DELETE" });
    let data: { error?: string } = {};
    const text = await response.text();
    try {
      data = text ? (JSON.parse(text) as typeof data) : {};
    } catch {
      /* empty */
    }
    setBusy(false);
    if (!response.ok) {
      window.alert(data.error ?? "Could not delete entry.");
      return;
    }
    setPendingDeleteEntry(null);
    if (modalOpen && editingId === id) closeModal();
    if (viewEntry?.id === id) closeView();
    router.refresh();
  }

  const confirmDelete = () => {
    if (!pendingDeleteEntry) return;
    void executeDelete(pendingDeleteEntry.id);
  };

  const nameFor = (id: string) => headmates.find((h) => h.id === id)?.name ?? "?";

  return (
    <>
      {pendingDeleteEntry ? (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center p-4"
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="journal-delete-title"
          aria-describedby="journal-delete-desc"
        >
          <button
            type="button"
            className="absolute inset-0 bg-black/50"
            aria-label="Cancel delete"
            disabled={busy}
            onClick={closeDeleteConfirm}
          />
          <div className="relative z-10 w-full max-w-md rounded-xl border border-border bg-card p-5 shadow-xl sm:p-6">
            <h2 id="journal-delete-title" className="text-lg font-semibold text-foreground">
              Delete journal entry?
            </h2>
            <p id="journal-delete-desc" className="mt-2 text-sm text-muted-foreground">
              This will permanently remove{" "}
              <span className="font-medium text-foreground">
                {displayJournalTitle(pendingDeleteEntry.title)}
              </span>
              . This cannot be undone.
            </p>
            <div className="mt-6 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={closeDeleteConfirm}
                disabled={busy}
                className="rounded-md border border-border bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-muted disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                disabled={busy}
                className="rounded-md bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50"
              >
                {busy ? "Deleting…" : "Delete entry"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-foreground">Entries</h2>
        <button
          type="button"
          onClick={openCreate}
          disabled={busy}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          New entry
        </button>
      </div>

      {entries.length > 0 ? (
        <div className="space-y-4 rounded-xl border border-border bg-card p-4 shadow-sm">
          <h3 className="text-sm font-semibold text-foreground">Filter</h3>
          <div className="space-y-1.5">
            <label htmlFor="journal-filter-title" className="text-xs font-medium text-muted-foreground">
              Search title
            </label>
            <input
              id="journal-filter-title"
              type="search"
              value={filterTitle}
              onChange={(e) => setFilterTitle(e.target.value)}
              placeholder="Matches entry title…"
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground"
              autoComplete="off"
            />
          </div>

          <details className="group rounded-lg border border-border bg-muted/20">
            <summary className="cursor-pointer list-none px-3 py-2.5 text-sm font-medium text-foreground marker:hidden [&::-webkit-details-marker]:hidden">
              <span className="inline-flex items-center gap-2">
                <span className="text-muted-foreground group-open:rotate-90 transition-transform">▶</span>
                Advanced search
                {hasAdvancedFilters ? (
                  <span className="rounded-full bg-primary/15 px-2 py-0.5 text-xs font-medium text-primary">
                    Active
                  </span>
                ) : null}
              </span>
            </summary>
            <div className="space-y-4 border-t border-border px-3 pb-3 pt-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label htmlFor="journal-filter-from" className="text-xs font-medium text-muted-foreground">
                    From date
                  </label>
                  <input
                    id="journal-filter-from"
                    type="date"
                    value={filterDateFrom}
                    onChange={(e) => setFilterDateFrom(e.target.value)}
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
                  />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="journal-filter-to" className="text-xs font-medium text-muted-foreground">
                    To date
                  </label>
                  <input
                    id="journal-filter-to"
                    type="date"
                    value={filterDateTo}
                    onChange={(e) => setFilterDateTo(e.target.value)}
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <span id="journal-filter-authors-label" className="text-xs font-medium text-muted-foreground">
                  Written by (any match)
                </span>
                <HeadmateMultiSelect
                  labelId="journal-filter-authors-label"
                  headmates={headmates}
                  selectedIds={filterAuthorIds}
                  onChange={setFilterAuthorIds}
                  disabled={busy}
                />
              </div>
            </div>
          </details>

          {hasActiveFilters ? (
            <button
              type="button"
              onClick={clearFilters}
              className="text-sm font-medium text-primary hover:underline"
            >
              Clear filters
            </button>
          ) : null}
        </div>
      ) : null}

      {entries.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No entries yet. Use <strong className="text-foreground">New entry</strong> to add one.
        </p>
      ) : filteredEntries.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No entries match your filters.{" "}
          {hasActiveFilters ? (
            <button type="button" onClick={clearFilters} className="font-medium text-primary hover:underline">
              Clear filters
            </button>
          ) : null}
        </p>
      ) : (
        <div className="space-y-3">
          {filteredEntries.map((entry) => {
            const names = entry.headmateIds.map((id) => nameFor(id)).filter(Boolean);
            const byLine = names.length > 0 ? names.join(", ") : "Unattributed";
            const fullTitle = displayJournalTitle(entry.title);
            const needsPreview = entry.content.length > JOURNAL_CARD_PREVIEW_CHARS;
            const previewText = needsPreview
              ? `${entry.content.slice(0, JOURNAL_CARD_PREVIEW_CHARS).trimEnd()}…`
              : entry.content;

            return (
              <article
                key={entry.id}
                className="max-w-full min-w-0 overflow-hidden rounded-xl border border-border bg-card p-4 shadow-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <h3 className="break-words text-base font-semibold text-foreground">{fullTitle}</h3>
                    <p className="mt-0.5 text-xs uppercase tracking-wide text-muted-foreground">
                      {formatDateTime(entry.createdAt)}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setViewEntry(entry)}
                      disabled={busy}
                      className="rounded-md border border-border bg-background px-2.5 py-1 text-xs font-medium text-foreground hover:bg-muted disabled:opacity-50"
                    >
                      View
                    </button>
                    <button
                      type="button"
                      onClick={() => openEdit(entry)}
                      disabled={busy}
                      className="rounded-md border border-border bg-background px-2.5 py-1 text-xs font-medium text-foreground hover:bg-muted disabled:opacity-50"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => setPendingDeleteEntry(entry)}
                      disabled={busy}
                      className="rounded-md border border-destructive/40 bg-background px-2.5 py-1 text-xs font-medium text-destructive hover:bg-destructive/10 disabled:opacity-50"
                    >
                      Delete
                    </button>
                  </div>
                </div>
                <p className="mt-2 min-w-0 max-w-full text-sm text-card-foreground">
                  <span className="whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
                    {previewText}
                  </span>
                  {needsPreview ? (
                    <>
                      {" "}
                      <button
                        type="button"
                        onClick={() => setViewEntry(entry)}
                        className="inline whitespace-nowrap align-baseline text-sm font-medium text-primary underline-offset-4 hover:underline"
                      >
                        Show more
                      </button>
                    </>
                  ) : null}
                </p>
                <p className="mt-2 break-words text-xs text-muted-foreground [overflow-wrap:anywhere]">
                  <span className="font-medium text-foreground/80">By:</span> {byLine}
                </p>
              </article>
            );
          })}
        </div>
      )}

      {viewEntry ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="journal-view-title"
        >
          <button
            type="button"
            className="absolute inset-0 bg-black/50"
            aria-label="Close"
            onClick={closeView}
          />
          <div className="relative z-10 max-h-[min(90vh,720px)] w-full min-w-0 max-w-lg overflow-y-auto rounded-xl border border-border bg-card p-5 shadow-xl sm:p-6">
            <h2
              id="journal-view-title"
              className="break-words text-lg font-semibold text-foreground [overflow-wrap:anywhere]"
            >
              {displayJournalTitle(viewEntry.title)}
            </h2>
            <p className="mt-1 text-xs uppercase tracking-wide text-muted-foreground">
              {formatDateTime(viewEntry.createdAt)}
            </p>
            <p className="mt-3 text-xs text-muted-foreground">
              <span className="font-medium text-foreground/80">By:</span>{" "}
              {viewEntry.headmateIds.length > 0
                ? viewEntry.headmateIds.map((id) => nameFor(id)).join(", ")
                : "Unattributed"}
            </p>
            <div className="mt-4 min-w-0 max-w-full border-t border-border pt-4">
              <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-card-foreground [overflow-wrap:anywhere]">
                {viewEntry.content}
              </p>
            </div>
            <div className="mt-6 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={closeView}
                className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  const e = viewEntry;
                  closeView();
                  openEdit(e);
                }}
                className="rounded-md border border-border bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-muted"
              >
                Edit entry
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {modalOpen ? (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="journal-modal-title"
        >
          <button
            type="button"
            className="absolute inset-0 bg-black/50"
            aria-label="Close dialog"
            disabled={busy}
            onClick={closeModal}
          />
          <div className="relative z-10 w-full min-w-0 max-w-lg overflow-visible rounded-xl border border-border bg-card p-5 shadow-xl sm:p-6">
            <h2 id="journal-modal-title" className="text-lg font-semibold text-foreground">
              {mode === "create" ? "New journal entry" : "Edit journal entry"}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Add a title and entry text. Tag authors with the dropdown (optional).
            </p>

            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="journal-modal-title-field" className="text-sm font-medium text-foreground">
                  Title
                </label>
                <input
                  id="journal-modal-title-field"
                  type="text"
                  required
                  maxLength={JOURNAL_TITLE_MAX_CHARS}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground"
                  placeholder="Short label for this entry"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  disabled={busy}
                />
                <p className="text-xs text-muted-foreground">
                  {title.length}/{JOURNAL_TITLE_MAX_CHARS} — used for search and cards
                </p>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="journal-modal-content" className="text-sm font-medium text-foreground">
                  Entry
                </label>
                <textarea
                  id="journal-modal-content"
                  required
                  rows={8}
                  maxLength={JOURNAL_CONTENT_MAX_CHARS}
                  className="max-h-[min(50vh,400px)] w-full resize-y overflow-y-auto rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground"
                  placeholder="What happened, how you feel, or anything you want to remember…"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  disabled={busy}
                />
                <p className="text-xs text-muted-foreground">
                  {content.length.toLocaleString()}/{JOURNAL_CONTENT_MAX_CHARS.toLocaleString()}{" "}
                  characters
                </p>
              </div>

              <div className="space-y-1.5">
                <span id="journal-written-by-label" className="text-sm font-medium text-foreground">
                  Written by
                </span>
                <HeadmateMultiSelect
                  labelId="journal-written-by-label"
                  headmates={headmates}
                  selectedIds={selectedIds}
                  onChange={setSelectedIds}
                  disabled={busy}
                />
              </div>

              {error ? (
                <p className="text-sm text-destructive" role="alert">
                  {error}
                </p>
              ) : null}

              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  type="submit"
                  disabled={busy || !content.trim() || !title.trim()}
                  className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50"
                >
                  {busy ? "Saving…" : mode === "create" ? "Save entry" : "Save changes"}
                </button>
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={busy}
                  className="rounded-md border border-border bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-muted disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
