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
import { repairFunnelOnboardingMetadata } from "../funnel-metadata-repair";

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
  password: string | null;
  rc: RcResult;
  persistSucceeds: boolean;
  unissued: boolean;
  updateFails: boolean;
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
    password: null,
    rc: { ok: true, active: false },
    persistSucceeds: true,
    unissued: false,
    updateFails: false,
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
      // Supabase echoes the metadata that was persisted at creation.
      return { id: USER, email, userMetadata: metadata };
    },
    persistIdentity: async (planId, email, userId, createdByFunnel) => {
      state.authCalls.push("persistIdentity");
      if (!state.persistSucceeds) return false;
      state.plan = { ...state.plan, email, funnelUserId: userId, accountCreatedByFunnel: createdByFunnel };
      return true;
    },
    checkRevenueCat: async () => state.rc,
    getUserById: async (userId) => {
      state.authCalls.push("getUserById");
      if (!state.authUser || state.authUser.id !== userId) return null;
      return { id: state.authUser.id, email: state.authUser.email, user_metadata: state.authUser.userMetadata ?? {} };
    },
    updateUserMetadata: async (userId, metadata) => {
      state.authCalls.push("updateUserMetadata");
      if (state.updateFails) return false;
      state.metadataUpdates.push({ userId, metadata });
      if (state.authUser) state.authUser = { ...state.authUser, userMetadata: metadata };
      return true;
    },
  };
  return { deps, state };
}

const request = (overrides: Record<string, unknown> = {}) => ({ planId: PLAN, claimToken: TOKEN, email: EMAIL, ...overrides });

describe("funnel metadata contract helpers", () => {
  it("describes the exact contract the mobile build reads", () => {
    expect(funnelCreatedMetadata()).toEqual({ brainy_funnel_account_created: true, onboarding_completed: true });
  });

  it("uses real booleans, never strings", () => {
    const metadata = funnelCreatedMetadata();
    expect(typeof metadata.brainy_funnel_account_created).toBe("boolean");
    expect(typeof metadata.onboarding_completed).toBe("boolean");
    expect(metadata.brainy_funnel_account_created).not.toBe("true");
    expect(metadata.onboarding_completed).not.toBe("true");
  });

  it("detects a correct account strictly", () => {
    expect(hasFunnelOnboardingFlag({ brainy_funnel_account_created: true, onboarding_completed: true })).toBe(true);
    expect(hasFunnelOnboardingFlag({ brainy_funnel_account_created: true })).toBe(false);
    expect(hasFunnelOnboardingFlag({ brainy_funnel_account_created: true, onboarding_completed: "true" })).toBe(false);
    expect(hasFunnelOnboardingFlag({ onboarding_completed: true })).toBe(false);
    expect(hasFunnelOnboardingFlag(null)).toBe(false);
  });

  it("only adds the missing flags when merging", () => {
    expect(withFunnelOnboarding({ is_reviewer: true, brainy_funnel_account_created: true })).toEqual({
      is_reviewer: true,
      brainy_funnel_account_created: true,
      onboarding_completed: true,
    });
    expect(withFunnelOnboarding(null)).toEqual({ brainy_funnel_account_created: true, onboarding_completed: true });
  });

  it("identifies funnel-created accounts by the marker only", () => {
    expect(isFunnelCreatedAccount({ brainy_funnel_account_created: true })).toBe(true);
    expect(isFunnelCreatedAccount({ onboarding_completed: true })).toBe(false);
  });
});

describe("prepare-funnel-account: new account", () => {
  it("stamps both funnel flags as booleans", async () => {
    const { deps, state } = await buildFake();
    const result = await prepareFunnelAccountHandler(request(), deps);
    expect(result).toEqual({ status: 200, body: { success: true, userId: USER, alreadyPro: false } });
    expect(state.created).toHaveLength(1);
    const metadata = state.created[0].metadata;
    expect(metadata.brainy_funnel_account_created).toBe(true);
    expect(metadata.onboarding_completed).toBe(true);
    expect(typeof metadata.brainy_funnel_account_created).toBe("boolean");
    expect(typeof metadata.onboarding_completed).toBe("boolean");
    expect(state.plan.funnelUserId).toBe(USER);
    expect(state.plan.accountCreatedByFunnel).toBe(true);
  });

  it("never accepts the flag from the browser", async () => {
    const { deps, state } = await buildFake();
    const result = await prepareFunnelAccountHandler(
      request({ onboarding_completed: false, user_metadata: { onboarding_completed: false, is_reviewer: true } }),
      deps,
    );
    expect(result.status).toBe(200);
    // The browser payload is ignored entirely; only the server-derived shape is
    // persisted, with no trace of the client values.
    expect(state.created[0].metadata).toEqual({ brainy_funnel_account_created: true, onboarding_completed: true });
  });

  it("never touches the password after creation", async () => {
    const { deps, state } = await buildFake();
    await prepareFunnelAccountHandler(request(), deps);
    expect(state.metadataUpdates).toHaveLength(0);
  });

  it("reports account_creation_failed instead of a false success", async () => {
    const { deps, state } = await buildFake();
    deps.createUser = async () => null;
    const result = await prepareFunnelAccountHandler(request(), deps);
    expect(result).toEqual({ status: 500, body: { success: false, error: "account_creation_failed" } });
    expect(state.metadataUpdates).toHaveLength(0);
  });
});

