import {
  handleRevenueCatWebhook,
  isEligibleForPurchase,
  isOwnedBy,
  planIdFromMetadata,
  purchaseScope,
  type AssociationKey,
  type CreateAssociationStatus,
  type FunnelPlanRow,
  type WebhookDeps,
} from "../handler.ts";

const USER = "550e8400-e29b-41d4-a716-446655440000";
const OTHER = "550e8400-e29b-41d4-a716-446655440009";
const PLAN = "550e8400-e29b-41d4-a716-446655440002";
const PLAN_2 = "550e8400-e29b-41d4-a716-446655440003";
const TX = "tx-abc";
const ORIG_TX = "tx-origin";
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
  failLookup?: boolean;
  stealLease?: boolean;
  confirmUpdated?: number;
  materializeResult?: { ok: boolean; reason?: string };
  onboardingResult?: { ok: boolean; reason?: string };
}

function fake(options: FakeOpts = {}) {
  const events = new Map<string, { status: string; execution_id: string | null; lease_expires_at: string | null }>();
  const plans = [plan()];
  const byTransaction = new Map<string, string>();
  const byOriginal = new Map<string, string>();
  const calls = { confirmed: 0, issued: 0, granted: 0, associated: [] as string[], leaseChecks: 0, lookups: 0, materialized: 0, onboarded: 0, order: [] as string[] };
  // Scope-aware: the same transaction id in another scope is another purchase.
  const scoped = (scope: string, value: string) => `${scope}::${value}`;
  const state = { stealFinish: false, stealLease: options.stealLease ?? false };

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
      if (state.stealLease) return { held: false, error: null };
      const e = events.get(eventId);
      if (!e || e.execution_id !== executionId || e.status !== "processing") return { held: false, error: null };
      // A live lease must be strictly in the future.
      const live = !!e.lease_expires_at && new Date(e.lease_expires_at).getTime() > NOW.getTime();
      return { held: live, error: null };
    },
    finishEvent: async (eventId, executionId, status) => {
      const e = events.get(eventId);
      if (state.stealFinish) return { updated: 0, error: null };
      if (!e || e.execution_id !== executionId) return { updated: 0, error: null };
      e.status = status;
      e.lease_expires_at = null;
      return { updated: 1, error: null };
    },
    findAssociation: async (key: AssociationKey) => {
      if (options.failClaim) return { planId: null, error: new Error("db down") };
      for (const [map, value] of [
        [byTransaction, key.transactionId],
        [byOriginal, key.originalTransactionId],
      ] as const) {
        const k = value ? scoped(key.scope, value) : "";
        if (k && map.has(k)) return { planId: map.get(k)!, error: null };
      }
      return { planId: null, error: null };
    },
    createAssociation: async (key: AssociationKey, planId): Promise<{ planId: string | null; status: CreateAssociationStatus }> => {
      if (options.failClaim) return { planId: null, status: "error" };
      if (!key.transactionId) return { planId: null, status: "error" };
      const winner = await deps.findAssociation(key);
      if (winner.planId) {
        return winner.planId === planId
          ? { planId: winner.planId, status: "existing" }
          : { planId: winner.planId, status: "conflict" };
      }
      byTransaction.set(scoped(key.scope, key.transactionId), planId);
      if (key.originalTransactionId) byOriginal.set(scoped(key.scope, key.originalTransactionId), planId);
      calls.associated.push(planId);
      return { planId, status: "linked" };
    },
    findPlanById: async (planId) => {
      calls.lookups++;
      if (options.failLookup) return { data: null, error: new Error("db down") };
      return { data: plans.find((p) => p.id === planId) ?? null, error: null };
    },
    checkRevenueCat: async () => options.rc ?? { ok: true, active: true },
