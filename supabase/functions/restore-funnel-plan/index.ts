import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { selectIdentifiedPlan, isRecoverable } from "../_shared/funnel-recovery-policy.ts";

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

// ─── Handler ──────────────────────────────────────────────────────────────────
// POST → {} (no request body)
//
// DISCOVERY / RESTORE lookup for the NEW email+OTP flow. NEVER materializes —
// this is a pure finder. Identity comes EXCLUSIVELY from the session JWT
// (auth.uid() + verified email from Supabase Auth claims); no email / token /
// redemption URL is ever sent by the client.
//
// Selection policy (deterministic, ONE plan only):
//   1. funnel_user_id = auth.uid() (identified happy path)
//      email normalized match is legacy fallback only
//   2. status IN ('pending','claiming','claimed') and not expired
//   3. top-1 by created_at DESC
//   4. Identified plans do not require a redemption URL. Legacy email matches
//      still require the persisted URL for pending/claiming recovery.
//   5. Privacy: a plan claimed/claiming by ANOTHER user is NEVER disclosed —
//      the lookup simply reports "not found".
//
// Returns (HTTP 200):
//   { found: false }                              → nothing eligible
//   { found: true, planId, status, claimedByUser, alreadyRestored,
//     hasRedemption, redemption?: { url } }
// Errors (>=400 { success:false, error }): unauthorized / unknown
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // 1) Require a valid user JWT.
    const authHeader = req.headers.get("Authorization") ?? "";
    const jwt = authHeader.startsWith("Bearer ")
      ? authHeader.slice(7).trim()
      : null;
    if (!jwt) {
      return json({ success: false, error: "unauthorized" }, 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const {
      data: { user },
    } = await admin.auth.getUser(jwt);
    if (!user?.id) {
      return json({ success: false, error: "unauthorized" }, 401);
    }

    // 2) Identified lookup is canonical. Email remains a legacy fallback only.
    const identifiedResult = await admin
      .from("web_funnel_plans")
      .select("id, status, claimed_by_user_id, funnel_user_id, purchase_confirmed_at, expires_at, created_at, revenuecat_redemption_url")
      .eq("funnel_user_id", user.id)
      .in("status", ["pending", "claiming", "claimed"])
      .order("created_at", { ascending: false })
      .limit(50);
    if (identifiedResult.error) {
      console.error("restore-funnel-plan identified lookup failed");
      return json({ success: false, error: "unknown" }, 500);
    }
    const identified = selectIdentifiedPlan(identifiedResult.data ?? [], user.id, new Date());
    if (identified) {
      const hasUrl = typeof identified.revenuecat_redemption_url === "string" && identified.revenuecat_redemption_url.trim().length > 0;
      const claimedByUser = identified.claimed_by_user_id === user.id;
      if (identified.claimed_by_user_id && !claimedByUser) return json({ found: false });
      return json({
        found: true,
        planId: identified.id,
        status: identified.status,
        claimedByUser,
        alreadyRestored: identified.status === "claimed" && claimedByUser,
        hasRedemption: hasUrl,
        ...(hasUrl ? { redemption: { url: identified.revenuecat_redemption_url.trim() } } : {}),
      });
    }

    // 3) Legacy fallback: verified email + redemption URL.
    const email = (user.email ?? "").trim().toLowerCase();
    if (!email) {
      return json({ found: false });
    }

    // 3) Server-side candidate lookup (service role). Never exposed via RLS.
    const { data: rows, error: selectError } = await admin
      .from("web_funnel_plans")
      .select(
        "id, status, claimed_by_user_id, funnel_user_id, purchase_confirmed_at, expires_at, created_at, revenuecat_redemption_url",
      )
      .eq("email", email)
      .is("funnel_user_id", null)
      .in("status", ["pending", "claiming", "claimed"])
      .order("created_at", { ascending: false })
      .limit(50);

    if (selectError) {
      console.error("restore-funnel-plan select error:", selectError);
      return json({ success: false, error: "unknown" }, 500);
    }

    const candidates = (rows ?? []).filter((r: any) => {
      return isRecoverable(r, new Date());
    });

    const top = candidates[0];
    if (!top) {
      return json({ found: false });
    }

    const hasUrl =
      typeof top.revenuecat_redemption_url === "string" &&
      top.revenuecat_redemption_url.trim().length > 0;

    // 4) Privacy: never disclose a plan owned by another identity.
    const ownerId = top.claimed_by_user_id as string | null;
    const claimedByUser = !!ownerId && ownerId === user.id;
    if (!!ownerId && !claimedByUser) {
      return json({ found: false });
    }

    // 5) Commercial gate for non-finalized plans: require a persisted
    //    redemption URL. Claimed-by-owner plans (replay/recovery) skip the
    //    gate so restoring a finalized plan never depends on stale URLs.
    if (top.status !== "claimed" && !hasUrl) {
      return json({ found: false });
    }

    return json({
      found: true,
      planId: top.id,
      status: top.status,
      claimedByUser,
      alreadyRestored: top.status === "claimed" && claimedByUser,
      hasRedemption: hasUrl,
      ...(hasUrl
        ? { redemption: { url: top.revenuecat_redemption_url.trim() } }
        : {}),
    });
  } catch (error) {
    console.error("restore-funnel-plan error:", error);
    return json({ success: false, error: "unknown" }, 500);
  }
});