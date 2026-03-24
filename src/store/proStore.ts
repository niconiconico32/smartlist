/**
 * Pro Store
 *
 * Manages the Pro subscription state, streak shields, trial offer, and shield offer flow.
 *
 * Fields persisted in AsyncStorage:
 * - isPro: boolean
 * - streakShieldCount: 0-2 (refills to 2 every Monday)
 * - lastShieldRefillDate: "YYYY-MM-DD" of last Monday refill
 * - pendingShieldOffer: whether there is a pending shield offer to show the user
 * - hasSeenTrialOffer: whether the first-task trial offer has already been shown
 * - trialExpiresAt: ISO timestamp when the 7-day trial expires (null = no active trial)
 */

import { getLocalTodayDateKey } from '@/src/utils/dateHelpers';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

const PRO_STORE_KEY = '@smartlist_pro_store';
const MAX_SHIELDS = 2;
const TRIAL_DAYS = 7;

interface ProStoreState {
  isPro: boolean;
  streakShieldCount: number;
  lastShieldRefillDate: string | null;
  pendingShieldOffer: boolean;
  hasSeenTrialOffer: boolean;
  trialExpiresAt: string | null; // ISO date string
  isLoaded: boolean;
}

interface ProStoreActions {
  /** Load persisted state from AsyncStorage (also auto-expires trial) */
  load: () => Promise<void>;

  /** DEV ONLY: toggle Pro on/off */
  togglePro: () => Promise<void>;

  /**
   * Activate a 7-day Pro trial. Marks offer as seen, sets isPro = true,
   * and records the expiry timestamp.
   */
  activateTrial: () => Promise<void>;

  /**
   * Mark the trial offer as seen without activating (user dismissed).
   */
  dismissTrialOffer: () => Promise<void>;

  /**
   * Refill shields to 2 if today is Monday and we haven't refilled this week.
   */
  rechargeShieldsIfNeeded: () => Promise<void>;

  /**
   * Call when a missed-day gap is detected AND shields > 0 AND isPro.
   * Sets pendingShieldOffer = true so the UI can prompt the user.
   */
  activateShieldOffer: () => Promise<void>;

  /** User decided to use a shield — consume one and clear the offer */
  consumeShield: () => Promise<void>;

  /** User declined the shield offer — clear the offer (streak resets normally) */
  clearPendingShieldOffer: () => Promise<void>;

  /**
   * Activate a permanent Pro subscription (e.g., via RevenueCat/Stripe).
   * Sets isPro to true and clears trialExpiresAt to prevent auto-downgrade.
   */
  activatePermanentPro: () => Promise<void>;

  /**
   * Cancel or expire a permanent Pro subscription.
   * Sets isPro to false.
   */
  cancelPermanentPro: () => Promise<void>;
}

type ProStore = ProStoreState & ProStoreActions;

const defaultState: ProStoreState = {
  isPro: false,
  streakShieldCount: MAX_SHIELDS,
  lastShieldRefillDate: null,
  pendingShieldOffer: false,
  hasSeenTrialOffer: false,
  trialExpiresAt: null,
  isLoaded: false,
};

const persist = async (state: ProStoreState) => {
  try {
    await AsyncStorage.setItem(
      PRO_STORE_KEY,
      JSON.stringify({
        isPro: state.isPro,
        streakShieldCount: state.streakShieldCount,
        lastShieldRefillDate: state.lastShieldRefillDate,
        pendingShieldOffer: state.pendingShieldOffer,
        hasSeenTrialOffer: state.hasSeenTrialOffer,
        trialExpiresAt: state.trialExpiresAt,
      }),
    );
  } catch (error) {
    console.error('[proStore] Error persisting:', error);
  }
};

