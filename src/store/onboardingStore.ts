import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { supabase } from '@/src/lib/supabase';

const PROGRESS_KEY = 'onboarding_progress';

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
  saveProgress: (progress: OnboardingProgress) => Promise<void>;
  loadProgress: () => Promise<OnboardingProgress | null>;
  clearProgress: () => Promise<void>;
}

export const useOnboardingStore = create<OnboardingState>((set) => ({
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
    await AsyncStorage.setItem('onboarding_complete', 'true');
    await AsyncStorage.removeItem(PROGRESS_KEY);
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      await supabase.auth.updateUser({
        data: { onboarding_completed: true }
      });
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
