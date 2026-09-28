import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  buildActivities,
  buildRoutines,
  buildReplaySummary,
} from "../_shared/funnel.ts";

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

    // The redemption RPC enforces auth.uid() = p_user_id. auth.uid() is read
    // from the request JWT claims, which are only set when PostgREST sees the
    // CALLER's token — a service_role call would yield NULL and always be
    // rejected. So run the RPC as the user.
    const userClient = createClient(supabaseUrl, jwt, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { apikey: anonKey || jwt } },
    });

    // 2) Validate input token.
    let body: { token?: unknown };
    try {
      body = await req.json();
    } catch {
      return json({ success: false, error: "invalid_request" }, 400);
    }
    const token = typeof body?.token === "string" ? body.token.trim() : "";
    if (!token || token.length > 512) {
      return json({ success: false, error: "invalid_token" }, 400);
    }

    // 3) Look up the plan by its SHA-256 hash (never by raw token).
    const claimTokenHash = await sha256Hex(token);
    const { data: row, error: selectError } = await admin
      .from("web_funnel_plans")
      .select("id, status, plan, claimed_by_user_id, purchase_confirmed_at, expires_at, claimed_at")
      .eq("claim_token_hash", claimTokenHash)
      .maybeSingle();

    if (selectError || !row) {
      return json({ success: false, error: "invalid_token" }, 404);
    }

    // Idempotent replay for the same owner.
    if (row.status === "claimed") {
      if (row.claimed_by_user_id !== user.id) {
        return json({ success: false, error: "already_claimed" }, 409);
      }

      const marker = (row.plan ?? {}).__materialized ?? null;
      const summary = await buildReplaySummary(admin, user.id, marker);
      return json(
        {
          success: true,
          alreadyClaimed: true,
          planId: row.id,
          claimedAt: row.claimed_at ?? null,
          ...summary,
        },
        200,
      );
    }

    if (
      row.status === "expired" ||
      (!row.purchase_confirmed_at && row.expires_at && new Date(row.expires_at).getTime() < Date.now())
    ) {
      return json({ success: false, error: "token_expired" }, 410);
    }

    // 'claiming' -> only the SAME owner may resume; never stolen (NULL owner
    // is a legacy exception and is rejected too).
    if (row.status === "claiming") {
      if (row.claimed_by_user_id !== user.id) {
        return json({ success: false, error: "already_claimed" }, 409);
      }
    } else if (row.status !== "pending") {
      return json({ success: false, error: "plan_not_ready" }, 409);
    } else if (row.claimed_by_user_id !== null) {
      return json({ success: false, error: "already_claimed" }, 409);
    }

    // 4) Transform the funnel plan into normalized payloads.
    const plan = (row.plan ?? {}) as Record<string, any>;
    const activities = buildActivities(plan, row.id);
    const routines = buildRoutines(plan);

    // 5) Redeem atomically through the idempotent RPC. Run as the caller so
    // the RPC's auth.uid() guard accepts the redemption.
    const { data: result, error: rpcError } = await userClient.rpc(
      "claim_funnel_plan",
      {
        p_claim_token_hash: claimTokenHash,
        p_user_id: user.id,
        p_activities: activities,
        p_routines: routines,
      },
    );

    if (rpcError) {
      console.error("claim_funnel_plan RPC error:", rpcError);
      return json({ success: false, error: rpcError.message ?? "unknown" }, 500);
    }

    const parsed =
      typeof result === "string"
        ? JSON.parse(result)
        : (result as Record<string, any>);

    if (!parsed?.success) {
      const status =
        parsed?.error === "already_claimed"
          ? 409
          : parsed?.error === "forbidden"
            ? 403
            : parsed?.error === "token_expired"
              ? 410
              : parsed?.error === "plan_not_ready"
                ? 409
: parsed?.error === "claim_not_owned"
                ? 409
                : parsed?.error === "egg_unavailable"
                  ? 409
                  : 500;
      return json(parsed, status);
    }

    return json(parsed, 200);
  } catch (error) {
    console.error("claim-funnel-plan error:", error);
    return json({ success: false, error: "unknown" }, 500);
  }
});