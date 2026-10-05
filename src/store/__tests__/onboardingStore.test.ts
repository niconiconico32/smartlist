// Regression suite for the server-side `onboarding_completed` flag.
//
// The login funnel lets a brand-new user finish the questionnaire with NO
// session, so completeOnboarding() has no user to write to. The flag must
// survive that and reach the server as soon as a session exists — otherwise a
// reinstalled user who later signs in with Google/Apple/email is sent through
// the whole onboarding again, because AsyncStorage no longer has the local flag
// and user_metadata.onboarding_completed was never written.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/src/lib/supabase';

import { useOnboardingStore } from '../onboardingStore';

const PROGRESS_KEY = 'onboarding_progress';
const COMPLETE_KEY = 'onboarding_complete';
const SERVER_SYNCED_KEY = 'onboarding_server_synced';

const getSessionMock = supabase.auth.getSession as jest.Mock;
const updateUserMock = supabase.auth.updateUser as jest.Mock;

function withSession() {
  getSessionMock.mockResolvedValue({ data: { session: { user: { id: 'anon-1' } } } });
}

function withoutSession() {
  getSessionMock.mockResolvedValue({ data: { session: null } });
}

describe('Store: onboardingStore — onboarding_completed sync', () => {
  const initialState = useOnboardingStore.getState();

  beforeEach(async () => {
    useOnboardingStore.setState(initialState, true);
    jest.clearAllMocks();
    await AsyncStorage.clear();
    withoutSession();
    updateUserMock.mockResolvedValue({ error: null });
  });

  describe('syncCompletedToServer()', () => {
    it('no marca como completado a un usuario que no terminó el onboarding', async () => {
      const synced = await useOnboardingStore.getState().syncCompletedToServer();

      expect(synced).toBe(false);
      expect(updateUserMock).not.toHaveBeenCalled();
    });

    it('no empuja nada si no hay sesión (usuario nuevo dentro del onboarding)', async () => {
      await AsyncStorage.setItem(COMPLETE_KEY, 'true');
      withoutSession();

      const synced = await useOnboardingStore.getState().syncCompletedToServer();

      expect(synced).toBe(false);
      expect(updateUserMock).not.toHaveBeenCalled();
      // Nada se marca como sincronizado: sigue pendiente.
      expect(await AsyncStorage.getItem(SERVER_SYNCED_KEY)).toBeNull();
    });

    it('empuja onboarding_completed cuando hay sesión', async () => {
      await AsyncStorage.setItem(COMPLETE_KEY, 'true');
      withSession();

      const synced = await useOnboardingStore.getState().syncCompletedToServer();

      expect(synced).toBe(true);
      expect(updateUserMock).toHaveBeenCalledWith({
        data: { onboarding_completed: true },
      });
      expect(await AsyncStorage.getItem(SERVER_SYNCED_KEY)).toBe('true');
    });

    it('reintenta y sincroniza cuando la sesión aparece después', async () => {
      await AsyncStorage.setItem(COMPLETE_KEY, 'true');
      withoutSession();

      // El intento sin sesión falla y queda pendiente.
      expect(await useOnboardingStore.getState().syncCompletedToServer()).toBe(false);
      expect(updateUserMock).not.toHaveBeenCalled();

      // Llega la sesión (el usuario nuevo termina el onboarding).
      withSession();
      expect(await useOnboardingStore.getState().syncCompletedToServer()).toBe(true);
      expect(updateUserMock).toHaveBeenCalledTimes(1);
    });

    it('reintenta tras un fallo de red en updateUser', async () => {
      await AsyncStorage.setItem(COMPLETE_KEY, 'true');
      withSession();
      updateUserMock.mockResolvedValueOnce({ error: { message: 'offline' } });

      expect(await useOnboardingStore.getState().syncCompletedToServer()).toBe(false);
      expect(await AsyncStorage.getItem(SERVER_SYNCED_KEY)).toBeNull();

      // Segundo intento, ya con red.
      expect(await useOnboardingStore.getState().syncCompletedToServer()).toBe(true);
      expect(updateUserMock).toHaveBeenCalledTimes(2);
      expect(await AsyncStorage.getItem(SERVER_SYNCED_KEY)).toBe('true');
    });

    it('no vuelve a llamar a updateUser cuando el servidor ya confirmó', async () => {
      await AsyncStorage.setItem(COMPLETE_KEY, 'true');
      await AsyncStorage.setItem(SERVER_SYNCED_KEY, 'true');
      withSession();

      expect(await useOnboardingStore.getState().syncCompletedToServer()).toBe(true);
      expect(updateUserMock).not.toHaveBeenCalled();
    });

    it('no escribe nada cuando getSession lanza', async () => {
      await AsyncStorage.setItem(COMPLETE_KEY, 'true');
      getSessionMock.mockRejectedValueOnce(new Error('boom'));

      expect(await useOnboardingStore.getState().syncCompletedToServer()).toBe(false);
      expect(updateUserMock).not.toHaveBeenCalled();
    });
  });

  describe('completeOnboarding()', () => {
    it('deja el flag pendiente en el servidor cuando no hay sesión', async () => {
      withoutSession();
      await AsyncStorage.setItem(PROGRESS_KEY, JSON.stringify({ currentSlide: 4 }));

      await useOnboardingStore.getState().completeOnboarding();

      // El estado local sí queda completo...
      expect(useOnboardingStore.getState().isOnboardingComplete).toBe(true);
      expect(await AsyncStorage.getItem(COMPLETE_KEY)).toBe('true');
      expect(await AsyncStorage.getItem(PROGRESS_KEY)).toBeNull();
      // ...pero el servidor no se tocó todavía.
      expect(updateUserMock).not.toHaveBeenCalled();
      expect(await AsyncStorage.getItem(SERVER_SYNCED_KEY)).toBeNull();
    });

    it('termina el flujo: completa sin sesión y sincroniza en el siguiente intento', async () => {
      withoutSession();
      await useOnboardingStore.getState().completeOnboarding();

      // El _layout dispara syncCompletedToServer() cuando aparece la sesión.
      withSession();
      const synced = await useOnboardingStore.getState().syncCompletedToServer();

      expect(synced).toBe(true);
      expect(updateUserMock).toHaveBeenCalledWith({
        data: { onboarding_completed: true },
      });
    });

    it('escribe directo al servidor cuando ya hay sesión', async () => {
      withSession();

      await useOnboardingStore.getState().completeOnboarding();

      expect(updateUserMock).toHaveBeenCalledWith({
        data: { onboarding_completed: true },
      });
      expect(await AsyncStorage.getItem(SERVER_SYNCED_KEY)).toBe('true');
    });

    it('vuelve a intentar si un completeOnboarding() corrió con una sincronización previa', async () => {
      withSession();
      await AsyncStorage.setItem(SERVER_SYNCED_KEY, 'true');

      await useOnboardingStore.getState().completeOnboarding();

      // La clave se limpia para forzar un push fresco de este finish.
      expect(updateUserMock).toHaveBeenCalledWith({
        data: { onboarding_completed: true },
      });
    });
  });

  describe('loadOnboardingStatus()', () => {
    it('hidrata el estado local desde AsyncStorage', async () => {
      await AsyncStorage.setItem(COMPLETE_KEY, 'true');

      await useOnboardingStore.getState().loadOnboardingStatus();

      expect(useOnboardingStore.getState().isOnboardingComplete).toBe(true);
    });
  });
});