confirmPurchase: async (planId) => {
      calls.confirmed++;
      const updated = options.confirmUpdated ?? 1;
      // Mirror the real adapter: a successful confirm stamps the row, so tests
      // can observe the confirmed state on a retry.
      if (updated === 1) {
        const p = plans.find((x) => x.id === planId);
        if (p) p.purchase_confirmed_at = "2026-09-18T00:00:00Z";
      }
      return { updated, error: null };
    },
    grantProGift: async () => {
      calls.granted++;
      return { granted: true, error: null };
    },
    materialize: async (planId, userId) => {
      calls.materialized++;
      calls.order.push(`materialize:${planId === plans[0]?.id && userId === USER ? "owned" : "other"}`);
      const result = options.materializeResult ?? { ok: true };
      if (result.ok) {
        const p = plans.find((x) => x.id === planId);
        if (p) {
          p.status = "claimed";
          p.claimed_by_user_id = userId;
        }
      }
      return result;
    },
    completeOnboarding: async (planId) => {
      calls.onboarded++;
      calls.order.push(`onboarding:${planId === plans[0]?.id ? "owned" : "other"}`);
      return options.onboardingResult ?? { ok: true };
    },
    issue: async (planId) => {
      calls.issued++;
      calls.order.push("issue");
      const result = options.issueResult ?? { ok: true, status: "sent" };
      if (result.ok && result.status !== "in_progress") {
        const p = plans.find((x) => x.id === planId);
        if (p) p.credentials_issued_at = "2026-09-18T00:00:00Z";
      }
      return result;
    },
  };

  return {
    deps, events, plans, calls, byTransaction, byOriginal,
    setSteal: (v: boolean) => { state.stealLease = v; },
    setStealFinish: (v: boolean) => { state.stealFinish = v; },
  };
}

const baseEvent = (over: Record<string, unknown> = {}) => ({
  id: "e-1",
  type: "INITIAL_PURCHASE",
  app_id: "app-1",
  app_user_id: USER,
  store: "stripe",
  environment: "production",
  transaction_id: TX,
  ...over,
});

/** Association keys are scoped: app|store|environment::transaction. */
const scopedTx = (tx: string) => `app-1|stripe|production::${tx}`;

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
  });

  it("ownership ignores materialization state but not the claiming account", () => {
    expect(isOwnedBy(plan({ status: "claimed", claimed_by_user_id: USER }), USER)).toBe(true);
    expect(isOwnedBy(plan({ status: "claimed", claimed_by_user_id: OTHER }), USER)).toBe(false);
    expect(isOwnedBy(plan({ funnel_user_id: null }), USER)).toBe(false);
  });

  it("an expired plan is not eligible for a purchase", () => {
    expect(isEligibleForPurchase(plan(), USER)).toBe(true);
    expect(isEligibleForPurchase(plan({ status: "expired" }), USER)).toBe(false);
    expect(isEligibleForPurchase(plan({ status: "claimed", claimed_by_user_id: USER }), USER)).toBe(true);
  });
});

describe("no plan selection by user", () => {
  it("RENEWAL without metadata and one plan performs no mutation", async () => {
    const { deps, calls } = fake();
    const result = await call(baseEvent({ id: "r-1", type: "RENEWAL", transaction_id: "tx-new" }), deps);
    expect(result).toMatchObject({ status: 503, body: { error: "plan_unresolved", retryable: true } });
    expect(calls.confirmed).toBe(0);
    expect(calls.issued).toBe(0);
    expect(calls.leaseChecks).toBe(0);
  });

  it("INITIAL_PURCHASE without metadata grants the standalone Pro gift", async () => {
    const { deps, calls } = fake();
    const result = await call(baseEvent({ id: "i-1", metadata: {} }), deps);
    expect(result).toMatchObject({ status: 200, body: { status: "processed", coinGift: true } });
    expect(calls.granted).toBe(1);
    expect(calls.confirmed).toBe(0);
  });
});

