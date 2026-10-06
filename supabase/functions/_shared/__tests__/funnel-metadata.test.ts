import {
  prepareFunnelAccountHandler,
  type PrepareHandlerDeps,
  type PreparePlan,
  type PrepareUser,
  type RcResult,
} from "../funnel-prepare-handler";
import { sha256Hex } from "../funnel-identity-core";
import {
  funnelCreatedMetadata,
  hasFunnelOnboardingFlag,
  isFunnelCreatedAccount,
  withFunnelOnboarding,
} from "../funnel-metadata";

const USER = "550e8400-e29b-41d4-a716-446655440000";
const OTHER = "550e8400-e29b-41d4-a716-446655440001";
const PLAN = "550e8400-e29b-41d4-a716-446655440002";
const TOKEN = "claim-token";
const EMAIL = "user@example.com";

interface FakeState {
  created: { email: string; metadata: Record<string, unknown> }[];
  metadataUpdates: { userId: string; metadata: Record<string, unknown> }[];
  authCalls: string[];
  plan: PreparePlan;
  authUser: PrepareUser | null;
  rc: RcResult;
  persistSucceeds: boolean;
  unissued: boolean;
}

async function pendingPlan(overrides: Partial<PreparePlan> = {}): Promise<PreparePlan> {
  return { id: PLAN, email: null, claimTokenHash: await sha256Hex(TOKEN), status: "pending", ...overrides };
}

async function buildFake(overrides: Partial<FakeState> = {}): Promise<{ deps: PrepareHandlerDeps; state: FakeState }> {
  const state: FakeState = {
    created: [],
    metadataUpdates: [],
    authCalls: [],
    plan: await pendingPlan(),
    authUser: null,
    rc: { ok: true, active: false },
    persistSucceeds: true,
    unissued: false,
    ...overrides,
  };

  const deps: PrepareHandlerDeps = {
    now: () => new Date("2026-09-18T00:00:00Z"),
    findPlan: async (planId) => (planId === state.plan.id ? state.plan : null),
    findUserByEmail: async (email) => {
      state.authCalls.push("findUserByEmail");
      if (state.authUser && (state.authUser.email ?? "").toLowerCase() === email.toLowerCase()) return state.authUser;
      return null;
    },
    hasUnissuedFunnelAccount: async () => state.unissued,
    createUser: async (email, metadata) => {
      state.authCalls.push("createUser");
      state.created.push({ email, metadata });
      return { id: USER, email };
    },
    persistIdentity: async (planId, email, userId, createdByFunnel) => {
      state.authCalls.push("persistIdentity");
      if (!state.persistSucceeds) return false;
      state.plan = { ...state.plan, email, funnelUserId: userId, accountCreatedByFunnel: createdByFunnel };
      return true;
    },
    checkRevenueCat: async () => state.rc,
  };
  return { deps, state };
}

const request = (overrides: Record<string, unknown> = {}) => ({ planId: PLAN, claimToken: TOKEN, email: EMAIL, ...overrides });

describe("funnel metadata contract", () => {
  it("stamps ONLY the funnel marker at creation", () => {
    expect(funnelCreatedMetadata()).toEqual({ brainy_funnel_account_created: true });
  });

  it("never claims onboarding completion at creation", () => {
    // The app treats `onboarding_completed` as "content already in place".
    expect("onboarding_completed" in funnelCreatedMetadata()).toBe(false);
  });

  it("uses a real boolean for the funnel marker", () => {
    expect(typeof funnelCreatedMetadata().brainy_funnel_account_created).toBe("boolean");
  });

  it("detects the onboarding flag strictly", () => {
    expect(hasFunnelOnboardingFlag({ onboarding_completed: true })).toBe(true);
    expect(hasFunnelOnboardingFlag({ onboarding_completed: "true" })).toBe(false);
    expect(hasFunnelOnboardingFlag({})).toBe(false);
    expect(hasFunnelOnboardingFlag(null)).toBe(false);
  });

  it("only adds the missing flag when completing onboarding", () => {
    expect(withFunnelOnboarding({ brainy_funnel_account_created: true })).toEqual({
      brainy_funnel_account_created: true,
      onboarding_completed: true,
    });
    expect(withFunnelOnboarding(null)).toEqual({ onboarding_completed: true });
  });

  it("identifies funnel-created accounts by the marker only", () => {
    expect(isFunnelCreatedAccount({ brainy_funnel_account_created: true })).toBe(true);
    expect(isFunnelCreatedAccount({ onboarding_completed: true })).toBe(false);
  });
});

