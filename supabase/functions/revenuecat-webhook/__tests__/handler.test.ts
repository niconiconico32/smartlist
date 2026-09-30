import {
  handleRevenueCatWebhook,
  isOwnedBy,
  planIdFromMetadata,
  purchaseScope,
  type AssociationOutcome,
  type FunnelPlanRow,
  type WebhookDeps,
} from "../handler.ts";

const USER = "550e8400-e29b-41d4-a716-446655440000";
const OTHER = "550e8400-e29b-41d4-a716-446655440009";
const PLAN = "550e8400-e29b-41d4-a716-446655440002";
const PLAN_2 = "550e8400-e29b-41d4-a716-446655440003";
const SUB = "sub-abc";
const TX = "tx-abc";

const NOW = new Date("2026-09-18T00:00:00Z");

function plan(over: Partial<FunnelPlanRow> = {}): FunnelPlanRow {
  return {
    id: PLAN,
    funnel_user_id: USER,
    status: "pending",
    claimed_by_user_id: null,
    purchase_confirmed_at: null,
    credentials_issued_at: null,
    created_at: "2026-09-18T00:00:00Z",
    ...over,
  };
}

interface FakeOpts {
  rc?: { ok: boolean; active: boolean };
  issueResult?: { ok: boolean; status: string };
  failInsert?: boolean;
  failFindEvent?: boolean;
  failClaim?: boolean;
  /** Simulates another execution stealing the lease. */
  stealLease?: boolean;
  confirmUpdated?: number;
  confirmError?: boolean;
}

