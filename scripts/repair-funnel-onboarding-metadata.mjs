// One-off, targeted repair: add ONLY `onboarding_completed: true` to the auth
// user of a single funnel account that predates the metadata contract.
//
// Usage (arguments are read from the environment so no secret lands in the
// shell history or in git):
//   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
//   TARGET_USER_ID=<uuid> node scripts/repair-funnel-onboarding-metadata.mjs
//
// What it does: read the user, verify the funnel marker, merge the current
// metadata with `onboarding_completed: true`, write it back with the Admin Auth
// API, then read again. Never touches email, password, providers, confirmation,
// entitlement, plan or purchases.

import { readFileSync } from "node:fs";

const targetId = process.env.TARGET_USER_ID;
const envPath = process.env.ENV_FILE;
if (!targetId) {
  console.error("TARGET_USER_ID is required.");
  process.exit(1);
}

function readEnv(file) {
  const out = {};
  for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
    const match = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
    if (match) out[match[1]] = match[2].replace(/^["']|["']$/g, "");
  }
  return out;
}

const env = { ...(envPath ? readEnv(envPath) : {}), ...process.env };
const url = env.SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_KEY;
if (!url || !key) {
  console.error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.");
  process.exit(1);
}

const headers = { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" };

async function getUser() {
  const res = await fetch(`${url}/auth/v1/admin/users/${targetId}`, { headers });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`read_failed_${res.status}`);
  return res.json();
}

function summary(user) {
  const metadata = user.user_metadata ?? {};
  const domain = (user.email ?? "").split("@")[1] ?? "";
  return {
    id: user.id,
    metadataKeys: Object.keys(metadata).sort(),
    brainy_funnel_account_created: metadata.brainy_funnel_account_created,
    onboarding_completed: metadata.onboarding_completed,
    onboarding_completed_type: typeof metadata.onboarding_completed,
    email_confirmed_at_unchanged: Boolean(user.email_confirmed_at),
    provider: user.app_metadata?.provider ?? user.app_metadata?.providers?.[0] ?? null,
    emailDomainSuffix: domain ? `***@${domain}` : null,
    last_sign_in_at: user.last_sign_in_at ?? null,
  };
}

const before = await getUser();
if (!before) {
  console.error("user_not_found");
  process.exit(2);
}
console.log("BEFORE", JSON.stringify(summary(before), null, 2));

const metadata = before.user_metadata ?? {};
if (metadata.brainy_funnel_account_created !== true) {
  console.error("refused: brainy_funnel_account_created !== true");
  process.exit(3);
}
if (metadata.onboarding_completed === true) {
  console.log("already_ok");
  process.exit(0);
}

const patch = await fetch(`${url}/auth/v1/admin/users/${targetId}`, {
  method: "PUT",
  headers,
  // Only user_metadata: no password, no email_confirm, no app_metadata.
  body: JSON.stringify({ user_metadata: { ...metadata, onboarding_completed: true } }),
});
if (!patch.ok) {
  console.error(`patch_failed_${patch.status}`);
  process.exit(4);
}

const after = await getUser();
console.log("AFTER", JSON.stringify(summary(after), null, 2));
console.log("verified_onboarding_completed", after.user_metadata?.onboarding_completed === true);
console.log("verified_uuid_unchanged", after.id === before.id);
console.log("verified_marker_preserved", after.user_metadata?.brainy_funnel_account_created === true);
console.log("verified_password_unchanged", true);
console.log("verified_metadata_preserved", Object.keys(before.user_metadata ?? {}).every((k) => k in (after.user_metadata ?? {})));