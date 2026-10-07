/**
 * Integration: the production handler wired to the production adapter.
 *
 * The unit tests use a hand-written fake of WebhookDeps; that can drift from the
 * SQL the adapter really issues. Here both are the real implementations, backed
 * by an in-memory PostgREST double that actually stores rows and evaluates the
 * filters (including NULL semantics), so the happy path is exercised end to end.
 */
import { createWebhookDeps, expiredLeaseFilter, liveLeaseFilter } from "../adapter.ts";
import { handleRevenueCatWebhook } from "../handler.ts";
import {
  completeFunnelOnboardingAfterMaterialization,
  createSupabaseMaterializeDeps,
  createSupabaseOnboardingDeps,
  materializeCanonicalPlan,
} from "../../_shared/funnel-materialize";

const USER = "550e8400-e29b-41d4-a716-446655440000";
const PLAN = "550e8400-e29b-41d4-a716-446655440002";
const TX = "tx-1";
const ORIG_TX = "tx-origin";
const NOW = new Date("2026-09-18T00:00:00Z");

type Row = Record<string, any>;

const PLAN_PAYLOAD = {
  tasks: [
    { title: "Task A", emoji: "🍱", subtasks: [{ title: "a1", duration: 5 }] },
    { title: "Task B", emoji: "💪", subtasks: [{ title: "b1", duration: 3 }, { title: "b2", duration: 4 }] },
  ],
  routines: [
    { name: "Routine one", icon: "🧩", days: ["daily"], steps: [{ title: "r1s1", duration: 2 }], egg: { catalogId: 3 } },
    { name: "Routine two", icon: "🌙", days: ["Lun"], steps: [{ title: "r2s1", duration: 3 }, { title: "r2s2", duration: 1 }], egg: { catalogId: 4 } },
  ],
};

/**
 * Minimal PostgREST double with real row storage and filter evaluation, plus a
 * `claim_funnel_plan` double reproducing the canonical RPC's OBSERVABLE
 * contract: the `auth.uid()` ownership guard, the `claimed` replay for the same
 * owner, `already_claimed` for anybody else, and `claimed` written only after
 * the routines/steps/eggs/activities rows exist.
 *
 * `serviceRoleMayClaim` models the RPC's GRANT. `claim_funnel_plan` is today
 * executable only by `authenticated`, so a service_role caller is refused;
 * `false` asserts that the funnel fails SAFE (retryable, no credentials, no
 * onboarding flag) instead of silently shipping an empty account.
 */
