import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { checkEntitlementActive } from "../_shared/rc.ts";
import { issueFunnelCredentials } from "../_shared/funnel-identity.ts";
import {
  completeFunnelOnboardingAfterMaterialization,
  createSupabaseMaterializeDeps,
  createSupabaseOnboardingDeps,
  materializeCanonicalPlan,
} from "../_shared/funnel-materialize.ts";
import { handleRevenueCatWebhook } from "./handler.ts";
import { createWebhookDeps } from "./adapter.ts";

const headers = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, content-type", "Content-Type": "application/json" };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers });

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers });

  const configured = Deno.env.get("REVENUECAT_WEBHOOK_AUTH") ?? "";
  const received = req.headers.get("Authorization") ?? "";

  try {
    const payload = await req.json() as { event?: Record<string, unknown> };

    const admin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false, autoRefreshToken: false } },
    );

    const deps = createWebhookDeps(admin, { now: () => new Date() });
    // The entitlement gate, the materialization and the issuance path are the
    // real implementations; the adapter only wires storage.
    deps.checkRevenueCat = async (appUserId: string) =>
      await checkEntitlementActive(appUserId, Deno.env.get("REVENUECAT_SECRET_API_KEY") ?? "");
    // Same canonical helper the app path uses, so there is exactly ONE
    // definition of "materialized" and ONE materialization implementation.
    deps.materialize = async (planId: string, userId: string) => {
      const result = await materializeCanonicalPlan(createSupabaseMaterializeDeps(admin), { planId, userId });
      return result.ok ? { ok: true } : { ok: false, reason: result.reason };
    };
    deps.completeOnboarding = async (planId: string, userId: string) => {
      const result = await completeFunnelOnboardingAfterMaterialization(createSupabaseOnboardingDeps(admin), { planId, userId });
      return result.ok ? { ok: true } : { ok: false, reason: result.reason };
    };
    deps.issue = async (planId: string, userId: string) =>
      await issueFunnelCredentials(admin, planId, userId);

    const result = await handleRevenueCatWebhook(
      { authorization: received, configuredAuthorization: configured, event: payload?.event ?? {} },
      deps,
    );

    return json(result.body, result.status);
  } catch (_error) {
    return json({ success: false, error: "retryable", retryable: true }, 503);
  }
});
