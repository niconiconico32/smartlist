#!/usr/bin/env node
/**
 * Brainy — E2E del "handoff final" del funnel web.
 *
 * Automatiza (sobre development build, NUNCA Expo Go):
 *   1. Deep link brainy://claim?token=...&redeem_url=...
 *   2. Persistencia del handoff pendiente (claim token + redemption URL)
 *   3. Login/auth (modal email del app)
 *   4. Purchases.logIn(user.id)  →  verificado server-side con RevenueCat REST
 *   5. redeemWebPurchase()        →  verificado server-side (entitlement activo)
 *   6. claim-funnel-plan          →  plan materializado (Supabase)
 *   7. Navegación a /plan-ready   →  assert UI con Maestro
 *   8. Reapertura del MISMO link  →  sin duplicar datos (comparación backend)
 *
 * TAMBIÉN: `--claim-only` = el mismo camino SIN redención (sin RC/compra).
 *
 * POLÍTICA DE SECRETOS (obligatoria):
 *   - Los valores vienen SOLO de variables de entorno.
 *   - Ningún log/fixture/report/screenshot contiene claim token, redemption URL,
 *     JWT, email o API keys. El script se niega (throw) si un log va a
 *     imprimir un secreto, y los reportes de Maestro viven en e2e/.artifacts/
 *     (gitignored). Nunca imprimir braindump del payload.
 *
 * ENV requeridas:
 *   SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_KEY
 *   BRAINY_CLAIM_TOKEN               (necesario en --claim-only y en full con token)
 *   BRAINY_REDEMPTION_URL            (si se define → modo full/redemption)
 * Opcionales:
 *   BRAINY_TEST_EMAIL, BRAINY_TEST_PASSWORD   (si no, crea un usuario temporal)
 *   REVENUECAT_PUBLIC_KEY            (OPCIONAL en modo full — check REST de Pro.
 *                                     La validación canónica del entitlement es el
 *                                     CustomerInfo del SDK móvil (entitlements.active
 *                                     ["brainy Pro"]); el check REST solo se hace si
 *                                     se provee esta key y nunca se imprime.)
 *
 * Los secrets pueden inyectarse también desde `.env.e2e.local` (gitignored):
 *   BRAINY_CLAIM_TOKEN, BRAINY_REDEMPTION_URL, SUPABASE_URL,
 *   SUPABASE_ANON_KEY, SUPABASE_SERVICE_KEY, REVENUECAT_PUBLIC_KEY (opcional),
 *   BRAINY_TEST_EMAIL, BRAINY_TEST_PASSWORD (opcionales).
 *
 * Flags:
 *   --claim-only          Saltar toda la parte RevenueCat/redemption.
 *   --platform=ios|android (auto-detecta por defecto).
 *   --manual              Modo manual: prepara y luego instruye/pregunta.
 *
 * Uso:
 *   npm run test:e2e:handoff
 *   npm run test:e2e:handoff:claim-only
 */
"use strict";

import { spawn } from "node:child_process";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { createHash } from "node:crypto";
import { mkdirSync, existsSync, readFileSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import readline from "node:readline";

const execFileAsync = promisify(execFile);
const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const FLOWS_DIR = join(ROOT, "e2e", "maestro");
const ARTIFACTS_DIR = join(ROOT, "e2e", ".artifacts");

const APP_BUNDLE_ID = "com.brainyahdh.app";
const APP_ANDROID_PACKAGE = "com.brainyahdh.app";
const ENTITLEMENT_ID = "brainy Pro";

// ─── Carga de secrets externos (.env.e2e.local, gitignored) ─────────────────
// Permite mantener fuera del repo las claves reales del E2E (claim token,
// redemption URL, Service Key, ...). Los valores SOLO se aplican cuando no
// están ya definidos en el entorno real (el entorno real manda) y NUNCA se
// loguean. Formato: KEY=VALUE (comillas simples/dobles opcionales).
const ENV_E2E_LOCAL = join(ROOT, ".env.e2e.local");
if (existsSync(ENV_E2E_LOCAL)) {
  const raw = readFileSync(ENV_E2E_LOCAL, "utf8");
  let loaded = 0;
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined || process.env[key] === "") {
      process.env[key] = value;
      loaded += 1;
    }
  }
  console.log(`[handoff-e2e] .env.e2e.local cargado (${loaded} claves) — valores nunca logueados`);
}

