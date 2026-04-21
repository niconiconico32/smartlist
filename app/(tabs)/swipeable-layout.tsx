import { colors } from "@/constants/theme";
import { AppText as Text } from "@/src/components/AppText";
import { CreateRoutineModal } from "@/src/components/CreateRoutineModal";
import { DailyStreakScreen } from "@/src/components/DailyStreakScreen";
import {
    BG_IMAGES,
    DEFAULT_BG,
    FocusHeroCard,
} from "@/src/components/FocusHeroCard";
import { LiquidFAB } from "@/src/components/LiquidFAB";
import { PaywallModal } from "@/src/components/PaywallModal";
import { ProTrialOfferModal } from "@/src/components/ProTrialOfferModal";
import { StreakShieldModal } from "@/src/components/StreakShieldModal";
import { WeeklyCalendar } from "@/src/components/WeeklyCalendar";
import { useAuth } from "@/src/contexts/AuthContext";
import * as routineService from "@/src/lib/routineService";
import { useAchievementsStore } from "@/src/store/achievementsStore";
import { useAppStreakStore } from "@/src/store/appStreakStore";
import { useProStore } from "@/src/store/proStore";
import {
    getLocalTodayDateKey,
    hasCountedToday,
    isLocalToday,
    isLocalYesterday,
} from "@/src/utils/dateHelpers";
import { sendStreakNotification } from "@/src/utils/notifications";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { format } from "date-fns";
import { BlurView } from "expo-blur";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useRouter } from "expo-router";
import { CalendarCheck, Grid2x2 } from "lucide-react-native";
import React, {
    createRef,
    useCallback,
    useEffect,
    useRef,
    useState,
} from "react";
import {
    ActivityIndicator,
    Alert,
    Animated,
    Dimensions,
    ImageBackground,
    Platform,
    Pressable,
    StyleSheet,
    View,
} from "react-native";
import PagerView from "react-native-pager-view";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import IndexScreen from "./index";
import TwoScreen from "./two";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

// Ref para llamar función del IndexScreen
export const addTaskRef = createRef<{
  openTaskModal: (showSchedule?: boolean) => void;
  openProgramScheduleModal: () => void;
}>();

// Type for Activity from IndexScreen
interface Activity {
  id: string;
  title: string;
  completed: boolean;
  recurrence?: {
    type: "once" | "daily" | "weekly";
    days?: number[];
  };
  completedDates?: string[];
  scheduledDate?: string;
}

// Map of day abbreviations to day of week numbers (0 = Sunday, 1 = Monday, etc.)
const DAY_ABBREV_TO_NUMBER: Record<string, number> = {
  Dom: 0,
  Lun: 1,
  Mar: 2,
  Mié: 3,
  Jue: 4,
  Vie: 5,
  Sáb: 6,
};