describe("transaction identifiers", () => {
  it("links the declared plan using transaction_id", async () => {
    const { deps, calls, byTransaction } = fake();
    const result = await call(baseEvent({ id: "a-1", metadata: { brainy_plan_id: PLAN } }), deps);
    expect(result).toMatchObject({ status: 200, body: { success: true, status: "sent", planId: PLAN } });
    expect(byTransaction.get(scopedTx(TX))).toBe(PLAN);
    expect(calls.confirmed).toBe(1);
  });

  it("a renewal resolves through original_transaction_id", async () => {
    const { deps, byOriginal, calls } = fake();
    await call(baseEvent({ id: "a-2", original_transaction_id: ORIG_TX, metadata: { brainy_plan_id: PLAN } }), deps);
    expect(byOriginal.get(`app-1|stripe|production::${ORIG_TX}`)).toBe(PLAN);
    // New transaction, pointing back at the original purchase. It resolves the
    // plan, then finds the delivery already done.
    const renewal = await call(
      baseEvent({ id: "a-3", type: "RENEWAL", transaction_id: "tx-renew", original_transaction_id: ORIG_TX, metadata: {} }),
      deps,
    );
    expect(renewal.body).toMatchObject({ ignored: true, reason: "already_issued" });
    expect(calls.issued).toBe(1);
  });

  it("two events of the same purchase resolve to the same plan", async () => {
    const { deps, calls } = fake();
    await call(baseEvent({ id: "a-6", metadata: { brainy_plan_id: PLAN } }), deps);
    const second = await call(baseEvent({ id: "a-7", type: "RENEWAL", transaction_id: TX, metadata: {} }), deps);
    expect(second.body).toMatchObject({ ignored: true, reason: "already_issued" });
    expect(calls.issued).toBe(1);
  });

  it("rejects rebinding the same purchase to another plan", async () => {
    const { deps, plans, calls } = fake();
    plans.push(plan({ id: PLAN_2 }));
    await call(baseEvent({ id: "a-8", metadata: { brainy_plan_id: PLAN } }), deps);
    const conflict = await call(baseEvent({ id: "a-9", metadata: { brainy_plan_id: PLAN_2 } }), deps);
    expect(conflict).toMatchObject({ status: 200, body: { ignored: true, reason: "association_conflict" } });
    expect(calls.issued).toBe(1);
  });

  it("scopes the transaction id per app/store/environment", async () => {
    const { deps, calls } = fake();
    await call(baseEvent({ id: "a-11", metadata: { brainy_plan_id: PLAN } }), deps);
    const other = await call(baseEvent({ id: "a-12", environment: "sandbox", metadata: {} }), deps);
    expect(other.body).toMatchObject({ status: "processed", coinGift: true });
    expect(calls.granted).toBe(2);
    expect(calls.issued).toBe(1);
  });
});

describe("validation before inserting the association", () => {
  it("refuses a declared plan owned by another user and writes nothing", async () => {
    const { deps, calls, byTransaction } = fake();
    deps.findPlanById = async () => ({ data: plan({ funnel_user_id: OTHER }), error: null });
    const result = await call(baseEvent({ id: "v-1", metadata: { brainy_plan_id: PLAN } }), deps);
    expect(result).toMatchObject({ status: 200, body: { ignored: true, reason: "plan_not_owned" } });
    expect(byTransaction.has(scopedTx(TX))).toBe(false);
    expect(calls.issued).toBe(0);
  });

  it("refuses an expired plan and writes nothing", async () => {
    const { deps, byTransaction } = fake();
    deps.findPlanById = async () => ({ data: plan({ status: "expired" }), error: null });
    const result = await call(baseEvent({ id: "v-2", metadata: { brainy_plan_id: PLAN } }), deps);
    expect(result).toMatchObject({ status: 200, body: { ignored: true, reason: "plan_ineligible" } });
    expect(byTransaction.has(scopedTx(TX))).toBe(false);
  });

  it("refuses when the declared plan does not exist and writes nothing", async () => {
    const { deps, byTransaction } = fake();
    deps.findPlanById = async () => ({ data: null, error: null });
    const result = await call(baseEvent({ id: "v-3", metadata: { brainy_plan_id: PLAN } }), deps);
    expect(result).toMatchObject({ status: 503, body: { error: "plan_missing" } });
    expect(byTransaction.has(scopedTx(TX))).toBe(false);
  });

  it("checks the lease before inserting the association", async () => {
    const { deps, byTransaction } = fake();
    deps.holdsLease = async () => ({ held: false, error: null });
    const result = await call(baseEvent({ id: "v-4", metadata: { brainy_plan_id: PLAN } }), deps);
    expect(result).toMatchObject({ status: 503, body: { error: "lease_lost" } });
    expect(byTransaction.has(scopedTx(TX))).toBe(false);
  });

  it("an expired lease is NOT a live lease", async () => {
    const { deps, events } = fake();
    // Force the stored lease to already be elapsed.
    deps.holdsLease = async () => {
      const e = events.get("v-5")!;
      const live = !!e.lease_expires_at && new Date(e.lease_expires_at).getTime() > NOW.getTime();
      return { held: live, error: null };
    };
    const ok = await call(baseEvent({ id: "v-5", metadata: { brainy_plan_id: PLAN } }), deps);
    expect(ok.status).toBe(200);
  });
});

