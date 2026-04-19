import AsyncStorage from "@react-native-async-storage/async-storage";
import React from "react";
import type { WidgetTaskHandlerProps } from "react-native-android-widget";
import type { Routine } from "../types/routine";
import { RoutinesWidget, type BgMode } from "./RoutinesWidget";

// ── AsyncStorage keys ────────────────────────────────────────────────────────
export const WIDGET_DATA_KEY = "@widget_routines";
export const WIDGET_INDEX_KEY = "@widget_current_routine_index";
export const WIDGET_TASK_IDX_KEY = "@widget_task_visible_index";
export const WIDGET_USER_KEY = "@widget_user_id";
/** @deprecated Use WIDGET_OUTFIT_ID_KEY instead */
export const WIDGET_OUTFIT_URI_KEY = "@widget_outfit_uri";
export const WIDGET_OUTFIT_ID_KEY = "@widget_outfit_id";
export const WIDGET_BG_MODE_KEY = "@widget_bg_mode";
export const WIDGET_BG_ID_KEY = "@widget_bg_id";
export const WIDGET_PENDING_KEY = "@widget_pending_toggles";
export const WIDGET_PRO_KEY = "@widget_is_pro";

const BG_CYCLE: BgMode[] = ["user", "solid", "surface"];

// ── Helpers ───────────────────────────────────────────────────────────────────
async function readRoutines(): Promise<Routine[]> {
  try {
    const raw = await AsyncStorage.getItem(WIDGET_DATA_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

async function readNumber(key: string, fallback = 0): Promise<number> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return fallback;
    const n = parseInt(raw, 10);
    return isNaN(n) ? fallback : n;
  } catch {
    return fallback;
  }
}

async function readString(key: string): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(key);
  } catch {
    return null;
  }
}

function clamp(n: number, max: number): number {
  if (max <= 0) return 0;
  return Math.min(Math.max(0, n), max);
}

async function readEarnedCoins(
  routineId: string | null,
): Promise<number | null> {
  if (!routineId) return null;
  const rawCoins = await readString(`@widget_earned_coronas_${routineId}`);
  if (!rawCoins) return null;
  const coins = parseInt(rawCoins, 10);
  return isNaN(coins) ? null : coins;
}

// ── Background sync for TOGGLE_TASK ──────────────────────────────────────────
async function syncToggleInBackground(
  taskId: string,
  routineId: string,
  updatedRoutines: Routine[],
  previousRoutines: Routine[],
  renderWidget: (el: React.JSX.Element) => void,
  routineIdx: number,
  taskIdx: number,
  outfitId: string | null,
  bgMode: BgMode,
  bgId: string | null,
  isPro: boolean,
): Promise<void> {
  const userId = await readString(WIDGET_USER_KEY);
  if (!userId) return;

  const r = updatedRoutines.find((x) => x.id === routineId);
  const t = r?.tasks.find((x) => x.id === taskId);
  if (t === undefined) return;

  // 1. Queue in AsyncStorage (offline-first fallback)
  try {
    const pendingRaw = await AsyncStorage.getItem(WIDGET_PENDING_KEY);
    const pendingList = pendingRaw ? JSON.parse(pendingRaw) : [];
    const filteredList = pendingList.filter((p: any) => p.taskId !== taskId);
    filteredList.push({
      taskId,
      routineId,
      completed: t.completed,
      timestamp: Date.now(),
    });
    await AsyncStorage.setItem(
      WIDGET_PENDING_KEY,
      JSON.stringify(filteredList),
    );
  } catch (e) {
    console.warn("Widget: could not queue task toggle", e);
  }

  // 2. Sync immediately with Supabase
  try {
    const { supabase } = await import("../lib/supabase");
    await supabase.auth.getSession();
    const { updateTaskCompletion } = await import("../lib/routineService");
    await updateTaskCompletion(taskId, routineId, userId, t.completed ?? false);
  } catch (e) {
    console.warn("Widget: could not sync task with Supabase", e);
  }

  // 3. Routine completion & crowns logic
  try {
    const allTasksCompleteAfter =
      r?.tasks.every((task) => task.completed) ?? false;
    const wasCompleteBefore =
      previousRoutines
        .find((x) => x.id === routineId)
        ?.tasks.every((x) => x.completed) ?? false;

    if (allTasksCompleteAfter && !wasCompleteBefore) {
      const { useAchievementsStore } =
        await import("../store/achievementsStore");
      const result = await useAchievementsStore
        .getState()
        .awardRoutineCompletionCoins(routineId);
      // Always persist earned coins so the widget can display them
      if (result.earned > 0) {
        await AsyncStorage.setItem(
          `@widget_earned_coronas_${routineId}`,
          result.earned.toString(),
        );
      }

      const { supabase } = await import("../lib/supabase");
      await supabase.auth.getSession();
      const { markRoutineComplete } = await import("../lib/routineService");
      await markRoutineComplete(routineId, userId);

      const { useRoutineStreakStore } =
        await import("../store/routineStreakStore");
      await useRoutineStreakStore.getState().recordRoutineCompletion(routineId);
      useAchievementsStore.getState().onRoutineCompleted();

      // PostHog: track routine completion from widget
      try {
        const { posthog } = await import("../config/posthog");
        posthog.capture("routine_completed", {
          routine_id: routineId,
          task_count: r?.tasks.length ?? 0,
          time_of_day: new Date().getHours(),
          day_of_week: new Date().toLocaleDateString("en-US", {
            weekday: "long",
          }),
          source: "widget",
        });
      } catch (e) {
        console.warn("Widget: could not capture routine_completed", e);
      }

      // Re-render once coins are known
      const freshRoutine =
        updatedRoutines.length > 0 ? updatedRoutines[routineIdx] : null;
      const freshTaskCount = freshRoutine?.tasks.length ?? 0;
      const freshTaskIdx = clamp(taskIdx, freshTaskCount - 1);
      const earnedCoins = await readEarnedCoins(freshRoutine?.id ?? null);
      renderWidget(
        <RoutinesWidget
          currentRoutine={freshRoutine}
          currentIndex={routineIdx}
          totalRoutines={updatedRoutines.length}
          taskVisibleIndex={freshTaskIdx}
          outfitId={outfitId}
          bgMode={bgMode}
          bgId={bgId}
          earnedCoins={earnedCoins}
          isPro={isPro}
        />,
      );
    } else if (!allTasksCompleteAfter && wasCompleteBefore) {
      await AsyncStorage.removeItem(`@widget_earned_coronas_${routineId}`);

      const { supabase } = await import("../lib/supabase");
      await supabase.auth.getSession();
      const { unmarkRoutineComplete } = await import("../lib/routineService");
      await unmarkRoutineComplete(routineId, userId);

      const { useRoutineStreakStore } =
        await import("../store/routineStreakStore");
      await useRoutineStreakStore.getState().unmarkRoutineCompletion(routineId);
    }
  } catch (e) {
    console.warn("Widget: error computing routine completion", e);
  }
}

