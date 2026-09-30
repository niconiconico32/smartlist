import { handleRevenueCatWebhook, planIdFromMetadata, type WebhookDeps } from "../handler.ts";

const USER = "550e8400-e29b-41d4-a716-446655440000";
const OTHER_USER = "550e8400-e29b-41d4-a716-446655440009";
const PLAN = "550e8400-e29b-41d4-a716-446655440002";
const PLAN_2 = "550e8400-e29b-41d4-a716-446655440003";
const TOKEN = "claim-token";

function basePlan(overrides: Record<string, unknown> = {}) {
  return {
    id: PLAN,
    funnel_user_id: USER,
    status: "pending",
    claimed_by_user_id: null,
    purchase_confirmed_at: null,
    credentials_issued_at: null,
    created_at: "2026-09-18T00:00:00Z",
    ...overrides,
  };
}

function webhookFake(plans: Array<Record<string, unknown>> = [], options: { rc?: { ok: boolean; active: boolean }; issueResult?: { ok: boolean; status: string }; failInsert?: boolean; failFindPlans?: boolean } = {}) {
  const events = new Map<string, { status: string; execution_id: string | null; lease_expires_at: string | null; plan_id: string | null }>();
  const calls = { confirmed: 0, issued: 0, finished: 0, bound: [] as string[] };
  const claims: Array<{ eventId: string; executionId: string; fromStatus: string; expiredOnly?: boolean }> = [];
  /** Simula que otra ejecución más nueva roba el lease a mitad de vuelo. */
  const state = { stealFinish: false };

  const deps: WebhookDeps = {
    now: () => new Date("2026-09-18T00:00:00Z"),
    insertEvent: async (eventId, _type, _appUserId, executionId, leaseExpiresAt) => {
      if (options.failInsert) return { data: null, error: { code: "23504" } };
      if (events.has(eventId)) return { data: null, error: { code: "23505" } };
      events.set(eventId, { status: "processing", execution_id: executionId, lease_expires_at: leaseExpiresAt, plan_id: null });
      return { data: { event_id: eventId }, error: null };
    },
    findEvent: async (eventId) => {
      const event = events.get(eventId);
      return { data: event ?? null, error: null };
    },
    claimEvent: async (eventId, executionId, leaseExpiresAt, claimOptions) => {
      claims.push({ eventId, executionId, fromStatus: claimOptions.fromStatus, expiredOnly: claimOptions.expiredOnly });
      const event = events.get(eventId);
      if (!event) return { data: null, error: new Error("not found") };
      if (event.status !== claimOptions.fromStatus) return { data: null, error: null };
      if (claimOptions.expiredOnly && event.lease_expires_at && new Date(event.lease_expires_at).getTime() > new Date("2026-09-18T00:00:00Z").getTime()) {
        return { data: null, error: null };
      }
      event.status = "processing";
      event.execution_id = executionId;
      event.lease_expires_at = leaseExpiresAt;
      return { data: { event_id: eventId }, error: null };
    },
    finishEvent: async (eventId, executionId, status) => {
      const event = events.get(eventId);
      // Zero rows: the lease was taken by a newer execution mid-flight.
      if (state.stealFinish) return { updated: 0, error: null };
      if (!event || event.execution_id !== executionId) return { updated: 0, error: null };
      event.status = status;
      event.lease_expires_at = null;
      calls.finished++;
      return { updated: 1, error: null };
    },
    bindEventPlan: async (eventId, executionId, planId) => {
      const event = events.get(eventId);
      if (!event || event.execution_id !== executionId) return { updated: 0, error: null };
      if (event.plan_id && event.plan_id !== planId) return { updated: 0, error: new Error("plan_already_bound") };
      if (event.plan_id) return { updated: 1, error: null };
      event.plan_id = planId;
      calls.bound.push(planId);
      return { updated: 1, error: null };
    },
    findPlans: async () => {
      if (options.failFindPlans) return { data: null, error: new Error("db error") };
      return { data: plans, error: null };
    },
    findPlanById: async (planId) => {
      if (options.failFindPlans) return { data: null, error: new Error("db error") };
      return { data: plans.find((p) => p.id === planId) ?? null, error: null };
    },
    checkRevenueCat: async () => options.rc ?? { ok: true, active: true },
    confirmPurchase: async (planId) => {
      calls.confirmed++;
      const plan = plans.find((p) => p.id === planId);
      if (plan && !plan.purchase_confirmed_at) plan.purchase_confirmed_at = "2026-09-18T00:00:00Z";
      return { updated: 1, error: null };
    },
    issue: async () => {
      calls.issued++;
      return options.issueResult ?? { ok: true, status: "sent" };
    },
  };

  return { deps, events, calls, claims, setStealFinish: (v: boolean) => { state.stealFinish = v; } };
}

