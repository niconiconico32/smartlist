#!/usr/bin/env node
/**
 * Brainy — E2E móvil FINAL del funnel web (sin deep link brainy://claim).
 *
 * Flujo validado:
 *   abrir Brainy normal (dev build via Metro) -> login OTP con el email REAL del
 *   checkout -> sesión Supabase -> restore-funnel-plan (discovery server-side) ->
 *   Purchases.logIn(user.id) -> redeemWebPurchase (link REAL persistido) ->
 *   brainy Pro activo (SDK + check REST opcional) -> finalize-funnel-plan
 *   ({ planId } only) -> materialización -> overlay "Tu Brainy está listo" con
 *   counts REALES -> Empezar -> HOME. Luego REOPEN (relaunch) y REPLAY (2º login
 *   con OTP nuevo): idempotencia sin duplicar datos.
 *
 * POLÍTICA DE SECRETOS (obligatoria, igual que e2e-handoff.mjs):
 *   - Valores SOLO desde .env.e2e.local (gitignored) o variables de entorno.
 *   - Nunca se loguean: email completo, OTP, redemption URL, JWT, service key,
 *     anon key, RC keys, claim token. checkNoSecrets() ABORTA si un log incluiría
 *     un secreto. El estado inter-fase persiste SOLO planId + counts + labels.
 *   - El OTP lo teclea el OPERADOR en el teléfono (pausa por diseño).
 *
 * Fases (una por invocación; el estado real se persiste en .artifacts):
 *   --phase=discover          busca el plan durable + deriva counts esperados
 *   --phase=fresh-clean       adb reverse + pm clear (estado limpio)
 *   --phase=fresh-login       Maestro 03 (login + send OTP, se detiene)
 *   --phase=fresh-verify      Maestro 04 + verificación backend (snapshot S1)
 *   --phase=reopen            Maestro 05 + conteos S1 (si duplicó, falla)
 *   --phase=replay-clean      adb reverse + pm clear (sin borrar datos server)
 *   --phase=replay-login      Maestro 03 de nuevo (2º OTP, se detiene)
 *   --phase=replay-verify     Maestro 06 + conteos == S1 + reporte final
 *
 * Args opcionales:
 *   --email=<addr>            email del checkout (default: sb+checkout@brainyadhd.com)
 *   --planId=<uuid>           fijar plan (default: top pending/claiming con URL)
 *
 * RUN:
 *   npm run test:e2e:funnel:restore -- --phase=fresh-clean   (y así en cada fase)
 */

const ENV_E2E_LOCAL = "C:/Users/nico/brainy/smartlist/.env.e2e.local";

import { spawn, execFile } from "node:child_process";
import { promisify } from "node:util";
import { createHash } from "node:crypto";
import { mkdirSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const execFileAsync = promisify(execFile);
const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const FLOWS_DIR = join(ROOT, "e2e", "maestro");
const ARTIFACTS_DIR = join(ROOT, "e2e", ".artifacts", "funnel-restore");
const STATE_FILE = join(ARTIFACTS_DIR, "funnel-restore-state.json");

const APP_ANDROID_PACKAGE = "com.brainyahdh.app";
const ENTITLEMENT_ID = "brainy Pro";
const DEV_URL = "exp://localhost:8081";
const LABELS = { tasks: "tareas", routines: "rutinas", eggs: "compañeros" };

// ─── Carga de secrets (.env.e2e.local, gitignored) ──────────────────────────
const rawEnv = readFileSync(ENV_E2E_LOCAL, "utf8").replace(/^\uFEFF/, "");
for (const line of rawEnv.split(/\r?\n/)) {
  const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
  if (!m) continue;
  const key = m[1].trim();
  let value = m[2].trim();
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    value = value.slice(1, -1);
  }
  if (process.env[key] === undefined || process.env[key] === "") process.env[key] = value;
}

const args = process.argv.slice(2);
const argsMap = {};
for (const a of args) {
  const eq = a.indexOf("=");
  if (a.startsWith("--") && eq > 0) argsMap[a.slice(2, eq)] = a.slice(eq + 1);
  else if (a.startsWith("--")) argsMap[a.slice(2)] = true;
}