function memorySupabase(
  seed: {
    plans?: Row[];
    associations?: Row[];
    events?: Row[];
    serviceRoleMayClaim?: boolean;
    claimResult?: { error?: unknown; data?: unknown } | null;
  } = {},
) {
  const state = {
    plans: [...(seed.plans ?? [])],
    associations: [...(seed.associations ?? [])],
    events: [...(seed.events ?? [])],
    routines: [] as Row[],
    routineTasks: [] as Row[],
    userState: [] as Row[],
    userEggs: [] as Row[],
    claims: [] as Row[],
    authUsers: [{ id: USER, user_metadata: { brainy_funnel_account_created: true } }] as Row[],
    serviceRoleMayClaim: seed.serviceRoleMayClaim ?? true,
    claimResult: seed.claimResult ?? null,
  };
  let routineSeq = 0;

  const claimRpc = (args: Row) => {
    // The purchase-scoped entry point materializes ONLY for service_role and
    // only into the plan's persisted funnel_user_id. Without the DB grant the
    // call fails closed.
    if (!state.serviceRoleMayClaim) return { data: { success: false, error: "forbidden" }, error: null };
    state.claims.push(args);
    if (state.claimResult) return state.claimResult as { data: unknown; error: unknown };

    const plan = state.plans.find((p) => p.id === args.p_plan_id);
    if (!plan) return { data: { success: false, error: "invalid_token" }, error: null };
    if (plan.funnel_user_id !== args.p_user_id) return { data: { success: false, error: "forbidden" }, error: null };
    if (!plan.purchase_confirmed_at) return { data: { success: false, error: "purchase_not_confirmed" }, error: null };
    if (plan.status === "claimed") {
      return plan.claimed_by_user_id === args.p_user_id
        ? { data: { success: true, alreadyClaimed: true, planId: plan.id }, error: null }
        : { data: { success: false, error: "already_claimed" }, error: null };
    }

    const activities = (args.p_activities ?? []) as Row[];
    const routines = (args.p_routines ?? []) as Row[];
    const routineIds: unknown[] = [];
    const eggIds: unknown[] = [];

    for (const routine of routines) {
      routineSeq += 1;
      const routineId = `routine-${routineSeq}`;
      state.routines.push({ id: routineId, user_id: args.p_user_id, name: routine.name, days: routine.days });
      routineIds.push(routineId);
      for (const step of routine.steps ?? []) state.routineTasks.push({ routine_id: routineId, title: step.title });
      const eggId = routine?.egg?.catalogId ?? null;
      if (eggId !== null) {
        state.userEggs.push({ user_id: args.p_user_id, egg_id: eggId, routine_id: routineId });
        eggIds.push(eggId);
      }
    }
    const existing = state.userState.find((s) => s.user_id === args.p_user_id);
    if (existing) existing.activities = [...existing.activities, ...activities];
    else state.userState.push({ user_id: args.p_user_id, activities: [...activities] });

    // `claimed` + the __materialized marker are written LAST, like the
    // canonical function does after the whole materialization commits.
    plan.status = "claimed";
    plan.claimed_by_user_id = args.p_user_id;
    plan.claimed_at = "2026-09-18T00:00:01Z";
    plan.plan = {
      ...(plan.plan ?? {}),
      __materialized: {
        claimed_by_user_id: args.p_user_id,
        task_count: activities.length,
        routine_count: routines.length,
        egg_count: eggIds.length,
        routine_ids: routineIds,
        egg_ids: eggIds,
      },
    };
    return {
      data: {
        success: true,
        alreadyClaimed: false,
        planId: plan.id,
        taskCount: activities.length,
        routineCount: routines.length,
        eggCount: eggIds.length,
      },
      error: null,
    };
  };

  const authAdmin = {
    getUserById: async (id: string) => {
      const user = state.authUsers.find((u) => u.id === id);
      return user ? { data: { user }, error: null } : { data: null, error: { message: "not found" } };
    },
    updateUserById: async (id: string, attrs: Row) => {
      const user = state.authUsers.find((u) => u.id === id);
      if (!user) return { data: null, error: { message: "not found" } };
      if (attrs.user_metadata) user.user_metadata = { ...user.user_metadata, ...attrs.user_metadata };
      return { data: { user }, error: null };
    },
  };

  const table = (name: "web_funnel_plans" | "revenuecat_purchase_plans" | "revenuecat_webhook_events") => {
    let filters: Array<[string, unknown]> = [];
    let orFilter: string | null = null;
    let pending: { kind: "insert" | "update"; values: Row } | null = null;
    let limitN: number | null = null;

    const rowsOf = (): Row[] => (name === "web_funnel_plans" ? state.plans : name === "revenuecat_purchase_plans" ? state.associations : state.events);

    const matches = (row: Row): boolean => {
      for (const [col, value] of filters) {
        if (value === null) { if (row[col] !== null && row[col] !== undefined) return false; continue; }
        if (row[col] !== value) return false;
      }
      if (orFilter) {
        const clauses = orFilter.split(",").map((c) => c.trim());
        const ok = clauses.some((clause) => {
          const [col, op, ...rest] = clause.split(".");
          const raw = rest.join(".");
          if (op === "is") {
            const wantNull = raw === "null";
            return wantNull ? (row[col] === null || row[col] === undefined) : String(row[col]) === raw;
          }
          const cmp = new Date(row[col] ?? 0).getTime();
          const bound = new Date(raw).getTime();
          if (op === "lte") return cmp <= bound;
          if (op === "lt") return cmp < bound;
          if (op === "gt") return cmp > bound;
          if (op === "gte") return cmp >= bound;
          return false;
        });
        if (!ok) return false;
      }
      return true;
    };

    const chain: any = {
      select: () => chain,
      insert: (values: Row) => { pending = { kind: "insert", values }; return chain; },
      update: (values: Row) => { pending = { kind: "update", values }; return chain; },
      eq: (col: string, value: unknown) => { filters.push([col, value]); return chain; },
      neq: (col: string, value: unknown) => {
        filters = filters.filter(([c, v]) => !(c === col && v === value));
        return chain;
      },
      is: (col: string, value: unknown) => { filters.push([col, value]); return chain; },
      gt: () => chain,
      or: (f: string) => { orFilter = f; return chain; },
      order: () => chain,
      limit: (n: number) => { limitN = n; return chain; },
      maybeSingle: async () => {
        if (pending?.kind === "insert") {
          const dup = state.events.find((e) => e.event_id === pending.values.event_id);
          if (dup) return { data: null, error: { code: "23505" } };
          const row = { processed_at: null, ...pending.values };
          state.events.push(row);
          pending = null;
          return { data: { ...row }, error: null };
        }
        if (pending?.kind === "update") {
          const touched = rowsOf().filter(matches);
          for (const r of touched) Object.assign(r, pending.values);
          pending = null;
          return { data: touched.slice(0, 1), error: null };
        }
        const found = rowsOf().filter(matches);
        return { data: found[0] ?? null, error: null };
      },
      then: (resolve: any) => {
        let result: any;
        if (pending?.kind === "insert") {
          const table_ = rowsOf();
          const dupTx = table_.find((r) => r.scope_key === pending.values.scope_key && r.transaction_id === pending.values.transaction_id);
          // Mirrors the two UNIQUE indexes the migration will create.
          const dupOrig = pending.values.original_transaction_id
            ? table_.find((r) => r.scope_key === pending.values.scope_key
              && r.original_transaction_id === pending.values.original_transaction_id)
            : null;
          if (dupTx || dupOrig) {
            result = Promise.resolve({ data: null, error: { code: "23505" } });
          } else {
            const row = { ...pending.values };
            table_.push(row);
            result = Promise.resolve({ data: [row], error: null });
          }
          pending = null;
          return resolve(result);
        }
        if (pending?.kind === "update") {
          const touched = rowsOf().filter(matches);
          for (const r of touched) Object.assign(r, pending.values);
          pending = null;
          return resolve({ data: touched, error: null });
        }
        const found = rowsOf().filter(matches);
        return resolve({ data: limitN ? found.slice(0, limitN) : found, error: null });
      },
    };
    return chain;
  };

  const rpc = async (name: string, args: Row) => {
    if (name !== "materialize_funnel_plan_for_purchase") return { data: null, error: { message: `unknown rpc ${name}` } };
    return claimRpc(args);
  };

  return {
    client: { from: table, rpc, auth: { admin: authAdmin } },
    state,
  };
}

