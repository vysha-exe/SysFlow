/** Matches auto-generated usernames in {@link ensureUserSystem}; keep in sync with accounts. */
export const SYSTEM_USERNAME_MIN_LEN = 3;
export const SYSTEM_USERNAME_MAX_LEN = 40;

export const SYSTEM_DISPLAY_NAME_MIN_LEN = 1;
export const SYSTEM_DISPLAY_NAME_MAX_LEN = 200;

const USERNAME_PATTERN = /^[a-z0-9_]+$/;

/**
 * Lowercase + trim only; does not strip invalid characters (validation uses {@link validateSystemUsername}).
 */
export function normalizeSystemUsername(raw: string): string {
  return raw.trim().toLowerCase();
}

export function validateSystemUsername(normalized: string): string | null {
  if (normalized.length < SYSTEM_USERNAME_MIN_LEN) {
    return `Username must be at least ${SYSTEM_USERNAME_MIN_LEN} characters.`;
  }
  if (normalized.length > SYSTEM_USERNAME_MAX_LEN) {
    return `Username must be at most ${SYSTEM_USERNAME_MAX_LEN} characters.`;
  }
  if (!USERNAME_PATTERN.test(normalized)) {
    return "Username can only use lowercase letters, numbers, and underscores.";
  }
  return null;
}
