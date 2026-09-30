/**
 * SQL adapter tests.
 *
 * These assert the query construction the production adapter performs, so a fake
 * in the handler tests cannot hide a divergence — in particular the NULL-lease
 * rule, which must be identical in the handler and in the SQL.
 */
import { createWebhookDeps, expiredLeaseFilter } from "../adapter.ts";

const NOW = new Date("2026-09-18T00:00:00Z");
const NOW_ISO = NOW.toISOString();

type Call = { op: string; args: unknown[] };

/** Minimal query-builder recorder mirroring the PostgREST surface we use. */
function recorder(responses: Record<string, { data?: any; error?: any }> = {}) {
  const calls: Call[] = [];
  const chain: any = {
    select: (...a: unknown[]) => { calls.push({ op: "select", args: a }); return chain; },
    insert: (...a: unknown[]) => { calls.push({ op: "insert", args: a }); return chain; },
    update: (...a: unknown[]) => { calls.push({ op: "update", args: a }); return chain; },
    eq: (...a: unknown[]) => { calls.push({ op: "eq", args: a }); return chain; },
    neq: (...a: unknown[]) => { calls.push({ op: "neq", args: a }); return chain; },
    is: (...a: unknown[]) => { calls.push({ op: "is", args: a }); return chain; },
    lt: (...a: unknown[]) => { calls.push({ op: "lt", args: a }); return chain; },
    lte: (...a: unknown[]) => { calls.push({ op: "lte", args: a }); return chain; },
    or: (...a: unknown[]) => { calls.push({ op: "or", args: a }); return chain; },
    order: (...a: unknown[]) => { calls.push({ op: "order", args: a }); return chain; },
    limit: (...a: unknown[]) => { calls.push({ op: "limit", args: a }); return chain; },
    maybeSingle: async () => { calls.push({ op: "maybeSingle", args: [] }); return responses.maybeSingle ?? { data: null, error: null }; },
    single: async () => { calls.push({ op: "single", args: [] }); return responses.single ?? { data: null, error: null }; },
    then: async (resolve: any) => {
      calls.push({ op: "then", args: [] });
      // supabase-js resolves a builder to the { data, error } envelope; a bare
      // array is also supported and must be normalized by the adapter.
      return resolve(responses.bareRows ? (responses.then ?? []) : { data: responses.then ?? [], error: null });
    },
  };
  const client = {
    from: (name: string) => { calls.push({ op: "from", args: [name] }); return chain; },
  };
  return { client, calls, chain };
}

const ops = (calls: Call[]) => calls.map((c) => c.op);
const has = (calls: Call[], op: string, arg?: unknown) =>
  calls.some((c) => c.op === op && (arg === undefined || (c.args as any[])[0] === arg));

describe("lease filter parity", () => {
  it("includes a NULL lease so it matches the handler's reclaim rule", () => {
    const filter = expiredLeaseFilter(NOW_ISO);
    expect(filter).toContain("lease_expires_at.is.null");
    expect(filter).toContain(`lease_expires_at.lte.${NOW_ISO}`);
  });

  it("never uses lt alone (a NULL lease would never match)", () => {
    expect(expiredLeaseFilter(NOW_ISO)).not.toMatch(/lease_expires_at\.lt\./);
  });
});

describe("claimExpiredEvent", () => {
  it("takes over an abandoned processing event using the NULL-inclusive filter", async () => {
    const r = recorder();
    const deps = createWebhookDeps(r.client, { now: () => NOW });
    await deps.claimExpiredEvent("ev-1", "exec-1", "later");

    expect(r.calls[0].op).toBe("from");
    expect((r.calls[0].args as string[])[0]).toBe("revenuecat_webhook_events");
    expect(has(r.calls, "eq", "event_id")).toBe(true);
    expect(has(r.calls, "eq", "status")).toBe(true);
    const orCall = r.calls.find((c) => c.op === "or");
    expect(orCall).toBeDefined();
    expect((orCall!.args as string[])[0]).toBe(expiredLeaseFilter(NOW_ISO));
    // A bare lt would make NULL-lease rows unclaimable.
    expect(has(r.calls, "lt")).toBe(false);
  });
});

describe("holdsLease", () => {
  it("requires event_id + execution_id + status and the same expiry rule", async () => {
    const r = recorder({ then: [{ event_id: "ev-1" }] });
    const deps = createWebhookDeps(r.client, { now: () => NOW });
    const result = await deps.holdsLease("ev-1", "exec-1");

    expect(has(r.calls, "eq", "event_id")).toBe(true);
    expect(has(r.calls, "eq", "execution_id")).toBe(true);
    expect(has(r.calls, "eq", "status")).toBe(true);
    const orCall = r.calls.find((c) => c.op === "or");
    expect((orCall!.args as string[])[0]).toBe(expiredLeaseFilter(NOW_ISO));
    expect(result.held).toBe(true);
  });

  it("reports held=false when no row matches", async () => {
    const r = recorder({ then: [] });
    const deps = createWebhookDeps(r.client, { now: () => NOW });
    expect((await deps.holdsLease("ev-1", "exec-1")).held).toBe(false);
  });
});