const MANUAL = !!argsMap.manual; // modo manual: NO se lanza Maestro (tú tocas el teléfono)

const env = process.env;
const SUPABASE_URL = (env.SUPABASE_URL || "").trim().replace(/\/+$/, "");
const SUPABASE_ANON_KEY = env.SUPABASE_ANON_KEY || "";
const SUPABASE_SERVICE_KEY = env.SUPABASE_SERVICE_KEY || "";
const RC_PUBLIC_KEY = env.REVENUECAT_PUBLIC_KEY?.trim() || null;
const MAESTRO_BIN = env.MAESTRO_BIN || "maestro";
const EMAIL = (argsMap.email || env.BRAINY_E2E_EMAIL || "").trim().toLowerCase();
const EMAIL_FORCED = !!(argsMap.email || env.BRAINY_E2E_EMAIL);
const PHASE = (argsMap.phase || "").trim();
const OVERRIDE_PLAN = (argsMap.planId || env.BRAINY_PLAN_ID || "").trim() || null;

function maskEmail(e) {
  if (!e) return "(sin email)";
  const p = e.split("@");
  return p[0].slice(0, 3) + "***@" + (p[1] || "?");
}
const maskId = (i) => (i ? i.slice(-8) : "?");

const SECRETS = [EMAIL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_KEY, RC_PUBLIC_KEY].filter(Boolean);
function checkNoSecrets(...parts) {
  const line = parts.map(String).join(" ");
  for (const s of SECRETS) {
    if (s && s.length >= 8 && line.includes(s)) {
      throw new Error("REFUSING TO LOG A SECRET — redacción rota");
    }
  }
}
function safeLog(...parts) {
  checkNoSecrets(...parts);
  console.log("[funnel-restore]", ...parts);
}

