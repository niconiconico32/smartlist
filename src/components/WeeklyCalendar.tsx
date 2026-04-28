import { colors } from "@/constants/theme";
import { AppText as Text } from "@/src/components/AppText";
import { CoinsCounter } from "@/src/components/CoinsCounter";
import { HamburgerMenu } from "@/src/components/HamburgerMenu";
import { useAuth } from "@/src/contexts/AuthContext";
import { useAchievementsStore } from "@/src/store/achievementsStore";
import { useAppStreakStore } from "@/src/store/appStreakStore";
import { getLocalDateKey } from "@/src/utils/dateHelpers"; // ✅ TIMEZONE SAFE
import { addDays, format, isSameDay, isToday, subDays } from "date-fns";
import { es } from "date-fns/locale";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { Crown } from "lucide-react-native";
import React, { useEffect, useRef, useState } from "react";
import {
    DeviceEventEmitter,
    Dimensions,
    Pressable,
    ScrollView,
    StyleSheet,
    View,
} from "react-native";
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withSequence,
    withSpring,
    withTiming,
} from "react-native-reanimated";

const SCREEN_WIDTH = Dimensions.get("window").width;
const DAY_WIDTH = 64; // minWidth + gap

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

interface ScheduledRoutine {
  id: string;
  name: string;
  days: string[]; // ['Lun', 'Mar', 'Mié', etc.]
}

interface WeeklyCalendarProps {
  onDateSelect?: (date: Date) => void;
  completedTasksHistory?: Record<string, { tasks: number; routines: number }>;
  scheduledRoutines?: ScheduledRoutine[];
  scheduledTasksHistory?: Record<string, { tasks: number; routines: number }>; // Tareas programadas pero no completadas
}