// ── renderRoutinesWidget ─────────────────────────────────────────────────────
/**
 * Builds the RoutinesWidget JSX from the current AsyncStorage state.
 * Used both by widgetTaskHandler (click events) and requestWidgetUpdate (proactive refresh).
 */
export async function renderRoutinesWidget(): Promise<React.JSX.Element> {
  const routines = await readRoutines();
  const rawIdx = await readNumber(WIDGET_INDEX_KEY);
  const rawTask = await readNumber(WIDGET_TASK_IDX_KEY);
  const outfitId = await readString(WIDGET_OUTFIT_ID_KEY);
  const bgModeRaw = await readString(WIDGET_BG_MODE_KEY);
  const bgMode = (bgModeRaw as BgMode | null) ?? "user";
  const bgId = await readString(WIDGET_BG_ID_KEY);
  const isPro = (await readString(WIDGET_PRO_KEY)) === "true";

  const routineIdx = clamp(rawIdx, routines.length - 1);
  const currentRoutine = routines.length > 0 ? routines[routineIdx] : null;
  const taskCount = currentRoutine?.tasks.length ?? 0;
  const taskIdx = clamp(rawTask, taskCount - 1);

  const earnedCoins = await readEarnedCoins(currentRoutine?.id ?? null);

  return (
    <RoutinesWidget
      currentRoutine={currentRoutine}
      currentIndex={routineIdx}
      totalRoutines={routines.length}
      taskVisibleIndex={taskIdx}
      outfitId={outfitId}
      bgMode={bgMode}
      bgId={bgId}
      earnedCoins={earnedCoins}
      isPro={isPro}
    />
  );
}