// ─── HTTP ────────────────────────────────────────────────────────────────────
async function http(method, url, { key, body } = {}) {
  const res = await fetch(url, {
    method,
    headers: {
      apikey: key,
      Authorization: "Bearer " + key,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  return { status: res.status, data };
}
const api = (p) => SUPABASE_URL + p;
const sha256 = (s) => createHash("sha256").update(s, "utf8").digest("hex");

function assert(cond, msg) {
  if (!cond) throw new Error("ASSERT failed: " + msg);
  safeLog("ok -", msg);
}

// ─── Estado persistido ───────────────────────────────────────────────────────
function loadState() {
  if (!existsSync(STATE_FILE)) return null;
  try { return JSON.parse(readFileSync(STATE_FILE, "utf8")); } catch { return null; }
}
function saveState(state) {
  mkdirSync(ARTIFACTS_DIR, { recursive: true });
  writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}
function requireState() {
  const s = loadState();
  if (!s) throw new Error("Sin estado previo — ejecuta --phase=discover primero.");
  return s;
}

// ─── DB helpers ──────────────────────────────────────────────────────────────
function deriveRoutineSteps(routine) {
  return (Array.isArray(routine?.steps) ? routine.steps : [])
    .map((s) => String(s?.title ?? "").trim()).filter((t) => t !== "");
}
async function activeEggCatalogIds() {
  const r = await http("GET", api("/rest/v1/egg_catalog?select=id"), { key: SUPABASE_SERVICE_KEY });
  return new Set((r.data ?? []).map((x) => Number(x.id)).filter((n) => Number.isInteger(n)));
}
async function deriveExpectedCounts(plan) {
  const tasks = Array.isArray(plan?.tasks) ? plan.tasks
    : Array.isArray(plan?.activities) ? plan.activities
    : [];
  const routinesArr = Array.isArray(plan?.routines) ? plan.routines : [];
  const eggIds = await activeEggCatalogIds();
  let routineSteps = 0, eggs = 0;
  for (const r of routinesArr) {
    routineSteps += deriveRoutineSteps(r).length;
    const rawEgg = r?.egg?.catalogId ?? r?.egg_catalog_id ?? r?.eggId;
    const n = Number(rawEgg);
    if (Number.isInteger(n) && n > 0 && eggIds.has(n)) eggs += 1;
  }
  return { activities: tasks.length, routines: routinesArr.length, tasks: routineSteps, eggs };
}

async function resolveUserByEmail(email) {
  let page = 0;
  for (let i = 0; i < 5; i++) {
    const r = await http("GET", api(`/auth/v1/admin/users?per_page=1000&page=${page}`), {
      key: SUPABASE_SERVICE_KEY,
    });
    if (!Array.isArray(r.data?.users) || r.data.users.length === 0) break;
    const hit = r.data.users.find((u) => (u.email || "").trim().toLowerCase() === email);
    if (hit) return hit.id;
    page += 1;
  }
  return null;
}

async function listEligiblePlans() {
  const r = await http(
    "GET",
    api(`/rest/v1/web_funnel_plans?select=id,status,claimed_by_user_id,expires_at,created_at,email,source,campaign,revenuecat_redemption_url,plan&order=created_at.desc&limit=50`),
    { key: SUPABASE_SERVICE_KEY },
  );
  const now = Date.now();
  return (Array.isArray(r.data) ? r.data : []).filter((c) => {
    if (!["pending", "claiming", "claimed"].includes(c.status)) return false;
    if (c.expires_at && new Date(c.expires_at).getTime() < now) return false;
    return true;
  });
}

async function findPlan() {
  const rows = await listEligiblePlans();
  const email = EMAIL;
  let chosen = null;
  if (OVERRIDE_PLAN) {
    const r = await http("GET", api(`/rest/v1/web_funnel_plans?select=id,status,claimed_by_user_id,expires_at,created_at,email,source,campaign,revenuecat_redemption_url,plan&id=eq.${OVERRIDE_PLAN}`), {
      key: SUPABASE_SERVICE_KEY,
    });
    chosen = (r.data ?? [])[0] || null;
    if (!chosen) throw new Error(`Plan ${OVERRIDE_PLAN} no encontrado.`);
  } else if (email) {
    const cands = rows.filter((c) => (c.email || "").trim().toLowerCase() === email);
    chosen = cands.find((c) =>
      c.status !== "claimed" &&
      typeof c.revenuecat_redemption_url === "string" && c.revenuecat_redemption_url.trim().length > 0,
    ) || cands[0] || null;
    if (!chosen) throw new Error(`No hay plan elegible para el email seleccionado.`);
  } else {
    throw new Error("No hay email — pasa --email=<tu email real del checkout>.");
  }

  const expected = await deriveExpectedCounts(chosen.plan ?? {});
  const userIdNow = await resolveUserByEmail((chosen.email || "").trim().toLowerCase());
  return {
    planRow: chosen,
    planId: chosen.id,
    email: (chosen.email || "").trim().toLowerCase(),
    status: chosen.status,
    source: chosen.source ?? null,
    campaign: chosen.campaign ?? null,
    created: chosen.created_at ?? null,
    expires: chosen.expires_at ?? null,
    claimedBy: chosen.claimed_by_user_id ?? null,
    claimedAt: chosen.claimed_at ?? null,
    hasUrl: typeof chosen.revenuecat_redemption_url === "string" && chosen.revenuecat_redemption_url.trim().length > 0,
    expected,
    userIdNow,
  };
}

async function dbCounts(userId) {
  const [s, rt, rg] = await Promise.all([
    http("GET", api(`/rest/v1/user_state?user_id=eq.${userId}&select=activities`), { key: SUPABASE_SERVICE_KEY }),
    http("GET", api(`/rest/v1/routines?user_id=eq.${userId}&select=id`), { key: SUPABASE_SERVICE_KEY }),
    http("GET", api(`/rest/v1/user_eggs?user_id=eq.${userId}&select=id`), { key: SUPABASE_SERVICE_KEY }),
  ]);
  const activities = s.data?.[0]?.activities ?? [];
  const routineIds = (rt.data ?? []).map((x) => x.id);
  let tasks = 0;
  if (routineIds.length) {
    const rr = await http(
      "GET",
      api(`/rest/v1/routine_tasks?routine_id=in.(${routineIds.map((id) => `"${id}"`).join(",")})&select=id`),
      { key: SUPABASE_SERVICE_KEY },
    );
    tasks = (rr.data ?? []).length;
  }
  return { activities: activities.length, routines: routineIds.length, tasks, eggs: (rg.data ?? []).length };
}

async function planState() {
  const r = await http(
    "GET",
    api(`/rest/v1/web_funnel_plans?select=id,status,claimed_by_user_id,claimed_at,revenuecat_redemption_url,email&id=eq.${requireState().planId}`),
    { key: SUPABASE_SERVICE_KEY },
  );
  return (r.data ?? [])[0] || null;
}

async function rcProCheck(userId) {
  if (!RC_PUBLIC_KEY) {
    safeLog("check REST RevenueCat omitido (REVENUECAT_PUBLIC_KEY ausente); validación canónica = CustomerInfo del SDK.");
    return;
  }
  const res = await fetch(`https://api.revenuecat.com/v1/subscribers/${userId}`, {
    headers: { Authorization: `Bearer ${RC_PUBLIC_KEY}` },
  });
  const data = await res.json().catch(() => ({}));
  if (res.status === 404) {
    throw new Error("RevenueCat no tiene subscriber para este user_id — ¿Purchases.logIn(user.id)?");
  }
  if (res.status > 299) throw new Error("RevenueCat API HTTP " + res.status);
  const original = data?.subscriber?.original_app_user_id;
  const ent = data?.subscriber?.entitlements?.[ENTITLEMENT_ID];
  const active = !!(ent && (ent.is_active === true || ent.active === true));
  assert(original === userId, "RC subscriber identificado con user.id (Purchases.logIn ok)");
  assert(active, `entitlement "${ENTITLEMENT_ID}" activo (redeemWebPurchase ok)`);
}

// ─── Adb / Maestro ───────────────────────────────────────────────────────────
async function adb(...cmd) {
  const { stdout } = await execFileAsync("adb", cmd);
  return stdout;
}
async function wakeAndroid() {
  for (const cmd of [
    ["shell", "input", "keyevent", "KEYCODE_WAKEUP"],
    ["shell", "svc", "power", "stayon", "true"],
    ["shell", "settings", "put", "system", "screen_off_timeout", "1800000"],
    ["shell", "wm", "dismiss-keyguard"],
  ]) { try { await adb(...cmd); } catch {} }
  await new Promise((r) => setTimeout(r, 500));
}
function maestroInvocation(extraArgs = []) {
  if (process.platform === "win32") return ["cmd.exe", ["/d", "/s", "/c", MAESTRO_BIN, ...extraArgs]];
  return [MAESTRO_BIN, extraArgs];
}
async function checkMaestro() {
  if (MANUAL) return;
  try {
    const [f, a] = maestroInvocation(["--version"]);
    await execFileAsync(f, a);
  } catch {
    throw new Error("No se encontró 'maestro' — instálalo o exporta MAESTRO_BIN.");
  }
}
async function runMaestro(flowName, extraEnv = {}) {
  if (MANUAL) {
    safeLog("modo manual — Maestro '" + flowName + "' NO se ejecuta (los toca el operador).");
    return;
  }
  mkdirSync(ARTIFACTS_DIR, { recursive: true });
  const argsFlow = ["test", "--format", "junit", "--output", join(ARTIFACTS_DIR, flowName + ".xml"), join(FLOWS_DIR, flowName + ".yaml")];
  const childEnv = {
    ...process.env,
    BRAINY_E2E_OPEN_URL: DEV_URL,
    BRAINY_E2E_EMAIL: process.env.BRAINY_E2E_EMAIL || EMAIL,
    ...extraEnv,
  };
  safeLog("maestro:", flowName, "(env monolito de secrets SIN imprimir valores)");
  const [f, a] = maestroInvocation(argsFlow);
  const child = spawn(f, a, { env: childEnv, stdio: "inherit" });
  const code = await new Promise((res) => child.on("close", res));
  if (code !== 0) throw new Error(`Maestro '${flowName}' falló (exit ${code}). Revisa ${join(ARTIFACTS_DIR, flowName + ".xml")}`);
}
async function checkDevBuild() {
  const out = await adb("shell", "pm", "list", "packages", APP_ANDROID_PACKAGE);
  if (!out.includes(APP_ANDROID_PACKAGE)) throw new Error(`Dev build ${APP_ANDROID_PACKAGE} no instalado. Expo Go no vale.`);
  safeLog("dev build instalado en el dispositivo");
}
function pmClear() {
  return adb("shell", "pm", "clear", APP_ANDROID_PACKAGE);
}
async function ensureReverse() {
  try { await adb("reverse", "tcp:8081", "tcp:8081"); safeLog("adb reverse 8081 ok"); } catch {}
}
async function preGrantPermissions() {
  for (const perm of ["android.permission.POST_NOTIFICATIONS"]) {
    try { await adb("shell", "pm", "grant", APP_ANDROID_PACKAGE, perm); safeLog("pre-grant permiso: " + perm); } catch {}
  }
}

// ─── Reporte ─────────────────────────────────────────────────────────────────
async function finalReport(state) {
  const p = await planState();
  const counts = await dbCounts(state.userId);
  safeLog("=== REPORTE FINAL (redactado) ===");
  console.log("  Device: SM-A525M (R58T212M97T) — dev build " + APP_ANDROID_PACKAGE);
  console.log("  Plan:  id …" + maskId(state.planId) + " | status " + p.status + " | source " + (state.source || "-"));
  console.log("  Email: " + maskEmail(p.email));
  console.log("  Expected (derivados del plan real):");
  console.log("    tasks=" + state.expected.activities + " routines=" + state.expected.routines +
    " routineSteps=" + state.expected.tasks + " eggs=" + state.expected.eggs);
  console.log("  Baseline (pre-materialización): " + fmtCounts(state.baseline));
  console.log("  S1 (post fresh):                " + fmtCounts(state.s1));
  console.log("  Reopen == S1: " + eqCounts(counts, state.s1));
  console.log("  Replay == S1: " + (state.s2 ? eqCounts(state.s2, state.s1) : "n/a"));
  console.log("  Plan: claimed=" + (p.status === "claimed") + " owner=ok(" + (p.claimed_by_user_id === state.userId) + ")" +
    " claimed_at=" + (p.claimed_at ? "set" : "NULL") + " redemption_url=" + (p.revenuecat_redemption_url ? "SET(!)" : "consumed"));
  const rcMsg = RC_PUBLIC_KEY ? "REST check OK" : "REST omitido (sin public key)";
  console.log("  RevenueCat: Purchases.logIn + brainy Pro => " + rcMsg);
  console.log("=== E2E FUNNEL RESTORE PASSED ===");
}
function fmtCounts(c) { return `activities=${c.activities} routines=${c.routines} routineSteps=${c.tasks} eggs=${c.eggs}`; }
function eqCounts(a, b) { return a.activities === b.activities && a.routines === b.routines && a.tasks === b.tasks && a.eggs === b.eggs; }

// ─── Main ────────────────────────────────────────────────────────────────────
async function main() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_KEY) {
    throw new Error("Faltan SUPABASE_URL/ANON/SERVICE_KEY (.env.e2e.local o env).");
  }
  if (!PHASE) throw new Error("Falta --phase=<...>. Fases: discover, fresh-clean, fresh-login, fresh-verify, reopen, replay-clean, replay-login, replay-verify.");
  safeLog("fase:", PHASE, "| email:", maskEmail(EMAIL), "| plan override:", OVERRIDE_PLAN ? "sí (…" + maskId(OVERRIDE_PLAN) + ")" : "no");

  switch (PHASE) {
    case "discover": {
      if (!EMAIL_FORCED && !OVERRIDE_PLAN) {
        const rows = await listEligiblePlans();
        const byEmail = new Map();
        for (const c of rows) {
          const e = (c.email || "").trim().toLowerCase();
          if (!e) continue;
          if (!byEmail.has(e)) byEmail.set(e, []);
          byEmail.get(e).push(c);
        }
        console.log("\n  Inventario de planes elegibles por email (solo operador, no se persiste):");
        for (const [e, list] of byEmail) {
          const top = list[0];
          const url = typeof top.revenuecat_redemption_url === "string" && top.revenuecat_redemption_url.trim().length > 0;
          console.log("    - " + e + "  <- " + list.length + " plan(es); top: …" + maskId(top.id) + " | " + top.status + " | " + top.created + " | url=" + url);
        }
        console.log("\n  Elige el email del checkout REAL y re-ejecuta con:  --phase=discover --email=<ese email>");
        throw new Error("Falta --email=<tu email real del checkout>.");
      }
      const f = await findPlan();
      saveState({
        planId: f.planId,
        source: f.source,
        campaign: f.campaign,
        status: f.status,
        expected: f.expected,
        labels: LABELS,
        userId: f.userIdNow,
        baseline: f.userIdNow ? await dbCounts(f.userIdNow) : { activities: 0, routines: 0, tasks: 0, eggs: 0 },
        s1: null,
        s2: null,
      });
      console.log("\n  Email del checkout (solo operador):", f.email);
      console.log("  Plan: …" + maskId(f.planId));
      console.log("  status:", f.status, "| source:", f.source ?? "-", "| campaign:", f.campaign ?? "-");
      console.log("  created:", f.created, "| expires:", f.expires ?? "null");
      console.log("  has redemption URL:", f.hasUrl);
      console.log("  expected:", fmtCounts({ activities: f.expected.activities, routines: f.expected.routines, tasks: f.expected.tasks, eggs: f.expected.eggs }), "(derivado del plan REAL)");
      if (f.claimedBy) console.log("  ya reclamado por user …" + maskId(f.claimedBy) + (f.claimedAt ? ` (${f.claimedAt})` : ""));
      console.log("  user del email:", f.userIdNow ? "existe (…" + maskId(f.userIdNow) + ")" : "NO existe (se auto-crea en el primer OTP)");
      safeLog("estado guardado — pasa --email=<tu email> en TODAS las fases (o exporta BRAINY_E2E_EMAIL).");
      break;
    }

    case "fresh-clean": {
      await checkDevBuild();
      await ensureReverse();
      await wakeAndroid();
      await pmClear();
      await preGrantPermissions();
      safeLog("pm clear hecho — app en estado limpio (sin sesión)");
      break;
    }

    case "replay-clean": {
      requireState();
      await ensureReverse();
      await wakeAndroid();
      await pmClear();
      await preGrantPermissions();
      safeLog("pm clear hecho (replay) — sesión local borrada, datos server intactos");
      break;
    }

    case "fresh-login":
    case "replay-login": {
      const st = requireState();
      if (MANUAL) {
        console.log("\n  >> MANUAL — pasos en el teléfono:");
        console.log("     1) Abre Brainy (ya está limpio tras --phase=fresh-clean).");
        console.log("     2) En la pantalla de login elige 'email', escribe el email y pulsa 'Enviar código'.");
        console.log("     3) Lee el OTP de tu inbox, introdúcelo y pulsa verificar.");
        if (PHASE === "fresh-login") {
          console.log("     4) (FRESH) Espera el overlay 'Tu Brainy está listo' con los contadores -> CTA 'Empezar' -> quedarte en 'Tareas'.");
        } else {
          console.log("     4) (REPLAY) Debe ir directo a 'Tareas' SIN overlay de restore (plan ya claimed).");
        }
        safeLog("hecho — corre luego la fase verify cuando el teléfono esté en 'Tareas'.");
        break;
      }
      if (!EMAIL_FORCED) throw new Error("Falta --email=<tu email real> (lo inyecta el primer maestro login).");
      await checkDevBuild();
      await ensureReverse();
      await wakeAndroid();
      await checkMaestro();
      await runMaestro("03-funnel-restore-login");
      console.log("\n>> OPERADOR: introduce el OTP en el app y pulsa \"Verificar y continuar\".");
      if (PHASE === "replay-login") console.log(">> (es el SEGUNDO OTP: la app fue reiniciada con pm clear).");
      safeLog("flow 03 terminó en loginOtpInput — esperando al operador (corre luego la fase verify).");
      break;
    }

    case "fresh-verify": {
      const st = requireState();
      await checkDevBuild();
      await ensureReverse();
      await wakeAndroid();
      await checkMaestro();
      await runMaestro("04-funnel-restore-fresh-verify", {
        BRAINY_EXP_TASKS: String(st.expected.activities),
        BRAINY_EXP_ROUTINES: String(st.expected.routines),
        BRAINY_EXP_EGGS: String(st.expected.eggs),
        BRAINY_LBL_TASKS: LABELS.tasks,
        BRAINY_LBL_ROUTINES: LABELS.routines,
        BRAINY_LBL_EGGS: LABELS.eggs,
      });

      // Verificación backend S1.
      if (!st.userId) {
        const p0 = await planState();
        const email = (p0.email || "").trim().toLowerCase();
        st.userId = await resolveUserByEmail(email);
        assert(!!st.userId, "usuario resuelto tras el primer OTP");
      }
      const s1 = await dbCounts(st.userId);
      const dActivities = s1.activities - st.baseline.activities;
      const dRoutines = s1.routines - st.baseline.routines;
      const dTasks = s1.tasks - st.baseline.tasks;
      const dEggs = s1.eggs - st.baseline.eggs;
      assert(dActivities === st.expected.activities, "actividades materializadas (delta " + dActivities + " vs " + st.expected.activities + ")");
      assert(dRoutines === st.expected.routines, "rutinas materializadas (delta " + dRoutines + ")");
      assert(dTasks === st.expected.tasks, "pasos de rutina (no vacíos) materializados (delta " + dTasks + ")");
      assert(dEggs === st.expected.eggs, "huevos asignados (delta " + dEggs + ")");

      const p = await planState();
      assert(p.status === "claimed", "plan marcado claimed");
      assert(p.claimed_by_user_id === st.userId, "plan vinculado al usuario (claimed_by_user_id)");
      assert(!!p.claimed_at, "claimed_at fijado");
      assert(p.revenuecat_redemption_url === null || p.revenuecat_redemption_url === "", "redemption URL consumida tras finalize");
      await rcProCheck(st.userId);

      st.s1 = s1;
      saveState(st);
      safeLog("FRESH PASSED — S1:", fmtCounts(s1));
      break;
    }

    case "reopen": {
      const st = requireState();
      await checkDevBuild();
      await ensureReverse();
      await wakeAndroid();
      await checkMaestro();
      await runMaestro("05-funnel-restore-reopen");
      const s = await dbCounts(st.userId);
      assert(eqCounts(s, st.s1), "reopen NO duplica datos (S1 == reopen)");
      const p = await planState();
      assert(p.status === "claimed" && p.claimed_by_user_id === st.userId, "plan sigue claimed por el mismo usuario");
      await rcProCheck(st.userId);
      safeLog("REOPEN PASSED — conteos idénticos a S1:", fmtCounts(s));
      break;
    }

    case "replay-verify": {
      const st = requireState();
      await checkDevBuild();
      await ensureReverse();
      await wakeAndroid();
      await checkMaestro();
      await runMaestro("06-funnel-restore-replay-verify");
      const s2 = await dbCounts(st.userId);
      assert(eqCounts(s2, st.s1), "replay NO duplica datos (S1 == S2)");
      const p = await planState();
      assert(p.status === "claimed" && p.claimed_by_user_id === st.userId, "plan sigue claimed");
      assert(p.revenuecat_redemption_url === null || p.revenuecat_redemption_url === "", "URL sigue consumida");
      await rcProCheck(st.userId);
      st.s2 = s2;
      saveState(st);
      safeLog("REPLAY PASSED — S2:", fmtCounts(s2));
      await finalReport(st);
      break;
    }

    default:
      throw new Error("Fase desconocida: " + PHASE);
  }
}

main().catch((e) => {
  console.error("\n[funnel-restore] FAILED:", e.message);
  process.exitCode = 1;
});