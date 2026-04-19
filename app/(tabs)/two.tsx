import { colors } from "@/constants/theme";
import { AppText as Text } from "@/src/components/AppText";
import { EditRoutineModal } from "@/src/components/EditRoutineModal";
import {
  ReviewRequestModal,
  shouldAskForReview,
} from "@/src/components/ReviewRequestModal";
import { RoutineCard } from "@/src/components/RoutineCard";
import { RoutineCelebration } from "@/src/components/RoutineCelebration";
import { RoutineDetailModal } from "@/src/components/RoutineDetailModal";
import { posthog } from "@/src/config/posthog";
import { useAuth } from "@/src/contexts/AuthContext";
import {
  cancelRoutineReminders,
  requestNotificationPermissions,
  rescheduleAllReminders,
  scheduleRoutineReminders,
} from "@/src/lib/notificationService";
import * as routineService from "@/src/lib/routineService";
import { useAchievementsStore } from "@/src/store/achievementsStore";
import { useAppStreakStore } from "@/src/store/appStreakStore";
import { useProStore } from "@/src/store/proStore";
import { useRoutineStreakStore } from "@/src/store/routineStreakStore";
import type { Routine } from "@/src/types/routine";
import {
  renderRoutinesWidget,
  WIDGET_BG_ID_KEY,
  WIDGET_BG_MODE_KEY,
  WIDGET_DATA_KEY,
  WIDGET_OUTFIT_ID_KEY,
  WIDGET_PENDING_KEY,
  WIDGET_PRO_KEY,
  WIDGET_USER_KEY,
} from "@/src/widgets/widgetTaskHandler";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { isSameDay } from "date-fns";
import Constants from "expo-constants";
import * as Haptics from "expo-haptics";
import { useFocusEffect } from "expo-router";
import { Sparkles } from "lucide-react-native";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Alert,
  AppState,
  DeviceEventEmitter,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInUp,
} from "react-native-reanimated";
const _isExpoGo = Constants.appOwnership === "expo";
// react-native-android-widget requires a native build — not available in Expo Go
let requestWidgetUpdate: typeof import("react-native-android-widget").requestWidgetUpdate;
if (!_isExpoGo) {
  requestWidgetUpdate =
    require("react-native-android-widget").requestWidgetUpdate;
}

// Map day number to abbreviation
const DAY_NUMBER_TO_ABBREV: Record<number, string> = {
  0: "Dom",
  1: "Lun",
  2: "Mar",
  3: "Mié",
  4: "Jue",
  5: "Vie",
  6: "Sáb",
};

interface RoutinesScreenProps {
  selectedDate?: Date;
  onRoutineCompleted?: () => void;
}