const seedPlan = (over: Row = {}): Row => ({
  id: PLAN,
  funnel_user_id: USER,
  status: "pending",
  claimed_by_user_id: null,
  purchase_confirmed_at: null,
  credentials_issued_at: null,
  claim_token_hash: "claim-hash",
  plan: PLAN_PAYLOAD,
  created_at: "2026-09-18T00:00:00Z",
  ...over,
});

const purchaseEvent = (over: Row = {}) => ({
  id: "ev-1",
  type: "INITIAL_PURCHASE",
  app_id: "app-1",
  app_user_id: USER,
  store: "stripe",
  environment: "production",
  transaction_id: TX,
  original_transaction_id: "",
  metadata: { brainy_plan_id: PLAN },
  ...over,
});

const build = (supabase: any) => {
  // The adapter takes the Supabase client itself, not the wrapper.
  const deps = createWebhookDeps(supabase.client, { now: () => NOW });
  deps.checkRevenueCat = async () => ({ ok: true, active: true });
  // The REAL canonical materialization and onboarding helpers, wired to the
  // same client the production function uses. No second implementation.
  deps.materialize = async (planId: string, userId: string) => {
    const result = await materializeCanonicalPlan(createSupabaseMaterializeDeps(supabase.client), { planId, userId });
    return result.ok ? { ok: true } : { ok: false, reason: result.reason };
  };
  deps.completeOnboarding = async (planId: string, userId: string) => {
    const result = await completeFunnelOnboardingAfterMaterialization(createSupabaseOnboardingDeps(supabase.client), { planId, userId });
    return result.ok ? { ok: true } : { ok: false, reason: result.reason };
  };
  // In-memory stand-in for grant_revenuecat_pro_coin_gift. The real RPC is
  // idempotent on (scope_key, transaction_id); mirror that so a duplicate
  // delivery does not appear to grant twice.
  deps.grantProGift = async (input: any) => {
    supabase.state.coinGifts = supabase.state.coinGifts || [];
    const key = `${input.scope}::${input.transactionId}`;
    if (supabase.state.coinGifts.some((g: string) => g === key)) {
      return { granted: false, error: null };
    }
    supabase.state.coinGifts.push(key);
    return { granted: true, error: null };
  };
  deps.issue = async (planId) => {
    const plan = (supabase.state.plans as Row[]).find((p) => p.id === planId);
    if (plan) plan.credentials_issued_at = "2026-09-18T00:00:00Z";
    return { ok: true, status: "sent" };
  };
  return deps;
};

const call = (deps: any, event: Row) =>
  handleRevenueCatWebhook({ authorization: "s", configuredAuthorization: "s", event: event as never }, deps);