// ─── Env / args ──────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const argsMap = {};
for (const a of args) {
  if (a.startsWith("--platform=")) argsMap.platform = a.split("=")[1];
  else argsMap[a.replace(/^--/, "")] = true;
}
const MODE_CLAIM_ONLY = !!argsMap["claim-only"];
const MODE_MANUAL = !!argsMap["manual"];

const env = process.env;
const SUPABASE_URL = (env.SUPABASE_URL || "").trim().replace(/\/+$/, "");
const SUPABASE_ANON_KEY = env.SUPABASE_ANON_KEY || "";
const SUPABASE_SERVICE_KEY = env.SUPABASE_SERVICE_KEY || "";
const CLAIM_TOKEN = env.BRAINY_CLAIM_TOKEN?.trim() || null;
const REDEMPTION_URL = env.BRAINY_REDEMPTION_URL?.trim() || null;
const TEST_EMAIL = env.BRAINY_TEST_EMAIL?.trim() || null;
const TEST_PASSWORD = env.BRAINY_TEST_PASSWORD || null;
const RC_PUBLIC_KEY = env.REVENUECAT_PUBLIC_KEY?.trim() || null;
const MAESTRO_BIN = env.MAESTRO_BIN || "maestro";

const FULL = !MODE_CLAIM_ONLY && !!REDEMPTION_URL;

function fail(msg) {
  console.error("\n[handoff-e2e] ERROR:", msg);
  process.exit(1);
}

// ─── Validación de entorno ───────────────────────────────────────────────────

if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_KEY) {
  fail(
    "Faltan SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_KEY (variables de entorno).",
  );
}
// url valida (permite dominios personalizados tipo auth.tudominio.com)
if (!/^https:\/\/[^/\s]+$/.test(SUPABASE_URL)) {
  fail("SUPABASE_URL no parece una instancia de Supabase.");
}
// Claim token
if (MODE_CLAIM_ONLY && !CLAIM_TOKEN) {
  fail("Modo --claim-only requiere BRAINY_CLAIM_TOKEN.");
}
if (FULL) {
  // REVENUECAT_PUBLIC_KEY es OPCIONAL: sin ella se salta el check REST y la
  // validación del entitlement queda en el CustomerInfo del SDK móvil
  // (entitlements.active["brainy Pro"]), que es la fuente canónica.
  if (REDEMPTION_URL && !/^(rc-|revenuecat:)/.test(REDEMPTION_URL)) {
    fail("BRAINY_REDEMPTION_URL debe ser una Redemption Link tipo 'rc-<appid>://'.");
  }
}
if ((TEST_EMAIL && !TEST_PASSWORD) || (!TEST_EMAIL && TEST_PASSWORD)) {
  fail("BRAINY_TEST_EMAIL y BRAINY_TEST_PASSWORD deben ir juntas.");
}

// ─── Secretos que jamás deben aparecer en ningún log ─────────────────────────

const SECRETS = [
  CLAIM_TOKEN,
  REDEMPTION_URL,
  TEST_EMAIL,
  TEST_PASSWORD,
  RC_PUBLIC_KEY,
  SUPABASE_ANON_KEY,
  SUPABASE_SERVICE_KEY,
].filter(Boolean);

function checkNoSecrets(...parts) {
  const line = parts.map(String).join(" ");
  for (const s of SECRETS) {
    if (s.length >= 8 && line.includes(s)) {
      throw new Error("REFUSING TO LOG A SECRET — implementación de redacción rota");
    }
  }
}

function safeLog(...parts) {
  checkNoSecrets(...parts);
  console.log("[handoff-e2e]", ...parts);
}

// ─── Helpers HTTP ────────────────────────────────────────────────────────────