export default function SwipeableLayout() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const {
    onStreakChanged,
    onRoutinesCountChanged,
    loadAchievements,
    trackWeeklyUsage,
    onReminderActivated,
  } = useAchievementsStore();
  const {
    streak: appStreak,
    history: appStreakHistory,
    shouldShowStreakScreen,
    shieldUsedToday,
    maxStreak,
    shieldDates,
    initializeAppStreak,
    dismissStreakScreen,
  } = useAppStreakStore();
  const { isPro, hasSeenTrialOffer, pendingShieldOffer } = useProStore();
  const pagerRef = useRef<PagerView>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [isFABOpen, setIsFABOpen] = useState(false);
  const [isFirstTime, setIsFirstTime] = useState(true);
  const [showCreateRoutineModal, setShowCreateRoutineModal] = useState(false);
  const [showTrialOffer, setShowTrialOffer] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const paywallCheckedRef = useRef(false);

  const [routines, setRoutines] = useState<
    Array<{
      id: string;
      name: string;
      days: string[];
      tasks?: Array<{ id: string; completed?: boolean }>;
    }>
  >([]);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [routinesRefreshKey, setRoutinesRefreshKey] = useState(0);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [isStreakActiveToday, setIsStreakActiveToday] = useState(false);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const pulseAnimFirstTime = useRef(new Animated.Value(1)).current;
  const router = useRouter();
  const hasLoadedOnce = useRef(false);

  // Load and calculate streak
  const loadStreak = useCallback(async () => {
    try {
      const streakData = await AsyncStorage.getItem("@smartlist_streak");
      if (streakData) {
        const { count, lastCompletedDate } = JSON.parse(streakData);

        if (lastCompletedDate) {
          // ✅ TIMEZONE SAFE: Check if streak is still valid
          if (isLocalToday(lastCompletedDate)) {
            // Completed today - streak active
            setCurrentStreak(count);
            setIsStreakActiveToday(true);
            onStreakChanged(count);
          } else if (isLocalYesterday(lastCompletedDate)) {
            // Completed yesterday - streak still valid but not active today yet
            setCurrentStreak(count);
            setIsStreakActiveToday(false);
            onStreakChanged(count);
          } else {
            // Streak lost - reset
            setCurrentStreak(0);
            setIsStreakActiveToday(false);
            await AsyncStorage.setItem(
              "@smartlist_streak",
              JSON.stringify({
                count: 0,
                lastCompletedDate: null,
              }),
            );
          }
        } else {
          setCurrentStreak(count || 0);
          setIsStreakActiveToday(false);
        }
      }
    } catch (error) {
      console.error("Error loading streak:", error);
    }
  }, []);

  // Update streak when user completes any task (easy reward system)
  const updateStreakOnTaskComplete = useCallback(async () => {
    try {
      const streakData = await AsyncStorage.getItem("@smartlist_streak");
      const hasAskedForNotifications = await AsyncStorage.getItem(
        "@notification_permission_asked",
      );
      const today = getLocalTodayDateKey(); // ✅ TIMEZONE SAFE: Use local date

      if (streakData) {
        const { count, lastCompletedDate } = JSON.parse(streakData);

        // ✅ TIMEZONE SAFE: Check if already counted today
        if (hasCountedToday(lastCompletedDate)) {
          // Already counted today - just ensure UI is updated
          setIsStreakActiveToday(true);
          return;
        }

        // Check if streak should continue or reset
        let newCount = 1;
        if (lastCompletedDate && isLocalYesterday(lastCompletedDate)) {
          // Continue streak - they completed yesterday
          newCount = count + 1;
        }
        // If more than 1 day ago or null, streak resets to 1

        setCurrentStreak(newCount);
        setIsStreakActiveToday(true);
        await AsyncStorage.setItem(
          "@smartlist_streak",
          JSON.stringify({
            count: newCount,
            lastCompletedDate: today,
          }),
        );

        // Actualizar logro de racha
        onStreakChanged(newCount);

        // 🔔 Send streak milestone notification
        await sendStreakNotification(newCount);

        // Celebration haptic
        try {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch (e) {}
      } else {
        // First time ever completing a task
        if (!hasAskedForNotifications) {
          await AsyncStorage.setItem("@notification_permission_asked", "true");
        }
        setCurrentStreak(1);
        setIsStreakActiveToday(true);
        await AsyncStorage.setItem(
          "@smartlist_streak",
          JSON.stringify({
            count: 1,
            lastCompletedDate: today,
          }),
        );

        // Actualizar logro de racha
        onStreakChanged(1);

        // 🔔 Send first streak notification
        await sendStreakNotification(1);

        // Celebration haptic
        try {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch (e) {}
      }

      // 🎁 Pro Trial Offer: show after completing first task/routine if user hasn't seen it yet
      const { isPro: currentIsPro, hasSeenTrialOffer: currentHasSeen } =
        useProStore.getState();
      if (!currentIsPro && !currentHasSeen) {
        // Small delay so the task celebration animation finishes first
        setTimeout(() => setShowTrialOffer(true), 1200);
      }
    } catch (error) {
      console.error("Error updating streak:", error);
    }
  }, []);

  // Load routines from Supabase
  const loadRoutines = useCallback(async () => {
    if (!user) return;

    try {
      const fetchedRoutines = await routineService.fetchRoutines(user.id);
      setRoutines(fetchedRoutines as any);
      // Actualizar logro de cantidad de rutinas
      onRoutinesCountChanged(fetchedRoutines.length);
    } catch (error) {
      console.error("Error loading routines:", error);
    }
  }, [user]);

  // Load routines and streak when screen focuses
  useFocusEffect(
    useCallback(() => {
      const loadAll = async () => {
        if (!hasLoadedOnce.current) {
          setIsLoadingData(true);
        }
        try {
          // Hydrate achievements first so early mutations from other flows
          // (routine count, streak tracking, etc.) cannot overwrite
          // purchased/equipped shop state with defaults.
          await loadAchievements();

          await Promise.all([
            loadRoutines(),
            loadStreak(),
            useProStore.getState().load(),
          ]);
          // Now safe to run mutating operations
          await Promise.all([
            initializeAppStreak(),
            trackWeeklyUsage(),
            useProStore.getState().rechargeShieldsIfNeeded(),
          ]);
        } finally {
          setIsLoadingData(false);
          hasLoadedOnce.current = true;
        }
      };
      loadAll();
    }, [loadRoutines, loadStreak]),
  );

  // Auto-trigger Day 8 Paywall Reverse Trial (only for expired trials)
  useEffect(() => {
    if (!isLoadingData && !paywallCheckedRef.current) {
      paywallCheckedRef.current = true;
      if (hasSeenTrialOffer && !isPro) {
        // Trial expired — show paywall
        setShowPaywall(true);
      }
      // NOTE: ProTrialOfferModal is NOT shown here.
      // It fires inside updateStreakOnTaskComplete, after the user's first task/routine completion.
    }
  }, [isLoadingData, hasSeenTrialOffer, isPro]);

  // Calculate real completed tasks history from activities
  const calculateCompletedTasksHistory = () => {
    const history: Record<string, { tasks: number; routines: number }> = {};

    // Contar tareas completadas
    activities.forEach((activity) => {
      const recurrenceType = activity.recurrence?.type || "once";

      if (recurrenceType === "once" || !activity.recurrence) {
        // Tareas de una vez: solo contar en su fecha programada si están completadas
        if (activity.scheduledDate && activity.completed) {
          if (!history[activity.scheduledDate]) {
            history[activity.scheduledDate] = { tasks: 0, routines: 0 };
          }
          history[activity.scheduledDate].tasks++;
        }
      } else if (recurrenceType === "daily") {
        // Tareas diarias: contar en cada fecha donde fue completada
        activity.completedDates?.forEach((date) => {
          if (!history[date]) {
            history[date] = { tasks: 0, routines: 0 };
          }
          history[date].tasks++;
        });
      } else if (recurrenceType === "weekly") {
        // Tareas semanales: contar en cada fecha donde fue completada
        activity.completedDates?.forEach((date) => {
          if (!history[date]) {
            history[date] = { tasks: 0, routines: 0 };
          }
          history[date].tasks++;
        });
      }
    });

    // Contar rutinas completadas
    routines.forEach((routine) => {
      // Las rutinas tienen completedDates por cada día que se completaron
      const routineCompletedDates = (routine as any).completedDates || [];
      routineCompletedDates.forEach((date: string) => {
        if (!history[date]) {
          history[date] = { tasks: 0, routines: 0 };
        }
        history[date].routines++;
      });
    });

    return history;
  };

  // Calculate scheduled (pending) tasks history from activities
  const calculateScheduledTasksHistory = () => {
    const history: Record<string, { tasks: number; routines: number }> = {};
    const today = new Date();

    // Generate dates for past 15 days and next 30 days to check for scheduled tasks
    for (let i = -15; i < 30; i++) {
      const checkDate = new Date(today);
      checkDate.setDate(today.getDate() + i);
      const dateKey = format(checkDate, "yyyy-MM-dd");
      const dayOfWeek = checkDate.getDay(); // 0 = Sunday, 1 = Monday, etc.
      const adjustedDayOfWeek = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Ajustar para que 0 = Lunes, 6 = Domingo

      // Contar tareas programadas
      activities.forEach((activity) => {
        const recurrenceType = activity.recurrence?.type || "once";

        if (recurrenceType === "once" || !activity.recurrence) {
          // Tareas de una vez: contar si está programada para este día y NO está completada
          if (activity.scheduledDate === dateKey && !activity.completed) {
            if (!history[dateKey]) {
              history[dateKey] = { tasks: 0, routines: 0 };
            }
            history[dateKey].tasks++;
          }
        } else if (recurrenceType === "daily") {
          // Tareas diarias: contar si NO está completada en esta fecha
          if (!activity.completedDates?.includes(dateKey)) {
            if (!history[dateKey]) {
              history[dateKey] = { tasks: 0, routines: 0 };
            }
            history[dateKey].tasks++;
          }
        } else if (recurrenceType === "weekly") {
          // Tareas semanales: contar si este día está en los días programados y NO está completada
          const isScheduledForThisDay =
            activity.recurrence?.days?.includes(adjustedDayOfWeek);
          const isCompletedOnThisDay =
            activity.completedDates?.includes(dateKey);

          if (isScheduledForThisDay && !isCompletedOnThisDay) {
            if (!history[dateKey]) {
              history[dateKey] = { tasks: 0, routines: 0 };
            }
            history[dateKey].tasks++;
          }
        }
      });

      // Contar rutinas programadas pero no completadas
      routines.forEach((routine) => {
        // Verificar si esta rutina está programada para este día de la semana
        const isScheduledForThisDay = routine.days.some(
          (dayAbbrev) => DAY_ABBREV_TO_NUMBER[dayAbbrev] === dayOfWeek,
        );

        if (isScheduledForThisDay) {
          // Verificar si la rutina NO fue completada en este día
          const routineCompletedDates = (routine as any).completedDates || [];
          const isCompletedOnThisDay = routineCompletedDates.includes(dateKey);

          if (!isCompletedOnThisDay) {
            if (!history[dateKey]) {
              history[dateKey] = { tasks: 0, routines: 0 };
            }
            history[dateKey].routines++;
          }
        }
      });
    }

    return history;
  };

  const completedTasksHistory = calculateCompletedTasksHistory();
  const scheduledTasksHistory = calculateScheduledTasksHistory();

  const handleTabPress = (page: number) => {
    if (Platform.OS === "ios") {
      Haptics.selectionAsync();
    } else {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    pagerRef.current?.setPage(page);
  };

  const handleAddPress = () => {
    if (Platform.OS === "ios") {
      Haptics.selectionAsync();
    } else {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    // Abrir modal de agregar tarea
    addTaskRef.current?.openTaskModal();
  };

  const handleHacerTareaPress = () => {
    // Abrir modal de agregar tarea sin opción de programar
    addTaskRef.current?.openTaskModal(false);
  };

  const handleProgramarTareaPress = () => {
    // Abrir modal de programación primero, luego la tarea
    addTaskRef.current?.openProgramScheduleModal();
  };

  const handleCreateRoutinePress = () => {
    // Abrir modal para crear una nueva rutina
    setShowCreateRoutineModal(true);
  };

  const handleCreateRoutine = async (routine: {
    name: string;
    days: string[];
    tasks: any[];
    reminderEnabled: boolean;
    reminderTime?: string;
    icon?: string;
  }) => {
    if (!user) {
      Alert.alert("Error", "Debes iniciar sesión para crear rutinas");
      return;
    }

    try {
      // Crear rutina en Supabase
      const newRoutine = await routineService.createRoutine(user.id, {
        name: routine.name,
        days: routine.days,
        tasks: routine.tasks.map((t, i) => ({ title: t.title, position: i })),
        icon: routine.icon,
        reminderEnabled: routine.reminderEnabled,
        reminderTime: routine.reminderTime,
      });

      if (newRoutine) {
        // Recargar rutinas para actualizar calendario
        await loadRoutines();

        // Forzar recarga de TwoScreen incrementando el refresh key
        setRoutinesRefreshKey((prev) => prev + 1);

        // Achievement: reminder activated on creation
        if (routine.reminderEnabled) {
          onReminderActivated();
        }

        const daysText = routine.days.join(", ");
        Alert.alert(
          "¡Éxito!",
          `Rutina "${routine.name}" creada para ${daysText}`,
        );
      } else {
        Alert.alert("Error", "No se pudo crear la rutina");
      }
    } catch (error) {
      console.error("Error al crear rutina:", error);
      Alert.alert("Error", "Ocurrió un error al crear la rutina");
    }
  };

  const handleFABOpenChange = (isOpen: boolean) => {
    // Desaparecer overlay cuando se abre el FAB por primera vez
    if (isOpen && isFirstTime) {
      setIsFirstTime(false);
    }
    setIsFABOpen(isOpen);
  };

  // Pulse animation for first time overlay
  React.useEffect(() => {
    if (isFirstTime) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnimFirstTime, {
            toValue: 1.15,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnimFirstTime, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ]),
      ).start();
    } else {
      pulseAnimFirstTime.setValue(1);
    }
  }, [isFirstTime]);

  return (
    <View style={styles.container}>
      {/* Blur overlay cuando FAB está abierto */}
      {isFABOpen && (
        <BlurView intensity={100} tint="dark" style={styles.blurOverlay}>
          <Pressable
            style={styles.blurPressable}
            onPress={() => setIsFABOpen(false)}
          />
        </BlurView>
      )}

      <ImageBackground
        source={
          useAchievementsStore.getState().activeBackground &&
          BG_IMAGES[useAchievementsStore.getState().activeBackground!]
            ? BG_IMAGES[useAchievementsStore.getState().activeBackground!]
            : DEFAULT_BG
        }
        style={[styles.fixedHeader, { paddingTop: insets.top }]}
      >
        {/*
          ZONA DE AJUSTE MANUAL DEL GRADIENTE 🎨
          - colors: Cambia el color base o la intensidad.
          - end={{ x: 0, y: 1 }}: Define hasta dónde llega el desvanecido.
            (1 es hasta el fondo del ImageBackground, 0.5 a la mitad de la imagen).
        */}
        <LinearGradient
          colors={[colors.background, "transparent"]}
          style={StyleSheet.absoluteFillObject}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 0.6 }}
        />

        {isLoadingData ? (
          <View style={styles.headerLoading}>
            <ActivityIndicator size="small" color={colors.primary} />
          </View>
        ) : (
          <>
            <WeeklyCalendar
              completedTasksHistory={completedTasksHistory}
              scheduledTasksHistory={scheduledTasksHistory}
              scheduledRoutines={routines}
              onDateSelect={(date) => setSelectedDate(date)}
            />
            <View style={styles.progressWrapper}>
              <FocusHeroCard
                currentStreak={currentStreak}
                isStreakActiveToday={isStreakActiveToday}
              />
            </View>
          </>
        )}

        {/* Dither de píxeles al fondo */}
      </ImageBackground>

      {/* Swipeable Content */}
      <PagerView
        ref={pagerRef}
        style={styles.pagerView}
        initialPage={0}
        scrollEnabled={!showCreateRoutineModal}
        onPageSelected={(e: any) => setCurrentPage(e.nativeEvent.position)}
      >
        <View key="1" style={styles.page}>
          <IndexScreen
            ref={addTaskRef}
            setIsFirstTime={setIsFirstTime}
            pulseAnim={pulseAnimFirstTime}
            isFirstTime={isFirstTime}
            onTaskCompleted={updateStreakOnTaskComplete}
            selectedDate={selectedDate}
            onActivitiesChange={setActivities}
          />
        </View>
        <View key="2" style={styles.page}>
          <TwoScreen
            key={routinesRefreshKey}
            selectedDate={selectedDate}
            onRoutineCompleted={updateStreakOnTaskComplete}
          />
        </View>
      </PagerView>

      {/* Tab Bar */}
      <View style={[styles.tabBar, { paddingBottom: 10 + insets.bottom }]}>
        <Pressable
          style={[styles.tabItem, currentPage === 0 && styles.tabItemActive]}
          onPress={() => handleTabPress(0)}
          disabled={showCreateRoutineModal}
        >
          <CalendarCheck
            size={22}
            color={
              currentPage === 0 ? colors.textPrimary : colors.textSecondary
            }
          />
          <Text
            style={[
              styles.tabLabel,
              currentPage === 0 && styles.tabLabelActive,
            ]}
          >
            Tareas
          </Text>
        </Pressable>

        <View style={styles.centralButtonContainer}>
          <LiquidFAB
            currentPage={currentPage}
            onHacerTareaPress={handleHacerTareaPress}
            onProgramarTareaPress={handleProgramarTareaPress}
            onCreateRoutinePress={handleCreateRoutinePress}
            onOpenChange={handleFABOpenChange}
            isOpen={isFABOpen}
          />
        </View>

        <Pressable
          style={[styles.tabItem, currentPage === 1 && styles.tabItemActive]}
          onPress={() => handleTabPress(1)}
          disabled={showCreateRoutineModal}
        >
          <Grid2x2
            size={22}
            color={
              currentPage === 1 ? colors.textPrimary : colors.textSecondary
            }
          />
          <Text
            style={[
              styles.tabLabel,
              currentPage === 1 && styles.tabLabelActive,
            ]}
          >
            Rutinas
          </Text>
        </Pressable>
      </View>

      {/* Create Routine Modal */}
      <CreateRoutineModal
        visible={showCreateRoutineModal}
        onClose={() => {
          setShowCreateRoutineModal(false);
          setIsFABOpen(false);
        }}
        onCreateRoutine={handleCreateRoutine}
      />

      {/* Daily App-Open Streak Screen */}
      <DailyStreakScreen
        visible={shouldShowStreakScreen && !pendingShieldOffer}
        streak={appStreak}
        history={appStreakHistory}
        shieldUsedToday={shieldUsedToday}
        maxStreak={maxStreak}
        shieldDates={shieldDates}
        onDismiss={dismissStreakScreen}
      />

      {/* Streak Shield Protection Modal (Pro only) */}
      <StreakShieldModal />

      {/* Pro Trial Offer (first-time, non-Pro users) */}
      <ProTrialOfferModal
        visible={showTrialOffer && !shouldShowStreakScreen}
        onClose={() => setShowTrialOffer(false)}
      />

      {/* Paywall Reverse Trial (Day 8+) */}
      <PaywallModal
        visible={showPaywall}
        onClose={() => setShowPaywall(false)}
        source="trial_expired"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  blurOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 5,
  },
  blurPressable: {
    ...StyleSheet.absoluteFillObject,
  },
  fixedHeader: {
    backgroundColor: "transparent",
    zIndex: 1,
    paddingBottom: 100,
  },
  headerLoading: {
    paddingVertical: 60,
    alignItems: "center",
    justifyContent: "center",
  },
  progressWrapper: {
    paddingHorizontal: 20,
    marginBottom: 0,
  },
  pagerView: {
    flex: 1,
  },
  page: {
    flex: 1,
  },
  tabBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.glass,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingTop: 10,
    paddingHorizontal: 8,
  },
  tabItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
  },
  tabItemActive: {
    // Puedes agregar estilos adicionales para el tab activo
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: "600",
    marginTop: 4,
    color: colors.textSecondary,
    opacity: 0.5,
  },
  tabLabelActive: {
    color: colors.textPrimary,
  },
  centralButtonContainer: {
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
    zIndex: 10000,
  },
  centralButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 6,
  },
  firstTimeOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    justifyContent: "flex-end",
    alignItems: "center",
    paddingBottom: 140,
    zIndex: 9999,
  } as any,
  firstTimeContent: {
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    marginBottom: 20,
    maxWidth: 280,
    paddingHorizontal: 20,
  } as any,
  firstTimeImage: {
    width: 220,
    height: 220,
    marginBottom: 20,
  } as any,
  firstTimeText: {
    fontSize: 20,
    fontWeight: "700",
    color: "#FFFFFF",
    textAlign: "center",
    marginBottom: 24,
    letterSpacing: 0.3,
    lineHeight: 28,
  } as any,
  firstTimePulseRing: {
    position: "absolute",
    width: 90,
    height: 90,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: colors.success,
    top: "40%",
    left: "50%",
    marginTop: 211,
    marginLeft: -26,
  } as any,
});
