import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

// Configurar cómo se muestran las notificaciones cuando la app está abierta
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// Mapeo de días a weekday de expo-notifications (1=Domingo, 2=Lunes, etc.)
const DAY_TO_WEEKDAY: Record<string, number> = {
  Dom: 1,
  Lun: 2,
  Mar: 3,
  Mié: 4,
  Jue: 5,
  Vie: 6,
  Sáb: 7,
};

// Mensajes motivacionales para las notificaciones
const NOTIFICATION_MESSAGES = [
  "¡Es hora de tu rutina! 💪",
  "¡Tu rutina te espera! ✨",
  "¡Momento de brillar! 🌟",
  "¡Vamos con todo! 🚀",
  "¡Tu mejor versión te espera! 🎯",
];

interface Routine {
  id: string;
  name: string;
  days: string[];
  reminderEnabled: boolean;
  reminderTime?: string;
}

/**
 * Solicita permisos de notificación al usuario
 * @returns true si los permisos fueron otorgados
 */
export async function requestNotificationPermissions(): Promise<boolean> {
  try {
    const { status: existingStatus } =
      await Notifications.getPermissionsAsync();

    let finalStatus = existingStatus;

    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== "granted") {
      console.log("Permisos de notificación no otorgados");
      return false;
    }

    // Configurar canal de Android
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("routines", {
        name: "Recordatorios de Rutinas",
        description: "Notificaciones para tus rutinas diarias",
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#CBA6F7",
        sound: "default",
        enableVibrate: true,
        enableLights: true,
      });
    }

    return true;
  } catch (error) {
    console.error("Error solicitando permisos:", error);
    return false;
  }
}

/**
 * Genera un identificador único para cada notificación de rutina+día
 */
function getNotificationId(routineId: string, day: string): string {
  return `routine_${routineId}_${day}`;
}

/**
 * Programa los recordatorios para una rutina
 * Crea una notificación recurrente para cada día seleccionado
 */
export async function scheduleRoutineReminders(
  routine: Routine,
): Promise<void> {
  try {
    // Si no tiene recordatorio habilitado, no hacer nada
    if (!routine.reminderEnabled || !routine.reminderTime) {
      return;
    }

    // Primero cancelar las notificaciones existentes de esta rutina
    await cancelRoutineReminders(routine.id);

    // Parsear la hora del recordatorio
    const [hours, minutes] = routine.reminderTime.split(":").map(Number);

    // Obtener un mensaje aleatorio
    const randomMessage =
      NOTIFICATION_MESSAGES[
        Math.floor(Math.random() * NOTIFICATION_MESSAGES.length)
      ];

    // Programar una notificación para cada día seleccionado
    for (const day of routine.days) {
      const weekday = DAY_TO_WEEKDAY[day];

      if (!weekday) {
        console.warn(`Día no reconocido: ${day}`);
        continue;
      }

      const notificationId = getNotificationId(routine.id, day);

      await Notifications.scheduleNotificationAsync({
        identifier: notificationId,
        content: {
          title: routine.name,
          body: randomMessage,
          data: {
            routineId: routine.id,
            type: "routine_reminder",
          },
          sound: "default",
          priority: Notifications.AndroidNotificationPriority.HIGH,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
          weekday: weekday,
          hour: hours,
          minute: minutes,
        },
      });

      console.log(
        `Notificación programada: ${routine.name} - ${day} a las ${routine.reminderTime}`,
      );
    }
  } catch (error) {
    console.error("Error programando notificaciones:", error);
  }
}

/**
 * Cancela todos los recordatorios de una rutina específica
 */
export async function cancelRoutineReminders(routineId: string): Promise<void> {
  try {
    // Obtener todas las notificaciones programadas
    const scheduledNotifications =
      await Notifications.getAllScheduledNotificationsAsync();

    // Filtrar las que pertenecen a esta rutina y cancelarlas
    const routineNotifications = scheduledNotifications.filter((notification) =>
      notification.identifier.startsWith(`routine_${routineId}_`),
    );

    for (const notification of routineNotifications) {
      await Notifications.cancelScheduledNotificationAsync(
        notification.identifier,
      );
      console.log(`Notificación cancelada: ${notification.identifier}`);
    }
  } catch (error) {
    console.error("Error cancelando notificaciones:", error);
  }
}

/**
 * Cancela todas las notificaciones de rutinas
 */
export async function cancelAllRoutineReminders(): Promise<void> {
  try {
    const scheduledNotifications =
      await Notifications.getAllScheduledNotificationsAsync();

    const routineNotifications = scheduledNotifications.filter((notification) =>
      notification.identifier.startsWith("routine_"),
    );

    for (const notification of routineNotifications) {
      await Notifications.cancelScheduledNotificationAsync(
        notification.identifier,
      );
    }

    console.log(
      `${routineNotifications.length} notificaciones de rutinas canceladas`,
    );
  } catch (error) {
    console.error("Error cancelando todas las notificaciones:", error);
  }
}

/**
 * Obtiene todas las notificaciones programadas (para debug)
 */
export async function getScheduledNotifications(): Promise<
  Notifications.NotificationRequest[]
> {
  try {
    return await Notifications.getAllScheduledNotificationsAsync();
  } catch (error) {
    console.error("Error obteniendo notificaciones:", error);
    return [];
  }
}

/**
 * Reprograma todas las notificaciones para una lista de rutinas
 * Útil cuando se sincroniza o restaura datos
 */
export async function rescheduleAllReminders(
  routines: Routine[],
): Promise<void> {
  try {
    // Primero cancelar todas
    await cancelAllRoutineReminders();

    // Luego reprogramar las que tienen recordatorio habilitado
    for (const routine of routines) {
      if (routine.reminderEnabled && routine.reminderTime) {
        await scheduleRoutineReminders(routine);
      }
    }

    console.log("Todas las notificaciones reprogramadas");
  } catch (error) {
    console.error("Error reprogramando notificaciones:", error);
  }
}
