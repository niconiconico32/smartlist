import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';

const ACTIVITIES_STORAGE_KEY = '@smartlist_activities';

export async function getCachedActivities(): Promise<any[]> {
  try {
    const localStored = await AsyncStorage.getItem(ACTIVITIES_STORAGE_KEY);
    if (!localStored) return [];
    const parsed = JSON.parse(localStored);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Loads activities from the cloud if the user is logged in, 
 * otherwise fallback to local AsyncStorage.
 * It also handles merging if cloud is missing but local exists.
 */
export async function fetchActivitiesFromCloud(
  cachedActivities?: any[],
): Promise<any[]> {
  try {
    const [{ data: { session } }, localActivities] = await Promise.all([
      supabase.auth.getSession(),
      cachedActivities ? Promise.resolve(cachedActivities) : getCachedActivities(),
    ]);
    const user = session?.user;

    // If not logged in, just return local
    if (!user) {
      return localActivities;
    }

    // If logged in, fetch from `user_state`
    const { data, error } = await supabase
      .from('user_state')
      .select('activities')
      .eq('user_id', user.id)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 is "Row not found", which is fine for new users
      console.error('Error fetching activities from cloud:', error.message);
      return localActivities;
    }

    if (data && data.activities) {
      // Cloud has data! Sync it down to local to stay fast for next load
      await AsyncStorage.setItem(ACTIVITIES_STORAGE_KEY, JSON.stringify(data.activities));
      return data.activities;
    } else {
      // Cloud has NO data. If we have local data, push it up now to initialize.
      if (localActivities.length > 0) {
        await syncActivitiesToCloud(localActivities);
      }
      return localActivities;
    }

  } catch (error) {
    console.error('fetchActivitiesFromCloud error:', error);
    // Always fallback to local storage so UI doesn't break
    return cachedActivities ?? getCachedActivities();
  }
}

/**
 * Saves activities to Async storage immediately for snappy UI,
 * then silently syncs them to Supabase `user_state`.
 * Use this for explicit, immediate syncs (e.g. clearAll, initial push).
 */
export async function syncActivitiesToCloud(activities: any[]): Promise<void> {
  try {
    // 1. Save locally IMMEDIATELY (offline support & fast UI)
    await AsyncStorage.setItem(ACTIVITIES_STORAGE_KEY, JSON.stringify(activities));

    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;

    // 2. If logged in, sync to cloud in background
    if (user) {
      const { error } = await supabase
        .from('user_state')
        .upsert({ 
          user_id: user.id, 
          activities: activities 
        }, { onConflict: 'user_id' }); // Requires user_id to be unique primary key, which it is

      if (error) {
        console.error('Error syncing activities TO cloud:', error.message);
      }
    }
  } catch (error) {
    console.error('syncActivitiesToCloud Error:', error);
  }
}

// ─── Debounced cloud sync (for high-frequency saves) ─────────────────────────

let _syncTimer: ReturnType<typeof setTimeout> | null = null;
let _pendingActivities: any[] | null = null;

async function _flushSync() {
  if (!_pendingActivities) return;
  const activities = _pendingActivities;
  _pendingActivities = null;

  try {
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;

    if (user) {
      const { error } = await supabase
        .from('user_state')
        .upsert(
          { user_id: user.id, activities },
          { onConflict: 'user_id' },
        );
      if (error) {
        console.error('Error syncing activities TO cloud:', error.message);
      }
    }
  } catch (error) {
    console.error('debouncedSyncToCloud flush error:', error);
  }
}

/**
 * Saves activities to AsyncStorage immediately, then debounces the
 * Supabase upload by 3 seconds. Ideal for high-frequency state updates
 * (e.g. toggling tasks in a useEffect).
 */
export function debouncedSyncToCloud(activities: any[]): void {
  // Local save is immediate — never debounce this
  AsyncStorage.setItem(ACTIVITIES_STORAGE_KEY, JSON.stringify(activities)).catch(
    () => {},
  );

  // Debounce the cloud upload
  _pendingActivities = activities;
  if (_syncTimer) clearTimeout(_syncTimer);
  _syncTimer = setTimeout(() => {
    _syncTimer = null;
    _flushSync();
  }, 3000);
}
