"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";

export type HeadmateOption = { id: string; name: string };

type Props = {
  headmates: HeadmateOption[];
  selectedIds: Set<string>;
  onChange: (next: Set<string>) => void;
  labelId?: string;
  disabled?: boolean;
};

function summaryLabel(headmates: HeadmateOption[], selectedIds: Set<string>): string {
  if (selectedIds.size === 0) return "Select headmates…";
  const names = headmates
    .filter((h) => selectedIds.has(h.id))
    .map((h) => h.name);
  if (names.length <= 2) return names.join(", ");
  return `${names.slice(0, 2).join(", ")} +${names.length - 2} more`;
}

export function HeadmateMultiSelect({
  headmates,
  selectedIds,
  onChange,
  labelId,
  disabled,
}: Props) {
  const searchFieldId = `${useId()}-headmate-search`;
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const filteredHeadmates = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return headmates;
    return headmates.filter((h) => h.name.toLowerCase().includes(q));
  }, [headmates, searchQuery]);

  useEffect(() => {
    if (!open) {
      setSearchQuery("");
      return;
    }
    const id = window.requestAnimationFrame(() => {
      searchInputRef.current?.focus();
    });
    return () => window.cancelAnimationFrame(id);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onDocMouseDown(e: MouseEvent) {
      const t = e.target as Node;
      if (rootRef.current?.contains(t)) return;
      setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDocMouseDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocMouseDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const summary = useMemo(
    () => summaryLabel(headmates, selectedIds),
    [headmates, selectedIds],
  );

  function toggle(id: string) {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onChange(next);
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        disabled={disabled || headmates.length === 0}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-labelledby={labelId}
        onClick={() => !disabled && headmates.length > 0 && setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-2 rounded-md border border-border bg-background px-3 py-2 text-left text-sm text-foreground hover:bg-muted/50 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <span className={selectedIds.size === 0 ? "text-muted-foreground" : ""}>
          {headmates.length === 0 ? "Add headmates first" : summary}
        </span>
        <span className="text-muted-foreground" aria-hidden>
          {open ? "▲" : "▼"}
        </span>
      </button>

      {open && headmates.length > 0 ? (
        <div
          className="absolute z-50 mt-1 flex w-full min-w-[min(100%,280px)] max-h-72 flex-col overflow-hidden rounded-md border border-border bg-card shadow-lg"
          role="presentation"
        >
          <div className="shrink-0 border-b border-border p-2">
            <label htmlFor={searchFieldId} className="sr-only">
              Search headmates
            </label>
            <input
              ref={searchInputRef}
              id={searchFieldId}
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search headmates…"
              autoComplete="off"
              spellCheck={false}
              className="w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
          <ul
            role="listbox"
            aria-multiselectable="true"
            aria-labelledby={labelId}
            className="min-h-0 flex-1 overflow-y-auto py-1"
          >
            {filteredHeadmates.length === 0 ? (
              <li className="px-3 py-4 text-center text-sm text-muted-foreground" role="presentation">
                No matches.
              </li>
            ) : (
              filteredHeadmates.map((h) => {
                const selected = selectedIds.has(h.id);
                return (
                  <li key={h.id} role="option" aria-selected={selected}>
                    <button
                      type="button"
                      onClick={() => toggle(h.id)}
                      className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-muted ${
                        selected ? "bg-primary/10 font-medium text-foreground" : "text-foreground"
                      }`}
                    >
                      <span
                        className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                          selected ? "border-primary bg-primary text-primary-foreground" : "border-border"
                        }`}
                        aria-hidden
                      >
                        {selected ? "✓" : ""}
                      </span>
                      {h.name}
                    </button>
                  </li>
                );
              })
            )}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
