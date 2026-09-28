#!/usr/bin/env node
/**
 * Brainy — E2E backend de la RESOLUCIÓN DE HUEVOS en claim_funnel_plan.
 *
 * Verifica la regla aprobada (20260918_funnel_plan_egg_reuse.sql):
 *   Guarantee: tras un claim válido, TODA rutina funnel que pidió un huevo
 *   termina con EXACTAMENTE un compañero.
 *   1a) no poseído -> create + link    1b) poseído libre -> reuse
 *   1c) poseído asignado -> fallback   2) fallback determinista
 *   3) sin candidato -> error recuperable + plan 'claiming'
 *   Replay -> mismas asociaciones, cero duplicados.
 *
 * POLÍTICA DE SECRETOS: solo variables de entorno; jamás se loguea un
 * claim token, JWT, email o API key. El token de test es efímero y solo
 * se usa para sembrar el plan (nunca se imprime).
 *
 * ENV requeridas:
 *   SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_KEY
 *
 * Uso:
 *   npm run test:e2e:funnel-eggs   (o: node scripts/e2e-funnel-eggs.mjs)
 */
"use strict";

import { createHash } from "node:crypto";

const env = process.env;
const SUPABASE_URL = (env.SUPABASE_URL || "").trim().replace(/\/+$/, "");
const SUPABASE_ANON_KEY = env.SUPABASE_ANON_KEY || "";
const SUPABASE_SERVICE_KEY = env.SUPABASE_SERVICE_KEY || "";

function fail(msg) {
  console.error("\n[funnel-eggs] ERROR:", msg);
  process.exit(1);
}

