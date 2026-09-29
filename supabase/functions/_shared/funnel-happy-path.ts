import { isUuid, normalizeEmail, sha256Hex } from "./funnel-identity-core.ts";

export type Result = { status: number; body: Record<string, unknown> };
export type RcResult = { ok: boolean; active: boolean };

export interface FunnelPlan {
  id: string;
  email: string | null;
  claimTokenHash: string;
  status: string;
  expiresAt?: string | null;
  funnelUserId?: string | null;
  accountCreatedByFunnel?: boolean;
  purchaseConfirmedAt?: string | null;
  credentialsIssuingStartedAt?: string | null;
  credentialsIssuedAt?: string | null;
}

export interface FunnelUser { id: string; email: string; }

export interface PrepareDeps {
  now(): Date;
  findPlan(planId: string): Promise<FunnelPlan | null>;
  findUserByEmail(email: string): Promise<FunnelUser | null>;
  hasUnissuedFunnelAccount(userId: string, currentPlanId: string): Promise<boolean>;
  createUser(email: string): Promise<FunnelUser>;
  deleteUser(userId: string): Promise<void>;
  persistIdentity(planId: string, email: string, userId: string, createdByFunnel: boolean): Promise<boolean>;
  checkRevenueCat(userId: string): Promise<RcResult>;
}

export async function prepareFunnelAccount(input: { planId: unknown; claimToken: unknown; email: unknown }, deps: PrepareDeps): Promise<Result> {
  const planId = typeof input.planId === "string" ? input.planId.trim() : "";
  const token = typeof input.claimToken === "string" ? input.claimToken.trim() : "";
  const email = typeof input.email === "string" ? normalizeEmail(input.email) : "";
  if (!isUuid(planId) || !token || token.length > 512 || !email || email.length > 320 || !email.includes("@")) return { status: 400, body: { success: false, error: "invalid_request" } };
  const plan = await deps.findPlan(planId);
  if (!plan || plan.claimTokenHash !== await sha256Hex(token)) return { status: 404, body: { success: false, error: "invalid_token" } };
  if (plan.status === "expired" || (plan.expiresAt && Date.parse(plan.expiresAt) < deps.now().getTime())) return { status: 410, body: { success: false, error: "token_expired" } };
  if (plan.status !== "pending") return { status: 409, body: { success: false, error: "plan_not_ready" } };

  const frozenEmail = normalizeEmail(plan.email ?? "");
  if ((plan.funnelUserId || frozenEmail) && frozenEmail !== email) return { status: 409, body: { success: false, error: "identity_conflict" } };
  if (plan.funnelUserId) {
    const rc = await deps.checkRevenueCat(plan.funnelUserId);
    if (!rc.ok) return { status: 503, body: { success: false, error: "verification_unavailable" } };
    return { status: 200, body: { success: true, userId: plan.funnelUserId, alreadyPro: rc.active } };
  }

  let user = await deps.findUserByEmail(email);
  let createdByFunnel = false;
  if (!user) {
    user = await deps.createUser(email);
    createdByFunnel = true;
  } else {
    createdByFunnel = await deps.hasUnissuedFunnelAccount(user.id, planId);
  }
  const persisted = await deps.persistIdentity(planId, email, user.id, createdByFunnel);
  if (!persisted) {
    const winner = await deps.findPlan(planId);
    if (!winner?.funnelUserId || normalizeEmail(winner.email ?? "") !== email) return { status: 409, body: { success: false, error: "identity_conflict" } };
    user = { id: winner.funnelUserId, email };
  }
  const rc = await deps.checkRevenueCat(user.id);
  if (!rc.ok) return { status: 503, body: { success: false, error: "verification_unavailable" } };
  return { status: 200, body: { success: true, userId: user.id, alreadyPro: rc.active } };
}

export interface IssueDeps {
  now(): Date;
  getPlan(planId: string): Promise<FunnelPlan | null>;
  checkRevenueCat(userId: string): Promise<RcResult>;
  acquireLease(planId: string, now: Date, leaseMs: number): Promise<"acquired" | "in_progress" | "already_completed">;
  isAccountUsed(userId: string): Promise<boolean>;
  derivePassword(planId: string): Promise<string>;
  updatePassword(userId: string, password: string): Promise<void>;
  sendEmail(input: { planId: string; email: string; password: string | null; accountCreatedByFunnel: boolean }): Promise<{ accepted: boolean; id: string | null }>;
  markIssued(planId: string, emailId: string | null, now: Date): Promise<void>;
  releaseLease(planId: string): Promise<void>;
}

export async function issueFunnelCredentialsWithDeps(planId: string, userId: string, deps: IssueDeps): Promise<{ status: "sent" | "already_completed" | "in_progress" | "entitlement_inactive" | "verification_unavailable" | "retryable" }> {
  const plan = await deps.getPlan(planId);
  if (!plan || plan.funnelUserId !== userId || !plan.purchaseConfirmedAt) return { status: "retryable" };
  if (plan.credentialsIssuedAt) return { status: "already_completed" };
  const rc = await deps.checkRevenueCat(userId);
  if (!rc.ok) return { status: "verification_unavailable" };
  if (!rc.active) return { status: "entitlement_inactive" };
  const lease = await deps.acquireLease(planId, deps.now(), 120_000);
  if (lease !== "acquired") return { status: lease };
  const accountCreated = plan.accountCreatedByFunnel === true && !(await deps.isAccountUsed(userId));
  const password = accountCreated ? await deps.derivePassword(planId) : null;
  try {
    if (password !== null) await deps.updatePassword(userId, password);
    const sent = await deps.sendEmail({ planId, email: normalizeEmail(plan.email ?? ""), password, accountCreatedByFunnel: accountCreated });
    if (!sent.accepted) throw new Error("resend_not_accepted");
    await deps.markIssued(planId, sent.id, deps.now());
    return { status: "sent" };
  } catch (_error) {
    await deps.releaseLease(planId);
    return { status: "retryable" };
  }
}

