import { checkEntitlementActive } from "../_shared/rc.ts";
import { isUuid, issueFunnelCredentials } from "../_shared/funnel-identity.ts";
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const LEASE_MS = 2 * 60 * 1000;

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

export interface WebhookDeps {
  now(): Date;
  insertEvent(eventId: string, type: string, appUserId: string, executionId: string, leaseExpiresAt: string): Promise<{ data: unknown; error: { code?: string } | null }>;
  findEvent(eventId: string): Promise<{ data: { status: string; execution_id: string | null; lease_expires_at: string | null; plan_id: string | null } | null; error: unknown }>;
  claimEvent(eventId: string, executionId: string, leaseExpiresAt: string, options: { fromStatus: string; expiredOnly?: boolean }): Promise<{ data: unknown; error: unknown }>;
  finishEvent(eventId: string, executionId: string, status: "processed" | "ignored" | "retryable"): Promise<{ updated: number; error: unknown }>;
  /** Pins the resolved plan to the event so every retry targets the SAME plan. */
  bindEventPlan(eventId: string, executionId: string, planId: string): Promise<{ updated: number; error: unknown }>;
  findPlans(appUserId: string): Promise<{ data: FunnelPlanRow[] | null; error: unknown }>;
  findPlanById(planId: string): Promise<{ data: FunnelPlanRow | null; error: unknown }>;
  checkRevenueCat(appUserId: string): Promise<{ ok: boolean; active: boolean }>;
  confirmPurchase(planId: string): Promise<{ updated: number; error: unknown }>;
  issue(planId: string, userId: string): Promise<{ ok: boolean; status: string }>;
}

export interface WebhookInput {
  authorization: string;
  configuredAuthorization: string;
  event: {
    id?: unknown;
    type?: unknown;
    app_user_id?: unknown;
    period_type?: unknown;
    metadata?: unknown;
  };
}

export interface WebhookResult {
  status: number;
  body: Record<string, unknown>;
}

/** Extrae el planId que la web envió en la metadata de la compra. */
export function planIdFromMetadata(metadata: unknown): string {
  if (!metadata || typeof metadata !== "object") return "";
  const value = (metadata as { brainy_plan_id?: unknown }).brainy_plan_id;
  return typeof value === "string" ? value.trim() : "";
}

function isEligible(plan: FunnelPlanRow, appUserId: string): boolean {
  return plan.funnel_user_id === appUserId &&
    plan.status !== "claimed" &&
    (!plan.claimed_by_user_id || plan.claimed_by_user_id === appUserId);
}

