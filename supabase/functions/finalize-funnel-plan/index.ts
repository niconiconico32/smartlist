import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  buildActivities,
  buildRoutines,
  buildReplaySummary,
} from "../_shared/funnel.ts";
import { checkEntitlementActive } from "../_shared/rc.ts";

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
// POST { planId }   (REQUIRED: authenticated Supabase session)
//
// The LAST step of the NEW email+OTP happy path. The app has already redeemed
// the RevenueCat Redemption Link (or detected an already-active entitlement on
// reopen/recovery). Here we:
//   1. auth.uid() + verified email from the session JWT (identity, not params).
//   2. Load the plan by id; identified rows require funnel_user_id = auth.uid().
//      Email matching remains only for legacy rows.
//   3. Handle states/idempotency:
//        claimed + owner=user  -> replay summary success (never duplicates)
//        claimed + owner!=user -> forbidden
//        expired / past due    -> token_expired (only if never purchased)
//        claiming + owner=user -> allowed to resume idempotently
//        claiming  NULL/other  -> forbidden (interrupted claim never stolen)
//   4. RevenueCat SERVER-side entitlement check (SECRET key, never RN/web):
//        active "brainy Pro" for app_user_id = user.id is REQUIRED to
//        materialize. NOT active -> entitlement_inactive (no claim).
//   5. ONLY then: claim_funnel_plan (run AS the caller so its auth.uid()
//      guard holds) -> materializes tasks/routines/steps/eggs atomically.
//   6. Best-effort consume_funnel_redemption after success (owner-only).
//   7. Return real materialized counts.
//
// Never trusts a client-provided claimToken / email / redemption token.
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
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const {
      data: { user },
    } = await admin.auth.getUser(jwt);
    if (!user?.id) {
      return json({ success: false, error: "unauthorized" }, 401);
    }
    const userEmail = (user.email ?? "").trim().toLowerCase();

    // 2) Validate input: planId ONLY. No claimToken / email / redemption token.
    let body: { planId?: unknown };
    try {
      body = await req.json();
    } catch {
      return json({ success: false, error: "invalid_request" }, 400);
    }
    const planId = typeof body.planId === "string" ? body.planId.trim() : "";
    if (!planId || planId.length > 64) {
      return json({ success: false, error: "invalid_request" }, 400);
    }

    // 3) Load the plan (service role — no public SELECT exists).
    const { data: row, error: selectError } = await admin
      .from("web_funnel_plans")
      .select(
        "id, status, plan, email, funnel_user_id, purchase_confirmed_at, expires_at, claimed_at, claim_token_hash, revenuecat_redemption_url, claimed_by_user_id, created_at",
      )
      .eq("id", planId)
      .maybeSingle();

    if (selectError || !row) {
      return json({ success: false, error: "not_found" }, 404);
    }

    // Identified ownership is canonical. Email is retained only for legacy rows.
    if (row.funnel_user_id) {
      if (row.funnel_user_id !== user.id) return json({ success: false, error: "forbidden" }, 403);
    } else {
      const planEmail = (row.email ?? "").trim().toLowerCase();
      if (!planEmail || planEmail !== userEmail) return json({ success: false, error: "forbidden" }, 403);
    }

    const now = Date.now();

    // 4) Idempotent replay for the same owner.
    if (row.status === "claimed") {
      if (row.claimed_by_user_id !== user.id) {
        return json({ success: false, error: "forbidden" }, 403);
      }
      const marker = (row.plan ?? {}).__materialized ?? null;
      const summary = await buildReplaySummary(admin, user.id, marker);
      return json({
        success: true,
        alreadyFinalized: true,
        planId: row.id,
        claimedAt: row.claimed_at ?? null,
        taskCount: summary.taskCount,
        routineCount: summary.routineCount,
        eggCount: summary.eggCount,
        routines: summary.routines,
      });
    }

    // 5) Expired plans are terminal.
    if (
      row.status === "expired" ||
      (!row.purchase_confirmed_at && row.expires_at && Date.parse(row.expires_at) < now)
    ) {
      return json({ success: false, error: "token_expired" }, 410);
    }

    // 'claiming' -> only the SAME owner may resume; a NULL owner is legacy and
    // is never a normal claimable state.
    if (row.status === "claiming") {
      if (
        row.claimed_by_user_id === null ||
        row.claimed_by_user_id !== user.id
      ) {
        return json({ success: false, error: "claim_not_owned" }, 409);
      }
    } else if (row.status !== "pending") {
      return json({ success: false, error: "plan_not_ready" }, 409);
    } else if (row.claimed_by_user_id !== null) {
      // pending but someone already owns it (inconsistent row) -> safe error.
      return json({ success: false, error: "claim_not_owned" }, 409);
    }

    // 6) SERVER-SIDE RevenueCat entitlement check (SECRET API KEY). This is the
    //    authoritative gate: a pending URL is never proof of entitlement.
    const rcSecret = Deno.env.get("REVENUECAT_SECRET_API_KEY") ?? "";
    const rc = await checkEntitlementActive(user.id, rcSecret);
    if (!rc.ok) {
      if (rc.status === 404) {
        // No subscriber on record for this App User ID → definitively NOT
        // entitled. Do NOT claim; keep the plan for recovery.
        return json(
          { success: false, error: "entitlement_inactive", active: false },
          409,
        );
      }
      // RevenueCat unreachable / auth / 5xx → retryable, do NOT materialize.
      return json(
        { success: false, error: "verification_unavailable", active: false },
        503,
      );
    }
    if (!rc.active) {
      // Not entitled => do NOT claim. The app keeps the plan for recovery
      // (RevenueCat auto-emails a fresh redemption link).
      return json(
        { success: false, error: "entitlement_inactive", active: false },
        409,
      );
    }

    // 7) Materialize through the atomic, idempotent RPC — as the CALLER so
    //    auth.uid() == p_user_id for the horizontal-escalation guard.
    const userClient = createClient(supabaseUrl, jwt, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { apikey: anonKey || jwt } },
    });

    const plan = (row.plan ?? {}) as Record<string, any>;
    const activities = buildActivities(plan, row.id);
    const routines = buildRoutines(plan);

    const { data: result, error: rpcError } = await userClient.rpc(
      "claim_funnel_plan",
      {
        p_claim_token_hash: row.claim_token_hash,
        p_user_id: user.id,
        p_activities: activities,
        p_routines: routines,
      },
    );

    if (rpcError) {
      console.error("finalize-funnel-plan claim RPC error:", rpcError);
      return json({ success: false, error: "unknown" }, 500);
    }

    const parsed =
      typeof result === "string"
        ? JSON.parse(result)
        : (result as Record<string, any>);

    if (!parsed?.success) {
      if (parsed?.error === "already_claimed") {
        // A concurrent finalize won. Verify it was THIS user, then replay.
        const { data: fresh } = await admin
          .from("web_funnel_plans")
          .select("id, claimed_by_user_id, claimed_at, plan")
          .eq("id", row.id)
          .maybeSingle();
        if (!fresh || fresh.claimed_by_user_id !== user.id) {
          return json({ success: false, error: "forbidden" }, 403);
        }
        const summary = await buildReplaySummary(
          admin,
          user.id,
          (fresh.plan ?? {}).__materialized ?? null,
        );
        return json({
          success: true,
          alreadyFinalized: true,
          planId: fresh.id,
          claimedAt: fresh.claimed_at ?? null,
          taskCount: summary.taskCount,
          routineCount: summary.routineCount,
          eggCount: summary.eggCount,
          routines: summary.routines,
        });
      }

      const status =
        parsed?.error === "forbidden"
          ? 403
          : parsed?.error === "token_expired"
            ? 410
            : parsed?.error === "plan_not_ready" ||
                parsed?.error === "claim_not_owned" ||
                parsed?.error === "egg_unavailable"
              ? 409
              : 500;
      return json(
        {
          success: false,
          alreadyFinalized: false,
          error: parsed?.error ?? "unknown",
        },
        status,
      );
    }

    // 8) Success: clear any pending redemption (owner-only RPC, best effort).
    //    A failure here never fails the finalize — RC already consumed the
    //    link at redeem time; the URL is just stale state to avoid re-sending.
    if (
      typeof row.revenuecat_redemption_url === "string" &&
      row.revenuecat_redemption_url.trim().length > 0
    ) {
      const { error: consumeError } = await userClient.rpc(
        "consume_funnel_redemption",
        { p_plan_id: row.id },
      );
      if (consumeError) {
        console.error("finalize consume_funnel_redemption error:", consumeError);
      }
    }

    return json({
      success: true,
      alreadyFinalized: false,
      planId: parsed.planId ?? row.id,
      claimedAt: parsed.claimedAt ?? null,
      taskCount: parsed.taskCount ?? 0,
      routineCount: parsed.routineCount ?? 0,
      eggCount: parsed.eggCount ?? 0,
      routines: parsed.routines ?? [],
    });
  } catch (error) {
    console.error("finalize-funnel-plan error:", error);
    return json({ success: false, error: "unknown" }, 500);
  }
});