/**
 * SQL adapter tests.
 *
 * They assert the query construction the production adapter performs, so the
 * handler fakes cannot hide a divergence. Two rules are pinned here:
 *  - holdsLease requires a LIVE lease (`> now`), never the expired filter;
 *  - a NULL lease counts as not held, matching the handler's reclaim rule.
 */
import { createWebhookDeps, expiredLeaseFilter, liveLeaseFilter } from "../adapter.ts";

const NOW = new Date("2026-09-18T00:00:00Z");
const NOW_ISO = NOW.toISOString();

type Call = { op: string; args: unknown[] };

function recorder(responses: { then?: any[]; bareRows?: boolean; maybeSingle?: { data: any; error: any } } = {}) {
  const calls: Call[] = [];
  const chain: any = {
    select: (...a: unknown[]) => { calls.push({ op: "select", args: a }); return chain; },
    insert: (...a: unknown[]) => { calls.push({ op: "insert", args: a }); return chain; },
    update: (...a: unknown[]) => { calls.push({ op: "update", args: a }); return chain; },
    eq: (...a: unknown[]) => { calls.push({ op: "eq", args: a }); return chain; },
    neq: (...a: unknown[]) => { calls.push({ op: "neq", args: a }); return chain; },
    is: (...a: unknown[]) => { calls.push({ op: "is", args: a }); return chain; },
    gt: (...a: unknown[]) => { calls.push({ op: "gt", args: a }); return chain; },
    or: (...a: unknown[]) => { calls.push({ op: "or", args: a }); return chain; },
    limit: (...a: unknown[]) => { calls.push({ op: "limit", args: a }); return chain; },
    maybeSingle: async () => { calls.push({ op: "maybeSingle", args: [] }); return responses.maybeSingle ?? { data: null, error: null }; },
    then: (resolve: any) => {
      calls.push({ op: "then", args: [] });
      const rows = responses.then ?? [];
      return Promise.resolve(resolve(responses.bareRows ? rows : { data: rows, error: null }));
    },
  };
  return { client: { from: (n: string) => { calls.push({ op: "from", args: [n] }); return chain; } }, calls, chain };
}

const has = (calls: Call[], op: string, arg?: unknown) =>
  calls.some((c) => c.op === op && (arg === undefined || (c.args as any[])[0] === arg));
const orArg = (calls: Call[]) => (calls.find((c) => c.op === "or")?.args as string[])?.[0];

describe("lease filters", () => {
  it("expired filter includes a NULL lease and never uses lt alone", () => {
    expect(expiredLeaseFilter(NOW_ISO)).toBe(`lease_expires_at.is.null,lease_expires_at.lte.${NOW_ISO}`);
  });

  it("live filter requires a lease strictly in the future", () => {
    expect(liveLeaseFilter(NOW_ISO)).toBe(`lease_expires_at.gt.${NOW_ISO}`);
    expect(liveLeaseFilter(NOW_ISO)).not.toContain("is.null");
  });
});

describe("holdsLease", () => {
  it("uses the LIVE filter, not the expired one", async () => {
    const r = recorder({ then: [{ event_id: "ev-1" }] });
    const deps = createWebhookDeps(r.client, { now: () => NOW });
    const result = await deps.holdsLease("ev-1", "exec-1");

    expect(orArg(r.calls)).toBe(liveLeaseFilter(NOW_ISO));
    expect(orArg(r.calls)).not.toBe(expiredLeaseFilter(NOW_ISO));
    // The decisive regression: the expired filter must not appear here.
    expect(orArg(r.calls)).not.toContain("is.null");
    expect(has(r.calls, "eq", "event_id")).toBe(true);
    expect(has(r.calls, "eq", "execution_id")).toBe(true);
    expect(has(r.calls, "eq", "status")).toBe(true);
    expect(result.held).toBe(true);
  });

  it("an elapsed or NULL lease is not held", async () => {
    const elapsed = recorder({ then: [] });
    expect((await createWebhookDeps(elapsed.client, { now: () => NOW }).holdsLease("ev-1", "exec-1")).held).toBe(false);
  });
});

describe("claimExpiredEvent", () => {
  it("takes over an abandoned event with the NULL-inclusive filter", async () => {
    const r = recorder();
    const deps = createWebhookDeps(r.client, { now: () => NOW });
    await deps.claimExpiredEvent("ev-1", "exec-1", "later");
    expect(orArg(r.calls)).toBe(expiredLeaseFilter(NOW_ISO));
  });
});

