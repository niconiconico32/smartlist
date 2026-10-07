// ============================================================================
// CONDICIÓN 6: materialización server-side, PUNTUAL e IDEMPOTENTE del plan ya
// comprado del usuario autorizado.
//
// Hace EXACTAMENTE UNA llamada a la RPC canónica
// `materialize_funnel_plan_for_purchase`, que es idempotente por diseño.
// NO envía credenciales, NO llama issueFunnelCredentials, NO toca contraseña,
// email, entitlement, purchase_confirmed_at ni credentials_issued_at, NO crea
// usuarios ni planes, NO llama a purchase().
//
// Uso:
//   ENV_FILE=.env.e2e.local TARGET_USER_ID=<uuid> node scripts/materialize-live-plan.mjs
// ============================================================================
import { readFileSync } from "node:fs";

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
if (!url || !key || !userId) {
  console.error("SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY y TARGET_USER_ID son obligatorios");
  process.exit(1);
}
const headers = { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" };

const plans = await (
  await fetch(`${url}/rest/v1/web_funnel_plans?funnel_user_id=eq.${userId}&select=id,status,purchase_confirmed_at,credentials_issued_at,claimed_by_user_id,plan&order=created_at.desc`, { headers })
).json();
if (!Array.isArray(plans) || plans.length !== 1) {
  console.error(`Se esperaba exactamente 1 plan para ese funnel_user_id; hay ${Array.isArray(plans) ? plans.length : "error"}`);
  process.exit(2);
}
const plan = plans[0];

const marker = plan.plan?.__materialized ?? null;
console.log("ANTES", JSON.stringify({
  plan_id: plan.id,
  status: plan.status,
  purchase_confirmed_at: plan.purchase_confirmed_at,
  credentials_issued_at: plan.credentials_issued_at,
  claimed_by_user_id: plan.claimed_by_user_id,
  materialized: marker ? "presente" : "ausente",
  expected_tasks: plan.plan?.tasks?.length ?? null,
  expected_routines: plan.plan?.routines?.length ?? null,
}, null, 2));

if (marker) {
  console.log("Ya materializado: no se llama a la RPC (idempotencia).");
  process.exit(0);
}

// Las precondiciones se validan de nuevo justo antes de escribir.
if (!plan.purchase_confirmed_at) { console.error("ABORT: compra no confirmada"); process.exit(3); }
if (!plan.credentials_issued_at) { console.error("ABORT: credenciales no emitidas"); process.exit(4); }
if (plan.claimed_by_user_id) { console.error("ABORT: ya hay dueño de claim"); process.exit(5); }

// ── Payload con los MISMOS builders que usa finalize-funnel-plan ──────────
// Se replican aquí porque este script corre en Node y no puede importar los
// módulos Deno; la logica es identica a _shared/funnel.ts (buildActivities /
// buildRoutines). Los dias ya normalizados vienen del plan JSON del funnel web.
const DAY_ABBR = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const toInt = (v, fb) => (Number.isFinite(Number(v)) && Number(v) >= 0 ? Math.round(Number(v)) : fb);
const shortId = String(plan.id).replace(/-/g, "").slice(0, 8);

const activities = (plan.plan?.tasks ?? []).map((task, index) => {
  const subtasks = (task.subtasks ?? []).map((s, i) => ({
    id: `fs_${shortId}_${index}_${i}`,
    title: String(s.title ?? s.name ?? "").trim() || `Paso ${i + 1}`,
    duration: toInt(s.duration ?? s.minutes, 5),
    isCompleted: false,
  }));
  const totalMin = subtasks.reduce((sum, s) => sum + s.duration, 0);
  return {
    id: `funnel_${shortId}_task_${index}`,
    title: String(task.title ?? "").trim() || "Tarea",
    emoji: String(task.emoji ?? "✨"),
    metric: task.metric ?? (subtasks.length > 0 ? `${totalMin} min` : ""),
    color: task.color ?? "#A6E3A1",
    iconColor: task.iconColor ?? "#CBA6F7",
    action: "play",
    completed: false,
    subtasks,
    difficulty: ["easy", "moderate", "hard"].includes(task.difficulty) ? task.difficulty : "easy",
    recurrence: task.recurrence ?? { type: "once" },
    reminder: task.reminder ?? { enabled: false, minutesBefore: 15 },
    completedDates: [],
    ...(task.scheduledDate ? { scheduledDate: String(task.scheduledDate) } : {}),
  };
});

const normalizeDays = (raw) => {
  if (!Array.isArray(raw)) return [];
  const aliases = new Set(["daily", "everyday", "every day", "every_day", "todoslosdias", "todos los dias", "todos los días", "all", "any", "*"]);
  if (raw.some((d) => typeof d === "string" && aliases.has(d.trim().toLowerCase().replace(/\s+/g, " ")))) return [...DAY_ABBR];
  const out = [];
  for (const d of raw) {
    if (typeof d === "string") {
      const t = d.trim();
      if (!t) continue;
      if (DAY_ABBR.includes(t)) { if (!out.includes(t)) out.push(t); continue; }
      const n = Number(t);
      if (Number.isFinite(n)) { const ab = DAY_ABBR[n % 7] ?? DAY_ABBR[0]; if (!out.includes(ab)) out.push(ab); }
    } else if (typeof d === "number" && Number.isFinite(d)) {
      const ab = DAY_ABBR[d % 7] ?? DAY_ABBR[0];
      if (!out.includes(ab)) out.push(ab);
    }
  }
  return out;
};

const routines = (plan.plan?.routines ?? []).map((routine) => {
  const eggValue = routine.egg?.catalogId ?? routine.egg_catalog_id ?? routine.eggId;
  const eggId = Number(eggValue);
  return {
    name: String(routine.name ?? "").trim(),
    icon: String(routine.icon ?? "Circle"),
    days: normalizeDays(routine.days),
    steps: (routine.steps ?? []).map((s) => ({ title: String(s.title ?? "").trim(), duration: toInt(s.duration, 5) })),
    egg: { catalogId: Number.isFinite(eggId) && eggId > 0 ? eggId : null },
  };
});

// ── UNA sola llamada a la RPC canónica ─────────────────────────────────────
const res = await fetch(`${url}/rest/v1/rpc/materialize_funnel_plan_for_purchase`, {
  method: "POST",
  headers,
  body: JSON.stringify({ p_plan_id: plan.id, p_user_id: userId, p_activities: activities, p_routines: routines }),
});
const result = await res.json().catch(() => null);
if (!res.ok) {
  console.error(`RPC fallo HTTP ${res.status}`, JSON.stringify(result));
  process.exit(6);
}
console.log("RPC", JSON.stringify({ success: result?.success, taskCount: result?.taskCount, routineCount: result?.routineCount, eggCount: result?.eggCount, alreadyClaimed: result?.alreadyClaimed ?? false }, null, 2));
if (result?.success !== true && result?.alreadyClaimed !== true) {
  console.error("La RPC no materializo. No se envio correo ni se toco metadata.");
  process.exit(7);
}

// ── Verificacion de lectura ────────────────────────────────────────────────
const after = await (
  await fetch(`${url}/rest/v1/web_funnel_plans?id=eq.${plan.id}&select=id,status,purchase_confirmed_at,credentials_issued_at,claimed_by_user_id,claimed_at,plan`, { headers })
).json();
const p = after[0];
const m = p.plan?.__materialized ?? null;
console.log("DESPUES", JSON.stringify({
  status: p.status,
  claimed_by_user_id: p.claimed_by_user_id,
  claimed_at_present: Boolean(p.claimed_at),
  purchase_confirmed_at: p.purchase_confirmed_at,
  credentials_issued_at: p.credentials_issued_at,
  materialized: m ? { task_count: m.task_count, routine_count: m.routine_count, egg_count: m.egg_count } : null,
}, null, 2));