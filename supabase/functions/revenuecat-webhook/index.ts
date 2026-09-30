import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { handleRevenueCatWebhook } from "./handler.ts";

const headers = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, content-type", "Content-Type": "application/json" };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers });

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers });

  const configured = Deno.env.get("REVENUECAT_WEBHOOK_AUTH") ?? "";
  const received = req.headers.get("Authorization") ?? "";

  try {
    const payload = await req.json() as { event?: { id?: unknown; type?: unknown; app_user_id?: unknown; period_type?: unknown } };

    const admin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false, autoRefreshToken: false } }
    );

    const result = await handleRevenueCatWebhook(
      { authorization: received, configuredAuthorization: configured, event: payload?.event ?? {} },
      {
        now: () => new Date(),
        insertEvent: async (eventId, type, appUserId, executionId, leaseExpiresAt) => {
          return await admin.from("revenuecat_webhook_events")
            .insert({ event_id: eventId, event_type: type, app_user_id: appUserId, status: "processing", execution_id: executionId, lease_expires_at: leaseExpiresAt })
            .select("event_id")
            .maybeSingle();
        },
        findEvent: async (eventId) => {
          return await admin.from("revenuecat_webhook_events")
            .select("status, execution_id, lease_expires_at, plan_id")
            .eq("event_id", eventId)
            .maybeSingle();
        },
        claimEvent: async (eventId, executionId, leaseExpiresAt, options) => {
          let query = admin.from("revenuecat_webhook_events")
            .update({ status: "processing", execution_id: executionId, lease_expires_at: leaseExpiresAt, processed_at: null })
            .eq("event_id", eventId)
            .eq("status", options.fromStatus);
          if (options.expiredOnly) {
            query = query.lt("lease_expires_at", new Date().toISOString());
          }
          return await query.select("event_id").maybeSingle();
        },
        finishEvent: async (eventId, executionId, status) => {
          const { data, error } = await admin.from("revenuecat_webhook_events")
            .update({
              status,
              processed_at: status === "retryable" ? null : new Date().toISOString(),
              lease_expires_at: null,
            })
            .eq("event_id", eventId)
            .eq("execution_id", executionId)
            .select("event_id");
          return { updated: data?.length ?? 0, error };
        },
        bindEventPlan: async (eventId, executionId, planId) => {
          // Idempotent: pins the plan once, and never overrides an existing pin.
          const { data, error } = await admin.from("revenuecat_webhook_events")
            .update({ plan_id: planId })
            .eq("event_id", eventId)
            .eq("execution_id", executionId)
            .is("plan_id", null)
            .select("event_id");
          if (error) return { updated: data?.length ?? 0, error };
          if (data && data.length > 0) return { updated: 1, error: null };
          // Already pinned: verify it is the same plan, then treat as success.
          const { data: current } = await admin.from("revenuecat_webhook_events")
            .select("plan_id")
            .eq("event_id", eventId)
            .eq("execution_id", executionId)
            .maybeSingle();
          if (current?.plan_id && current.plan_id !== planId) {
            return { updated: 0, error: new Error("plan_already_bound") };
          }
          return { updated: current?.plan_id ? 1 : 0, error: null };
        },
        findPlans: async (appUserId) => {
          return await admin.from("web_funnel_plans")
            .select("id, funnel_user_id, status, claimed_by_user_id, purchase_confirmed_at, credentials_issued_at, created_at")
            .eq("funnel_user_id", appUserId)
            .order("created_at", { ascending: false })
            .limit(20);
        },
        findPlanById: async (planId) => {
          return await admin.from("web_funnel_plans")
            .select("id, funnel_user_id, status, claimed_by_user_id, purchase_confirmed_at, credentials_issued_at, created_at")
            .eq("id", planId)
            .maybeSingle();
        },
        checkRevenueCat: async (appUserId) => {
          const { checkEntitlementActive } = await import("../_shared/rc.ts");
          return await checkEntitlementActive(appUserId, Deno.env.get("REVENUECAT_SECRET_API_KEY") ?? "");
        },
        confirmPurchase: async (planId) => {
          const { data, error } = await admin.from("web_funnel_plans")
            .update({ purchase_confirmed_at: new Date().toISOString() })
            .eq("id", planId)
            .is("purchase_confirmed_at", null)
            .select("id");
          return { updated: data?.length ?? 0, error };
        },
        issue: async (planId, userId) => {
          const { issueFunnelCredentials } = await import("../_shared/funnel-identity.ts");
          return await issueFunnelCredentials(admin, planId, userId);
        },
      }
    );

    return json(result.body, result.status);
  } catch (_error) {
    return json({ success: false, error: "retryable", retryable: true }, 503);
  }
});