describe("plan resolution from event.metadata.brainy_plan_id", () => {
  const event = (id: string, metadata?: unknown, user = USER) => ({ id, type: "INITIAL_PURCHASE", app_user_id: user, metadata });

  it("extracts only a string plan id from metadata", () => {
    expect(planIdFromMetadata({ brainy_plan_id: PLAN })).toBe(PLAN);
    expect(planIdFromMetadata({ brainy_plan_id: `  ${PLAN} ` })).toBe(PLAN);
    expect(planIdFromMetadata({ brainy_plan_id: 42 })).toBe("");
    expect(planIdFromMetadata({})).toBe("");
    expect(planIdFromMetadata(null)).toBe("");
    expect(planIdFromMetadata("plan")).toBe("");
  });

  it("resolves the declared plan and pins it to the event", async () => {
    const { deps, events, calls } = webhookFake([basePlan()]);
    const result = await handleRevenueCatWebhook(
      { authorization: "secret", configuredAuthorization: "secret", event: event("m-1", { brainy_plan_id: PLAN }) },
      deps,
    );
    expect(result).toMatchObject({ status: 200, body: { success: true, status: "sent", planId: PLAN } });
    expect(calls.bound).toEqual([PLAN]);
    expect(events.get("m-1")?.plan_id).toBe(PLAN);
  });

  it("refuses a declared plan owned by another user", async () => {
    const { deps, calls, events } = webhookFake([basePlan({ funnel_user_id: OTHER_USER })]);
    const result = await handleRevenueCatWebhook(
      { authorization: "secret", configuredAuthorization: "secret", event: event("m-2", { brainy_plan_id: PLAN }) },
      deps,
    );
    expect(result).toMatchObject({ status: 200, body: { ignored: true, reason: "plan_not_owned" } });
    expect(calls.confirmed).toBe(0);
    expect(calls.issued).toBe(0);
    expect(events.get("m-2")?.status).toBe("ignored");
  });

  it("retries when the declared plan does not exist instead of guessing another", async () => {
    const { deps, calls } = webhookFake([basePlan({ id: PLAN_2 })]);
    const result = await handleRevenueCatWebhook(
      { authorization: "secret", configuredAuthorization: "secret", event: event("m-3", { brainy_plan_id: PLAN }) },
      deps,
    );
    expect(result).toMatchObject({ status: 503, body: { retryable: true, error: "declared_plan_not_found" } });
    expect(calls.confirmed).toBe(0);
    expect(calls.issued).toBe(0);
  });

  it("ignores a non-uuid declared plan id", async () => {
    const { deps, calls } = webhookFake([basePlan()]);
    const result = await handleRevenueCatWebhook(
      { authorization: "secret", configuredAuthorization: "secret", event: event("m-4", { brainy_plan_id: "demo-1" }) },
      deps,
    );
    expect(result).toMatchObject({ status: 200, body: { ignored: true, reason: "invalid_plan_id" } });
    expect(calls.issued).toBe(0);
  });

  it("keeps the pinned plan on retry even when a newer plan exists", async () => {
    const plans = [basePlan({ id: PLAN_2, created_at: "2026-09-19T00:00:00Z" }), basePlan()];
    const { deps, calls } = webhookFake(plans, { issueResult: { ok: false, status: "retryable" } });
    // First delivery pins the declared (older) plan, then fails.
    const first = await handleRevenueCatWebhook(
      { authorization: "secret", configuredAuthorization: "secret", event: event("m-5", { brainy_plan_id: PLAN }) },
      deps,
    );
    expect(first).toMatchObject({ status: 503, body: { retryable: true } });
    expect(calls.bound).toEqual([PLAN]);

    // Retry must still target the pinned plan, not the newer one.
    deps.issue = async () => { calls.issued++; return { ok: true, status: "sent" }; };
    const retry = await handleRevenueCatWebhook(
      { authorization: "secret", configuredAuthorization: "secret", event: event("m-5", { brainy_plan_id: PLAN }) },
      deps,
    );
    expect(retry).toMatchObject({ status: 200, body: { success: true, planId: PLAN } });
    // PLAN_2 was never confirmed.
    expect(plans.find((p) => p.id === PLAN_2)?.purchase_confirmed_at).toBeNull();
  });

  it("does not re-pin a different plan onto an event", async () => {
    const plans = [basePlan({ id: PLAN_2 }), basePlan()];
    const { deps } = webhookFake(plans);
    await handleRevenueCatWebhook(
      { authorization: "secret", configuredAuthorization: "secret", event: event("m-6", { brainy_plan_id: PLAN }) },
      deps,
    );
    // Simulate a tampered replay declaring a different plan for the same event.
    const replay = await handleRevenueCatWebhook(
      { authorization: "secret", configuredAuthorization: "secret", event: event("m-6", { brainy_plan_id: PLAN_2 }) },
      deps,
    );
    expect(replay.body).toMatchObject({ success: true });
  });
});

