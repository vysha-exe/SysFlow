"use client";

import { useSession } from "next-auth/react";
import { useCallback, useEffect, useState } from "react";
import {
  HeadmateTemplatesEditor,
  HeadmateTemplatesToolbarButton,
} from "@/components/headmate-templates-panel";
import { TruncatedText } from "@/components/truncated-text";
import type { CustomFieldEntry } from "@/lib/custom-fields";
import {
  CUSTOM_FIELDS_CARD_VISIBLE_CAP,
  CUSTOM_FIELDS_MAX_ROWS,
  visibleCustomFields,
} from "@/lib/custom-fields";
import {
  CUSTOM_FIELD_VALUE_PREVIEW_CHARS,
  DESCRIPTION_MAX_CHARS,
} from "@/lib/display-limits";
import type { HeadmateTemplateDto } from "@/lib/headmate-templates";

type HeadmateRow = {
  id: string;
  name: string;
  pronouns: string;
  description: string;
  customFields: CustomFieldEntry[];
};

const FETCH_TIMEOUT_MS = 15_000;

async function fetchWithTimeout(input: string, init?: RequestInit) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(id);
  }
}

type FieldRow = { id: string; key: string; value: string };

function newRowId(): string {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `row-${Math.random().toString(36).slice(2, 11)}`;
}

function entriesToFieldRows(entries: CustomFieldEntry[]): FieldRow[] {
  if (entries.length === 0) return [{ id: newRowId(), key: "", value: "" }];
  return entries.map((e) => ({
    id: newRowId(),
    key: e.key,
    value: e.value,
  }));
}

function fieldRowsToEntries(rows: FieldRow[]): CustomFieldEntry[] {
  return rows.map((r) => ({ key: r.key, value: r.value }));
}

function reorderFieldRows(rows: FieldRow[], from: number, to: number): FieldRow[] {
  if (
    from === to ||
    from < 0 ||
    to < 0 ||
    from >= rows.length ||
    to >= rows.length
  ) {
    return rows;
  }
  const next = [...rows];
  const [removed] = next.splice(from, 1);
  next.splice(to, 0, removed);
  return next;
}

function HeadmateCardCustomFields({ entries }: { entries: CustomFieldEntry[] }) {
  const visible = visibleCustomFields(entries);
  const [expanded, setExpanded] = useState(false);
  const cap = CUSTOM_FIELDS_CARD_VISIBLE_CAP;

  if (visible.length === 0) return null;

  const shown = expanded ? visible : visible.slice(0, cap);
  const moreCount = visible.length - cap;

  return (
    <div className="mt-3">
      <dl className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
        {shown.map((field, idx) => (
          <div key={`cf-${idx}`}>
            <dt className="font-medium text-foreground">{field.key}</dt>
            <dd>
              <TruncatedText
                text={field.value}
                maxChars={CUSTOM_FIELD_VALUE_PREVIEW_CHARS}
                textClassName="text-xs text-muted-foreground"
              />
            </dd>
          </div>
        ))}
      </dl>
      {moreCount > 0 && (
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          className="mt-2 text-xs font-medium text-primary hover:underline"
        >
          {expanded ? "Show less" : `Show ${moreCount} more field${moreCount === 1 ? "" : "s"}…`}
        </button>
      )}
    </div>
  );
}

