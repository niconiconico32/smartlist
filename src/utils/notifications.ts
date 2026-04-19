import Constants from 'expo-constants';
import { requestNotificationPermissions } from '../lib/notificationService';

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
        title: '🎉 ¡Primera racha!',
        body: 'Has empezado tu viaje. Mañana será el día 2. ¡Sigue así!',
      };
    } else if (streakCount === 7) {
      message = {
        title: '🔥 ¡Una semana completa!',
        body: '7 días seguidos. Esto ya es un hábito. Increíble.',
      };
    } else if (streakCount === 30) {
      message = {
        title: '🏆 ¡UN MES ENTERO!',
        body: '30 días. Ya eres otra persona. Esto es transformación real.',
      };
    } else if (streakCount % 7 === 0) {
      message = {
        title: `🔥 ${streakCount} días seguidos`,
        body: 'Tu consistencia es inspiradora. Sigue adelante.',
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
        title: '✨ ¿Te está gustando Brainy?',
        body: 'Tu prueba premium termina en 2 días. ¡Sigue organizando tu vida sin límites!',
        sound: 'default',
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
        title: '¡Salva tu racha!',
        body: `Si hoy no hay energía, no pasa nada 💙. Pero si te quedan 2 minutos de batería, presiona acá para salvar tu racha de ${streak} día${streak === 1 ? '' : 's'}.`,
        sound: 'default',
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

export default {
  requestNotificationPermissions,
  checkNotificationPermissions,
  sendStreakNotification,
  scheduleTrialExpirationNotification,
  scheduleStreakWarningNotification,
  cancelStreakWarningNotification,
};
