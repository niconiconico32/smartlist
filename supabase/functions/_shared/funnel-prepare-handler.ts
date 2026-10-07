// Request flow for `prepare-funnel-account`, with every side effect injected.
//
// It is a faithful extraction of the deployed handler so the whole funnel
// account preparation can be exercised in tests. Invariants:
//  - `planId` + `claimToken` + `email` are validated BEFORE any Auth call, so an
//    invalid token or a plan owned by someone else touches nothing in Auth;
//  - a new account is stamped ONLY with `brainy_funnel_account_created`. It is
//    NEVER stamped with `onboarding_completed`: the plan is not materialized at
//    this point, and the app reads that flag as "content already in place" and
//    would skip the restore path, landing the user on an empty Home. The flag
//    is written after canonical materialization, by the webhook path.
//  - preparing an account NEVER materializes anything;
//  - Pro is never granted here. The server-side RevenueCat check stays the only
//    authority and is still required for `alreadyPro`.

import { isUuid, normalizeEmail, sha256Hex } from "./funnel-identity-core.ts";
import { funnelCreatedMetadata, type UserMetadata } from "./funnel-metadata.ts";

export type Result = { status: number; body: Record<string, unknown> };

export type RcResult = { ok: boolean; active: boolean; status?: number };

export interface PreparePlan {
  id: string;
  email: string | null;
  claimTokenHash: string;
  status: string;
  expiresAt?: string | null;
  purchaseConfirmedAt?: string | null;
  funnelUserId?: string | null;
  accountCreatedByFunnel?: boolean | null;
}

export interface PrepareUser {
  id: string;
  email?: string | null;
}

export interface PrepareHandlerDeps {
  now(): Date;
  findPlan(planId: string): Promise<PreparePlan | null>;
  findUserByEmail(email: string): Promise<PrepareUser | null>;
  hasUnissuedFunnelAccount(userId: string, currentPlanId: string): Promise<boolean>;
  /** Returns null when Supabase could not create the account. */
  createUser(email: string, metadata: UserMetadata): Promise<PrepareUser | null>;
  persistIdentity(planId: string, email: string, userId: string, createdByFunnel: boolean): Promise<boolean>;
  checkRevenueCat(userId: string): Promise<RcResult>;
}

function failure(status: number, error: string): Result {
  return { status, body: { success: false, error } };
}

export async function prepareFunnelAccountHandler(
  input: { planId: unknown; claimToken: unknown; email: unknown },
  deps: PrepareHandlerDeps,
): Promise<Result> {
  const planId = typeof input.planId === "string" ? input.planId.trim() : "";
  const token = typeof input.claimToken === "string" ? input.claimToken.trim() : "";
  const email = typeof input.email === "string" ? normalizeEmail(input.email) : "";
  if (!isUuid(planId) || !token || token.length > 512 || !email || email.length > 320 || !email.includes("@")) return failure(400, "invalid_request");

  const plan = await deps.findPlan(planId);
  if (!plan || plan.claimTokenHash !== await sha256Hex(token)) return failure(404, "invalid_token");
  if (plan.status === "expired" || (!plan.purchaseConfirmedAt && plan.expiresAt && Date.parse(plan.expiresAt) < deps.now().getTime())) return failure(410, "token_expired");
  if (plan.status !== "pending") return failure(409, "plan_not_ready");

  const frozenEmail = normalizeEmail(plan.email ?? "");
  if (plan.funnelUserId || frozenEmail) {
    // Existing prepared rows are only idempotent when their identity remains intact.
    if (frozenEmail !== email) return failure(409, "identity_conflict");
    if (plan.funnelUserId) {
      const rc = await deps.checkRevenueCat(plan.funnelUserId);
      if (!rc.ok && rc.status !== 404) return failure(503, "verification_unavailable");
      return { status: 200, body: { success: true, userId: plan.funnelUserId, alreadyPro: rc.active === true } };
    }
  }

  let user = await deps.findUserByEmail(email);
  let createdByFunnel = false;
  if (!user) {
    const created = await deps.createUser(email, funnelCreatedMetadata());
    if (!created) return failure(500, "account_creation_failed");
    user = created;
    createdByFunnel = true;
  } else {
    // An abandoned funnel-created account is still a funnel-new account.
    // The decision is based on persisted prior plans, not this plan's flag.
    createdByFunnel = await deps.hasUnissuedFunnelAccount(user.id, planId);
  }

  const persisted = await deps.persistIdentity(planId, email, user.id, createdByFunnel);
  let userId = user.id;
  if (!persisted) {
    const winner = await deps.findPlan(planId);
    if (!winner?.funnelUserId || normalizeEmail(winner.email ?? "") !== email) return failure(409, "identity_conflict");
    userId = winner.funnelUserId;
  }
  const rc = await deps.checkRevenueCat(userId);
  if (!rc.ok && rc.status !== 404) return failure(503, "verification_unavailable");
  return { status: 200, body: { success: true, userId, alreadyPro: rc.active === true } };
}