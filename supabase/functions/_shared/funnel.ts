// Shared funnel-plan utilities for Edge Functions.
//
// Used by BOTH claim-funnel-plan (legacy token path) and restore-funnel-plan
// (new email look-up path) so the materialization payload builders and the
// replay-summary reader live in exactly ONE place.
//
// The actual ATOMIC materialization stays in the PostgreSQL RPC
// `public.claim_funnel_plan` (row lock + status state machine + __materialized
// marker) — it is invoked by both Edge Functions, unchanged.
//
// Note: these builders mirror the exact shapes produced by the funnel web in
// `web_funnel_plans.plan` and consumed by the app. Do not change them without
// re-running the funnel E2E (scripts/e2e-handoff.mjs).

const DAY_ABBR = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

// The funnel web sends `days: ["daily"]` for routines that apply every day.
// Previously that matched nothing and was silently dropped, producing rows with
// `days = '{}'` that the app filters out on every weekday (app/(tabs)/two.tsx
// filters by `routine.days.includes(currentDayAbbrev)`).
const EVERY_DAY_ALIASES = new Set([
  "daily",
  "everyday",
  "every day",
  "every_day",
  "todoslosdias",
  "todos los dias",
  "todos los días",
  "all",
  "any",
  "*",
]);

// English abbreviations, normalised into the Spanish ones stored in the DB.
const DAY_ALIASES: Record<string, string> = {
  sun: "Dom",
  sunday: "Dom",
  mon: "Lun",
  monday: "Lun",
  tue: "Mar",
  tues: "Mar",
  tuesday: "Mar",
  wed: "Mié",
  weds: "Mié",
  wednesday: "Mié",
  thu: "Jue",
  thur: "Jue",
  thurs: "Jue",
  thursday: "Jue",
  fri: "Vie",
  friday: "Vie",
  sat: "Sáb",
  saturday: "Sáb",
};

export function normalizeDays(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];

  // A single "daily" marker means all seven days.
  const wantsEveryDay = raw.some(
    (d) =>
      typeof d === "string" &&
      EVERY_DAY_ALIASES.has(d.trim().toLowerCase().replace(/\s+/g, " ")),
  );
  if (wantsEveryDay) return [...DAY_ABBR];

  const out: string[] = [];
  const push = (abbr: string) => {
    if (!out.includes(abbr)) out.push(abbr);
  };

  for (const d of raw) {
    if (typeof d === "number" && Number.isFinite(d)) {
      push(DAY_ABBR[d % 7] ?? DAY_ABBR[0]);
    } else if (typeof d === "string") {
      const trimmed = d.trim();
      if (!trimmed) continue;
      if (DAY_ABBR.includes(trimmed)) {
        push(trimmed);
        continue;
      }
      const lower = trimmed.toLowerCase();
      const alias = DAY_ALIASES[lower] ?? DAY_ALIASES[lower.slice(0, 3)];
      if (alias) {
        push(alias);
        continue;
      }
      const n = Number(trimmed);
      if (Number.isFinite(n)) {
        push(DAY_ABBR[n % 7] ?? DAY_ABBR[0]);
      }
    }
  }
  return out;
}

export function asArray(value: unknown): Record<string, any>[] {
  if (!Array.isArray(value)) return [];
  return value as Record<string, any>[];
}

export function toInt(value: unknown, fallback: number): number {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? Math.round(n) : fallback;
}

