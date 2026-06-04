import { create } from "zustand";

interface RoutinesRefreshState {
  refreshToken: number;
  bump: () => void;
}

export const useRoutinesRefreshStore = create<RoutinesRefreshState>((set) => ({
  refreshToken: 0,
  bump: () => set((state) => ({ refreshToken: state.refreshToken + 1 })),
}));
