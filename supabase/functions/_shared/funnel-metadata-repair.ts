// Idempotent repair of the funnel metadata contract for an ALREADY linked
// account (a plan that already carries `funnel_user_id`).
//
// Guarantees:
//  - the UUID never changes and no second user is ever created;
//  - the password is never touched (only `user_metadata` is written);
//  - every existing metadata key is preserved, only the missing flags are added;
//  - a user that is not funnel-created, or whose auth email does not match the
//    validated plan, is left completely untouched;
//  - a Supabase failure is surfaced as a recoverable error, never as a fake
//    success.

import { normalizeEmail } from "./funnel-identity-core.ts";
import {
  hasFunnelOnboardingFlag,
  isFunnelCreatedAccount,
  withFunnelOnboarding,
  type UserMetadata,
} from "./funnel-metadata.ts";

export type RepairOutcome =
  | "already_correct"
  | "repaired"
  | "skipped_not_funnel_created"
  | "skipped_identity_mismatch"
  | "user_not_found"
  | "persist_failed";

export interface AuthUserSnapshot {
  id: string;
  email?: string | null;
  user_metadata?: UserMetadata | null;
}

export interface RepairDeps {
  getUserById(userId: string): Promise<AuthUserSnapshot | null>;
  updateUserMetadata(userId: string, metadata: UserMetadata): Promise<boolean>;
}

/**
 * Adds only the funnel flags that are missing from a funnel-created account
 * that is already bound to the validated plan.
 *
 * `expectedEmail` is the email frozen on the validated plan; a mismatch means
 * the auth user no longer corresponds to that plan, so nothing is written.
 */
export async function repairFunnelOnboardingMetadata(
  userId: string,
  expectedEmail: string | null,
  deps: RepairDeps,
): Promise<RepairOutcome> {
  const user = await deps.getUserById(userId);
  if (!user) return "user_not_found";

  const metadata = user.user_metadata ?? {};
  if (expectedEmail && normalizeEmail(user.email ?? "") !== normalizeEmail(expectedEmail)) {
    return "skipped_identity_mismatch";
  }
  if (!isFunnelCreatedAccount(metadata)) return "skipped_not_funnel_created";
  if (hasFunnelOnboardingFlag(metadata)) return "already_correct";

  const ok = await deps.updateUserMetadata(user.id, withFunnelOnboarding(metadata));
  return ok ? "repaired" : "persist_failed";
}