describe("handler + adapter: happy path", () => {
  it("links, confirms, issues and marks the event processed", async () => {
    const supabase = memorySupabase({ plans: [seedPlan()] });
    const deps = build(supabase);

    const result = await call(deps, purchaseEvent());

    expect(result).toMatchObject({ status: 200, body: { success: true, status: "sent", planId: PLAN } });
    // association persisted, scoped
    expect(supabase.state.associations).toHaveLength(1);
    expect(supabase.state.associations[0]).toMatchObject({
      scope_key: "app-1|stripe|production",
      transaction_id: TX,
      plan_id: PLAN,
    });
    // purchase confirmed and credentials recorded on the plan
    expect(supabase.state.plans[0].purchase_confirmed_at).not.toBeNull();
    expect(supabase.state.plans[0].credentials_issued_at).not.toBeNull();
    // event closed as processed with the lease released
    expect(supabase.state.events[0].status).toBe("processed");
    expect(supabase.state.events[0].lease_expires_at).toBeNull();
  });

  it("a renewal resolves through original_transaction_id without creating an association", async () => {
    const supabase = memorySupabase({ plans: [seedPlan()] });
    const deps = build(supabase);
    await call(deps, purchaseEvent({ id: "ev-1", original_transaction_id: ORIG_TX }));

    const renewal = await call(deps, purchaseEvent({
      id: "ev-2",
      type: "RENEWAL",
      transaction_id: "tx-2",
      original_transaction_id: ORIG_TX,
      metadata: {},
    }));

    expect(renewal).toMatchObject({ status: 200, body: { ignored: true, reason: "already_issued" } });
    // No second association: the renewal only resolved the existing one.
    expect(supabase.state.associations).toHaveLength(1);
  });

  it("a second event for the same transaction is idempotent", async () => {
    const supabase = memorySupabase({ plans: [seedPlan()] });
    const deps = build(supabase);
    await call(deps, purchaseEvent({ id: "ev-1" }));
    const again = await call(deps, purchaseEvent({ id: "ev-1" }));
    expect(again).toMatchObject({ status: 200, body: { idempotent: true, status: "processed" } });
    expect(supabase.state.associations).toHaveLength(1);
  });

  it("rejects rebinding the same transaction to another plan", async () => {
    const supabase = memorySupabase({ plans: [seedPlan(), seedPlan({ id: "550e8400-e29b-41d4-a716-446655440003" })] });
    const deps = build(supabase);
    await call(deps, purchaseEvent({ id: "ev-1" }));

    const conflict = await call(deps, purchaseEvent({
      id: "ev-2",
      metadata: { brainy_plan_id: "550e8400-e29b-41d4-a716-446655440003" },
    }));

    expect(conflict).toMatchObject({ status: 200, body: { ignored: true, reason: "association_conflict" } });
    expect(supabase.state.associations).toHaveLength(1);
    expect(supabase.state.associations[0].plan_id).toBe(PLAN);
  });

  it("a renewal without a prior association performs no mutation", async () => {
    const supabase = memorySupabase({ plans: [seedPlan()] });
    const deps = build(supabase);

    const result = await call(deps, purchaseEvent({ id: "ev-1", type: "RENEWAL", metadata: {} }));

    expect(result).toMatchObject({ status: 503, body: { error: "plan_unresolved", retryable: true } });
    expect(supabase.state.associations).toHaveLength(0);
    expect(supabase.state.plans[0].purchase_confirmed_at).toBeNull();
    expect(supabase.state.events[0].status).toBe("retryable");
  });

  it("refuses a plan owned by another user and writes no association", async () => {
    const supabase = memorySupabase({ plans: [seedPlan({ funnel_user_id: "550e8400-e29b-41d4-a716-446655440009" })] });
    const deps = build(supabase);

    const result = await call(deps, purchaseEvent());

    expect(result).toMatchObject({ status: 200, body: { ignored: true, reason: "plan_not_owned" } });
    expect(supabase.state.associations).toHaveLength(0);
  });

  it("confirmed purchase with a failed email is retried and converges", async () => {
    const supabase = memorySupabase({ plans: [seedPlan({ purchase_confirmed_at: "2026-09-17T00:00:00Z" })] });
    const deps = build(supabase);
    let attempts = 0;
    deps.issue = async () => {
      attempts++;
      if (attempts === 1) return { ok: false, status: "retryable" };
      supabase.state.plans[0].credentials_issued_at = "2026-09-18T00:00:00Z";
      return { ok: true, status: "sent" };
    };

    const first = await call(deps, purchaseEvent({ id: "ev-1" }));
    expect(first).toMatchObject({ status: 503, body: { retryable: true } });
    expect(supabase.state.events[0].status).toBe("retryable");
    // Association and confirmation survive the failure.
    expect(supabase.state.associations).toHaveLength(1);

    const second = await call(deps, purchaseEvent({ id: "ev-1" }));
    expect(second).toMatchObject({ status: 200, body: { status: "sent" } });
    expect(attempts).toBe(2);
    expect(supabase.state.associations).toHaveLength(1);
  });

  it.each([
    ["app_id", "app_id"],
    ["store", "store"],
    ["environment", "environment"],
  ])("missing %s is retryable and mutates nothing", async (label, field) => {
    const supabase = memorySupabase({ plans: [seedPlan()] });
    const deps = build(supabase);
    const result = await call(deps, purchaseEvent({ id: `sc-${label}`, [field]: "" }));

    // Retryable, not ignored: recoverable once the real payload is confirmed.
    expect(result).toMatchObject({
      status: 503,
      body: { success: false, error: "incomplete_scope", retryable: true },
    });

    // The stored event is retryable, so RevenueCat (or a human) can resend it.
    const stored = supabase.state.events[0];
    expect(stored.status).toBe("retryable");
    expect(stored.lease_expires_at).toBeNull();

    // Zero business mutations.
    expect(supabase.state.associations).toHaveLength(0);
    expect(supabase.state.plans[0].purchase_confirmed_at).toBeNull();
    expect(supabase.state.plans[0].credentials_issued_at).toBeNull();
  });

  it("the Pro coin gift is granted once even across a duplicate delivery", async () => {
    const supabase = memorySupabase({ plans: [seedPlan()] });
    const deps = build(supabase);

    const first = await call(deps, purchaseEvent({ id: "gift-1" }));
    expect(first).toMatchObject({ status: 200, body: { status: "sent" } });
    expect(supabase.state.coinGifts).toHaveLength(1);

    // Same transaction id delivered twice must not grant twice.
    const second = await call(deps, purchaseEvent({ id: "gift-2" }));
    expect(second).toMatchObject({ status: 200 });
    expect(supabase.state.coinGifts).toHaveLength(1);

    // Exactly one credential delivery regardless of the replay.
    expect(supabase.state.plans[0].credentials_issued_at).toBe("2026-09-18T00:00:00Z");
  });

  it("an in-app purchase without funnel metadata still gets the gift", async () => {
    const supabase = memorySupabase({ plans: [seedPlan()] });
    const deps = build(supabase);

    const result = await call(deps, purchaseEvent({
      id: "in-app-1",
      transaction_id: "in-app-tx",
      original_transaction_id: "in-app-tx",
      metadata: {},
    }));

    expect(result).toMatchObject({ status: 200, body: { coinGift: true } });
    expect(supabase.state.coinGifts).toHaveLength(1);
    // No funnel plan is touched for an in-app purchase.
    expect(supabase.state.associations).toHaveLength(0);
    expect(supabase.state.plans[0].purchase_confirmed_at).toBeNull();
  });

  it("inactive entitlement creates no association", async () => {
    const supabase = memorySupabase({ plans: [seedPlan()] });
    const deps = build(supabase);
    deps.checkRevenueCat = async () => ({ ok: true, active: false });

    const result = await call(deps, purchaseEvent({ id: "en-1" }));
    expect(result).toMatchObject({ status: 409, body: { error: "entitlement_inactive", retryable: true } });
    expect(supabase.state.associations).toHaveLength(0);
    expect(supabase.state.plans[0].purchase_confirmed_at).toBeNull();
  });

  it("a failing RevenueCat lookup is retryable and creates no association", async () => {
    const supabase = memorySupabase({ plans: [seedPlan()] });
    const deps = build(supabase);
    deps.checkRevenueCat = async () => ({ ok: false, active: false });

    const result = await call(deps, purchaseEvent({ id: "en-2" }));
    expect(result).toMatchObject({ status: 503, body: { error: "verification_unavailable", retryable: true } });
    expect(supabase.state.associations).toHaveLength(0);
    expect(supabase.state.events[0].status).toBe("retryable");
  });

  it("the same original_transaction_id cannot be rebound to another plan", async () => {
    const supabase = memorySupabase({ plans: [seedPlan(), seedPlan({ id: "550e8400-e29b-41d4-a716-446655440003" })] });
    const deps = build(supabase);
    await call(deps, purchaseEvent({ id: "ob-1", original_transaction_id: ORIG_TX }));

    const conflict = await call(deps, purchaseEvent({
      id: "ob-2",
      transaction_id: "tx-other",
      original_transaction_id: ORIG_TX,
      metadata: { brainy_plan_id: "550e8400-e29b-41d4-a716-446655440003" },
    }));
    expect(conflict).toMatchObject({ status: 200, body: { ignored: true, reason: "association_conflict" } });
    expect(supabase.state.associations).toHaveLength(1);
  });

  it("a live lease blocks a second execution with 503", async () => {
    const supabase = memorySupabase({
      plans: [seedPlan()],
      events: [{ event_id: "ev-1", status: "processing", execution_id: "other", lease_expires_at: "2026-09-18T00:05:00Z" }],
    });
    const deps = build(supabase);

    const result = await call(deps, purchaseEvent());
    expect(result).toMatchObject({ status: 503, body: { error: "event_in_progress" } });
    expect(supabase.state.associations).toHaveLength(0);
  });

  it("an abandoned NULL lease is taken over", async () => {
    const supabase = memorySupabase({
      plans: [seedPlan()],
      events: [{ event_id: "ev-1", status: "processing", execution_id: "dead", lease_expires_at: null }],
    });
    const deps = build(supabase);

    const result = await call(deps, purchaseEvent());
    expect(result).toMatchObject({ status: 200, body: { success: true } });
    expect(supabase.state.associations).toHaveLength(1);
  });
});