export default function RoutinesScreen({
  selectedDate,
  onRoutineCompleted,
}: RoutinesScreenProps) {
  const { user, isLoading: authLoading } = useAuth();
  const {
    onRoutineCompleted: achievementRoutineCompleted,
    onRoutinesCountChanged,
    onRoutineEdited,
    onReminderActivated,
    activeOutfit,
    activeBackground,
  } = useAchievementsStore();
  const { recordRoutineCompletion, unmarkRoutineCompletion } =
    useRoutineStreakStore();
  const { isPro } = useProStore();
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingRoutine, setEditingRoutine] = useState<Routine | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedRoutine, setSelectedRoutine] = useState<Routine | null>(null);
  const [selectedRoutineIndex, setSelectedRoutineIndex] = useState(0);
  const [showCelebration, setShowCelebration] = useState(false);
  const [celebratedRoutineName, setCelebratedRoutineName] = useState("");
  const [earnedCoins, setEarnedCoins] = useState(100);
  const [showReviewModal, setShowReviewModal] = useState(false);

  // Guardamos las monedas ganadas mientras los modales están abiertos
  const pendingAnimationAmount = useRef(0);

  // Check if selected date is today
  const isToday = useMemo(() => {
    const date = selectedDate || new Date();
    return isSameDay(date, new Date());
  }, [selectedDate]);

  // Get current day abbreviation from selected date
  const currentDayAbbrev = useMemo(() => {
    const date = selectedDate || new Date();
    return DAY_NUMBER_TO_ABBREV[date.getDay()];
  }, [selectedDate]);

  // Filter routines for the selected day
  const filteredRoutines = useMemo(() => {
    return routines.filter((routine) =>
      routine.days.includes(currentDayAbbrev),
    );
  }, [routines, currentDayAbbrev]);

  useEffect(() => {
    const syncWidget = async () => {
      if (Platform.OS !== "android") return;
      try {
        await AsyncStorage.setItem(
          WIDGET_DATA_KEY,
          JSON.stringify(filteredRoutines),
        );

        // Persist user id so the widget handler can call Supabase
        if (user?.id) {
          await AsyncStorage.setItem(WIDGET_USER_KEY, user.id);
        }

        // Persist outfit ID so the widget can resolve it via its own require() map
        await AsyncStorage.setItem(WIDGET_OUTFIT_ID_KEY, activeOutfit ?? "");

        // Persist background ID for gradient selection in widget
        if (activeBackground) {
          await AsyncStorage.setItem(WIDGET_BG_ID_KEY, activeBackground);
        }

        // Persist bg mode so the widget knows whether to use image or gradient
        const bgModeValue = activeBackground ? "user" : "user";
        await AsyncStorage.setItem(WIDGET_BG_MODE_KEY, bgModeValue);

        // Persist Pro status so the widget can show/hide content
        await AsyncStorage.setItem(WIDGET_PRO_KEY, isPro ? "true" : "false");

        if (requestWidgetUpdate) {
          requestWidgetUpdate({
            widgetName: "RoutinesWidget",
            renderWidget: renderRoutinesWidget,
          });
        }
      } catch (err) {
        console.warn("Error syncing routines to widget", err);
      }
    };
    syncWidget();
  }, [filteredRoutines, user?.id, activeOutfit, activeBackground, isPro]);

  // Solicitar permisos de notificación al montar
  useEffect(() => {
    requestNotificationPermissions();
  }, []);

  // Sincronizar cola de widgets antes de cargar rutinas
  const processPendingWidgetSync = async () => {
    if (!user) return;
    try {
      const pendingRaw = await AsyncStorage.getItem(WIDGET_PENDING_KEY);
      if (!pendingRaw) return;

      const pendingList = JSON.parse(pendingRaw);
      if (pendingList.length > 0) {
        for (const item of pendingList) {
          await routineService.updateTaskCompletion(
            item.taskId,
            item.routineId,
            user.id,
            item.completed,
          );
        }
        await AsyncStorage.removeItem(WIDGET_PENDING_KEY);
      }
    } catch (error) {
      console.warn("Error syncing pending widget toggles:", error);
    }
  };

  // Cargar rutinas cuando la pantalla se enfoca o vuelve de 2do plano
  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      const refreshData = () => {
        if (!authLoading && user && isActive) {
          processPendingWidgetSync().then(() => {
            if (isActive) loadRoutines();
          });
        }
      };

      // Carga inicial al enfocar el tab
      refreshData();

      // Escuchar si la app vuelve desde el widget (home screen)
      const subscription = AppState.addEventListener(
        "change",
        (nextAppState) => {
          if (nextAppState === "active") {
            refreshData();
          }
        },
      );

      return () => {
        isActive = false;
        subscription.remove();
      };
    }, [user, authLoading]),
  );

  const loadRoutines = async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);

      // Cargar rutinas desde Supabase
      const fetchedRoutines = await routineService.fetchRoutines(user.id);

      setRoutines(fetchedRoutines);
      // Actualizar logro de cantidad de rutinas creadas
      onRoutinesCountChanged(fetchedRoutines.length);
      await rescheduleAllReminders(fetchedRoutines as any);
    } catch (error) {
      console.error("Error al cargar rutinas:", error);
      Alert.alert(
        "Error",
        "No se pudieron cargar las rutinas. Intenta de nuevo.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteRoutine = async (id: string) => {
    if (!user) return;

    try {
      // Cancelar las notificaciones de esta rutina
      await cancelRoutineReminders(id);

      // Borrar de Supabase
      const success = await routineService.deleteRoutine(id, user.id);

      if (success) {
        setRoutines(routines.filter((r) => r.id !== id));
      } else {
        Alert.alert("Error", "No se pudo eliminar la rutina");
      }
    } catch (error) {
      console.error("Error al eliminar rutina:", error);
      Alert.alert("Error", "Ocurrió un error al eliminar la rutina");
    }
  };

  const handleEditRoutine = (id: string) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (e) {}

    const routineToEdit = routines.find((r) => r.id === id);
    if (routineToEdit) {
      setEditingRoutine(routineToEdit);
      setShowEditModal(true);
    }
  };

  const handleSaveEdit = async (updatedRoutine: Routine) => {
    if (!user) return;

    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) {}

    // Detect changes for achievements
    const originalRoutine = editingRoutine;
    const nameChanged = originalRoutine
      ? originalRoutine.name !== updatedRoutine.name
      : false;
    const iconChanged = originalRoutine
      ? originalRoutine.icon !== updatedRoutine.icon
      : false;

    try {
      // Actualizar en Supabase
      const result = await routineService.updateRoutine(
        updatedRoutine.id,
        user.id,
        {
          name: updatedRoutine.name,
          days: updatedRoutine.days,
          tasks: updatedRoutine.tasks,
          icon: updatedRoutine.icon,
          reminderEnabled: updatedRoutine.reminderEnabled,
          reminderTime: updatedRoutine.reminderTime,
        },
      );

      if (result) {
        // Actualizar estado local
        setRoutines((prev) =>
          prev.map((r) => (r.id === result.id ? result : r)),
        );

        // Reprogramar notificaciones
        await scheduleRoutineReminders(result as any);

        // Achievement: edited routine (name/icon change + old routine check)
        onRoutineEdited(originalRoutine?.created_at, nameChanged, iconChanged);

        // Achievement: reminder activated
        if (
          updatedRoutine.reminderEnabled &&
          originalRoutine &&
          !originalRoutine.reminderEnabled
        ) {
          onReminderActivated();
        }

        setShowEditModal(false);
        setEditingRoutine(null);
      } else {
        Alert.alert("Error", "No se pudo actualizar la rutina");
      }
    } catch (error) {
      console.error("Error al guardar rutina:", error);
      Alert.alert("Error", "Ocurrió un error al guardar la rutina");
    }
  };

  const handleTaskToggle = async (
    routineId: string,
    taskId: string,
    completed: boolean,
  ) => {
    if (!user) return;

    try {
      // Actualizar estado local INMEDIATAMENTE con functional update
      // para evitar race conditions cuando se marcan varias tareas rápido
      let allTasksComplete = false;
      setRoutines((prev) => {
        const updated = prev.map((r) => {
          if (r.id === routineId) {
            const newTasks = r.tasks.map((t) =>
              t.id === taskId ? { ...t, completed } : t,
            );
            allTasksComplete = newTasks.every((t) => t.completed);
            return { ...r, tasks: newTasks };
          }
          return r;
        });
        return updated;
      });

      // Actualizar en Supabase (en background, no bloquea UI)
      const success = await routineService.updateTaskCompletion(
        taskId,
        routineId,
        user.id,
        completed,
      );

      if (!success) {
        // Revertir cambio local si falla
        setRoutines((prev) =>
          prev.map((r) => {
            if (r.id === routineId) {
              return {
                ...r,
                tasks: r.tasks.map((t) =>
                  t.id === taskId ? { ...t, completed: !completed } : t,
                ),
              };
            }
            return r;
          }),
        );
        Alert.alert("Error", "No se pudo actualizar la tarea");
        return;
      }

      // Verificar si la rutina está completa
      if (allTasksComplete && completed) {
        // Otorgar monedas solo si no se ha celebrado hoy
        const result = await useAchievementsStore
          .getState()
          .awardRoutineCompletionCoins(routineId);

        if (result.isNew) {
          pendingAnimationAmount.current += result.earned;
          const fullRoutine = routines.find((r) => r.id === routineId);
          if (fullRoutine) {
            setCelebratedRoutineName(fullRoutine.name);
            setEarnedCoins(result.earned);
            setShowCelebration(true);
          }
        }

        await routineService.markRoutineComplete(routineId, user.id);
        await recordRoutineCompletion(routineId);
        // Actualizar logro de primera rutina completada
        achievementRoutineCompleted();

        // PostHog: track routine completion
        const completedRoutine = routines.find((r) => r.id === routineId);
        posthog.capture("routine_completed", {
          routine_id: routineId,
          task_count: completedRoutine?.tasks.length ?? 0,
          time_of_day: new Date().getHours(),
          day_of_week: new Date().toLocaleDateString("en-US", {
            weekday: "long",
          }),
          source: "app",
        });

        if (onRoutineCompleted) {
          onRoutineCompleted();
        }

        // Ask for a store review every 5 days of streak (day 5, 10, 15, 20...)
        const appStreak = useAppStreakStore.getState().streak;
        const askReview = await shouldAskForReview(appStreak);
        if (askReview) {
          setTimeout(() => setShowReviewModal(true), 1500);
        }
      } else if (!allTasksComplete) {
        await routineService.unmarkRoutineComplete(routineId, user.id);
        await unmarkRoutineCompletion(routineId);
      }
    } catch (error) {
      console.error("Error al actualizar tarea:", error);
      Alert.alert("Error", "Ocurrió un error al actualizar la tarea");
    }
  };

  return (
    <View style={styles.container}>
      <Animated.View
        entering={FadeInDown.duration(400).springify()}
        style={styles.header}
      >
        <Text style={styles.title}>Rutinas</Text>
        <Text style={styles.subtitle}>
          {filteredRoutines.length > 0
            ? `${filteredRoutines.length} rutina${filteredRoutines.length > 1 ? "s" : ""} para ${currentDayAbbrev}`
            : routines.length > 0
              ? `Sin rutinas para ${currentDayAbbrev}`
              : "Crea tu primera rutina"}
        </Text>
      </Animated.View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {filteredRoutines.length === 0 ? (
          <Animated.View
            entering={FadeIn.delay(200).duration(500)}
            style={styles.emptyState}
          >
            <Animated.View
              entering={FadeInUp.delay(300).springify()}
              style={styles.emptyIconContainer}
            >
              <Sparkles size={48} color={colors.primary} />
            </Animated.View>
            <Animated.Text
              entering={FadeInUp.delay(400).springify()}
              style={styles.emptyTitle}
            >
              {routines.length > 0
                ? `Sin rutinas para ${currentDayAbbrev}`
                : "Sin rutinas aún"}
            </Animated.Text>
            <Animated.Text
              entering={FadeInUp.delay(500).springify()}
              style={styles.emptySubtitle}
            >
              {routines.length > 0
                ? "Selecciona otro día o crea una nueva rutina para este día"
                : "Toca el botón + para crear tu primera rutina y organizar tus hábitos diarios"}
            </Animated.Text>
          </Animated.View>
        ) : (
          filteredRoutines.map((routine, index) => (
            <RoutineCard
              key={routine.id}
              id={routine.id}
              name={routine.name}
              days={routine.days}
              tasks={routine.tasks}
              reminderEnabled={routine.reminderEnabled}
              reminderTime={routine.reminderTime}
              colorIndex={index}
              icon={routine.icon}
              onPress={() => {
                setSelectedRoutine(routine);
                setSelectedRoutineIndex(index);
              }}
            />
          ))
        )}
      </ScrollView>

      {/* Modal de Edición */}
      <EditRoutineModal
        visible={showEditModal}
        routine={editingRoutine}
        onClose={() => {
          setShowEditModal(false);
          setEditingRoutine(null);
        }}
        onSave={handleSaveEdit}
      />

      {/* Modal de Detalle de Rutina */}
      <RoutineDetailModal
        visible={selectedRoutine !== null}
        routine={selectedRoutine}
        colorIndex={selectedRoutineIndex}
        isReadOnly={!isToday}
        onClose={() => {
          setSelectedRoutine(null);
          if (pendingAnimationAmount.current > 0) {
            const amount = pendingAnimationAmount.current;
            pendingAnimationAmount.current = 0;
            setTimeout(() => {
              DeviceEventEmitter.emit("triggerCoinAnimation", amount);
            }, 300);
          }
        }}
        onTaskToggle={isToday ? handleTaskToggle : undefined}
        onDelete={handleDeleteRoutine}
        onEdit={handleEditRoutine}
      />

      {/* Celebration Modal */}
      <RoutineCelebration
        visible={showCelebration}
        routineName={celebratedRoutineName}
        earnedCoins={earnedCoins}
        onClose={() => setShowCelebration(false)}
      />

      {/* Review Request Modal — shown every 5 days of streak after first routine completion */}
      <ReviewRequestModal
        visible={showReviewModal}
        streak={useAppStreakStore.getState().streak}
        onClose={() => setShowReviewModal(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 20,
    backgroundColor: colors.background,
  },
  title: {
    fontSize: 28,
    fontWeight: "900",
    color: colors.textPrimary,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 4,
    fontWeight: "500",
  },
  scrollView: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 150,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "rgba(203, 166, 247, 0.1)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.textPrimary,
    marginBottom: 12,
  },
  emptySubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 22,
  },
});