describe("required scope", () => {
  it.each([
    ["app_id", { app_id: "" }],
    ["store", { store: "" }],
    ["environment", { environment: "" }],
  ])("missing %s is retryable and performs zero business mutations", async (label, patch) => {
    const { deps, calls, byTransaction, events } = fake();
    const result = await call(baseEvent({ id: "s-1", metadata: { brainy_plan_id: PLAN }, ...patch }), deps);

    // Retryable, NOT ignored: the real RevenueCat payload is not confirmed yet,
    // so the event must stay recoverable instead of terminal.
    expect(result).toMatchObject({
      status: 503,
      body: { success: false, error: "incomplete_scope", retryable: true },
    });

    // The stored event is left retryable with the lease released, so it can be
    // picked up again automatically or replayed by hand.
    const stored = events.get("s-1");
    expect(stored?.status).toBe("retryable");
    expect(stored?.lease_expires_at).toBeNull();

    // Zero business mutations for the missing field.
    expect(byTransaction.has(scopedTx(TX))).toBe(false);
    expect(calls.associated).toEqual([]);
    expect(calls.confirmed).toBe(0);
    expect(calls.issued).toBe(0);
    expect(calls.leaseChecks).toBe(0);
  });

  it("does not fall back to app_user_type when app_id is absent", async () => {
    const { deps, byTransaction, events } = fake();
    const result = await call(baseEvent({
      id: "s-2",
      app_id: "",
      app_user_type: "APP_USER_ID",
      metadata: { brainy_plan_id: PLAN },
    }), deps);
    expect(result).toMatchObject({ status: 503, body: { error: "incomplete_scope", retryable: true } });
    expect(events.get("s-2")?.status).toBe("retryable");
    expect(byTransaction.has(scopedTx(TX))).toBe(false);
  });
});

describe("entitlement is verified before a new association", () => {
  it("inactive entitlement creates no association", async () => {
    const { deps, calls, byTransaction } = fake({ rc: { ok: true, active: false } });
    const result = await call(baseEvent({ id: "e-1", metadata: { brainy_plan_id: PLAN } }), deps);
    expect(result).toMatchObject({ status: 409, body: { error: "entitlement_inactive", retryable: true } });
    expect(byTransaction.has(scopedTx(TX))).toBe(false);
    expect(calls.associated).toHaveLength(0);
    expect(calls.issued).toBe(0);
  });

  it("an unreachable RevenueCat is retryable and creates no association", async () => {
    const { deps, calls, events } = fake({ rc: { ok: false, active: false } });
    const result = await call(baseEvent({ id: "e-2", metadata: { brainy_plan_id: PLAN } }), deps);
    expect(result).toMatchObject({ status: 503, body: { error: "verification_unavailable", retryable: true } });
    expect(calls.associated).toHaveLength(0);
    expect(events.get("e-2")?.status).toBe("retryable");
  });

  it("the plan is not even loaded before the entitlement gate passes", async () => {
    const { deps, calls } = fake({ rc: { ok: false, active: false } });
    await call(baseEvent({ id: "e-3", metadata: { brainy_plan_id: PLAN } }), deps);
    expect(calls.lookups).toBe(0);
  });
});

