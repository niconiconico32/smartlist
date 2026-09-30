/**
 * Supabase adapter for revenuecat-webhook.
 *
 * Isolated from the handler so the actual query construction can be tested
 * against a recording client. The handler's lease semantics are only sound if
 * this adapter uses the SAME rule, in particular for a NULL lease: the handler
 * treats NULL as "not actively held" (reclaimable) and the SQL must agree.
 */
import type { AssociationOutcome, WebhookDeps } from "./handler.ts";
import type { FunnelPlanRow } from "./handler.ts";

export const PLAN_COLUMNS =
  "id, funnel_user_id, status, claimed_by_user_id, purchase_confirmed_at, credentials_issued_at, created_at";

const ACTIVE_STATUSES = ["INITIAL_PURCHASE", "RENEWAL", "NON_RENEWING_PURCHASE"];

type Query = {
  select: (cols?: string) => Query;
  insert: (values: Record<string, unknown>) => Query;
  update: (values: Record<string, unknown>) => Query;
  eq: (col: string, value: unknown) => Query;
  is: (col: string, value: unknown) => Query;
  lt: (col: string, value: string) => Query;
  or: (filter: string) => Query;
  order: (col: string, opts: { ascending: boolean }) => Query;
  limit: (n: number) => Query;
  maybeSingle: () => Promise<{ data: any; error: any }>;
  single: () => Promise<{ data: any; error: any }>;
  then: (fn: (v: any) => void) => Promise<any>;
};

const table = (client: any, name: string): Query => client.from(name);

/**
 * Normalizes a PostgREST result.
 *
 * Depending on the builder used, an `update(...).select(...)` chain resolves
 * either to a `{ data, error }` envelope or directly to the rows array. Reading
 * `.data` unconditionally silently yields `undefined` (and "0 rows updated")
 * in the second case, which would look like a lost race. Handle both.
 */
function rows(result: any): { rows: any[] | null; error: any } {
  if (Array.isArray(result)) return { rows: result, error: null };
  return { rows: Array.isArray(result?.data) ? result.data : null, error: result?.error ?? null };
}

/**
 * Builds the takeover filter for an abandoned processing event.
 * NULL lease must be included, otherwise the handler (which treats NULL as
 * reclaimable) would spin forever on rows it believes it can take.
 */
export function expiredLeaseFilter(nowIso: string): string {
  return `lease_expires_at.is.null,lease_expires_at.lte.${nowIso}`;
}

