/**
 * Legacy signup stored the full label `"{accountName}'s System"` in `systems.name`.
 * We now store only the **base** (e.g. account first name) and format the title as
 * `{base}'s System` in the UI.
 */
const LEGACY_SYSTEM_NAME_SUFFIX = "'s System";

/** Normalize DB value to the editable/display base. */
export function getSystemNameBase(stored: string): string {
  const s = stored.trim();
  if (s.endsWith(LEGACY_SYSTEM_NAME_SUFFIX)) {
    const base = s.slice(0, -LEGACY_SYSTEM_NAME_SUFFIX.length).trimEnd();
    return base || s;
  }
  return s;
}

/** Dashboard / hero line: `{base}'s System` */
export function formatSystemTitle(base: string): string {
  const b = base.trim();
  if (!b) return "Your system";
  return `${b}'s System`;
}
