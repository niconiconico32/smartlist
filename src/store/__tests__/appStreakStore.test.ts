import { useAppStreakStore, AppStreakData } from '../appStreakStore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as dateHelpers from '@/src/utils/dateHelpers';

const APP_STREAK_KEY = '@smartlist_app_streak';

describe('Store: appStreakStore', () => {
  const initialState = useAppStreakStore.getState();

  beforeEach(() => {
    // Reset Zustand store
    useAppStreakStore.setState(initialState, true);
    
    // Clear mocks
    jest.clearAllMocks();
    AsyncStorage.clear();

    // Set fake timers
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('initializeAppStreak()', () => {
    it('debe iniciar racha en 1 y mostrar pantalla si es la primera vez (sin datos)', async () => {
      jest.setSystemTime(new Date('2026-03-15T12:00:00Z'));
      
      // Aseguramos que AsyncStorage esté vacío
      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(null);

      const { initializeAppStreak } = useAppStreakStore.getState();
      await initializeAppStreak();

      const state = useAppStreakStore.getState();
      expect(state.streak).toBe(1);
      expect(state.shouldShowStreakScreen).toBe(true);
      expect(state.lastOpenDate).toBe('2026-03-15');
      expect(state.history).toEqual(['2026-03-15']);
      
      // Verifica guardado
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        APP_STREAK_KEY,
        expect.stringContaining('"count":1')
      );
    });

    it('debe mantener la racha y NO mostrar pantalla si ya abrió HOY', async () => {
      jest.setSystemTime(new Date('2026-03-15T12:00:00Z'));
      
      const storedData: AppStreakData = {
        count: 5,
        lastOpenDate: '2026-03-15',
        history: ['2026-03-15', '2026-03-14']
      };
      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(JSON.stringify(storedData));

      const { initializeAppStreak } = useAppStreakStore.getState();
      await initializeAppStreak();

      const state = useAppStreakStore.getState();
      expect(state.streak).toBe(5);
      expect(state.shouldShowStreakScreen).toBe(false); // 🚨 Esencial para no hartar al usuario
    });

    it('debe incrementar racha a 6 y mostrar pantalla si el último open fue AYER', async () => {
      jest.setSystemTime(new Date('2026-03-15T12:00:00Z'));
      
      const storedData: AppStreakData = {
        count: 5,
        lastOpenDate: '2026-03-14',
        history: ['2026-03-14', '2026-03-13']
      };
      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(JSON.stringify(storedData));

      const { initializeAppStreak } = useAppStreakStore.getState();
      await initializeAppStreak();

      const state = useAppStreakStore.getState();
      expect(state.streak).toBe(6);
      expect(state.shouldShowStreakScreen).toBe(true);
      expect(state.history).toContain('2026-03-15');
    });

    it('debe reiniciar racha a 1 si no abrió por más de 24h', async () => {
      jest.setSystemTime(new Date('2026-03-15T12:00:00Z'));
      
      const storedData: AppStreakData = {
        count: 10,
        lastOpenDate: '2026-03-10', // 5 días de ausencia
        history: ['2026-03-10', '2026-03-09']
      };
      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(JSON.stringify(storedData));

      const { initializeAppStreak } = useAppStreakStore.getState();
      await initializeAppStreak();

      const state = useAppStreakStore.getState();
      expect(state.streak).toBe(1); // Castigo 🚨
      expect(state.shouldShowStreakScreen).toBe(true);
    });
  });

  // ─── Shield Protection Tests ──────────────────────────────────────────────────

  describe('Shield protection flow', () => {
    const { useProStore } = require('../proStore');

    it('debe conservar la racha y activar pendingShieldOffer si es Pro con shields y hay gap', async () => {
      jest.setSystemTime(new Date('2026-03-15T12:00:00Z'));

      // Simulate Pro user with shields
      useProStore.setState({
        isPro: true,
        streakShieldCount: 2,
        pendingShieldOffer: false,
      });

      const storedData: AppStreakData = {
        count: 7,
        lastOpenDate: '2026-03-10', // 5 días de ausencia
        history: ['2026-03-10', '2026-03-09'],
      };
      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(JSON.stringify(storedData));
      // activateShieldOffer calls AsyncStorage.setItem — allow it
      (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);

      const { initializeAppStreak } = useAppStreakStore.getState();
      await initializeAppStreak();

      const state = useAppStreakStore.getState();
      // Streak is preserved (not reset) while shield offer is pending
      expect(state.streak).toBe(7);
      expect(state.shouldShowStreakScreen).toBe(true);
      // proStore should have been asked to show the shield offer
      expect(useProStore.getState().pendingShieldOffer).toBe(true);
    });

    it('debe resetear racha a 1 si hay gap y el usuario NO es Pro', async () => {
      jest.setSystemTime(new Date('2026-03-15T12:00:00Z'));

      useProStore.setState({ isPro: false, streakShieldCount: 0, pendingShieldOffer: false });

      const storedData: AppStreakData = {
        count: 5,
        lastOpenDate: '2026-03-10',
        history: ['2026-03-10'],
      };
      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(JSON.stringify(storedData));
      (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);

      await useAppStreakStore.getState().initializeAppStreak();

      expect(useAppStreakStore.getState().streak).toBe(1);
    });

    it('debe resetear racha a 1 si es Pro pero no tiene shields', async () => {
      jest.setSystemTime(new Date('2026-03-15T12:00:00Z'));

      useProStore.setState({ isPro: true, streakShieldCount: 0, pendingShieldOffer: false });

      const storedData: AppStreakData = {
        count: 5,
        lastOpenDate: '2026-03-10',
        history: ['2026-03-10'],
      };
      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(JSON.stringify(storedData));
      (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);

      await useAppStreakStore.getState().initializeAppStreak();

      expect(useAppStreakStore.getState().streak).toBe(1);
      // Should NOT trigger shield offer since no shields
      expect(useProStore.getState().pendingShieldOffer).toBe(false);
    });
  });

  describe('markShieldUsed()', () => {
    it('debe marcar shieldUsedToday como true y persistir', async () => {
      const existingData: AppStreakData = {
        count: 7,
        lastOpenDate: '2026-03-15',
        history: ['2026-03-15'],
      };
      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(JSON.stringify(existingData));
      (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);

      useAppStreakStore.setState({ shieldUsedToday: false });
      useAppStreakStore.getState().markShieldUsed();

      // Zustand state updated immediately (synchronous)
      expect(useAppStreakStore.getState().shieldUsedToday).toBe(true);
    });
  });

  describe('dismissStreakScreen()', () => {
    it('debe cambiar shouldShowStreakScreen a false', () => {
      useAppStreakStore.setState({ shouldShowStreakScreen: true });
      const { dismissStreakScreen } = useAppStreakStore.getState();
      
      dismissStreakScreen();
      expect(useAppStreakStore.getState().shouldShowStreakScreen).toBe(false);
    });
  });

  describe('getMultiplier()', () => {
    it('debe devolver 1 (sin bonus) si racha es 0', () => {
      useAppStreakStore.setState({ streak: 0 });
      expect(useAppStreakStore.getState().getMultiplier()).toBe(1);
    });

    it('debe devolver 1.15x para 1 día', () => {
      useAppStreakStore.setState({ streak: 1 });
      expect(useAppStreakStore.getState().getMultiplier()).toBe(1.15);
    });

    it('debe devolver 1.45x para 3 días', () => {
      useAppStreakStore.setState({ streak: 3 });
      expect(useAppStreakStore.getState().getMultiplier()).toBeCloseTo(1.45);
    });
  });
});
