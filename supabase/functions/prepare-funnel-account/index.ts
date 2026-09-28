import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { checkEntitlementActive } from "../_shared/rc.ts";
import { isUuid, normalizeEmail, sha256Hex } from "../_shared/funnel-identity.ts";

const headers = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Content-Type": "application/json" };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers });

function randomInternalPassword(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("") + "A!9";
}

async function findUserByEmail(admin: any, email: string): Promise<any | null> {
  const { data, error } = await admin.rpc("find_auth_user_by_email", { p_email: email });
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : null;
  return row?.id ? { id: row.id, email: row.email } : null;
}

async function hasUnissuedFunnelAccount(admin: any, userId: string, planId: string): Promise<boolean> {
  const { count, error } = await admin
    .from("web_funnel_plans")
    .select("id", { count: "exact", head: true })
    .eq("funnel_user_id", userId)
    .eq("account_created_by_funnel", true)
    .is("credentials_issued_at", null)
    .neq("id", planId);
  if (error) throw error;
  return (count ?? 0) > 0;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers });
  if (req.method !== "POST") return json({ success: false, error: "method_not_allowed" }, 405);
  try {
    const body = await req.json() as { planId?: unknown; claimToken?: unknown; email?: unknown };
    const planId = typeof body.planId === "string" ? body.planId.trim() : "";
    const token = typeof body.claimToken === "string" ? body.claimToken.trim() : "";
    const email = typeof body.email === "string" ? normalizeEmail(body.email) : "";
    if (!isUuid(planId) || !token || token.length > 512 || !email || email.length > 320 || !email.includes("@")) return json({ success: false, error: "invalid_request" }, 400);

    const url = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const hash = await sha256Hex(token);
    const { data: plan, error } = await admin.from("web_funnel_plans")
      .select("id, email, claim_token_hash, status, expires_at, purchase_confirmed_at, funnel_user_id, account_created_by_funnel")
      .eq("id", planId).maybeSingle();
    if (error || !plan || plan.claim_token_hash !== hash) return json({ success: false, error: "invalid_token" }, 404);
    if (plan.status === "expired" || (!plan.purchase_confirmed_at && plan.expires_at && Date.parse(plan.expires_at) < Date.now())) return json({ success: false, error: "token_expired" }, 410);
    if (plan.status !== "pending") return json({ success: false, error: "plan_not_ready" }, 409);

    const frozenEmail = normalizeEmail(plan.email ?? "");
    if (plan.funnel_user_id || frozenEmail) {
      if (frozenEmail !== email) return json({ success: false, error: "identity_conflict" }, 409);
      // Existing prepared rows are only idempotent when their identity remains intact.
      const existing = plan.funnel_user_id;
      if (existing) {
        const rc = await checkEntitlementActive(existing, Deno.env.get("REVENUECAT_SECRET_API_KEY") ?? "");
        if (!rc.ok && rc.status !== 404) return json({ success: false, error: "verification_unavailable" }, 503);
        return json({ success: true, userId: existing, alreadyPro: rc.active === true });
      }
    }

    let user = await findUserByEmail(admin, email);
    let createdByFunnel = false;
    if (!user) {
      const created = await admin.auth.admin.createUser({
        email,
        password: randomInternalPassword(),
        email_confirm: true,
        user_metadata: { brainy_funnel_account_created: true },
      });
      if (created.error || !created.data.user) return json({ success: false, error: "account_creation_failed" }, 500);
      user = created.data.user;
      createdByFunnel = true;
    } else {
      // An abandoned funnel-created account is still a funnel-new account.
      // The decision is based on persisted prior plans, not this plan's flag.
      createdByFunnel = await hasUnissuedFunnelAccount(admin, user.id, planId);
    }

    const { data: updated, error: updateError } = await admin.from("web_funnel_plans").update({ email, funnel_user_id: user.id, account_created_by_funnel: createdByFunnel }).eq("id", planId).is("funnel_user_id", null).select("funnel_user_id").maybeSingle();
    if (updateError || !updated) {
      if (createdByFunnel) await admin.auth.admin.deleteUser(user.id);
      const { data: winner } = await admin.from("web_funnel_plans").select("email, funnel_user_id").eq("id", planId).maybeSingle();
      if (!winner || normalizeEmail(winner.email ?? "") !== email || !winner.funnel_user_id) return json({ success: false, error: "identity_conflict" }, 409);
      user = { id: winner.funnel_user_id };
    }
    const rc = await checkEntitlementActive(user.id, Deno.env.get("REVENUECAT_SECRET_API_KEY") ?? "");
    if (!rc.ok && rc.status !== 404) return json({ success: false, error: "verification_unavailable" }, 503);
    return json({ success: true, userId: user.id, alreadyPro: rc.active === true });
  } catch (_error) {
    return json({ success: false, error: "unknown" }, 500);
  }
});
