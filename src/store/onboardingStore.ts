import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

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
  completeOnboarding: () => void;
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
  completeOnboarding: () => {
    set({ isOnboardingComplete: true });
    AsyncStorage.setItem('onboarding_complete', 'true');
  },
}));