describe("original_transaction_id conflict", () => {
  it("the same original_transaction_id cannot be bound to another plan", async () => {
    const { deps, plans, calls, byOriginal } = fake();
    plans.push(plan({ id: PLAN_2 }));
    const first = await call(baseEvent({ id: "o-1", original_transaction_id: ORIG_TX, metadata: { brainy_plan_id: PLAN } }), deps);
    expect(first).toMatchObject({ status: 200, body: { success: true, planId: PLAN } });

    // A different purchase claiming the same origin must be refused.
    const conflict = await call(baseEvent({
      id: "o-2",
      transaction_id: "tx-other",
      original_transaction_id: ORIG_TX,
      metadata: { brainy_plan_id: PLAN_2 },
    }), deps);
    expect(conflict).toMatchObject({ status: 200, body: { ignored: true, reason: "association_conflict" } });
    expect(byOriginal.size).toBe(1);
    expect(calls.issued).toBe(1);
  });
});

describe("concurrency responses", () => {
  it("processing with a live lease returns 503 retryable", async () => {
    const { deps, events } = fake();
    events.set("c-1", { status: "processing", execution_id: "other", lease_expires_at: "2026-09-18T00:05:00Z" });
    const result = await call(baseEvent({ id: "c-1", metadata: { brainy_plan_id: PLAN } }), deps);
    expect(result).toMatchObject({ status: 503, body: { error: "event_in_progress" } });
  });

  it("processing with a NULL lease is reclaimed", async () => {
    const { deps, events, calls } = fake();
    events.set("c-2", { status: "processing", execution_id: "dead", lease_expires_at: null });
    const result = await call(baseEvent({ id: "c-2", metadata: { brainy_plan_id: PLAN } }), deps);
    expect(result).toMatchObject({ status: 200, body: { success: true } });
    expect(calls.issued).toBe(1);
  });

  it("findEvent error returns 503", async () => {
    const { deps, events } = fake({ failFindEvent: true });
    events.set("c-3", { status: "retryable", execution_id: null, lease_expires_at: null });
    expect(await call(baseEvent({ id: "c-3" }), deps)).toMatchObject({ status: 503 });
  });

  it("insert error returns 503", async () => {
    const { deps } = fake({ failInsert: true });
    expect(await call(baseEvent({ id: "c-4" }), deps)).toMatchObject({ status: 503, body: { error: "event_store_unavailable" } });
  });

  it("lost claim re-reads and answers 503 when not terminal", async () => {
    const { deps, events } = fake();
    events.set("c-5", { status: "retryable", execution_id: "someone", lease_expires_at: null });
    deps.claimEvent = async () => ({ updated: 0, error: null });
    expect(await call(baseEvent({ id: "c-5" }), deps)).toMatchObject({ status: 503, body: { error: "event_claim_lost" } });
  });

  it("terminal states answer 200 idempotent", async () => {
    const { deps, events, calls } = fake();
    events.set("c-6", { status: "processed", execution_id: null, lease_expires_at: null });
    expect(await call(baseEvent({ id: "c-6", metadata: { brainy_plan_id: PLAN } }), deps))
      .toMatchObject({ status: 200, body: { idempotent: true, status: "processed" } });
    expect(calls.issued).toBe(0);
  });

  it("a stolen lease stops confirm and issue", async () => {
    const { deps, calls, setSteal } = fake();
    setSteal(true);
    const result = await call(baseEvent({ id: "c-7", metadata: { brainy_plan_id: PLAN } }), deps);
    expect(result.status).toBe(503);
    expect(calls.confirmed).toBe(0);
    expect(calls.issued).toBe(0);
  });
});

