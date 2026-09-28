import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

const STORAGE_KEY = '@smartlist_task_complete_counter';
const PAYWALL_THRESHOLD = 2;

interface TaskCompleteCounterStore {
  count: number;
  load: () => Promise<void>;
  increment: () => Promise<boolean>;
  reset: () => Promise<void>;
}

export const useTaskCompleteCounterStore = create<TaskCompleteCounterStore>(
  (set, get) => ({
    count: 0,

    load: async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored) {
          const data = JSON.parse(stored);
          set({ count: data.count ?? 0 });
        }
      } catch (error) {
        console.error('[taskCompleteCounterStore] Error loading:', error);
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
        console.error('[taskCompleteCounterStore] Error persisting:', error);
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
        console.error('[taskCompleteCounterStore] Error persisting:', error);
      }
    },
  }),
);
