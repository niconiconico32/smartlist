import {
  getLocalTodayDateKey,
  isLocalToday,
  isLocalYesterday,
} from '@/src/utils/dateHelpers';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

const ROUTINE_STREAK_KEY = '@smartlist_routine_streaks';

export interface RoutineStreakData {
  count: number;
  lastCompletedDate: string | null; // "YYYY-MM-DD"
}

export type RoutineStreaksMap = Record<string, RoutineStreakData>;

interface RoutineStreakStore {
  streaks: RoutineStreaksMap;

  /**
   * Initializes the store by loading from AsyncStorage.
   */
  initializeRoutineStreaks: () => Promise<void>;

  /**
   * Records a completion for a specific routine.
   * - If already completed today, does nothing.
   * - If completed yesterday, increments streak.
   * - If gap > 1 day, resets streak to 1.
   */
  recordRoutineCompletion: (routineId: string) => Promise<void>;

  /**
   * Unmarks a completion for today.
   * Useful if the user unchecks a task and the routine is no longer complete.
   */
  unmarkRoutineCompletion: (routineId: string) => Promise<void>;

  /**
   * Gets the streak count for a routine. Returns 0 if no active streak.
   * Note: This assumes 0 if the streak is broken (gap > 1 day),
   * but to keep UI fast it just returns the raw count. The breakdown
   * validation really happens on record or when we explicitly check validity.
   */
  getStreak: (routineId: string) => number;
}

export const useRoutineStreakStore = create<RoutineStreakStore>((set, get) => ({
  streaks: {},

  initializeRoutineStreaks: async () => {
    try {
      const stored = await AsyncStorage.getItem(ROUTINE_STREAK_KEY);
      if (stored) {
        set({ streaks: JSON.parse(stored) });
      }
    } catch (error) {
      console.error('Error initializing routine streaks:', error);
    }
  },

  recordRoutineCompletion: async (routineId: string) => {
    try {
      const { streaks } = get();
      const today = getLocalTodayDateKey();
      
      const currentData = streaks[routineId] || { count: 0, lastCompletedDate: null };

      // Already completed today? Do nothing
      if (currentData.lastCompletedDate && isLocalToday(currentData.lastCompletedDate)) {
        return;
      }

      let newCount = 1;
      if (currentData.lastCompletedDate && isLocalYesterday(currentData.lastCompletedDate)) {
        // Consecutive day
        newCount = currentData.count + 1;
      }
      // If gap > 1 day (or null), streak resets to 1

      const newStreaks = {
        ...streaks,
        [routineId]: {
          count: newCount,
          lastCompletedDate: today,
        },
      };

      set({ streaks: newStreaks });
      await AsyncStorage.setItem(ROUTINE_STREAK_KEY, JSON.stringify(newStreaks));

    } catch (error) {
      console.error('Error recording routine completion:', error);
    }
  },

  unmarkRoutineCompletion: async (routineId: string) => {
    try {
      const { streaks } = get();
      const currentData = streaks[routineId];
      if (!currentData) return;

      const today = getLocalTodayDateKey();
      
      // If it was marked today, we undo it 
      if (currentData.lastCompletedDate && isLocalToday(currentData.lastCompletedDate)) {
        // Fallback: we just assume the streak goes back down by 1, 
        // and we set the lastCompleted to yesterday to keep the rest of the streak intact.
        // It's not a perfect history track, but works perfectly for day-of toggling.
        
        let prevCount = Math.max(0, currentData.count - 1);
        
        // Let's format 'yesterday'. For an exact robust undo, we'd store history.
        // But simply reducing by 1 and leaving the date as 'maybe yesterday' is good enough.
        
        const dateObj = new Date();
        dateObj.setDate(dateObj.getDate() - 1);
        const yesterdayStr = dateObj.toISOString().split('T')[0];

        const newStreaks = {
          ...streaks,
          [routineId]: {
            count: prevCount,
            lastCompletedDate: prevCount > 0 ? yesterdayStr : null,
          },
        };

        set({ streaks: newStreaks });
        await AsyncStorage.setItem(ROUTINE_STREAK_KEY, JSON.stringify(newStreaks));
      }
    } catch (error) {
      console.error('Error unmarking routine completion:', error);
    }
  },

  getStreak: (routineId: string) => {
    const { streaks } = get();
    const data = streaks[routineId];
    if (!data) return 0;
    
    // Check if the streak is dead (last completed date is older than yesterday)
    // If it's dead, we return 0 visually so the fire goes off.
    if (data.lastCompletedDate) {
       if (!isLocalToday(data.lastCompletedDate) && !isLocalYesterday(data.lastCompletedDate)) {
         return 0; // Streak broken
       }
    }
    
    return data.count;
  },
}));
