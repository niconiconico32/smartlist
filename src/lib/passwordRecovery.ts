/**
 * Password Recovery URL Parser
 *
 * Parses Supabase password recovery callback URLs.
 *
 * Supabase default flow (implicit):
 * 1. User requests reset → resetPasswordForEmail(email, { redirectTo: "https://<web-domain>/reset-password" })
 * 2. Supabase sends email with: https://<project>.supabase.co/auth/v1/verify?token={{ .TokenHash }}&type=recovery&redirect_to=https://<web-domain>/reset-password
 * 3. User opens link in browser → Supabase verifies token → redirects to https://<web-domain>/reset-password#access_token=...&refresh_token=...
 * 4. Web repo handles fragment and redirects to app: brainy://reset-password?access_token=...&refresh_token=...
 * 5. App receives callback with tokens in query params
 *
 * This parser handles the callback that arrives at the app (step 5):
 * - brainy://reset-password?access_token=...&refresh_token=...
 * - brainy://reset-password#access_token=...&refresh_token=... (fragment)
 */

export interface ParsedRecoveryCallback {
  accessToken: string;
  refreshToken: string;
  type: "recovery_callback";
}

/**
 * Parses a password recovery callback URL and extracts access_token and refresh_token.
 * Returns null if the URL is not a valid recovery callback.
 */
export function parsePasswordRecoveryCallback(url: string): ParsedRecoveryCallback | null {
  if (!url || typeof url !== "string") return null;

  const isRecoveryCallback =
    url.includes("access_token") ||
    url.includes("refresh_token") ||
    (url.includes("reset-password") && url.includes("#"));

  if (!isRecoveryCallback) return null;

  const accessTokenMatch = url.match(/[?&#]access_token=([^&]+)/);
  const refreshTokenMatch = url.match(/[?&#]refresh_token=([^&]+)/);

  const accessToken = accessTokenMatch
    ? decodeURIComponent(accessTokenMatch[1]).trim()
    : "";
  const refreshToken = refreshTokenMatch
    ? decodeURIComponent(refreshTokenMatch[1]).trim()
    : "";

  if (!accessToken || !refreshToken) return null;

  return {
    accessToken,
    refreshToken,
    type: "recovery_callback",
  };
}

/**
 * Checks if a URL is a password recovery callback.
 */
export function isPasswordRecoveryCallback(url: string): boolean {
  return parsePasswordRecoveryCallback(url) !== null;
}
