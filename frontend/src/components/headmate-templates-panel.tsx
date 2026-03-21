"use client";

import { useState } from "react";
import { CUSTOM_FIELDS_MAX_ROWS } from "@/lib/custom-fields";
import {
  HEADMATE_TEMPLATE_NAME_MAX,
  HEADMATE_TEMPLATES_MAX,
  type HeadmateTemplateDto,
} from "@/lib/headmate-templates";

type NewTemplateFormProps = {
  onAdd: (template: HeadmateTemplateDto) => void;
  disabled: boolean;
};

function NewTemplateForm({ onAdd, disabled }: NewTemplateFormProps) {
  const [name, setName] = useState("");
  const [labelsText, setLabelsText] = useState("");

  function submit() {
    const n = name.trim();
    if (!n) return;
    const fieldLabels = labelsText
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean)
      .slice(0, CUSTOM_FIELDS_MAX_ROWS);
    onAdd({
      id: `temp-${crypto.randomUUID()}`,
      name: n.slice(0, HEADMATE_TEMPLATE_NAME_MAX),
      fieldLabels,
    });
    setName("");
    setLabelsText("");
  }

  return (
    <div className="rounded-lg border border-dashed border-border bg-muted/20 p-3">
      <p className="text-sm font-medium text-foreground">New template</p>
      <p className="mt-1 text-xs text-muted-foreground">
        Field titles only — values stay empty until you create the headmate.
      </p>
      <input
        className="mt-2 w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm text-foreground"
        placeholder="Template name"
        maxLength={HEADMATE_TEMPLATE_NAME_MAX}
        value={name}
        onChange={(e) => setName(e.target.value)}
        disabled={disabled}
      />
      <textarea
        className="mt-2 min-h-[72px] w-full rounded-md border border-border bg-background px-2 py-1.5 text-xs text-foreground"
        placeholder="Field labels, one per line"
        value={labelsText}
        onChange={(e) => setLabelsText(e.target.value)}
        disabled={disabled}
      />
      <button
        type="button"
        disabled={disabled || !name.trim()}
        onClick={submit}
        className="mt-2 rounded-md border border-border bg-card px-2 py-1 text-xs font-medium text-foreground hover:bg-muted disabled:opacity-50"
      >
        Add template
      </button>
    </div>
  );
}

export function HeadmateTemplatesToolbarButton({
  open,
  onClick,
}: {
  open: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-3 py-2 text-sm font-medium text-foreground hover:bg-muted"
      aria-expanded={open}
      aria-controls="headmate-templates-panel"
    >
      <ChevronIcon className={open ? "rotate-180" : ""} />
      Templates
    </button>
  );
}

type EditorProps = {
  templates: HeadmateTemplateDto[];
  defaultTemplateId: string | null;
  onTemplatesChange: (next: HeadmateTemplateDto[]) => void;
  onDefaultChange: (id: string | null) => void;
  onSave: () => Promise<void>;
  saving: boolean;
  onUseTemplate: (template: HeadmateTemplateDto) => void;
};

/** Expanded panel only — place below the Templates / Add headmate toolbar. */
export function HeadmateTemplatesEditor({
  templates,
  defaultTemplateId,
  onTemplatesChange,
  onDefaultChange,
  onSave,
  saving,
  onUseTemplate,
}: EditorProps) {
  const [saveError, setSaveError] = useState("");

  function updateTemplate(id: string, patch: Partial<HeadmateTemplateDto>) {
    onTemplatesChange(
      templates.map((t) => (t.id === id ? { ...t, ...patch } : t)),
    );
  }

  function updateLabelsFromText(id: string, text: string) {
    const fieldLabels = text
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean)
      .slice(0, CUSTOM_FIELDS_MAX_ROWS);
    updateTemplate(id, { fieldLabels });
  }

  function removeTemplate(id: string) {
    onTemplatesChange(templates.filter((t) => t.id !== id));
    if (defaultTemplateId === id) onDefaultChange(null);
  }

  async function handleSave() {
    setSaveError("");
    try {
      await onSave();
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Could not save templates");
    }
  }

  return (
    <div
      id="headmate-templates-panel"
      className="rounded-xl border border-border bg-card p-4 shadow-sm"
    >
      <p className="text-sm text-muted-foreground">
        Create templates with field titles only. Set a{" "}
        <strong className="text-foreground">default</strong> to use when you click{" "}
        <strong className="text-foreground">Add headmate</strong>. Use other templates with{" "}
        <strong className="text-foreground">Use template</strong> here.
      </p>

      {saveError && (
        <p className="mt-2 text-sm text-destructive">{saveError}</p>
      )}

      <div className="mt-4 space-y-4">
        {templates.map((t) => (
          <div
            key={t.id}
            className="rounded-lg border border-border bg-muted/20 p-3"
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <label className="block min-w-0 flex-1 text-sm">
                <span className="text-muted-foreground">Name</span>
                <input
                  className="mt-1 w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm text-foreground"
                  maxLength={HEADMATE_TEMPLATE_NAME_MAX}
                  value={t.name}
                  onChange={(e) =>
                    updateTemplate(t.id, { name: e.target.value })
                  }
                  disabled={saving}
                />
              </label>
              <div className="flex flex-wrap gap-1">
                <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <input
                    type="radio"
                    name="default-template"
                    checked={defaultTemplateId === t.id}
                    onChange={() => onDefaultChange(t.id)}
                    disabled={saving}
                  />
                  Default
                </label>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => onUseTemplate(t)}
                  className="rounded-md bg-primary px-2 py-1 text-xs font-medium text-primary-foreground hover:bg-primary/90"
                >
                  Use template
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => removeTemplate(t.id)}
                  className="rounded-md border border-destructive/40 bg-destructive/10 px-2 py-1 text-xs text-destructive hover:bg-destructive/20"
                >
                  Remove
                </button>
              </div>
            </div>
            <label className="mt-2 block text-xs text-muted-foreground">
              Field labels (one per line)
              <textarea
                className="mt-1 min-h-[80px] w-full rounded-md border border-border bg-background px-2 py-1.5 text-xs text-foreground"
                value={t.fieldLabels.join("\n")}
                onChange={(e) => updateLabelsFromText(t.id, e.target.value)}
                disabled={saving}
              />
            </label>
          </div>
        ))}
      </div>

      <div className="mt-4 space-y-3">
        <NewTemplateForm
          disabled={saving || templates.length >= HEADMATE_TEMPLATES_MAX}
          onAdd={(template) => {
            if (templates.length >= HEADMATE_TEMPLATES_MAX) return;
            onTemplatesChange([...templates, template]);
          }}
        />
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-4">
          <button
            type="button"
            disabled={saving || defaultTemplateId === null}
            onClick={() => onDefaultChange(null)}
            className="text-xs text-muted-foreground hover:text-foreground disabled:opacity-40"
          >
            Clear default
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={() => void handleSave()}
            className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save templates"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ChevronIcon({ className }: { className?: string }) {
  return (
    <svg
      className={`h-4 w-4 shrink-0 transition-transform ${className ?? ""}`}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden
    >
      <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
