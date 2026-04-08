/**
 * DailyStreakScreen
 * 
 * Full-screen overlay shown once per day when the user opens the app.
 * Shows a sunburst background, the mascot, streak count, weekly calendar,
 * and a motivational message.
 */

import { getLocalDateKey, getLocalTodayDateKey } from '@/src/utils/dateHelpers';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { Check } from 'lucide-react-native';
import React, { useEffect } from 'react';
import {
    Dimensions,
    Image,
    Modal,
    Pressable,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import Animated, {
    Easing,
    FadeInDown,
    FadeInUp,
    SlideInDown,
    useAnimatedStyle,
    useSharedValue,
    withDelay,
    withRepeat,
    withSequence,
    withSpring,
    withTiming
} from 'react-native-reanimated';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Day labels (starting from Monday of current week)
const DAY_LABELS_SHORT = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

interface DailyStreakScreenProps {
  visible: boolean;
  streak: number;
  history: string[]; // Array of "YYYY-MM-DD" dates the user opened the app
  shieldUsedToday?: boolean; // true when a shield was consumed to protect this streak
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
      false
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
    position: 'absolute',
    width: SCREEN_WIDTH * 2,
    height: SCREEN_WIDTH * 2,
    top: SCREEN_HEIGHT * 0.15 - SCREEN_WIDTH,
    left: SCREEN_WIDTH / 2 - SCREEN_WIDTH,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ray: {
    position: 'absolute',
    width: 0,
    height: 0,
    borderLeftWidth: SCREEN_WIDTH * 0.12,
    borderRightWidth: SCREEN_WIDTH * 0.12,
    borderBottomWidth: SCREEN_WIDTH,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: 'rgba(255, 255, 255, 0.9)',
    transformOrigin: 'bottom center',
    bottom: '50%',
  },
});

