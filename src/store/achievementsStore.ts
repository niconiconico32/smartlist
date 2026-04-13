import { getLocalDateKey } from '@/src/utils/dateHelpers';
import { posthog } from '@/src/config/posthog';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Award, Bell, Clock, Coffee, Crown, Flame, Flower2, Heart,
  Layers, ListChecks, ShoppingBag, Sparkles, Star, Sun,
  Target, Trophy, Zap,
} from 'lucide-react-native';
import { create } from 'zustand';
import { useAppStreakStore } from './appStreakStore';

const ACHIEVEMENTS_STORAGE_KEY = '@smartlist_achievements';
const APP_OPENED_KEY = '@smartlist_app_opened';

export interface AchievementProgress {
  id: string;
  progress: number;
  completed: boolean;
  completedAt?: string;
}

export type AchievementId =
  | 'app_opened'
  | 'first_task'
  | 'two_routines'
  | 'first_routine'
  | 'streak_3'
  | 'edit_routine'
  | 'first_reminder'
  | 'tasks_3'
  | 'routine_streak_4'
  | 'three_routines'
  | 'first_outfit'
  | 'edit_old_routine'
  | 'streak_7'
  | 'routine_streak_9'
  | 'tasks_12'
  | 'first_skin'
  | 'streak_14'
  | 'tasks_25'
  | 'three_skins'
  | 'streak_21'
  | 'weekly_4'
  | 'streak_30';

export interface AchievementDefinition {
  id: AchievementId;
  title: string;
  icon: any;
  gradient: string[];
  total: number;
  coins: number;
}

