// CANONICAL funnel plan materialization, server-side.
//
// `finalize-funnel-plan` (app path) and `revenuecat-webhook` (server path) must
// share ONE definition of "this plan is materialized" and ONE materialization
// call. The payload builders come from `_shared/funnel.ts` and the atomic,
// locked, idempotent write stays in the PostgreSQL RPC
// `public.claim_funnel_plan` — this module never inserts routines or tasks by
// hand.
//
// ORDER CONTRACT (the funnel regression this module exists to prevent):
//
//   purchase_confirmed_at        (commercial fact, written by the webhook)
//     -> server-side entitlement  (RevenueCat, SECRET key)
//       -> materialization        (this module)
//         -> onboarding_completed (onlyFunnelOnboardingAfterMaterialization)
//           -> credentials email   (issueFunnelCredentials)
//
// Setting `onboarding_completed` before materialization makes the app skip the
// restore path and land on an empty Home, so it is strictly gated here.

import { buildActivities, buildRoutines } from "./funnel.ts";
import { withFunnelOnboarding } from "./funnel-metadata.ts";

export interface MaterializePlanRow {
  id: string;
  status: string;
  claim_token_hash: string;
  funnel_user_id: string | null;
  claimed_by_user_id: string | null;
  purchase_confirmed_at: string | null;
  plan?: Record<string, unknown> | null;
}

export interface MaterializeSummary {
  taskCount: number;
  routineCount: number;
  eggCount: number;
}

export type MaterializeResult =
  | { ok: true; state: "materialized" | "already_materialized"; summary: MaterializeSummary }
  | { ok: false; state: "retryable" | "terminal"; reason: string };

/**
 * THE canonical definition of "materialized". Single source of truth.
 *
 * Evidence is the plan's own terminal state machine outcome written by
 * `claim_funnel_plan` — never `purchase_confirmed_at`,
 * `credentials_issued_at`, `brainy_funnel_account_created`,
 * `onboarding_completed` or `status = pending`, none of which imply that any
 * routine or task exists.
 *
 * `claimed` is only ever written after the whole materialization commits, and
 * `claimed_by_user_id` is assigned at the start of the claim, so requiring both
 * to match `userId` proves the rows belong to THIS account.
 */
export function isPlanMaterialized(plan: MaterializePlanRow, userId: string): boolean {
  return plan.status === "claimed" && plan.claimed_by_user_id === userId;
}

function summaryFromMarker(plan: MaterializePlanRow | null | undefined): MaterializeSummary {
  const marker = (plan?.plan as Record<string, any> | undefined)?.__materialized;
  const num = (value: unknown) => (Number.isFinite(Number(value)) ? Number(value) : 0);
  return {
    taskCount: num(marker?.task_count),
    routineCount: num(marker?.routine_count),
    eggCount: num(marker?.egg_count),
  };
}

export interface MaterializeDeps {
  /** Reads the plan by its exact id. Never by email, date or "newest". */
  findPlan(planId: string): Promise<MaterializePlanRow | null>;
  /**
   * Calls the canonical atomic RPC for THIS plan id. The already-built payload
   * is passed verbatim so no second materialization implementation can drift
   * from the app path.
   */
  claimPlan(input: {
    planId: string;
    claimTokenHash: string;
    userId: string;
    activities: unknown[];
    routines: unknown[];
  }): Promise<{ data: unknown; error: unknown }>;
}

/** Terminal reasons: retrying cannot change the outcome. */
const TERMINAL_RPC_ERRORS = new Set([
  "invalid_token",
  "token_expired",
  "invalid_status",
  "claim_not_owned",
  "already_claimed",
]);

/**
 * Materializes the exact plan for the exact account, or reports why it cannot.
 *
 * Preconditions enforced here (the caller must have verified the purchase and
 * the entitlement first): ownership by `funnel_user_id`, a confirmed purchase,
 * and the canonical RPC for the actual write.
 */
export async function materializeCanonicalPlan(
  deps: MaterializeDeps,
  input: { planId: string; userId: string },
): Promise<MaterializeResult> {
  const { planId, userId } = input;

  const plan = await deps.findPlan(planId);
  if (!plan) return { ok: false, state: "terminal", reason: "plan_missing" };

  // Identity comes from the persisted association, never from the request.
  if (plan.funnel_user_id !== userId) return { ok: false, state: "terminal", reason: "plan_not_owned" };
  if (plan.claimed_by_user_id && plan.claimed_by_user_id !== userId) {
    return { ok: false, state: "terminal", reason: "plan_not_owned" };
  }

  if (isPlanMaterialized(plan, userId)) {
    return { ok: true, state: "already_materialized", summary: summaryFromMarker(plan) };
  }

  // A purchase that was never confirmed must never materialize.
  if (!plan.purchase_confirmed_at) {
    return { ok: false, state: "terminal", reason: "purchase_not_confirmed" };
  }

  const payload = (plan.plan ?? {}) as Record<string, any>;
  const activities = buildActivities(payload, plan.id);
  const routines = buildRoutines(payload);

  const { data, error } = await deps.claimPlan({
    planId,
    claimTokenHash: plan.claim_token_hash,
    userId,
    activities,
    routines,
  });
  if (error) return { ok: false, state: "retryable", reason: "claim_failed" };

  const parsed = (typeof data === "string" ? safeParse(data) : data) as Record<string, any> | null;
  if (!parsed) return { ok: false, state: "retryable", reason: "claim_unreadable" };

  if (parsed.success === true) {
    const num = (value: unknown) => (Number.isFinite(Number(value)) ? Number(value) : 0);
    return {
      ok: true,
      state: "materialized",
      summary: {
        taskCount: num(parsed.taskCount),
        routineCount: num(parsed.routineCount),
        eggCount: num(parsed.eggCount),
      },
    };
  }

  // A concurrent execution may have won. Re-read and trust only OUR OWN state.
  if (parsed.alreadyClaimed === true || parsed.error === "already_claimed") {
    const fresh = await deps.findPlan(planId);
    if (fresh && isPlanMaterialized(fresh, userId)) {
      return { ok: true, state: "already_materialized", summary: summaryFromMarker(fresh) };
    }
    return { ok: false, state: "terminal", reason: "plan_not_owned" };
  }

  const reason = typeof parsed.error === "string" ? parsed.error : "claim_failed";
  if (TERMINAL_RPC_ERRORS.has(reason)) return { ok: false, state: "terminal", reason };

  // `forbidden` is the RPC's own guard: it materializes only into
  // auth.uid(), so the CALLER lacked an owner-scoped JWT. Retrying is safe and
  // is the only thing that can fix it.
  // `egg_unavailable` / SQL errors roll back atomically and keep the plan
  // retryable for the same owner.
  return { ok: false, state: "retryable", reason };
}

