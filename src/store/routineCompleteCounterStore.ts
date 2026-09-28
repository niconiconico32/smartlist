import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

const STORAGE_KEY = '@smartlist_routine_complete_counter';
const PAYWALL_THRESHOLD = 3;

interface RoutineCompleteCounterStore {
  count: number;
  /** Load persisted count from AsyncStorage */
  load: () => Promise<void>;
  /** Increment counter and return true if threshold is reached */
  increment: () => Promise<boolean>;
  /** Reset the counter (e.g., after showing paywall) */
  reset: () => Promise<void>;
}

export const useRoutineCompleteCounterStore =
  create<RoutineCompleteCounterStore>((set, get) => ({
    count: 0,

    load: async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored) {
          const data = JSON.parse(stored);
          set({ count: data.count ?? 0 });
        }
      } catch (error) {
        console.error(
          '[routineCompleteCounterStore] Error loading:',
          error,
        );
      }
    },

    increment: async () => {
      const newCount = get().count + 1;
      set({ count: newCount });
      try {
        await AsyncStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({ count: newCount }),
        );
      } catch (error) {
        console.error(
          '[routineCompleteCounterStore] Error persisting:',
          error,
        );
      }
      return newCount >= PAYWALL_THRESHOLD;
    },

    reset: async () => {
      set({ count: 0 });
      try {
        await AsyncStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({ count: 0 }),
        );
      } catch (error) {
        console.error(
          '[routineCompleteCounterStore] Error persisting:',
          error,
        );
      }
    },
  }));
