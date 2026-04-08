import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { supabase } from '@/src/lib/supabase';

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
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      await supabase.auth.updateUser({
        data: { onboarding_completed: true }
      });
    }
  },
}));