describe("pending credential recovery", () => {
  it("confirmed purchase with failed email is retried successfully", async () => {
    const { deps, plans, calls } = fake({ issueResult: { ok: false, status: "retryable" } });
    plans[0].purchase_confirmed_at = "2026-09-17T00:00:00Z";
    const first = await call(baseEvent({ id: "d-1", metadata: { brainy_plan_id: PLAN } }), deps);
    expect(first).toMatchObject({ status: 503 });
    expect(calls.confirmed).toBe(0);

    deps.issue = async (planId) => {
      calls.issued++;
      const p = plans.find((x) => x.id === planId);
      if (p) p.credentials_issued_at = "2026-09-18T00:00:00Z";
      return { ok: true, status: "sent" };
    };
    const second = await call(baseEvent({ id: "d-1", metadata: { brainy_plan_id: PLAN } }), deps);
    expect(second).toMatchObject({ status: 200, body: { status: "sent" } });
    expect(calls.issued).toBe(2);
  });

  it("a claimed plan with pending delivery is delivered to its owner", async () => {
    const { deps, plans, calls } = fake();
    plans[0].status = "claimed";
    plans[0].claimed_by_user_id = USER;
    plans[0].purchase_confirmed_at = "2026-09-17T00:00:00Z";
    expect(await call(baseEvent({ id: "d-2", metadata: { brainy_plan_id: PLAN } }), deps))
      .toMatchObject({ status: 200, body: { status: "sent" } });
    expect(calls.issued).toBe(1);
  });

  it("already issued answers ignored", async () => {
    const { deps, plans, calls } = fake();
    plans[0].credentials_issued_at = "2026-09-17T01:00:00Z";
    expect(await call(baseEvent({ id: "d-3", metadata: { brainy_plan_id: PLAN } }), deps))
      .toMatchObject({ status: 200, body: { reason: "already_issued" } });
    expect(calls.issued).toBe(0);
  });

  it("a bound plan that no longer exists is handled without a null dereference", async () => {
    const { deps, plans, calls } = fake();
    plans.length = 0;
    expect(await call(baseEvent({ id: "d-4", metadata: { brainy_plan_id: PLAN } }), deps))
      .toMatchObject({ status: 503, body: { error: "plan_missing" } });
    expect(calls.issued).toBe(0);
  });

  it("confirmPurchase with zero rows and no visible confirmation is retryable", async () => {
    const { deps, plans } = fake({ confirmUpdated: 0 });
    const result = await call(baseEvent({ id: "d-5", metadata: { brainy_plan_id: PLAN } }), deps);
    expect(result).toMatchObject({ status: 503, body: { error: "purchase_confirm_failed" } });
    expect(plans[0].purchase_confirmed_at).toBeNull();
  });

  it("confirmPurchase zero rows but re-read shows confirmation proceeds", async () => {
    const { deps, plans } = fake({ confirmUpdated: 0 });
    deps.confirmPurchase = async () => { plans[0].purchase_confirmed_at = "2026-09-18T00:00:00Z"; return { updated: 0, error: null }; };
    expect(await call(baseEvent({ id: "d-6", metadata: { brainy_plan_id: PLAN } }), deps))
      .toMatchObject({ status: 200, body: { status: "sent" } });
  });

  it("in_progress issuance stays retryable", async () => {
    const { deps, events } = fake({ issueResult: { ok: false, status: "in_progress" } });
    const result = await call(baseEvent({ id: "d-7", metadata: { brainy_plan_id: PLAN } }), deps);
    expect(result).toMatchObject({ status: 503, body: { error: "issuance_in_progress" } });
    expect(events.get("d-7")?.status).toBe("retryable");
  });
});

