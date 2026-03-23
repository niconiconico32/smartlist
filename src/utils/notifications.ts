/**
 * 🔔 Brainy Notification System
 * 
 * Sistema de notificaciones motivacionales diseñado para ADHD.
 * Estrategia: "Compañero de Bolsillo" - La mascota envía mensajes como un amigo.
 * 
 * 🎯 Principios:
 * - Curiosidad + Dopamina + Empatía
 * - NO órdenes, SÍ invitaciones
 * - Prevenir parálisis por análisis
 * - Proteger la racha (loss aversion positiva)
 */

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

// ============================================================================
// MOTIVATIONAL MESSAGES
// ============================================================================

interface NotificationMessage {
  title: string;
  body: string;
}

/**
 * 🌅 MAÑANA: El "Arranque Suave" (Low Friction)
 * Objetivo: Que abran la app sin sentir presión.
 */
const MORNING_MESSAGES: NotificationMessage[] = [
  {
    title: '☕ Buenos días',
    body: 'Solo mira tu lista. No tienes que hacer nada todavía. Solo mira.',
  },
  {
    title: '🚀 Despeguemos',
    body: '¿Cuál es esa tarea pequeña que te hará sentir invencible hoy?',
  },
  {
    title: '🧠 Tu cerebro está fresco',
    body: 'Aprovechemos esta energía. Una victoria rápida y listo.',
  },
  {
    title: '✨ El secreto de hoy',
    body: 'No se trata de hacerlo todo. Se trata de empezar algo.',
  },
  {
    title: '🔓 Desbloquea tu día',
    body: 'Tu racha te está esperando para crecer.',
  },
  {
    title: '🌟 Hoy es tu día',
    body: 'Una tarea pequeña puede cambiar toda tu jornada. ¿Empezamos?',
  },
  {
    title: '💪 El impulso está aquí',
    body: 'No necesitas motivación. Solo necesitas el primer paso.',
  },
];

/**
 * 🥪 MEDIODÍA: El "Rescate de Enfoque" (Anti-Parálisis)
 * Objetivo: Romper la parálisis por análisis o el doom scrolling.
 */
const AFTERNOON_MESSAGES: NotificationMessage[] = [
  {
    title: '¿Te sientes atascado?',
    body: 'Usa el botón mágico ✨. Deja que la IA divida esa tarea pesada por ti.',
  },
  {
    title: '⏸️ Pausa estratégica',
    body: 'Respira. Bebe agua. Tacha una sola cosa. Sigue.',
  },
  {
    title: '👀 Oye...',
    body: 'Esa tarea pendiente te está robando RAM mental. Sácala de tu cabeza.',
  },
  {
    title: '🎮 Gamifica tu tarde',
    body: 'Reto de 5 minutos: ¿Cuántas subtareas puedes eliminar antes de que acabe la hora?',
  },
  {
    title: '🔄 Reset mental',
    body: 'Cierra los ojos 10 segundos. Ahora abre Brainy y conquista UNA cosa.',
  },
  {
    title: '⚡ Micro-acción',
    body: 'No pienses en terminar. Solo en empezar 2 minutos.',
  },
  {
    title: '🎯 Enfoque láser',
    body: 'Una tarea. Un timer. Sin distracciones. Tú puedes.',
  },
];

/**
 * 🌙 NOCHE: El "Guardián de la Racha" (Loss Aversion Positiva)
 * Objetivo: Que entren para marcar lo hecho y asegurar su racha.
 */
const EVENING_MESSAGES: NotificationMessage[] = [
  {
    title: '🔥 ¡No rompas la cadena!',
    body: 'Entra 10 segundos y salva tu progreso del día.',
  },
  {
    title: '🛡️ Protege tu racha',
    body: 'Has trabajado duro para llegar hasta aquí. Ciérralo con broche de oro.',
  },
  {
    title: '😴 Antes de desconectar...',
    body: 'Descarga tu mente en Brainy. Dormirás mejor sin pendientes en la cabeza.',
  },
  {
    title: '🏅 Recuento final',
    body: '¿Hiciste algo hoy que olvidaste marcar? Que cuente.',
  },
  {
    title: '💤 Cierra el día',
    body: 'Marca lo que hiciste hoy. Tu yo de mañana te lo agradecerá.',
  },
  {
    title: '🌟 Último check',
    body: 'Aunque no hayas terminado todo, celebra lo que SÍ hiciste.',
  },
  {
    title: '✅ Revisa tu día',
    body: 'Pequeñas victorias son victorias. Márcalas antes de dormir.',
  },
];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Obtiene un mensaje aleatorio de un array
 */
function getRandomMessage(messages: NotificationMessage[]): NotificationMessage {
  const randomIndex = Math.floor(Math.random() * messages.length);
  return messages[randomIndex];
}

/**
 * Obtiene el identificador de notificación basado en el tipo
 */
