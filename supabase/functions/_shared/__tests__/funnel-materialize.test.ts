import {
  completeFunnelOnboardingAfterMaterialization,
  isPlanMaterialized,
  materializeCanonicalPlan,
  type MaterializeDeps,
  type MaterializePlanRow,
  type OnboardingDeps,
} from "../funnel-materialize";

const USER = "550e8400-e29b-41d4-a716-446655440000";
const OTHER = "550e8400-e29b-41d4-a716-446655440001";
const PLAN = "550e8400-e29b-41d4-a716-446655440002";

const PLAN_PAYLOAD = {
  tasks: [
    { title: "Task A", emoji: "🍱", subtasks: [{ title: "step a1", duration: 5 }, { title: "step a2", duration: 3 }] },
    { title: "Task B", emoji: "💪", subtasks: [{ title: "step b1", duration: 2 }] },
  ],
  routines: [
    { name: "Routine one", icon: "🧩", days: ["daily"], steps: [{ title: "r1s1", duration: 2 }, { title: "r1s2", duration: 4 }], egg: { catalogId: 3 } },
    { name: "Routine two", icon: "🌙", days: ["Mon"], steps: [{ title: "r2s1", duration: 3 }], egg: { catalogId: 4 } },
  ],
};

function planRow(overrides: Partial<MaterializePlanRow> = {}): MaterializePlanRow {
  return {
    id: PLAN,
    status: "pending",
    claim_token_hash: "hash",
    funnel_user_id: USER,
    claimed_by_user_id: null,
    purchase_confirmed_at: "2026-10-06T22:33:28.640Z",
    plan: PLAN_PAYLOAD as unknown as Record<string, unknown>,
    ...overrides,
  };
}

function materializedRow(overrides: Partial<MaterializePlanRow> = {}): MaterializePlanRow {
  return planRow({
    status: "claimed",
    claimed_by_user_id: USER,
    plan: {
      ...PLAN_PAYLOAD,
      __materialized: {
        claimed_by_user_id: USER,
        claimed_at: "2026-10-06T22:34:00Z",
        task_count: 2,
        routine_count: 2,
        egg_count: 2,
        routine_ids: ["r-1", "r-2"],
        egg_ids: [3, 4],
      },
    } as unknown as Record<string, unknown>,
    ...overrides,
  });
}

interface MatState {
  plan: MaterializePlanRow | null;
  rpcResult: { data: unknown; error: unknown };
  claims: { claimTokenHash: string; userId: string; activities: unknown[]; routines: unknown[] }[];
}

function matFake(overrides: Partial<MatState> = {}): { deps: MaterializeDeps; state: MatState } {
  const state: MatState = {
    plan: planRow(),
    rpcResult: { data: { success: true, taskCount: 2, routineCount: 2, eggCount: 2 }, error: null },
    claims: [],
    ...overrides,
  };
  return {
    state,
    deps: {
      findPlan: async (planId) => (state.plan && state.plan.id === planId ? state.plan : null),
      claimPlan: async (input) => {
        state.claims.push(input);
        if (state.rpcResult.error) return state.rpcResult;
        // The canonical RPC only writes `claimed` after a full commit.
        state.plan = materializedRow();
        return state.rpcResult;
      },
    },
  };
}

describe("isPlanMaterialized: the single canonical definition", () => {
  it("accepts only the RPC's terminal state for this account", () => {
    expect(isPlanMaterialized(materializedRow(), USER)).toBe(true);
    expect(isPlanMaterialized(materializedRow({ claimed_by_user_id: OTHER }), USER)).toBe(false);
  });

  it("rejects every non-canonical signal", () => {
    expect(isPlanMaterialized(planRow(), USER)).toBe(false);
    expect(isPlanMaterialized(planRow({ purchase_confirmed_at: "x" }), USER)).toBe(false);
    expect(isPlanMaterialized(planRow({ status: "claiming", claimed_by_user_id: USER }), USER)).toBe(false);
    expect(isPlanMaterialized(planRow({ status: "claimed", claimed_by_user_id: null }), USER)).toBe(false);
  });
});

