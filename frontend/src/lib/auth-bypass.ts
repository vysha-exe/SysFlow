/**
 * When true, the app uses a local dev user/system and does not require NextAuth sign-in.
 * Set in `.env.local` (restart dev server after changing):
 * - AUTH_ENABLED=false
 *   or
 * - DEV_BYPASS_AUTH=true
 *
 * Do not enable in production.
 */
function isEnvOff(value: string | undefined): boolean {
  if (value == null || value === "") return false;
  const v = value.trim().toLowerCase();
  return v === "false" || v === "0" || v === "no" || v === "off";
}

function isEnvOn(value: string | undefined): boolean {
  if (value == null || value === "") return false;
  const v = value.trim().toLowerCase();
  return v === "true" || v === "1" || v === "yes" || v === "on";
}

export function isAuthBypassEnabled(): boolean {
  if (isEnvOn(process.env.DEV_BYPASS_AUTH)) return true;
  if (isEnvOff(process.env.AUTH_ENABLED)) return true;
  return false;
}