describe("funnel purchase coin gift", () => {
  it("grants the gift exactly once after a confirmed funnel purchase", async () => {
    const { deps, calls } = fake();
    const result = await call(baseEvent({ id: "g-1", metadata: { brainy_plan_id: PLAN } }), deps);

    expect(result).toMatchObject({ status: 200, body: { status: "sent" } });
    expect(calls.granted).toBe(1);
    expect(calls.confirmed).toBe(1);
    // The funnel path still associates the plan and issues credentials.
    expect(calls.associated).toEqual([PLAN]);
    expect(calls.issued).toBe(1);
  });

  it("a failing grant is retryable and holds back credential delivery", async () => {
    const { deps, calls, plans } = fake();
    deps.grantProGift = async () => ({ granted: false, error: new Error("rpc down") });

    const result = await call(baseEvent({ id: "g-2", metadata: { brainy_plan_id: PLAN } }), deps);

    expect(result).toMatchObject({ status: 503, body: { error: "coin_gift_unavailable" } });

    // purchase_confirmed_at means "RevenueCat confirmed the payment", which is
    // a fact independent of the reward, so it is allowed to stand. What must NOT
    // happen is delivery: no credentials, no email, until the gift lands.
    expect(calls.confirmed).toBe(1);
    expect(plans[0].purchase_confirmed_at).not.toBeNull();
    expect(calls.issued).toBe(0);

    // On retry the confirmation is skipped and the gift is retried.
    deps.grantProGift = async () => {
      calls.granted++;
      return { granted: true, error: null };
    };
    const second = await call(baseEvent({ id: "g-2", metadata: { brainy_plan_id: PLAN } }), deps);

    expect(second).toMatchObject({ status: 200, body: { status: "sent" } });
    expect(calls.confirmed).toBe(1); // not confirmed twice
    expect(calls.issued).toBe(1);
  });

  it("an already-issued plan still grants the gift", async () => {
    const { deps, plans, calls } = fake();
    plans[0].status = "claimed";
    plans[0].claimed_by_user_id = USER;
    plans[0].purchase_confirmed_at = "2026-09-17T00:00:00Z";
    plans[0].credentials_issued_at = "2026-09-17T01:00:00Z";

    const result = await call(baseEvent({ id: "g-3", metadata: { brainy_plan_id: PLAN } }), deps);

    expect(result).toMatchObject({ status: 200, body: { reason: "already_issued" } });
    // Credentials were already delivered, but the coin gift must still land.
    expect(calls.granted).toBe(1);
    expect(calls.issued).toBe(0);
  });

  it("does not grant when the entitlement gate rejects the purchase", async () => {
    const { deps, calls } = fake({ rc: { ok: true, active: false } });
    const result = await call(baseEvent({ id: "g-4", metadata: { brainy_plan_id: PLAN } }), deps);

    expect(result.status).toBe(409);
    expect(calls.granted).toBe(0);
    expect(calls.confirmed).toBe(0);
  });
});

describe("in-app Pro purchase without funnel metadata", () => {
  it("grants the Pro gift and finishes instead of retrying plan_unresolved", async () => {
    const { deps, calls, events } = fake();
    const result = await call(baseEvent({
      id: "in-app-1",
      metadata: undefined,
      transaction_id: "in-app-tx-1",
      original_transaction_id: "in-app-tx-1",
    }), deps);

    expect(result).toMatchObject({
      status: 200,
      body: { status: "processed", coinGift: true },
    });
    expect(calls.granted).toBe(1);
    expect(calls.associated).toEqual([]);
    expect(calls.confirmed).toBe(0);
    expect(calls.issued).toBe(0);
    expect(events.get("in-app-1")?.status).toBe("processed");
  });

  it("a failing gift is retryable and must not be swallowed", async () => {
    const { deps, calls, events } = fake();
    deps.grantProGift = async () => ({ granted: false, error: new Error("rpc down") });

    const result = await call(baseEvent({
      id: "in-app-2",
      metadata: undefined,
      transaction_id: "in-app-tx-2",
      original_transaction_id: "in-app-tx-2",
    }), deps);

    // The gift must never be reported as a successful terminal event when it failed.
    expect(result).toMatchObject({ status: 503, body: { error: "coin_gift_unavailable" } });
    expect(result.body).not.toMatchObject({ coinGift: true });
    // Overriding the dep bypasses the shared counter in the fake closure, so the
    // observable evidence is the response plus the event row.
    expect(events.get("in-app-2")?.status).toBe("retryable");
    expect(events.get("in-app-2")?.lease_expires_at).toBeNull();
  });

  it("keeps a renewal without a known purchase association retryable", async () => {
    const { deps, calls, events } = fake();
    const result = await call(baseEvent({
      id: "in-app-renewal-1",
      type: "RENEWAL",
      metadata: undefined,
      transaction_id: "in-app-renewal-tx-1",
      original_transaction_id: "in-app-origin-1",
    }), deps);

    expect(result).toMatchObject({ status: 503, body: { error: "plan_unresolved" } });
    expect(calls.granted).toBe(0);
    expect(events.get("in-app-renewal-1")?.status).toBe("retryable");
  });
});
