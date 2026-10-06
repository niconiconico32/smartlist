// Auth `user_metadata` contract for accounts created by the web funnel.
//
// `brainy_funnel_account_created` marks the account as funnel-created (already
// consumed by the credential issuance path to decide whether a password may be
// derived and mailed).
//
// `onboarding_completed` is a USER-EXPERIENCE flag, not a purchase grant: the
// mobile build reads it to skip the classic onboarding. It must therefore be
// derived SERVER-SIDE after the plan + claim token are validated, never accepted
// from the browser, and never used to grant Pro (the server-side RevenueCat
// entitlement check stays the only authority for that).

export type UserMetadata = Record<string, unknown>;

export const FUNNEL_CREATED_KEY = "brainy_funnel_account_created";
export const ONBOARDING_COMPLETED_KEY = "onboarding_completed";

/** Metadata every account freshly created by the funnel must carry. */
export function funnelCreatedMetadata(): UserMetadata {
  return { [FUNNEL_CREATED_KEY]: true, [ONBOARDING_COMPLETED_KEY]: true };
}

function isTrue(value: unknown): boolean {
  return value === true;
}

/** True only for a real boolean `true` (a string "true" is NOT the contract). */
export function hasFunnelOnboardingFlag(metadata: UserMetadata | null | undefined): boolean {
  return isTrue(metadata?.[FUNNEL_CREATED_KEY]) && isTrue(metadata?.[ONBOARDING_COMPLETED_KEY]);
}

/** True for an account the funnel created, whatever else its metadata holds. */
export function isFunnelCreatedAccount(metadata: UserMetadata | null | undefined): boolean {
  return isTrue(metadata?.[FUNNEL_CREATED_KEY]);
}

/** Only the missing flags are added; every existing key is preserved. */
export function withFunnelOnboarding(metadata: UserMetadata | null | undefined): UserMetadata {
  return { ...(metadata ?? {}), [FUNNEL_CREATED_KEY]: true, [ONBOARDING_COMPLETED_KEY]: true };
}