// Auth `user_metadata` contract for the web funnel.
//
// `brainy_funnel_account_created` marks the account as funnel-created. It is
// consumed by the credential issuance path to decide whether a password may be
// derived and mailed.
//
// `onboarding_completed` is a USER-EXPERIENCE flag, NOT a purchase grant and NOT
// an origin marker. Historically the mobile build wrote it from
// `completeOnboarding()`, which runs right AFTER the funnel plan is
// materialized. The app therefore reads it as "this account's plan content is
// already in place" and skips the whole restore/finalize path when it is set.
// Consequence, learned the hard way:
//
//   NEVER stamp `onboarding_completed` while preparing an account. It must be
//   written only after canonical plan materialization succeeded, otherwise the
//   user lands on an empty Home with no routines and no tasks.
//
// It must always be derived SERVER-side, never accepted from the browser, and
// it never grants Pro: the server-side RevenueCat check is the only authority.

export type UserMetadata = Record<string, unknown>;

export const FUNNEL_CREATED_KEY = "brainy_funnel_account_created";
export const ONBOARDING_COMPLETED_KEY = "onboarding_completed";

/**
 * Metadata for an account freshly created by the funnel.
 *
 * Deliberately WITHOUT `onboarding_completed`: at creation time the plan is not
 * materialized yet, so claiming otherwise would suppress the restore path.
 */
export function funnelCreatedMetadata(): UserMetadata {
  return { [FUNNEL_CREATED_KEY]: true };
}

function isTrue(value: unknown): boolean {
  return value === true;
}

/** True only for a real boolean `true` (a string "true" is NOT the contract). */
export function hasFunnelOnboardingFlag(metadata: UserMetadata | null | undefined): boolean {
  return isTrue(metadata?.[ONBOARDING_COMPLETED_KEY]);
}

/** True for an account the funnel created, whatever else its metadata holds. */
export function isFunnelCreatedAccount(metadata: UserMetadata | null | undefined): boolean {
  return isTrue(metadata?.[FUNNEL_CREATED_KEY]);
}

/**
 * Post-materialization completion. Only the missing flag is added; every
 * existing key is preserved. Must NOT be called before canonical
 * materialization succeeded.
 */
export function withFunnelOnboarding(metadata: UserMetadata | null | undefined): UserMetadata {
  return { ...(metadata ?? {}), [ONBOARDING_COMPLETED_KEY]: true };
}