async function http(method, url, { key, body, headers = {} } = {}) {
  const res = await fetch(url, {
    method,
    headers: {
      apikey: key,
      Authorization: "Bearer " + key,
      "Content-Type": "application/json",
      Prefer: "return=representation",
      ...headers,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  return { status: res.status, data };
}

const api = (path) => SUPABASE_URL + path;
const sha256 = (s) => createHash("sha256").update(s, "utf8").digest("hex");

function assert(cond, msg) {
  if (!cond) throw new Error("ASSERT failed: " + msg);
  safeLog("ok -", msg);
}

// ─── Estado en memoria ───────────────────────────────────────────────────────

let userId = null;
let platform = null;
let createdUser = false;
let seededPlanId = null;
let androidSerial = "";
let uiEmail = TEST_EMAIL; // credenciales que verá MAESTRO (nunca se loguean)
let uiPassword = TEST_PASSWORD;
let activePlan = null; // el plan que se materializará (real de la DB o PLAN_PAYLOAD)

// ─── Fases backend ───────────────────────────────────────────────────────────

async function resolveTestUser() {
  if (TEST_EMAIL && TEST_PASSWORD) {
    const r = await http("POST", api("/auth/v1/token?grant_type=password"), {
      key: SUPABASE_ANON_KEY,
      body: { email: TEST_EMAIL, password: TEST_PASSWORD },
    });
    if (r.status !== 200) {
      fail("No se pudo iniciar sesión con BRAINY_TEST_EMAIL (¿usuario existe?).");
    }
    userId = r.data.user.id;
    safeLog("usuario de prueba (provisto) id=", "…" + userId.slice(-8));
  } else {
    const email = "e2e-handoff+" + Date.now() + "@brainytest.invalid";
    const password = "Hnd0ff!" + Date.now();
    uiEmail = email;
    uiPassword = password;
    const r = await http("POST", api("/auth/v1/admin/users"), {
      key: SUPABASE_SERVICE_KEY,
      body: {
        email,
        password,
        email_confirm: true,
        user_metadata: { onboarding_completed: true },
      },
    });
    if (r.status !== 201 && r.status !== 200) {
      fail("No se pudo crear usuario de prueba: HTTP " + r.status);
    }
    userId = r.data.id;
    createdUser = true;
    safeLog("usuario de prueba (temporal) creado id=", "…" + userId.slice(-8));

    const sign = await http("POST", api("/auth/v1/token?grant_type=password"), {
      key: SUPABASE_ANON_KEY,
      body: { email, password },
    });
    if (sign.status !== 200) fail("No se pudo obtener JWT del usuario temporal");
  }
  // Las credenciales de MAESTRO van solo por env del subproceso (nunca logs).
  process.env.BRAINY_TEST_EMAIL = uiEmail;
  process.env.BRAINY_TEST_PASSWORD = uiPassword;
}

async function seedLegacyActivity() {
  const r = await http("POST", api("/rest/v1/user_state"), {
    key: SUPABASE_SERVICE_KEY,
    headers: { Prefer: "return=minimal" },
    body: {
      user_id: userId,
      activities: [
        {
          id: "legacy_task_keep",
          title: "Actividad previa del usuario",
          completed: false,
          subtasks: [],
          difficulty: "easy",
          recurrence: { type: "once" },
          reminder: { enabled: false, minutesBefore: 15 },
          completedDates: [],
        },
      ],
    },
  });
  if (r.status >= 300) fail("No se pudo sembrar actividad legacy: HTTP " + r.status);
  safeLog("actividad legacy sembrada (test de merge sin duplicar)");
}

const PLAN_PAYLOAD = {
  tasks: [
    {
      title: "Revisar pendientes",
      emoji: "📌",
      color: "#A6E3A1",
      subtitle: "",
      subtasks: [
        { title: "Revisar bandeja", duration: 5 },
        { title: "Responder correo", duration: 15 },
      ],
      difficulty: "moderate",
      reminder: { enabled: true, minutesBefore: 30 },
    },
    { title: "Estirar 10 minutos", emoji: "🧘", subtasks: [] },
  ],
  routines: [
    {
      name: "Rutina Mañana",
      icon: "Sun",
      days: [1, 3, 5],
      steps: [
        { title: "Vaso de agua", duration: 2 },
        { title: "Estiramiento", duration: 5 },
      ],
      egg: { catalogId: 1 },
    },
    {
      name: "Rutina Noche",
      icon: "Moon",
      days: [0, 2, 4, 6],
      steps: [{ title: "", duration: 0 }],
    },
    {
      name: "Rutina Fin de Semana",
      icon: "Star",
      days: [0, 6],
      steps: [{ title: "Leer 5 min", duration: 5 }],
    },
  ],
  funnel: { source: "e2e-handoff" },
};

async function ensureClaimablePlan() {
  if (!CLAIM_TOKEN) return;
  const hash = sha256(CLAIM_TOKEN);
  const existing = await http(
    "GET",
    api(`/rest/v1/web_funnel_plans?claim_token_hash=eq.${hash}&select=id,status,plan`),
    { key: SUPABASE_SERVICE_KEY },
  );
  if ((existing.data || []).length > 0) {
    const row = existing.data[0];
    activePlan = row.plan ?? null;
    // El sure de I1: NO hardcodear conteos. Se leerán de activePlan REAL
    // (o de PLAN_PAYLOAD en modo siembra) con deriveExpectedCounts().
    safeLog(
      "plan web ya existía para este token (funnel real) — se usará tal cual " +
        "(status=" + row.status + ")",
    );
    return;
  }

  // SIEMBRA = simulación del RESULTADO del funnel (plan listo 'pending'), NO una
  // compra. En un E2E real el funnel crea esta fila tras la compra sandbox.
  const r = await http("POST", api("/rest/v1/web_funnel_plans"), {
    key: SUPABASE_SERVICE_KEY,
    body: {
      status: "pending",
      claim_token_hash: hash,
      plan: PLAN_PAYLOAD,
      email: TEST_EMAIL ?? "plan@seed.local",
      source: "e2e-handoff",
      campaign: "e2e-handoff",
    },
  });
  if (r.status >= 300) {
    fail("No se pudo sembrar el plan 'pending': HTTP " + r.status);
  }
  seededPlanId = (Array.isArray(r.data) ? r.data[0] : r.data)?.id ?? null;
  activePlan = PLAN_PAYLOAD;
  safeLog("plan 'pending' sembrado (simula el resultado del funnel) id=", seededPlanId ? "…" + seededPlanId.slice(-8) : "(vacio)");
}

// ─── Derivación de conteos esperados desde el plan ───────────────────────────
// I1: los assert NO son +2/+3/+3/+1 hardcodeados; se derivan del MISMO plan que
// materializará claim_funnel_plan(), replicando la semántica de _shared/funnel.ts
// (buildActivities/buildRoutines) y de la RPC pública.claim_funnel_plan:
//   activities: una actividad por task de plan.tasks (buildActivities maps 1:1).
//   routines:   una por plan.routines.
//   tasks:      pasos NO vacíos de cada rutina (v_routine->'steps', salta títulos
//               en blanco — igual que la RPC). OJO: el web envía rutinas con
//               `tasks`/`position`, pero el consumidor canónico lee `steps`.
//   eggs:       una companion por rutina que pide egg con catalogId numérico > 0
//               y que existe/activa en egg_catalog (create/reuse/fallback; si la
//               petición no es un entero válido la RPC no asigna companion).
function deriveRoutineSteps(routine) {
  const raw = Array.isArray(routine?.steps) ? routine.steps : [];
  return raw
    .map((s) => String(s?.title ?? "").trim())
    .filter((title) => title !== "");
}

async function activeEggCatalogIds() {
  const r = await http("GET", api("/rest/v1/egg_catalog?select=id"), {
    key: SUPABASE_SERVICE_KEY,
  });
  return new Set((r.data ?? []).map((x) => Number(x.id)).filter((n) => Number.isInteger(n)));
}

async function deriveExpectedCounts(plan) {
  const tasks = Array.isArray(plan?.tasks) ? plan.tasks
    : Array.isArray(plan?.activities) ? plan.activities
    : [];
  const routines = Array.isArray(plan?.routines) ? plan.routines : [];
  const eggIds = await activeEggCatalogIds();

  let routineTasks = 0;
  let eggs = 0;
  for (const r of routines) {
    routineTasks += deriveRoutineSteps(r).length;
    const rawEgg = r?.egg?.catalogId ?? r?.egg_catalog_id ?? r?.eggId;
    const eggId = Number(rawEgg);
    if (Number.isInteger(eggId) && eggId > 0 && eggIds.has(eggId)) eggs += 1;
  }

  return { activities: tasks.length, routines: routines.length, tasks: routineTasks, eggs };
}

async function planHasStatus(statuses) {
  if (!CLAIM_TOKEN) return false;
  const hash = sha256(CLAIM_TOKEN);
  const r = await http(
    "GET",
    api(`/rest/v1/web_funnel_plans?claim_token_hash=eq.${hash}&select=status`),
    { key: SUPABASE_SERVICE_KEY },
  );
  const status = (r.data ?? [])[0]?.status;
  return statuses.includes(status);
}

// ─── Conteos backend ─────────────────────────────────────────────────────────

async function dbCounts() {
  const [s, rt, rg] = await Promise.all([
    http("GET", api(`/rest/v1/user_state?user_id=eq.${userId}&select=activities`), {
      key: SUPABASE_SERVICE_KEY,
    }),
    http("GET", api(`/rest/v1/routines?user_id=eq.${userId}&select=id`), {
      key: SUPABASE_SERVICE_KEY,
    }),
    http("GET", api(`/rest/v1/user_eggs?user_id=eq.${userId}&select=id`), {
      key: SUPABASE_SERVICE_KEY,
    }),
  ]);
  const activities = s.data?.[0]?.activities ?? [];
  const routineIds = (rt.data ?? []).map((x) => x.id);
  let tasks = 0;
  if (routineIds.length) {
    const rr = await http(
      "GET",
      api(
        `/rest/v1/routine_tasks?routine_id=in.(${routineIds.map((id) => `"${id}"`).join(",")})&select=id`,
      ),
      { key: SUPABASE_SERVICE_KEY },
    );
    tasks = (rr.data ?? []).length;
  }
  return {
    activities: activities.length,
    routines: routineIds.length,
    tasks,
    eggs: (rg.data ?? []).length,
  };
}

async function assertPlanClaimed() {
  if (!CLAIM_TOKEN) return;
  const hash = sha256(CLAIM_TOKEN);
  const r = await http(
    "GET",
    api(`/rest/v1/web_funnel_plans?claim_token_hash=eq.${hash}&select=status,claimed_by_user_id`),
    { key: SUPABASE_SERVICE_KEY },
  );
  const row = (r.data ?? [])[0];
  assert(!!row, "el plan existe");
  assert(row.status === "claimed", "plan marcado como claimed tras claim-funnel-plan");
  assert(row.claimed_by_user_id === userId, "plan vinculado al usuario que lo reclamó");
}

async function rcProCheck() {
  if (!FULL) return;
  if (!RC_PUBLIC_KEY) {
    safeLog(
      "check REST RevenueCat OPCIONAL omitido (REVENUECAT_PUBLIC_KEY ausente). " +
        "La validación canónica del entitlement es el CustomerInfo del SDK móvil " +
        "(entitlements.active['brainy Pro']), no este check.",
    );
    return;
  }
  // El endpoint GET /v1/subscribers/{app_user_id} admite autorización Bearer con
  // cualquiera de las dos variantes de API key del dashboard de RevenueCat:
  //  - Secret API key (acceso total), SOLO server-side.
  //  - Public API key (solo lectura del subscriber; suficiente para este check).
  // REVENUECAT_PUBLIC_KEY espera la PUBLIC key del proyecto. Nunca se imprime.
  const res = await fetch(
    `https://api.revenuecat.com/v1/subscribers/${userId}`,
    { headers: { Authorization: `Bearer ${RC_PUBLIC_KEY}` } },
  );
  if (res.status === 404) {
    throw new Error(
      "RevenueCat no tiene subscriber para este user_id — ¿se ejecutó Purchases.logIn(user.id)?",
    );
  }
  if (res.status > 299) throw new Error("RevenueCat API HTTP " + res.status);
  const data = await res.json();
  const original = data?.subscriber?.original_app_user_id;
  const ent = data?.subscriber?.entitlements?.[ENTITLEMENT_ID];
  const active = !!(
    ent &&
    (ent["is_active"] === true || ent.is_active === true || ent.active === true)
  );
  assert(original === userId, "RC subscriber identificado con user.id (Purchases.logIn ok)");
  assert(active, `entitlement ${ENTITLEMENT_ID} activo (redeemWebPurchase ok)`);
}

// ─── Tooling (sim / maestro) ─────────────────────────────────────────────────

async function detectPlatform() {
  if (argsMap.platform) {
    if (argsMap.platform === "android") {
      const { stdout } = await execFileAsync("adb", ["devices"]).catch(() => {
        fail("No se encontró 'adb' en el PATH (Android platform-tools).");
      });
      const m = stdout.match(/^(\S+)\s+device\b/m);
      if (!m) {
        fail(
          "No hay ningún dispositivo Android en estado 'device' (adb devices vacío o sin device). " +
            "Conecta un teléfono/emulador con debugging USB antes de ejecutar el FULL E2E. " +
            "Package esperado: " + APP_ANDROID_PACKAGE,
        );
      }
      androidSerial = m[1];
      return "android";
    }
    return argsMap.platform;
  }
  try {
    await execFileAsync("xcrun", ["simctl", "list", "devices", "booted"]);
    return "ios";
  } catch {}
  try {
    const { stdout } = await execFileAsync("adb", ["devices"]);
    const m = stdout.match(/^(\S+)\s+device\b/m);
    if (m) {
      androidSerial = m[1];
      return "android";
    }
  } catch {}
  fail(
    "No hay simulador/emulador disponible. Arranca el emulador Android y verifica " +
      "con 'adb devices' que aparece un dispositivo en estado 'device'. " +
      "O usa --platform=ios|android.",
  );
}

async function checkDevBuild(platform) {
  if (platform === "ios") {
    try {
      await execFileAsync("xcrun", [
        "simctl",
        "get_app_container",
        "booted",
        APP_BUNDLE_ID,
        "app",
      ]);
    } catch {
      fail(
        `El development build ${APP_BUNDLE_ID} NO está instalado en el simulador booted. ` +
          "Expo Go no vale: instala el dev build exportado (expo run:ios / eas build).",
      );
    }
  } else {
    const { stdout } = await execFileAsync("adb", [
      "shell",
      "pm",
      "list",
      "packages",
      APP_ANDROID_PACKAGE,
    ]);
    if (!stdout.includes(APP_ANDROID_PACKAGE)) {
      fail(
        `El development build ${APP_ANDROID_PACKAGE} NO está instalado en el emulador. Expo Go no vale.`,
      );
    }
  }
  safeLog("dev build instalado (platform=" + platform + ")");
}

// En Windows, Maestro se distribuye como maestro.bat: ejecutarlo requiere
// pasarlo por cmd.exe (Node no ejecuta .bat directamente con spawn/execFile).
function maestroInvocation(extraArgs = []) {
  if (process.platform === "win32") {
    return ["cmd.exe", ["/d", "/s", "/c", MAESTRO_BIN, ...extraArgs]];
  }
  return [MAESTRO_BIN, extraArgs];
}

async function checkMaestro() {
  try {
    const [file, args] = maestroInvocation(["--version"]);
    await execFileAsync(file, args);
  } catch {
    fail(
      "No se encontró 'maestro'. Instálalo: https://docs.maestro.dev (brew install maestro). " +
        "O exporta MAESTRO_BIN=/ruta/a/maestro.",
    );
  }
  safeLog("maestro disponible");
}

function buildOpenLink() {
  // La secuencia FULL exige transportar también el email del comprador
  // (brainy://claim?token=...&redeem_url=...&email=...) para persistir el
  // handoff y prellenar el login OTP.
  const emailParam = uiEmail
    ? `&email=${encodeURIComponent(uiEmail)}`
    : "";
  if (FULL && CLAIM_TOKEN) {
    return `brainy://claim?token=${encodeURIComponent(CLAIM_TOKEN)}&redeem_url=${encodeURIComponent(REDEMPTION_URL)}${emailParam}`;
  }
  if (FULL) return REDEMPTION_URL;
  return `brainy://claim?token=${encodeURIComponent(CLAIM_TOKEN)}${emailParam}`;
}

async function wakeAndroid() {
  for (const cmd of [
    ["shell", "input", "keyevent", "KEYCODE_WAKEUP"],
    ["shell", "svc", "power", "stayon", "true"],
    ["shell", "settings", "put", "system", "screen_off_timeout", "1800000"],
    ["shell", "wm", "dismiss-keyguard"],
  ]) {
    try {
      await execFileAsync("adb", cmd);
    } catch {}
  }
  await new Promise((r) => setTimeout(r, 500));
}

async function runMaestro(flowName, openLink) {
  if (platform === "android") await wakeAndroid();
  if (!existsSync(ARTIFACTS_DIR)) mkdirSync(ARTIFACTS_DIR, { recursive: true });
  const argsFlow = [
    "test",
    "--format",
    "junit",
    "--output",
    join(ARTIFACTS_DIR, flowName + ".xml"),
    join(FLOWS_DIR, flowName + ".yaml"),
  ];
  const childEnv = {
    ...env,
    BRAINY_E2E_OPEN_URL: openLink,
    BRAINY_TEST_EMAIL: process.env.BRAINY_TEST_EMAIL,
    BRAINY_TEST_PASSWORD: process.env.BRAINY_TEST_PASSWORD,
  };
  safeLog("ejecutando Maestro:", flowName);
  const [maestroFile, maestroArgs] = maestroInvocation(argsFlow);
  const child = spawn(maestroFile, maestroArgs, { env: childEnv, stdio: "inherit" });
  const code = await new Promise((res) => child.on("close", res));
  if (code !== 0) {
    throw new Error(
      `Maestro '${flowName}' falló (exit ${code}). Revisa e2e/.artifacts/${flowName}.xml`,
    );
  }
}

// ─── Cleanup ─────────────────────────────────────────────────────────────────

async function cleanup() {
  if (!userId) return;
  safeLog("limpieza de datos E2E...");
  const rt = await http(
    "GET",
    api(`/rest/v1/routines?user_id=eq.${userId}&select=id`),
    { key: SUPABASE_SERVICE_KEY },
  );
  const routineIds = (rt.data ?? []).map((x) => x.id);
  const targets = [
    `/rest/v1/user_eggs?user_id=eq.${userId}`,
    routineIds.length
      ? `/rest/v1/routine_tasks?routine_id=in.(${routineIds.map((id) => `"${id}"`).join(",")})`
      : null,
    `/rest/v1/routines?user_id=eq.${userId}`,
    `/rest/v1/user_state?user_id=eq.${userId}`,
    seededPlanId ? `/rest/v1/web_funnel_plans?id=eq.${seededPlanId}` : null,
  ].filter(Boolean);

  for (const path of targets) {
    const rr = await http("DELETE", api(path), { key: SUPABASE_SERVICE_KEY });
    if (rr.status >= 300) safeLog("warn: delete " + path + " -> HTTP " + rr.status);
  }

  if (createdUser) {
    const r = await http("DELETE", api("/auth/v1/admin/users/" + userId), {
      key: SUPABASE_SERVICE_KEY,
    });
    if (r.status < 300) safeLog("usuario temporal eliminado");
    else safeLog("warn: no se pudo eliminar usuario temporal (HTTP " + r.status + ")");
  } else {
    // Usuario provisto por el usuario: NO se toca. Solo se elimina el plan
    // sembrado por este script (el materializado queda, es del usuario).
    safeLog("usuario provisto NO eliminado (tu cuenta queda intacta)");
  }
  safeLog("limpieza completa");
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  platform = await detectPlatform();
  const openLink = buildOpenLink();
  const redactedLink =
    FULL && CLAIM_TOKEN
      ? "brainy://claim?token=***&redeem_url=***"
      : FULL
        ? "rc-*** ://…"
        : "brainy://claim?token=***";
  safeLog("modo:", FULL ? "full (redemption + claim)" : "claim-only");
  safeLog("link a abrir (redactado):", redactedLink);
  safeLog("platform:", platform);

  await checkDevBuild(platform);
  if (!MODE_MANUAL) await checkMaestro();

  // 1) Usuario de prueba
  await resolveTestUser();
  if (createdUser) {
    await seedLegacyActivity();
  }
  await ensureClaimablePlan();

  // 3) I1 — conteos esperados desde el plan (NO hardcodeados).
  const alreadyClaimedAtStart = await planHasStatus(["claimed", "claiming"]);
  const baseline = await dbCounts();
  const expected = await deriveExpectedCounts(activePlan ?? {});
  // Si el plan ya estaba claimed/claiming de una corrida previa, el delta de
  // esta corrida es 0 (replay idempotente); en el caso fresco el delta son los
  // conteos recién derivados del payload real/fixture.
  const expDelta = alreadyClaimedAtStart
    ? { activities: 0, routines: 0, tasks: 0, eggs: 0 }
    : expected;
  safeLog("conteos base:", JSON.stringify(baseline));
  safeLog("conteos esperados (derivados del plan):", JSON.stringify(expected), "| ya reclamado:", String(alreadyClaimedAtStart));

  if (MODE_MANUAL) {
    // Modo manual: el OPERADOR es quien ejecuta la UI, así que aquí sí se le
    // muestran el link y (si es usuario temporal) las credenciales efímeras de
    // esta corrida. NUNCA se escriben en archivos/artifacts ni se loguean en
    // modo automático (safeLog / SECRETS los bloquearían).
    const urlQuoted =
      platform === "android"
        ? `adb -s ${androidSerial || "<serial>"} shell am start -W -a android.intent.action.VIEW -d "${openLink}" ${APP_ANDROID_PACKAGE}`
        : "xcrun simctl openurl booted " + openLink;
    console.log("\n[MODO MANUAL] Prepara tu terminal; estos valores son SOLO de esta corrida:\n");
    console.log("  Deep link a abrir (1ª vez y 2ª vez, el MISMO):\n    " + openLink + "\n");
    if (createdUser) {
      console.log("  Credenciales temporales del usuario de prueba:");
      console.log("    email:    " + uiEmail);
      console.log("    password: " + uiPassword + "\n");
    }
    console.log("  Cómo abrirlo:\n    " + urlQuoted + "\n");
    console.log(
      "Pasos:\n" +
        "  (1) Abre el deep link (el app arranca y pide login).\n" +
        "  (2) Si pide login, usa las credenciales temporales de arriba (modal 'Iniciar sesión').\n" +
        "  (3) Espera la pantalla 'Tu plan está aquí 🎉' (wizard → plan-ready).\n" +
        "  (4) Vuelve a abrir la MISMA URL (mismo token) y espera a ver plan-ready.\n" +
        "  (5) No dupliques pasos; NO toques nada más.\n",
    );
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    await new Promise((res) => rl.question("Pulsa ENTER cuando hayas completado la 2ª apertura...", () => { res(); }));
    rl.close();
  } else {
    // First run: open link (optional login), wizard, plan-ready
    await runMaestro("01-handoff-open", openLink);
  }

  // 2) Verificación tras la 1ª apertura
  const s1 = await dbCounts();
  safeLog("post-1ª apertura:", JSON.stringify(s1));
  assert(
    s1.activities === baseline.activities + expDelta.activities,
    expDelta.activities + " actividades del funnel añadidas (act=" + s1.activities + ")",
  );
  assert(
    s1.routines === baseline.routines + expDelta.routines,
    expDelta.routines + " rutinas materializadas",
  );
  assert(
    s1.tasks === baseline.tasks + expDelta.tasks,
    expDelta.tasks + " pasos de rutina (vacío omitido, key 'steps')",
  );
  assert(
    s1.eggs === baseline.eggs + expDelta.eggs,
    expDelta.eggs + " huevo(s) materializado(s) y asignado(s)",
  );
  await assertPlanClaimed();
  await rcProCheck();

  // 3) Reapertura del MISMO link (idempotencia: mismo token, miscount = dup)
  if (!MODE_MANUAL) {
    await runMaestro("02-handoff-reopen", openLink);
  }
  const s2 = await dbCounts();
  safeLog("post-reapertura:", JSON.stringify(s2));
  assert(JSON.stringify(s2) === JSON.stringify(s1), "reapertura NO duplica datos (conteos idénticos)");
  await assertPlanClaimed();
  await rcProCheck();

  console.log(
    "\n=== E2E HANDOFF " + (FULL ? "FULL" : "CLAIM-ONLY") + " PASSED (sin declarar compra sandbox real) ===",
  );
}

try {
  await main();
} catch (e) {
  console.error("\n[handoff-e2e] FAILED:", e.message);
  process.exitCode = 1;
} finally {
  try {
    await cleanup();
  } catch {
    // limpia lo que pueda; no enmascara el resultado
  }
  if (process.exitCode === 1) process.exit(1);
}