if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_KEY) {
  fail("Faltan SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_KEY.");
}
if (!/^https:\/\/[^/\s]+$/.test(SUPABASE_URL)) {
  fail("SUPABASE_URL no parece una instancia de Supabase.");
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

let passed = 0;
function assert(cond, msg) {
  if (!cond) throw new Error("ASSERT failed: " + msg);
  passed += 1;
  console.log("ok -", msg);
}

async function rpcClaim(token, userId, jwt, routines, activities = []) {
  const r = await http("POST", api("/rest/v1/rpc/claim_funnel_plan"), {
    key: SUPABASE_ANON_KEY,
    headers: { Authorization: "Bearer " + jwt },
    body: {
      p_claim_token_hash: sha256(token),
      p_user_id: userId,
      p_activities: activities,
      p_routines: routines,
    },
  });
  return { status: r.status, data: Array.isArray(r.data) ? r.data[0] : r.data };
}

// ─── Fixtures / setup ────────────────────────────────────────────────────────

async function makeUser(tag) {
  const suffix = `${Date.now()}_${Math.floor(Math.random() * 100000)}`;
  const email = `eggtest_${tag}_${suffix}@e2e.invalid`;
  const password = "EggT3st!" + suffix;
  const r = await http("POST", api("/auth/v1/admin/users"), {
    key: SUPABASE_SERVICE_KEY,
    body: { email, password, email_confirm: true },
  });
  if (r.status !== 201 && r.status !== 200) {
    fail(`crear usuario falló (${tag}): HTTP ${r.status}`);
  }
  const userId = r.data.id;
  const sign = await http("POST", api("/auth/v1/token?grant_type=password"), {
    key: SUPABASE_ANON_KEY,
    body: { email, password },
  });
  if (sign.status !== 200) fail(`JWT falló (${tag}): HTTP ${sign.status}`);
  return { userId, jwt: sign.data.access_token, email };
}

async function seedPlan(userId, token, routines) {
  const r = await http("POST", api("/rest/v1/web_funnel_plans"), {
    key: SUPABASE_SERVICE_KEY,
    body: {
      status: "pending",
      claim_token_hash: sha256(token),
      plan: { tasks: [], routines, funnel: { source: "e2e-funnel-eggs" } },
      email: "plan@seed.local",
    },
  });
  if (r.status >= 300) fail("sembrar plan falló: HTTP " + r.status);
  return (Array.isArray(r.data) ? r.data[0] : r.data)?.id ?? null;
}

async function seedRoutine(userId, name = "Rutina Existente") {
  const r = await http("POST", api("/rest/v1/routines"), {
    key: SUPABASE_SERVICE_KEY,
    body: { user_id: userId, name, days: ["Lun"], icon: "Circle" },
  });
  if (r.status >= 300) fail("sembrar rutina falló: HTTP " + r.status);
  return (Array.isArray(r.data) ? r.data[0] : r.data)?.id ?? null;
}

async function seedEggs(userId, eggs) {
  // eggs: [{ egg_id, routine_id|null, xp, pet_level, ... }]
  const out = [];
  for (const e of eggs) {
    const r = await http("POST", api("/rest/v1/user_eggs"), {
      key: SUPABASE_SERVICE_KEY,
      body: {
        user_id: userId,
        egg_id: e.egg_id,
        routine_id: e.routine_id ?? null,
        unlocked: e.unlocked ?? true,
        xp: e.xp ?? 0,
        evolved: e.evolved ?? false,
        pet_xp: e.pet_xp ?? 0,
        pet_level: e.pet_level ?? 0,
        ...(e.nickname ? { nickname: e.nickname } : {}),
      },
    });
    if (r.status >= 300) fail("sembrar huevo falló: HTTP " + r.status);
    out.push((Array.isArray(r.data) ? r.data[0] : r.data)?.id ?? null);
  }
  return out;
}

async function planRow(token) {
  const r = await http(
    "GET",
    api(`/rest/v1/web_funnel_plans?claim_token_hash=eq.${sha256(token)}&select=status,claimed_by_user_id,plan`),
    { key: SUPABASE_SERVICE_KEY },
  );
  return (r.data ?? [])[0] ?? null;
}

async function routinesOf(userId) {
  const r = await http("GET", api(`/rest/v1/routines?user_id=eq.${userId}&select=id,name`), {
    key: SUPABASE_SERVICE_KEY,
  });
  return r.data ?? [];
}

async function eggsOf(userId) {
  const r = await http(
    "GET",
    api(`/rest/v1/user_eggs?user_id=eq.${userId}&select=egg_id,routine_id,xp,pet_level`),
    { key: SUPABASE_SERVICE_KEY },
  );
  return r.data ?? [];
}

async function activeCatalogIds() {
  const r = await http("GET", api("/rest/v1/egg_catalog?active=eq.true&select=id"), {
    key: SUPABASE_SERVICE_KEY,
  });
  return (r.data ?? []).map((x) => x.id).sort((a, b) => a - b);
}

const R1 = (egg) => ({
  name: "Rutina Alfa",
  icon: "Sun",
  days: [1, 3, 5],
  steps: [{ title: "Vaso de agua", duration: 2 }],
  egg: { catalogId: egg },
});

const R5 = [4, 5, 6, 7, 8].map((egg, i) => ({
  name: `Rutina ${i + 1}`,
  icon: i % 2 ? "Moon" : "Sun",
  days: [i],
  steps: [{ title: `Paso ${i + 1}`, duration: 2 }],
  egg: { catalogId: egg },
}));

// ─── Limpieza ────────────────────────────────────────────────────────────────

async function cleanupUser(userId, token) {
  const plan = token ? await planRow(token) : null;
  if (plan) {
    await http("DELETE", api(`/rest/v1/web_funnel_plans?claim_token_hash=eq.${sha256(token)}`), {
      key: SUPABASE_SERVICE_KEY,
    });
  }
  await http("DELETE", api("/auth/v1/admin/users/" + userId), { key: SUPABASE_SERVICE_KEY });
}

// ─── Casos de prueba ─────────────────────────────────────────────────────────

async function t1_newUserOneRoutine() {
  console.log("\n── T1: usuario nuevo + 1 rutina (huevo nuevo) ──");
  const token = "t1-" + Date.now() + Math.random();
  const { userId, jwt } = await makeUser("t1");
  try {
    const planId = await seedPlan(userId, token, [R1(4)]);
    assert(!!planId, "plan pending sembrado");
    const res = await rpcClaim(token, userId, jwt, [R1(4)]);
    assert(res.status === 200 && res.data?.success === true, "claim OK");
    assert(res.data.taskCount === 0 && res.data.routineCount === 1, "1 rutina materializada");
    assert(res.data.eggCount === 1, "eggCount=1 (asociación real)");
    const out = res.data.routines?.[0];
    assert(out?.eggCatalogId === 4, "eggCatalogId = huevo solicitado (4)");
    const eggs = await eggsOf(userId);
    assert(eggs.length === 1 && eggs[0].egg_id === 4 && eggs[0].routine_id === out.id, "1 user_egg linkeado a la rutina");
    const p = await planRow(token);
    assert(p?.status === "claimed" && p.claimed_by_user_id === userId, "plan claimed + owner");
    console.log("T1 PASSED");
  } finally {
    await cleanupUser(userId, token);
  }
}

async function t2_newUserFiveRoutines() {
  console.log("\n── T2: usuario nuevo + 5 rutinas ──");
  const token = "t2-" + Date.now() + Math.random();
  const { userId, jwt } = await makeUser("t2");
  try {
    await seedPlan(userId, token, R5);
    const res = await rpcClaim(token, userId, jwt, R5);
    assert(res.data?.success === true && res.data.routineCount === 5, "5 rutinas");
    assert(res.data.eggCount === 5, "eggCount=5");
    const eggIds = res.data.routines?.map((r) => r.eggCatalogId);
    assert(JSON.stringify([...eggIds].sort((a, b) => a - b)) === JSON.stringify([4, 5, 6, 7, 8]),
      "cada rutina conserva el huevo que vio en la web (4-8)");
    const eggs = await eggsOf(userId);
    assert(eggs.length === 5, "5 user_eggs asociados");
    const linked = eggs.filter((e) => e.routine_id);
    assert(linked.length === 5, "5 user_eggs con routine linkeada");
    const ids = linked.map((e) => e.routine_id);
    assert(new Set(ids).size === 5, "1 compañero por rutina (sin compartir)");
    console.log("T2 PASSED");
  } finally {
    await cleanupUser(userId, token);
  }
}

async function t3_ownedAllFree() {
  console.log("\n── T3: huevos ya existentes pero libres (reuse conserva XP) ──");
  const token = "t3-" + Date.now() + Math.random();
  const { userId, jwt } = await makeUser("t3");
  try {
    await seedEggs(userId, [
      { egg_id: 4, routine_id: null, xp: 2, pet_level: 3, pet_xp: 10, evolved: true },
      { egg_id: 5, routine_id: null, xp: 0 },
      { egg_id: 6, routine_id: null, xp: 1 },
    ]);
    await seedPlan(userId, token, [R1(4)]);
    const res = await rpcClaim(token, userId, jwt, [R1(4)]);
    assert(res.data?.success === true && res.data.routineCount === 1, "1 rutina materializada");
    // Reuse: NO nueva fila, misma fila re-enlazada, XP/progreso intactos.
    const eggs = await eggsOf(userId);
    assert(eggs.length === 3, "reuse: sigue habiendo 3 filas (sin duplicado)");
    const e4 = eggs.find((e) => e.egg_id === 4);
    assert(!!e4?.routine_id, "egg 4 re-enlazado a la rutina nueva");
    assert(e4.xp === 2 && e4.pet_level === 3, "XP (2) y pet_level (3) conservados");
    const eggIds = eggs.filter((e) => e.routine_id).map((e) => e.egg_id);
    assert(JSON.stringify(eggIds.sort((a, b) => a - b)) === JSON.stringify([4]), "solo egg 4 asignado");
    assert(res.data.routines?.[0]?.eggCatalogId === 4, "eggCatalogId = 4");
    assert(res.data.eggCount === 1, "eggCount=1 (asociación real, contada)");
    console.log("T3 PASSED");
  } finally {
    await cleanupUser(userId, token);
  }
}

async function t4a_occupiedFallbackOwnedFree() {
  console.log("\n── T4a: huevo objetivo ocupado + huevo propio libre -> fallback a free ──");
  const token = "t4a-" + Date.now() + Math.random();
  const { userId, jwt } = await makeUser("t4a");
  try {
    const holderId = await seedRoutine(userId, "Rutina QueYaExiste");
    await seedEggs(userId, [
      { egg_id: 4, routine_id: holderId, xp: 1 }, // ocupado: NO se mueve
      { egg_id: 5, routine_id: null },            // libre: candidato fallback
    ]);
    await seedPlan(userId, token, [R1(4)]); // pide huevo 4 (ocupado)
    const res = await rpcClaim(token, userId, jwt, [R1(4)]);
    assert(res.data?.success === true && res.data.routineCount === 1, "1 rutina materializada");
    const eggs = await eggsOf(userId);
    const e4 = eggs.find((e) => e.egg_id === 4);
    const e5 = eggs.find((e) => e.egg_id === 5);
    assert(e4?.routine_id === holderId, "egg 4 NO se movió de su rutina existente");
    assert(e5?.routine_id && e5.routine_id !== holderId, "fallback: egg 5 libre asignado a la rutina nueva");
    assert(res.data.routines?.[0]?.eggCatalogId === 5, "eggCatalogId = 5 (fallback real)");
    assert(res.data.eggCount === 1, "eggCount=1");
    const holder = await routinesOf(userId);
    assert(holder.length === 2, "rutina holder + 1 nueva creada");
    console.log("T4a PASSED");
  } finally {
    await cleanupUser(userId, token);
  }
}

async function t4b_occupiedFallbackUnowned() {
  console.log("\n── T4b: huevo objetivo ocupado y sin huevos propios libres -> catálogo no poseído ──");
  const token = "t4b-" + Date.now() + Math.random();
  const { userId, jwt } = await makeUser("t4b");
  try {
    const holderId = await seedRoutine(userId, "Rutina QueYaExiste");
    await seedEggs(userId, [{ egg_id: 4, routine_id: holderId, xp: 1 }]); // único propio, ocupado
    await seedPlan(userId, token, [R1(4)]); // pide huevo 4 (ocupado)
    const res = await rpcClaim(token, userId, jwt, [R1(4)]);
    assert(res.data?.success === true && res.data.routineCount === 1, "1 rutina materializada");
    const eggs = await eggsOf(userId);
    const e4 = eggs.find((e) => e.egg_id === 4);
    const others = eggs.filter((e) => e.egg_id !== 4);
    assert(e4?.routine_id === holderId, "egg 4 NO se movió");
    assert(others.length === 1, "1 huevo del catálogo desbloqueado");
    const candidate = others[0];
    assert(!!candidate.routine_id && candidate.routine_id !== holderId, "fallback asignado a la rutina nueva");
    assert(res.data.routines?.[0]?.eggCatalogId === candidate.egg_id, "eggCatalogId = huevo real asignado");
    assert(res.data.eggCount === 1, "eggCount=1");
    console.log("T4b PASSED");
  } finally {
    await cleanupUser(userId, token);
  }
}

async function t5_noCandidateError() {
  console.log("\n── T5: sin candidato -> error recuperable, plan sigue 'claiming' ──");
  const token = "t5-" + Date.now() + Math.random();
  const { userId, jwt } = await makeUser("t5");
  try {
    // Posee TODOS los huevos activos y TODOS asignados -> ni libres ni no poseídos.
    const holderId = await seedRoutine(userId, "Rutina QueYaExiste");
    const catalog = await activeCatalogIds();
    await seedEggs(userId, catalog.map((egg_id) => ({ egg_id, routine_id: holderId })));
    await seedPlan(userId, token, [R1(4)]);
    const res = await rpcClaim(token, userId, jwt, [R1(4)]);
    assert(res.data?.success === false, "claim falla");
    assert(res.data?.error === "egg_unavailable", "error = egg_unavailable");
    const p = await planRow(token);
    assert(p?.status === "claiming", "plan sigue en 'claiming' (retry posible)");
    assert(p.claimed_by_user_id === userId, "claiming + owner del mismo usuario");
    const routines = await routinesOf(userId);
    assert(routines.length === 1, "rollback: NO se dejaron rutinas parciales (solo la holder)");
    const eggs = await eggsOf(userId);
    assert(eggs.length === catalog.length, "rollback: NO se duplicó/sustituyó ningún huevo");
    console.log("T5 PASSED");
  } finally {
    await cleanupUser(userId, token);
  }
}

async function t6_replaySameAssociations() {
  console.log("\n── T6: replay -> mismas asociaciones, cero duplicados ──");
  const token = "t6-" + Date.now() + Math.random();
  const { userId, jwt } = await makeUser("t6");
  try {
    await seedPlan(userId, token, [R1(4)]); // 1 rutina + huevo 4
    const first = await rpcClaim(token, userId, jwt, [R1(4)]);
    assert(first.data?.success === true && first.data.routineCount === 1, "primer claim OK");
    const beforeR = await routinesOf(userId);
    const beforeE = await eggsOf(userId);

    const replay = await rpcClaim(token, userId, jwt, [R1(4)]);
    assert(replay.data?.success === true, "replay responde success=true");
    assert(replay.data?.alreadyClaimed === true, "replay marcado alreadyClaimed (no re-materializa)");

    const afterR = await routinesOf(userId);
    const afterE = await eggsOf(userId);
    assert(afterR.length === beforeR.length, "replay: mismas rutinas (cero nuevas)");
    const key = (arr) => JSON.stringify(arr.map((x) => ({ ...x })).sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b))));
    assert(key(afterE) === key(beforeE), "replay: mismos user_eggs (misma asignación, cero duplicados)");
    assert(afterE.length === 1 && afterE[0].egg_id === 4, "sigue habiendo exactamente 1 huevo (4) linkeado");
    const p = await planRow(token);
    assert(p?.status === "claimed", "plan sigue 'claimed'");
    console.log("T6 PASSED");
  } finally {
    await cleanupUser(userId, token);
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  if (process.argv.includes("--help") || process.argv.includes("-h")) {
    console.log("Ejecuta los 6 casos de resolución de huevos (backend, sin UI).");
    return;
  }
  await t1_newUserOneRoutine();
  await t2_newUserFiveRoutines();
  await t3_ownedAllFree();
  await t4a_occupiedFallbackOwnedFree();
  await t4b_occupiedFallbackUnowned();
  await t5_noCandidateError();
  await t6_replaySameAssociations();
  console.log(`\n=== E2E FUNNEL-EGGS PASSED (${passed} asserts) ===`);
}

try {
  await main();
} catch (e) {
  console.error("\n[funnel-eggs] FAILED:", e.message);
  process.exitCode = 1;
}