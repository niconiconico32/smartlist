import {
  completeFunnelAccount,
  issueFunnelCredentialsWithDeps,
  prepareFunnelAccount,
  revenueCatWebhook,
  type FunnelPlan,
  type IssueDeps,
  type PrepareDeps,
  type WebhookDeps,
} from "../funnel-happy-path";
import { sha256Hex } from "../funnel-identity-core";

const USER = "550e8400-e29b-41d4-a716-446655440000";
const OTHER = "550e8400-e29b-41d4-a716-446655440001";
const PLAN = "550e8400-e29b-41d4-a716-446655440002";
const TOKEN = "claim-token";

function basePlan(overrides: Partial<FunnelPlan> = {}): FunnelPlan {
  return { id: PLAN, email: null, claimTokenHash: "", status: "pending", ...overrides };
}

async function preparedPlan(overrides: Partial<FunnelPlan> = {}) {
  return { ...basePlan(overrides), claimTokenHash: await sha256Hex(TOKEN) };
}

function prepareFake(plan: FunnelPlan, users: { id: string; email: string }[] = [], alreadyPro = false): PrepareDeps & { created: string[] } {
  const created: string[] = [];
  return {
    created,
    now: () => new Date("2026-09-18T00:00:00Z"),
    findPlan: async () => plan,
    findUserByEmail: async (email) => users.find((u) => u.email === email) ?? null,
    hasUnissuedFunnelAccount: async () => false,
    createUser: async (email) => { const user = { id: OTHER, email }; created.push(email); return user; },
    deleteUser: async () => undefined,
    persistIdentity: async (_id, email, userId, createdByFunnel) => { plan.email = email; plan.funnelUserId = userId; plan.accountCreatedByFunnel = createdByFunnel; return true; },
    checkRevenueCat: async () => ({ ok: true, active: alreadyPro }),
  };
}

function eventFake(plan: FunnelPlan | null, rc: { ok: boolean; active: boolean } = { ok: true, active: true }) {
  const events = new Map<string, string>();
  const calls = { confirmed: 0, issued: 0 };
  const deps: WebhookDeps = {
    now: () => new Date("2026-09-18T00:00:00Z"),
    eventBegin: async ({ id }) => { if (events.has(id)) return "duplicate"; events.set(id, "processing"); return "started"; },
    eventFinish: async (id, status) => { events.set(id, status); },
    findPlan: async () => plan,
    checkRevenueCat: async () => rc,
    confirmPurchase: async () => { calls.confirmed++; if (plan) plan.purchaseConfirmedAt = "2026-09-18T00:00:00Z"; },
    issue: async () => { calls.issued++; return { status: "sent" }; },
  };
  return { deps, events, calls };
}

function issueFake(plan: FunnelPlan, options: { rc?: { ok: boolean; active: boolean }; sendResults?: boolean[] } = {}) {
  const sent = options.sendResults ?? [true];
  let leaseTaken = false;
  let sendCount = 0;
  const passwords: string[] = [];
  const emails: unknown[] = [];
  const deps: IssueDeps = {
    now: () => new Date("2026-09-18T00:00:00Z"),
    getPlan: async () => plan,
    checkRevenueCat: async () => options.rc ?? { ok: true, active: true },
    acquireLease: async () => { if (plan.credentialsIssuedAt) return "already_completed"; if (leaseTaken) return "in_progress"; leaseTaken = true; return "acquired"; },
    isAccountUsed: async () => false,
    derivePassword: async () => "004207",
    updatePassword: async (_id, password) => { passwords.push(password); },
    sendEmail: async (input) => { emails.push(input); return { accepted: sent[Math.min(sendCount++, sent.length - 1)], id: "email-id" }; },
    markIssued: async (_id, _emailId, now) => { plan.credentialsIssuedAt = now.toISOString(); leaseTaken = false; },
    releaseLease: async () => { leaseTaken = false; },
  };
  return { deps, passwords, emails };
}