function fake(options: FakeOpts = {}) {
  const events = new Map<string, { status: string; execution_id: string | null; lease_expires_at: string | null }>();
  const plans = [plan()];
  const associations = new Map<string, string>(); // `${scope}|${tx}` -> planId
  const bySubscription = new Map<string, string>(); // `${scope}|${sub}` -> planId
  const calls = { confirmed: 0, issued: 0, bound: [] as string[], leaseChecks: 0, associated: [] as string[] };
  const state = { steal: options.stealLease ?? false };

  const deps: WebhookDeps = {
    now: () => NOW,
    insertEvent: async (eventId, _t, _u, executionId, leaseExpiresAt) => {
      if (options.failInsert) return { created: false, error: new Error("db down") };
      if (events.has(eventId)) return { created: false, error: null };
      events.set(eventId, { status: "processing", execution_id: executionId, lease_expires_at: leaseExpiresAt });
      return { created: true, error: null };
    },
    findEvent: async (eventId) => {
      if (options.failFindEvent) return { data: null, error: new Error("db down") };
      return { data: events.get(eventId) ?? null, error: null };
    },
    claimEvent: async (eventId, executionId, leaseExpiresAt, fromStatus) => {
      if (options.failClaim) return { updated: 0, error: new Error("db down") };
      const e = events.get(eventId);
      if (!e || e.status !== fromStatus || e.execution_id === executionId) return { updated: 0, error: null };
      e.status = "processing";
      e.execution_id = executionId;
      e.lease_expires_at = leaseExpiresAt;
      return { updated: 1, error: null };
    },
    claimExpiredEvent: async (eventId, executionId, leaseExpiresAt) => {
      if (options.failClaim) return { updated: 0, error: new Error("db down") };
      const e = events.get(eventId);
      if (!e || e.status !== "processing" || e.execution_id === executionId) return { updated: 0, error: null };
      const expired = !e.lease_expires_at || new Date(e.lease_expires_at).getTime() <= NOW.getTime();
      if (!expired) return { updated: 0, error: null };
      e.execution_id = executionId;
      e.lease_expires_at = leaseExpiresAt;
      return { updated: 1, error: null };
    },
    holdsLease: async (eventId, executionId) => {
      calls.leaseChecks++;
      if (options.failFindEvent) return { held: false, error: new Error("db down") };
      if (state.steal) return { held: false, error: null };
      const e = events.get(eventId);
      return { held: !!e && e.execution_id === executionId && e.status === "processing", error: null };
    },
    finishEvent: async (eventId, executionId, status) => {
      const e = events.get(eventId);
      if (state.steal) return { updated: 0, error: null };
      if (!e || e.execution_id !== executionId) return { updated: 0, error: null };
      e.status = status;
      e.lease_expires_at = null;
      return { updated: 1, error: null };
    },
    resolveAssociation: async ({ scope, transactionId, subscriptionId, declaredPlanId }): Promise<AssociationOutcome> => {
      if (options.failClaim) return { status: "error" };
      // 1) An existing association always wins (transaction, then subscription).
      const txKey = transactionId ? `${scope}|${transactionId}` : "";
      if (txKey && associations.has(txKey)) {
        const bound = associations.get(txKey)!;
        if (declaredPlanId && declaredPlanId !== bound) return { status: "conflict", planId: bound };
        return { status: "existing", planId: bound };
      }
      const subKey = subscriptionId ? `${scope}|${subscriptionId}` : "";
      if (subKey && bySubscription.has(subKey)) {
        const bound = bySubscription.get(subKey)!;
        if (declaredPlanId && declaredPlanId !== bound) return { status: "conflict", planId: bound };
        return { status: "existing", planId: bound };
      }
      // 2) Only a declaring event may create an association.
      if (!declaredPlanId || !transactionId) return { status: "unresolved" };
      associations.set(txKey, declaredPlanId);
      if (subKey) bySubscription.set(subKey, declaredPlanId);
      calls.associated.push(declaredPlanId);
      return { status: "linked", planId: declaredPlanId };
    },
    findPlanById: async (planId) => ({ data: plans.find((p) => p.id === planId) ?? null, error: null }),
    checkRevenueCat: async () => options.rc ?? { ok: true, active: true },
    confirmPurchase: async () => {
      calls.confirmed++;
      if (options.confirmError) return { updated: 0, error: new Error("db down") };
      return { updated: options.confirmUpdated ?? 1, error: null };
    },
    issue: async (planId) => {
      calls.issued++;
      const result = options.issueResult ?? { ok: true, status: "sent" };
      // The real issuance records credentials_issued_at; the fake must too, or
      // the handler cannot be observed avoiding a duplicate delivery.
      if (result.ok && result.status !== "in_progress") {
        const p = plans.find((x) => x.id === planId);
        if (p) p.credentials_issued_at = "2026-09-18T00:00:00Z";
      }
      return result;
    },
  };

  return { deps, events, plans, associations, calls, setSteal: (v: boolean) => { state.steal = v; } };
}

const baseEvent = (over: Record<string, unknown> = {}) => ({
  id: "e-1",
  type: "INITIAL_PURCHASE",
  app_id: "app-1",
  app_user_id: USER,
  store: "stripe",
  environment: "production",
  transaction_id: TX,
  subscription_id: SUB,
  ...over,
});

const call = (event: Record<string, unknown>, deps: WebhookDeps) =>
  handleRevenueCatWebhook({ authorization: "s", configuredAuthorization: "s", event: event as never }, deps);

describe("helpers", () => {
  it("planIdFromMetadata only accepts a trimmed string", () => {
    expect(planIdFromMetadata({ brainy_plan_id: PLAN })).toBe(PLAN);
    expect(planIdFromMetadata({ brainy_plan_id: ` ${PLAN} ` })).toBe(PLAN);
    expect(planIdFromMetadata({ brainy_plan_id: 7 })).toBe("");
    expect(planIdFromMetadata(null)).toBe("");
  });

  it("scope separates app, store and environment", () => {
    expect(purchaseScope({ app_id: "a", store: "stripe", environment: "production" })).toBe("a|stripe|production");
    expect(purchaseScope({ app_id: "a", store: "stripe", environment: "sandbox" })).toBe("a|stripe|sandbox");
    expect(purchaseScope({ app_id: "a", store: "play_store", environment: "production" })).toBe("a|play_store|production");
    expect(purchaseScope({ app_id: "b", store: "stripe", environment: "production" })).toBe("b|stripe|production");
  });

  it("ownership ignores materialization state", () => {
    expect(isOwnedBy(plan({ status: "claimed", claimed_by_user_id: USER }), USER)).toBe(true);
    expect(isOwnedBy(plan({ status: "claimed", claimed_by_user_id: OTHER }), USER)).toBe(false);
    expect(isOwnedBy(plan({ funnel_user_id: null }), USER)).toBe(false);
  });
});

