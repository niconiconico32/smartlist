import { checkEntitlementActive } from "../_shared/rc.ts";
import { isUuid } from "../_shared/funnel-identity.ts";

const LEASE_MS = 2 * 60 * 1000;

/** Event types that may carry purchase metadata and therefore declare a plan. */
const PLAN_DECLARING_TYPES = new Set(["INITIAL_PURCHASE", "NON_RENEWING_PURCHASE"]);
const HANDLED_TYPES = new Set([
  "INITIAL_PURCHASE",
  "RENEWAL",
  "NON_RENEWING_PURCHASE",
]);

/** Terminal states are the only ones allowed to answer 200 idempotent. */
const TERMINAL_STATUSES = new Set(["processed", "ignored"]);

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

export type CreateAssociationStatus = "linked" | "existing" | "conflict" | "error";

export interface AssociationKey {
  scope: string;
  transactionId: string;
  originalTransactionId: string;
  appUserId: string;
}

export interface WebhookDeps {
  now(): Date;
  insertEvent(eventId: string, type: string, appUserId: string, executionId: string, leaseExpiresAt: string): Promise<{ created: boolean; error: unknown }>;
  findEvent(eventId: string): Promise<{ data: EventRow | null; error: unknown }>;
  claimEvent(eventId: string, executionId: string, leaseExpiresAt: string, fromStatus: string): Promise<{ updated: number; error: unknown }>;
  claimExpiredEvent(eventId: string, executionId: string, leaseExpiresAt: string): Promise<{ updated: number; error: unknown }>;
  /** TRUE only while this execution still holds a LIVE (unexpired) lease. */
  holdsLease(eventId: string, executionId: string): Promise<{ held: boolean; error: unknown }>;
  finishEvent(eventId: string, executionId: string, status: "processed" | "ignored" | "retryable"): Promise<{ updated: number; error: unknown }>;
  findAssociation(key: AssociationKey): Promise<{ planId: string | null; error: unknown }>;
  createAssociation(key: AssociationKey, planId: string): Promise<{ planId: string | null; status: CreateAssociationStatus }>;
  findPlanById(planId: string): Promise<{ data: FunnelPlanRow | null; error: unknown }>;
  checkRevenueCat(appUserId: string): Promise<{ ok: boolean; active: boolean }>;
  confirmPurchase(planId: string): Promise<{ updated: number; error: unknown }>;
  /**
   * CANONICAL materialization of the exact plan for the exact account. Must be
   * the shared `materializeCanonicalPlan` so this path cannot drift from
   * `finalize-funnel-plan`.
   */
  materialize(planId: string, userId: string): Promise<{ ok: boolean; reason?: string }>;
  /**
   * Writes `onboarding_completed` ONLY with canonical evidence that the plan is
   * materialized (shared `completeFunnelOnboardingAfterMaterialization`).
   */
  completeOnboarding(planId: string, userId: string): Promise<{ ok: boolean; reason?: string }>;
  issue(planId: string, userId: string): Promise<{ ok: boolean; status: string }>;
  grantProGift?: (input: {
    scope: string;
    transactionId: string;
    originalTransactionId: string;
    appUserId: string;
    eventId: string;
  }) => Promise<{ granted: boolean; error: unknown }>;
}

export interface RcWebhookEvent {
  id?: unknown;
  type?: unknown;
  app_id?: unknown;
  app_user_id?: unknown;
  app_user_type?: unknown;
  store?: unknown;
  environment?: unknown;
  transaction_id?: unknown;
  original_transaction_id?: unknown;
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

/** The plan id the web declared in the purchase metadata. */
export function planIdFromMetadata(metadata: unknown): string {
  if (!metadata || typeof metadata !== "object") return "";
  return text((metadata as { brainy_plan_id?: unknown }).brainy_plan_id);
}

/**
 * Scope of a purchase: (app_id, store, environment).
 *
 * All three are REQUIRED. There is deliberately no substitute and no
 * "unknown-*" filler: an association created under a guessed scope would collide
 * with, or silently shadow, a real one. A missing field means the event cannot
 * be scoped, so the caller must not create associations, confirm purchases or
 * issue credentials.
 */
export function purchaseScope(event: RcWebhookEvent): string | null {
  const app = text(event.app_id);
  const store = text(event.store);
  const environment = text(event.environment);
  if (!app || !store || !environment) return null;
  return `${app}|${store}|${environment}`;
}

/**
 * Ownership: WHO the plan belongs to. `status` is deliberately excluded because
 * a `claimed` plan may still have a pending credential delivery, but a plan
 * materialized under a different account must never receive this purchase.
 */
export function isOwnedBy(plan: FunnelPlanRow, appUserId: string): boolean {
  return plan.funnel_user_id === appUserId &&
    (!plan.claimed_by_user_id || plan.claimed_by_user_id === appUserId);
}

/** A plan past its window can no longer represent a live purchase. */
export function isEligibleForPurchase(plan: FunnelPlanRow, appUserId: string): boolean {
  return isOwnedBy(plan, appUserId) && plan.status !== "expired";
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
      return { status: 200, body: { success: true, idempotent: true, status: existing.status } };
    }

