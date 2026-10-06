// READ-ONLY diagnosis for the funnel account affected by the ordering
// regression. Prints plan state and materialized row counts WITHOUT writing.
//
// Usage:
//   ENV_FILE=.env.e2e.local TARGET_USER_ID=<uuid> node scripts/diagnose-funnel-plan.mjs
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
const headers = { apikey: key, Authorization: `Bearer ${key}` };

const get = async (path) => {
  const res = await fetch(`${url}${path}`, { headers });
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new Error(`${path} -> ${res.status} ${JSON.stringify(body)}`);
  return body;
};

const plans = await get(
  `/rest/v1/web_funnel_plans?funnel_user_id=eq.${userId}&select=id,status,account_created_by_funnel,purchase_confirmed_at,credentials_issued_at,credentials_issuing_started_at,claimed_at,claimed_by_user_id,revenuecat_redemption_url,expires_at,created_at,updated_at,plan&order=created_at.desc`,
);

console.log("plans_matching_funnel_user_id:", plans.length);
for (const p of plans) {
  const plan = p.plan ?? {};
  const marker = plan.__materialized ?? null;
  console.log(
    JSON.stringify(
      {
        id: p.id,
        status: p.status,
        account_created_by_funnel: p.account_created_by_funnel,
        purchase_confirmed_at: p.purchase_confirmed_at,
        credentials_issuing_started_at: p.credentials_issuing_started_at,
        credentials_issued_at: p.credentials_issued_at,
        claimed_at: p.claimed_at,
        claimed_by_user_id: p.claimed_by_user_id,
        has_redemption_url: typeof p.revenuecat_redemption_url === "string" && p.revenuecat_redemption_url.trim().length > 0,
        expires_at: p.expires_at,
        created_at: p.created_at,
        updated_at: p.updated_at,
        __materialized: marker
          ? {
              claimed_by_user_id: marker.claimed_by_user_id,
              claimed_at: marker.claimed_at,
              task_count: marker.task_count,
              routine_count: marker.routine_count,
              egg_count: marker.egg_count,
              routine_ids_count: Array.isArray(marker.routine_ids) ? marker.routine_ids.length : null,
            }
          : null,
        expected_tasks: Array.isArray(plan.tasks) ? plan.tasks.length : null,
        expected_routines: Array.isArray(plan.routines) ? plan.routines.length : null,
        expected_routine_steps: Array.isArray(plan.routines)
          ? plan.routines.reduce((n, r) => n + (Array.isArray(r.steps) ? r.steps.length : 0), 0)
          : null,
        expected_task_substeps: Array.isArray(plan.tasks)
          ? plan.tasks.reduce((n, t) => n + (Array.isArray(t.subtasks) ? t.subtasks.length : 0), 0)
          : null,
        plan_keys: Object.keys(plan).sort(),
        routine_names: Array.isArray(plan.routines) ? plan.routines.map((r) => r.name) : null,
        task_titles: Array.isArray(plan.tasks) ? plan.tasks.map((t) => t.title) : null,
      },
      null,
      2,
    ),
  );
}

const routines = await get(`/rest/v1/routines?user_id=eq.${userId}&select=id,name,icon,days`);
const routineIds = routines.map((r) => r.id);
let steps = [];
if (routineIds.length) {
  steps = await get(`/rest/v1/routine_tasks?routine_id=in.(${routineIds.join(",")})&select=routine_id,title,position`);
}
const state = await get(`/rest/v1/user_state?user_id=eq.${userId}&select=user_id,activities,updated_at`);
const eggs = await get(`/rest/v1/user_eggs?user_id=eq.${userId}&select=egg_id,routine_id,unlocked`);

console.log(
  JSON.stringify(
    {
      materialized_routines_count: routines.length,
      materialized_routine_names: routines.map((r) => r.name),
      materialized_steps_count: steps.length,
      user_state_rows: state.length,
      user_state_activity_count: Array.isArray(state[0]?.activities) ? state[0].activities.length : null,
      user_state_activity_ids: Array.isArray(state[0]?.activities) ? state[0].activities.map((a) => a.id) : null,
      user_eggs_count: eggs.length,
    },
    null,
    2,
  ),
);