describe("1. no plan selection by user", () => {
  it("RENEWAL without metadata and no prior association performs no mutation", async () => {
    const { deps, calls } = fake();
    const result = await call(baseEvent({ id: "r-1", type: "RENEWAL", transaction_id: "tx-new" }), deps);
    expect(result).toMatchObject({ status: 503, body: { error: "plan_unresolved", retryable: true } });
    expect(calls.confirmed).toBe(0);
    expect(calls.issued).toBe(0);
    expect(calls.leaseChecks).toBe(0);
  });

  it("never falls back to the only existing plan", async () => {
    const { deps, calls, plans } = fake();
    plans.push(plan({ id: PLAN_2 }));
    const result = await call(baseEvent({ id: "r-2", type: "RENEWAL", transaction_id: "tx-2" }), deps);
    expect(result.body).toMatchObject({ error: "plan_unresolved" });
    expect(calls.issued).toBe(0);
  });

  it("INITIAL_PURCHASE without metadata performs no mutation", async () => {
    const { deps, calls } = fake();
    const result = await call(baseEvent({ id: "i-1", metadata: {} }), deps);
    expect(result.body).toMatchObject({ error: "plan_unresolved" });
    expect(calls.confirmed).toBe(0);
    expect(calls.issued).toBe(0);
  });
});

describe("2. persistent transaction-plan association", () => {
  it("links the declared plan and issues", async () => {
    const { deps, calls, associations } = fake();
    const result = await call(baseEvent({ id: "a-1", metadata: { brainy_plan_id: PLAN } }), deps);
    expect(result).toMatchObject({ status: 200, body: { success: true, status: "sent", planId: PLAN } });
    expect(calls.confirmed).toBe(1);
    expect(calls.issued).toBe(1);
    expect(associations.get(`app-1|stripe|production|${TX}`)).toBe(PLAN);
  });

  it("two different events of the same purchase resolve to the same plan", async () => {
    const { deps, calls, associations } = fake();
    const first = await call(baseEvent({ id: "a-2", metadata: { brainy_plan_id: PLAN } }), deps);
    expect(first.body).toMatchObject({ planId: PLAN });

    // A second event of the SAME purchase (same transaction_id) carries no metadata.
    const second = await call(baseEvent({ id: "a-3", type: "RENEWAL", transaction_id: TX, metadata: {} }), deps);
    expect(second).toMatchObject({ status: 200, body: { success: true, planId: PLAN } });
    expect(associations.size).toBe(1);
    expect(calls.issued).toBe(1); // already issued -> ignored, never re-issued
  });

  it("rejects an attempt to bind the same purchase to another plan", async () => {
    const { deps, plans, calls } = fake();
    plans.push(plan({ id: PLAN_2 }));
    await call(baseEvent({ id: "a-4", metadata: { brainy_plan_id: PLAN } }), deps);
    // Same transaction, different declared plan.
    const conflict = await call(baseEvent({ id: "a-5", metadata: { brainy_plan_id: PLAN_2 } }), deps);
    expect(conflict).toMatchObject({ status: 200, body: { ignored: true, reason: "association_conflict" } });
    expect(calls.issued).toBe(1);
  });

  it("refuses a declared plan owned by another user", async () => {
    const { deps, plans, calls } = fake();
    plans[0].funnel_user_id = OTHER;
    const result = await call(baseEvent({ id: "a-6", metadata: { brainy_plan_id: PLAN } }), deps);
    expect(result).toMatchObject({ status: 200, body: { ignored: true, reason: "plan_not_owned" } });
    expect(calls.confirmed).toBe(0);
    expect(calls.issued).toBe(0);
  });

  it("renewal resolves a prior association by subscription", async () => {
    const { deps } = fake();
    await call(baseEvent({ id: "a-7", metadata: { brainy_plan_id: PLAN } }), deps);
    // New transaction, same subscription, no metadata.
    const renewal = await call(baseEvent({ id: "a-8", type: "RENEWAL", transaction_id: "tx-renew", subscription_id: SUB, metadata: {} }), deps);
    expect(renewal.body).toMatchObject({ success: true, planId: PLAN });
  });

  it("scopes the same transaction id per app/store/environment", async () => {
    const { deps, associations } = fake();
    await call(baseEvent({ id: "a-9", metadata: { brainy_plan_id: PLAN } }), deps);
    // Same transaction id in sandbox is a DIFFERENT purchase: unresolved.
    const other = await call(
      baseEvent({ id: "a-10", environment: "sandbox", transaction_id: TX, metadata: {} }),
      deps,
    );
    expect(other.body).toMatchObject({ error: "plan_unresolved" });
    expect(associations.size).toBe(1);
  });
});

