export interface RecoveryPlan {
  id: string;
  status: "pending" | "claiming" | "claimed" | "expired";
  funnel_user_id?: string | null;
  claimed_by_user_id?: string | null;
  purchase_confirmed_at?: string | null;
  expires_at?: string | null;
  revenuecat_redemption_url?: string | null;
}

export function isRecoverable(plan: RecoveryPlan, now: Date): boolean {
  if (!["pending", "claiming", "claimed"].includes(plan.status)) return false;
  if (plan.purchase_confirmed_at) return true;
  return !plan.expires_at || Date.parse(plan.expires_at) >= now.getTime();
}

export function selectIdentifiedPlan(plans: RecoveryPlan[], userId: string, now: Date): RecoveryPlan | null {
  return plans.find((plan) =>
    plan.funnel_user_id === userId &&
    (!plan.claimed_by_user_id || plan.claimed_by_user_id === userId) &&
    isRecoverable(plan, now)
  ) ?? null;
}

export function selectLegacyPlan(plans: RecoveryPlan[], emailPlanIds: Set<string>, now: Date): RecoveryPlan | null {
  return plans.find((plan) =>
    !plan.funnel_user_id &&
    emailPlanIds.has(plan.id) &&
    isRecoverable(plan, now) &&
    (plan.status === "claimed" || Boolean(plan.revenuecat_redemption_url))
  ) ?? null;
}

export function canFinalizeForUser(plan: RecoveryPlan, userId: string): boolean {
  return plan.funnel_user_id ? plan.funnel_user_id === userId : Boolean(plan.claimed_by_user_id === userId);
}