describe("prepare-funnel-account: new account", () => {
  it("creates the account with the funnel marker and NO onboarding flag", async () => {
    const { deps, state } = await buildFake();
    const result = await prepareFunnelAccountHandler(request(), deps);
    expect(result).toEqual({ status: 200, body: { success: true, userId: USER, alreadyPro: false } });
    expect(state.created).toHaveLength(1);
    expect(state.created[0].metadata).toEqual({ brainy_funnel_account_created: true });
    expect(state.created[0].metadata.onboarding_completed).toBeUndefined();
    expect(state.plan.funnelUserId).toBe(USER);
    expect(state.plan.accountCreatedByFunnel).toBe(true);
  });

  it("never accepts the flag from the browser", async () => {
    const { deps, state } = await buildFake();
    const result = await prepareFunnelAccountHandler(
      request({ onboarding_completed: true, user_metadata: { onboarding_completed: true, is_reviewer: true } }),
      deps,
    );
    expect(result.status).toBe(200);
    // The browser payload is ignored entirely.
    expect(state.created[0].metadata).toEqual({ brainy_funnel_account_created: true });
  });

  it("materializes NOTHING while preparing an account", async () => {
    const { deps, state } = await buildFake();
    await prepareFunnelAccountHandler(request(), deps);
    // The handler has no materialization dependency at all, so there is no
    // path that could write routines, tasks or the onboarding flag.
    expect(Object.keys(deps)).not.toContain("materialize");
    expect(Object.keys(deps)).not.toContain("claimPlan");
    expect(state.metadataUpdates).toHaveLength(0);
  });

  it("reports account_creation_failed instead of a false success", async () => {
    const { deps, state } = await buildFake();
    deps.createUser = async () => null;
    const result = await prepareFunnelAccountHandler(request(), deps);
    expect(result).toEqual({ status: 500, body: { success: false, error: "account_creation_failed" } });
    expect(state.created).toHaveLength(0);
  });
});

describe("prepare-funnel-account: retry on an already linked account", () => {
  async function linkedFake(userId = USER) {
    return buildFake({
      plan: await pendingPlan({ email: EMAIL, funnelUserId: userId, accountCreatedByFunnel: true }),
      authUser: { id: userId, email: EMAIL },
    });
  }

  it("is idempotent and never sets the onboarding flag", async () => {
    const { deps, state } = await linkedFake();
    const result = await prepareFunnelAccountHandler(request(), deps);
    expect(result).toEqual({ status: 200, body: { success: true, userId: USER, alreadyPro: false } });
    expect(state.metadataUpdates).toHaveLength(0);
    expect(state.created).toHaveLength(0);
  });

  it("never treats a pending purchase as materialized", async () => {
    const { deps, state } = await linkedFake();
    // A funnel-created account with an UNMATERIALIZED plan: exactly the state
    // that caused the empty-Home regression.
    expect(state.plan.status).toBe("pending");
    await prepareFunnelAccountHandler(request(), deps);
    expect(state.metadataUpdates).toHaveLength(0);
    expect(state.created).toHaveLength(0);
  });

  it("keeps requiring the server-side entitlement check", async () => {
    const { deps, state } = await linkedFake();
    state.rc = { ok: true, active: true };
    expect((await prepareFunnelAccountHandler(request(), deps)).body).toMatchObject({ alreadyPro: true });
    state.rc = { ok: false, active: false, status: 500 };
    expect(await prepareFunnelAccountHandler(request(), deps)).toMatchObject({
      status: 503,
      body: { error: "verification_unavailable" },
    });
  });

  it("does not turn the onboarding flag into an entitlement", async () => {
    const { deps, state } = await linkedFake();
    state.rc = { ok: true, active: false };
    expect((await prepareFunnelAccountHandler(request(), deps)).body).toMatchObject({ alreadyPro: false });
  });
});