    if (existing.status === "processing") {
      // A NULL lease is not an active lease, so it is reclaimable — the same
      // rule the SQL adapter implements (NULL OR expired).
      const expired = !existing.lease_expires_at ||
        new Date(existing.lease_expires_at).getTime() <= deps.now().getTime();
      if (!expired) return retryable("event_in_progress");
      const taken = await deps.claimExpiredEvent(eventId, executionId, leaseExpiresAt);
      if (taken.error) return retryable("event_store_unavailable");
      if (taken.updated !== 1) {
        const after = await deps.findEvent(eventId);
        if (after.error) return retryable("event_store_unavailable");
        if (after.data && TERMINAL_STATUSES.has(after.data.status)) {
          return { status: 200, body: { success: true, idempotent: true, status: after.data.status } };
        }
        return retryable("event_claim_lost");
      }
    } else {
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

  const finish = async (status: "processed" | "ignored" | "retryable"): Promise<boolean> => {
    const { updated, error } = await deps.finishEvent(eventId, executionId, status);
    return !error && updated === 1;
  };
  const releaseThen = async (result: WebhookResult): Promise<WebhookResult> => {
    if (!(await finish("retryable"))) return retryable("event_finish_failed");
    return result;
  };
  const ignored = async (reason: string): Promise<WebhookResult> => {
    if (!(await finish("ignored"))) return retryable("event_finish_failed");
    return { status: 200, body: { success: true, ignored: true, reason } };
  };
  /** Re-checked before every mutation: a stale execution must stop here. */
  const leaseAlive = async (): Promise<WebhookResult | null> => {
    const lease = await deps.holdsLease(eventId, executionId);
    if (lease.error) return retryable("event_store_unavailable");
    if (!lease.held) return retryable("lease_lost");
    return null;
  };

  // ── Event relevance ────────────────────────────────────────────────────────
  if (!HANDLED_TYPES.has(type) || !isUuid(appUserId)) return ignored("unhandled_event");

  const declaredPlanId = PLAN_DECLARING_TYPES.has(type) ? planIdFromMetadata(event.metadata) : "";
  if (PLAN_DECLARING_TYPES.has(type) && declaredPlanId && !isUuid(declaredPlanId)) {
    return ignored("invalid_plan_id");
  }

  // ── Scope (required) ─────────────────────────────────────────────────────
  // No app_id / store / environment => the purchase cannot be scoped, so we
  // must not associate, confirm or issue anything.
  //
  // This is retryable, NOT ignored: the payload shape RevenueCat actually sends
  // is not confirmed yet. A missing field may be a one-off delivery problem or a
  // fixable integration, and marking the event terminal would bury the event
  // forever. The row stays 'retryable' (processed_at NULL, lease released) so it
  // can be picked up again automatically or replayed by hand once the real
  // payload is confirmed. Retrying is always safe: no association, confirmation
  // or issuance happened on this path.
  const scope = purchaseScope(event);
  if (!scope) return releaseThen(retryable("incomplete_scope"));

  // ── Entitlement gate FIRST ────────────────────────────────────────────────
  // The purchase is verified server-side before any association is created, so
  // an inactive or unreachable RevenueCat can never leave a new association
  // behind. A failure here is retryable and creates nothing.
  const rc = await deps.checkRevenueCat(appUserId);
  if (!rc.ok) return releaseThen(retryable("verification_unavailable"));
  if (!rc.active) {
    if (!(await finish("retryable"))) return retryable("event_finish_failed");
    return { status: 409, body: { success: false, error: "entitlement_inactive", retryable: true } };
  }

  // ── Resolve the purchase → plan association ───────────────────────────────
  // Contract: transaction_id identifies this purchase; original_transaction_id
  // links a renewal back to the purchase that started the subscription.
  const key: AssociationKey = {
    scope,
    transactionId: text(event.transaction_id),
    originalTransactionId: text(event.original_transaction_id),
    appUserId,
  };

  const found = await deps.findAssociation(key);
  if (found.error) return releaseThen(retryable("association_unavailable"));

  let planId = found.planId;

  if (planId) {
    // An existing association is authoritative and can never be reassigned.
    if (declaredPlanId && declaredPlanId !== planId) return ignored("association_conflict");
  } else {
    // In-app purchases do not have a funnel plan or brainy_plan_id metadata.
    // They still need the one-time Pro coin gift and a terminal webhook result.
    if (!declaredPlanId && (type === "INITIAL_PURCHASE" || type === "NON_RENEWING_PURCHASE")) {
      if (!key.transactionId || !deps.grantProGift) {
        return releaseThen(retryable("coin_gift_unavailable"));
      }
      const gift = await deps.grantProGift({
        scope,
        transactionId: key.transactionId,
        originalTransactionId: key.originalTransactionId,
        appUserId,
        eventId,
      });
      if (gift.error) return releaseThen(retryable("coin_gift_unavailable"));
      const processed = await deps.finishEvent(eventId, executionId, "processed");
      if (processed.error || processed.updated !== 1) return retryable("event_finish_failed");
      return { status: 200, body: { success: true, status: "processed", coinGift: true } };
    }
    if (!declaredPlanId) return releaseThen(retryable("plan_unresolved"));
    if (!key.transactionId) return releaseThen(retryable("plan_unresolved"));

    // Validate owner and eligibility BEFORE writing any association.
    const pre = await deps.findPlanById(declaredPlanId);
    if (pre.error) return releaseThen(retryable("plan_lookup_failed"));
    if (!pre.data) return releaseThen(retryable("plan_missing"));
    if (!isOwnedBy(pre.data, appUserId)) return ignored("plan_not_owned");
    if (!isEligibleForPurchase(pre.data, appUserId)) return ignored("plan_ineligible");

    const early = await leaseAlive();
    if (early) return releaseThen(early);

    const created = await deps.createAssociation(key, declaredPlanId);
    if (created.status === "error") return releaseThen(retryable("association_unavailable"));
    if (created.status === "conflict") return ignored("association_conflict");
    if (!created.planId) return releaseThen(retryable("association_unavailable"));
    planId = created.planId;
  }

  if (!planId) return releaseThen(retryable("plan_unresolved"));

  const planLookup = await deps.findPlanById(planId);
  if (planLookup.error) return releaseThen(retryable("plan_lookup_failed"));
  if (!planLookup.data) return releaseThen(retryable("plan_missing"));
  const plan = planLookup.data;
  if (!isOwnedBy(plan, appUserId)) return ignored("plan_not_owned");

  const beforeMutate = await leaseAlive();
  if (beforeMutate) return releaseThen(beforeMutate);

  // ── Confirm the purchase (a confirmed purchase is NOT a delivery) ──────────
  if (!plan.purchase_confirmed_at) {
    const confirmed = await deps.confirmPurchase(plan.id);
    if (confirmed.error) return releaseThen(retryable("purchase_confirm_failed"));
    if (confirmed.updated !== 1) {
      // Zero rows: verify, never assume another execution did it.
      const recheck = await deps.findPlanById(plan.id);
      if (recheck.error) return releaseThen(retryable("plan_lookup_failed"));
      if (!recheck.data || recheck.data.purchase_confirmed_at === null) {
        return releaseThen(retryable("purchase_confirm_failed"));
      }
    }
  }

  if (deps.grantProGift && key.transactionId) {
    const gift = await deps.grantProGift({
      scope,
      transactionId: key.transactionId,
      originalTransactionId: key.originalTransactionId,
      appUserId,
      eventId,
    });
    if (gift.error) return releaseThen(retryable("coin_gift_unavailable"));
  }

  // ── Content BEFORE the onboarding flag, the flag BEFORE the email ──────────
  // Order is the whole point of this block:
  //   materialize -> onboarding_completed -> credentials
  //
  // Writing `onboarding_completed` first makes the app skip the restore path
  // and land on an empty Home (the ordering regression this fixes). Everything
  // below is retryable and idempotent, so a failure just replays the event:
  // `materialize` converges through the canonical RPC (claimed -> replay) and
  // `completeOnboarding` is a no-op once the flag is set.
  const beforeMaterialize = await leaseAlive();
  if (beforeMaterialize) return releaseThen(beforeMaterialize);

  const materialized = await deps.materialize(plan.id, appUserId);
  if (!materialized.ok) {
    return releaseThen(retryable(`materialization_${materialized.reason ?? "failed"}`));
  }

  const beforeOnboarding = await leaseAlive();
  if (beforeOnboarding) return releaseThen(beforeOnboarding);

  const onboarded = await deps.completeOnboarding(plan.id, appUserId);
  if (!onboarded.ok) {
    // Materialized but not flagged: retry. The plan is already in place, so the
    // next run converges without duplicating a single routine or task.
    return releaseThen(retryable(`onboarding_${onboarded.reason ?? "failed"}`));
  }

  // ── Deliver credentials ───────────────────────────────────────────────────
  if (plan.credentials_issued_at) return ignored("already_issued");

  const beforeIssue = await leaseAlive();
  if (beforeIssue) return releaseThen(beforeIssue);

  const issued = await deps.issue(plan.id, appUserId);
  if (!issued.ok || issued.status === "in_progress") {
    return releaseThen(retryable(issued.status === "in_progress" ? "issuance_in_progress" : issued.status));
  }

  const processed = await deps.finishEvent(eventId, executionId, "processed");
  if (processed.error || processed.updated !== 1) return retryable("event_finish_failed");
  return { status: 200, body: { success: true, status: issued.status, planId: plan.id } };
}
