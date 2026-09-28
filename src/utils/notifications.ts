import i18n from '@/src/config/i18n';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { supabase } from '../lib/supabase';
import { requestNotificationPermissions } from '../lib/notificationService';
import { ENTITLEMENT_ID } from './purchases';

const isExpoGo = Constants.appOwnership === 'expo';
let Notifications: any = {};
if (!isExpoGo) {
  Notifications = require('expo-notifications');
} else {
  Notifications = {
    setNotificationHandler: () => {},
    getPermissionsAsync: async () => ({ status: 'undetermined' }),
    requestPermissionsAsync: async () => ({ status: 'undetermined' }),
    scheduleNotificationAsync: async () => {},
    cancelScheduledNotificationAsync: async () => {},
    cancelAllScheduledNotificationsAsync: async () => {},
    getAllScheduledNotificationsAsync: async () => [],
    setNotificationChannelAsync: async () => {},
    AndroidImportance: { HIGH: 4, MAX: 5, DEFAULT: 3 },
    AndroidNotificationPriority: { HIGH: 'high', MAX: 'max', DEFAULT: 'default' },
    SchedulableTriggerInputTypes: { DAILY: 'daily', WEEKLY: 'weekly', TIME_INTERVAL: 'timeInterval', DATE: 'date' }
  };
}

// Re-export for backward compatibility
export { requestNotificationPermissions };

// NOTE: setNotificationHandler is configured once in notificationService.ts
// No need to call it again here.

interface NotificationMessage {
  title: string;
  body: string;
}

/**
 * Verifica si los permisos de notificación están otorgados
 */
export async function checkNotificationPermissions(): Promise<boolean> {
  try {
    const { status } = await Notifications.getPermissionsAsync();
    return status === 'granted';
  } catch (error) {
    console.error('Error checking notification permissions:', error);
    return false;
  }
}

/**
 * Envía una notificación personalizada sobre la racha
 */
export async function sendStreakNotification(streakCount: number): Promise<void> {
  try {
    const hasPermissions = await checkNotificationPermissions();
    if (!hasPermissions) return;

    let message: NotificationMessage;

    if (streakCount === 1) {
      message = {
        title: i18n.t('notifications.streak.first_title'),
        body: i18n.t('notifications.streak.first_body'),
      };
    } else if (streakCount === 7) {
      message = {
        title: i18n.t('notifications.streak.week_title'),
        body: i18n.t('notifications.streak.week_body'),
      };
    } else if (streakCount === 30) {
      message = {
        title: i18n.t('notifications.streak.month_title'),
        body: i18n.t('notifications.streak.month_body'),
      };
    } else if (streakCount % 7 === 0) {
      message = {
        title: i18n.t('notifications.streak.multiple_title', { count: streakCount }),
        body: i18n.t('notifications.streak.multiple_body'),
      };
    } else {
      return; // No enviar notificación para otros días
    }

    await Notifications.scheduleNotificationAsync({
      content: {
        title: message.title,
        body: message.body,
        sound: true,
        priority: Notifications.AndroidNotificationPriority.MAX,
      },
      trigger: null, // Enviar inmediatamente
    });

    console.log(`✅ Streak milestone notification sent: ${streakCount} days`);
  } catch (error) {
    console.error('Error sending streak notification:', error);
  }
}

/**
 * Schedule a push notification to remind the user their trial is ending.
 * Fires 2 days before the trial expires.
 * 
 * @param trialDays Total trial length in days (e.g., 14)
 */
export async function scheduleTrialExpirationNotification(
  trialDays: number
): Promise<void> {
  try {
    const hasPermissions = await checkNotificationPermissions();
    if (!hasPermissions) return;

    // Cancel any existing trial notification first
    try {
      await Notifications.cancelScheduledNotificationAsync('smartlist-trial-expiration');
    } catch {
      // Ignore if not found
    }

    const reminderDays = trialDays - 2; // Fire 2 days before expiration
    if (reminderDays <= 0) return; // Trial too short for a reminder

    const seconds = reminderDays * 24 * 60 * 60;

    await Notifications.scheduleNotificationAsync({
      identifier: 'smartlist-trial-expiration',
      content: {
        title: i18n.t('notifications.trial_expiration.title'),
        body: i18n.t('notifications.trial_expiration.body'),
        sound: undefined,
        priority: Notifications.AndroidNotificationPriority.HIGH,
        data: { type: 'trial_expiration' },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds,
        repeats: false,
      },
    });

    console.log(`✅ Trial expiration notification scheduled for ${reminderDays} days from now`);
  } catch (error) {
    console.error('Error scheduling trial expiration notification:', error);
  }
}

const STREAK_WARNING_ID = 'brainy-streak-warning';

/**
 * Programa una notificación para mañana a las 20:00 recordando al usuario
 * que su racha está en peligro si no abre la app ese día.
 * Debe llamarse cada vez que el usuario registra su racha del día.
 */
