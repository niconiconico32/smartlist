import Constants from "expo-constants";
import { Platform } from "react-native";

const isExpoGo = Constants.appOwnership === "expo";
let Notifications: any = {};
if (!isExpoGo) {
  Notifications = require("expo-notifications");
} else {
  Notifications = {
    setNotificationHandler: () => {},
    getPermissionsAsync: async () => ({ status: "undetermined" }),
    requestPermissionsAsync: async () => ({ status: "undetermined" }),
    scheduleNotificationAsync: async () => {},
    cancelScheduledNotificationAsync: async () => {},
    cancelAllScheduledNotificationsAsync: async () => {},
    getAllScheduledNotificationsAsync: async () => [],
    setNotificationChannelAsync: async () => {},
    AndroidImportance: { HIGH: 4, MAX: 5, DEFAULT: 3 },
    AndroidNotificationPriority: { HIGH: "high", MAX: "max", DEFAULT: "default" },
    SchedulableTriggerInputTypes: { DAILY: "daily", WEEKLY: "weekly", TIME_INTERVAL: "timeInterval", DATE: "date" }
  };
}

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
    const routineNotifications = scheduledNotifications.filter((notification: any) =>
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

    const routineNotifications = scheduledNotifications.filter((notification: any) =>
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
  any[]
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

// ============================================================================
// TASK NOTIFICATIONS
// ============================================================================

interface Task {
  id: string;
  title: string;
  emoji?: string;
  scheduledDate?: string; // ISO date string for "once" tasks
  recurrence?: {
    type: "once" | "daily" | "weekly";
    days?: number[]; // 0=Sunday, 1=Monday, etc.
    time?: string; // HH:mm format
  };
  reminder?: {
    enabled: boolean;
    minutesBefore: number;
  };
}

/**
 * Genera un identificador único para notificaciones de tareas
 */
function getTaskNotificationId(taskId: string, day?: string): string {
  return day ? `task_${taskId}_${day}` : `task_${taskId}`;
}

/**
 * Programa recordatorios para una tarea individual
 */
export async function scheduleTaskReminders(task: Task): Promise<void> {
  try {
    // Si no tiene recordatorio habilitado, no hacer nada
    if (!task.reminder?.enabled) {
      return;
    }

    // Cancelar notificaciones anteriores de esta tarea
    await cancelTaskReminders(task.id);

    const minutesBefore = task.reminder.minutesBefore || 15;
    const taskEmoji = task.emoji || "📝";
    const notificationTitle = `${taskEmoji} ${task.title}`;
    const notificationBody = `Tu tarea comienza en ${minutesBefore} minuto${minutesBefore !== 1 ? "s" : ""}`;

    // CASO 1: Tarea de una vez (once) con fecha específica
    if (task.recurrence?.type === "once" && task.scheduledDate) {
      const scheduledDate = new Date(task.scheduledDate);
      const reminderDate = new Date(
        scheduledDate.getTime() - minutesBefore * 60 * 1000,
      );

      // Solo programar si la fecha es futura
      if (reminderDate > new Date()) {
        await Notifications.scheduleNotificationAsync({
          identifier: getTaskNotificationId(task.id),
          content: {
            title: notificationTitle,
            body: notificationBody,
            data: {
              taskId: task.id,
              type: "task_reminder",
            },
            sound: "default",
            priority: Notifications.AndroidNotificationPriority.HIGH,
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: reminderDate,
          },
        });

        console.log(
          `Notificación programada para tarea: ${task.title} - ${reminderDate.toLocaleString()}`,
        );
      }
      return;
    }

    // CASO 2: Tarea diaria con hora específica
    if (task.recurrence?.type === "daily" && task.recurrence.time) {
      const [hours, minutes] = task.recurrence.time.split(":").map(Number);
      const reminderMinute = minutes - minutesBefore;
      let reminderHour = hours;
      let calculatedMinute = reminderMinute;

      // Ajustar si los minutos son negativos
      if (reminderMinute < 0) {
        reminderHour = hours - 1;
        calculatedMinute = 60 + reminderMinute;
        if (reminderHour < 0) {
          reminderHour = 23;
        }
      }

      await Notifications.scheduleNotificationAsync({
        identifier: getTaskNotificationId(task.id),
        content: {
          title: notificationTitle,
          body: notificationBody,
          data: {
            taskId: task.id,
            type: "task_reminder",
          },
          sound: "default",
          priority: Notifications.AndroidNotificationPriority.HIGH,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour: reminderHour,
          minute: calculatedMinute,
        },
      });

      console.log(
        `Notificación diaria programada para tarea: ${task.title} - ${reminderHour}:${calculatedMinute.toString().padStart(2, "0")}`,
      );
      return;
    }

    // CASO 3: Tarea semanal con días y hora específicos
    if (
      task.recurrence?.type === "weekly" &&
      task.recurrence.days &&
      task.recurrence.time
    ) {
      const [hours, minutes] = task.recurrence.time.split(":").map(Number);
      const reminderMinute = minutes - minutesBefore;
      let reminderHour = hours;
      let calculatedMinute = reminderMinute;
      let dayOffset = 0;

      if (reminderMinute < 0) {
        reminderHour = hours - 1;
        calculatedMinute = 60 + reminderMinute;
        if (reminderHour < 0) {
          reminderHour = 23;
          dayOffset = -1;
        }
      }

      // Convertir de 0=Dom, 1=Lun... a 1=Dom, 2=Lun... (formato expo-notifications)
      const weekdays = task.recurrence.days.map((day) => {
        const adjustedDay = (day + dayOffset + 7) % 7;
        return adjustedDay + 1;
      });

      for (const weekday of weekdays) {
        const dayNames = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
        const dayName = dayNames[(weekday - 1) % 7];

        await Notifications.scheduleNotificationAsync({
          identifier: getTaskNotificationId(task.id, dayName),
          content: {
            title: notificationTitle,
            body: notificationBody,
            data: {
              taskId: task.id,
              type: "task_reminder",
            },
            sound: "default",
            priority: Notifications.AndroidNotificationPriority.HIGH,
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
            weekday: weekday,
            hour: reminderHour,
            minute: calculatedMinute,
          },
        });

        console.log(
          `Notificación semanal programada para tarea: ${task.title} - ${dayName} a las ${reminderHour}:${calculatedMinute.toString().padStart(2, "0")}`,
        );
      }
    }
  } catch (error) {
    console.error("Error programando notificaciones de tarea:", error);
  }
}

/**
 * Cancela todos los recordatorios de una tarea específica
 */
export async function cancelTaskReminders(taskId: string): Promise<void> {
  try {
    const scheduledNotifications =
      await Notifications.getAllScheduledNotificationsAsync();

    const taskNotifications = scheduledNotifications.filter((notification: any) =>
      notification.identifier.startsWith(`task_${taskId}`),
    );

    for (const notification of taskNotifications) {
      await Notifications.cancelScheduledNotificationAsync(
        notification.identifier,
      );
      console.log(`Notificación de tarea cancelada: ${notification.identifier}`);
    }
  } catch (error) {
    console.error("Error cancelando notificaciones de tarea:", error);
  }
}

/**
 * Cancela todas las notificaciones de tareas
 */
export async function cancelAllTaskReminders(): Promise<void> {
  try {
    const scheduledNotifications =
      await Notifications.getAllScheduledNotificationsAsync();

    const taskNotifications = scheduledNotifications.filter((notification: any) =>
      notification.identifier.startsWith("task_"),
    );

    for (const notification of taskNotifications) {
      await Notifications.cancelScheduledNotificationAsync(
        notification.identifier,
      );
    }

    console.log(
      `${taskNotifications.length} notificaciones de tareas canceladas`,
    );
  } catch (error) {
    console.error("Error cancelando todas las notificaciones de tareas:", error);
  }
}

/**
 * Reprograma todas las notificaciones para una lista de tareas
 */
export async function rescheduleAllTaskReminders(tasks: Task[]): Promise<void> {
  try {
    await cancelAllTaskReminders();

    for (const task of tasks) {
      if (task.reminder?.enabled) {
        await scheduleTaskReminders(task);
      }
    }

    console.log("Todas las notificaciones de tareas reprogramadas");
  } catch (error) {
    console.error("Error reprogramando notificaciones de tareas:", error);
  }
}