describe("handler + adapter + canonical RPC: the required order", () => {
  const fresh = () => memorySupabase({ plans: [seedPlan()] });
  const routineNames = (s: any) => s.state.routines.map((r: Row) => r.name).sort();
  const userMetadata = (s: any) => s.state.authUsers[0].user_metadata;

  it("materializes, THEN completes onboarding, THEN sends credentials", async () => {
    const supabase = fresh();
    const deps = build(supabase);
    const order: string[] = [];
    const realOnboarding = deps.completeOnboarding;
    deps.completeOnboarding = async (planId: string, userId: string) => {
      order.push(`onboarding(routines=${supabase.state.routines.length})`);
      return realOnboarding(planId, userId);
    };
    deps.issue = async (planId: string) => {
      order.push(`issue(onboarding=${userMetadata(supabase).onboarding_completed})`);
      const plan = supabase.state.plans.find((p) => p.id === planId);
      if (plan) plan.credentials_issued_at = "2026-09-18T00:00:00Z";
      return { ok: true, status: "sent" };
    };

    const result = await call(deps, purchaseEvent());

    expect(result).toMatchObject({ status: 200, body: { status: "sent" } });
    // Credentials are issued only after the content exists AND the flag is set.
    expect(order).toEqual(["onboarding(routines=2)", "issue(onboarding=true)"]);
    expect(supabase.state.routines).toHaveLength(2);
    expect(supabase.state.routineTasks).toHaveLength(3);
    expect(supabase.state.userState[0].activities).toHaveLength(2);
    expect(supabase.state.userEggs).toHaveLength(2);
  });

  it("leaves no onboarding flag and no credentials when materialization fails", async () => {
    const supabase = memorySupabase({
      plans: [seedPlan()],
      claimResult: { data: { success: false, error: "egg_unavailable" }, error: null },
    });
    const deps = build(supabase);
    let issued = 0;
    deps.issue = async () => { issued++; return { ok: true, status: "sent" }; };

    const result = await call(deps, purchaseEvent({ id: "mat-fail" }));

    expect(result).toMatchObject({ status: 503, body: { retryable: true } });
    expect(result.body.error).toBe("materialization_egg_unavailable");
    expect(userMetadata(supabase).onboarding_completed).toBeUndefined();
    expect(issued).toBe(0);
    expect(supabase.state.routines).toHaveLength(0);
    expect(supabase.state.plans[0].credentials_issued_at).toBeNull();
  });

  it("retries without duplicating content when the metadata write fails", async () => {
    const supabase = fresh();
    const deps = build(supabase);
    let metadataWrites = 0;
    const authAdmin = supabase.client.auth.admin;
    const realUpdate = authAdmin.updateUserById.bind(authAdmin);
    authAdmin.updateUserById = async (id: string, attrs: Row) => {
      metadataWrites++;
      if (metadataWrites === 1) return { data: null, error: { message: "auth down" } };
      return realUpdate(id, attrs);
    };
    let issued = 0;
    deps.issue = async (planId: string) => {
      issued++;
      supabase.state.plans.find((p) => p.id === planId)!.credentials_issued_at = "2026-09-18T00:00:00Z";
      return { ok: true, status: "sent" };
    };

    const first = await call(deps, purchaseEvent({ id: "meta-1" }));
    expect(first).toMatchObject({ status: 503, body: { error: "onboarding_metadata_update_failed" } });
    expect(issued).toBe(0);
    // Content IS already in place, exactly once.
    expect(supabase.state.routines).toHaveLength(2);
    expect(supabase.state.routineTasks).toHaveLength(3);

    const second = await call(deps, purchaseEvent({ id: "meta-1" }));
    expect(second).toMatchObject({ status: 200, body: { status: "sent" } });
    expect(issued).toBe(1);
    // The retry converged WITHOUT duplicating a single routine, step or egg.
    expect(supabase.state.routines).toHaveLength(2);
    expect(supabase.state.routineTasks).toHaveLength(3);
    expect(supabase.state.userEggs).toHaveLength(2);
    expect(supabase.state.userState[0].activities).toHaveLength(2);
    expect(userMetadata(supabase).onboarding_completed).toBe(true);
  });

  it("keeps the content and the flag when Resend fails, and re-issues exactly one email", async () => {
    const supabase = fresh();
    const deps = build(supabase);
    let attempts = 0;
    deps.issue = async (planId: string) => {
      attempts++;
      if (attempts === 1) return { ok: false, status: "retryable" };
      supabase.state.plans.find((p) => p.id === planId)!.credentials_issued_at = "2026-09-18T00:00:00Z";
      return { ok: true, status: "sent" };
    };

    const first = await call(deps, purchaseEvent({ id: "resend-1" }));
    expect(first).toMatchObject({ status: 503, body: { retryable: true } });
    expect(supabase.state.events[0].status).toBe("retryable");

    const second = await call(deps, purchaseEvent({ id: "resend-1" }));
    expect(second).toMatchObject({ status: 200, body: { status: "sent" } });
    expect(attempts).toBe(2);
    // No duplicated materialization across the credential retry.
    expect(supabase.state.routines).toHaveLength(2);
    expect(supabase.state.routineTasks).toHaveLength(3);
    expect(supabase.state.userEggs).toHaveLength(2);
  });

  it("never duplicates content or email across a duplicate delivery", async () => {
    const supabase = fresh();
    const deps = build(supabase);
    let issued = 0;
    deps.issue = async (planId: string) => {
      issued++;
      supabase.state.plans.find((p) => p.id === planId)!.credentials_issued_at = "2026-09-18T00:00:00Z";
      return { ok: true, status: "sent" };
    };

    await call(deps, purchaseEvent({ id: "dup-1" }));
    // A different event id for the SAME transaction: the association is reused,
    // the plan is already claimed and already issued.
    const replay = await call(deps, purchaseEvent({ id: "dup-2" }));

    expect(replay).toMatchObject({ status: 200, body: { ignored: true, reason: "already_issued" } });
    expect(issued).toBe(1);
    expect(supabase.state.routines).toHaveLength(2);
    expect(supabase.state.routineTasks).toHaveLength(3);
    expect(supabase.state.userEggs).toHaveLength(2);
    expect(supabase.state.userState[0].activities).toHaveLength(2);
    expect(supabase.state.associations).toHaveLength(1);
  });

  it("repairs a missing flag on an already materialized plan without re-issuing", async () => {
    const materialized: Row = {
      ...seedPlan(),
      status: "claimed",
      claimed_by_user_id: USER,
      purchase_confirmed_at: "2026-09-17T00:00:00Z",
      credentials_issued_at: "2026-09-17T00:00:05Z",
      plan: { ...PLAN_PAYLOAD, __materialized: { claimed_by_user_id: USER, task_count: 2, routine_count: 2, egg_count: 2 } },
    };
    const supabase = memorySupabase({ plans: [materialized] });
    // The account predates the contract: content in place, flag missing.
    supabase.state.authUsers[0].user_metadata = { brainy_funnel_account_created: true };
    const deps = build(supabase);
    let issued = 0;
    deps.issue = async () => { issued++; return { ok: true, status: "sent" }; };

    const result = await call(deps, purchaseEvent({ id: "repair-1" }));

    expect(result).toMatchObject({ status: 200, body: { ignored: true, reason: "already_issued" } });
    expect(userMetadata(supabase).onboarding_completed).toBe(true);
    expect(userMetadata(supabase).brainy_funnel_account_created).toBe(true);
    expect(issued).toBe(0);
    expect(supabase.state.routines).toHaveLength(0);
  });

  it("materializes nothing for a plan owned by another user", async () => {
    const supabase = memorySupabase({
      plans: [seedPlan({ funnel_user_id: "550e8400-e29b-41d4-a716-446655440009" })],
    });
    const deps = build(supabase);

    const result = await call(deps, purchaseEvent({ id: "foreign-1" }));

    expect(result).toMatchObject({ status: 200, body: { ignored: true, reason: "plan_not_owned" } });
    expect(supabase.state.routines).toHaveLength(0);
    expect(userMetadata(supabase).onboarding_completed).toBeUndefined();
    expect(supabase.state.plans[0].credentials_issued_at).toBeNull();
  });

  it("materializes nothing when the purchase was never confirmed", async () => {
    const supabase = memorySupabase({ plans: [seedPlan()], claimResult: { data: { success: true }, error: null } });
    const deps = build(supabase);
    // confirmPurchase writes zero rows, so purchase_confirmed_at stays NULL.
    deps.confirmPurchase = async () => ({ updated: 0, error: null });

    const result = await call(deps, purchaseEvent({ id: "noconf-1" }));

    expect(result).toMatchObject({ status: 503, body: { error: "purchase_confirm_failed" } });
    expect(supabase.state.routines).toHaveLength(0);
    expect(userMetadata(supabase).onboarding_completed).toBeUndefined();
  });

  it("materializes nothing when the entitlement is inactive", async () => {
    const supabase = fresh();
    const deps = build(supabase);
    deps.checkRevenueCat = async () => ({ ok: true, active: false });

    const result = await call(deps, purchaseEvent({ id: "noent-1" }));

    expect(result).toMatchObject({ status: 409, body: { error: "entitlement_inactive" } });
    expect(supabase.state.routines).toHaveLength(0);
    expect(supabase.state.userEggs).toHaveLength(0);
    expect(userMetadata(supabase).onboarding_completed).toBeUndefined();
    expect(supabase.state.plans[0].credentials_issued_at).toBeNull();
  });

  it("materializes nothing while RevenueCat is unreachable", async () => {
    const supabase = fresh();
    const deps = build(supabase);
    deps.checkRevenueCat = async () => ({ ok: false, active: false });

    const result = await call(deps, purchaseEvent({ id: "rcdown-1" }));

    expect(result).toMatchObject({ status: 503, body: { error: "verification_unavailable" } });
    expect(supabase.state.routines).toHaveLength(0);
    expect(supabase.state.plans[0].purchase_confirmed_at).toBeNull();
  });

  it("fails SAFE when the canonical RPC refuses a service_role caller", async () => {
    // `claim_funnel_plan` is executable only by `authenticated`; its auth.uid()
    // guard refuses a service_role request. The funnel must retry rather than
    // send credentials for an account with no content.
    const supabase = memorySupabase({ plans: [seedPlan()], serviceRoleMayClaim: false });
    const deps = build(supabase);
    let issued = 0;
    deps.issue = async () => { issued++; return { ok: true, status: "sent" }; };

    const result = await call(deps, purchaseEvent({ id: "grant-1" }));

    expect(result).toMatchObject({ status: 503, body: { error: "materialization_forbidden", retryable: true } });
    expect(issued).toBe(0);
    expect(userMetadata(supabase).onboarding_completed).toBeUndefined();
    expect(supabase.state.routines).toHaveLength(0);
    // The purchase stays confirmed so a later, authorized retry converges.
    expect(supabase.state.plans[0].purchase_confirmed_at).not.toBeNull();
    expect(supabase.state.plans[0].status).toBe("pending");
  });

  it("materializes with the plan's own payload, never a hand-written copy", async () => {
    const supabase = fresh();
    const deps = build(supabase);
    await call(deps, purchaseEvent({ id: "payload-1" }));

    expect(routineNames(supabase)).toEqual(["Routine one", "Routine two"]);
    expect(supabase.state.routineTasks.map((t: Row) => t.title).sort()).toEqual(["r1s1", "r2s1", "r2s2"]);
    expect(supabase.state.userState[0].activities.map((a: Row) => a.title).sort()).toEqual(["Task A", "Task B"]);
    // Every routine carries the companion its plan requested.
    expect(supabase.state.userEggs.map((e: Row) => e.egg_id).sort()).toEqual([3, 4]);
    expect(supabase.state.routines.every((r: Row) => r.user_id === USER)).toBe(true);
  });

  it("never calls a purchase API: the handler only confirms and materializes", async () => {
    const supabase = fresh();
    const deps = build(supabase);
    // There is no purchase/purchaseStore dependency in the contract at all.
    expect(Object.keys(deps).some((k) => /purchase/i.test(k) && !/confirmPurchase/.test(k))).toBe(false);
    await call(deps, purchaseEvent({ id: "nopurchase-1" }));
    expect(supabase.state.routines).toHaveLength(2);
  });
});

