/**
 * App Open Streak Store
 * 
 * Tracks consecutive days the user has opened the app.
 * Separate from the task completion streak in swipeable-layout.
 * 
 * Data stored in AsyncStorage:
 * - @smartlist_app_streak: { count, lastOpenDate, history[] }
 * - count: current consecutive days
 * - lastOpenDate: "YYYY-MM-DD" of last recorded open
 * - history: last 7 "YYYY-MM-DD" strings the user opened the app
 */

import {
    getLocalTodayDateKey,
    isLocalToday,
    isLocalYesterday
} from '@/src/utils/dateHelpers';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

const APP_STREAK_KEY = '@smartlist_app_streak';

export interface AppStreakData {
  count: number;
  lastOpenDate: string | null; // "YYYY-MM-DD"
  history: string[]; // last opens as "YYYY-MM-DD", most recent first
}

interface AppStreakStore {
  streak: number;
  lastOpenDate: string | null;
  history: string[];
  shouldShowStreakScreen: boolean;

  /**
   * Called once when the app loads.
   * - Loads persisted data
   * - Checks if today was already recorded
   * - If not, increments streak (or resets if >1 day gap)
   * - Sets shouldShowStreakScreen = true if this is the first open today
   */
  initializeAppStreak: () => Promise<void>;

  /** Dismiss the streak screen */
  dismissStreakScreen: () => void;

  /**
   * Returns the coin multiplier based on current streak.
   * Formula: 1 + (streak * 0.15)
   * - 1 day  → 1.15x (+15%)
   * - 2 days → 1.30x (+30%)
   * - 3 days → 1.45x (+45%)
   * - etc.
   * If streak is 0, returns 1 (no bonus).
   */
  getMultiplier: () => number;
}

export const useAppStreakStore = create<AppStreakStore>((set, get) => ({
  streak: 0,
  lastOpenDate: null,
  history: [],
  shouldShowStreakScreen: false,

  initializeAppStreak: async () => {
    try {
      const stored = await AsyncStorage.getItem(APP_STREAK_KEY);
      const today = getLocalTodayDateKey();

      if (stored) {
        const data: AppStreakData = JSON.parse(stored);

        // Already opened today — don't show screen again
        if (data.lastOpenDate && isLocalToday(data.lastOpenDate)) {
          set({
            streak: data.count,
            lastOpenDate: data.lastOpenDate,
            history: data.history,
            shouldShowStreakScreen: false,
          });
          return;
        }

        // First open today — calculate new streak
        let newCount = 1;
        if (data.lastOpenDate && isLocalYesterday(data.lastOpenDate)) {
          // Consecutive day
          newCount = data.count + 1;
        }
        // If last open was >1 day ago, streak resets to 1

        // Update history: add today, keep last 7
        const newHistory = [today, ...data.history.filter((d) => d !== today)].slice(0, 7);

        const newData: AppStreakData = {
          count: newCount,
          lastOpenDate: today,
          history: newHistory,
        };

        await AsyncStorage.setItem(APP_STREAK_KEY, JSON.stringify(newData));

        set({
          streak: newCount,
          lastOpenDate: today,
          history: newHistory,
          shouldShowStreakScreen: true,
        });
      } else {
        // First time ever
        const newData: AppStreakData = {
          count: 1,
          lastOpenDate: today,
          history: [today],
        };

        await AsyncStorage.setItem(APP_STREAK_KEY, JSON.stringify(newData));

        set({
          streak: 1,
          lastOpenDate: today,
          history: [today],
          shouldShowStreakScreen: true,
        });
      }
    } catch (error) {
      console.error('Error initializing app streak:', error);
    }
  },

  dismissStreakScreen: () => {
    set({ shouldShowStreakScreen: false });
  },

  getMultiplier: () => {
    const { streak } = get();
    if (streak <= 0) return 1;
    return 1 + streak * 0.15;
  },
}));
