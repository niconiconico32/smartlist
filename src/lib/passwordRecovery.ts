/**
 * Password Recovery URL Parser
 *
 * Parses Supabase password recovery URLs to extract the token and email.
 *
 * Supabase default email template uses {{ .ConfirmationURL }} which generates:
 *   https://<project>.supabase.co/auth/v1/verify?token=<token>&type=recovery&redirect_to=<url>
 *
 * The token parameter is used with supabase.auth.verifyOtp({ token, type: "recovery" })
 * when detectSessionInUrl: false.
 *
 * This parser handles:
 * - https://<project>.supabase.co/auth/v1/verify?token=<token>&type=recovery
 * - brainy://reset-password?token=<token>&type=recovery
 * - URLs with email parameter for pre-filling
 */

export interface ParsedRecoveryUrl {
  token: string;
  email?: string;
  type: "recovery";
}

/**
 * Parses a password recovery URL and extracts the token and email.
 * Returns null if the URL is not a valid recovery URL.
 */
export function parsePasswordRecoveryUrl(url: string): ParsedRecoveryUrl | null {
  if (!url || typeof url !== "string") return null;

  const isRecoveryUrl =
    url.includes("type=recovery") ||
    url.includes("/auth/v1/verify") ||
    url.includes("reset-password");

  if (!isRecoveryUrl) return null;

  const tokenMatch = url.match(/[?&]token=([^&]+)/);
  const emailMatch = url.match(/[?&]email=([^&]+)/);

  const token = tokenMatch
    ? decodeURIComponent(tokenMatch[1]).trim()
    : "";
  const email = emailMatch
    ? decodeURIComponent(emailMatch[1]).trim()
    : undefined;

  if (!token) return null;

  return {
    token,
    email: email || undefined,
    type: "recovery",
  };
}

/**
 * Checks if a URL is a password recovery URL.
 */
export function isPasswordRecoveryUrl(url: string): boolean {
  return parsePasswordRecoveryUrl(url) !== null;
}
