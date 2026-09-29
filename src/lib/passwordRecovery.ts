/**
 * Password Recovery URL Parser
 *
 * Parses Supabase password recovery URLs to extract the token_hash and email.
 *
 * Supabase default flow (implicit / token_hash):
 * - Email template generates: https://<project>.supabase.co/auth/v1/verify?token_hash=<hash>&type=recovery&redirect_to=<url>
 * - When detectSessionInUrl: false, the app must manually extract and verify the token_hash
 *
 * This parser handles:
 * - brainy://reset-password?token_hash=<hash>&type=recovery
 * - https://<project>.supabase.co/auth/v1/verify?token_hash=<hash>&type=recovery&redirect_to=...
 * - URLs with email parameter for pre-filling
 */

export interface ParsedRecoveryUrl {
  tokenHash: string;
  email?: string;
  type: "recovery";
}

/**
 * Parses a password recovery URL and extracts the token_hash and email.
 * Returns null if the URL is not a valid recovery URL.
 */
export function parsePasswordRecoveryUrl(url: string): ParsedRecoveryUrl | null {
  if (!url || typeof url !== "string") return null;

  const isRecoveryUrl =
    url.includes("token_hash") ||
    url.includes("type=recovery") ||
    url.includes("/auth/v1/verify") ||
    url.includes("reset-password");

  if (!isRecoveryUrl) return null;

  const tokenHashMatch = url.match(/[?&]token_hash=([^&]+)/);
  const emailMatch = url.match(/[?&]email=([^&]+)/);

  const tokenHash = tokenHashMatch
    ? decodeURIComponent(tokenHashMatch[1]).trim()
    : "";
  const email = emailMatch
    ? decodeURIComponent(emailMatch[1]).trim()
    : undefined;

  if (!tokenHash) return null;

  return {
    tokenHash,
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