export function WeeklyCalendar({
  onDateSelect,
  completedTasksHistory = {},
  scheduledRoutines = [],
  scheduledTasksHistory = {},
}: WeeklyCalendarProps) {
  const router = useRouter();
  const { isAnonymous } = useAuth();
  const { totalCoins, loadAchievements, isRoutineModalOpen } =
    useAchievementsStore();
  const { streak: appStreak, getMultiplier } = useAppStreakStore();
  const today = new Date();
  const [selectedDate, setSelectedDate] = useState<Date>(today);
  const scrollViewRef = useRef<ScrollView>(null);

  // Animation values
  const pillScale = useSharedValue(1);
  const floatingY = useSharedValue(0);
  const floatingOpacity = useSharedValue(0);
  const [earnedCoinsAmount, setEarnedCoinsAmount] = useState(0);

  // El valor que realmente se muestra en el UI, se depara del store real
  // para que podamos retrasar la subida del numero hasta que el bounce ocurra.
  const [displayedCoins, setDisplayedCoins] = useState(totalCoins);

  // Sincronizar silenciosamente si no hay modal abierto.
  // Esto cubre compras, carga inicial, u otras sumas sin modal.
  useEffect(() => {
    if (!isRoutineModalOpen && displayedCoins !== totalCoins) {
      setDisplayedCoins(totalCoins);
    }
  }, [totalCoins, isRoutineModalOpen]);

  // Manejar animaciones reaccionando al evento explícito de two.tsx
  useEffect(() => {
    const sub = DeviceEventEmitter.addListener(
      "triggerCoinAnimation",
      (amount: number) => {
        setEarnedCoinsAmount(amount);

        try {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        } catch (e) {}

        // Esto gatillará a CoinsCounter.tsx para hacer su roll-up!
        setDisplayedCoins(useAchievementsStore.getState().totalCoins);

        // Bouncing Pill
        pillScale.value = withSequence(
          withSpring(1.15, { damping: 10, stiffness: 200 }),
          withSpring(1, { damping: 10, stiffness: 200 }),
        );

        // Floating Points (+X)
        floatingOpacity.value = 1;
        floatingY.value = 0;
        floatingY.value = withTiming(-40, { duration: 1200 });
        floatingOpacity.value = withTiming(0, { duration: 1200 });
      },
    );

    return () => sub.remove();
  }, []);

  const pillAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pillScale.value }],
  }));

  const floatingTextStyle = useAnimatedStyle(() => ({
    opacity: floatingOpacity.value,
    transform: [{ translateY: floatingY.value }],
  }));

  useEffect(() => {
    void loadAchievements();
  }, []);

  // Generate 15 days back and 30 days forward from today (total 46 days)
  const startDate = subDays(today, 15);
  const allDays = Array.from({ length: 46 }, (_, i) => addDays(startDate, i));

  // Find index of today
  const todayIndex = allDays.findIndex((day) => isToday(day));

  useEffect(() => {
    // Center today's date on mount
    if (scrollViewRef.current && todayIndex >= 0) {
      const scrollToX =
        todayIndex * DAY_WIDTH - SCREEN_WIDTH / 2 + DAY_WIDTH / 2;
      setTimeout(() => {
        scrollViewRef.current?.scrollTo({ x: scrollToX, animated: false });
      }, 100);
    }
  }, []);

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
    onDateSelect?.(date);
  };

  return (
    <View style={styles.container}>
      {/* Header - Day and Date */}
      <View style={styles.header}>
        {/* ☰ Hamburger — left of the day name */}
        <HamburgerMenu />

        <View style={styles.dayNameContainer}>
          <Text style={styles.dayName}>
            {format(selectedDate, "EEE", { locale: es })}
          </Text>
          <View style={styles.redDot} />
        </View>
        <View style={styles.rightSection}>
          <Animated.View style={[pillAnimatedStyle, { zIndex: 10 }]}>
            <Pressable
              style={styles.crownsPill}
              onPress={() => router.push("/achievements")}
            >
              <Crown size={20} color={colors.surface} strokeWidth={2.5} />

              <CoinsCounter
                coins={displayedCoins}
                size="special"
                color="#1A1C20"
              />

              {appStreak > 0 && (
                <View style={styles.multiplierCornerBadge}>
                  <Text style={styles.multiplierCornerText}>
                    x{getMultiplier()}
                  </Text>
                </View>
              )}
            </Pressable>

            <Animated.View
              style={[styles.floatingTextContainer, floatingTextStyle]}
              pointerEvents="none"
            >
              <Text style={styles.floatingText}>+{earnedCoinsAmount}</Text>
            </Animated.View>
          </Animated.View>
        </View>
      </View>

      {/* Scrollable Week Days Row */}
      <ScrollView
        ref={scrollViewRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.weekScrollContent}
        style={styles.weekScroll}
      >
        {allDays.map((day, index) => {
          const isCurrentDay = isToday(day);
          const isSelected = isSameDay(day, selectedDate);
          const dateKey = getLocalDateKey(day); // ✅ TIMEZONE SAFE
          const dayActivity = completedTasksHistory[dateKey];
          const scheduledActivity = scheduledTasksHistory[dateKey];

          const totalCompleted = dayActivity
            ? dayActivity.tasks + dayActivity.routines
            : 0;
          const totalScheduled = scheduledActivity
            ? scheduledActivity.tasks + scheduledActivity.routines
            : 0;

          const hasCompletedTasks = totalCompleted > 0;
          const hasScheduledTasks = totalScheduled > 0;
          const hasExcess = totalCompleted > 3;

          // Build dots array for completed tasks (max 3 visible)
          const completedDots: ("routine" | "task")[] = [];
          if (dayActivity) {
            // Add routines first (priority)
            for (let i = 0; i < Math.min(dayActivity.routines, 3); i++) {
              completedDots.push("routine");
            }
            // Fill remaining with tasks
            const remainingSlots = 3 - completedDots.length;
            for (
              let i = 0;
              i < Math.min(dayActivity.tasks, remainingSlots);
              i++
            ) {
              completedDots.push("task");
            }
          }

          // Build dots for scheduled tasks (outline only)
          const scheduledDots: ("routine" | "task")[] = [];
          if (scheduledActivity && !hasCompletedTasks) {
            // Solo mostrar scheduled si no hay tareas completadas
            for (let i = 0; i < Math.min(scheduledActivity.routines, 3); i++) {
              scheduledDots.push("routine");
            }
            const remainingSlots = 3 - scheduledDots.length;
            for (
              let i = 0;
              i < Math.min(scheduledActivity.tasks, remainingSlots);
              i++
            ) {
              scheduledDots.push("task");
            }
          }

          return (
            <Pressable
              key={index}
              style={styles.dayContainer}
              onPress={() => handleDateSelect(day)}
            >
              <View
                style={[
                  styles.todayFrame,
                  isCurrentDay && styles.todayFrameActive,
                ]}
              >
                <View style={styles.dayNumberContainer}>
                  <Text
                    style={[
                      styles.dayNumber,
                      isSelected && styles.dayNumberSelected,
                      isCurrentDay && styles.dayNumberToday,
                    ]}
                  >
                    {format(day, "d")}
                  </Text>
                </View>
                <Text
                  style={[
                    styles.dayLabel,
                    isSelected && styles.dayLabelSelected,
                    isCurrentDay && styles.dayLabelToday,
                  ]}
                >
                  {format(day, "EEE", { locale: es }).toUpperCase().slice(0, 3)}
                </Text>
              </View>

              {/* Activity Indicators Row - Always rendered for consistent height */}
              <View style={styles.activityRow}>
                {hasCompletedTasks ? (
                  // Mostrar puntos llenos para tareas completadas
                  <>
                    {completedDots.map((type, dotIndex) => (
                      <View
                        key={dotIndex}
                        style={[
                          styles.activityDot,
                          type === "routine" && styles.activityDotRoutine,
                        ]}
                      />
                    ))}
                    {hasExcess && <Text style={styles.excessIndicator}>+</Text>}
                  </>
                ) : hasScheduledTasks ? (
                  // Mostrar puntos outline para tareas programadas sin completar
                  <>
                    {scheduledDots.map((type, dotIndex) => (
                      <View
                        key={`scheduled-${dotIndex}`}
                        style={[
                          styles.activityDotScheduled,
                          type === "routine" &&
                            styles.activityDotScheduledRoutine,
                        ]}
                      />
                    ))}
                    {totalScheduled > 3 && (
                      <Text style={styles.excessIndicator}>+</Text>
                    )}
                  </>
                ) : (
                  <View style={styles.activityDotPlaceholder} />
                )}
              </View>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "transparent",
    paddingTop: 8,
    paddingBottom: 20,
    paddingHorizontal: 28,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
    gap: 8,
  },
  dayNameContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  dayName: {
    fontFamily: "Jersey10",
    fontSize: 48,
    color: colors.primary,
    letterSpacing: 2,
    textTransform: "lowercase",
  },
  redDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
  },
  rightSection: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: "auto",
    marginTop: 10,
    marginRight: 0,
  },
  crownsPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EAF0FC", // soft grayish blue based on the image
    paddingHorizontal: 10,
    paddingVertical: 2,
    paddingBottom: -2,
    borderRadius: 42,
    gap: 6,
    position: "relative",
  },
  multiplierCornerBadge: {
    position: "absolute",
    top: -14,
    right: -16,
    backgroundColor: "#C9FD5A",
    paddingHorizontal: 5,
    paddingBottom: -2,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.background,
  },
  multiplierCornerText: {
    fontSize: 8,
    fontWeight: "900",
    color: "#280D8C",
  },
  weekScroll: {
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.15)",
    paddingTop: 12,
  },
  weekScrollContent: {
    paddingHorizontal: 20,
    gap: 24,
  },
  dayContainer: {
    alignItems: "center",
    gap: 6,
    width: 40,
  },
  todayFrame: {
    alignItems: "center",
    gap: 6,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "transparent",
    paddingHorizontal: 4,
    paddingVertical: 4,
    paddingRight: -2,
  },
  todayFrameActive: {
    borderColor: colors.primary,
  },
  dayNumberContainer: {
    width: 20,
    height: 20,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
  },

  dayNumber: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  dayNumberSelected: {
    fontSize: 13,
    fontWeight: "900",
    color: colors.primary,
  },
  dayLabel: {
    fontSize: 9,
    fontWeight: "600",
    color: colors.textSecondary,
    letterSpacing: 0.5,
  },
  dayLabelSelected: {
    color: colors.primary,
    fontWeight: "700",
  },
  activityRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  activityDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: colors.primary,
    opacity: 0.7,
  },
  activityDotRoutine: {
    backgroundColor: "#FAB387",
  },
  activityDotScheduled: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: colors.primary,
  },
  activityDotScheduledRoutine: {
    borderColor: "#FAB387",
  },
  activityDotPlaceholder: {
    height: 5,
    opacity: 0,
  },
  excessIndicator: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.textSecondary,
    marginLeft: 1,
    top: -2,
  },
  dayNumberToday: {
    color: colors.primary,
    fontWeight: "800",
  },
  dayLabelToday: {
    color: colors.primary,
    fontWeight: "700",
  },
  floatingTextContainer: {
    position: "absolute",
    top: -15,
    right: 5,
    alignItems: "center",
    justifyContent: "center",
  },
  floatingText: {
    fontSize: 16,
    fontWeight: "900",
    color: "#84CC16", // Vibrant gamification green
    textShadowColor: "rgba(0,0,0,0.1)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
});