describe("pending issuance is retried even when the purchase is already confirmed", () => {
  it("issues again when confirmed but credentials were never delivered", async () => {
    const plan = basePlan({ purchase_confirmed_at: "2026-09-17T00:00:00Z", credentials_issued_at: null });
    const { deps, calls } = webhookFake([plan]);
    const result = await handleRevenueCatWebhook(
      { authorization: "secret", configuredAuthorization: "secret", event: { id: "p-1", type: "INITIAL_PURCHASE", app_user_id: USER, metadata: { brainy_plan_id: PLAN } } },
      deps,
    );
    expect(result).toMatchObject({ status: 200, body: { success: true, status: "sent" } });
    expect(calls.issued).toBe(1);
    // Already confirmed: no second confirmation write.
    expect(calls.confirmed).toBe(0);
  });

  it("ignores the event when credentials were already issued", async () => {
    const plan = basePlan({ purchase_confirmed_at: "2026-09-17T00:00:00Z", credentials_issued_at: "2026-09-17T01:00:00Z" });
    const { deps, calls } = webhookFake([plan]);
    const result = await handleRevenueCatWebhook(
      { authorization: "secret", configuredAuthorization: "secret", event: { id: "p-2", type: "INITIAL_PURCHASE", app_user_id: USER } },
      deps,
    );
    expect(result).toMatchObject({ status: 200, body: { ignored: true, reason: "already_issued" } });
    expect(calls.issued).toBe(0);
  });
});

describe("affected-rows check on finish", () => {
  it("reports retryable and does not claim success when the lease was stolen", async () => {
    const { deps, events, setStealFinish } = webhookFake([basePlan()]);
    setStealFinish(true);
    const result = await handleRevenueCatWebhook(
      { authorization: "secret", configuredAuthorization: "secret", event: { id: "s-1", type: "INITIAL_PURCHASE", app_user_id: USER, metadata: { brainy_plan_id: PLAN } } },
      deps,
    );
    // The email may have been sent, but this execution may NOT close the event.
    expect(result).toMatchObject({ status: 503, body: { retryable: true, error: "event_finish_failed" } });
    // The event must not be left marked processed by a stale execution.
    expect(events.get("s-1")?.status).toBe("processing");
  });

  it("reports retryable when a release path updates zero rows", async () => {
    // The release path (finish) is the one used for retryable/ignored outcomes.
    // A stale execution must not be able to mark the event as such.
    const { deps, events, setStealFinish } = webhookFake([basePlan()], { rc: { ok: true, active: false } });
    setStealFinish(true);
    const result = await handleRevenueCatWebhook(
      { authorization: "secret", configuredAuthorization: "secret", event: { id: "s-2", type: "INITIAL_PURCHASE", app_user_id: USER, metadata: { brainy_plan_id: PLAN } } },
      deps,
    );
    expect(result).toMatchObject({ status: 503, body: { retryable: true, error: "event_finish_failed" } });
    // Not silently recorded as retryable/ignored by an execution without the lease.
    expect(events.get("s-2")?.status).toBe("processing");
  });
});