describe("prepare-funnel-account pure handler", () => {
  it("creates a new email identity", async () => {
    const plan = await preparedPlan();
    const fake = prepareFake(plan);
    const result = await prepareFunnelAccount({ planId: PLAN, claimToken: TOKEN, email: " New@Example.com " }, fake);
    expect(result).toEqual({ status: 200, body: { success: true, userId: OTHER, alreadyPro: false } });
    expect(fake.created).toEqual(["new@example.com"]);
    expect(plan.accountCreatedByFunnel).toBe(true);
  });

  it("reuses an existing user without changing its password", async () => {
    const plan = await preparedPlan();
    const fake = prepareFake(plan, [{ id: USER, email: "user@example.com" }]);
    const result = await prepareFunnelAccount({ planId: PLAN, claimToken: TOKEN, email: "USER@example.com" }, fake);
    expect(result.body).toMatchObject({ userId: USER, alreadyPro: false });
    expect(plan.accountCreatedByFunnel).toBe(false);
    expect(fake.created).toHaveLength(0);
  });

  it("is idempotent for the same identity and rejects a different email", async () => {
    const plan = await preparedPlan({ email: "user@example.com", funnelUserId: USER });
    const fake = prepareFake(plan, [], true);
    await expect(prepareFunnelAccount({ planId: PLAN, claimToken: TOKEN, email: "user@example.com" }, fake)).resolves.toMatchObject({ status: 200, body: { userId: USER, alreadyPro: true } });
    await expect(prepareFunnelAccount({ planId: PLAN, claimToken: TOKEN, email: "other@example.com" }, fake)).resolves.toMatchObject({ status: 409, body: { error: "identity_conflict" } });
  });

  it("returns alreadyPro from server-side RevenueCat", async () => {
    const plan = await preparedPlan();
    const result = await prepareFunnelAccount({ planId: PLAN, claimToken: TOKEN, email: "pro@example.com" }, prepareFake(plan, [], true));
    expect(result.body).toMatchObject({ alreadyPro: true });
  });

  it("treats an abandoned funnel-created account as new for a later plan", async () => {
    const plan = await preparedPlan();
    const fake = prepareFake(plan, [{ id: USER, email: "user@example.com" }]);
    fake.hasUnissuedFunnelAccount = async () => true;
    const result = await prepareFunnelAccount({ planId: PLAN, claimToken: TOKEN, email: "user@example.com" }, fake);
    expect(result.body).toMatchObject({ userId: USER });
    expect(plan.accountCreatedByFunnel).toBe(true);
  });

  it("does not delete an existing account when identity persistence fails", async () => {
    const plan = await preparedPlan();
    const fake = prepareFake(plan, [{ id: USER, email: "user@example.com" }]);
    fake.hasUnissuedFunnelAccount = async () => true;
    fake.persistIdentity = async () => false;
    const deleted: string[] = [];
    fake.deleteUser = async (userId) => { deleted.push(userId); };
    const result = await prepareFunnelAccount({ planId: PLAN, claimToken: TOKEN, email: "user@example.com" }, fake);
    expect(result.status).toBe(409);
    expect(deleted).toHaveLength(0);
  });
});

describe("RevenueCat webhook pure handler", () => {
  const event = (type: string, id = "event-1", user = USER) => ({ id, type, app_user_id: user, period_type: type === "INITIAL_PURCHASE" ? "TRIAL" : undefined });
  it("rejects invalid auth", async () => {
    const fake = eventFake(null);
    expect((await revenueCatWebhook({ authorization: "bad", configuredAuthorization: "secret", event: event("INITIAL_PURCHASE") }, fake.deps)).status).toBe(401);
  });
  it.each(["INITIAL_PURCHASE", "RENEWAL"])("processes %s, including trial INITIAL_PURCHASE", async (type) => {
    const fake = eventFake(await preparedPlan({ funnelUserId: USER }));
    const result = await revenueCatWebhook({ authorization: "secret", configuredAuthorization: "secret", event: event(type) }, fake.deps);
    expect(result).toMatchObject({ status: 200, body: { success: true, status: "sent" } });
    expect(fake.calls.confirmed).toBe(1);
  });
  it("ignores renewal without a pending plan and invalid app_user_id", async () => {
    const noPlan = eventFake(null);
    expect((await revenueCatWebhook({ authorization: "secret", configuredAuthorization: "secret", event: event("RENEWAL") }, noPlan.deps)).body).toMatchObject({ ignored: true });
    const invalid = eventFake(null);
    expect((await revenueCatWebhook({ authorization: "secret", configuredAuthorization: "secret", event: event("INITIAL_PURCHASE", "event-2", "not-a-uuid") }, invalid.deps)).body).toMatchObject({ ignored: true });
  });
  it("deduplicates event.id", async () => {
    const fake = eventFake(await preparedPlan({ funnelUserId: USER }));
    await revenueCatWebhook({ authorization: "secret", configuredAuthorization: "secret", event: event("INITIAL_PURCHASE") }, fake.deps);
    const second = await revenueCatWebhook({ authorization: "secret", configuredAuthorization: "secret", event: event("INITIAL_PURCHASE") }, fake.deps);
    expect(second.body).toMatchObject({ idempotent: true });
    expect(fake.calls.issued).toBe(1);
  });
  it("does not issue for inactive or unavailable RevenueCat", async () => {
    const inactive = eventFake(await preparedPlan({ funnelUserId: USER }), { ok: true, active: false });
    expect((await revenueCatWebhook({ authorization: "secret", configuredAuthorization: "secret", event: event("INITIAL_PURCHASE") }, inactive.deps)).body).toMatchObject({ error: "entitlement_inactive" });
    const unavailable = eventFake(await preparedPlan({ funnelUserId: USER }), { ok: false, active: false });
    expect((await revenueCatWebhook({ authorization: "secret", configuredAuthorization: "secret", event: event("INITIAL_PURCHASE", "event-2") }, unavailable.deps)).body).toMatchObject({ retryable: true });
  });
});

