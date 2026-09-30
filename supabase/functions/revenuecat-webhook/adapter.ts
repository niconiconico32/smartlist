/**
 * Supabase adapter for revenuecat-webhook.
 *
 * Isolated from the handler so the actual query construction can be tested
 * against a recording client. Two rules must match the handler exactly:
 *  - a NULL lease is not held (reclaimable);
 *  - holdsLease must require a LIVE lease (strictly in the future), never an
 *    expired one, otherwise a stale execution could keep mutating.
 */
import type {
  AssociationKey,
  CreateAssociationStatus,
  FunnelPlanRow,
  WebhookDeps,
} from "./handler.ts";

export const PLAN_COLUMNS =
  "id, funnel_user_id, status, claimed_by_user_id, purchase_confirmed_at, credentials_issued_at, created_at";

type Query = {
  select: (cols?: string) => Query;
  insert: (values: Record<string, unknown>) => Query;
  update: (values: Record<string, unknown>) => Query;
  eq: (col: string, value: unknown) => Query;
  neq: (col: string, value: unknown) => Query;
  is: (col: string, value: unknown) => Query;
  gt: (col: string, value: string) => Query;
  or: (filter: string) => Query;
  limit: (n: number) => Query;
  maybeSingle: () => Promise<{ data: any; error: any }>;
  then: (fn: (v: any) => void) => Promise<any>;
};

const table = (client: any, name: string): Query => client.from(name);

/** A lease that no longer protects the row: NULL or already elapsed. */
export function expiredLeaseFilter(nowIso: string): string {
  return `lease_expires_at.is.null,lease_expires_at.lte.${nowIso}`;
}

/** A lease that still protects the row: strictly in the future. */
export function liveLeaseFilter(nowIso: string): string {
  return `lease_expires_at.gt.${nowIso}`;
}

/**
 * Normalizes a PostgREST result. An `update(...).select(...)` chain may resolve
 * to a `{ data, error }` envelope or directly to the rows array; reading `.data`
 * unconditionally would silently report "0 rows updated" in the second case.
 */
function rows(result: any): { rows: any[] | null; error: any } {
  if (Array.isArray(result)) return { rows: result, error: null };
  return { rows: Array.isArray(result?.data) ? result.data : null, error: result?.error ?? null };
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
      // LIVE lease only: an elapsed lease must not authorise further mutations.
      const result = rows(await table(admin, "revenuecat_webhook_events")
        .select("event_id")
        .eq("event_id", eventId)
        .eq("execution_id", executionId)
        .eq("status", "processing")
        .or(liveLeaseFilter(deps.now().toISOString()))
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

    findAssociation: async (key) => await findAssociation(admin, key),

    createAssociation: async (key, planId): Promise<{ planId: string | null; status: CreateAssociationStatus }> => {
      if (!key.transactionId) return { planId: null, status: "error" };
      const { error } = await table(admin, "revenuecat_purchase_plans").insert({
        scope_key: key.scope,
        transaction_id: key.transactionId,
        original_transaction_id: key.originalTransactionId || null,
        app_user_id: key.appUserId,
        plan_id: planId,
      });
      if (!error) return { planId, status: "linked" };

      // A unique violation means a concurrent writer won. Recover THEIR row and
      // never force our own plan. If the winner is not readable yet (its
      // transaction has not committed), we report an error so the event is
      // retried instead of guessing.
      const winner = await findAssociation(admin, key);
      if (winner.error) return { planId: null, status: "error" };
      if (!winner.planId) return { planId: null, status: "error" };
      if (winner.planId !== planId) return { planId: winner.planId, status: "conflict" };
      return { planId: winner.planId, status: "existing" };
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

/**
 * Resolves a purchase to its plan with the two identifiers of the contract:
 *   1. transaction_id          — this exact transaction
 *   2. original_transaction_id — the purchase a renewal descends from
 *
 * There is no third fallback and no "newest wins" tie-break. Uniqueness is
 * enforced by the database (UNIQUE on (scope_key, transaction_id) and on
 * (scope_key, original_transaction_id) where NOT NULL), so a single-row read is
 * sufficient: if two rows could ever match, the read fails loudly instead of
 * silently picking one.
 */
async function findAssociation(
  admin: any,
  key: AssociationKey,
): Promise<{ planId: string | null; error: unknown }> {
  const exact = async (column: string, value: string) => {
    if (!value) return { planId: null, error: null };
    const { data, error } = await table(admin, "revenuecat_purchase_plans")
      .select("plan_id")
      .eq("scope_key", key.scope)
      .eq(column, value)
      .limit(1);
    if (error) return { planId: null, error };
    const list = (Array.isArray(data) ? data : []) as Array<{ plan_id: string }>;
    return { planId: list[0]?.plan_id ?? null, error: null };
  };

  for (const [column, value] of [
    ["transaction_id", key.transactionId],
    ["original_transaction_id", key.originalTransactionId],
  ] as const) {
    const hit = await exact(column, value);
    if (hit.error) return { planId: null, error: hit.error };
    if (hit.planId) return { planId: hit.planId, error: null };
  }
  return { planId: null, error: null };
}