export async function scheduleStreakWarningNotification(streak: number): Promise<void> {
  try {
    const hasPermissions = await checkNotificationPermissions();
    if (!hasPermissions) return;

    // Cancel any existing warning first
    try {
      await Notifications.cancelScheduledNotificationAsync(STREAK_WARNING_ID);
    } catch {
      // Ignore if not found
    }

    // Schedule for tomorrow at 20:00 local time
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(20, 0, 0, 0);

    await Notifications.scheduleNotificationAsync({
      identifier: STREAK_WARNING_ID,
      content: {
        title: i18n.t('notifications.streak_warning.title'),
        body: i18n.t('notifications.streak_warning.body', { count: streak }),
        sound: undefined,
        priority: Notifications.AndroidNotificationPriority.HIGH,
        data: { type: 'streak_warning' },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: tomorrow,
      },
    });

    console.log(`✅ Streak warning scheduled for tomorrow at 20:00 (streak: ${streak})`);
  } catch (error) {
    console.error('Error scheduling streak warning notification:', error);
  }
}

/**
 * Cancela la notificación de advertencia de racha.
 * Llamar cuando el usuario abre la app y su racha queda registrada para hoy.
 */
export async function cancelStreakWarningNotification(): Promise<void> {
  try {
    await Notifications.cancelScheduledNotificationAsync(STREAK_WARNING_ID);
  } catch {
    // Ignore if not found
  }
}

/**
 * Register the current device's push token in Supabase for the given user.
 * Does nothing if notification permissions haven't been granted.
 */
export async function registerPushToken(userId: string): Promise<void> {
  if (isExpoGo) return;

  try {
    const hasPermissions = await checkNotificationPermissions();
    if (!hasPermissions) return;

    const token = await Notifications.getExpoPushTokenAsync();

    const { error } = await supabase
      .from('user_push_tokens')
      .upsert(
        { user_id: userId, token: token.data },
        { onConflict: 'user_id' },
      );

    if (error) {
      console.error('Error upserting push token:', error);
    }
  } catch (error) {
    console.error('Error registering push token:', error);
  }
}

/**
 * Called whenever customer info is refreshed.
 * 1. Registers / refreshes the device push token.
 * 2. If the user has a trial ending in ~2 days, sends a push notification
 *    via the send-trial-reminder Edge Function and also schedules a local
 *    notification as backup.
 *
 * Uses AsyncStorage to avoid sending the same reminder multiple times per
 * trial period.
 */
export async function syncPushTokenAndCheckTrial(
  customerInfo: any,
): Promise<void> {
  if (isExpoGo) return;

  try {
    // Get the current user from Supabase session
    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData?.session?.user?.id;
    if (!userId) return;

    // 1. Register push token (non-blocking)
    await registerPushToken(userId);

    // 2. Check trial status from RevenueCat customer info
    const entitlement =
      customerInfo?.entitlements?.active?.[ENTITLEMENT_ID];
    if (!entitlement) return;

    const isTrial =
      entitlement.periodType === 'TRIAL' ||
      entitlement.periodType === 'INTRO';
    if (!isTrial || !entitlement.expirationDate) return;

    const expirationDate = new Date(entitlement.expirationDate);
    const now = new Date();
    const daysRemaining = Math.ceil(
      (expirationDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
    );

    // Only remind between 1 and 3 days before expiration
    if (daysRemaining < 1 || daysRemaining > 3) return;

    // 3. Debounce: only send once per trial period
    const reminderKey = `@trial_reminder_sent_${userId}_${entitlement.expirationDate}`;
    const alreadySent = await AsyncStorage.getItem(reminderKey);
    if (alreadySent) return;

    // 4. Send push via Edge Function
    const { error: fnError } = await supabase.functions.invoke(
      'send-trial-reminder',
      {
        body: {
          title: i18n.t('notifications.trial_expiration.title'),
          body: i18n.t('notifications.trial_expiration.body'),
          data: { type: 'trial_expiration' },
        },
      },
    );

    if (fnError) {
      console.error('Error invoking send-trial-reminder:', fnError);
    }

    // 5. Mark as sent (key includes expiration date, so it resets per trial)
    await AsyncStorage.setItem(reminderKey, 'true');

    // 6. Schedule local notification as backup
    await scheduleTrialExpirationNotification(daysRemaining);

    console.log(
      `✅ Trial reminder sent for user ${userId} (${daysRemaining} days remaining)`,
    );
  } catch (error) {
    console.error('Error in syncPushTokenAndCheckTrial:', error);
  }
}

export default {
  requestNotificationPermissions,
  checkNotificationPermissions,
  sendStreakNotification,
  scheduleTrialExpirationNotification,
  scheduleStreakWarningNotification,
  cancelStreakWarningNotification,
  registerPushToken,
  syncPushTokenAndCheckTrial,
};
