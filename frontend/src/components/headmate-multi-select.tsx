"use client";

import {
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";

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

type PanelLayout = {
  top: number;
  left: number;
  width: number;
  maxHeight: number;
};

/**
 * Fit the panel in the visible viewport (handles mobile toolbars / visualViewport).
 */
function computePanelLayout(buttonEl: HTMLElement): PanelLayout {
  const r = buttonEl.getBoundingClientRect();
  const pad = 8;
  const gap = 4;
  const vv = window.visualViewport;
  const vw = vv?.width ?? window.innerWidth;
  const vh = vv?.height ?? window.innerHeight;
  const vTop = vv?.offsetTop ?? 0;
  const vLeft = vv?.offsetLeft ?? 0;
  const vBottom = vTop + vh;
  const vRight = vLeft + vw;

  const spaceBelow = vBottom - r.bottom - pad;
  const spaceAbove = r.top - vTop - pad;
  const minPanel = 120;
  const cap = Math.min(vh - 2 * pad, vh * 0.92);

  const openDown = spaceBelow >= minPanel || spaceBelow >= spaceAbove;

  let top: number;
  let maxHeight: number;

  if (openDown) {
    top = r.bottom + gap;
    maxHeight = Math.min(cap, Math.max(minPanel, spaceBelow - gap));
  } else {
    maxHeight = Math.min(cap, Math.max(minPanel, spaceAbove - gap));
    top = r.top - maxHeight - gap;
    if (top < vTop + pad) {
      top = vTop + pad;
      maxHeight = Math.min(maxHeight, r.top - top - gap);
    }
  }

  const minW = Math.min(280, vw - 2 * pad);
  const width = Math.min(Math.max(r.width, minW), vw - 2 * pad);
  let left = r.left;
  if (left + width > vRight - pad) {
    left = vRight - width - pad;
  }
  if (left < vLeft + pad) {
    left = vLeft + pad;
  }

  return { top, left, width, maxHeight: Math.max(minPanel, maxHeight) };
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
  const [mounted, setMounted] = useState(false);
  const [layout, setLayout] = useState<PanelLayout | null>(null);

  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const filteredHeadmates = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return headmates;
    return headmates.filter((h) => h.name.toLowerCase().includes(q));
  }, [headmates, searchQuery]);

  useLayoutEffect(() => {
    if (!open || !mounted) {
      setLayout(null);
      return;
    }

    function updateLayout() {
      const btn = buttonRef.current;
      if (!btn) return;
      setLayout(computePanelLayout(btn));
    }

    updateLayout();

    const vv = window.visualViewport;
    vv?.addEventListener("resize", updateLayout);
    vv?.addEventListener("scroll", updateLayout);
    window.addEventListener("resize", updateLayout);
    window.addEventListener("scroll", updateLayout, true);

    return () => {
      vv?.removeEventListener("resize", updateLayout);
      vv?.removeEventListener("scroll", updateLayout);
      window.removeEventListener("resize", updateLayout);
      window.removeEventListener("scroll", updateLayout, true);
    };
  }, [open, mounted, filteredHeadmates.length]);

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
      if (panelRef.current?.contains(t)) return;
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

  function handleToggleOpen() {
    if (disabled || headmates.length === 0) return;
    setOpen((was) => {
      if (was) {
        return false;
      }
      const btn = buttonRef.current;
      if (btn) {
        setLayout(computePanelLayout(btn));
      }
      return true;
    });
  }

  const panel =
    open && headmates.length > 0 && mounted && layout ? (
      <div
        ref={panelRef}
        className="z-[100] flex flex-col overflow-hidden rounded-md border border-border bg-card shadow-lg"
        style={{
          position: "fixed",
          top: layout.top,
          left: layout.left,
          width: layout.width,
          maxHeight: layout.maxHeight,
        }}
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
          className="min-h-0 flex-1 touch-pan-y overflow-y-auto overscroll-y-contain py-1 [scrollbar-gutter:stable]"
          onWheel={(e) => {
            e.stopPropagation();
          }}
        >
          {filteredHeadmates.length === 0 ? (
            <li
              className="px-3 py-4 text-center text-sm text-muted-foreground"
              role="presentation"
            >
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
                        selected
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border"
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
    ) : null;

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        disabled={disabled || headmates.length === 0}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-labelledby={labelId}
        onClick={handleToggleOpen}
        className="flex w-full items-center justify-between gap-2 rounded-md border border-border bg-background px-3 py-2 text-left text-sm text-foreground hover:bg-muted/50 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <span className={selectedIds.size === 0 ? "text-muted-foreground" : ""}>
          {headmates.length === 0 ? "Add headmates first" : summary}
        </span>
        <span className="text-muted-foreground" aria-hidden>
          {open ? "▲" : "▼"}
        </span>
      </button>

      {mounted && panel ? createPortal(panel, document.body) : null}
    </div>
  );
}
