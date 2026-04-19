/**
 * DailyStreakScreen
 *
 * Full-screen overlay shown once per day when the user opens the app.
 * Shows a sunburst background, the mascot, streak count, weekly calendar,
 * and a motivational message.
 */

import { colors } from "@/constants/theme";
import { AppText as Text } from "@/src/components/AppText";
import { getLocalDateKey, getLocalTodayDateKey } from "@/src/utils/dateHelpers";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { X } from "lucide-react-native";
import React, { useEffect } from "react";
import {
  Dimensions,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import Animated, {
  Easing,
  FadeInDown,
  FadeInUp,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

// Day labels (starting from Monday of current week)
const DAY_LABELS_SHORT = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

interface DailyStreakScreenProps {
  visible: boolean;
  streak: number;
  history: string[]; // Array of "YYYY-MM-DD" dates the user opened the app
  shieldUsedToday?: boolean; // true when a shield was consumed to protect this streak
  maxStreak?: number; // highest streak ever achieved
  shieldDates?: string[]; // dates where a shield was used
  onDismiss: () => void;
}

/**
 * Get the dates for the current week (Mon-Sun) as YYYY-MM-DD strings
 */
function getCurrentWeekDates(): string[] {
  const today = new Date();
  const dayOfWeek = today.getDay(); // 0=Sun, 1=Mon, ...
  // Calculate Monday of this week
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(today);
  monday.setDate(today.getDate() + mondayOffset);

  const dates: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    dates.push(getLocalDateKey(d));
  }
  return dates;
}

// Sunburst ray component
const SunburstRays = () => {
  const rotation = useSharedValue(0);

  useEffect(() => {
    rotation.value = withRepeat(
      withTiming(360, { duration: 60000, easing: Easing.linear }),
      -1,
      false,
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  const NUM_RAYS = 16;
  const rays = Array.from({ length: NUM_RAYS });

  return (
    <Animated.View style={[sunburstStyles.container, animatedStyle]}>
      {rays.map((_, i) => (
        <View
          key={i}
          style={[
            sunburstStyles.ray,
            {
              transform: [{ rotate: `${(360 / NUM_RAYS) * i}deg` }],
              opacity: i % 2 === 0 ? 0.12 : 0.06,
            },
          ]}
        />
      ))}
    </Animated.View>
  );
};

const sunburstStyles = StyleSheet.create({
  container: {
    position: "absolute",
    width: SCREEN_WIDTH * 2,
    height: SCREEN_WIDTH * 2,
    top: SCREEN_HEIGHT * 0.23 - SCREEN_WIDTH,
    left: SCREEN_WIDTH / 2 - SCREEN_WIDTH,
    alignItems: "center",
    justifyContent: "center",
  },
  ray: {
    position: "absolute",
    width: 0,
    height: 0,
    borderLeftWidth: SCREEN_WIDTH * 0.12,
    borderRightWidth: SCREEN_WIDTH * 0.12,
    borderBottomWidth: SCREEN_WIDTH,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderBottomColor: "rgba(255, 255, 255, 0.9)",
    transformOrigin: "bottom center",
    bottom: "50%",
  },
});

// Badge milestones
// Metro resolves @2x/@3x automatically from the base file (badge_N.png)
const BADGE_MILESTONES: Array<{
  days: number;
  color: string;
  label: string;
  image: ReturnType<typeof require> | null;
}> = [
  {
    days: 3,
    color: "#C9FD5A",
    label: "3",
    image: require("@/assets/images/badges/badge_1.png"),
  },
  {
    days: 5,
    color: "#A78BFA",
    label: "5",
    image: require("@/assets/images/badges/badge_2.png"),
  },
  {
    days: 7,
    color: "#FE564C",
    label: "7",
    image: require("@/assets/images/badges/badge_3.png"),
  },
  {
    days: 10,
    color: "#F9E2AF",
    label: "10",
    image: require("@/assets/images/badges/badge_4.png"),
  },
  {
    days: 14,
    color: "#ECF230",
    label: "14",
    image: require("@/assets/images/badges/badge_5.png"),
  },
  {
    days: 21,
    color: "#FAB387",
    label: "21",
    image: require("@/assets/images/badges/badge_6.png"),
  },
  {
    days: 28,
    color: "#CBA6F7",
    label: "28",
    image: require("@/assets/images/badges/badge_7.png"),
  },
];

export const DailyStreakScreen: React.FC<DailyStreakScreenProps> = ({
  visible,
  streak,
  history,
  shieldUsedToday = false,
  maxStreak = 0,
  shieldDates = [],
  onDismiss,
}) => {
  const mascotScale = useSharedValue(0);
  const mascotY = useSharedValue(0);

  const weekDates = getCurrentWeekDates();
  const today = getLocalTodayDateKey();

  const historySet = new Set(history);
  const shieldDatesSet = new Set(shieldDates);
  // First day of the current active streak: today minus (streak - 1) days.
  // Days before this are either pre-join or a previous broken streak — don't mark them red.
  const streakStartDate: string | null =
    streak > 0
      ? (() => {
          const d = new Date();
          d.setDate(d.getDate() - (streak - 1));
          return getLocalDateKey(d);
        })()
      : null;
  // Use the higher of maxStreak and current streak for badge unlocking
  const effectiveMaxStreak = Math.max(maxStreak, streak);

  useEffect(() => {
    if (visible) {
      // Reset
      mascotScale.value = 0;

      // Mascot entrance
      mascotScale.value = withDelay(
        200,
        withSpring(1, { damping: 8, stiffness: 100 }),
      );

      // Floating mascot
      mascotY.value = withDelay(
        800,
        withRepeat(
          withSequence(
            withTiming(-10, {
              duration: 2000,
              easing: Easing.inOut(Easing.sin),
            }),
            withTiming(0, { duration: 2000, easing: Easing.inOut(Easing.sin) }),
          ),
          -1,
          true,
        ),
      );

      // Haptic celebration
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch (e) {}
    }
  }, [visible]);

  const mascotAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: mascotScale.value }, { translateY: mascotY.value }],
  }));

  const handleDismiss = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onDismiss();
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={false}
      statusBarTranslucent
    >
      <LinearGradient
        colors={
          shieldUsedToday
            ? ["#B45309", "#D97706", "#F59E0B"] // Amber/gold when shield protected
            : ["#7663F2", "#7663F2", "#280D8C"] // Default gray
        }
        style={styles.container}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
      >
        {/* Sunburst rays */}
        <SunburstRays />

        {/* Close button */}
        <Pressable style={styles.closeButton} onPress={handleDismiss}>
          <X size={28} color="rgba(255,255,255,0.75)" strokeWidth={2.5} />
        </Pressable>

        {/* Content */}
        <View style={styles.content}>
          {/* Mascot */}
          <Animated.View style={[styles.mascotContainer, mascotAnimatedStyle]}>
            <Image
              source={require("@/assets/images/streak.png")}
              style={styles.mascot}
              resizeMode="contain"
            />
          </Animated.View>

          {/* Streak count */}
          <View style={styles.streakNumberContainer}>
            <Text style={styles.streakNumber}>{streak}</Text>
            <Text style={styles.streakLabel}>RACHA ACTUAL</Text>
          </View>

          {/* Motivational message — right below streak label */}
          <Animated.Text
            entering={FadeInDown.delay(600).duration(500)}
            style={styles.motivationalText}
          >
            {shieldUsedToday
              ? "🛡 ¡Tu escudo protegió tu racha!\n¡Sigue abriendo la app cada día!"
              : "Rompiste la inercia. Eso era lo más difícil. ¡Vuelve mañana y mira tu racha crecer!"}
          </Animated.Text>

          {/* Weekly calendar */}
          <Animated.View
            entering={FadeInUp.delay(700).duration(500)}
            style={styles.calendarContainer}
          >
            <View style={styles.calendarCard}>
              <View style={styles.daysRow}>
                {weekDates.map((dateKey, index) => {
                  const isToday = dateKey === today;
                  const isFuture = dateKey > today;
                  // A day is within the active streak if it falls between streakStartDate and today
                  const isInActiveStreak =
                    !isFuture &&
                    streakStartDate !== null &&
                    dateKey >= streakStartDate;
                  // Completed = explicitly in history OR implied by the active streak (excluding today)
                  const isCompleted =
                    !isToday && (historySet.has(dateKey) || isInActiveStreak);
                  const isShieldDay = shieldDatesSet.has(dateKey);
                  const isBroken =
                    !isToday &&
                    !isFuture &&
                    !isCompleted &&
                    streakStartDate !== null &&
                    dateKey >= streakStartDate;

                  return (
                    <View key={dateKey} style={styles.dayColumn}>
                      <View
                        style={[
                          styles.dayCircle,
                          isCompleted && styles.dayCircleCompleted,
                          isToday && styles.dayCircleToday,
                          isFuture && styles.dayCircleFuture,
                          isBroken && styles.dayCircleBroken,
                        ]}
                      >
                        {isCompleted && !isShieldDay && (
                          <View style={styles.todayStar}>
                            <Text style={styles.todayStarText}>✦</Text>
                          </View>
                        )}
                        {isCompleted && isShieldDay && (
                          <Text style={styles.shieldEmoji}>🛡️</Text>
                        )}
                        {isToday && !isShieldDay && (
                          <View style={styles.todayStar}>
                            <Text style={styles.todayStarText}>✦</Text>
                          </View>
                        )}
                        {isToday && isShieldDay && (
                          <Text style={styles.shieldEmoji}>🛡️</Text>
                        )}
                        {isBroken && <Text style={styles.brokenEmoji}>✕</Text>}
                      </View>

                      <Text
                        style={[
                          styles.dayLabel,
                          isToday && styles.dayLabelToday,
                          isCompleted && styles.dayLabelCompleted,
                          isBroken && styles.dayLabelBroken,
                        ]}
                      >
                        {DAY_LABELS_SHORT[index]}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </View>
          </Animated.View>

          {/* Badges section */}
          <Animated.View
            entering={FadeInUp.delay(850).duration(500)}
            style={styles.badgesContainer}
          >
            <View style={styles.badgesCard}>
              <View style={styles.badgesHeaderPill}>
                <Text style={styles.badgesHeaderText}>Mis Medallas</Text>
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.badgesRow}
              >
                {BADGE_MILESTONES.map((badge) => {
                  const unlocked = effectiveMaxStreak >= badge.days;
                  return (
                    <View key={badge.days} style={styles.badgeItem}>
                      {badge.image ? (
                        <Image
                          source={badge.image}
                          style={[
                            styles.badgeImage,
                            !unlocked && styles.badgeImageLocked,
                          ]}
                          resizeMode="contain"
                        />
                      ) : (
                        // Placeholder — replace with <Image> once assets are ready
                        <View
                          style={[
                            styles.badgePlaceholder,
                            {
                              borderColor: unlocked
                                ? badge.color
                                : "rgba(255,255,255,0.15)",
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.badgePlaceholderText,
                              {
                                color: unlocked
                                  ? badge.color
                                  : "rgba(255,255,255,0.25)",
                              },
                            ]}
                          >
                            {badge.label}
                          </Text>
                        </View>
                      )}
                      <Text
                        style={[
                          styles.badgeSubtitle,
                          unlocked
                            ? { color: colors.background }
                            : { color: `${colors.surfaceElevated}40` },
                        ]}
                      >
                        {badge.days} días
                      </Text>
                    </View>
                  );
                })}
              </ScrollView>
            </View>
          </Animated.View>
        </View>
      </LinearGradient>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  closeButton: {
    position: "absolute",
    top: 56,
    right: 24,
    zIndex: 10,
    padding: 8,
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    paddingTop: 60,
    paddingBottom: 40,
  },
  mascotContainer: {
    alignItems: "center",
    marginBottom: 8,
  },
  mascot: {
    width: 180,
    height: 180,
  },
  streakNumberContainer: {
    alignItems: "center",
    marginBottom: 12,
  },
  streakNumber: {
    fontSize: 146,
    fontFamily: "Jersey10",
    color: colors.primary,
    textShadowColor: "rgba(0, 0, 0, 0.15)",
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 8,
    lineHeight: 110,
  },
  streakLabel: {
    fontFamily: "Jersey10",
    fontSize: 26,
    color: colors.primary,
    letterSpacing: 4,
    textShadowColor: "rgba(0, 0, 0, 0.1)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
    marginTop: -8,
  },
  calendarContainer: {
    width: "100%",
    marginBottom: 24,
  },
  calendarCard: {
    backgroundColor: colors.background,
    borderRadius: 20,
    paddingVertical: 20,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  daysRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
  },
  dayColumn: {
    alignItems: "center",
    gap: 10,
  },
  dayLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: "rgba(255, 255, 255, 0.6)",
  },
  dayLabelToday: {
    color: "#FFFFFF",
  },
  dayLabelCompleted: {
    color: "#FFFFFF",
  },
  dayCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  dayCircleCompleted: {
    backgroundColor: "#FFFFFF",
    borderWidth: 2.5,
    borderColor: "#FFFFFF",
  },
  dayCircleToday: {
    backgroundColor: colors.textRoutineCard,
    borderWidth: 2,
    borderColor: "rgba(40, 13, 140, 0.8)",
    borderStyle: "dashed",
  },
  dayCircleFuture: {
    backgroundColor: "rgba(255, 255, 255, 0.08)",
  },
  todayStar: {
    alignItems: "center",
    justifyContent: "center",
  },
  todayStarText: {
    fontSize: 20,
    color: colors.background,
    textShadowColor: "rgba(255, 255, 255, 0.9)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 4,
    paddingLeft: 3,
  },
  shieldEmoji: {
    fontSize: 18,
    paddingLeft: 4,
    paddingTop: 4,
  },
  dayCircleBroken: {
    backgroundColor: "rgba(254, 86, 76, 0.18)",
    borderWidth: 1.5,
    borderColor: "rgba(254, 86, 76, 0.5)",
  },
  brokenEmoji: {
    fontSize: 16,
    color: "#FE564C",
    fontWeight: "700",
  },
  dayLabelBroken: {
    color: "rgba(254, 86, 76, 0.7)",
  },
  badgesContainer: {
    width: "100%",
    marginTop: 8,
  },
  badgesHeaderPill: {
    alignSelf: "flex-start",
    paddingHorizontal: 14,
    borderRadius: 999,
    marginBottom: 8,
  },
  badgesHeaderText: {
    fontSize: 12,
    fontWeight: "800",
    color: colors.background,
    letterSpacing: 0.3,
  },
  badgesCard: {
    backgroundColor: colors.textRoutineCard,
    borderRadius: 20,
    paddingVertical: 20,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  badgesRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    gap: 18,
  },
  badgeItem: {
    alignItems: "center",
    paddingVertical: 14,
    gap: 6,
  },
  badgeSubtitle: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  // Final image badge (66×66 pt — export PNG at @1x/66, @2x/132, @3x/198)
  badgeImage: {
    width: 66,
    height: 66,
  },
  badgeImageLocked: {
    opacity: 0.25,
  },
  // Placeholder shown until real image assets are ready
  badgePlaceholder: {
    width: 66,
    height: 66,
    borderRadius: 14,
    borderWidth: 2,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  badgePlaceholderText: {
    fontSize: 20,
    fontWeight: "900",
  },
  motivationalText: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 24,
    paddingHorizontal: 8,
  },
});
