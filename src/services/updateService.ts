import { supabase } from '@/src/lib/supabase';
import * as Application from 'expo-application';
import { Platform } from 'react-native';

// ─── DEV BYPASS ──────────────────────────────────────────────────────────────
// Set to true to disable the force-update gate while developing the screen.
const FORCE_UPDATE_DISABLED = false;

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AppConfigRow {
  min_version: string;
  ios_store_url: string;
  android_store_url: string;
  force_update_message?: string;
}

export interface UpdateCheckResult {
  /** The update is forced and the user must update before using the app */
  forceUpdate: boolean;
  storeUrl: string;
  message: string;
  /** Skip the gate entirely (reviewer bypass or sentinel version) */
  bypass: boolean;
}

// ─── Semantic Version Comparison ─────────────────────────────────────────────

/**
 * Compares two semver strings.
 * Returns -1 if a < b, 0 if a === b, 1 if a > b.
 */
export function compareSemver(a: string, b: string): -1 | 0 | 1 {
  const parse = (v: string) =>
    v
      .replace(/[^0-9.]/g, '') // strip build-metadata suffixes
      .split('.')
      .map((n) => parseInt(n, 10) || 0);

  const [aMajor = 0, aMinor = 0, aPatch = 0] = parse(a);
  const [bMajor = 0, bMinor = 0, bPatch = 0] = parse(b);

  if (aMajor !== bMajor) return aMajor < bMajor ? -1 : 1;
  if (aMinor !== bMinor) return aMinor < bMinor ? -1 : 1;
  if (aPatch !== bPatch) return aPatch < bPatch ? -1 : 1;
  return 0;
}

// ─── Force Update Check ───────────────────────────────────────────────────────

/**
 * Fetches app_config from Supabase and decides whether a force update is needed.
 *
 * Bypass conditions (access always granted):
 *  • min_version === '0.0.0'  → Apple review sentinel
 *  • user has is_reviewer = true in their profile
 */
export async function checkForceUpdate(
  isReviewer = false,
): Promise<UpdateCheckResult> {
  const defaultResult: UpdateCheckResult = {
    forceUpdate: false,
    storeUrl: '',
    message: '',
    bypass: true,
  };

  // Temporarily disabled — flip FORCE_UPDATE_DISABLED to false to re-enable.
  if (FORCE_UPDATE_DISABLED) return defaultResult;

  try {
    const { data, error } = await supabase
      .from('app_config')
      .select('min_version, ios_store_url, android_store_url, force_update_message')
      .limit(1)
      .single<AppConfigRow>();

    if (error || !data) {
      // If we can't reach Supabase, fail open — never block the user.
      console.warn('[UpdateService] Could not fetch app_config:', error?.message);
      return defaultResult;
    }

    const { min_version, ios_store_url, android_store_url, force_update_message } = data;

    // Bypass: sentinel version or reviewer account
    if (min_version === '0.0.0' || isReviewer) {
      return { ...defaultResult, bypass: true };
    }

    const installedVersion =
      Application.nativeApplicationVersion ?? '0.0.0';

    const storeUrl =
      Platform.OS === 'ios' ? ios_store_url : android_store_url;

    const needsUpdate = compareSemver(installedVersion, min_version) === -1;

    return {
      forceUpdate: needsUpdate,
      storeUrl,
      message:
        force_update_message ??
        '¡Tu mascota necesita medicina nueva! Estamos actualizando tu mundo para que sea más estable y divertido.',
      bypass: false,
    };
  } catch (err) {
    console.error('[UpdateService] Unexpected error:', err);
    return defaultResult; // fail open
  }
}

// ─── OTA Update (EAS Update) ──────────────────────────────────────────────────

/**
 * EAS Update handles OTA updates automatically in production builds via the
 * expo-updates runtime — no manual check needed. This function is kept as a
 * no-op so call sites don't need to change.
 */
export async function checkOTAUpdate(): Promise<void> {
  // No-op: expo-updates' built-in background check handles this in production.
}
