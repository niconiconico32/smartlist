// Regression suite for the cross-account egg leak.
//
// useEggStore is a global store and signOut() does not clear it. The one-time
// local→cloud migration stamps the CURRENT user id onto whatever is in the local
// store, so a second account on the same device used to inherit the first
// account's routine links. The push upserts on (user_id, egg_id), so it also
// OVERWROTE the routine→egg links the funnel had just created, leaving every
// restored routine without its companion.

// eggStore -> proStore -> achievementsStore -> appStreakStore -> notifications
// -> purchases pulls in react-native-purchases (ESM) and kicks off async work at
// module load. Neither is what this suite asserts, so stub both entry points.
jest.mock('@/src/utils/notifications', () => ({
  scheduleStreakWarningNotification: jest.fn(),
  cancelStreakWarningNotification: jest.fn(),
}));
jest.mock('@/src/utils/purchases', () => ({
  loadPro: jest.fn(),
  syncCustomerInfo: jest.fn(),
  isPro: jest.fn(),
}));
jest.mock('@/src/config/posthog', () => ({
  posthog: { capture: jest.fn(), identify: jest.fn(), reset: jest.fn() },
}));

import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/src/lib/supabase';
import { useEggStore } from '@/src/store/eggStore';

import { resetEggStoreForUserChange, syncEggsWithCloud } from '../userEggService';

const fromMock = supabase.from as unknown as jest.Mock;
const upsertMock = jest.fn();

const USER_A = 'user-a';
const USER_B = 'user-b';
const ROUTINE_A = 'routine-a';

let userEggsRows: any[] = [];
let routinesRows: any[] = [];

/** Routes supabase.from(table) to the right mock for the current test state. */
function mockFrom(table: string) {
  if (table === 'user_eggs') {
    return {
      select: jest.fn(() => ({
        eq: jest.fn(async () => ({ data: userEggsRows, error: null })),
      })),
      // The migration branch writes through the same table.
      upsert: upsertMock,
    };
  }
  if (table === 'routines') {
    return {
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          in: jest.fn(async () => ({ data: routinesRows, error: null })),
        })),
      })),
    };
  }
  return { upsert: upsertMock };
}

/** A local store that still points at user A's routine. */
function seedStaleStoreFromUserA() {
  useEggStore.setState({
    eggs: [
      { id: 1, xp: 5, routineId: ROUTINE_A, lastXpDate: null, unlocked: true, evolved: false, petXp: 0, petLevel: 0 },
      { id: 2, xp: 0, routineId: null, lastXpDate: null, unlocked: false, evolved: false, petXp: 0, petLevel: 0 },
    ],
  });
}

function pushedRows() {
  const call = upsertMock.mock.calls.at(-1);
  return call ? call[0] : [];
}

describe('userEggService: cross-account egg leak', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await AsyncStorage.clear();
    userEggsRows = [];
    routinesRows = [];
    upsertMock.mockResolvedValue({ error: null });
    fromMock.mockImplementation(mockFrom);
    useEggStore.setState({ eggs: [] });
  });

  it('NO atribuye rutinas de otra cuenta al usuario nuevo', async () => {
    // User B signs in on a device that still holds user A's eggs.
    seedStaleStoreFromUserA();
    routinesRows = []; // la rutina de A no pertenece a B

    await syncEggsWithCloud(USER_B);

    const rows = pushedRows();
    expect(rows.length).toBeGreaterThan(0);
    for (const row of rows) {
      expect(row.routine_id).not.toBe(ROUTINE_A);
    }
    expect(rows.find((r: any) => r.egg_id === 1).routine_id).toBeNull();
  });

  it('conserva el routine_id cuando la rutina SÍ pertenece al usuario', async () => {
    seedStaleStoreFromUserA();
    routinesRows = [{ id: ROUTINE_A }];

    await syncEggsWithCloud(USER_B);

    expect(pushedRows().find((r: any) => r.egg_id === 1).routine_id).toBe(ROUTINE_A);
  });

  it('resetEggStoreForUserChange borra los huevos de la cuenta anterior', () => {
    seedStaleStoreFromUserA();

    resetEggStoreForUserChange();

    const eggs = useEggStore.getState().eggs;
    expect(eggs.length).toBeGreaterThan(0);
    expect(eggs.every((e) => e.routineId === null)).toBe(true);
    expect(eggs.every((e) => e.xp === 0)).toBe(true);
  });

  it('la migración corre una vez por usuario, no una vez por dispositivo', async () => {
    seedStaleStoreFromUserA();
    routinesRows = [{ id: ROUTINE_A }];

    await syncEggsWithCloud(USER_A);
    const afterA = upsertMock.mock.calls.length;

    // B entra después en el mismo dispositivo: debe poder migrar también.
    seedStaleStoreFromUserA();
    routinesRows = [{ id: ROUTINE_A }];
    await syncEggsWithCloud(USER_B);

    expect(upsertMock.mock.calls.length).toBeGreaterThan(afterA);
    expect(pushedRows()[0].user_id).toBe(USER_B);
  });

  it('no pisa un routine_id remoto válido durante la migración', async () => {
    routinesRows = [{ id: ROUTINE_A }];
    seedStaleStoreFromUserA();

    await syncEggsWithCloud(USER_B);

    const egg1 = pushedRows().find((r: any) => r.egg_id === 1);
    expect(egg1.routine_id).toBe(ROUTINE_A);
    expect(egg1.user_id).toBe(USER_B);
  });
});