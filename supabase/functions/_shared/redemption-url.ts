// Canonical RevenueCat Redemption Link format (observed on the REAL web
// checkout):
//
//   rc-f91d4f2118://redeem_web_purchase?redemption_token=<token>
//
// The funnel web persists `redemptionInfo.redeemUrl` (this format) —
// `redeemUrlRedirect` is NOT used as a substitute. The mobile SDK parses this
// URL directly with Purchases.parseAsWebPurchaseRedemption(). Storing anything
// else would break the app redeem step.
//
// Pure helper (NO Deno / Supabase imports) so it can be unit-tested with jest.
// Validates with a URL parser, not a permissive regex.

export const RC_SCHEME = "rc-f91d4f2118";
export const RC_HOST = "redeem_web_purchase";
export const MAX_REDEMPTION_URL_BYTES = 1024;

/**
 * True ONLY for a canonical RevenueCat Redemption Link:
 *   * protocol exactly `rc-f91d4f2118:`
 *   * host exactly `redeem_web_purchase`
 *   * empty path (or a single trailing slash)
 *   * no username / password / port / hash
 *   * a non-empty `redemption_token` query param
 *   * serialized length <= 1 KB
 *
 * Anything else (https links, arbitrary `rc-<other>` schemes, missing or
 * empty token) is REJECTED.
 */
export function isCanonicalRedemptionUrl(raw: string): boolean {
  if (typeof raw !== "string") return false;
  const value = raw.trim();
  if (!value) return false;

  if (new TextEncoder().encode(value).length > MAX_REDEMPTION_URL_BYTES) {
    return false;
  }

  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    return false;
  }

  // URL spec lowercases the scheme.
  if (parsed.protocol !== `${RC_SCHEME}:`) return false;
  if (parsed.hostname !== RC_HOST) return false;

  const pathname = parsed.pathname;
  if (pathname !== "" && pathname !== "/") return false;

  if (parsed.username !== "" || parsed.password !== "") return false;
  if (parsed.port !== "") return false;
  if (parsed.hash !== "") return false;

  const token = parsed.searchParams.get("redemption_token");
  if (typeof token !== "string" || token.trim().length === 0) return false;

  return true;
}