describe("prepare-funnel-account: retry on an already linked account", () => {
  async function linkedState(userMetadata: Record<string, unknown> | null) {
    const fake = await buildFake({
      plan: await pendingPlan({ email: EMAIL, funnelUserId: USER, accountCreatedByFunnel: true }),
      authUser: { id: USER, email: EMAIL, userMetadata: userMetadata },
    });
    return fake;
  }

  it("repairs a funnel account that is missing the flag, keeping the same UUID", async () => {
    const { deps, state } = await linkedState({ email_verified: true, brainy_funnel_account_created: true });
    const result = await prepareFunnelAccountHandler(request(), deps);
    expect(result).toEqual({ status: 200, body: { success: true, userId: USER, alreadyPro: false } });
    expect(state.metadataUpdates).toEqual([
      {
        userId: USER,
        metadata: { email_verified: true, brainy_funnel_account_created: true, onboarding_completed: true },
      },
    ]);
    expect(state.created).toHaveLength(0);
    expect(state.plan.funnelUserId).toBe(USER);
  });

  it("is idempotent for an already correct account and skips the write", async () => {
    const { deps, state } = await linkedState({ brainy_funnel_account_created: true, onboarding_completed: true });
    const result = await prepareFunnelAccountHandler(request(), deps);
    expect(result).toEqual({ status: 200, body: { success: true, userId: USER, alreadyPro: false } });
    expect(state.metadataUpdates).toHaveLength(0);
    expect(state.created).toHaveLength(0);
  });

  it("converges across repeated retries", async () => {
    const { deps, state } = await linkedState({ brainy_funnel_account_created: true });
    await prepareFunnelAccountHandler(request(), deps);
    await prepareFunnelAccountHandler(request(), deps);
    await prepareFunnelAccountHandler(request(), deps);
    expect(state.metadataUpdates).toHaveLength(1);
    expect(state.created).toHaveLength(0);
  });

  it("preserves unrelated existing metadata", async () => {
    const { deps, state } = await linkedState({
      brainy_funnel_account_created: true,
      email_verified: true,
      nested: { keep: [1, 2, 3] },
      country: "AR",
    });
    await prepareFunnelAccountHandler(request(), deps);
    expect(state.metadataUpdates[0].metadata).toEqual({
      brainy_funnel_account_created: true,
      email_verified: true,
      nested: { keep: [1, 2, 3] },
      country: "AR",
      onboarding_completed: true,
    });
  });

  it("never repairs an account that the funnel did not create", async () => {
    const { deps, state } = await linkedState({ email_verified: true, onboarding_completed: undefined });
    const result = await prepareFunnelAccountHandler(request(), deps);
    expect(result.status).toBe(200);
    expect(state.metadataUpdates).toHaveLength(0);
  });

  it("returns a recoverable error when Supabase cannot persist the metadata", async () => {
    const { deps, state } = await linkedState({ brainy_funnel_account_created: true });
    state.updateFails = true;
    const result = await prepareFunnelAccountHandler(request(), deps);
    expect(result.body.success).toBe(false);
    expect(result.status).toBeGreaterThanOrEqual(500);
    expect(result.body.error).toBe("metadata_update_failed");
    expect(state.metadataUpdates).toHaveLength(0);
  });

  it("still requires the server-side entitlement check", async () => {
    const { deps, state } = await linkedState({ brainy_funnel_account_created: true });
    state.rc = { ok: true, active: true };
    const result = await prepareFunnelAccountHandler(request(), deps);
    expect(result.body).toMatchObject({ alreadyPro: true });
  });

  it("does not turn a metadata flag into an entitlement", async () => {
    const { deps, state } = await linkedState({ brainy_funnel_account_created: true });
    state.rc = { ok: true, active: false };
    const result = await prepareFunnelAccountHandler(request(), deps);
    expect(result.body).toMatchObject({ alreadyPro: false });
  });
});

