import { CUSTOM_FIELDS_MAX_ROWS } from "@/lib/custom-fields";

export type HeadmateTemplateDto = {
  id: string;
  name: string;
  /** Ordered field titles (labels only — values filled in when creating a headmate). */
  fieldLabels: string[];
};

export const HEADMATE_TEMPLATES_MAX = 20;
export const HEADMATE_TEMPLATE_NAME_MAX = 80;
export const HEADMATE_TEMPLATE_LABEL_MAX = 100;

export function normalizeFieldLabels(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const out: string[] = [];
  for (const item of raw) {
    const s = typeof item === "string" ? item.trim() : "";
    if (!s) continue;
    out.push(s.slice(0, HEADMATE_TEMPLATE_LABEL_MAX));
    if (out.length >= CUSTOM_FIELDS_MAX_ROWS) break;
  }
  return out;
}