function getNotificationId(type: 'morning' | 'afternoon' | 'evening'): string {
  return `smartlist-${type}-notification`;
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

// ============================================================================
// SCHEDULING FUNCTIONS
// ============================================================================

/**
 * Programa una notificación diaria a una hora específica
 */
async function scheduleDailyNotification(
  hour: number,
  minute: number,
  message: NotificationMessage,
  identifier: string
): Promise<void> {
  try {
    await Notifications.scheduleNotificationAsync({
      identifier,
      content: {
        title: message.title,
        body: message.body,
        sound: true,
        priority: Notifications.AndroidNotificationPriority.HIGH,
        data: { type: identifier },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour,
        minute,
      },
    });

    console.log(`✅ Scheduled ${identifier} at ${hour}:${minute.toString().padStart(2, '0')}`);
  } catch (error) {
    console.error(`Error scheduling ${identifier}:`, error);
  }
}

/**
 * 🎯 FUNCIÓN PRINCIPAL: Programa todas las notificaciones diarias
 * 
 * Cancela todas las notificaciones anteriores y programa 3 nuevas:
 * - 09:00 AM - Mensaje matutino (arranque suave)
 * - 02:00 PM - Mensaje de mediodía (rescate de enfoque)
 * - 08:00 PM - Mensaje nocturno (guardián de racha)
 * 
 * Cada vez que se ejecuta, selecciona mensajes aleatorios.
 */
export async function scheduleDailyNotifications(): Promise<void> {
  try {
    console.log('📅 Scheduling daily motivational notifications...');

    // 1. Verificar permisos
    const hasPermissions = await checkNotificationPermissions();
    if (!hasPermissions) {
      console.log('⚠️ No notification permissions. Requesting...');
      const granted = await requestNotificationPermissions();
      if (!granted) {
        console.log('❌ Cannot schedule notifications without permissions');
        return;
      }
    }

    // 2. Cancelar todas las notificaciones programadas anteriormente
    await cancelAllScheduledNotifications();

    // 3. Seleccionar mensajes aleatorios
    const morningMessage = getRandomMessage(MORNING_MESSAGES);
    const afternoonMessage = getRandomMessage(AFTERNOON_MESSAGES);
    const eveningMessage = getRandomMessage(EVENING_MESSAGES);

    // 4. Programar nuevas notificaciones
    await scheduleDailyNotification(
      9,  // 09:00 AM
      0,
      morningMessage,
      getNotificationId('morning')
    );

    await scheduleDailyNotification(
      14, // 02:00 PM
      0,
      afternoonMessage,
      getNotificationId('afternoon')
    );

    await scheduleDailyNotification(
      20, // 08:00 PM
      0,
      eveningMessage,
      getNotificationId('evening')
    );

    console.log('✅ All daily notifications scheduled successfully!');
  } catch (error) {
    console.error('❌ Error scheduling daily notifications:', error);
  }
}

/**
 * Cancela solo las notificaciones motivacionales (smartlist-*)
 * No toca las notificaciones de rutinas (routine_*) ni tareas (task_*)
 */
export async function cancelAllScheduledNotifications(): Promise<void> {
  try {
    const allNotifications = await Notifications.getAllScheduledNotificationsAsync();
    const smartlistNotifications = allNotifications.filter((n: any) =>
      n.identifier.startsWith('smartlist-')
    );

    for (const notification of smartlistNotifications) {
      await Notifications.cancelScheduledNotificationAsync(notification.identifier);
    }

    console.log(`🗑️ ${smartlistNotifications.length} motivational notifications cancelled`);
  } catch (error) {
    console.error('Error cancelling notifications:', error);
  }
}

/**
 * Obtiene todas las notificaciones programadas (para debugging)
 */
export async function getScheduledNotifications(): Promise<any[]> {
  try {
    const notifications = await Notifications.getAllScheduledNotificationsAsync();
    console.log(`📋 Currently scheduled notifications: ${notifications.length}`);
    return notifications;
  } catch (error) {
    console.error('Error getting scheduled notifications:', error);
    return [];
  }
}

/**
 * Envía una notificación de prueba inmediata
 */
export async function sendTestNotification(): Promise<void> {
  try {
    const testMessage = getRandomMessage(MORNING_MESSAGES);
    
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '🧪 ' + testMessage.title,
        body: testMessage.body,
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: 2,
      },
    });

    console.log('✅ Test notification scheduled for 2 seconds');
  } catch (error) {
    console.error('Error sending test notification:', error);
  }
}

// ============================================================================
// STREAK SPECIFIC NOTIFICATIONS
// ============================================================================

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
 * Programa una notificación de advertencia de racha (si no han completado nada)
 * Se programa para 9 PM si no hay actividad ese día
 */
export async function scheduleStreakWarningNotification(): Promise<void> {
  try {
    const hasPermissions = await checkNotificationPermissions();
    if (!hasPermissions) return;

    await Notifications.scheduleNotificationAsync({
      identifier: 'smartlist-streak-warning',
      content: {
        title: '⚠️ Tu racha está en riesgo',
        body: '¡No la pierdas ahora! Abre la app y marca aunque sea una tarea.',
        sound: true,
        priority: Notifications.AndroidNotificationPriority.HIGH,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: 21, // 9 PM
        minute: 0,
      },
    });

    console.log('✅ Streak warning notification scheduled for 9 PM');
  } catch (error) {
    console.error('Error scheduling streak warning:', error);
  }
}

// ============================================================================
// TRIAL EXPIRATION NOTIFICATIONS
// ============================================================================

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

export default {
  requestNotificationPermissions,
  checkNotificationPermissions,
  scheduleDailyNotifications,
  cancelAllScheduledNotifications,
  getScheduledNotifications,
  sendTestNotification,
  sendStreakNotification,
  scheduleStreakWarningNotification,
  scheduleTrialExpirationNotification,
};