export function createWebhookDeps(admin: any, deps: { now: () => Date }): WebhookDeps {
  return {
    now: deps.now,

    insertEvent: async (eventId, type, appUserId, executionId, leaseExpiresAt) => {
      const { data, error } = await table(admin, "revenuecat_webhook_events")
        .insert({
          event_id: eventId,
          event_type: type,
          app_user_id: appUserId,
          status: "processing",
          execution_id: executionId,
          lease_expires_at: leaseExpiresAt,
        })
        .select("event_id")
        .maybeSingle();
      if (error) {
        // 23505 = duplicate event_id: the row already exists, not a store failure.
        if (error.code === "23505") return { created: false, error: null };
        return { created: false, error };
      }
      return { created: !!data, error: null };
    },

    findEvent: async (eventId) => {
      const { data, error } = await table(admin, "revenuecat_webhook_events")
        .select("status, execution_id, lease_expires_at")
        .eq("event_id", eventId)
        .maybeSingle();
      return { data: data ?? null, error };
    },

    claimEvent: async (eventId, executionId, leaseExpiresAt, fromStatus) => {
      const result = rows(await table(admin, "revenuecat_webhook_events")
        .update({ status: "processing", execution_id: executionId, lease_expires_at: leaseExpiresAt, processed_at: null })
        .eq("event_id", eventId)
        .eq("status", fromStatus)
        .neq("execution_id", executionId)
        .select("event_id"));
      return { updated: result.rows?.length ?? 0, error: result.error };
    },

    claimExpiredEvent: async (eventId, executionId, leaseExpiresAt) => {
      const result = rows(await table(admin, "revenuecat_webhook_events")
        .update({ status: "processing", execution_id: executionId, lease_expires_at: leaseExpiresAt, processed_at: null })
        .eq("event_id", eventId)
        .eq("status", "processing")
        .or(expiredLeaseFilter(deps.now().toISOString()))
        .select("event_id"));
      return { updated: result.rows?.length ?? 0, error: result.error };
    },

    holdsLease: async (eventId, executionId) => {
      const result = rows(await table(admin, "revenuecat_webhook_events")
        .select("event_id")
        .eq("event_id", eventId)
        .eq("execution_id", executionId)
        .eq("status", "processing")
        .or(expiredLeaseFilter(deps.now().toISOString()))
        .limit(1));
      if (result.error) return { held: false, error: result.error };
      return { held: (result.rows?.length ?? 0) === 1, error: null };
    },

    finishEvent: async (eventId, executionId, status) => {
      const result = rows(await table(admin, "revenuecat_webhook_events")
        .update({
          status,
          processed_at: status === "retryable" ? null : new Date().toISOString(),
          lease_expires_at: null,
        })
        .eq("event_id", eventId)
        .eq("execution_id", executionId)
        .select("event_id"));
      return { updated: result.rows?.length ?? 0, error: result.error };
    },

    resolveAssociation: async ({ scope, transactionId, subscriptionId, appUserId, declaredPlanId }): Promise<AssociationOutcome> => {
      // 1) An existing association always wins, so a replay can never reassign.
      const existing = await findAssociation(admin, scope, transactionId, subscriptionId);
      if (existing.error) return { status: "error" };
      if (existing.planId) {
        if (declaredPlanId && declaredPlanId !== existing.planId) return { status: "conflict", planId: existing.planId };
        return { status: "existing", planId: existing.planId };
      }

      // 2) Only a plan-declaring event may CREATE an association.
      if (!declaredPlanId) return { status: "unresolved" };
      if (!transactionId) return { status: "unresolved" };

      // The unique constraint is the authority: a concurrent inserter wins, and
      // this execution must then adopt that plan instead of forcing its own.
      const { error } = await table(admin, "revenuecat_purchase_plans").insert({
        scope_key: scope,
        transaction_id: transactionId,
        subscription_id: subscriptionId || null,
        app_user_id: appUserId,
        plan_id: declaredPlanId,
      });
      if (!error) return { status: "linked", planId: declaredPlanId };

      const winner = await findAssociation(admin, scope, transactionId, subscriptionId);
      if (winner.error) return { status: "error" };
      if (!winner.planId) return { status: "error" };
      if (winner.planId !== declaredPlanId) return { status: "conflict", planId: winner.planId };
      return { status: "existing", planId: winner.planId };
    },

    findPlanById: async (planId) => {
      const { data, error } = await table(admin, "web_funnel_plans")
        .select(PLAN_COLUMNS)
        .eq("id", planId)
        .maybeSingle();
      return { data: data ?? null, error };
    },

    checkRevenueCat: async () => ({ ok: true, active: true }),

    confirmPurchase: async (planId) => {
      const result = rows(await table(admin, "web_funnel_plans")
        .update({ purchase_confirmed_at: new Date().toISOString() })
        .eq("id", planId)
        .is("purchase_confirmed_at", null)
        .select("id"));
      return { updated: result.rows?.length ?? 0, error: result.error };
    },

    issue: async () => ({ ok: true, status: "sent" }),
  };
}

async function findAssociation(
  admin: any,
  scope: string,
  transactionId: string,
  subscriptionId: string,
): Promise<{ planId: string | null; error: unknown }> {
  if (transactionId) {
    const { data, error } = await table(admin, "revenuecat_purchase_plans")
      .select("plan_id")
      .eq("scope_key", scope)
      .eq("transaction_id", transactionId)
      .maybeSingle();
    if (error) return { planId: null, error };
    if (data?.plan_id) return { planId: data.plan_id, error: null };
  }
  if (subscriptionId) {
    // Renewals carry a new transaction id but the same subscription, so a
    // renewal can only ever RESOLVE a previous association, never create one.
    const { data, error } = await table(admin, "revenuecat_purchase_plans")
      .select("plan_id")
      .eq("scope_key", scope)
      .eq("subscription_id", subscriptionId)
      .order("created_at", { ascending: false })
      .limit(1);
    if (error) return { planId: null, error };
    const row = Array.isArray(data) ? data[0] : data;
    if (row?.plan_id) return { planId: row.plan_id, error: null };
  }
  return { planId: null, error: null };
}

export { ACTIVE_STATUSES };