export const useProStore = create<ProStore>((set, get) => ({
  ...defaultState,

  load: async () => {
    try {
      const stored = await AsyncStorage.getItem(PRO_STORE_KEY);
      if (stored) {
        const data = JSON.parse(stored);

        // Auto-expire trial if it has passed
        let isPro = data.isPro ?? false;
        let trialExpiresAt = data.trialExpiresAt ?? null;
        if (trialExpiresAt && new Date(trialExpiresAt) < new Date()) {
          isPro = false;
          trialExpiresAt = null;
          console.log('[proStore] Trial expired → Pro deactivated');
        }

        const newState: ProStoreState = {
          isPro,
          streakShieldCount: data.streakShieldCount ?? MAX_SHIELDS,
          lastShieldRefillDate: data.lastShieldRefillDate ?? null,
          pendingShieldOffer: data.pendingShieldOffer ?? false,
          hasSeenTrialOffer: data.hasSeenTrialOffer ?? false,
          trialExpiresAt,
          isLoaded: true,
        };
        set(newState);
        // Persist if trial was auto-expired
        if (!isPro && data.isPro) await persist(newState);
      } else {
        set({ ...defaultState, isLoaded: true });
      }
    } catch (error) {
      console.error('[proStore] Error loading:', error);
      set({ ...defaultState, isLoaded: true });
    }
  },

  togglePro: async () => {
    const state = get();
    const newIsPro = !state.isPro;
    const newState: ProStoreState = { ...state, isPro: newIsPro };
    set(newState);
    await persist(newState);
    console.log(`[proStore] Pro toggled → ${newIsPro ? 'ON' : 'OFF'}`);
  },

  activateTrial: async () => {
    const state = get();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + TRIAL_DAYS);

    const newState: ProStoreState = {
      ...state,
      isPro: true,
      hasSeenTrialOffer: true,
      trialExpiresAt: expiresAt.toISOString(),
    };
    set(newState);
    set(newState);
    await persist(newState);
    console.log(`[proStore] Trial activated → expires ${expiresAt.toISOString()}`);
  },

  activatePermanentPro: async () => {
    const state = get();
    const newState: ProStoreState = {
      ...state,
      isPro: true,
      trialExpiresAt: null, // Critical: prevent trial auto-downgrade
    };
    set(newState);
    await persist(newState);
    console.log(`[proStore] Permanent Pro subscription activated.`);
  },

  cancelPermanentPro: async () => {
    const state = get();
    const newState: ProStoreState = { ...state, isPro: false };
    set(newState);
    await persist(newState);
    console.log(`[proStore] Permanent Pro subscription cancelled/expired.`);
  },

  dismissTrialOffer: async () => {
    const state = get();
    const newState: ProStoreState = { ...state, hasSeenTrialOffer: true };
    set(newState);
    await persist(newState);
  },

  rechargeShieldsIfNeeded: async () => {
    const state = get();
    const today = getLocalTodayDateKey();
    const isMonday = new Date().getDay() === 1;

    if (!isMonday) return;
    if (state.lastShieldRefillDate === today) return;

    const newState: ProStoreState = {
      ...state,
      streakShieldCount: MAX_SHIELDS,
      lastShieldRefillDate: today,
    };
    set(newState);
    await persist(newState);
    console.log('[proStore] Shields recharged to 2 (Monday refill)');
  },

  activateShieldOffer: async () => {
    const state = get();
    if (state.streakShieldCount <= 0) return;
    if (state.pendingShieldOffer) return;

    const newState: ProStoreState = { ...state, pendingShieldOffer: true };
    set(newState);
    await persist(newState);
    console.log('[proStore] Shield offer activated');
  },

  consumeShield: async () => {
    const state = get();
    if (state.streakShieldCount <= 0) return;

    const newState: ProStoreState = {
      ...state,
      streakShieldCount: state.streakShieldCount - 1,
      pendingShieldOffer: false,
    };
    set(newState);
    await persist(newState);
    console.log(`[proStore] Shield consumed. Remaining: ${newState.streakShieldCount}`);
  },

  clearPendingShieldOffer: async () => {
    const state = get();
    const newState: ProStoreState = { ...state, pendingShieldOffer: false };
    set(newState);
    await persist(newState);
  },
}));