describe("prepare-funnel-account: rejected requests never touch Auth", () => {
  it("performs zero Auth work for an invalid claim token", async () => {
    const { deps, state } = await buildFake();
    const result = await prepareFunnelAccountHandler(request({ claimToken: "wrong-token" }), deps);
    expect(result).toEqual({ status: 404, body: { success: false, error: "invalid_token" } });
    expect(state.authCalls).toHaveLength(0);
    expect(state.created).toHaveLength(0);
  });

  it("performs zero Auth work for an unknown plan", async () => {
    const { deps, state } = await buildFake();
    const result = await prepareFunnelAccountHandler(request({ planId: "550e8400-e29b-41d4-a716-446655440009" }), deps);
    expect(result).toEqual({ status: 404, body: { success: false, error: "invalid_token" } });
    expect(state.authCalls).toHaveLength(0);
  });

  it("performs zero Auth work for a plan belonging to another user", async () => {
    const { deps, state } = await buildFake({
      plan: await pendingPlan({ email: "owner@example.com", funnelUserId: OTHER, accountCreatedByFunnel: true }),
      authUser: { id: OTHER, email: "owner@example.com" },
    });
    const result = await prepareFunnelAccountHandler(request({ email: "attacker@example.com" }), deps);
    expect(result).toEqual({ status: 409, body: { success: false, error: "identity_conflict" } });
    expect(state.authCalls).toHaveLength(0);
    expect(state.created).toHaveLength(0);
  });

  it("performs zero Auth work for an expired plan", async () => {
    const { deps, state } = await buildFake({ plan: await pendingPlan({ expiresAt: "2026-09-01T00:00:00Z" }) });
    expect(await prepareFunnelAccountHandler(request(), deps)).toEqual({
      status: 410,
      body: { success: false, error: "token_expired" },
    });
    expect(state.authCalls).toHaveLength(0);
  });

  it("performs zero Auth work for a malformed request", async () => {
    const { deps, state } = await buildFake();
    for (const bad of [request({ planId: "nope" }), request({ claimToken: "" }), request({ email: "no-at-sign" })]) {
      expect(await prepareFunnelAccountHandler(bad, deps)).toEqual({
        status: 400,
        body: { success: false, error: "invalid_request" },
      });
    }
    expect(state.authCalls).toHaveLength(0);
  });
});

describe("prepare-funnel-account: reused accounts", () => {
  it("does not stamp the funnel marker on an account the funnel did not create", async () => {
    const { deps, state } = await buildFake({ authUser: { id: OTHER, email: EMAIL } });
    expect((await prepareFunnelAccountHandler(request(), deps)).status).toBe(200);
    expect(state.created).toHaveLength(0);
    expect(state.metadataUpdates).toHaveLength(0);
    expect(state.plan.accountCreatedByFunnel).toBe(false);
  });

  it("leaves an ABANDONED funnel account without the onboarding flag", async () => {
    // A funnel-created account with a prior unissued plan and NO purchase. This
    // is the path that used to mark onboarding complete without materializing.
    const { deps, state } = await buildFake({
      authUser: { id: OTHER, email: EMAIL },
      unissued: true,
    });
    const result = await prepareFunnelAccountHandler(request(), deps);
    expect(result.status).toBe(200);
    expect(state.created).toHaveLength(0);
    expect(state.metadataUpdates).toHaveLength(0);
    expect(state.plan.accountCreatedByFunnel).toBe(true);
  });

  it("keeps the winner identity when persistence lost the race", async () => {
    const { deps, state } = await buildFake();
    state.persistSucceeds = false;
    let reads = 0;
    deps.findPlan = async (planId) => {
      if (planId !== state.plan.id) return null;
      reads += 1;
      return reads === 1 ? state.plan : { ...state.plan, email: EMAIL, funnelUserId: OTHER };
    };
    const result = await prepareFunnelAccountHandler(request(), deps);
    expect(result).toEqual({ status: 200, body: { success: true, userId: OTHER, alreadyPro: false } });
    // Exactly one account was created, and it was never deleted.
    expect(state.created).toHaveLength(1);
  });

  it("rejects a conflicting winner without deleting anyone", async () => {
    const { deps, state } = await buildFake();
    state.persistSucceeds = false;
    let reads = 0;
    deps.findPlan = async (planId) => {
      if (planId !== state.plan.id) return null;
      reads += 1;
      return reads === 1 ? state.plan : { ...state.plan, email: "someone-else@example.com", funnelUserId: OTHER };
    };
    expect(await prepareFunnelAccountHandler(request(), deps)).toEqual({
      status: 409,
      body: { success: false, error: "identity_conflict" },
    });
    expect(state.created).toHaveLength(1);
  });
});