// =====================================================
// ACHIEVEMENT DEFINITIONS (ordered easiest → hardest)
// =====================================================
export const ACHIEVEMENT_DEFINITIONS: Record<AchievementId, AchievementDefinition> = {
  app_opened: {
    id: 'app_opened',
    title: 'Abre la app por primera vez',
    icon: Trophy,
    gradient: ['#C9FD5A', '#C9FD5A'],
    total: 1,
    coins: 200,
  },
  first_task: {
    id: 'first_task',
    title: 'Crea tu primera tarea',
    icon: Heart,
    gradient: ['#B2E6FB', '#B2E6FB'],
    total: 1,
    coins: 50,
  },
  two_routines: {
    id: 'two_routines',
    title: 'Crea tus primeras dos rutinas',
    icon: Target,
    gradient: ['#2D0B83', '#2D0B83'],
    total: 2,
    coins: 75,
  },
  first_routine: {
    id: 'first_routine',
    title: 'Completa tu primera rutina al 100%',
    icon: ListChecks,
    gradient: ['#A78BFA', '#8B5CF6'],
    total: 1,
    coins: 150,
  },
  streak_3: {
    id: 'streak_3',
    title: 'Alcanza una racha de 3 días',
    icon: Flame,
    gradient: ['#F8CBDF', '#F8CBDF'],
    total: 3,
    coins: 100,
  },
  edit_routine: {
    id: 'edit_routine',
    title: 'Cambia el ícono o nombre de una rutina',
    icon: Sparkles,
    gradient: ['#FDB899', '#FDB899'],
    total: 1,
    coins: 50,
  },
  first_reminder: {
    id: 'first_reminder',
    title: 'Activa tu primer recordatorio',
    icon: Bell,
    gradient: ['#FFD93D', '#FFD93D'],
    total: 1,
    coins: 50,
  },
  tasks_3: {
    id: 'tasks_3',
    title: 'Completa 3 tareas en total',
    icon: Star,
    gradient: ['#6BCB77', '#6BCB77'],
    total: 3,
    coins: 75,
  },
  routine_streak_4: {
    id: 'routine_streak_4',
    title: 'Ten una racha de rutina de 4 días',
    icon: Zap,
    gradient: ['#FF6B6B', '#FF6B6B'],
    total: 4,
    coins: 100,
  },
  three_routines: {
    id: 'three_routines',
    title: 'Mantén 3 rutinas activas',
    icon: Layers,
    gradient: ['#4D96FF', '#4D96FF'],
    total: 3,
    coins: 100,
  },
  first_outfit: {
    id: 'first_outfit',
    title: 'Compra tu primer outfit',
    icon: ShoppingBag,
    gradient: ['#C084FC', '#C084FC'],
    total: 1,
    coins: 75,
  },
  edit_old_routine: {
    id: 'edit_old_routine',
    title: 'Edita una rutina de más de 5 días',
    icon: Clock,
    gradient: ['#F472B6', '#F472B6'],
    total: 1,
    coins: 100,
  },
  streak_7: {
    id: 'streak_7',
    title: 'Alcanza una racha de 7 días',
    icon: Flame,
    gradient: ['#FB923C', '#FB923C'],
    total: 7,
    coins: 150,
  },
  routine_streak_9: {
    id: 'routine_streak_9',
    title: 'Ten una racha de rutina de 9 días',
    icon: Zap,
    gradient: ['#EF4444', '#EF4444'],
    total: 9,
    coins: 150,
  },
  tasks_12: {
    id: 'tasks_12',
    title: 'Completa 12 tareas en total',
    icon: Award,
    gradient: ['#34D399', '#34D399'],
    total: 12,
    coins: 150,
  },
  first_skin: {
    id: 'first_skin',
    title: 'Compra tu primera skin',
    icon: Flower2,
    gradient: ['#818CF8', '#818CF8'],
    total: 1,
    coins: 100,
  },
  streak_14: {
    id: 'streak_14',
    title: 'Alcanza una racha de 14 días',
    icon: Flame,
    gradient: ['#F97316', '#F97316'],
    total: 14,
    coins: 200,
  },
  tasks_25: {
    id: 'tasks_25',
    title: 'Completa 25 tareas en total',
    icon: Crown,
    gradient: ['#10B981', '#10B981'],
    total: 25,
    coins: 200,
  },
  three_skins: {
    id: 'three_skins',
    title: 'Compra 3 fondos',
    icon: Sun,
    gradient: ['#8B5CF6', '#8B5CF6'],
    total: 3,
    coins: 200,
  },
  streak_21: {
    id: 'streak_21',
    title: 'Alcanza una racha de 21 días',
    icon: Flame,
    gradient: ['#DC2626', '#DC2626'],
    total: 21,
    coins: 250,
  },
  weekly_4: {
    id: 'weekly_4',
    title: 'Usa la app en 4 semanas distintas',
    icon: Coffee,
    gradient: ['#3B82F6', '#3B82F6'],
    total: 4,
    coins: 200,
  },
  streak_30: {
    id: 'streak_30',
    title: 'Alcanza una racha de 30 días',
    icon: Crown,
    gradient: ['#FCD34D', '#FCD34D'],
    total: 30,
    coins: 300,
  },
};

// Calculate current streak from activities
export function calculateStreak(activities: any[]): number {
  const allCompletedDates = new Set<string>();
  
  // Collect all completed dates from all activities
  activities.forEach(activity => {
    if (activity.recurrence && activity.completedDates) {
      activity.completedDates.forEach((date: string) => allCompletedDates.add(date));
    } else if (activity.completed && activity.scheduledDate) {
      allCompletedDates.add(activity.scheduledDate);
    }
  });

  if (allCompletedDates.size === 0) return 0;

  // Sort dates descending
  const sortedDates = Array.from(allCompletedDates).sort((a, b) => b.localeCompare(a));
  
  // Get today's date key
  const today = new Date();
  const todayKey = getLocalDateKey(today);
  
  // Check if streak is active (completed today or yesterday)
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayKey = getLocalDateKey(yesterday);
  
  if (!sortedDates.includes(todayKey) && !sortedDates.includes(yesterdayKey)) {
    return 0; // Streak broken
  }

  // Count consecutive days
  let streak = 0;
  let checkDate = new Date(today);
  
  // Start from today or yesterday
  if (!sortedDates.includes(todayKey)) {
    checkDate = yesterday;
  }
  
  while (true) {
    const dateKey = getLocalDateKey(checkDate);
    if (sortedDates.includes(dateKey)) {
      streak++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      break;
    }
  }
  
  return streak;
}