describe("finishEvent", () => {
  it("scopes the write to the owning execution and reports affected rows", async () => {
    const r = recorder({ then: [{ event_id: "ev-1" }] });
    const deps = createWebhookDeps(r.client, { now: () => NOW });
    const result = await deps.finishEvent("ev-1", "exec-1", "retryable");

    expect(has(r.calls, "eq", "execution_id")).toBe(true);
    expect(result.updated).toBe(1);
  });

  it("returns zero when the execution no longer owns the row", async () => {
    const r = recorder({ then: [] });
    const deps = createWebhookDeps(r.client, { now: () => NOW });
    expect((await deps.finishEvent("ev-1", "exec-1", "processed")).updated).toBe(0);
  });

  it("normalizes a builder that resolves to a bare rows array", async () => {
    const r = recorder({ then: [{ event_id: "ev-1" }], bareRows: true });
    const deps = createWebhookDeps(r.client, { now: () => NOW });
    // Without normalization this would report 0 rows and look like a lost race.
    expect((await deps.finishEvent("ev-1", "exec-1", "processed")).updated).toBe(1);
  });
});

describe("insertEvent", () => {
  it("treats a duplicate event id as an existing row, not a store failure", async () => {
    const r = recorder({ maybeSingle: { data: null, error: { code: "23505" } } });
    const deps = createWebhookDeps(r.client, { now: () => NOW });
    const result = await deps.insertEvent("ev-1", "INITIAL_PURCHASE", "u", "exec-1", "later");
    expect(result.created).toBe(false);
    expect(result.error).toBeNull();
  });

  it("propagates any other error", async () => {
    const r = recorder({ maybeSingle: { data: null, error: { code: "08006" } } });
    const deps = createWebhookDeps(r.client, { now: () => NOW });
    expect((await deps.insertEvent("ev-1", "T", "u", "e", "l")).error).toBeTruthy();
  });
});

describe("resolveAssociation", () => {
  const input = {
    scope: "app|stripe|production",
    transactionId: "tx-1",
    subscriptionId: "sub-1",
    appUserId: "550e8400-e29b-41d4-a716-446655440000",
    declaredPlanId: "550e8400-e29b-41d4-a716-446655440002",
  };

  it("an existing association wins over a conflicting declaration", async () => {
    const r = recorder({ maybeSingle: { data: { plan_id: "550e8400-e29b-41d4-a716-446655440009" } } });
    const deps = createWebhookDeps(r.client, { now: () => NOW });
    const result = await deps.resolveAssociation(input);
    expect(result).toMatchObject({ status: "conflict" });
    // No insert was attempted.
    expect(has(r.calls, "insert")).toBe(false);
  });

  it("does not create an association without a declared plan", async () => {
    const r = recorder();
    const deps = createWebhookDeps(r.client, { now: () => NOW });
    const result = await deps.resolveAssociation({ ...input, declaredPlanId: "" });
    expect(result).toMatchObject({ status: "unresolved" });
    expect(has(r.calls, "insert")).toBe(false);
  });

  it("does not create an association without a transaction id", async () => {
    const r = recorder();
    const deps = createWebhookDeps(r.client, { now: () => NOW });
    const result = await deps.resolveAssociation({ ...input, transactionId: "" });
    expect(result).toMatchObject({ status: "unresolved" });
    expect(has(r.calls, "insert")).toBe(false);
  });

  it("inserts the association for a declaring event", async () => {
    const r = recorder();
    const deps = createWebhookDeps(r.client, { now: () => NOW });
    const result = await deps.resolveAssociation(input);
    expect(result).toMatchObject({ status: "linked", planId: input.declaredPlanId });
    expect(has(r.calls, "insert")).toBe(true);
  });

  it("adopts the winner when a concurrent inserter took the purchase", async () => {
    // Reads performed by resolveAssociation:
    //   1) pre-insert lookup by transaction -> nothing
    //   2) pre-insert lookup by subscription -> nothing
    //   3) post-violation lookup by transaction -> the winner's plan
    const responses: Array<{ data: any; error: any }> = [
      { data: null, error: null },
      { data: null, error: null },
      { data: { plan_id: "550e8400-e29b-41d4-a716-446655440002" }, error: null },
    ];
    let read = 0;
    const next = () => responses[Math.min(read++, responses.length - 1)];

    const insertBuilder = {
      then: (resolve: any) => Promise.resolve(resolve({ data: null, error: { code: "23505" } })),
    };
    const chain: any = {
      select: () => chain,
      update: () => chain,
      eq: () => chain,
      is: () => chain,
      or: () => chain,
      order: () => chain,
      limit: () => chain,
      insert: () => insertBuilder,
      maybeSingle: async () => next(),
      then: (resolve: any) => Promise.resolve(resolve(next())),
    };
    const deps = createWebhookDeps({ from: () => chain } as any, { now: () => NOW });

    const result = await deps.resolveAssociation(input);
    expect(result).toMatchObject({ status: "existing", planId: "550e8400-e29b-41d4-a716-446655440002" });
  });
});

describe("confirmPurchase", () => {
  it("only stamps a null confirmation and reports affected rows", async () => {
    const r = recorder({ then: [{ id: "plan-1" }] });
    const deps = createWebhookDeps(r.client, { now: () => NOW });
    const result = await deps.confirmPurchase("plan-1");
    expect(has(r.calls, "is", "purchase_confirmed_at")).toBe(true);
    expect(result.updated).toBe(1);
  });

  it("reports zero rows when another execution already confirmed", async () => {
    const r = recorder({ then: [] });
    const deps = createWebhookDeps(r.client, { now: () => NOW });
    expect((await deps.confirmPurchase("plan-1")).updated).toBe(0);
  });
});
