import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { supabase } from '@/src/lib/supabase';

const PROGRESS_KEY = 'onboarding_progress';
const COMPLETE_KEY = 'onboarding_complete';
const SERVER_SYNCED_KEY = 'onboarding_server_synced';

interface OnboardingProgress {
  currentSlide: number;
  answers: Record<string, unknown>;
}

interface OnboardingState {
  name: string;
  diagnosis: string;
  symptoms: string[];
  goal: string;
  productivityTime: string;
  isOnboardingComplete: boolean;
  setName: (name: string) => void;
  setDiagnosis: (diagnosis: string) => void;
  setSymptoms: (symptoms: string[]) => void;
  setGoal: (goal: string) => void;
  setProductivityTime: (time: string) => void;
  loadOnboardingStatus: () => Promise<void>;
  completeOnboarding: () => Promise<void>;
  syncCompletedToServer: () => Promise<boolean>;
  saveProgress: (progress: OnboardingProgress) => Promise<void>;
  loadProgress: () => Promise<OnboardingProgress | null>;
  clearProgress: () => Promise<void>;
}

export const useOnboardingStore = create<OnboardingState>((set, get) => ({
  name: '',
  diagnosis: '',
  symptoms: [],
  goal: '',
  productivityTime: '',
  isOnboardingComplete: false,
  setName: (name) => set({ name }),
  setDiagnosis: (diagnosis) => set({ diagnosis }),
  setSymptoms: (symptoms) => set({ symptoms }),
  setGoal: (goal) => set({ goal }),
  setProductivityTime: (time) => set({ productivityTime: time }),
  loadOnboardingStatus: async () => {
    const status = await AsyncStorage.getItem('onboarding_complete');
    if (status === 'true') {
      set({ isOnboardingComplete: true });
    }
  },
  completeOnboarding: async () => {
    set({ isOnboardingComplete: true });
    await AsyncStorage.setItem(COMPLETE_KEY, 'true');
    await AsyncStorage.removeItem(PROGRESS_KEY);
    // Force a fresh push on the next attempt: this call may run without a
    // session (the new login funnel creates it after onboarding finishes).
    await AsyncStorage.removeItem(SERVER_SYNCED_KEY);
    await get().syncCompletedToServer();
  },
  /**
   * Pushes `onboarding_completed` to the server as soon as a session exists.
   *
   * The local COMPLETE_KEY doubles as the "still pending" marker, so this is
   * self-healing: it can be called on every session change and it is a no-op
   * once the server acknowledged the write. That covers a user who finished
   * onboarding offline, or whose anonymous session was created only after
   * completeOnboarding() ran.
   */
  syncCompletedToServer: async () => {
    try {
      if ((await AsyncStorage.getItem(SERVER_SYNCED_KEY)) === 'true') {
        return true;
      }
      // Never mark a user as onboarded: only push a locally confirmed finish.
      if ((await AsyncStorage.getItem(COMPLETE_KEY)) !== 'true') {
        return false;
      }
      const { data } = await supabase.auth.getSession();
      if (!data.session?.user) {
        return false; // No session yet; retried on the next one.
      }
      const { error } = await supabase.auth.updateUser({
        data: { onboarding_completed: true },
      });
      if (error) return false;
      await AsyncStorage.setItem(SERVER_SYNCED_KEY, 'true');
      return true;
    } catch {
      return false;
    }
  },
  saveProgress: async (progress) => {
    try {
      await AsyncStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
    } catch {}
  },
  loadProgress: async () => {
    try {
      const raw = await AsyncStorage.getItem(PROGRESS_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },
  clearProgress: async () => {
    await AsyncStorage.removeItem(PROGRESS_KEY);
  },
}));
