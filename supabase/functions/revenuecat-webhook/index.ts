import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { checkEntitlementActive } from "../_shared/rc.ts";
import { isUuid, issueFunnelCredentials } from "../_shared/funnel-identity.ts";

const headers = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, content-type", "Content-Type": "application/json" };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers });

function constantTimeEqual(received: string, expected: string): boolean {
  const a = new TextEncoder().encode(received);
  const b = new TextEncoder().encode(expected);
  let difference = a.length ^ b.length;
  const length = Math.max(a.length, b.length);
  for (let i = 0; i < length; i++) difference |= (a[i % (a.length || 1)] ?? 0) ^ (b[i % (b.length || 1)] ?? 0);
  return difference === 0;
}

type RcEvent = { id?: unknown; type?: unknown; app_user_id?: unknown; period_type?: unknown };

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers });
  const configured = Deno.env.get("REVENUECAT_WEBHOOK_AUTH") ?? "";
  const received = req.headers.get("Authorization") ?? "";
  if (!configured || !constantTimeEqual(received, configured)) return json({ success: false, error: "unauthorized" }, 401);
  if (req.method !== "POST") return json({ success: false, error: "method_not_allowed" }, 405);

  try {
    const payload = await req.json() as { event?: RcEvent };
    const event = payload?.event ?? {};
    const eventId = typeof event.id === "string" ? event.id.trim() : "";
    const type = typeof event.type === "string" ? event.type : "";
    const appUserId = typeof event.app_user_id === "string" ? event.app_user_id.trim() : "";
    if (!eventId || !type) return json({ success: true, ignored: true });

    const admin = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "", { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: inserted, error: insertError } = await admin.from("revenuecat_webhook_events").insert({ event_id: eventId, event_type: type, app_user_id: appUserId, status: "processing" }).select("event_id").maybeSingle();
    if (insertError || !inserted) {
      if (insertError && insertError.code !== "23505") {
        return json({ success: false, error: "event_store_unavailable", retryable: true }, 503);
      }
      const { data: existing } = await admin.from("revenuecat_webhook_events").select("status").eq("event_id", eventId).maybeSingle();
      if (existing?.status === "retryable") {
        // Only a previously failed event may be retried. The conditional update
        // prevents two retries from both entering the issuance path.
        const { data: claimedRetry } = await admin.from("revenuecat_webhook_events")
          .update({ status: "processing", processed_at: null }).eq("event_id", eventId).eq("status", "retryable")
          .select("event_id").maybeSingle();
        if (!claimedRetry) return json({ success: true, idempotent: true });
      } else if (existing) {
        // processed, ignored, or currently processing: never emit twice.
        return json({ success: true, idempotent: true });
      } else {
        return json({ success: false, error: "event_store_unavailable", retryable: true }, 503);
      }
    }

    const finish = async (status: "processed" | "ignored" | "retryable") => {
      await admin.from("revenuecat_webhook_events").update({ status, processed_at: status === "retryable" ? null : new Date().toISOString() }).eq("event_id", eventId);
    };
    if (!["INITIAL_PURCHASE", "RENEWAL"].includes(type) || !isUuid(appUserId)) {
      await finish("ignored");
      return json({ success: true, ignored: true });
    }

    const { data: plans, error: planError } = await admin.from("web_funnel_plans")
      .select("id, funnel_user_id, status, claimed_by_user_id, purchase_confirmed_at")
      .eq("funnel_user_id", appUserId).order("created_at", { ascending: false }).limit(20);
    // An expired-by-window row may still be the paid plan whose webhook arrived
    // late. INITIAL_PURCHASE/RENEWAL is allowed to revive it by setting
    // purchase_confirmed_at; only a materialized claimed row is excluded.
    const plan = (plans ?? []).find((candidate: any) => candidate.funnel_user_id === appUserId && candidate.status !== "claimed" && (!candidate.claimed_by_user_id || candidate.claimed_by_user_id === appUserId));
    if (planError || !plan) {
      await finish("ignored");
      return json({ success: true, ignored: true });
    }

    // entitlement_ids and period_type are not proof; this server-side lookup is authoritative.
    const rc = await checkEntitlementActive(appUserId, Deno.env.get("REVENUECAT_SECRET_API_KEY") ?? "");
    if (!rc.ok) {
      await finish("retryable");
      return json({ success: false, error: "verification_unavailable", retryable: true }, 503);
    }
    if (!rc.active) {
      await finish("retryable");
      return json({ success: false, error: "entitlement_inactive", retryable: true }, 409);
    }

    await admin.from("web_funnel_plans").update({ purchase_confirmed_at: new Date().toISOString() }).eq("id", plan.id).is("purchase_confirmed_at", null);
    const issued = await issueFunnelCredentials(admin, plan.id, appUserId);
    if (!issued.ok && issued.status !== "in_progress") {
      await finish("retryable");
      return json({ success: false, error: issued.status, retryable: true }, 503);
    }
    await finish("processed");
    return json({ success: true, status: issued.status });
  } catch (_error) {
    return json({ success: false, error: "retryable", retryable: true }, 503);
  }
});
