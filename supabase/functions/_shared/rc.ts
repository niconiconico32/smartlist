// RevenueCat server-side verification helper (SECRET API KEY only).
//
// Used by finalize-funnel-plan to verify the REAL "brainy Pro" entitlement
// BEFORE materializing a claim. The secret key lives EXCLUSIVELY as a Supabase
// Edge Function secret — never in the RN app, never in the funnel web.
//
// The REST /v1/subscribers/{app_user_id} response does NOT carry the SDK's
// `is_active` flag on entitlements (that's a CustomerInfo model). We derive
// "active" from expires_date / purchase_date, honoring an explicit is_active
// field if a future endpoint emits one.

export const RC_ENTITLEMENT = "brainy Pro";

const RC_API_BASE = "https://api.revenuecat.com/v1";

export interface RcEntitlement {
  purchase_date?: string | null;
  expires_date?: string | null;
  product_identifier?: string;
  is_active?: boolean;
  [key: string]: unknown;
}

export interface RcSubscriberBody {
  subscriber?: {
    entitlements?: Record<string, RcEntitlement>;
  };
}

/** True when the entitlement record represents an ACTIVE grant right now. */
export function entitlementIsActive(ent: RcEntitlement | undefined): boolean {
  if (!ent || !ent.purchase_date) return false;

  // Honor an explicit active flag if the API ever exposes one.
  if (typeof ent.is_active === "boolean") return ent.is_active;

  // Lifetime / non-expiring grant (expires_date null) is always active.
  if (!ent.expires_date) return true;

  const expires = Date.parse(ent.expires_date);
  if (Number.isNaN(expires)) return false;
  return expires > Date.now();
}

export type RcCheckResult =
  | { ok: true; active: true }
  | { ok: true; active: false }
  | { ok: false; active: false; status?: number };

/**
 * Verifies that `appUserId` currently holds the ACTIVE "brainy Pro"
 * entitlement, server-side with the SECRET key. Never logs the response body.
 */
export async function checkEntitlementActive(
  appUserId: string,
  secretKey: string,
): Promise<RcCheckResult> {
  if (!appUserId || !secretKey) return { ok: false, active: false };

  const url = `${RC_API_BASE}/subscribers/${encodeURIComponent(appUserId)}`;
  try {
    const res = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${secretKey}`,
        Accept: "application/json",
      },
    });

    if (!res.ok) {
      // e.g. 404 (unknown app user id), 401 (bad secret). Never log the body.
      console.error(`RevenueCat check failed: HTTP ${res.status}`);
      return { ok: false, active: false, status: res.status };
    }

    const body = (await res.json()) as RcSubscriberBody;
    const ent = body?.subscriber?.entitlements?.[RC_ENTITLEMENT];
    const active = entitlementIsActive(ent);
    return { ok: true, active };
  } catch (error) {
    console.error("RevenueCat check error:", error);
    return { ok: false, active: false };
  }
}