import { handleRevenueCatWebhook, type WebhookDeps } from "../handler.ts";
import { sha256Hex } from "../../_shared/funnel-identity-core.ts";

const USER = "550e8400-e29b-41d4-a716-446655440000";
const PLAN = "550e8400-e29b-41d4-a716-446655440002";
const TOKEN = "claim-token";

function basePlan(overrides: Record<string, unknown> = {}) {
  return {
    id: PLAN,
    funnel_user_id: USER,
    status: "pending",
    claimed_by_user_id: null,
    purchase_confirmed_at: null,
    created_at: "2026-09-18T00:00:00Z",
    ...overrides,
  };
}

function webhookFake(plans: Array<Record<string, unknown>> = [], options: { rc?: { ok: boolean; active: boolean }; issueResult?: { ok: boolean; status: string }; failInsert?: boolean; failFindPlans?: boolean } = {}) {
  const events = new Map<string, { status: string; execution_id: string | null; lease_expires_at: string | null }>();
  const calls = { confirmed: 0, issued: 0, finished: 0 };
  const claims: Array<{ eventId: string; executionId: string; fromStatus: string; expiredOnly?: boolean }> = [];
  let executionCounter = 0;

  const deps: WebhookDeps = {
    now: () => new Date("2026-09-18T00:00:00Z"),
    insertEvent: async (eventId, _type, _appUserId, executionId, leaseExpiresAt) => {
      if (options.failInsert) return { data: null, error: { code: "23504" } };
      if (events.has(eventId)) return { data: null, error: { code: "23505" } };
      events.set(eventId, { status: "processing", execution_id: executionId, lease_expires_at: leaseExpiresAt });
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
    finishEvent: async (eventId, _executionId, status) => {
      const event = events.get(eventId);
      if (event) {
        event.status = status;
        event.lease_expires_at = null;
      }
      calls.finished++;
      return { error: null };
    },
    findPlans: async () => {
      if (options.failFindPlans) return { data: null, error: new Error("db error") };
      return { data: plans, error: null };
    },
    checkRevenueCat: async () => options.rc ?? { ok: true, active: true },
    confirmPurchase: async () => { calls.confirmed++; return { error: null }; },
    issue: async () => {
      calls.issued++;
      return options.issueResult ?? { ok: true, status: "sent" };
    },
  };

  return { deps, events, calls, claims };
}

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

  it("does not confirm a new plan when another is already confirmed", async () => {
    const { deps, calls } = webhookFake([
      basePlan({ id: "plan-old", purchase_confirmed_at: "2026-09-17T00:00:00Z" }),
      basePlan({ id: "plan-new", created_at: "2026-09-19T00:00:00Z" }),
    ]);
    const result = await handleRevenueCatWebhook({ authorization: "secret", configuredAuthorization: "secret", event: event("RENEWAL", "event-6") }, deps);
    expect(result.body).toMatchObject({ ignored: true });
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
