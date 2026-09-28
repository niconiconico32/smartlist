import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { isCanonicalRedemptionUrl } from "../_shared/redemption-url.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function json(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function sha256Hex(input: string): Promise<string> {
  return crypto.subtle
    .digest("SHA-256", new TextEncoder().encode(input))
    .then((buf) =>
      [...new Uint8Array(buf)]
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("")
    );
}

// ─── Handler ──────────────────────────────────────────────────────────────────
// POST { planId, claimToken, redemptionUrl }
//
// Called BY THE FUNNEL WEB right after a successful STRIPE purchase. Presence
// of the plan + the plaintext claim token (sha256 === claim_token_hash) proves
// the caller owns that funnel; no Supabase session is required.
//
// Writes the CANONICAL RevenueCat Redemption Link (rc-f91d4f2118://... — the
// `redeemUrl` RevenueCat returns, parsed by the mobile SDK via
// Purchases.parseAsWebPurchaseRedemption) into revenuecat_redemption_url so
// the app can discover + redeem it WITHOUT a deep link (email+OTP flow).
// `redeemUrlRedirect` is explicitly NOT stored as a substitute.
//
// Rules:
//   * service_role is used ONLY inside this Edge Function (never the web).
//   * SHA-256 is computed server-side; the raw token is never persisted/logged.
//   * No logging of tokens, URLs or emails. The response NEVER returns the URL.
//   * Format is validated STRICTLY with a URL parser (isCanonicalRedemptionUrl):
//     protocol rc-f91d4f2118:, host redeem_web_purchase, redemption_token
//     present, <= 1 KB. https:// or arbitrary rc-<other>:// are rejected.
//   * Idempotent: NULL -> save; same URL -> ok; different existing URL -> 409.
//   * Never used as proof of entitlement (finalize checks RevenueCat itself).
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // 1) Validate input. planId as string (accept UUID). claimToken never
    //    persisted. redemptionUrl must be an https redemption link.
    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return json({ success: false, error: "invalid_request" }, 400);
    }

    const planId = typeof body.planId === "string" ? body.planId.trim() : "";
    const claimToken =
      typeof body.claimToken === "string" ? body.claimToken.trim() : "";
    const redemptionUrl =
      typeof body.redemptionUrl === "string" ? body.redemptionUrl.trim() : "";

    if (!planId || !claimToken || !redemptionUrl) {
      return json({ success: false, error: "invalid_request" }, 400);
    }
    if (planId.length > 64 || claimToken.length > 512) {
      return json({ success: false, error: "invalid_request" }, 400);
    }
    if (!isCanonicalRedemptionUrl(redemptionUrl)) {
      return json({ success: false, error: "invalid_redemption_url" }, 400);
    }

    // 2) Lock the row and authenticate via the claim token hash.
    const claimTokenHash = await sha256Hex(claimToken);
    const { data: row, error: selectError } = await admin
      .from("web_funnel_plans")
      .select(
        "id, status, claim_token_hash, purchase_confirmed_at, expires_at, claimed_by_user_id",
      )
      .eq("id", planId)
      .maybeSingle();

    if (selectError || !row) {
      return json({ success: false, error: "not_found" }, 404);
    }
    if (row.claim_token_hash !== claimTokenHash) {
      return json({ success: false, error: "forbidden" }, 403);
    }

    // 3) Terminal / finalized states reject late writes.
    if (
      row.status === "expired" ||
      (!row.purchase_confirmed_at && row.expires_at && Date.parse(row.expires_at) < Date.now())
    ) {
      return json({ success: false, error: "token_expired" }, 410);
    }
    if (row.status === "claimed") {
      return json({ success: false, error: "already_finalized" }, 409);
    }

    // 4) Idempotent, ATMOIC write: only persist when still NULL so a
    //    concurrent set can never silently replace a different URL.
    const { data: affected, error: updateError } = await admin
      .from("web_funnel_plans")
      .update({ revenuecat_redemption_url: redemptionUrl })
      .eq("id", planId)
      .is("revenuecat_redemption_url", null)
      .select("id");

    if (updateError) {
      console.error("set-funnel-redemption update error:", updateError);
      return json({ success: false, error: "unknown" }, 500);
    }

    if (affected && affected.length > 0) {
      return json({ success: true, status: "set" });
    }

    // A URL already exists (or a concurrent set won the race) — classify.
    const { data: current } = await admin
      .from("web_funnel_plans")
      .select("revenuecat_redemption_url")
      .eq("id", planId)
      .maybeSingle();

    const existing = current?.revenuecat_redemption_url as string | null;

    if (existing === redemptionUrl) {
      return json({ success: true, status: "unchanged" });
    }

    // Controlled conflict: a DIFFERENT URL is already persisted. The web must
    // not silently replace it.
    return json(
      { success: false, error: "redemption_conflict", status: "conflict" },
      409,
    );
  } catch (error) {
    console.error("set-funnel-redemption error:", error);
    return json({ success: false, error: "unknown" }, 500);
  }
});