import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { checkEntitlementActive } from "../_shared/rc.ts";
import { issueFunnelCredentials, isUuid, sha256Hex } from "../_shared/funnel-identity.ts";

const headers = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Content-Type": "application/json" };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers });

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers });
  if (req.method !== "POST") return json({ success: false, error: "method_not_allowed" }, 405);
  try {
    const body = await req.json() as { planId?: unknown; claimToken?: unknown };
    const planId = typeof body.planId === "string" ? body.planId.trim() : "";
    const token = typeof body.claimToken === "string" ? body.claimToken.trim() : "";
    if (!isUuid(planId) || !token || token.length > 512) return json({ success: false, error: "invalid_request" }, 400);
    const admin = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "", { auth: { persistSession: false, autoRefreshToken: false } });
    const hash = await sha256Hex(token);
    const { data: plan, error } = await admin.from("web_funnel_plans").select("id, claim_token_hash, status, expires_at, funnel_user_id, purchase_confirmed_at, credentials_issued_at").eq("id", planId).maybeSingle();
    if (error || !plan || plan.claim_token_hash !== hash) return json({ success: false, error: "invalid_token" }, 404);
    if (!plan.purchase_confirmed_at && (plan.status === "expired" || (plan.expires_at && Date.parse(plan.expires_at) < Date.now()))) return json({ success: false, error: "token_expired" }, 410);
    if (!plan.funnel_user_id) return json({ success: false, error: "account_not_prepared" }, 409);
    if (plan.credentials_issued_at) return json({ success: true, status: "already_completed" });

    const rc = await checkEntitlementActive(plan.funnel_user_id, Deno.env.get("REVENUECAT_SECRET_API_KEY") ?? "");
    if (!rc.ok) return json({ success: false, error: "verification_unavailable" }, 503);
    if (!rc.active) return json({ success: false, error: "entitlement_inactive" }, 409);
    if (!plan.purchase_confirmed_at) {
      await admin.from("web_funnel_plans").update({ purchase_confirmed_at: new Date().toISOString() }).eq("id", planId).is("purchase_confirmed_at", null);
    }
    const issued = await issueFunnelCredentials(admin, planId, plan.funnel_user_id);
    if (issued.ok) return json({ success: true, status: issued.status });
    if (issued.status === "in_progress") return json({ success: true, status: "in_progress" }, 202);
    if (issued.status === "entitlement_inactive") return json({ success: false, error: "entitlement_inactive" }, 409);
    return json({ success: false, error: "verification_unavailable" }, 503);
  } catch (_error) {
    return json({ success: false, error: "unknown" }, 500);
  }
});