describe("prepare-funnel-account: rejected requests never touch Auth", () => {
  it("performs zero Auth work for an invalid claim token", async () => {
    const { deps, state } = await buildFake();
    const result = await prepareFunnelAccountHandler(request({ claimToken: "wrong-token" }), deps);
    expect(result).toEqual({ status: 404, body: { success: false, error: "invalid_token" } });
    expect(state.authCalls).toHaveLength(0);
    expect(state.created).toHaveLength(0);
    expect(state.metadataUpdates).toHaveLength(0);
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
      authUser: { id: OTHER, email: "owner@example.com", userMetadata: { brainy_funnel_account_created: true } },
    });
    const result = await prepareFunnelAccountHandler(request({ email: "attacker@example.com" }), deps);
    expect(result).toEqual({ status: 409, body: { success: false, error: "identity_conflict" } });
    expect(state.authCalls).toHaveLength(0);
    expect(state.metadataUpdates).toHaveLength(0);
    expect(state.created).toHaveLength(0);
  });

  it("performs zero Auth work for an expired plan", async () => {
    const { deps, state } = await buildFake({ plan: await pendingPlan({ expiresAt: "2026-09-01T00:00:00Z" }) });
    const result = await prepareFunnelAccountHandler(request(), deps);
    expect(result).toEqual({ status: 410, body: { success: false, error: "token_expired" } });
    expect(state.authCalls).toHaveLength(0);
  });

  it("performs zero Auth work for a malformed request", async () => {
    const { deps, state } = await buildFake();
    for (const bad of [request({ planId: "nope" }), request({ claimToken: "" }), request({ email: "no-at-sign" })]) {
      const result = await prepareFunnelAccountHandler(bad, deps);
      expect(result).toEqual({ status: 400, body: { success: false, error: "invalid_request" } });
    }
    expect(state.authCalls).toHaveLength(0);
  });
});

describe("prepare-funnel-account: reused accounts", () => {
  it("does not stamp the funnel marker on an account the funnel did not create", async () => {
    const { deps, state } = await buildFake({ authUser: { id: OTHER, email: EMAIL, userMetadata: { email_verified: true } } });
    const result = await prepareFunnelAccountHandler(request(), deps);
    expect(result.status).toBe(200);
    expect(state.created).toHaveLength(0);
    expect(state.metadataUpdates).toHaveLength(0);
    expect(state.plan.accountCreatedByFunnel).toBe(false);
  });

  it("repairs an abandoned funnel account that predates the contract", async () => {
    const { deps, state } = await buildFake({
      authUser: { id: OTHER, email: EMAIL, userMetadata: { brainy_funnel_account_created: true } },
      unissued: true,
    });
    const result = await prepareFunnelAccountHandler(request(), deps);
    expect(result.status).toBe(200);
    expect(state.created).toHaveLength(0);
    expect(state.metadataUpdates).toEqual([
      { userId: OTHER, metadata: { brainy_funnel_account_created: true, onboarding_completed: true } },
    ]);
  });

  it("keeps the winner identity when persistence lost the race", async () => {
    const { deps, state } = await buildFake();
    state.persistSucceeds = false;
    // First read: still unprepared. Second read (after the failed write): the
    // winner that claimed the plan in the meantime.
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
    const result = await prepareFunnelAccountHandler(request(), deps);
    expect(result).toEqual({ status: 409, body: { success: false, error: "identity_conflict" } });
    expect(state.created).toHaveLength(1);
  });
});

describe("repairFunnelOnboardingMetadata", () => {
  const deps = (user: { id: string; email?: string | null; user_metadata?: Record<string, unknown> | null } | null, ok = true) => {
    const writes: Record<string, unknown>[] = [];
    return {
      writes,
      deps: {
        getUserById: async () => user,
        updateUserMetadata: async (_id, metadata) => { if (ok) writes.push(metadata); return ok; },
      },
    };
  };

  it("reports every outcome without throwing", async () => {
    const missing = deps({ id: USER, email: EMAIL, user_metadata: { brainy_funnel_account_created: true } });
    await expect(repairFunnelOnboardingMetadata(USER, EMAIL, missing.deps)).resolves.toBe("repaired");
    expect(missing.writes).toEqual([{ brainy_funnel_account_created: true, onboarding_completed: true }]);

    await expect(
      repairFunnelOnboardingMetadata(USER, EMAIL, deps({ id: USER, email: EMAIL, user_metadata: { brainy_funnel_account_created: true, onboarding_completed: true } }).deps),
    ).resolves.toBe("already_correct");

    await expect(repairFunnelOnboardingMetadata(USER, EMAIL, deps({ id: USER, email: EMAIL, user_metadata: {} }).deps)).resolves.toBe("skipped_not_funnel_created");
    await expect(repairFunnelOnboardingMetadata(USER, "other@example.com", deps({ id: USER, email: EMAIL, user_metadata: { brainy_funnel_account_created: true } }).deps)).resolves.toBe("skipped_identity_mismatch");
    await expect(repairFunnelOnboardingMetadata(USER, EMAIL, deps(null).deps)).resolves.toBe("user_not_found");
    await expect(
      repairFunnelOnboardingMetadata(USER, EMAIL, deps({ id: USER, email: EMAIL, user_metadata: { brainy_funnel_account_created: true } }, false).deps),
    ).resolves.toBe("persist_failed");
  });
});