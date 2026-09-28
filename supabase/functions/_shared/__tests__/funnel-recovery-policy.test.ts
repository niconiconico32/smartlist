import {
  canFinalizeForUser,
  isRecoverable,
  selectIdentifiedPlan,
  selectLegacyPlan,
  type RecoveryPlan,
} from "../funnel-recovery-policy";

const USER = "550e8400-e29b-41d4-a716-446655440000";
const OTHER = "550e8400-e29b-41d4-a716-446655440001";
const NOW = new Date("2026-09-18T00:00:00Z");

const plan = (overrides: Partial<RecoveryPlan> = {}): RecoveryPlan => ({
  id: "plan-1", status: "pending", ...overrides,
});

describe("identified funnel recovery policy", () => {
  it("finds by funnel_user_id and never returns another identity's plan", () => {
    expect(selectIdentifiedPlan([plan({ funnel_user_id: OTHER })], USER, NOW)).toBeNull();
    expect(selectIdentifiedPlan([plan({ funnel_user_id: USER })], USER, NOW)?.funnel_user_id).toBe(USER);
  });

  it("keeps a purchased plan recoverable after expires_at", () => {
    expect(isRecoverable(plan({ expires_at: "2026-01-01T00:00:00Z", purchase_confirmed_at: "2026-02-01T00:00:00Z" }), NOW)).toBe(true);
  });

  it("expires an unpurchased plan after expires_at", () => {
    expect(isRecoverable(plan({ expires_at: "2026-01-01T00:00:00Z" }), NOW)).toBe(false);
  });

  it("keeps legacy email lookup gated by redemption, without changing identified lookup", () => {
    expect(selectLegacyPlan([plan({ id: "legacy", revenuecat_redemption_url: "rc://redeem" })], new Set(["legacy"]), NOW)?.id).toBe("legacy");
    expect(selectLegacyPlan([plan({ id: "identified", funnel_user_id: USER })], new Set(["identified"]), NOW)).toBeNull();
  });

  it("requires the identified owner for finalize", () => {
    expect(canFinalizeForUser(plan({ funnel_user_id: USER }), USER)).toBe(true);
    expect(canFinalizeForUser(plan({ funnel_user_id: OTHER }), USER)).toBe(false);
  });
});
