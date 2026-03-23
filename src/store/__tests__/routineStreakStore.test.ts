import { useRoutineStreakStore } from '../routineStreakStore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as dateHelpers from '@/src/utils/dateHelpers';

const ROUTINE_STREAK_KEY = '@smartlist_routine_streaks';

describe('Store: routineStreakStore', () => {
  // Store the initial state so we can reset it between tests
  const initialState = useRoutineStreakStore.getState();

  beforeEach(() => {
    // Reset Zustand store state manually
    useRoutineStreakStore.setState(initialState, true);
    
    // Clear async storage mocks
    jest.clearAllMocks();
    AsyncStorage.clear();

    // Set fake timers
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('recordRoutineCompletion()', () => {
    it('debe iniciar una nueva racha en 1 si es la primera vez (gap > 1)', async () => {
      jest.setSystemTime(new Date('2026-03-15T12:00:00Z'));
      
      const { recordRoutineCompletion } = useRoutineStreakStore.getState();
      await recordRoutineCompletion('r1');
      
      const state = useRoutineStreakStore.getState();
      expect(state.streaks['r1']).toEqual({
        count: 1,
        lastCompletedDate: '2026-03-15'
      });
      // Verifica persistencia
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        ROUTINE_STREAK_KEY, 
        expect.stringContaining('"count":1')
      );
    });

    it('debe subir la racha a 2 si se completó ayer y hoy', async () => {
      // Configuramos el estado inicial como si hubiésemos completado ayer
      useRoutineStreakStore.setState({
        streaks: {
          'r1': { count: 1, lastCompletedDate: '2026-03-14' }
        }
      });

      jest.setSystemTime(new Date('2026-03-15T12:00:00Z'));
      
      const { recordRoutineCompletion } = useRoutineStreakStore.getState();
      await recordRoutineCompletion('r1');
      
      const state = useRoutineStreakStore.getState();
      expect(state.streaks['r1']).toEqual({
        count: 2, // ¡Aumentó!
        lastCompletedDate: '2026-03-15'
      });
    });

    it('no debe sumar de nuevo si la completamos dos veces el mismo día', async () => {
      useRoutineStreakStore.setState({
        streaks: {
          'r1': { count: 5, lastCompletedDate: '2026-03-15' }
        }
      });

      jest.setSystemTime(new Date('2026-03-15T12:00:00Z'));
      
      const { recordRoutineCompletion } = useRoutineStreakStore.getState();
      await recordRoutineCompletion('r1');
      
      const state = useRoutineStreakStore.getState();
      expect(state.streaks['r1'].count).toBe(5); // Sigue igual
    });

    it('debe reiniciar la racha a 1 si no entramos por 24h', async () => {
      // Estado anterior: completado hace 3 días, racha de 10
      useRoutineStreakStore.setState({
        streaks: {
          'r1': { count: 10, lastCompletedDate: '2026-03-12' }
        }
      });

      // Hoy es 15, perdimos el 13 y 14.
      jest.setSystemTime(new Date('2026-03-15T12:00:00Z'));
      
      const { recordRoutineCompletion } = useRoutineStreakStore.getState();
      await recordRoutineCompletion('r1');
      
      const state = useRoutineStreakStore.getState();
      expect(state.streaks['r1'].count).toBe(1); // 🚨 Castigo de Racha
    });
  });

  describe('unmarkRoutineCompletion()', () => {
    it('debe restar 1 a la racha y simular date ayer si desmarcamos la de hoy', async () => {
      useRoutineStreakStore.setState({
        streaks: {
          'r1': { count: 5, lastCompletedDate: '2026-03-15' } // Hoy
        }
      });

      jest.setSystemTime(new Date('2026-03-15T12:00:00Z'));
      const { unmarkRoutineCompletion } = useRoutineStreakStore.getState();
      await unmarkRoutineCompletion('r1');

      const state = useRoutineStreakStore.getState();
      expect(state.streaks['r1'].count).toBe(4);
      expect(state.streaks['r1'].lastCompletedDate).toBe('2026-03-14'); // Retroceso inducido a "Ayer"
    });
  });

  describe('getStreak()', () => {
    it('debe devolver la cuenta si es racha válida activa', () => {
      useRoutineStreakStore.setState({
        streaks: {
          'r1': { count: 7, lastCompletedDate: '2026-03-15' } // Hoy
        }
      });
      jest.setSystemTime(new Date('2026-03-15T12:00:00Z')); // Mismo hoy

      const { getStreak } = useRoutineStreakStore.getState();
      expect(getStreak('r1')).toBe(7);
    });

    it('debe devolver la cuenta si completamos ayer (racha en peligro pero viva)', () => {
      useRoutineStreakStore.setState({
        streaks: {
          'r1': { count: 7, lastCompletedDate: '2026-03-14' } // Ayer
        }
      });
      jest.setSystemTime(new Date('2026-03-15T12:00:00Z')); // Hoy

      const { getStreak } = useRoutineStreakStore.getState();
      expect(getStreak('r1')).toBe(7); // Aún debe brillar en la UI porque aún tenemos el día de hoy para cumplirla
    });

    it('debe devolver 0 si la racha está rota temporalmente (antes de presionar record)', () => {
      useRoutineStreakStore.setState({
        streaks: {
          'r1': { count: 7, lastCompletedDate: '2026-03-13' } // Hace 2 días
        }
      });
      jest.setSystemTime(new Date('2026-03-15T12:00:00Z')); // Hoy

      const { getStreak } = useRoutineStreakStore.getState();
      expect(getStreak('r1')).toBe(0); // 🚨 Rota, la UI apaga el fuego
    });
  });
});
