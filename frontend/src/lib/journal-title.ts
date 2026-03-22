import { JOURNAL_TITLE_MAX_CHARS } from "@/lib/display-limits";

export const JOURNAL_TITLE_MIN_CHARS = 1;

export function parseJournalTitle(raw: unknown):
  | { ok: true; title: string }
  | { ok: false; error: string } {
  if (typeof raw !== "string") {
    return { ok: false, error: "Title is required." };
  }
  const title = raw.trim();
  if (title.length < JOURNAL_TITLE_MIN_CHARS) {
    return { ok: false, error: "Title is required." };
  }
  if (title.length > JOURNAL_TITLE_MAX_CHARS) {
    return {
      ok: false,
      error: `Title must be at most ${JOURNAL_TITLE_MAX_CHARS} characters.`,
    };
  }
  return { ok: true, title };
}