export function HeadmatesClient() {
  const { status } = useSession();
  const [headmates, setHeadmates] = useState<HeadmateRow[]>([]);
  const [activeIds, setActiveIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  /** False after fetch when API returns 401 (real sign-in required). Bypass mode still returns 200 without a session. */
  const [canUseApp, setCanUseApp] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  const [editorOpen, setEditorOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formName, setFormName] = useState("");
  const [formPronouns, setFormPronouns] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [fieldRows, setFieldRows] = useState<FieldRow[]>([
    { id: newRowId(), key: "", value: "" },
  ]);
  const [saving, setSaving] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  const [templates, setTemplates] = useState<HeadmateTemplateDto[]>([]);
  const [defaultTemplateId, setDefaultTemplateId] = useState<string | null>(
    null,
  );
  const [templatesPanelOpen, setTemplatesPanelOpen] = useState(false);
  const [savingTemplates, setSavingTemplates] = useState(false);

  const load = useCallback(async () => {
    // Do not wait for useSession() to finish — with AUTH_ENABLED=false the API works
    // without a session; otherwise we can get stuck on "Loading headmates…".
    setLoading(true);
    setError("");
    let hRes: Response;
    let aRes: Response;
    let tRes: Response;
    try {
      [hRes, aRes, tRes] = await Promise.all([
        fetchWithTimeout("/api/headmates", { credentials: "include" }),
        fetchWithTimeout("/api/front/active", { credentials: "include" }),
        fetchWithTimeout("/api/headmate-templates", { credentials: "include" }),
      ]);
    } catch (e) {
      const aborted = e instanceof Error && e.name === "AbortError";
      setError(
        aborted
          ? "Request timed out. Check that MongoDB is running and MONGODB_URI is set in frontend/.env.local, then restart the dev server."
          : "Could not reach the server.",
      );
      setCanUseApp(false);
      setLoading(false);
      return;
    }
    if (hRes.status === 401) {
      setHeadmates([]);
      setActiveIds([]);
      setCanUseApp(false);
      setLoading(false);
      return;
    }
    if (!hRes.ok) {
      const d = await hRes.json().catch(() => ({}));
      setError((d.error as string) || "Could not load headmates.");
      setCanUseApp(false);
      setLoading(false);
      return;
    }
    const hData = (await hRes.json()) as { headmates: HeadmateRow[] };
    let activeIdsNext: string[] = [];
    if (aRes.ok) {
      const aData = (await aRes.json()) as {
        active: { headmateIds: string[] } | null;
      };
      activeIdsNext = aData.active?.headmateIds ?? [];
    }
    setHeadmates(hData.headmates);
    setActiveIds(activeIdsNext);
    setCanUseApp(true);
    if (tRes.ok) {
      const tData = (await tRes.json()) as {
        templates: HeadmateTemplateDto[];
        defaultTemplateId: string | null;
      };
      setTemplates(tData.templates);
      setDefaultTemplateId(tData.defaultTemplateId);
    }
    setLoading(false);
  }, []);

  async function saveTemplates() {
    setSavingTemplates(true);
    try {
      const res = await fetch("/api/headmate-templates", {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          templates,
          defaultTemplateId,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error((data.error as string) || "Could not save templates.");
      }
      setTemplates(data.templates as HeadmateTemplateDto[]);
      setDefaultTemplateId(
        (data.defaultTemplateId as string | null | undefined) ?? null,
      );
    } finally {
      setSavingTemplates(false);
    }
  }

  useEffect(() => {
    void load();
  }, [status, load]);

  function openCreateWithTemplate(template: HeadmateTemplateDto | null) {
    setEditingId(null);
    setFormName("");
    setFormPronouns("");
    setFormDescription("");
    if (template && template.fieldLabels.length > 0) {
      setFieldRows(
        template.fieldLabels.map((label) => ({
          id: newRowId(),
          key: label,
          value: "",
        })),
      );
    } else {
      setFieldRows([{ id: newRowId(), key: "", value: "" }]);
    }
    setError("");
    setEditorOpen(true);
  }

  function openCreate() {
    const def = templates.find((t) => t.id === defaultTemplateId);
    openCreateWithTemplate(def ?? null);
  }

  function openEdit(h: HeadmateRow) {
    setEditingId(h.id);
    setFormName(h.name);
    setFormPronouns(h.pronouns);
    setFormDescription(h.description);
    setFieldRows(entriesToFieldRows(h.customFields ?? []));
    setError("");
    setEditorOpen(true);
  }

  function closeEditor() {
    if (saving) return;
    setEditorOpen(false);
    setDragIndex(null);
  }

  function moveRow(from: number, to: number) {
    setFieldRows((rows) => reorderFieldRows(rows, from, to));
  }

  async function saveHeadmate() {
    const name = formName.trim();
    if (!name) {
      setError("Name is required.");
      return;
    }
    setSaving(true);
    setError("");
    const customFields = fieldRowsToEntries(fieldRows);
    try {
      if (editingId) {
        const res = await fetch(`/api/headmates/${editingId}`, {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name,
            pronouns: formPronouns.trim(),
            description: formDescription.trim(),
            customFields,
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error((data.error as string) || "Could not save.");
        }
      } else {
        const res = await fetch("/api/headmates", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name,
            pronouns: formPronouns.trim(),
            description: formDescription.trim(),
            customFields,
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error((data.error as string) || "Could not create.");
        }
      }
      setEditorOpen(false);
      setDragIndex(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  async function deleteHeadmate(id: string, displayName: string) {
    if (
      !window.confirm(
        `Delete “${displayName}”? This cannot be undone. They will be removed from front history references.`,
      )
    ) {
      return;
    }
    setBusy(`delete:${id}`);
    setError("");
    try {
      const res = await fetch(`/api/headmates/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error((data.error as string) || "Could not delete.");
      }
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setBusy(null);
    }
  }

  async function mutate(
    action: "add" | "set" | "remove",
    headmateId: string,
  ) {
    setBusy(`${action}:${headmateId}`);
    setError("");
    try {
      const res = await fetchWithTimeout("/api/front", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, headmateId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error((data.error as string) || "Request failed");
      }
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setBusy(null);
    }
  }

  if (loading) {
    return (
      <p className="text-sm text-muted-foreground" data-testid="headmates-loading">
        Loading headmates…
      </p>
    );
  }

  if (!canUseApp) {
    return (
      <div className="rounded-xl border border-warning/40 bg-warning-bg p-4 text-sm text-warning-foreground">
        Sign in to load your headmates and manage who is fronting. (To skip sign-in locally, set{" "}
        <code className="rounded bg-background/80 px-1">AUTH_ENABLED=false</code> in{" "}
        <code className="rounded bg-background/80 px-1">.env.local</code> and restart the dev
        server.)
      </div>
    );
  }

  const atFieldLimit = fieldRows.length >= CUSTOM_FIELDS_MAX_ROWS;

  return (
    <div className="space-y-4">
      {error && !editorOpen && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          Each front change creates a <strong className="text-foreground">new session</strong>{" "}
          (see Front history). If someone is already fronting, add/set are hidden — use{" "}
          <strong className="text-foreground">Remove from front</strong> to avoid duplicate
          state.
        </p>
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
          <HeadmateTemplatesToolbarButton
            open={templatesPanelOpen}
            onClick={() => setTemplatesPanelOpen((o) => !o)}
          />
          <button
            type="button"
            onClick={openCreate}
            className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Add headmate
          </button>
        </div>
      </div>

      {templatesPanelOpen && (
        <HeadmateTemplatesEditor
          templates={templates}
          defaultTemplateId={defaultTemplateId}
          onTemplatesChange={setTemplates}
          onDefaultChange={setDefaultTemplateId}
          onSave={saveTemplates}
          saving={savingTemplates}
          onUseTemplate={(t) => {
            setTemplatesPanelOpen(false);
            openCreateWithTemplate(t);
          }}
        />
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        {headmates.map((headmate) => {
          const isFronting = activeIds.includes(headmate.id);
          const spin = (a: "add" | "set" | "remove") =>
            busy === `${a}:${headmate.id}`;
          const deleting = busy === `delete:${headmate.id}`;

          return (
            <article
              key={headmate.id}
              className="rounded-xl border border-border bg-card p-4 shadow-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h2 className="text-lg font-semibold text-foreground">{headmate.name}</h2>
                  {isFronting && (
                    <span className="mt-1 inline-block rounded-full bg-accent px-2 py-0.5 text-xs font-medium text-accent-foreground">
                      Fronting
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap gap-1">
                  <button
                    type="button"
                    disabled={Boolean(busy)}
                    onClick={() => openEdit(headmate)}
                    className="rounded-md border border-border bg-card px-2 py-1 text-xs font-medium text-foreground hover:bg-muted disabled:opacity-50"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    disabled={Boolean(busy)}
                    onClick={() => deleteHeadmate(headmate.id, headmate.name)}
                    className="rounded-md border border-destructive/40 bg-destructive/10 px-2 py-1 text-xs font-medium text-destructive hover:bg-destructive/20 disabled:opacity-50"
                  >
                    {deleting ? "…" : "Delete"}
                  </button>
                </div>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{headmate.pronouns}</p>
              <div className="mt-2">
                <TruncatedText
                  text={headmate.description}
                  maxChars={DESCRIPTION_MAX_CHARS}
                  textClassName="text-sm text-card-foreground"
                />
              </div>
              <HeadmateCardCustomFields entries={headmate.customFields ?? []} />

              <div className="mt-4 flex flex-wrap gap-2">
                {!isFronting && (
                  <>
                    <button
                      type="button"
                      disabled={Boolean(busy)}
                      onClick={() => mutate("add", headmate.id)}
                      className="rounded-md border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted disabled:opacity-50"
                    >
                      {spin("add") ? "…" : "Add to front"}
                    </button>
                    <button
                      type="button"
                      disabled={Boolean(busy)}
                      onClick={() => mutate("set", headmate.id)}
                      className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                    >
                      {spin("set") ? "…" : "Set as front"}
                    </button>
                  </>
                )}
                {isFronting && (
                  <button
                    type="button"
                    disabled={Boolean(busy)}
                    onClick={() => mutate("remove", headmate.id)}
                    className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/20 disabled:opacity-50"
                  >
                    {spin("remove") ? "…" : "Remove from front"}
                  </button>
                )}
              </div>
            </article>
          );
        })}
      </div>

      {editorOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center"
          role="presentation"
          onClick={(e) => e.target === e.currentTarget && closeEditor()}
        >
          <div
            className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-border bg-card p-4 shadow-lg"
            role="dialog"
            aria-modal="true"
            aria-labelledby="headmate-editor-title"
          >
            <h2
              id="headmate-editor-title"
              className="text-lg font-semibold text-foreground"
            >
              {editingId ? "Edit headmate" : "Add headmate"}
            </h2>
            {error && (
              <p className="mt-2 text-sm text-destructive">{error}</p>
            )}
            <div className="mt-4 space-y-3">
              <label className="block text-sm">
                <span className="text-muted-foreground">Name *</span>
                <input
                  className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  autoFocus
                />
              </label>
              <label className="block text-sm">
                <span className="text-muted-foreground">Pronouns</span>
                <input
                  className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
                  value={formPronouns}
                  onChange={(e) => setFormPronouns(e.target.value)}
                />
              </label>
              <label className="block text-sm">
                <span className="text-muted-foreground">
                  Description ({formDescription.length}/{DESCRIPTION_MAX_CHARS})
                </span>
                <textarea
                  className="mt-1 min-h-[88px] w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
                  value={formDescription}
                  maxLength={DESCRIPTION_MAX_CHARS}
                  onChange={(e) =>
                    setFormDescription(
                      e.target.value.slice(0, DESCRIPTION_MAX_CHARS),
                    )
                  }
                />
              </label>
              <div>
                <p className="text-sm text-muted-foreground">
                  Custom fields (optional) — drag the handle or use arrows to reorder. Empty
                  rows are kept here but hidden on the card until both label and value are
                  filled.
                </p>
                <div className="mt-2 space-y-2">
                  {fieldRows.map((row, i) => (
                    <div
                      key={row.id}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => {
                        e.preventDefault();
                        if (dragIndex === null) return;
                        setFieldRows((rows) =>
                          reorderFieldRows(rows, dragIndex, i),
                        );
                        setDragIndex(null);
                      }}
                      className={`flex flex-wrap items-center gap-1 rounded-md border border-border bg-muted/30 p-1.5 sm:flex-nowrap ${
                        dragIndex === i ? "opacity-60" : ""
                      }`}
                    >
                      <span
                        draggable
                        role="button"
                        tabIndex={0}
                        onDragStart={(e) => {
                          e.dataTransfer.setData("text/plain", String(i));
                          e.dataTransfer.effectAllowed = "move";
                          setDragIndex(i);
                        }}
                        onDragEnd={() => setDragIndex(null)}
                        className="cursor-grab select-none px-1 text-muted-foreground active:cursor-grabbing"
                        title="Drag to reorder"
                        aria-label="Drag to reorder field"
                      >
                        ⋮⋮
                      </span>
                      <div className="flex min-w-0 flex-1 flex-wrap gap-1 sm:flex-nowrap">
                        <input
                          placeholder="Label"
                          className="min-w-[6rem] flex-1 rounded-md border border-border bg-background px-2 py-1.5 text-xs text-foreground"
                          value={row.key}
                          onChange={(e) => {
                            const next = [...fieldRows];
                            next[i] = { ...next[i], key: e.target.value };
                            setFieldRows(next);
                          }}
                        />
                        <input
                          placeholder="Value"
                          className="min-w-0 flex-[2] rounded-md border border-border bg-background px-2 py-1.5 text-xs text-foreground"
                          value={row.value}
                          onChange={(e) => {
                            const next = [...fieldRows];
                            next[i] = { ...next[i], value: e.target.value };
                            setFieldRows(next);
                          }}
                        />
                      </div>
                      <div className="flex shrink-0 gap-0.5">
                        <button
                          type="button"
                          className="rounded border border-border px-1.5 text-[10px] text-muted-foreground hover:bg-muted disabled:opacity-40"
                          disabled={i === 0}
                          onClick={() => moveRow(i, i - 1)}
                          aria-label="Move field up"
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          className="rounded border border-border px-1.5 text-[10px] text-muted-foreground hover:bg-muted disabled:opacity-40"
                          disabled={i === fieldRows.length - 1}
                          onClick={() => moveRow(i, i + 1)}
                          aria-label="Move field down"
                        >
                          ↓
                        </button>
                        <button
                          type="button"
                          className="rounded border border-border px-2 text-xs text-muted-foreground hover:bg-muted"
                          onClick={() => {
                            const next = fieldRows.filter((_, j) => j !== i);
                            setFieldRows(
                              next.length > 0
                                ? next
                                : [{ id: newRowId(), key: "", value: "" }],
                            );
                          }}
                          aria-label="Remove row"
                        >
                          ×
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  className="mt-2 text-xs font-medium text-primary hover:underline disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={atFieldLimit}
                  onClick={() =>
                    setFieldRows([
                      ...fieldRows,
                      { id: newRowId(), key: "", value: "" },
                    ])
                  }
                >
                  + Add field
                  {atFieldLimit
                    ? ` (max ${CUSTOM_FIELDS_MAX_ROWS})`
                    : ""}
                </button>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2 border-t border-border pt-4">
              <button
                type="button"
                disabled={saving}
                onClick={closeEditor}
                className="rounded-md border border-border px-3 py-2 text-sm text-foreground hover:bg-muted"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => void saveHeadmate()}
                className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
              >
                {saving ? "Saving…" : editingId ? "Save" : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
