import { colors } from "@/constants/theme";
import { AppText as Text } from "@/src/components/AppText";
import { EditRoutineModal } from "@/src/components/EditRoutineModal";
import {
    ReviewRequestModal,
    shouldAskForReview,
} from "@/src/components/ReviewRequestModal";
import { RoutineCard } from "@/src/components/RoutineCard";
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
import { useEggStore } from "@/src/store/eggStore";
import { useProStore } from "@/src/store/proStore";
import { useRoutineStreakStore } from "@/src/store/routineStreakStore";
import { useRoutinesRefreshStore } from "@/src/store/routinesRefreshStore";
import type { Routine } from "@/src/types/routine";
import {
    renderRoutinesWidget,
    WIDGET_BG_ID_KEY,
    WIDGET_BG_MODE_KEY,
    WIDGET_BG_URI_KEY,
    WIDGET_DATA_KEY,
    WIDGET_OUTFIT_ID_KEY,
    WIDGET_OUTFIT_URI_KEY,
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
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
    Alert,
    AppState,
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

// Map day number to abbreviation (stored DB keys — do NOT translate)
const DAY_NUMBER_TO_ABBREV: Record<number, string> = {
  0: "Dom",
  1: "Lun",
  2: "Mar",
  3: "Mié",
  4: "Jue",
  5: "Vie",
  6: "Sáb",
};
// Map day number to i18n translation key (for display only)
const DAY_NUMBER_TO_I18N_KEY: Record<number, string> = {
  0: "days.sun_abbr",
  1: "days.mon_abbr",
  2: "days.tue_abbr",
  3: "days.wed_abbr",
  4: "days.thu_abbr",
  5: "days.fri_abbr",
  6: "days.sat_abbr",
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
  const { t } = useTranslation();
  const {
    onRoutineCompleted: achievementRoutineCompleted,
    onRoutinesCountChanged,
    onRoutineEdited,
    onReminderActivated,
    activeOutfit,
    activeBackground,
    activeOutfitUri,
    activeBackgroundUri,
  } = useAchievementsStore();
  const { recordRoutineCompletion, unmarkRoutineCompletion } =
    useRoutineStreakStore();
  const { isPro } = useProStore();
  const routinesRefreshToken = useRoutinesRefreshStore((s) => s.refreshToken);
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingRoutine, setEditingRoutine] = useState<Routine | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedRoutine, setSelectedRoutine] = useState<Routine | null>(null);
  const [selectedRoutineIndex, setSelectedRoutineIndex] = useState(0);
  const [showReviewModal, setShowReviewModal] = useState(false);

  // Check if selected date is today
  const isToday = useMemo(() => {
    const date = selectedDate || new Date();
    return isSameDay(date, new Date());
  }, [selectedDate]);

  // Get current day abbreviation from selected date (DB key, not for display)
  const currentDayAbbrev = useMemo(() => {
    const date = selectedDate || new Date();
    return DAY_NUMBER_TO_ABBREV[date.getDay()];
  }, [selectedDate]);

  // Get translated day abbreviation for display
  const currentDayDisplay = useMemo(() => {
    const date = selectedDate || new Date();
    return t(DAY_NUMBER_TO_I18N_KEY[date.getDay()]);
  }, [selectedDate, t]);

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
        // Persist remote outfit URI for Supabase Storage assets
        await AsyncStorage.setItem(
          WIDGET_OUTFIT_URI_KEY,
          activeOutfitUri ?? "",
        );

        // Persist background ID for gradient selection in widget
        if (activeBackground) {
          await AsyncStorage.setItem(WIDGET_BG_ID_KEY, activeBackground);
        }
        // Persist remote background URI for Supabase Storage assets
        await AsyncStorage.setItem(
          WIDGET_BG_URI_KEY,
          activeBackgroundUri ?? "",
        );

        // Only force "user" mode when the user has an active background.
        // If no background is set, preserve whatever mode the user last
        // selected via the widget's cycle button.
        if (activeBackground || activeBackgroundUri) {
          await AsyncStorage.setItem(WIDGET_BG_MODE_KEY, "user");
        }

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
  }, [
    filteredRoutines,
    user?.id,
    activeOutfit,
    activeBackground,
    activeOutfitUri,
    activeBackgroundUri,
    isPro,
  ]);

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

  const loadRoutines = useCallback(async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);

      // Cargar rutinas desde Supabase
      const fetchedRoutines = await routineService.fetchRoutines(user.id);

      setRoutines(fetchedRoutines);

      // Assign a free common egg to any existing routine that doesn't have one yet
      // (migration for users who had the app before the egg system was introduced)
      useEggStore
        .getState()
        .migrateEggsForRoutines(fetchedRoutines.map((r) => r.id));

      // Actualizar logro de cantidad de rutinas creadas
      onRoutinesCountChanged(fetchedRoutines.length);
      await rescheduleAllReminders(fetchedRoutines as any);
    } catch (error) {
      console.error("Error al cargar rutinas:", error);
      Alert.alert(
        t("routines_alerts.error_title"),
        t("routines_alerts.load_failed"),
      );
    } finally {
      setIsLoading(false);
    }
  }, [user, onRoutinesCountChanged, t]);

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
    }, [user, authLoading, loadRoutines]),
  );

  useEffect(() => {
    if (!user || authLoading || routinesRefreshToken === 0) return;
    loadRoutines();
  }, [routinesRefreshToken, user, authLoading, loadRoutines]);

  const handleDeleteRoutine = async (id: string) => {
    if (!user) return;

    try {
      // Cancelar las notificaciones de esta rutina
      await cancelRoutineReminders(id);

      // Borrar de Supabase
      const success = await routineService.deleteRoutine(id, user.id);

      if (success) {
        useEggStore.getState().freeEgg(id);
        setRoutines((prev) => prev.filter((r) => r.id !== id));
      } else {
        Alert.alert(
          t("routines_alerts.error_title"),
          t("routines_alerts.delete_failed"),
        );
      }
    } catch (error) {
      console.error("Error al eliminar rutina:", error);
      Alert.alert(
        t("routines_alerts.error_title"),
        t("routines_alerts.delete_error"),
      );
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
        // updateRoutine returns completed: false for all tasks — reapply today's completions
        const currentRoutine = routines.find((r) => r.id === result.id);
        const completedIds = new Set(
          (currentRoutine?.tasks ?? [])
            .filter((t) => t.completed)
            .map((t) => t.id),
        );
        const resultWithCompletions = {
          ...result,
          tasks: result.tasks.map((t) => ({
            ...t,
            completed: completedIds.has(t.id),
          })),
        };

        // Actualizar estado local
        setRoutines((prev) =>
          prev.map((r) =>
            r.id === resultWithCompletions.id ? resultWithCompletions : r,
          ),
        );

        // Reprogramar notificaciones
        await scheduleRoutineReminders(resultWithCompletions as any);

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
        Alert.alert(
          t("routines_alerts.error_title"),
          t("routines_alerts.update_failed"),
        );
      }
    } catch (error) {
      console.error("Error al guardar rutina:", error);
      Alert.alert(
        t("routines_alerts.error_title"),
        t("routines_alerts.save_error"),
      );
    }
  };

  const handleTaskToggle = async (
    routineId: string,
    taskId: string,
    completed: boolean,
  ) => {
    if (!user) return;

    try {
      // Compute from current state snapshot — avoids the race where setRoutines
      // callback runs asynchronously and allTasksComplete would still be false
      const routineSnapshot = routines.find((r) => r.id === routineId);
      const updatedTasks = (routineSnapshot?.tasks ?? []).map((t) =>
        t.id === taskId ? { ...t, completed } : t,
      );
      const allTasksComplete =
        completed && updatedTasks.every((t) => t.completed);

      // Actualizar estado local INMEDIATAMENTE
      setRoutines((prev) =>
        prev.map((r) =>
          r.id === routineId ? { ...r, tasks: updatedTasks } : r,
        ),
      );

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
        Alert.alert(
          t("routines_alerts.error_title"),
          t("routines_alerts.task_update_failed"),
        );
        return;
      }

      // Verificar si la rutina está completa
      if (allTasksComplete && completed) {
        await routineService.markRoutineComplete(routineId, user.id);
        await recordRoutineCompletion(routineId);
        useEggStore.getState().recordRoutineXp(routineId);
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
      Alert.alert(
        t("routines_alerts.error_title"),
        t("routines_alerts.task_update_error"),
      );
    }
  };

  return (
    <View style={styles.container}>
      <Animated.View
        entering={FadeInDown.duration(400).springify()}
        style={styles.header}
      >
        <Text style={styles.title}>
          {filteredRoutines.length > 0
            ? t("routines_screen.title_count", {
                count: filteredRoutines.length,
              })
            : routines.length > 0
              ? t("routines_screen.title_no_routines_day", {
                  day: currentDayDisplay,
                })
              : t("routines_screen.title_create_first")}
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
                ? t("routines_screen.empty_title_no_day", {
                    day: currentDayDisplay,
                  })
                : t("routines_screen.empty_title_none")}
            </Animated.Text>
            <Animated.Text
              entering={FadeInUp.delay(500).springify()}
              style={styles.emptySubtitle}
            >
              {routines.length > 0
                ? t("routines_screen.empty_subtitle_no_day")
                : t("routines_screen.empty_subtitle_none")}
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
        onClose={() => setSelectedRoutine(null)}
        onTaskToggle={isToday ? handleTaskToggle : undefined}
        onDelete={handleDeleteRoutine}
        onEdit={handleEditRoutine}
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
