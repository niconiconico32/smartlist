import { checkEntitlementActive } from "../_shared/rc.ts";
import { isUuid } from "../_shared/funnel-identity.ts";

const LEASE_MS = 2 * 60 * 1000;

/** Event types that may carry purchase metadata and therefore declare a plan. */
const PLAN_DECLARING_TYPES = new Set(["INITIAL_PURCHASE", "NON_RENEWING_PURCHASE"]);
/** Every event type this function acts on. */
const HANDLED_TYPES = new Set([
  "INITIAL_PURCHASE",
  "RENEWAL",
  "NON_RENEWING_PURCHASE",
]);

export function constantTimeEqual(received: string, expected: string): boolean {
  const a = new TextEncoder().encode(received);
  const b = new TextEncoder().encode(expected);
  let difference = a.length ^ b.length;
  const length = Math.max(a.length, b.length);
  for (let i = 0; i < length; i++) difference |= (a[i % (a.length || 1)] ?? 0) ^ (b[i % (b.length || 1)] ?? 0);
  return difference === 0;
}

export function generateExecutionId(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export interface FunnelPlanRow {
  id: string;
  funnel_user_id: string | null;
  status: string;
  claimed_by_user_id: string | null;
  purchase_confirmed_at: string | null;
  credentials_issued_at: string | null;
  created_at: string;
}

export interface EventRow {
  status: string;
  execution_id: string | null;
  lease_expires_at: string | null;
}

/** Terminal states are the only ones allowed to answer 200 idempotent. */
const TERMINAL_STATUSES = new Set(["processed", "ignored"]);

export type AssociationOutcome =
  | { status: "linked"; planId: string }
  | { status: "existing"; planId: string }
  | { status: "conflict"; planId: string }
  | { status: "unresolved" }
  | { status: "error" };

export interface WebhookDeps {
  now(): Date;
  /** TRUE when the event row was created by this call. */
  insertEvent(eventId: string, type: string, appUserId: string, executionId: string, leaseExpiresAt: string): Promise<{ created: boolean; error: unknown }>;
  findEvent(eventId: string): Promise<{ data: EventRow | null; error: unknown }>;
  /** Atomically takes the lease. `updated` counts the rows actually taken. */
  claimEvent(eventId: string, executionId: string, leaseExpiresAt: string, fromStatus: string): Promise<{ updated: number; error: unknown }>;
  /** Must match the handler's notion of "expired", NULL lease included. */
  claimExpiredEvent(eventId: string, executionId: string, leaseExpiresAt: string): Promise<{ updated: number; error: unknown }>;
  /** Confirms this execution still owns a live lease. Checked before mutations. */
  holdsLease(eventId: string, executionId: string): Promise<{ held: boolean; error: unknown }>;
  finishEvent(eventId: string, executionId: string, status: "processed" | "ignored" | "retryable"): Promise<{ updated: number; error: unknown }>;
  /** Resolves (and for a declaring event, creates) the transaction→plan link. */
  resolveAssociation(input: {
    scope: string;
    transactionId: string;
    subscriptionId: string;
    appUserId: string;
    declaredPlanId: string;
  }): Promise<AssociationOutcome>;
  findPlanById(planId: string): Promise<{ data: FunnelPlanRow | null; error: unknown }>;
  checkRevenueCat(appUserId: string): Promise<{ ok: boolean; active: boolean }>;
  confirmPurchase(planId: string): Promise<{ updated: number; error: unknown }>;
  issue(planId: string, userId: string): Promise<{ ok: boolean; status: string }>;
}

export interface RcWebhookEvent {
  id?: unknown;
  type?: unknown;
  app_id?: unknown;
  app_user_id?: unknown;
  app_user_type?: unknown;
  store?: unknown;
  environment?: unknown;
  subscription_id?: unknown;
  transaction_id?: unknown;
  metadata?: unknown;
}

export interface WebhookInput {
  authorization: string;
  configuredAuthorization: string;
  event: RcWebhookEvent;
}

export interface WebhookResult {
  status: number;
  body: Record<string, unknown>;
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

/** Extrae el planId que la web envió en la metadata de la compra. */
export function planIdFromMetadata(metadata: unknown): string {
  if (!metadata || typeof metadata !== "object") return "";
  return text((metadata as { brainy_plan_id?: unknown }).brainy_plan_id);
}

/**
 * Scope of a purchase. RevenueCat identifies a purchase within
 * (app, store, environment); the same transaction string in another app, store
 * or sandbox is a different purchase and must never share an association.
 */
export function purchaseScope(event: RcWebhookEvent): string {
  const app = text(event.app_id) || text(event.app_user_type) || "unknown-app";
  const store = text(event.store) || "unknown-store";
  const environment = text(event.environment) || "unknown-environment";
  return `${app}|${store}|${environment}`;
}

/**
 * Ownership is about WHO the plan belongs to, not about its materialization
 * state. A `claimed` plan still has a pending delivery for its rightful owner,
 * so `status` is deliberately NOT part of this check. What IS part of it: a
 * plan materialized under a different account must never receive this purchase's
 * credentials, even though `funnel_user_id` still points at the buyer.
 */
export function isOwnedBy(plan: FunnelPlanRow, appUserId: string): boolean {
  return plan.funnel_user_id === appUserId &&
    (!plan.claimed_by_user_id || plan.claimed_by_user_id === appUserId);
}

export async function handleRevenueCatWebhook(input: WebhookInput, deps: WebhookDeps): Promise<WebhookResult> {
  if (!input.configuredAuthorization || !constantTimeEqual(input.authorization, input.configuredAuthorization)) {
    return { status: 401, body: { success: false, error: "unauthorized" } };
  }

  const event = input.event ?? {};
  const eventId = text(event.id);
  const type = text(event.type);
  const appUserId = text(event.app_user_id);
  if (!eventId || !type) return { status: 200, body: { success: true, ignored: true } };

  const retryable = (error: string, extra: Record<string, unknown> = {}) => ({
    status: 503,
    body: { success: false, error, retryable: true, ...extra },
  });

  // ── Event store + lease acquisition ────────────────────────────────────────
  const executionId = generateExecutionId();
  const leaseExpiresAt = new Date(deps.now().getTime() + LEASE_MS).toISOString();

  const inserted = await deps.insertEvent(eventId, type, appUserId, executionId, leaseExpiresAt);
  if (inserted.error) return retryable("event_store_unavailable");

  if (!inserted.created) {
    const found = await deps.findEvent(eventId);
    if (found.error) return retryable("event_store_unavailable");
    const existing = found.data;
    if (!existing) return retryable("event_store_unavailable");

    if (TERMINAL_STATUSES.has(existing.status)) {
      // Verified terminal: safe to acknowledge without re-running anything.
      return { status: 200, body: { success: true, idempotent: true, status: existing.status } };
    }

    if (existing.status === "processing") {
      // A NULL lease is not an active lease, so it is reclaimable — same rule the
      // SQL adapter implements (lease_expires_at IS NULL OR < now).
      const expired = !existing.lease_expires_at ||
        new Date(existing.lease_expires_at).getTime() <= deps.now().getTime();
      if (!expired) {
        // Another live execution owns it. Not a completed state: ask for retry.
        return retryable("event_in_progress");
      }
      const taken = await deps.claimExpiredEvent(eventId, executionId, leaseExpiresAt);
      if (taken.error) return retryable("event_store_unavailable");
      if (taken.updated !== 1) {
        // Lost the race: re-read to see whether the winner finished it.
        const after = await deps.findEvent(eventId);
        if (after.error) return retryable("event_store_unavailable");
        if (after.data && TERMINAL_STATUSES.has(after.data.status)) {
          return { status: 200, body: { success: true, idempotent: true, status: after.data.status } };
        }
        return retryable("event_claim_lost");
      }
    } else {
      // "retryable" (or any known non-terminal state): take it over.
      const taken = await deps.claimEvent(eventId, executionId, leaseExpiresAt, existing.status);
      if (taken.error) return retryable("event_store_unavailable");
      if (taken.updated !== 1) {
        const after = await deps.findEvent(eventId);
        if (after.error) return retryable("event_store_unavailable");
        if (after.data && TERMINAL_STATUSES.has(after.data.status)) {
          return { status: 200, body: { success: true, idempotent: true, status: after.data.status } };
        }
        return retryable("event_claim_lost");
      }
    }
  }

  /** Finishing is only valid for the execution that still holds the lease. */
  const finish = async (status: "processed" | "ignored" | "retryable"): Promise<boolean> => {
    const { updated, error } = await deps.finishEvent(eventId, executionId, status);
    return !error && updated === 1;
  };
  const releaseThen = async (result: WebhookResult): Promise<WebhookResult> => {
    if (!(await finish("retryable"))) return retryable("event_finish_failed");
    return result;
  };

  // ── Event relevance ────────────────────────────────────────────────────────
  if (!HANDLED_TYPES.has(type) || !isUuid(appUserId)) {
    if (!(await finish("ignored"))) return retryable("event_finish_failed");
    return { status: 200, body: { success: true, ignored: true } };
  }

  // ── Resolve the plan strictly through the purchase association ────────────
  const declaredPlanId = PLAN_DECLARING_TYPES.has(type) ? planIdFromMetadata(event.metadata) : "";
  if (PLAN_DECLARING_TYPES.has(type) && declaredPlanId && !isUuid(declaredPlanId)) {
    if (!(await finish("ignored"))) return retryable("event_finish_failed");
    return { status: 200, body: { success: true, ignored: true, reason: "invalid_plan_id" } };
  }

  const transactionId = text(event.transaction_id);
  const association = await deps.resolveAssociation({
    scope: purchaseScope(event),
    transactionId,
    subscriptionId: text(event.subscription_id),
    appUserId,
    declaredPlanId,
  });
  if (association.status === "error") return releaseThen(retryable("association_unavailable"));
  if (association.status === "conflict") {
    // The purchase is already bound to a different plan: never reassign.
    if (!(await finish("ignored"))) return retryable("event_finish_failed");
    return { status: 200, body: { success: true, ignored: true, reason: "association_conflict" } };
  }
  if (association.status === "unresolved") {
    // No metadata and no prior association (e.g. a renewal from another
    // device/web surface). Refuse to guess a plan from the user alone.
    return releaseThen(retryable("plan_unresolved"));
  }

  const planLookup = await deps.findPlanById(association.planId);
  if (planLookup.error) return releaseThen(retryable("plan_lookup_failed"));
  if (!planLookup.data) {
    // Bound plan vanished: controlled response, never dereference null.
    return releaseThen(retryable("plan_missing"));
  }
  const plan = planLookup.data;
  if (!isOwnedBy(plan, appUserId)) {
    if (!(await finish("ignored"))) return retryable("event_finish_failed");
    return { status: 200, body: { success: true, ignored: true, reason: "plan_not_owned" } };
  }

  // ── Entitlement gate (server-side, authoritative) ─────────────────────────
  const rc = await deps.checkRevenueCat(appUserId);
  if (!rc.ok) return releaseThen(retryable("verification_unavailable"));
  if (!rc.active) {
    if (!(await finish("retryable"))) return retryable("event_finish_failed");
    return { status: 409, body: { success: false, error: "entitlement_inactive", retryable: true } };
  }

  // ── Ownership of the lease is re-checked BEFORE any mutation ──────────────
  const lease = await deps.holdsLease(eventId, executionId);
  if (lease.error) return releaseThen(retryable("event_store_unavailable"));
  if (!lease.held) return retryable("lease_lost");

  // ── Confirm the purchase (idempotent; a confirmed purchase is NOT delivery) ─
  if (!plan.purchase_confirmed_at) {
    const confirmed = await deps.confirmPurchase(plan.id);
    if (confirmed.error) return releaseThen(retryable("purchase_confirm_failed"));
    if (confirmed.updated !== 1) {
      // Zero rows: something else changed the row. Verify instead of assuming.
      const recheck = await deps.findPlanById(plan.id);
      if (recheck.error) return releaseThen(retryable("plan_lookup_failed"));
      if (!recheck.data || recheck.data.purchase_confirmed_at === null) {
        return releaseThen(retryable("purchase_confirm_failed"));
      }
    }
  }

  // ── Deliver credentials ───────────────────────────────────────────────────
  if (plan.credentials_issued_at) {
    if (!(await finish("ignored"))) return retryable("event_finish_failed");
    return { status: 200, body: { success: true, ignored: true, reason: "already_issued", planId: plan.id } };
  }

  const issued = await deps.issue(plan.id, appUserId);
  if (!issued.ok || issued.status === "in_progress") {
    // The email was not proven sent; keep the event retryable.
    return releaseThen(retryable(issued.status === "in_progress" ? "issuance_in_progress" : issued.status));
  }

  const processed = await deps.finishEvent(eventId, executionId, "processed");
  if (processed.error || processed.updated !== 1) return retryable("event_finish_failed");
  return { status: 200, body: { success: true, status: issued.status, planId: plan.id } };
}