export interface CompleteDeps {
  now(): Date;
  findPlan(planId: string): Promise<FunnelPlan | null>;
  checkRevenueCat(userId: string): Promise<RcResult>;
  confirmPurchase(planId: string, now: Date): Promise<void>;
  issue(planId: string, userId: string): Promise<{ status: string }>;
}

export async function completeFunnelAccount(input: { planId: unknown; claimToken: unknown }, deps: CompleteDeps): Promise<Result> {
  const planId = typeof input.planId === "string" ? input.planId.trim() : "";
  const token = typeof input.claimToken === "string" ? input.claimToken.trim() : "";
  if (!isUuid(planId) || !token || token.length > 512) return { status: 400, body: { success: false, error: "invalid_request" } };
  const plan = await deps.findPlan(planId);
  if (!plan || plan.claimTokenHash !== await sha256Hex(token)) return { status: 404, body: { success: false, error: "invalid_token" } };
  if (!plan.purchaseConfirmedAt && (plan.status === "expired" || (plan.expiresAt && Date.parse(plan.expiresAt) < deps.now().getTime()))) return { status: 410, body: { success: false, error: "token_expired" } };
  if (!plan.funnelUserId) return { status: 409, body: { success: false, error: "account_not_prepared" } };
  if (plan.credentialsIssuedAt) return { status: 200, body: { success: true, status: "already_completed" } };
  const rc = await deps.checkRevenueCat(plan.funnelUserId);
  if (!rc.ok) return { status: 503, body: { success: false, error: "verification_unavailable" } };
  if (!rc.active) return { status: 409, body: { success: false, error: "entitlement_inactive" } };
  if (!plan.purchaseConfirmedAt) await deps.confirmPurchase(planId, deps.now());
  const issued = await deps.issue(planId, plan.funnelUserId);
  if (["sent", "already_completed"].includes(issued.status)) return { status: 200, body: { success: true, status: issued.status } };
  if (issued.status === "in_progress") return { status: 202, body: { success: true, status: "in_progress" } };
  return { status: issued.status === "entitlement_inactive" ? 409 : 503, body: { success: false, error: issued.status } };
}

export interface WebhookDeps {
  eventBegin(event: { id: string; type: string; appUserId: string }): Promise<"started" | "retry_started" | "duplicate">;
  eventFinish(eventId: string, status: "processed" | "ignored" | "retryable"): Promise<void>;
  findPlan(userId: string): Promise<FunnelPlan | null>;
  checkRevenueCat(userId: string): Promise<RcResult>;
  confirmPurchase(planId: string, now: Date): Promise<void>;
  issue(planId: string, userId: string): Promise<{ status: string }>;
  now(): Date;
}

export async function revenueCatWebhook(input: { authorization: string; configuredAuthorization: string; event: { id?: unknown; type?: unknown; app_user_id?: unknown; period_type?: unknown } }, deps: WebhookDeps): Promise<Result> {
  if (!constantTimeEqual(input.authorization, input.configuredAuthorization)) return { status: 401, body: { success: false, error: "unauthorized" } };
  const id = typeof input.event.id === "string" ? input.event.id.trim() : "";
  const type = typeof input.event.type === "string" ? input.event.type : "";
  const appUserId = typeof input.event.app_user_id === "string" ? input.event.app_user_id.trim() : "";
  if (!id || !type) return { status: 200, body: { success: true, ignored: true } };
  const begin = await deps.eventBegin({ id, type, appUserId });
  if (begin === "duplicate") return { status: 200, body: { success: true, idempotent: true } };
  if (!["INITIAL_PURCHASE", "RENEWAL"].includes(type) || !isUuid(appUserId)) {
    await deps.eventFinish(id, "ignored");
    return { status: 200, body: { success: true, ignored: true } };
  }
  const plan = await deps.findPlan(appUserId);
  if (!plan) {
    await deps.eventFinish(id, "ignored");
    return { status: 200, body: { success: true, ignored: true } };
  }
  const rc = await deps.checkRevenueCat(appUserId);
  if (!rc.ok) {
    await deps.eventFinish(id, "retryable");
    return { status: 503, body: { success: false, error: "verification_unavailable", retryable: true } };
  }
  if (!rc.active) {
    await deps.eventFinish(id, "retryable");
    return { status: 409, body: { success: false, error: "entitlement_inactive", retryable: true } };
  }
  await deps.confirmPurchase(plan.id, deps.now());
  const issued = await deps.issue(plan.id, appUserId);
  if (!["sent", "already_completed", "in_progress"].includes(issued.status)) {
    await deps.eventFinish(id, "retryable");
    return { status: 503, body: { success: false, error: issued.status, retryable: true } };
  }
  await deps.eventFinish(id, "processed");
  return { status: 200, body: { success: true, status: issued.status } };
}

export function constantTimeEqual(received: string, expected: string): boolean {
  const a = new TextEncoder().encode(received);
  const b = new TextEncoder().encode(expected);
  let difference = a.length ^ b.length;
  const length = Math.max(a.length, b.length);
  for (let i = 0; i < length; i++) difference |= (a[i % (a.length || 1)] ?? 0) ^ (b[i % (b.length || 1)] ?? 0);
  return difference === 0;
}