describe("materializeCanonicalPlan", () => {
  it("materializes a confirmed plan with the canonical payload builders", async () => {
    const { deps, state } = matFake();
    const result = await materializeCanonicalPlan(deps, { planId: PLAN, userId: USER });
    expect(result).toEqual({
      ok: true,
      state: "materialized",
      summary: { taskCount: 2, routineCount: 2, eggCount: 2 },
    });
    expect(state.claims).toHaveLength(1);
    expect(state.claims[0]).toMatchObject({ claimTokenHash: "hash", userId: USER });
    // Same builders as finalize-funnel-plan: deterministic ids, normalized days.
    expect((state.claims[0].activities as any[]).map((a) => a.id)).toEqual([
      `funnel_${PLAN.replace(/-/g, "").slice(0, 8)}_task_0`,
      `funnel_${PLAN.replace(/-/g, "").slice(0, 8)}_task_1`,
    ]);
    expect((state.claims[0].routines as any[])[0].days).toEqual(["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"]);
    expect((state.claims[0].routines as any[]).map((r: any) => r.name)).toEqual(["Routine one", "Routine two"]);
  });

  it("is idempotent for an already materialized plan and skips the RPC", async () => {
    const { deps, state } = matFake({ plan: materializedRow() });
    const result = await materializeCanonicalPlan(deps, { planId: PLAN, userId: USER });
    expect(result).toEqual({
      ok: true,
      state: "already_materialized",
      summary: { taskCount: 2, routineCount: 2, eggCount: 2 },
    });
    expect(state.claims).toHaveLength(0);
  });

  it("never materializes a plan owned by another user", async () => {
    const { deps, state } = matFake({ plan: planRow({ funnel_user_id: OTHER }) });
    expect(await materializeCanonicalPlan(deps, { planId: PLAN, userId: USER })).toEqual({
      ok: false,
      state: "terminal",
      reason: "plan_not_owned",
    });
    expect(state.claims).toHaveLength(0);
  });

  it("never materializes a plan claimed by another user", async () => {
    const { deps, state } = matFake({ plan: planRow({ claimed_by_user_id: OTHER }) });
    expect(await materializeCanonicalPlan(deps, { planId: PLAN, userId: USER })).toMatchObject({ ok: false });
    expect(state.claims).toHaveLength(0);
  });

  it("never materializes an unconfirmed purchase", async () => {
    const { deps, state } = matFake({ plan: planRow({ purchase_confirmed_at: null }) });
    expect(await materializeCanonicalPlan(deps, { planId: PLAN, userId: USER })).toEqual({
      ok: false,
      state: "terminal",
      reason: "purchase_not_confirmed",
    });
    expect(state.claims).toHaveLength(0);
  });

  it("reports a missing plan as terminal", async () => {
    const { deps } = matFake({ plan: null });
    expect(await materializeCanonicalPlan(deps, { planId: PLAN, userId: USER })).toEqual({
      ok: false,
      state: "terminal",
      reason: "plan_missing",
    });
  });

  it("is retryable when the RPC errors", async () => {
    const { deps, state } = matFake({ rpcResult: { data: null, error: { message: "boom" } } });
    expect(await materializeCanonicalPlan(deps, { planId: PLAN, userId: USER })).toEqual({
      ok: false,
      state: "retryable",
      reason: "claim_failed",
    });
    expect(state.claims).toHaveLength(1);
  });

  it("keeps egg_unavailable retryable (the RPC rolled back atomically)", async () => {
    const { deps } = matFake({ rpcResult: { data: { success: false, error: "egg_unavailable" }, error: null } });
    expect(await materializeCanonicalPlan(deps, { planId: PLAN, userId: USER })).toEqual({
      ok: false,
      state: "retryable",
      reason: "egg_unavailable",
    });
  });

  it("keeps the RPC's ownership guard retryable, never silently ignored", async () => {
    const { deps } = matFake({ rpcResult: { data: { success: false, error: "forbidden" }, error: null } });
    expect(await materializeCanonicalPlan(deps, { planId: PLAN, userId: USER })).toEqual({
      ok: false,
      state: "retryable",
      reason: "forbidden",
    });
  });

  it("treats terminal RPC errors as terminal", async () => {
    for (const reason of ["invalid_status", "claim_not_owned", "token_expired"]) {
      const { deps } = matFake({ rpcResult: { data: { success: false, error: reason }, error: null } });
      expect(await materializeCanonicalPlan(deps, { planId: PLAN, userId: USER })).toEqual({
        ok: false,
        state: "terminal",
        reason,
      });
    }
  });

  it("converges when a concurrent execution already won the claim", async () => {
    const { deps, state } = matFake({ rpcResult: { data: { success: false, error: "already_claimed" }, error: null } });
    deps.claimPlan = async () => {
      state.plan = materializedRow();
      return { data: { success: false, error: "already_claimed" }, error: null };
    };
    expect(await materializeCanonicalPlan(deps, { planId: PLAN, userId: USER })).toMatchObject({
      ok: true,
      state: "already_materialized",
    });
  });

  it("rejects a claim won by ANOTHER account", async () => {
    const { deps } = matFake({ rpcResult: { data: { success: false, error: "already_claimed" }, error: null } });
    deps.claimPlan = async () => {
      deps.findPlan = async () => materializedRow({ claimed_by_user_id: OTHER });
      return { data: { success: false, error: "already_claimed" }, error: null };
    };
    expect(await materializeCanonicalPlan(deps, { planId: PLAN, userId: USER })).toEqual({
      ok: false,
      state: "terminal",
      reason: "plan_not_owned",
    });
  });
});

