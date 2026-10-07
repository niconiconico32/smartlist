// READ-ONLY probe: can the service_role key EXECUTE claim_funnel_plan at all?
//
// It calls the RPC with a BOGUS claim token hash, so the function returns
// before any materialization (no writes, no rows touched). The answer tells us
// whether the JWT ownership guard blocks service_role callers.
//
// Usage: ENV_FILE=.env.e2e.local node scripts/probe-claim-rpc.mjs
const { readFileSync } = await import("node:fs");

function readEnv(file) {
  const out = {};
  for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
    if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
  return out;
}

const env = { ...readEnv(process.env.ENV_FILE), ...process.env };
const url = env.SUPABASE_URL;
const key = env.SUPABASE_SERVICE_KEY || env.SUPABASE_SERVICE_ROLE_KEY;
const userId = process.env.TARGET_USER_ID;

const res = await fetch(`${url}/rest/v1/rpc/claim_funnel_plan`, {
  method: "POST",
  headers: {
    apikey: key,
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
  },
  // Bogus hash + a real user id: the ownership guard runs first, then the token
  // lookup. Either answer proves which guard fired.
  body: JSON.stringify({
    p_claim_token_hash: "0000000000000000000000000000000000000000000000000000000000000000",
    p_user_id: userId,
    p_activities: [],
    p_routines: [],
  }),
});

console.log("http_status:", res.status);
console.log("body:", JSON.stringify(await res.json().catch(() => null)));