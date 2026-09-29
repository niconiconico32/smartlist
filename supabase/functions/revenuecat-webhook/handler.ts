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

export interface WebhookDeps {
  now(): Date;
  insertEvent(eventId: string, type: string, appUserId: string, executionId: string, leaseExpiresAt: string): Promise<{ data: unknown; error: { code?: string } | null }>;
  findEvent(eventId: string): Promise<{ data: { status: string; execution_id: string | null; lease_expires_at: string | null } | null; error: unknown }>;
  claimEvent(eventId: string, executionId: string, leaseExpiresAt: string, options: { fromStatus: string; expiredOnly?: boolean }): Promise<{ data: unknown; error: unknown }>;
  finishEvent(eventId: string, executionId: string, status: "processed" | "ignored" | "retryable"): Promise<{ error: unknown }>;
  findPlans(appUserId: string): Promise<{ data: Array<{ id: string; funnel_user_id: string; status: string; claimed_by_user_id: string | null; purchase_confirmed_at: string | null; created_at: string }> | null; error: unknown }>;
  checkRevenueCat(appUserId: string): Promise<{ ok: boolean; active: boolean }>;
  confirmPurchase(planId: string): Promise<{ error: unknown }>;
  issue(planId: string, userId: string): Promise<{ ok: boolean; status: string }>;
}

export interface WebhookInput {
  authorization: string;
  configuredAuthorization: string;
  event: { id?: unknown; type?: unknown; app_user_id?: unknown; period_type?: unknown };
}

export interface WebhookResult {
  status: number;
  body: Record<string, unknown>;
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

  const finish = async (status: "processed" | "ignored" | "retryable"): Promise<boolean> => {
    const { error } = await deps.finishEvent(eventId, executionId, status);
    return !error;
  };

  if (!["INITIAL_PURCHASE", "RENEWAL"].includes(type) || !isUuid(appUserId)) {
    const ok = await finish("ignored");
    if (!ok) return { status: 503, body: { success: false, error: "event_finish_failed", retryable: true } };
    return { status: 200, body: { success: true, ignored: true } };
  }

  const { data: plans, error: planError } = await deps.findPlans(appUserId);
  if (planError) {
    const ok = await finish("retryable");
    if (!ok) return { status: 503, body: { success: false, error: "event_finish_failed", retryable: true } };
    return { status: 503, body: { success: false, error: "plan_lookup_failed", retryable: true } };
  }

  const eligiblePlans = (plans ?? []).filter((candidate) =>
    candidate.funnel_user_id === appUserId &&
    candidate.status !== "claimed" &&
    (!candidate.claimed_by_user_id || candidate.claimed_by_user_id === appUserId)
  );

  const alreadyConfirmed = eligiblePlans.find((p) => p.purchase_confirmed_at !== null);
  if (alreadyConfirmed) {
    const ok = await finish("ignored");
    if (!ok) return { status: 503, body: { success: false, error: "event_finish_failed", retryable: true } };
    return { status: 200, body: { success: true, ignored: true } };
  }

  const pendingPlans = eligiblePlans.filter((p) => p.purchase_confirmed_at === null);
  if (pendingPlans.length === 0) {
    const ok = await finish("ignored");
    if (!ok) return { status: 503, body: { success: false, error: "event_finish_failed", retryable: true } };
    return { status: 200, body: { success: true, ignored: true } };
  }

  if (pendingPlans.length > 1) {
    const ok = await finish("retryable");
    if (!ok) return { status: 503, body: { success: false, error: "event_finish_failed", retryable: true } };
    return { status: 503, body: { success: false, error: "ambiguous_plan", retryable: true } };
  }

  const plan = pendingPlans[0];

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

  const { error: confirmError } = await deps.confirmPurchase(plan.id);
  if (confirmError) {
    const ok = await finish("retryable");
    if (!ok) return { status: 503, body: { success: false, error: "event_finish_failed", retryable: true } };
    return { status: 503, body: { success: false, error: "purchase_confirm_failed", retryable: true } };
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

  const { error: finishError } = await deps.finishEvent(eventId, executionId, "processed");
  if (finishError) {
    return { status: 503, body: { success: false, error: "event_finish_failed", retryable: true } };
  }
  return { status: 200, body: { success: true, status: issued.status } };
}
