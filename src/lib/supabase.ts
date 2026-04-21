import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import 'react-native-url-polyfill/auto';

// ─── Secure Storage Adapter ───────────────────────────────────────────────────
// Uses expo-secure-store for encrypted token persistence on device.
// Falls back to noop on web where SecureStore is unavailable.

const SecureStoreAdapter = {
  getItem: async (key: string): Promise<string | null> => {
    if (Platform.OS === 'web') return null;
    return SecureStore.getItemAsync(key);
  },
  setItem: async (key: string, value: string): Promise<void> => {
    if (Platform.OS === 'web') return;
    await SecureStore.setItemAsync(key, value);
  },
  removeItem: async (key: string): Promise<void> => {
    if (Platform.OS === 'web') return;
    await SecureStore.deleteItemAsync(key);
  },
};

// ─── Supabase Client ──────────────────────────────────────────────────────────

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

// Validate at module level without throwing — a top-level throw poisons the
// entire module dependency tree (AuthContext → _layout → ErrorBoundary = undefined).
// Invalid config surfaces as an auth/network error at runtime instead.
if (__DEV__ && (!supabaseUrl || !supabaseAnonKey)) {
  console.error(
    '[Supabase] Missing environment variables. ' +
    'Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in your .env file.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: SecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
