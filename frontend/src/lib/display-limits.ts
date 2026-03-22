/**
 * Max description length accepted by the API and the headmate editor (full profile text).
 */
export const DESCRIPTION_MAX_CHARS = 10_000;

/** Max length for a single journal entry body. */
export const JOURNAL_CONTENT_MAX_CHARS = 20_000;

/** Journal entry title length (stored and searched). */
export const JOURNAL_TITLE_MAX_CHARS = 200;

/** How many characters of journal body show on the card before “Show more”. */
export const JOURNAL_CARD_PREVIEW_CHARS = 280;

/**
 * How many characters of description show on a headmate card before “Show more”
 * (same idea as {@link CUSTOM_FIELD_VALUE_PREVIEW_CHARS} for custom fields).
 */
export const DESCRIPTION_CARD_PREVIEW_CHARS = 240;

/**
 * Tighter description preview on compact grid cards (4 columns).
 */
export const DESCRIPTION_CARD_PREVIEW_CHARS_COMPACT = 100;

/** Preview length for custom field values on headmate cards before “Show more”. */
export const CUSTOM_FIELD_VALUE_PREVIEW_CHARS = 50;

/** Shorter value preview on compact grid cards. */
export const CUSTOM_FIELD_VALUE_PREVIEW_CHARS_COMPACT = 28;