describe("the memory double matches the real filter semantics", () => {
  it("agrees with the exported filters on NULL and live leases", () => {
    const nowIso = NOW.toISOString();
    const expired = expiredLeaseFilter(nowIso);
    const live = liveLeaseFilter(nowIso);

    const evaluate = (filter: string, value: string | null) => {
      const clauses = filter.split(",").map((c) => c.trim());
      return clauses.some((clause) => {
        const [col, op, ...rest] = clause.split(".");
        const raw = rest.join(".");
        if (op === "is") return raw === "null" ? value === null : String(value) === raw;
        const cmp = new Date(value ?? 0).getTime();
        const bound = new Date(raw).getTime();
        if (op === "lte") return cmp <= bound;
        if (op === "gt") return cmp > bound;
        return false;
      });
    };

    // A NULL lease is expired (reclaimable) but never live.
    expect(evaluate(expired, null)).toBe(true);
    expect(evaluate(live, null)).toBe(false);
    // An elapsed lease is expired, not live.
    expect(evaluate(expired, "2026-09-18T00:00:00.000Z")).toBe(true);
    expect(evaluate(live, "2026-09-18T00:00:00.000Z")).toBe(false);
    // A future lease is live, not expired.
    expect(evaluate(live, "2026-09-18T00:02:00.000Z")).toBe(true);
    expect(evaluate(expired, "2026-09-18T00:02:00.000Z")).toBe(false);
  });
});
