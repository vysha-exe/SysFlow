/**
 * Case-insensitive ascending sort by display name (Latin scripts; ignores casing).
 */
export function compareHeadmateNameAsc(
  a: { name: string },
  b: { name: string },
): number {
  return String(a.name).localeCompare(String(b.name), undefined, {
    sensitivity: "base",
  });
}
