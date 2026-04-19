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
import { posthog } from '../config/posthog';
import { cancelStreakWarningNotification, scheduleStreakWarningNotification } from '../utils/notifications';
import { useProStore } from './proStore';

const APP_STREAK_KEY = '@smartlist_app_streak';

export interface AppStreakData {
  count: number;
  lastOpenDate: string | null; // "YYYY-MM-DD"
  history: string[]; // last opens as "YYYY-MM-DD", most recent first
  shieldUsedToday?: boolean; // true when a shield protected the streak today
  maxStreak?: number; // highest streak ever achieved
  shieldDates?: string[]; // dates where a shield was used "YYYY-MM-DD"
}

interface AppStreakStore {
  streak: number;
  lastOpenDate: string | null;
  history: string[];
  shouldShowStreakScreen: boolean;
  /** True when a shield was consumed today to protect the streak */
  shieldUsedToday: boolean;
  /** Highest streak ever achieved (persists across resets) */
  maxStreak: number;
  /** Dates where a shield was used to protect the streak */
  shieldDates: string[];

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

  /**
   * Resets the consecutive streak count to 1 but keeps today as the last open date.
   * This is called if a Pro user with shields declines the pending shield offer.
   */
  resetStreak: () => Promise<void>;

  /**
   * Mark that a shield was used today to protect the streak.
   * Called from StreakShieldModal after the user accepts the shield offer.
   * Sets shieldUsedToday = true so DailyStreakScreen shows the protected variant.
   */
  markShieldUsed: () => void;
}

export const useAppStreakStore = create<AppStreakStore>((set, get) => ({
  streak: 0,
  lastOpenDate: null,
  history: [],
  shouldShowStreakScreen: false,
  shieldUsedToday: false,
  maxStreak: 0,
  shieldDates: [],

  initializeAppStreak: async () => {
    try {
      const stored = await AsyncStorage.getItem(APP_STREAK_KEY);
      const today = getLocalTodayDateKey();

      if (stored) {
        const data: AppStreakData = JSON.parse(stored);

        // Already opened today — update data but never hide an actively visible screen
        if (data.lastOpenDate && isLocalToday(data.lastOpenDate)) {
          set((prev) => ({
            streak: data.count,
            lastOpenDate: data.lastOpenDate,
            history: data.history,
            maxStreak: data.maxStreak ?? data.count,
            shieldDates: data.shieldDates ?? [],
            // Preserve shouldShowStreakScreen: if the screen is already showing,
            // keep it visible. Don't let a re-run of initializeAppStreak close it.
            shouldShowStreakScreen: prev.shouldShowStreakScreen,
            shieldUsedToday: data.shieldUsedToday ?? false,
          }));
          // Streak already recorded today — cancel any pending warning (belt & suspenders)
          cancelStreakWarningNotification();
          return;
        }

        // First open today — calculate new streak
        let newCount = 1;
        if (data.lastOpenDate && isLocalYesterday(data.lastOpenDate)) {
          // Consecutive day
          newCount = data.count + 1;
        } else if (data.lastOpenDate && !isLocalToday(data.lastOpenDate)) {
          // Gap detected — check if Pro user has shields to protect streak
          const proState = useProStore.getState();
          if (proState.isPro && proState.streakShieldCount > 0) {
            // Offer to protect the streak (UI handled by pendingShieldOffer flag)
            proState.activateShieldOffer();
            // Keep the old streak suspended — don't reset yet
            newCount = data.count;
          } else {
            // Streak lost — no shields available
            posthog.capture('streak_lost', {
              streak_length: data.count,
              last_open_date: data.lastOpenDate,
              had_shields: false,
              reason: 'gap_no_shield',
            });
          }
        }

        // Update history: add today, keep last 7
        const newHistory = [today, ...data.history.filter((d) => d !== today)].slice(0, 7);

        // Track max streak ever achieved
        const prevMax = data.maxStreak ?? data.count;
        const newMaxStreak = Math.max(prevMax, newCount);

        const newData: AppStreakData = {
          count: newCount,
          lastOpenDate: today,
          history: newHistory,
          maxStreak: newMaxStreak,
          shieldDates: data.shieldDates ?? [],
        };

        await AsyncStorage.setItem(APP_STREAK_KEY, JSON.stringify(newData));

        set({
          streak: newCount,
          lastOpenDate: today,
          history: newHistory,
          maxStreak: newMaxStreak,
          shieldDates: data.shieldDates ?? [],
          shouldShowStreakScreen: newCount > 1,
        });

        // Cancel today's warning (user is in the app) and schedule for tomorrow
        cancelStreakWarningNotification();
        scheduleStreakWarningNotification(newCount);
      } else {
        // First time ever
        const newData: AppStreakData = {
          count: 1,
          lastOpenDate: today,
          history: [today],
          maxStreak: 1,
          shieldDates: [],
        };

        await AsyncStorage.setItem(APP_STREAK_KEY, JSON.stringify(newData));

        set({
          streak: 1,
          lastOpenDate: today,
          history: [today],
          maxStreak: 1,
          shieldDates: [],
          shouldShowStreakScreen: false,
        });

        // First ever open — schedule a warning for tomorrow to keep the streak alive
        scheduleStreakWarningNotification(1);
      }
    } catch (error) {
      console.error('Error initializing app streak:', error);
    }
  },

  dismissStreakScreen: () => {
    set({ shouldShowStreakScreen: false });
  },

  markShieldUsed: () => {
    const today = getLocalTodayDateKey();
    set((prev) => ({
      shieldUsedToday: true,
      shieldDates: prev.shieldDates.includes(today)
        ? prev.shieldDates
        : [...prev.shieldDates, today],
    }));
    // Also persist the flag so it survives same-session re-renders
    AsyncStorage.getItem(APP_STREAK_KEY).then((stored) => {
      if (stored) {
        const data: AppStreakData = JSON.parse(stored);
        const existingShieldDates = data.shieldDates ?? [];
        const updated: AppStreakData = {
          ...data,
          shieldUsedToday: true,
          shieldDates: existingShieldDates.includes(today)
            ? existingShieldDates
            : [...existingShieldDates, today],
        };
        AsyncStorage.setItem(APP_STREAK_KEY, JSON.stringify(updated)).catch(
          (e) => console.error('[appStreakStore] Error persisting shieldUsedToday:', e)
        );
      }
    }).catch((e) => console.error('[appStreakStore] Error reading streak for shield mark:', e));
    console.log('[appStreakStore] Shield used today — streak protected!');
  },

  getMultiplier: () => {
    const { streak } = get();
    // Multiplier is a Pro-only feature
    if (!useProStore.getState().isPro) return 1;
    if (streak <= 0) return 1;
    return 1 + streak * 0.15;
  },

  resetStreak: async () => {
    try {
      const stored = await AsyncStorage.getItem(APP_STREAK_KEY);
      if (stored) {
        const data: AppStreakData = JSON.parse(stored);
        const newData: AppStreakData = {
          ...data,
          count: 1, // Break the streak
        };
        await AsyncStorage.setItem(APP_STREAK_KEY, JSON.stringify(newData));
        set({ streak: 1 });
        posthog.capture('streak_lost', {
          streak_length: data.count,
          last_open_date: data.lastOpenDate,
          had_shields: true,
          reason: 'shield_declined',
        });
        console.log('[appStreakStore] Streak manually reset to 1 (shield declined).');
      }
    } catch (error) {
      console.error('Error resetting app streak:', error);
    }
  },
}));