describe("credential convergence pure handler", () => {
  it("supports webhook-only, fast-path-then-webhook, and webhook-then-fast-path", async () => {
    const plan = await preparedPlan({ funnelUserId: USER, accountCreatedByFunnel: true, purchaseConfirmedAt: "now" });
    const fake = issueFake(plan);
    const first = await issueFunnelCredentialsWithDeps(PLAN, USER, fake.deps);
    const second = await issueFunnelCredentialsWithDeps(PLAN, USER, fake.deps);
    expect(first.status).toBe("sent");
    expect(second.status).toBe("already_completed");
    expect(fake.passwords).toEqual(["004207"]);
    expect(fake.emails).toHaveLength(1);
  });

  it("serializes concurrent issuance with one lease", async () => {
    const plan = await preparedPlan({ funnelUserId: USER, accountCreatedByFunnel: true, purchaseConfirmedAt: "now" });
    const fake = issueFake(plan);
    const [a, b] = await Promise.all([issueFunnelCredentialsWithDeps(PLAN, USER, fake.deps), issueFunnelCredentialsWithDeps(PLAN, USER, fake.deps)]);
    expect([a.status, b.status].sort()).toEqual(["in_progress", "sent"]);
    expect(fake.passwords).toHaveLength(1);
    expect(fake.emails).toHaveLength(1);
  });

  it("retries Resend with the same HMAC-derived password", async () => {
    const plan = await preparedPlan({ funnelUserId: USER, accountCreatedByFunnel: true, purchaseConfirmedAt: "now" });
    const fake = issueFake(plan, { sendResults: [false, true] });
    expect((await issueFunnelCredentialsWithDeps(PLAN, USER, fake.deps)).status).toBe("retryable");
    expect((await issueFunnelCredentialsWithDeps(PLAN, USER, fake.deps)).status).toBe("sent");
    expect(fake.passwords).toEqual(["004207", "004207"]);
  });

  it("does not rotate issued passwords and preserves existing-user passwords", async () => {
    const issued = await preparedPlan({ funnelUserId: USER, accountCreatedByFunnel: true, purchaseConfirmedAt: "now", credentialsIssuedAt: "already" });
    const issuedFake = issueFake(issued);
    expect((await issueFunnelCredentialsWithDeps(PLAN, USER, issuedFake.deps)).status).toBe("already_completed");
    expect(issuedFake.passwords).toHaveLength(0);
    const existing = await preparedPlan({ funnelUserId: USER, accountCreatedByFunnel: false, purchaseConfirmedAt: "now" });
    const existingFake = issueFake(existing);
    await issueFunnelCredentialsWithDeps(PLAN, USER, existingFake.deps);
    expect(existingFake.passwords).toHaveLength(0);
    expect((existingFake.emails[0] as any).accountCreatedByFunnel).toBe(false);
  });

  it("does not replace a password when a funnel-created account was already used", async () => {
    const plan = await preparedPlan({ funnelUserId: USER, accountCreatedByFunnel: true, purchaseConfirmedAt: "now" });
    const fake = issueFake(plan);
    fake.deps.isAccountUsed = async () => true;
    await issueFunnelCredentialsWithDeps(PLAN, USER, fake.deps);
    expect(fake.passwords).toHaveLength(0);
    expect((fake.emails[0] as any).accountCreatedByFunnel).toBe(false);
  });

  it("complete confirms purchase and uses the same issue function", async () => {
    const plan = await preparedPlan({ funnelUserId: USER });
    let confirmed = false;
    const result = await completeFunnelAccount({ planId: PLAN, claimToken: TOKEN }, {
      now: () => new Date("2026-09-18T00:00:00Z"), findPlan: async () => plan,
      checkRevenueCat: async () => ({ ok: true, active: true }),
      confirmPurchase: async () => { confirmed = true; plan.purchaseConfirmedAt = "now"; },
      issue: async () => ({ status: "sent" }),
    });
    expect(result).toMatchObject({ status: 200, body: { status: "sent" } });
    expect(confirmed).toBe(true);
  });

  it("does not expose secrets or complete email addresses through logs", async () => {
    const spy = jest.spyOn(console, "log").mockImplementation(() => undefined);
    const plan = await preparedPlan({ funnelUserId: USER, accountCreatedByFunnel: true, purchaseConfirmedAt: "now" });
    await issueFunnelCredentialsWithDeps(PLAN, USER, issueFake(plan).deps);
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });
});