// ── widgetTaskHandler ─────────────────────────────────────────────────────────
export async function widgetTaskHandler(props: WidgetTaskHandlerProps) {
  try {
    let routines = await readRoutines();
    let routineIdx = await readNumber(WIDGET_INDEX_KEY);
    let taskIdx = await readNumber(WIDGET_TASK_IDX_KEY);
    const outfitUri = await readString(WIDGET_OUTFIT_ID_KEY);
    const bgModeRaw = await readString(WIDGET_BG_MODE_KEY);
    let bgMode = (bgModeRaw as BgMode | null) ?? "user";
    const bgId = await readString(WIDGET_BG_ID_KEY);
    const isPro = (await readString(WIDGET_PRO_KEY)) === "true";

    // Sanity-clamp indices
    routineIdx = clamp(routineIdx, routines.length - 1);
    const currentRoutine = routines.length > 0 ? routines[routineIdx] : null;
    const taskCount = currentRoutine?.tasks.length ?? 0;
    taskIdx = clamp(taskIdx, taskCount - 1);

    // ── Handle click actions ───────────────────────────────────────────────

    switch (props.clickAction) {
      case "NEXT_ROUTINE": {
        routineIdx = (routineIdx + 1) % routines.length;
        taskIdx = 0;
        await AsyncStorage.setItem(WIDGET_INDEX_KEY, routineIdx.toString());
        await AsyncStorage.setItem(WIDGET_TASK_IDX_KEY, "0");
        break;
      }

      case "PREV_ROUTINE": {
        if (routineIdx > 0) {
          routineIdx--;
          taskIdx = 0;
        }
        await AsyncStorage.setItem(WIDGET_INDEX_KEY, routineIdx.toString());
        await AsyncStorage.setItem(WIDGET_TASK_IDX_KEY, "0");
        break;
      }

      case "NEXT_TASK": {
        const next = routines[routineIdx];
        if (next && next.tasks.length > 0) {
          taskIdx = (taskIdx + 1) % next.tasks.length;
          await AsyncStorage.setItem(WIDGET_TASK_IDX_KEY, taskIdx.toString());
        }
        break;
      }

      case "TOGGLE_TASK": {
        const taskId = props.clickActionData?.taskId as string | undefined;
        const routineId = props.clickActionData?.routineId as
          | string
          | undefined;

        if (taskId && routineId) {
          const previousRoutines = routines;
          const updatedRoutines = routines.map((r) => {
            if (r.id !== routineId) return r;
            return {
              ...r,
              tasks: r.tasks.map((t) =>
                t.id === taskId ? { ...t, completed: !t.completed } : t,
              ),
            };
          });

          // 1. Persist locally
          try {
            await AsyncStorage.setItem(
              WIDGET_DATA_KEY,
              JSON.stringify(updatedRoutines),
            );
          } catch (e) {
            console.warn("Widget: error saving task toggle", e);
          }

          routines = updatedRoutines;

          // 2. Render immediately (optimistic UI — no network wait)
          const freshRoutineOptimistic =
            updatedRoutines.length > 0 ? updatedRoutines[routineIdx] : null;
          const freshTaskCountOptimistic =
            freshRoutineOptimistic?.tasks.length ?? 0;
          const freshTaskIdxOptimistic = clamp(
            taskIdx,
            freshTaskCountOptimistic - 1,
          );
          const optimisticCoins = await readEarnedCoins(
            freshRoutineOptimistic?.id ?? null,
          );
          props.renderWidget(
            <RoutinesWidget
              currentRoutine={freshRoutineOptimistic}
              currentIndex={routineIdx}
              totalRoutines={routines.length}
              taskVisibleIndex={freshTaskIdxOptimistic}
              outfitId={outfitUri}
              bgMode={bgMode}
              bgId={bgId}
              earnedCoins={optimisticCoins}
              isPro={isPro}
            />,
          );

          // 3. Fire-and-forget: sync with network/stores in background
          syncToggleInBackground(
            taskId,
            routineId,
            updatedRoutines,
            previousRoutines,
            props.renderWidget,
            routineIdx,
            taskIdx,
            outfitUri, // variable holds outfit ID after the rename above
            bgMode,
            bgId,
            isPro,
          ).catch((e) => console.warn("Widget: background sync error", e));
        }
        // Return early — optimistic render already dispatched above
        return;
      }

      case "CYCLE_BG": {
        const currentPos = BG_CYCLE.indexOf(bgMode);
        bgMode = BG_CYCLE[(currentPos + 1) % BG_CYCLE.length];
        await AsyncStorage.setItem(WIDGET_BG_MODE_KEY, bgMode);
        break;
      }

      default:
        break;
    }

    // Re-render for non-TOGGLE_TASK actions
    const freshRoutine = routines.length > 0 ? routines[routineIdx] : null;
    const freshTaskCount = freshRoutine?.tasks.length ?? 0;
    taskIdx = clamp(taskIdx, freshTaskCount - 1);

    const earnedCoins = await readEarnedCoins(freshRoutine?.id ?? null);

    props.renderWidget(
      <RoutinesWidget
        currentRoutine={freshRoutine}
        currentIndex={routineIdx}
        totalRoutines={routines.length}
        taskVisibleIndex={taskIdx}
        outfitId={outfitUri}
        bgMode={bgMode}
        bgId={bgId}
        earnedCoins={earnedCoins}
        isPro={isPro}
      />,
    );
  } catch (err) {
    // Safety net: always render something even if the handler crashes
    console.warn("Widget handler crashed, rendering fallback:", err);
    const fallbackIsPro =
      (await readString(WIDGET_PRO_KEY).catch(() => null)) === "true";
    props.renderWidget(
      <RoutinesWidget
        currentRoutine={null}
        currentIndex={0}
        totalRoutines={0}
        taskVisibleIndex={0}
        outfitId={null}
        bgMode="solid"
        bgId={null}
        isPro={fallbackIsPro}
      />,
    );
  }
}