describe("revenuecat-webhook handler", () => {
  const event = (type: string, id = "event-1", user = USER) => ({ id, type, app_user_id: user, period_type: type === "INITIAL_PURCHASE" ? "TRIAL" : undefined });

  it("rejects invalid auth", async () => {
    const { deps } = webhookFake();
    const result = await handleRevenueCatWebhook({ authorization: "bad", configuredAuthorization: "secret", event: event("INITIAL_PURCHASE") }, deps);
    expect(result.status).toBe(401);
  });

  it("processes INITIAL_PURCHASE with valid plan", async () => {
    const { deps, calls } = webhookFake([basePlan()]);
    const result = await handleRevenueCatWebhook({ authorization: "secret", configuredAuthorization: "secret", event: event("INITIAL_PURCHASE") }, deps);
    expect(result).toMatchObject({ status: 200, body: { success: true, status: "sent" } });
    expect(calls.confirmed).toBe(1);
    expect(calls.issued).toBe(1);
  });

  it("returns retryable when plan lookup fails", async () => {
    const { deps, events } = webhookFake([], { failFindPlans: true });
    const result = await handleRevenueCatWebhook({ authorization: "secret", configuredAuthorization: "secret", event: event("INITIAL_PURCHASE", "event-2") }, deps);
    expect(result.body).toMatchObject({ retryable: true, error: "plan_lookup_failed" });
    expect(events.get("event-2")?.status).toBe("retryable");
  });

  it("allows retry when event is stuck in processing (expired lease)", async () => {
    const { deps, events } = webhookFake([basePlan()]);
    events.set("event-3", { status: "processing", execution_id: "old-exec", lease_expires_at: "2026-09-17T00:00:00Z" });
    const result = await handleRevenueCatWebhook({ authorization: "secret", configuredAuthorization: "secret", event: event("INITIAL_PURCHASE", "event-3") }, deps);
    expect(result.body).toMatchObject({ success: true, status: "sent" });
    expect(events.get("event-3")?.status).toBe("processed");
  });

  it("does not take control when the processing lease is still valid", async () => {
    const { deps, events, calls, claims } = webhookFake([basePlan()]);
    events.set("event-4", { status: "processing", execution_id: "active-exec", lease_expires_at: "2026-09-19T00:00:00Z" });

    const result = await handleRevenueCatWebhook({ authorization: "secret", configuredAuthorization: "secret", event: event("INITIAL_PURCHASE", "event-4") }, deps);

    // The handler must decide this on its own: it may not even attempt to claim,
    // otherwise a DB that ignores the expiry filter would hand out the event twice.
    expect(claims).toHaveLength(0);
    expect(result.body).toMatchObject({ idempotent: true });
    expect(calls.confirmed).toBe(0);
    expect(calls.issued).toBe(0);
    // The live execution keeps its lease and its identity.
    expect(events.get("event-4")?.execution_id).toBe("active-exec");
    expect(events.get("event-4")?.lease_expires_at).toBe("2026-09-19T00:00:00Z");
    expect(events.get("event-4")?.status).toBe("processing");
  });

  it("recovers an abandoned processing execution only after the lease expires", async () => {
    const { deps, events, calls, claims } = webhookFake([basePlan()]);
    events.set("event-4b", { status: "processing", execution_id: "dead-exec", lease_expires_at: "2026-09-17T23:59:00Z" });

    const result = await handleRevenueCatWebhook({ authorization: "secret", configuredAuthorization: "secret", event: event("INITIAL_PURCHASE", "event-4b") }, deps);

    expect(claims).toHaveLength(1);
    expect(claims[0]).toMatchObject({ fromStatus: "processing", expiredOnly: true });
    expect(result.body).toMatchObject({ success: true, status: "sent" });
    expect(events.get("event-4b")?.status).toBe("processed");
    // The takeover replaced the dead execution identity.
    expect(events.get("event-4b")?.execution_id).not.toBe("dead-exec");
    expect(calls.issued).toBe(1);
  });

  it("keeps the event retryable when issuance reports in_progress as a failure", async () => {
    const { deps, events } = webhookFake([basePlan()], { issueResult: { ok: false, status: "in_progress" } });
    const result = await handleRevenueCatWebhook({ authorization: "secret", configuredAuthorization: "secret", event: event("INITIAL_PURCHASE", "event-5") }, deps);
    expect(result.body).toMatchObject({ retryable: true, error: "issuance_in_progress" });
    expect(events.get("event-5")?.status).toBe("retryable");
  });

  it("keeps the event retryable when issuance reports in_progress as a success", async () => {
    const { deps, events } = webhookFake([basePlan()], { issueResult: { ok: true, status: "in_progress" } });
    const result = await handleRevenueCatWebhook({ authorization: "secret", configuredAuthorization: "secret", event: event("INITIAL_PURCHASE", "event-5b") }, deps);
    expect(result.body).toMatchObject({ retryable: true, error: "issuance_in_progress" });
    expect(events.get("event-5b")?.status).toBe("retryable");
  });

  it("lets a later delivery finish an event left retryable by an in_progress issuance", async () => {
    const { deps, events, calls } = webhookFake([basePlan()], { issueResult: { ok: false, status: "in_progress" } });
    await handleRevenueCatWebhook({ authorization: "secret", configuredAuthorization: "secret", event: event("INITIAL_PURCHASE", "event-5c") }, deps);
    expect(events.get("event-5c")?.status).toBe("retryable");

    deps.issue = async () => { calls.issued++; return { ok: true, status: "sent" }; };
    const retry = await handleRevenueCatWebhook({ authorization: "secret", configuredAuthorization: "secret", event: event("INITIAL_PURCHASE", "event-5c") }, deps);
    expect(retry.body).toMatchObject({ success: true, status: "sent" });
    expect(events.get("event-5c")?.status).toBe("processed");
  });

  it("does not confirm a new pending plan when a confirmed plan still awaits delivery", async () => {
    const plans = [
      basePlan({ id: "plan-old", purchase_confirmed_at: "2026-09-17T00:00:00Z" }),
      basePlan({ id: "plan-new", created_at: "2026-09-19T00:00:00Z" }),
    ];
    const { deps, calls } = webhookFake(plans);
    // A renewal must complete the CONFIRMED plan's outstanding delivery and must
    // never confirm the newer pending plan.
    const result = await handleRevenueCatWebhook({ authorization: "secret", configuredAuthorization: "secret", event: event("RENEWAL", "event-6") }, deps);
    expect(result).toMatchObject({ status: 200, body: { success: true, planId: "plan-old" } });
    expect(plans.find((p) => p.id === "plan-new")?.purchase_confirmed_at).toBeNull();
    expect(calls.confirmed).toBe(0);
  });

  it("returns ambiguous_plan when multiple pending plans exist", async () => {
    const { deps, events } = webhookFake([
      basePlan({ id: "plan-1", created_at: "2026-09-17T00:00:00Z" }),
      basePlan({ id: "plan-2", created_at: "2026-09-19T00:00:00Z" }),
    ]);
    const result = await handleRevenueCatWebhook({ authorization: "secret", configuredAuthorization: "secret", event: event("INITIAL_PURCHASE", "event-7") }, deps);
    expect(result.body).toMatchObject({ retryable: true, error: "ambiguous_plan" });
    expect(events.get("event-7")?.status).toBe("retryable");
  });

  it("ignores renewal without eligible plans", async () => {
    const { deps } = webhookFake([]);
    const result = await handleRevenueCatWebhook({ authorization: "secret", configuredAuthorization: "secret", event: event("RENEWAL", "event-8") }, deps);
    expect(result.body).toMatchObject({ ignored: true });
  });

  it("does not issue for inactive or unavailable RevenueCat", async () => {
    const inactive = webhookFake([basePlan()], { rc: { ok: true, active: false } });
    expect((await handleRevenueCatWebhook({ authorization: "secret", configuredAuthorization: "secret", event: event("INITIAL_PURCHASE", "event-9") }, inactive.deps)).body).toMatchObject({ error: "entitlement_inactive" });

    const unavailable = webhookFake([basePlan()], { rc: { ok: false, active: false } });
    expect((await handleRevenueCatWebhook({ authorization: "secret", configuredAuthorization: "secret", event: event("INITIAL_PURCHASE", "event-10") }, unavailable.deps)).body).toMatchObject({ retryable: true });
  });

  it("deduplicates event.id", async () => {
    const { deps, calls } = webhookFake([basePlan()]);
    await handleRevenueCatWebhook({ authorization: "secret", configuredAuthorization: "secret", event: event("INITIAL_PURCHASE", "event-11") }, deps);
    const second = await handleRevenueCatWebhook({ authorization: "secret", configuredAuthorization: "secret", event: event("INITIAL_PURCHASE", "event-11") }, deps);
    expect(second.body).toMatchObject({ idempotent: true });
    expect(calls.issued).toBe(1);
  });
});