export function buildActivities(plan: Record<string, any>, claimId: string): any[] {
  const tasks = asArray(plan.tasks ?? plan.activities);
  const shortId = String(claimId).replace(/-/g, "").slice(0, 8);

  return tasks.map((task, index) => {
    const subtasks = asArray(task.subtasks).map((s, i) => {
      const title = String(s.title ?? s.name ?? "").trim();
      return {
        id: `fs_${shortId}_${index}_${i}`,
        title: title || `Paso ${i + 1}`,
        duration: toInt(s.duration ?? s.minutes, 5),
        isCompleted: false,
      };
    });

    const totalMin = subtasks.reduce((sum, s) => sum + s.duration, 0);
    const title = String(task.title ?? "").trim();

    return {
      id: `funnel_${shortId}_task_${index}`,
      title: title || "Tarea",
      emoji: String(task.emoji ?? "✨"),
      metric: task.metric ?? (subtasks.length > 0 ? `${totalMin} min` : ""),
      color: task.color ?? "#A6E3A1",
      iconColor: task.iconColor ?? "#CBA6F7",
      action: "play",
      completed: false,
      subtasks,
      difficulty: ["easy", "moderate", "hard"].includes(task.difficulty)
        ? task.difficulty
        : "easy",
      recurrence: task.recurrence ?? { type: "once" },
      reminder: task.reminder ?? { enabled: false, minutesBefore: 15 },
      completedDates: [],
      ...(task.scheduledDate ? { scheduledDate: String(task.scheduledDate) } : {}),
    };
  });
}

export function buildRoutines(plan: Record<string, any>): any[] {
  const routines = asArray(plan.routines);
  return routines.map((routine) => {
    const steps = asArray(routine.steps).map((s) => ({
      title: String(s.title ?? "").trim(),
      duration: toInt(s.duration, 5),
    }));

    const eggObj = (routine.egg ?? {}) as Record<string, any>;
    const eggValue = eggObj.catalogId ?? routine.egg_catalog_id ?? routine.eggId;
    const eggId = Number(eggValue);

    return {
      name: String(routine.name ?? "").trim(),
      icon: String(routine.icon ?? "Circle"),
      days: normalizeDays(routine.days),
      steps,
      egg: {
        catalogId: Number.isFinite(eggId) && eggId > 0 ? eggId : null,
      },
    };
  });
}

/**
 * Rebuilds the claim summary from the __materialized marker for a plan that
 * was already claimed by the same user (idempotent replay).
 */
export async function buildReplaySummary(
  client: any,
  userId: string,
  marker: Record<string, any> | null,
) {
  const routineIds: string[] = Array.isArray(marker?.routine_ids)
    ? marker.routine_ids.map((x: any) => String(x))
    : [];

  if (routineIds.length === 0) {
    return {
      taskCount: Number(marker?.task_count ?? 0) || 0,
      routineCount: Number(marker?.routine_count ?? 0) || 0,
      eggCount: Number(marker?.egg_count ?? 0) || 0,
      routines: [],
    };
  }

  const [{ data: routines }, { data: stepCounts }, { data: eggs }] =
    await Promise.all([
      client
        .from("routines")
        .select("id, name, icon")
        .in("id", routineIds),
      client
        .from("routine_tasks")
        .select("routine_id")
        .in("routine_id", routineIds),
      client.from("user_eggs").select("egg_id, routine_id").eq("user_id", userId),
    ]);

  const counts = new Map<string, number>();
  for (const t of stepCounts ?? []) {
    counts.set(t.routine_id, (counts.get(t.routine_id) ?? 0) + 1);
  }

  const eggByRoutine = new Map<string, number>();
  for (const e of eggs ?? []) {
    if (e.routine_id) eggByRoutine.set(e.routine_id, e.egg_id);
  }

  const summaryRoutines = (routines ?? []).map((r: any) => ({
    id: r.id,
    name: r.name,
    icon: r.icon ?? "Circle",
    steps: counts.get(r.id) ?? 0,
    eggCatalogId: eggByRoutine.get(r.id) ?? null,
  }));

  return {
    taskCount: Number(marker?.task_count ?? 0) || 0,
    routineCount: summaryRoutines.length,
    // Only companions actually linked to THIS plan's routines count.
    eggCount: (eggs ?? []).filter(
      (e: any) => e.routine_id && routineIds.includes(e.routine_id),
    ).length,
    routines: summaryRoutines,
  };
}