// =====================================================
// HELPER: ISO week key for weekly usage tracking
// =====================================================
function getISOWeekKey(date: Date): string {
  const d = new Date(date.getTime());
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const week1 = new Date(d.getFullYear(), 0, 4);
  const weekNo = 1 + Math.round(
    ((d.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7
  );
  return `${d.getFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

// =====================================================
// DEFAULT PROGRESS for all achievements
// =====================================================
const ALL_ACHIEVEMENT_IDS = Object.keys(ACHIEVEMENT_DEFINITIONS) as AchievementId[];

function createDefaultAchievements(): Record<AchievementId, AchievementProgress> {
  const map = {} as Record<AchievementId, AchievementProgress>;
  for (const id of ALL_ACHIEVEMENT_IDS) {
    map[id] = { id, progress: 0, completed: false };
  }
  return map;
}

// =====================================================
// STORE INTERFACE
// =====================================================
interface AchievementsStore {
  achievements: Record<AchievementId, AchievementProgress>;
  totalCoins: number;

  // Extra tracked state
  routineStreak: number;
  lastRoutineCompletedDate: string | null;
  distinctWeeks: string[];
  purchasedOutfits: string[];
  purchasedBackgrounds: string[];
  activeBackground: string | null;
  activeOutfit: string | null;

  // New map to prevent re-awarding coins on the same day simply by unchecking and rechecking tasks
  rewardedRoutines: Record<string, string>;

  // Actions
  loadAchievements: () => Promise<void>;
  updateAchievement: (id: AchievementId, progress: number) => Promise<void>;
  completeAchievement: (id: AchievementId) => Promise<void>;
  checkAndUpdateAchievements: (activities: any[], currentStreak: number) => Promise<void>;

  // Existing triggers
  onRoutineCompleted: () => Promise<void>;
  onRoutinesCountChanged: (count: number) => Promise<void>;
  onStreakChanged: (streak: number) => Promise<void>;
  initializeAppOpened: () => Promise<void>;

  // New triggers
  onRoutineEdited: (createdAt?: string, nameChanged?: boolean, iconChanged?: boolean) => Promise<void>;
  onReminderActivated: () => Promise<void>;
  trackWeeklyUsage: () => Promise<void>;
  onPurchaseMade: (type: 'outfit' | 'background', itemId: string) => Promise<void>;

  // Shop actions
  spendCoins: (amount: number) => Promise<boolean>;
  setActiveBackground: (id: string | null) => Promise<void>;
  setActiveOutfit: (id: string | null) => Promise<void>;

  isRoutineModalOpen: boolean;
  setRoutineModalOpen: (isOpen: boolean) => void;

  dailyTasksCompletedCount: number;
  dailyRoutinesCompletedCount: number;
  todaysRewardedTaskIds: string[];
  lastRewardDate: string | null;
  rewardedTasks: Record<string, string>;

  awardRoutineCompletionCoins: (routineId: string) => Promise<{ earned: number; isNew: boolean }>;
  awardTaskCompletionCoins: (taskId: string, difficulty: 'easy' | 'moderate' | 'hard', subtaskId?: string) => Promise<{ earned: number; isNew: boolean }>;
}

// =====================================================
// STORE
// =====================================================
export const useAchievementsStore = create<AchievementsStore>((set, get) => {
  // Internal persistence helper — saves ALL tracked state
  const persist = async () => {
    try {
      const s = get();
      await AsyncStorage.setItem(
        ACHIEVEMENTS_STORAGE_KEY,
        JSON.stringify({
          achievements: s.achievements,
          totalCoins: s.totalCoins,
          routineStreak: s.routineStreak,
          lastRoutineCompletedDate: s.lastRoutineCompletedDate,
          distinctWeeks: s.distinctWeeks,
          purchasedOutfits: s.purchasedOutfits,
          purchasedBackgrounds: s.purchasedBackgrounds,
          activeBackground: s.activeBackground,
          activeOutfit: s.activeOutfit,
          rewardedRoutines: s.rewardedRoutines,
          rewardedTasks: s.rewardedTasks,
          todaysRewardedTaskIds: s.todaysRewardedTaskIds,
          dailyTasksCompletedCount: s.dailyTasksCompletedCount,
          dailyRoutinesCompletedCount: s.dailyRoutinesCompletedCount,
          lastRewardDate: s.lastRewardDate,
        }),
      );
    } catch (error) {
      console.error('Error persisting achievements:', error);
    }
  };

  return {
    // ---- Initial state ----
    achievements: createDefaultAchievements(),
    totalCoins: 0,
    routineStreak: 0,
    lastRoutineCompletedDate: null,
    distinctWeeks: [],
    purchasedOutfits: [],
    purchasedBackgrounds: [],
    activeBackground: null,
    activeOutfit: null,
    rewardedRoutines: {},
    rewardedTasks: {},
    dailyTasksCompletedCount: 0,
    dailyRoutinesCompletedCount: 0,
    todaysRewardedTaskIds: [],
    lastRewardDate: null,
    isRoutineModalOpen: false,

    // =========================================================
    // LOAD (with backward-compatible migration)
    // =========================================================
    loadAchievements: async () => {
      try {
        const stored = await AsyncStorage.getItem(ACHIEVEMENTS_STORAGE_KEY);
        if (stored) {
          const data = JSON.parse(stored);

          // Merge saved achievements with defaults for any new IDs
          const merged = createDefaultAchievements();
          if (data.achievements) {
            for (const id of ALL_ACHIEVEMENT_IDS) {
              if (data.achievements[id]) {
                merged[id] = data.achievements[id];
              }
            }
          }

          set({
            achievements: merged,
            totalCoins: data.totalCoins || 0,
            routineStreak: data.routineStreak || 0,
            lastRoutineCompletedDate: data.lastRoutineCompletedDate || null,
            distinctWeeks: data.distinctWeeks || [],
            purchasedOutfits: data.purchasedOutfits || [],
            purchasedBackgrounds: data.purchasedBackgrounds || [],
            activeBackground: data.activeBackground || null,
            activeOutfit: data.activeOutfit || null,
            rewardedRoutines: data.rewardedRoutines || {},
            rewardedTasks: data.rewardedTasks || {},
            dailyTasksCompletedCount: data.dailyTasksCompletedCount || 0,
            dailyRoutinesCompletedCount: data.dailyRoutinesCompletedCount || 0,
            todaysRewardedTaskIds: data.todaysRewardedTaskIds || [],
            lastRewardDate: data.lastRewardDate || null,
          });
        }
      } catch (error) {
        console.error('Error loading achievements:', error);
      }
    },

    // =========================================================
    // UPDATE ACHIEVEMENT (core — applies multiplier on complete)
    // =========================================================
    updateAchievement: async (id, progress) => {
      const state = get();
      const achievement = state.achievements[id];
      if (!achievement || achievement.completed) return;

      const definition = ACHIEVEMENT_DEFINITIONS[id];
      if (!definition) return;

      const newCompleted = progress >= definition.total;

      const newAchievements = {
        ...state.achievements,
        [id]: {
          ...achievement,
          progress,
          completed: newCompleted,
          completedAt: newCompleted ? new Date().toISOString() : undefined,
        },
      };

      // Apply streak multiplier when awarding coins
      let coinsToAdd = definition.coins;
      if (newCompleted && !achievement.completed) {
        const multiplier = useAppStreakStore.getState().getMultiplier();
        coinsToAdd = Math.round(definition.coins * multiplier);
      }

      const newTotalCoins =
        newCompleted && !achievement.completed
          ? state.totalCoins + coinsToAdd
          : state.totalCoins;

      set({ achievements: newAchievements, totalCoins: newTotalCoins });
      await persist();

      if (newCompleted && !achievement.completed) {
        posthog.capture('achievement_unlocked', {
          achievement_id: id,
          achievement_title: definition.title,
          coins_awarded: coinsToAdd,
        });
      }
    },

    completeAchievement: async (id) => {
      const definition = ACHIEVEMENT_DEFINITIONS[id];
      if (definition) {
        await get().updateAchievement(id, definition.total);
      }
    },

    // =========================================================
    // CHECK & UPDATE (called with activities list + streak)
    // =========================================================
    checkAndUpdateAchievements: async (activities, currentStreak) => {
      const { updateAchievement } = get();

      // First task created
      if (activities.length > 0) {
        await updateAchievement('first_task', 1);
      }

      // Count completed tasks for milestones
      const completedCount = activities.filter((a: any) => {
        if (a.recurrence && a.completedDates) return a.completedDates.length > 0;
        return a.completed;
      }).length;

      if (completedCount > 0) {
        await updateAchievement('tasks_3', Math.min(completedCount, 3));
        await updateAchievement('tasks_12', Math.min(completedCount, 12));
        await updateAchievement('tasks_25', Math.min(completedCount, 25));
      }

      // Streak milestones
      const streak =
        currentStreak !== undefined ? currentStreak : calculateStreak(activities);
      await updateAchievement('streak_3', Math.min(streak, 3));
      await updateAchievement('streak_7', Math.min(streak, 7));
      await updateAchievement('streak_14', Math.min(streak, 14));
      await updateAchievement('streak_21', Math.min(streak, 21));
      await updateAchievement('streak_30', Math.min(streak, 30));
    },

    // =========================================================
    // ROUTINE COMPLETED (first_routine + routine streak)
    // =========================================================
    onRoutineCompleted: async () => {
      const { updateAchievement } = get();

      // First routine completed
      await updateAchievement('first_routine', 1);

      // Track routine streak
      const today = getLocalDateKey(new Date());
      const { lastRoutineCompletedDate, routineStreak } = get();

      let newStreak = routineStreak;

      if (lastRoutineCompletedDate !== today) {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayKey = getLocalDateKey(yesterday);

        if (lastRoutineCompletedDate === yesterdayKey) {
          newStreak = routineStreak + 1;
        } else {
          newStreak = 1;
        }

        set({ routineStreak: newStreak, lastRoutineCompletedDate: today });
        await persist();
      }

      // Routine streak achievements
      await updateAchievement('routine_streak_4', Math.min(newStreak, 4));
      await updateAchievement('routine_streak_9', Math.min(newStreak, 9));
    },

    // =========================================================
    // ROUTINES COUNT CHANGED (two_routines + three_routines)
    // =========================================================
    onRoutinesCountChanged: async (count: number) => {
      const { updateAchievement } = get();
      await updateAchievement('two_routines', Math.min(count, 2));
      await updateAchievement('three_routines', Math.min(count, 3));
    },

    // =========================================================
    // STREAK CHANGED (all streak milestones)
    // =========================================================
    onStreakChanged: async (streak: number) => {
      const { updateAchievement } = get();
      await updateAchievement('streak_3', Math.min(streak, 3));
      await updateAchievement('streak_7', Math.min(streak, 7));
      await updateAchievement('streak_14', Math.min(streak, 14));
      await updateAchievement('streak_21', Math.min(streak, 21));
      await updateAchievement('streak_30', Math.min(streak, 30));
    },

    // =========================================================
    // APP OPENED (first open achievement)
    // =========================================================
    initializeAppOpened: async () => {
      try {
        const hasOpened = await AsyncStorage.getItem(APP_OPENED_KEY);
        if (!hasOpened) {
          await AsyncStorage.setItem(APP_OPENED_KEY, 'true');
          await get().completeAchievement('app_opened');
        } else {
          const state = get();
          if (!state.achievements.app_opened.completed) {
            await get().completeAchievement('app_opened');
          }
        }
      } catch (error) {
        console.error('Error initializing app opened:', error);
      }
    },

    // =========================================================
    // ROUTINE EDITED (edit_routine + edit_old_routine)
    // =========================================================
    onRoutineEdited: async (
      createdAt?: string,
      nameChanged?: boolean,
      iconChanged?: boolean,
    ) => {
      const { updateAchievement } = get();

      // Changed icon or name → edit_routine
      if (nameChanged || iconChanged) {
        await updateAchievement('edit_routine', 1);
      }

      // Edited a routine older than 5 days → edit_old_routine
      if (createdAt) {
        const created = new Date(createdAt);
        const now = new Date();
        const diffDays = Math.floor(
          (now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24),
        );
        if (diffDays >= 5) {
          await updateAchievement('edit_old_routine', 1);
        }
      }
    },

    // =========================================================
    // REMINDER ACTIVATED (first_reminder)
    // =========================================================
    onReminderActivated: async () => {
      await get().updateAchievement('first_reminder', 1);
    },

    // =========================================================
    // WEEKLY USAGE (weekly_4)
    // =========================================================
    trackWeeklyUsage: async () => {
      const weekKey = getISOWeekKey(new Date());
      const { distinctWeeks, updateAchievement } = get();

      if (!distinctWeeks.includes(weekKey)) {
        const newWeeks = [...distinctWeeks, weekKey];
        set({ distinctWeeks: newWeeks });
        await persist();
        await updateAchievement('weekly_4', Math.min(newWeeks.length, 4));
      } else {
        await updateAchievement('weekly_4', Math.min(distinctWeeks.length, 4));
      }
    },

    // =========================================================
    // PURCHASE MADE (first_outfit, first_skin, three_skins)
    // =========================================================
    onPurchaseMade: async (type: 'outfit' | 'background', itemId: string) => {
      const { updateAchievement, purchasedOutfits, purchasedBackgrounds } = get();

      if (type === 'outfit') {
        if (!purchasedOutfits.includes(itemId)) {
          const newOutfits = [...purchasedOutfits, itemId];
          set({ purchasedOutfits: newOutfits });
          await persist();
          posthog.capture('shop_item_purchased', { item_type: 'outfit', item_id: itemId });
          await updateAchievement('first_outfit', 1);
        }
      } else if (type === 'background') {
        if (!purchasedBackgrounds.includes(itemId)) {
          const newBgs = [...purchasedBackgrounds, itemId];
          set({ purchasedBackgrounds: newBgs });
          await persist();
          posthog.capture('shop_item_purchased', { item_type: 'background', item_id: itemId });
          await updateAchievement('first_skin', 1);
          await updateAchievement('three_skins', Math.min(newBgs.length, 3));
        }
      }
    },

    // =========================================================
    // SPEND COINS (returns false if not enough)
    // =========================================================
    spendCoins: async (amount: number) => {
      const { totalCoins } = get();
      if (totalCoins < amount) return false;
      set({ totalCoins: totalCoins - amount });
      await persist();
      return true;
    },

    // =========================================================
    // SET ACTIVE BACKGROUND / OUTFIT
    // =========================================================
    setActiveBackground: async (id: string | null) => {
      set({ activeBackground: id });
      await persist();
    },

    setActiveOutfit: async (id: string | null) => {
      set({ activeOutfit: id });
      await persist();
    },

    // =========================================================
    // AWARD ROUTINE COMPLETION COINS (WITH DIMINISHING RETURNS)
    // =========================================================
    awardRoutineCompletionCoins: async (routineId: string) => {
      const today = getLocalDateKey(new Date());
      const state = get();
      
      if (state.rewardedRoutines[routineId] === today) {
        // Ya fue compensado hoy, no hacer nada
        return { earned: 0, isNew: false };
      }

      // Check date reset for diminishing returns
      let { dailyRoutinesCompletedCount, lastRewardDate } = state;
      if (lastRewardDate !== today) {
        dailyRoutinesCompletedCount = 0;
        // Reiniciamos ambas cuentas si el día cambió
        set({
          lastRewardDate: today,
          dailyRoutinesCompletedCount: 0,
          dailyTasksCompletedCount: 0,
        });
      }
      
      const multiplier = useAppStreakStore.getState().getMultiplier();
      const baseEarned = 100; // Base de recompensa para rutinas
      const fadingFactor = Math.pow(0.5, dailyRoutinesCompletedCount);
      const earned = Math.round(baseEarned * fadingFactor * multiplier);
      
      set({
        rewardedRoutines: { ...state.rewardedRoutines, [routineId]: today },
        dailyRoutinesCompletedCount: dailyRoutinesCompletedCount + 1,
        totalCoins: state.totalCoins + earned,
      });
      await persist();
      
      return { earned, isNew: true };
    },

    // =========================================================
    // AWARD TASK COMPLETION COINS (WITH LIMITS & RANDOM COINS)
    // =========================================================
    awardTaskCompletionCoins: async (taskId: string, difficulty: 'easy' | 'moderate' | 'hard', subtaskId?: string) => {
      const today = getLocalDateKey(new Date());
      const state = get();
      
      const exactItemId = subtaskId ? `subtask_${subtaskId}` : `task_${taskId}`;

      if (state.rewardedTasks[exactItemId]) {
        // Ya fue compensado alguna vez (previene abuso de reinicio exacto)
        return { earned: 0, isNew: false };
      }

      // Check date reset
      let { todaysRewardedTaskIds, lastRewardDate } = state;
      if (lastRewardDate !== today) {
        todaysRewardedTaskIds = [];
        set({
          lastRewardDate: today,
          dailyRoutinesCompletedCount: 0,
          dailyTasksCompletedCount: 0,
          todaysRewardedTaskIds: [],
        });
      }
      todaysRewardedTaskIds = todaysRewardedTaskIds || [];
      
      // Contar límite por Tarea general, NO por subtarea
      const isNewTaskToday = !todaysRewardedTaskIds.includes(taskId);
      if (isNewTaskToday && todaysRewardedTaskIds.length >= 2) {
        return { earned: 0, isNew: true };
      }
      
      let multiplier = 1;
      try {
        if (useAppStreakStore?.getState) {
          multiplier = useAppStreakStore.getState().getMultiplier() || 1;
        }
      } catch (e) {}
      
      // Coronas base entre 15 y 20 por cada acción (tarea general o cada subtarea de las afortunadas)
      const baseEarned = Math.floor(Math.random() * (20 - 15 + 1)) + 15;
      const earned = Math.round(baseEarned * multiplier);
      
      const newTodaysRewarded = isNewTaskToday 
          ? [...todaysRewardedTaskIds, taskId] 
          : todaysRewardedTaskIds;

      set({
        rewardedTasks: { ...state.rewardedTasks, [exactItemId]: today },
        todaysRewardedTaskIds: newTodaysRewarded,
        dailyTasksCompletedCount: newTodaysRewarded.length,
        totalCoins: state.totalCoins + earned,
      });
      await persist();
      
      return { earned, isNew: true };
    },

    setRoutineModalOpen: (isOpen: boolean) => {
      set({ isRoutineModalOpen: isOpen });
    }
  };
});