describe("completeFunnelOnboardingAfterMaterialization", () => {
  function onbFake(plan: MaterializePlanRow | null, metadata: Record<string, unknown> | null, ok = true) {
    const writes: Record<string, unknown>[] = [];
    const deps: OnboardingDeps = {
      findPlan: async () => plan,
      getUserMetadata: async () => metadata,
      updateUserMetadata: async (_id, next) => {
        if (ok) writes.push(next);
        return ok;
      },
    };
    return { deps, writes };
  }

  it("stamps the flag only after canonical materialization", async () => {
    const { deps, writes } = onbFake(materializedRow(), { brainy_funnel_account_created: true });
    expect(await completeFunnelOnboardingAfterMaterialization(deps, { planId: PLAN, userId: USER })).toEqual({
      ok: true,
      changed: true,
    });
    expect(writes).toEqual([{ brainy_funnel_account_created: true, onboarding_completed: true }]);
  });

  it("refuses to stamp the flag on an UNMATERIALIZED plan", async () => {
    for (const plan of [planRow(), planRow({ status: "claiming", claimed_by_user_id: USER })]) {
      const { deps, writes } = onbFake(plan, { brainy_funnel_account_created: true });
      expect(await completeFunnelOnboardingAfterMaterialization(deps, { planId: PLAN, userId: USER })).toEqual({
        ok: false,
        reason: "plan_not_materialized",
      });
      expect(writes).toHaveLength(0);
    }
  });

  it("refuses to stamp the flag on another user's plan", async () => {
    // Wrong association entirely.
    const wrongOwner = onbFake(materializedRow({ funnel_user_id: OTHER }), {});
    expect(await completeFunnelOnboardingAfterMaterialization(wrongOwner.deps, { planId: PLAN, userId: USER })).toEqual({
      ok: false,
      reason: "plan_not_owned",
    });
    expect(wrongOwner.writes).toHaveLength(0);

    // Associated with us but claimed by somebody else: not our materialization.
    const otherClaim = onbFake(materializedRow({ claimed_by_user_id: OTHER }), {});
    expect(await completeFunnelOnboardingAfterMaterialization(otherClaim.deps, { planId: PLAN, userId: USER })).toEqual({
      ok: false,
      reason: "plan_not_materialized",
    });
    expect(otherClaim.writes).toHaveLength(0);
  });

  it("is idempotent and skips the write when the flag is already there", async () => {
    const { deps, writes } = onbFake(materializedRow(), { onboarding_completed: true });
    expect(await completeFunnelOnboardingAfterMaterialization(deps, { planId: PLAN, userId: USER })).toEqual({
      ok: true,
      changed: false,
    });
    expect(writes).toHaveLength(0);
  });

  it("preserves unrelated existing metadata", async () => {
    const { deps, writes } = onbFake(materializedRow(), {
      brainy_funnel_account_created: true,
      email_verified: true,
      nested: { keep: [1, 2] },
      country: "AR",
    });
    await completeFunnelOnboardingAfterMaterialization(deps, { planId: PLAN, userId: USER });
    expect(writes[0]).toEqual({
      brainy_funnel_account_created: true,
      email_verified: true,
      nested: { keep: [1, 2] },
      country: "AR",
      onboarding_completed: true,
    });
  });

  it("surfaces a persist failure instead of a false success", async () => {
    const { deps, writes } = onbFake(materializedRow(), {}, false);
    expect(await completeFunnelOnboardingAfterMaterialization(deps, { planId: PLAN, userId: USER })).toEqual({
      ok: false,
      reason: "metadata_update_failed",
    });
    expect(writes).toHaveLength(0);
  });

  it("reports an unknown user", async () => {
    const { deps, writes } = onbFake(materializedRow(), null);
    expect(await completeFunnelOnboardingAfterMaterialization(deps, { planId: PLAN, userId: USER })).toEqual({
      ok: false,
      reason: "user_not_found",
    });
    expect(writes).toHaveLength(0);
  });
});