describe("3. concurrency responses", () => {
  it("processing with a live lease returns 503 retryable", async () => {
    const { deps, events } = fake();
    events.set("c-1", { status: "processing", execution_id: "other", lease_expires_at: "2026-09-18T00:05:00Z" });
    const result = await call(baseEvent({ id: "c-1", metadata: { brainy_plan_id: PLAN } }), deps);
    expect(result).toMatchObject({ status: 503, body: { error: "event_in_progress", retryable: true } });
  });

  it("processing with a NULL lease is reclaimed (handler and SQL agree)", async () => {
    const { deps, events, calls } = fake();
    events.set("c-2", { status: "processing", execution_id: "dead", lease_expires_at: null });
    const result = await call(baseEvent({ id: "c-2", metadata: { brainy_plan_id: PLAN } }), deps);
    expect(result).toMatchObject({ status: 200, body: { success: true } });
    expect(calls.issued).toBe(1);
  });

  it("a live lease is not even attempted for takeover", async () => {
    const { deps, events, calls } = fake();
    events.set("c-3", { status: "processing", execution_id: "other", lease_expires_at: "2026-09-18T00:05:00Z" });
    await call(baseEvent({ id: "c-3", metadata: { brainy_plan_id: PLAN } }), deps);
    // untouched: still owned by the other execution
    expect(events.get("c-3")).toMatchObject({ status: "processing", execution_id: "other" });
    expect(calls.issued).toBe(0);
  });

  it("findEvent error returns 503", async () => {
    const { deps, events } = fake({ failFindEvent: true });
    events.set("c-4", { status: "retryable", execution_id: null, lease_expires_at: null });
    const result = await call(baseEvent({ id: "c-4" }), deps);
    expect(result).toMatchObject({ status: 503, body: { retryable: true } });
  });

  it("insert error returns 503", async () => {
    const { deps } = fake({ failInsert: true });
    const result = await call(baseEvent({ id: "c-5" }), deps);
    expect(result).toMatchObject({ status: 503, body: { error: "event_store_unavailable" } });
  });

  it("lost claim re-reads and answers 503 when not terminal", async () => {
    const { deps, events } = fake();
    events.set("c-6", { status: "retryable", execution_id: "someone", lease_expires_at: null });
    // Simulate the row turning terminal between read and claim.
    deps.finishEvent = async (eventId, _x, status) => {
      const e = events.get(eventId)!;
      e.status = status;
      return { updated: 1, error: null };
    };
    deps.claimEvent = async () => ({ updated: 0, error: null });
    const result = await call(baseEvent({ id: "c-6" }), deps);
    expect(result).toMatchObject({ status: 503, body: { error: "event_claim_lost" } });
  });

  it("terminal states answer 200 idempotent", async () => {
    const { deps, events, calls } = fake();
    events.set("c-7", { status: "processed", execution_id: null, lease_expires_at: null });
    const result = await call(baseEvent({ id: "c-7", metadata: { brainy_plan_id: PLAN } }), deps);
    expect(result).toMatchObject({ status: 200, body: { success: true, idempotent: true, status: "processed" } });
    expect(calls.issued).toBe(0);
  });

  it("an execution without the lease does not confirm or issue", async () => {
    const { deps, calls, setSteal } = fake();
    setSteal(true);
    const result = await call(baseEvent({ id: "c-8", metadata: { brainy_plan_id: PLAN } }), deps);
    expect(result).toMatchObject({ status: 503, body: { error: "lease_lost", retryable: true } });
    expect(calls.confirmed).toBe(0);
    expect(calls.issued).toBe(0);
  });
});