function safeParse(value: string): Record<string, any> | null {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

export interface OnboardingDeps {
  findPlan(planId: string): Promise<MaterializePlanRow | null>;
  getUserMetadata(userId: string): Promise<Record<string, unknown> | null>;
  updateUserMetadata(userId: string, metadata: Record<string, unknown>): Promise<boolean>;
}

export type OnboardingResult =
  | { ok: true; changed: boolean }
  | { ok: false; reason: string };

/**
 * Marks the account as onboarded, but ONLY with canonical evidence that its
 * plan is materialized. Callers must run this after `materializeCanonicalPlan`
 * and before sending credentials.
 */
export async function completeFunnelOnboardingAfterMaterialization(
  deps: OnboardingDeps,
  input: { planId: string; userId: string },
): Promise<OnboardingResult> {
  const { planId, userId } = input;

  const plan = await deps.findPlan(planId);
  if (!plan) return { ok: false, reason: "plan_missing" };
  if (plan.funnel_user_id !== userId) return { ok: false, reason: "plan_not_owned" };
  if (!isPlanMaterialized(plan, userId)) return { ok: false, reason: "plan_not_materialized" };

  const metadata = await deps.getUserMetadata(userId);
  if (!metadata) return { ok: false, reason: "user_not_found" };
  if (metadata.onboarding_completed === true) return { ok: true, changed: false };

  const ok = await deps.updateUserMetadata(userId, withFunnelOnboarding(metadata));
  return ok ? { ok: true, changed: true } : { ok: false, reason: "metadata_update_failed" };
}

/** Columns the materialization decisions depend on. Never the raw plan twice. */
export const MATERIALIZE_COLUMNS =
  "id, status, claim_token_hash, funnel_user_id, claimed_by_user_id, purchase_confirmed_at, plan";

async function readMaterializePlan(admin: any, planId: string): Promise<MaterializePlanRow | null> {
  const { data, error } = await admin
    .from("web_funnel_plans")
    .select(MATERIALIZE_COLUMNS)
    .eq("id", planId)
    .maybeSingle();
  if (error || !data) return null;
  return {
    id: data.id,
    status: data.status,
    claim_token_hash: data.claim_token_hash,
    funnel_user_id: data.funnel_user_id ?? null,
    claimed_by_user_id: data.claimed_by_user_id ?? null,
    purchase_confirmed_at: data.purchase_confirmed_at ?? null,
    plan: data.plan ?? null,
  };
}

/**
 * Supabase wiring for the canonical materialization (service_role client).
 *
 * It calls `materialize_funnel_plan_for_purchase`, the purchase-scoped entry
 * point built from the SAME body as `claim_funnel_plan` (same row lock, same
 * state machine, same egg resolution, same __materialized marker, same
 * idempotent replay). The difference is only its guard: the canonical function
 * materializes into `auth.uid()`, so it is callable by the app path
 * (`finalize-funnel-plan`, owner JWT); this one is callable by service_role and
 * therefore re-checks ownership against the plan's persisted
 * `funnel_user_id` plus a confirmed purchase.
 *
 * Until that function exists, PostgREST answers with an error and the caller
 * reports a retryable failure — the safe direction: no content, no onboarding
 * flag, no credentials.
 */
export function createSupabaseMaterializeDeps(admin: any): MaterializeDeps {
  return {
    findPlan: (planId) => readMaterializePlan(admin, planId),
    claimPlan: async ({ planId, userId, activities, routines }) =>
      await admin.rpc("materialize_funnel_plan_for_purchase", {
        p_plan_id: planId,
        p_user_id: userId,
        p_activities: activities,
        p_routines: routines,
      }),
  };
}

/** Supabase wiring for the post-materialization onboarding flag. */
export function createSupabaseOnboardingDeps(admin: any): OnboardingDeps {
  return {
    findPlan: (planId) => readMaterializePlan(admin, planId),
    getUserMetadata: async (userId) => {
      const { data, error } = await admin.auth.admin.getUserById(userId);
      if (error || !data?.user) return null;
      return data.user.user_metadata ?? {};
    },
    // Metadata only: never the password, the email, the providers or the
    // confirmation flags.
    updateUserMetadata: async (userId, metadata) => {
      const { error } = await admin.auth.admin.updateUserById(userId, { user_metadata: metadata });
      return !error;
    },
  };
}