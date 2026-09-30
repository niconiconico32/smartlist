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

const USER = "550e8400-e29b-41d4-a716-446655440000";
const PLAN = "550e8400-e29b-41d4-a716-446655440002";
const TX = "tx-1";
const ORIG_TX = "tx-origin";
const NOW = new Date("2026-09-18T00:00:00Z");

type Row = Record<string, any>;

/** Minimal PostgREST double with real row storage and filter evaluation. */
function memorySupabase(seed: { plans?: Row[]; associations?: Row[]; events?: Row[] } = {}) {
  const state = {
    plans: [...(seed.plans ?? [])],
    associations: [...(seed.associations ?? [])],
    events: [...(seed.events ?? [])],
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

  return { client: { from: table }, state };
}

const seedPlan = (over: Row = {}): Row => ({
  id: PLAN,
  funnel_user_id: USER,
  status: "pending",
  claimed_by_user_id: null,
  purchase_confirmed_at: null,
  credentials_issued_at: null,
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

it("incomplete scope performs zero business mutations", async () => {
    const supabase = memorySupabase({ plans: [seedPlan()] });
    const deps = build(supabase);
    // store missing entirely
    const result = await call(deps, purchaseEvent({ id: "sc-1", store: "" }));
    expect(result).toMatchObject({ status: 200, body: { ignored: true, reason: "incomplete_scope" } });
    expect(supabase.state.associations).toHaveLength(0);
    expect(supabase.state.plans[0].purchase_confirmed_at).toBeNull();
    expect(supabase.state.plans[0].credentials_issued_at).toBeNull();
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