describe("4. pending credential recovery", () => {
  it("confirmed purchase with failed email is retried successfully", async () => {
    const { deps, plans, calls } = fake({ issueResult: { ok: false, status: "retryable" } });
    plans[0].purchase_confirmed_at = "2026-09-17T00:00:00Z";
    const first = await call(baseEvent({ id: "d-1", metadata: { brainy_plan_id: PLAN } }), deps);
    expect(first).toMatchObject({ status: 503, body: { retryable: true } });
    expect(calls.issued).toBe(1);
    expect(calls.confirmed).toBe(0); // already confirmed

    deps.issue = async () => { calls.issued++; return { ok: true, status: "sent" }; };
    const second = await call(baseEvent({ id: "d-1", metadata: { brainy_plan_id: PLAN } }), deps);
    expect(second).toMatchObject({ status: 200, body: { success: true, status: "sent" } });
    expect(calls.issued).toBe(2);
  });

  it("a claimed plan with pending delivery is still delivered to its owner", async () => {
    const { deps, plans, calls } = fake();
    plans[0].status = "claimed";
    plans[0].claimed_by_user_id = USER;
    plans[0].purchase_confirmed_at = "2026-09-17T00:00:00Z";
    const result = await call(baseEvent({ id: "d-2", metadata: { brainy_plan_id: PLAN } }), deps);
    expect(result).toMatchObject({ status: 200, body: { success: true, status: "sent" } });
    expect(calls.issued).toBe(1);
  });

  it("already issued answers ignored", async () => {
    const { deps, plans, calls } = fake();
    plans[0].credentials_issued_at = "2026-09-17T01:00:00Z";
    const result = await call(baseEvent({ id: "d-3", metadata: { brainy_plan_id: PLAN } }), deps);
    expect(result).toMatchObject({ status: 200, body: { ignored: true, reason: "already_issued" } });
    expect(calls.issued).toBe(0);
  });

  it("a bound plan that no longer exists is handled without a null dereference", async () => {
    const { deps, plans, calls } = fake();
    plans.length = 0;
    const result = await call(baseEvent({ id: "d-4", metadata: { brainy_plan_id: PLAN } }), deps);
    expect(result).toMatchObject({ status: 503, body: { error: "plan_missing", retryable: true } });
    expect(calls.issued).toBe(0);
  });

  it("confirmPurchase updating zero rows without a visible confirmation is retryable", async () => {
    const { deps, plans } = fake({ confirmUpdated: 0 });
    // Re-read returns the plan still unconfirmed -> must not assume success.
    const result = await call(baseEvent({ id: "d-5", metadata: { brainy_plan_id: PLAN } }), deps);
    expect(result).toMatchObject({ status: 503, body: { error: "purchase_confirm_failed", retryable: true } });
    expect(plans[0].purchase_confirmed_at).toBeNull();
  });

  it("confirmPurchase zero rows but re-read shows confirmation -> proceeds", async () => {
    const { deps, plans } = fake({ confirmUpdated: 0 });
    deps.confirmPurchase = async () => { plans[0].purchase_confirmed_at = "2026-09-18T00:00:00Z"; return { updated: 0, error: null }; };
    const result = await call(baseEvent({ id: "d-6", metadata: { brainy_plan_id: PLAN } }), deps);
    expect(result).toMatchObject({ status: 200, body: { success: true, status: "sent" } });
  });
});