describe("finishEvent", () => {
  it("scopes the write to the owning execution and counts rows", async () => {
    const r = recorder({ then: [{ event_id: "ev-1" }] });
    expect((await createWebhookDeps(r.client, { now: () => NOW }).finishEvent("ev-1", "exec-1", "retryable")).updated).toBe(1);
    expect(has(r.calls, "eq", "execution_id")).toBe(true);
  });

  it("normalizes a builder that resolves to a bare rows array", async () => {
    const r = recorder({ then: [{ event_id: "ev-1" }], bareRows: true });
    expect((await createWebhookDeps(r.client, { now: () => NOW }).finishEvent("ev-1", "exec-1", "processed")).updated).toBe(1);
  });
});

describe("insertEvent", () => {
  it("treats a duplicate event id as an existing row", async () => {
    const r = recorder({ maybeSingle: { data: null, error: { code: "23505" } } });
    const result = await createWebhookDeps(r.client, { now: () => NOW }).insertEvent("ev-1", "T", "u", "e", "l");
    expect(result.created).toBe(false);
    expect(result.error).toBeNull();
  });
});

describe("findAssociation", () => {
  const key = {
    scope: "app-1|stripe|production",
    transactionId: "tx-1",
    originalTransactionId: "tx-origin",
    subscriptionId: "sub-1",
    appUserId: "550e8400-e29b-41d4-a716-446655440000",
  };

  it("prefers transaction_id", async () => {
    const r = recorder({ then: [{ plan_id: "P1" }] });
    const result = await createWebhookDeps(r.client, { now: () => NOW }).findAssociation(key);
    expect(result).toMatchObject({ planId: "P1", ambiguous: false });
    expect(has(r.calls, "eq", "scope_key")).toBe(true);
    expect(has(r.calls, "eq", "transaction_id")).toBe(true);
  });

  it("falls back to original_transaction_id", async () => {
    const r = recorder({ then: [] });
    await createWebhookDeps(r.client, { now: () => NOW }).findAssociation(key);
    expect(has(r.calls, "eq", "original_transaction_id")).toBe(true);
    expect(has(r.calls, "eq", "subscription_id")).toBe(true);
  });

  it("probes 2 rows and reports ambiguity instead of picking the newest", async () => {
    const r = recorder({ then: [{ plan_id: "P1" }, { plan_id: "P2" }] });
    const result = await createWebhookDeps(r.client, { now: () => NOW }).findAssociation(key);
    expect(result).toMatchObject({ planId: null, ambiguous: true });
    // The removed behaviour was `order(created_at desc).limit(1)`.
    expect(has(r.calls, "order")).toBe(false);
    expect(has(r.calls, "limit", 2)).toBe(true);
  });

  it("two rows with the SAME plan are not ambiguous", async () => {
    const r = recorder({ then: [{ plan_id: "P1" }, { plan_id: "P1" }] });
    const result = await createWebhookDeps(r.client, { now: () => NOW }).findAssociation(key);
    expect(result).toMatchObject({ planId: "P1", ambiguous: false });
  });
});

describe("createAssociation", () => {
  const key = {
    scope: "app-1|stripe|production",
    transactionId: "tx-1",
    originalTransactionId: "tx-origin",
    subscriptionId: "sub-1",
    appUserId: "550e8400-e29b-41d4-a716-446655440000",
  };

  it("refuses without a transaction id", async () => {
    const r = recorder();
    const result = await createWebhookDeps(r.client, { now: () => NOW }).createAssociation({ ...key, transactionId: "" }, "P1");
    expect(result).toMatchObject({ status: "error" });
    expect(has(r.calls, "insert")).toBe(false);
  });

  it("persists original_transaction_id and subscription_id", async () => {
    const r = recorder();
    const result = await createWebhookDeps(r.client, { now: () => NOW }).createAssociation(key, "P1");
    expect(result).toMatchObject({ status: "linked", planId: "P1" });
    const inserted = r.calls.find((c) => c.op === "insert")!.args[0] as Record<string, unknown>;
    expect(inserted.original_transaction_id).toBe("tx-origin");
    expect(inserted.subscription_id).toBe("sub-1");
    expect(inserted.scope_key).toBe(key.scope);
  });
});

describe("confirmPurchase", () => {
  it("only stamps a null confirmation and counts rows", async () => {
    const r = recorder({ then: [{ id: "plan-1" }] });
    const result = await createWebhookDeps(r.client, { now: () => NOW }).confirmPurchase("plan-1");
    expect(has(r.calls, "is", "purchase_confirmed_at")).toBe(true);
    expect(result.updated).toBe(1);
  });

  it("reports zero rows when another execution already confirmed", async () => {
    const r = recorder({ then: [] });
    expect((await createWebhookDeps(r.client, { now: () => NOW }).confirmPurchase("plan-1")).updated).toBe(0);
  });
});
