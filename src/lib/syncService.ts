import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';

const ACTIVITIES_STORAGE_KEY = '@smartlist_activities';

/**
 * Loads activities from the cloud if the user is logged in, 
 * otherwise fallback to local AsyncStorage.
 * It also handles merging if cloud is missing but local exists.
 */
export async function fetchActivitiesFromCloud(): Promise<any[]> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;

    // Grab local activities as a baseline
    const localStored = await AsyncStorage.getItem(ACTIVITIES_STORAGE_KEY);
    const localActivities = localStored ? JSON.parse(localStored) : [];

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
    const localStored = await AsyncStorage.getItem(ACTIVITIES_STORAGE_KEY);
    return localStored ? JSON.parse(localStored) : [];
  }
}

/**
 * Saves activities to Async storage immediately for snappy UI,
 * then silently syncs them to Supabase `user_state`.
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