export async function handleRevenueCatWebhook(input: WebhookInput, deps: WebhookDeps): Promise<WebhookResult> {
  if (!input.configuredAuthorization || !constantTimeEqual(input.authorization, input.configuredAuthorization)) {
    return { status: 401, body: { success: false, error: "unauthorized" } };
  }

  const event = input.event ?? {};
  const eventId = typeof event.id === "string" ? event.id.trim() : "";
  const type = typeof event.type === "string" ? event.type : "";
  const appUserId = typeof event.app_user_id === "string" ? event.app_user_id.trim() : "";
  if (!eventId || !type) return { status: 200, body: { success: true, ignored: true } };

  const executionId = generateExecutionId();
  const leaseExpiresAt = new Date(deps.now().getTime() + LEASE_MS).toISOString();

  const { data: inserted, error: insertError } = await deps.insertEvent(eventId, type, appUserId, executionId, leaseExpiresAt);
  if (insertError || !inserted) {
    if (insertError && insertError.code !== "23505") {
      return { status: 503, body: { success: false, error: "event_store_unavailable", retryable: true } };
    }
    const { data: existing } = await deps.findEvent(eventId);
    if (existing?.status === "retryable") {
      const { data: claimedRetry } = await deps.claimEvent(eventId, executionId, leaseExpiresAt, { fromStatus: "retryable" });
      if (!claimedRetry) return { status: 200, body: { success: true, idempotent: true } };
    } else if (existing?.status === "processing") {
      const isExpired = !existing.lease_expires_at || new Date(existing.lease_expires_at).getTime() < deps.now().getTime();
      if (isExpired) {
        const { data: claimedStuck } = await deps.claimEvent(eventId, executionId, leaseExpiresAt, { fromStatus: "processing", expiredOnly: true });
        if (!claimedStuck) return { status: 200, body: { success: true, idempotent: true } };
      } else {
        return { status: 200, body: { success: true, idempotent: true } };
      }
    } else if (existing) {
      return { status: 200, body: { success: true, idempotent: true } };
    } else {
      return { status: 503, body: { success: false, error: "event_store_unavailable", retryable: true } };
    }
  }

  // Finishing is only valid for the execution that still holds the lease. Zero
  // updated rows means a newer execution took over: the result must NOT be
  // reported as ours, and a stale execution must never mark the event.
  const finish = async (status: "processed" | "ignored" | "retryable"): Promise<boolean> => {
    const { updated, error } = await deps.finishEvent(eventId, executionId, status);
    return !error && updated === 1;
  };

  if (!["INITIAL_PURCHASE", "RENEWAL"].includes(type) || !isUuid(appUserId)) {
    const ok = await finish("ignored");
    if (!ok) return { status: 503, body: { success: false, error: "event_finish_failed", retryable: true } };
    return { status: 200, body: { success: true, ignored: true } };
  }

  // ── Resolve the plan ──────────────────────────────────────────────────────
  // Preference order:
  //  1. the plan already pinned to this event (stable across retries);
  //  2. the plan the web declared in event.metadata.brainy_plan_id;
  //  3. a single eligible pending plan, as a legacy fallback.
  const { data: pinned } = await deps.findEvent(eventId);
  const pinnedPlanId = pinned?.plan_id ?? "";
  const declaredPlanId = planIdFromMetadata(event.metadata);

  let plan: FunnelPlanRow | null = null;

  if (pinnedPlanId) {
    const byId = await deps.findPlanById(pinnedPlanId);
    if (byId.error) {
      const ok = await finish("retryable");
      if (!ok) return { status: 503, body: { success: false, error: "event_finish_failed", retryable: true } };
      return { status: 503, body: { success: false, error: "plan_lookup_failed", retryable: true } };
    }
    if (byId.data && !isEligible(byId.data, appUserId)) {
      // A pinned plan that no longer belongs to this app user is a hard stop.
      const ok = await finish("ignored");
      if (!ok) return { status: 503, body: { success: false, error: "event_finish_failed", retryable: true } };
      return { status: 200, body: { success: true, ignored: true, reason: "plan_not_owned" } };
    }
    plan = byId.data;
  } else if (declaredPlanId) {
    if (!isUuid(declaredPlanId)) {
      const ok = await finish("ignored");
      if (!ok) return { status: 503, body: { success: false, error: "event_finish_failed", retryable: true } };
      return { status: 200, body: { success: true, ignored: true, reason: "invalid_plan_id" } };
    }
    const byId = await deps.findPlanById(declaredPlanId);
    if (byId.error) {
      const ok = await finish("retryable");
      if (!ok) return { status: 503, body: { success: false, error: "event_finish_failed", retryable: true } };
      return { status: 503, body: { success: false, error: "plan_lookup_failed", retryable: true } };
    }
    if (!byId.data) {
      // Declared plan is unknown: do not fall back to guessing another plan.
      const ok = await finish("retryable");
      if (!ok) return { status: 503, body: { success: false, error: "event_finish_failed", retryable: true } };
      return { status: 503, body: { success: false, error: "declared_plan_not_found", retryable: true } };
    }
    if (!isEligible(byId.data, appUserId)) {
      // The declared plan belongs to a different user: never confirm or issue.
      const ok = await finish("ignored");
      if (!ok) return { status: 503, body: { success: false, error: "event_finish_failed", retryable: true } };
      return { status: 200, body: { success: true, ignored: true, reason: "plan_not_owned" } };
    }
    plan = byId.data;

    // Pin it so any later retry targets exactly this plan, even if the user
    // creates another plan in between. Idempotent: pinning twice is a no-op.
    const bind = await deps.bindEventPlan(eventId, executionId, plan.id);
    if (bind.error || bind.updated !== 1) {
      const ok = await finish("retryable");
      if (!ok) return { status: 503, body: { success: false, error: "event_finish_failed", retryable: true } };
      return { status: 503, body: { success: false, error: "plan_bind_failed", retryable: true } };
    }
  } else {
    const { data: plans, error: planError } = await deps.findPlans(appUserId);
    if (planError) {
      const ok = await finish("retryable");
      if (!ok) return { status: 503, body: { success: false, error: "event_finish_failed", retryable: true } };
      return { status: 503, body: { success: false, error: "plan_lookup_failed", retryable: true } };
    }
    const eligible = (plans ?? []).filter((candidate) => isEligible(candidate, appUserId));
    // Already delivered: nothing left to do for this plan.
    const settled = eligible.find((p) => p.credentials_issued_at !== null);
    if (settled && eligible.filter((p) => p.credentials_issued_at === null).length === 0) {
      const ok = await finish("ignored");
      if (!ok) return { status: 503, body: { success: false, error: "event_finish_failed", retryable: true } };
      return { status: 200, body: { success: true, ignored: true, reason: "already_issued" } };
    }
    const candidates = eligible.filter((p) => p.credentials_issued_at === null);
    if (candidates.length === 0) {
      const ok = await finish("ignored");
      if (!ok) return { status: 503, body: { success: false, error: "event_finish_failed", retryable: true } };
      return { status: 200, body: { success: true, ignored: true, reason: "no_eligible_plan" } };
    }
    if (candidates.length === 1) {
      plan = candidates[0];
    } else {
      // Several plans await delivery. A purchase that is ALREADY confirmed owns
      // the outstanding obligation, so it is the only safe choice: picking a
      // brand-new pending plan here would let an old/renewal event confirm it.
      const confirmed = candidates.filter((p) => p.purchase_confirmed_at !== null);
      if (confirmed.length !== 1) {
        const ok = await finish("retryable");
        if (!ok) return { status: 503, body: { success: false, error: "event_finish_failed", retryable: true } };
        return { status: 503, body: { success: false, error: "ambiguous_plan", retryable: true } };
      }
      plan = confirmed[0];
    }
  }

  // ── Entitlement gate (server-side, authoritative) ─────────────────────────
  const rc = await deps.checkRevenueCat(appUserId);
  if (!rc.ok) {
    const ok = await finish("retryable");
    if (!ok) return { status: 503, body: { success: false, error: "event_finish_failed", retryable: true } };
    return { status: 503, body: { success: false, error: "verification_unavailable", retryable: true } };
  }
  if (!rc.active) {
    const ok = await finish("retryable");
    if (!ok) return { status: 503, body: { success: false, error: "event_finish_failed", retryable: true } };
    return { status: 409, body: { success: false, error: "entitlement_inactive", retryable: true } };
  }

  // A confirmed purchase is NOT terminal for delivery: if credentials were never
  // issued we must still try. Stamping an already-set timestamp is a no-op, and
  // zero updated rows is fine here (another execution already stamped it).
  if (!plan.purchase_confirmed_at) {
    const confirmed = await deps.confirmPurchase(plan.id);
    if (confirmed.error) {
      const ok = await finish("retryable");
      if (!ok) return { status: 503, body: { success: false, error: "event_finish_failed", retryable: true } };
      return { status: 503, body: { success: false, error: "purchase_confirm_failed", retryable: true } };
    }
  }

  const issued = await deps.issue(plan.id, appUserId);
  // `in_progress` means another execution holds the issuance lease: the email was
  // NOT proven sent, so this event must stay retryable and must never be closed.
  // Handling it explicitly keeps the handler independent of which shape the
  // issuance implementation uses to report that state.
  if (!issued.ok || issued.status === "in_progress") {
    const ok = await finish("retryable");
    if (!ok) return { status: 503, body: { success: false, error: "event_finish_failed", retryable: true } };
    return { status: 503, body: { success: false, error: issued.status === "in_progress" ? "issuance_in_progress" : issued.status, retryable: true } };
  }

  const processed = await deps.finishEvent(eventId, executionId, "processed");
  if (processed.error || processed.updated !== 1) {
    return { status: 503, body: { success: false, error: "event_finish_failed", retryable: true } };
  }
  return { status: 200, body: { success: true, status: issued.status, planId: plan.id } };
}
