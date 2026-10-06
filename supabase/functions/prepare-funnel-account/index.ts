import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { checkEntitlementActive } from "../_shared/rc.ts";
import { normalizeEmail } from "../_shared/funnel-identity.ts";
import { prepareFunnelAccountHandler, type PrepareUser } from "../_shared/funnel-prepare-handler.ts";

const headers = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Content-Type": "application/json" };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers });

function randomInternalPassword(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("") + "A!9";
}

async function findUserByEmail(admin: any, email: string): Promise<PrepareUser | null> {
  const { error, data } = await admin.rpc("find_auth_user_by_email", { p_email: email });
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : null;
  // The lookup RPC returns only (id, email); metadata is read separately with
  // getUserById when a repair is actually needed.
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
    const url = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

    const result = await prepareFunnelAccountHandler(
      { planId: typeof body.planId === "string" ? body.planId.trim() : "", claimToken: typeof body.claimToken === "string" ? body.claimToken.trim() : "", email: typeof body.email === "string" ? normalizeEmail(body.email) : "" },
      {
        now: () => new Date(),
        findPlan: async (planId) => {
          const { data, error } = await admin.from("web_funnel_plans")
            .select("id, email, claim_token_hash, status, expires_at, purchase_confirmed_at, funnel_user_id, account_created_by_funnel")
            .eq("id", planId).maybeSingle();
          if (error || !data) return null;
          return {
            id: data.id,
            email: data.email,
            claimTokenHash: data.claim_token_hash,
            status: data.status,
            expiresAt: data.expires_at,
            purchaseConfirmedAt: data.purchase_confirmed_at,
            funnelUserId: data.funnel_user_id,
            accountCreatedByFunnel: data.account_created_by_funnel,
          };
        },
        findUserByEmail: (email) => findUserByEmail(admin, email),
        hasUnissuedFunnelAccount: (userId, currentPlanId) => hasUnissuedFunnelAccount(admin, userId, currentPlanId),
        createUser: async (email, userMetadata) => {
          const { data, error } = await admin.auth.admin.createUser({
            email,
            password: randomInternalPassword(),
            email_confirm: true,
            user_metadata: userMetadata,
          });
          if (error || !data?.user) return null;
          return { id: data.user.id, email: data.user.email, userMetadata: data.user.user_metadata ?? null };
        },
        persistIdentity: async (planId, email, userId, createdByFunnel) => {
          const { data } = await admin.from("web_funnel_plans")
            .update({ email, funnel_user_id: userId, account_created_by_funnel: createdByFunnel })
            .eq("id", planId).is("funnel_user_id", null).select("funnel_user_id").maybeSingle();
          return Boolean(data);
        },
        getUserById: async (userId) => {
          const { data, error } = await admin.auth.admin.getUserById(userId);
          if (error || !data?.user) return null;
          return { id: data.user.id, email: data.user.email, user_metadata: data.user.user_metadata ?? null };
        },
        // Metadata only: never the password, the email, the providers or the
        // confirmation flags.
        updateUserMetadata: async (userId, userMetadata) => {
          const { error } = await admin.auth.admin.updateUserById(userId, { user_metadata: userMetadata });
          return !error;
        },
        checkRevenueCat: async (userId) => checkEntitlementActive(userId, Deno.env.get("REVENUECAT_SECRET_API_KEY") ?? ""),
      },
    );
    return json(result.body, result.status);
  } catch (_error) {
    return json({ success: false, error: "unknown" }, 500);
  }
});
