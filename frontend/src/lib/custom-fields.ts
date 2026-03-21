/**
 * Custom fields are stored as an ordered list of { key, value }.
 * Legacy Mongo documents may still use a plain object; we normalize on read.
 */

export type CustomFieldEntry = { key: string; value: string };

/** Max rows persisted (prevents abuse / huge payloads). */
export const CUSTOM_FIELDS_MAX_ROWS = 60;

/** How many filled-in fields show on a headmate card before “show more”. */
export const CUSTOM_FIELDS_CARD_VISIBLE_CAP = 6;

/** Fields shown on the card: both label and value must be non-empty after trim. */
export function visibleCustomFields(entries: CustomFieldEntry[]): CustomFieldEntry[] {
  return entries.filter((e) => e.key.trim() && e.value.trim());
}

/** Read from DB (array or legacy { [key]: value } object). */
export function parseStoredCustomFields(raw: unknown): CustomFieldEntry[] {
  if (Array.isArray(raw)) {
    const out: CustomFieldEntry[] = [];
    for (const item of raw) {
      if (!item || typeof item !== "object" || Array.isArray(item)) continue;
      const o = item as Record<string, unknown>;
      const key = typeof o.key === "string" ? o.key : "";
      const value = typeof o.value === "string" ? o.value : "";
      out.push({ key, value });
    }
    return out;
  }
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    return Object.entries(raw as Record<string, unknown>).map(([k, v]) => ({
      key: String(k),
      value: v == null ? "" : String(v),
    }));
  }
  return [];
}

/** Normalize request body (array or legacy object) for saving. */
export function normalizeCustomFieldsForStorage(raw: unknown): CustomFieldEntry[] {
  const parsed = parseStoredCustomFields(raw);
  return parsed.slice(0, CUSTOM_FIELDS_MAX_ROWS);
}