export const DailyStreakScreen: React.FC<DailyStreakScreenProps> = ({
  visible,
  streak,
  history,
  shieldUsedToday = false,
  onDismiss,
}) => {
  const mascotScale = useSharedValue(0);
  const numberScale = useSharedValue(0);
  const buttonScale = useSharedValue(1);
  const mascotY = useSharedValue(0);

  const weekDates = getCurrentWeekDates();
  const today = getLocalTodayDateKey();
  const historySet = new Set(history);

  useEffect(() => {
    if (visible) {
      // Reset
      mascotScale.value = 0;
      numberScale.value = 0;

      // Mascot entrance
      mascotScale.value = withDelay(
        200,
        withSpring(1, { damping: 8, stiffness: 100 })
      );

      // Number entrance
      numberScale.value = withDelay(
        500,
        withSpring(1, { damping: 10, stiffness: 120 })
      );

      // Floating mascot
      mascotY.value = withDelay(
        800,
        withRepeat(
          withSequence(
            withTiming(-10, { duration: 2000, easing: Easing.inOut(Easing.sin) }),
            withTiming(0, { duration: 2000, easing: Easing.inOut(Easing.sin) })
          ),
          -1,
          true
        )
      );

      // Haptic celebration
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch (e) {}
    }
  }, [visible]);

  const mascotAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: mascotScale.value },
      { translateY: mascotY.value },
    ],
  }));

  const numberAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: numberScale.value }],
  }));

  const buttonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }],
  }));

  const handlePressIn = () => {
    buttonScale.value = withSpring(0.95, { damping: 10, stiffness: 300 });
  };

  const handlePressOut = () => {
    buttonScale.value = withSpring(1, { damping: 10, stiffness: 300 });
  };

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
        colors={shieldUsedToday
          ? ['#B45309', '#D97706', '#F59E0B'] // Amber/gold when shield protected
          : ['#7C6BC4', '#8B7BD4', '#9688D8']  // Default purple
        }
        style={styles.container}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
      >
        {/* Sunburst rays */}
        <SunburstRays />

        {/* Content */}
        <View style={styles.content}>
          {/* Mascot */}
          <Animated.View style={[styles.mascotContainer, mascotAnimatedStyle]}>
            <Image
              source={require('@/assets/images/streak.png')}
              style={styles.mascot}
              resizeMode="contain"
            />
          </Animated.View>

          {/* Streak count */}
          <Animated.View style={[styles.streakNumberContainer, numberAnimatedStyle]}>
            <Text style={styles.streakNumber}>{streak}</Text>
            <Text style={styles.streakLabel}>DAY STREAK</Text>
          </Animated.View>

          {/* Weekly calendar */}
          <Animated.View
            entering={FadeInUp.delay(700).duration(500)}
            style={styles.calendarContainer}
          >
            <View style={styles.calendarCard}>
              <View style={styles.daysRow}>
                {weekDates.map((dateKey, index) => {
                  const isToday = dateKey === today;
                  const isCompleted = historySet.has(dateKey) && !isToday;
                  const isFuture = dateKey > today;

                  return (
                    <View key={dateKey} style={styles.dayColumn}>
                      <Text
                        style={[
                          styles.dayLabel,
                          isToday && styles.dayLabelToday,
                          isCompleted && styles.dayLabelCompleted,
                        ]}
                      >
                        {DAY_LABELS_SHORT[index]}
                      </Text>
                      <View
                        style={[
                          styles.dayCircle,
                          isCompleted && styles.dayCircleCompleted,
                          isToday && styles.dayCircleToday,
                          isFuture && styles.dayCircleFuture,
                        ]}
                      >
                        {isCompleted && (
                          <Check size={18} color="#FFFFFF" strokeWidth={3} />
                        )}
                        {isToday && (
                          <View style={styles.todayStar}>
                            <Text style={styles.todayStarText}>✦</Text>
                          </View>
                        )}
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>
          </Animated.View>

          {/* Motivational message */}
          <Animated.Text
            entering={FadeInDown.delay(900).duration(500)}
            style={styles.motivationalText}
          >
            {shieldUsedToday
              ? '🛡 ¡Tu escudo protegió tu racha!\n¡Sigue abriendo la app cada día!'
              : '¡Genial! Abre la app cada día para{\n}mantener tu racha con Brainy!'}
          </Animated.Text>
        </View>

        {/* Bottom button */}
        <Animated.View
          entering={SlideInDown.delay(1100).duration(500).springify()}
          style={styles.buttonWrapper}
        >
          <Animated.View style={buttonAnimatedStyle}>
            <Pressable
              onPress={handleDismiss}
              onPressIn={handlePressIn}
              onPressOut={handlePressOut}
              style={styles.button}
            >
              <Text style={styles.buttonText}>¡Vamos!</Text>
            </Pressable>
          </Animated.View>
        </Animated.View>
      </LinearGradient>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  mascotContainer: {
    alignItems: 'center',
    marginBottom: 8,
  },
  mascot: {
    width: 180,
    height: 180,
  },
  streakNumberContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  streakNumber: {
    fontSize: 96,
    fontWeight: '900',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0, 0, 0, 0.15)',
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 8,
    lineHeight: 110,
  },
  streakLabel: {
    fontSize: 22,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 4,
    textShadowColor: 'rgba(0, 0, 0, 0.1)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
    marginTop: -8,
  },
  calendarContainer: {
    width: '100%',
    marginBottom: 24,
  },
  calendarCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 20,
    paddingVertical: 20,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  daysRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  dayColumn: {
    alignItems: 'center',
    gap: 10,
  },
  dayLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.6)',
  },
  dayLabelToday: {
    color: '#FFFFFF',
  },
  dayLabelCompleted: {
    color: 'rgba(255, 255, 255, 0.8)',
  },
  dayCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayCircleCompleted: {
    backgroundColor: '#6C5BB3',
    borderWidth: 2.5,
    borderColor: '#FFFFFF',
  },
  dayCircleToday: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.5)',
    borderStyle: 'dashed',
  },
  dayCircleFuture: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  todayStar: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  todayStarText: {
    fontSize: 20,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  motivationalText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
    lineHeight: 26,
    textShadowColor: 'rgba(0, 0, 0, 0.08)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  buttonWrapper: {
    paddingHorizontal: 32,
    paddingBottom: 50,
  },
  button: {
    backgroundColor: '#FFFFFF',
    borderRadius: 32,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  buttonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#4A3F8A',
    letterSpacing: 0.3,
  },
});
