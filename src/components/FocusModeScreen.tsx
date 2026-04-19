import { PRIMARY_GRADIENT_COLORS } from "@/constants/buttons";
import { colors } from "@/constants/theme";
import { AppText as Text } from "@/src/components/AppText";
import { posthog } from "@/src/config/posthog";
import { useAchievementsStore } from "@/src/store/achievementsStore";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { BlurView } from "expo-blur";
import * as Haptics from "expo-haptics";
import { useKeepAwake } from "expo-keep-awake";
import { LinearGradient } from "expo-linear-gradient";
import { ChevronRight, Clock, Crown } from "lucide-react-native";
import React, {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";
import {
    AppState,
    Dimensions,
    Pressable,
    ScrollView,
    StyleSheet,
    View,
} from "react-native";
import {
    Gesture,
    GestureDetector,
    GestureHandlerRootView,
} from "react-native-gesture-handler";
import Animated, {
    Easing,
    interpolate,
    interpolateColor,
    runOnJS,
    useAnimatedStyle,
    useSharedValue,
    withDelay,
    withRepeat,
    withSequence,
    withSpring,
    withTiming,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

// Types
export type FocusSubtask = {
  id: string;
  title: string;
  duration: number;
  isCompleted: boolean;
};

interface FocusModeScreenProps {
  activityId: string;
  taskTitle: string;
  taskEmoji: string;
  subtasks: FocusSubtask[];
  onComplete: () => void;
  onClose: (updatedSubtasks?: FocusSubtask[]) => void;
}

// Slider constants
const SLIDER_WIDTH = SCREEN_WIDTH - 30;
const SLIDER_HEIGHT = 90;
const THUMB_SIZE = 78;
const SLIDE_THRESHOLD = SLIDER_WIDTH - THUMB_SIZE - 8;

// Burst Particle Component
const BurstParticle = ({
  delay,
  angle,
  color,
}: {
  delay: number;
  angle: number;
  color: string;
}) => {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const opacity = useSharedValue(1);
  const scale = useSharedValue(0);

  useEffect(() => {
    const distance = 300 + Math.random() * 100;
    const radian = (angle * Math.PI) / 180;
    const endX = Math.cos(radian) * distance;
    const endY = Math.sin(radian) * distance;

    scale.value = withDelay(delay, withSpring(1, { damping: 8 }));
    translateX.value = withDelay(
      delay,
      withTiming(endX, {
        duration: 2800,
        easing: Easing.out(Easing.cubic),
      }),
    );
    translateY.value = withDelay(
      delay,
      withTiming(endY, {
        duration: 2800,
        easing: Easing.out(Easing.cubic),
      }),
    );
    opacity.value = withDelay(delay + 2200, withTiming(0, { duration: 600 }));
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[styles.burstParticle, { backgroundColor: color }, animatedStyle]}
    />
  );
};

// Burst Explosion Component
const BurstExplosion = ({ visible }: { visible: boolean }) => {
  if (!visible) return null;

  const colors = [
    "#CBA6F7",
    "#FAB387",
    "#F38BA8",
    "#F9E2AF",
    "#A6E3A1",
    "#89B4FA",
    "#F5C2E7",
  ];
  const particleCount = 40;
  const particles = Array.from({ length: particleCount }, (_, i) => ({
    id: i,
    delay: Math.random() * 200,
    angle: (360 / particleCount) * i + (Math.random() - 0.5) * 20,
    color: colors[Math.floor(Math.random() * colors.length)],
  }));

  return (
    <View style={styles.burstContainer} pointerEvents="none">
      {particles.map((particle) => (
        <BurstParticle
          key={particle.id}
          delay={particle.delay}
          angle={particle.angle}
          color={particle.color}
        />
      ))}
    </View>
  );
};

// Floating Coin Badge — shown on top of confetti
const FloatingCoinBadge = ({
  visible,
  amount,
}: {
  visible: boolean;
  amount: number;
}) => {
  const translateY = useSharedValue(0);
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.5);

  useEffect(() => {
    if (visible) {
      // Pop in
      opacity.value = withSpring(1, { damping: 12, stiffness: 200 });
      scale.value = withSpring(1, { damping: 10, stiffness: 250 });
      translateY.value = withTiming(0, { duration: 200 });

      // Float up then fade out
      const timeout = setTimeout(() => {
        translateY.value = withTiming(-80, { duration: 1200 });
        opacity.value = withTiming(0, { duration: 900 });
      }, 700);

      return () => clearTimeout(timeout);
    } else {
      opacity.value = 0;
      scale.value = 0.5;
      translateY.value = 0;
    }
  }, [visible, amount]);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }, { scale: scale.value }],
  }));

  return (
    <View
      style={[styles.burstContainer, !visible && { opacity: 0 }]}
      pointerEvents="none"
    >
      <Animated.View style={[styles.floatingCoinBadge, animStyle]}>
        <Crown size={22} color={colors.primary} strokeWidth={2.5} />
        <Text style={styles.floatingCoinText}>+{amount}</Text>
      </Animated.View>
    </View>
  );
};

// Swipe to Complete Slider Component
const SwipeToCompleteSlider = ({
  onComplete,
  isLastTask,
  currentIndex,
}: {
  onComplete: () => void;
  isLastTask: boolean;
  currentIndex: number;
}) => {
  const translateX = useSharedValue(0);
  const isCompleted = useSharedValue(false);
  const textOpacity = useSharedValue(1);
  const backgroundProgress = useSharedValue(0);
  const lastHapticX = useSharedValue(0);

  const triggerHapticSuccess = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, []);

  const triggerHapticLight = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  // Use a ref so the gesture worklet always has the latest callback
  // without the gesture object needing to be recreated on every re-render
  const onCompleteRef = useRef(onComplete);
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  const handleComplete = useCallback(() => {
    onCompleteRef.current();
  }, []);

  // Reset slider when task changes
  useEffect(() => {
    translateX.value = 0;
    isCompleted.value = false;
    textOpacity.value = 1;
    backgroundProgress.value = 0;
  }, [currentIndex]);

  const panGesture = useMemo(
    () =>
      Gesture.Pan()
        .onStart(() => {
          if (isCompleted.value) return;
          runOnJS(triggerHapticLight)();
        })
        .onUpdate((event) => {
          if (isCompleted.value) return;
          const newX = Math.max(
            0,
            Math.min(event.translationX, SLIDE_THRESHOLD),
          );
          translateX.value = newX;
          backgroundProgress.value = newX / SLIDE_THRESHOLD;
          textOpacity.value = interpolate(
            newX,
            [0, SLIDE_THRESHOLD * 0.5],
            [1, 0],
          );

          // Haptic tick effect while sliding
          if (Math.abs(newX - lastHapticX.value) > 20) {
            runOnJS(triggerHapticLight)();
            lastHapticX.value = newX;
          }
        })
        .onEnd(() => {
          if (isCompleted.value) return;
          if (translateX.value >= SLIDE_THRESHOLD * 0.9) {
            // Complete!
            isCompleted.value = true;
            translateX.value = withSpring(SLIDE_THRESHOLD);
            backgroundProgress.value = withTiming(1);
            runOnJS(triggerHapticSuccess)();
            runOnJS(handleComplete)();
          } else {
            // Reset
            translateX.value = withSpring(0);
            backgroundProgress.value = withSpring(0);
            textOpacity.value = withSpring(1);
          }
        }),
    [],
  ); // stable — all callbacks use refs, no deps needed

  const thumbStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const textStyle = useAnimatedStyle(() => ({
    opacity: textOpacity.value,
  }));

  const backgroundStyle = useAnimatedStyle(() => {
    const progress = backgroundProgress.value;
    return {
      width: interpolate(progress, [0, 1], [THUMB_SIZE + 8, SLIDER_WIDTH]),
      backgroundColor: interpolateColor(
        progress,
        [0, 0.5, 1],
        [
          "rgba(255, 255, 255, 0.01)",
          "rgba(255, 255, 255, 0.1)",
          "rgba(255, 255, 255, 0.25)",
        ],
      ),
    };
  });

  return (
    <View style={styles.sliderContainer}>
      <BlurView intensity={35} tint="dark" style={styles.sliderTrack}>
        {/* Progress fill */}
        <Animated.View style={[styles.sliderFill, backgroundStyle]} />

        {/* Text */}
        <Animated.Text style={[styles.sliderText, textStyle]}>
          {isLastTask ? "Finalizar..." : "Desliza para completar..."}
        </Animated.Text>

        {/* Big Neon Thumb */}
        <GestureDetector gesture={panGesture}>
          <Animated.View style={[thumbStyle, styles.sliderThumbWrapper]}>
            <View style={styles.thumbGlow} />
            <LinearGradient
              colors={[colors.primary, colors.textSecondary]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.sliderThumbApple}
            >
              <ChevronRight
                size={32}
                color={colors.background}
                strokeWidth={3}
              />
            </LinearGradient>
          </Animated.View>
        </GestureDetector>
      </BlurView>
    </View>
  );
};

// Progress Bar Component
const ProgressBar = ({
  isActive,
  isCompleted,
  onPress,
}: {
  isActive: boolean;
  isCompleted: boolean;
  onPress?: () => void;
}) => {
  const pulseOpacity = useSharedValue(1);
  const scale = useSharedValue(1);

  useEffect(() => {
    if (isActive) {
      pulseOpacity.value = withRepeat(
        withSequence(
          withTiming(0.5, { duration: 800 }),
          withTiming(1, { duration: 800 }),
        ),
        -1,
        true,
      );
      scale.value = withRepeat(
        withSequence(
          withTiming(1.05, { duration: 800 }),
          withTiming(1, { duration: 800 }),
        ),
        -1,
        true,
      );
    } else {
      pulseOpacity.value = withTiming(1);
      scale.value = withTiming(1);
    }
  }, [isActive]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: pulseOpacity.value,
    transform: [{ scaleY: scale.value }],
  }));

  return (
    <Pressable
      style={{ flex: 1, paddingVertical: 10, justifyContent: "center" }}
      onPress={onPress}
    >
      <Animated.View
        style={[
          styles.progressBar,
          isCompleted && styles.progressBarCompleted,
          isActive && styles.progressBarActive,
          { flex: undefined },
          animatedStyle,
        ]}
      />
    </Pressable>
  );
};

// Main Component
export function FocusModeScreen({
  activityId,
  taskTitle,
  taskEmoji,
  subtasks: initialSubtasks,
  onComplete,
  onClose,
}: FocusModeScreenProps) {
  // Mantener la pantalla activa durante el modo focus
  useKeepAwake();

  const [subtasks, setSubtasks] = useState(initialSubtasks);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);
  const [earnedCoins, setEarnedCoins] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(true);
  const [isClosing, setIsClosing] = useState(false);
  const [totalElapsedTime, setTotalElapsedTime] = useState(0);
  const [showExitModal, setShowExitModal] = useState(false);

  // Background Gradient Animation (600% panning CSS-like)
  const gradientTranslateX = useSharedValue(0);

  useEffect(() => {
    gradientTranslateX.value = withRepeat(
      withSequence(
        withTiming(-SCREEN_WIDTH * 5, {
          duration: 7000,
          easing: Easing.inOut(Easing.ease),
        }),
        withTiming(0, { duration: 7000, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      false,
    );
  }, []);

  const animatedGradientStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: gradientTranslateX.value }],
  }));

  // Timestamps para calcular el tiempo
  const startTimeRef = useRef<number>(Date.now());
  const baseTotalTimeRef = useRef<number>(0);
  const subtasksRef = useRef<FocusSubtask[]>(subtasks);
  const celebrationTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  // Mantener ref actualizado con las subtasks más recientes
  useEffect(() => {
    subtasksRef.current = subtasks;
  }, [subtasks]);

  // Guardar subtasks cuando el componente se desmonte, SOLO si no cerró explícitamente
  const isExplicitlyClosedRef = useRef(false);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    return () => {
      if (!isExplicitlyClosedRef.current) {
        onCloseRef.current(subtasksRef.current);
      }
    };
  }, []);

  // Load saved progress on mount
  useEffect(() => {
    const loadProgress = async () => {
      try {
        const saved = await AsyncStorage.getItem(
          `focus_progress_${activityId}`,
        );
        if (saved) {
          const progress = JSON.parse(saved);
          setCurrentIndex(progress.currentIndex);

          if (progress.startTime) {
            // Nuevo formato con timestamps reales
            startTimeRef.current = progress.startTime;
            baseTotalTimeRef.current = progress.baseTotalTime || 0;
            const newElapsed = Math.max(
              0,
              Math.floor((Date.now() - progress.startTime) / 1000),
            );
            setElapsedTime(newElapsed);
            setTotalElapsedTime(baseTotalTimeRef.current + newElapsed);
          } else if (progress.elapsedTime !== undefined) {
            // Fallback para formato antiguo
            setTotalElapsedTime(progress.totalElapsedTime);
            setElapsedTime(progress.elapsedTime);
            baseTotalTimeRef.current =
              progress.totalElapsedTime - progress.elapsedTime;
            startTimeRef.current = Date.now() - progress.elapsedTime * 1000;
          }
        }
      } catch (error) {
        console.error("Error loading progress:", error);
      }
    };
    loadProgress();
  }, [activityId]);

  // Save progress securely
  const saveCurrentProgress = useCallback(async () => {
    try {
      const progress = {
        currentIndex,
        startTime: startTimeRef.current,
        baseTotalTime: baseTotalTimeRef.current,
      };
      await AsyncStorage.setItem(
        `focus_progress_${activityId}`,
        JSON.stringify(progress),
      );
    } catch (error) {
      console.error("Error saving progress:", error);
    }
  }, [currentIndex, activityId]);

  useEffect(() => {
    saveCurrentProgress();
  }, [saveCurrentProgress]);

  // Background gradient (static — animation removed, gradientPosition was unused)
  const gradientPosition = useSharedValue(0); // kept for potential future use

  // Timer basado en timestamps reales para funcionar automáticamente en background
  useEffect(() => {
    if (!isTimerRunning || isClosing) return;

    const interval = setInterval(() => {
      const now = Date.now();
      const elapsed = Math.floor((now - startTimeRef.current) / 1000);
      setElapsedTime(elapsed);
      setTotalElapsedTime(baseTotalTimeRef.current + elapsed);
    }, 1000);

    return () => clearInterval(interval);
  }, [isTimerRunning, isClosing]); // elapsedTime NO debe ser dependencia

  // AppState listener sin thrashing
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextAppState) => {
      if (nextAppState === "active") {
        // Fuerza actualización inmediata visual cuando la app vuelve
        if (isTimerRunning && !isClosing && startTimeRef.current > 0) {
          const elapsed = Math.floor(
            (Date.now() - startTimeRef.current) / 1000,
          );
          setElapsedTime(elapsed);
          setTotalElapsedTime(baseTotalTimeRef.current + elapsed);
        }
      } else if (nextAppState === "background" || nextAppState === "inactive") {
        saveCurrentProgress();
      }
    });

    return () => subscription.remove();
  }, [isTimerRunning, isClosing, saveCurrentProgress]);

  // Limpiar timeout de celebración si el componente se desmonta inesperadamente
  useEffect(() => {
    return () => {
      if (celebrationTimeoutRef.current)
        clearTimeout(celebrationTimeoutRef.current);
    };
  }, []);

  const currentSubtask = subtasks[currentIndex];
  const isLastTask = currentIndex === subtasks.length - 1;
  const completedCount = subtasks.filter((s) => s.isCompleted).length;

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const handleCompleteTask = useCallback(async () => {
    const completedSubtask = subtasks[currentIndex];

    // Award coins using static store access (no hook subscription → no re-render → modal stays open)
    if (completedSubtask) {
      const duration = completedSubtask.duration || 0;
      const difficulty: "easy" | "moderate" | "hard" =
        duration >= 20 ? "hard" : duration >= 10 ? "moderate" : "easy";
      const result = await useAchievementsStore
        .getState()
        .awardTaskCompletionCoins(activityId, difficulty, completedSubtask.id);
      // Show badge whenever coins were earned (isNew = first time today for this subtask)
      setEarnedCoins(result.earned);
    }

    // Show confetti
    setShowConfetti(true);
    setIsTimerRunning(false);

    // Mark current task as completed
    setSubtasks((prev) =>
      prev.map((task, idx) =>
        idx === currentIndex ? { ...task, isCompleted: true } : task,
      ),
    );

    // Wait for celebration, then move to next or close
    if (celebrationTimeoutRef.current)
      clearTimeout(celebrationTimeoutRef.current);

    celebrationTimeoutRef.current = setTimeout(async () => {
      if (!isExplicitlyClosedRef.current) {
        setShowConfetti(false);
        setEarnedCoins(0);

        if (isLastTask) {
          // Limpiar progreso guardado
          try {
            await AsyncStorage.removeItem(`focus_progress_${activityId}`);
          } catch (error) {
            console.error("Error clearing progress:", error);
          }

          posthog.capture("focus_session_completed", {
            task_id: activityId,
            subtasks_count: subtasksRef.current.length,
            total_time_seconds: totalElapsedTime,
          });

          // Cerrar la pantalla — marcar como cerrado explícito para evitar doble onClose en unmount
          isExplicitlyClosedRef.current = true;
          onCloseRef.current(subtasksRef.current);
        } else {
          // Next task
          baseTotalTimeRef.current = totalElapsedTime; // Guards progreso total hasta hora
          setCurrentIndex((prev) => prev + 1);
          setElapsedTime(0);
          startTimeRef.current = Date.now();
          setIsTimerRunning(true);
        }
      }
    }, 2800);

    // No devolver cleanup en useCallback, ya se hace en el useEffect superior
  }, [
    currentIndex,
    isLastTask,
    activityId,
    isClosing,
    totalElapsedTime,
    subtasks,
  ]);

  const goToPrevious = useCallback(() => {
    if (currentIndex > 0) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      baseTotalTimeRef.current = totalElapsedTime; // Guardar todo el progreso

      setCurrentIndex((prev) => prev - 1);
      setElapsedTime(0);
      startTimeRef.current = Date.now();
      setIsTimerRunning(true); // Asegurar que el timer siga corriendo
    }
  }, [currentIndex, totalElapsedTime]);

  const goToNext = useCallback(() => {
    if (currentIndex < subtasks.length - 1) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      baseTotalTimeRef.current = totalElapsedTime; // Guardar progreso total

      setCurrentIndex((prev) => prev + 1);
      setElapsedTime(0);
      startTimeRef.current = Date.now();
      setIsTimerRunning(true); // Asegurar que el timer siga corriendo
    }
  }, [currentIndex, subtasks.length, totalElapsedTime]);

  const handleClose = useCallback(() => {
    setShowExitModal(true);
  }, []);

  const handleConfirmExit = useCallback(async () => {
    // Marcar como cerrado explícito PRIMERO para que el cleanup en unmount no llame onClose de nuevo
    isExplicitlyClosedRef.current = true;
    setIsClosing(true);
    setIsTimerRunning(false);

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    } catch (error) {}

    // Clear saved progress when exiting
    try {
      await AsyncStorage.removeItem(`focus_progress_${activityId}`);
    } catch (error) {
      console.error("Error clearing progress:", error);
    }

    const completedCount = subtasksRef.current.filter(
      (s) => s.isCompleted,
    ).length;
    posthog.capture("focus_session_exited", {
      task_id: activityId,
      subtasks_completed: completedCount,
      subtasks_total: subtasksRef.current.length,
      time_spent_seconds: totalElapsedTime,
    });

    setTimeout(() => {
      onCloseRef.current(subtasksRef.current); // Pass updated subtasks to parent
    }, 50);
  }, [activityId]);

  const handleCancelExit = useCallback(() => {
    setShowExitModal(false);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    } catch (error) {}
  }, []);

  const swipeGesture = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetX([-30, 30])
        .onEnd((e) => {
          if (e.translationX < -50) {
            runOnJS(goToNext)();
          } else if (e.translationX > 50) {
            runOnJS(goToPrevious)();
          }
        }),
    [goToNext, goToPrevious],
  );

  return (
    <GestureHandlerRootView style={styles.container}>
      {/* CSS-Like Animated Background Gradient (600%) */}
      <View style={[StyleSheet.absoluteFill, { overflow: "hidden" }]}>
        <Animated.View
          style={[{ width: "900%", height: "100%" }, animatedGradientStyle]}
        >
          <LinearGradient
            colors={[
              "#6e4bc5",
              "#2b5c8c",
              "#fb38fd",
              "#6e4bc5",
              "#2b5c8c",
              "#fb38fd",
              "#6e4bc5",
            ]}
            style={StyleSheet.absoluteFill}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 2, y: 0.5 }}
          />
        </Animated.View>
      </View>

      {/* Dark tint overlay for better contrast and vignette feel */}
      <View
        style={[
          StyleSheet.absoluteFill,
          { backgroundColor: "rgba(0,0,0,0.45)" },
        ]}
        pointerEvents="none"
      />

      <SafeAreaView style={styles.safeArea}>
        {/* Header Sin Boton Cerrar */}
        <View style={styles.header}>
          {/* Progress Bars (Stories style) */}
          <View style={styles.progressBarsContainer}>
            {subtasks.map((subtask, index) => (
              <ProgressBar
                key={subtask.id}
                isActive={index === currentIndex}
                isCompleted={subtask.isCompleted}
                onPress={() => {
                  if (!showConfetti) {
                    setCurrentIndex(index);
                  }
                }}
              />
            ))}
          </View>

          {/* Subtask Info Row */}
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              paddingHorizontal: 6,
              marginTop: 12,
            }}
          >
            {/* Timer Left */}
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
            >
              <Clock size={14} color={colors.textSecondary} />
              <Text
                style={[
                  styles.progressText,
                  { textAlign: "left", fontVariant: ["tabular-nums"] },
                ]}
              >
                {formatTime(elapsedTime)} / {currentSubtask?.duration} min
              </Text>
            </View>

            {/* Progress Right */}
            <Text style={[styles.progressText, { textAlign: "right" }]}>
              {completedCount} / {subtasks.length} completados
            </Text>
          </View>
        </View>

        {/* Main Content (Swipeable) */}
        <GestureDetector gesture={swipeGesture}>
          <View style={styles.content}>
            {/* Current Subtask */}
            <View style={styles.subtaskContainer}>
              {currentSubtask && (
                <View key={currentSubtask.id} style={styles.subtaskContent}>
                  {/* Subtask Title (Scrollable to prevent truncation) */}
                  <ScrollView
                    style={{ maxHeight: 220, width: "100%" }}
                    contentContainerStyle={{
                      flexGrow: 1,
                      justifyContent: "center",
                    }}
                    showsVerticalScrollIndicator={false}
                    bounces={false}
                  >
                    <Text style={styles.subtaskTitle}>
                      {currentSubtask.title}
                    </Text>
                  </ScrollView>
                </View>
              )}
            </View>
          </View>
        </GestureDetector>

        {/* Footer - Swipe Slider */}
        <View style={styles.footer}>
          {/* Tip */}
          <Text style={styles.tipText}>💡 Enfócate solo en este paso</Text>

          <SwipeToCompleteSlider
            onComplete={handleCompleteTask}
            isLastTask={isLastTask}
            currentIndex={currentIndex}
          />
        </View>
      </SafeAreaView>

      {/* Confetti */}
      <BurstExplosion visible={showConfetti} />

      {/* Floating Coin Reward */}
      <FloatingCoinBadge
        visible={showConfetti && earnedCoins > 0}
        amount={earnedCoins}
      />

      {/* Exit Confirmation Modal */}
      {showExitModal && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <LinearGradient
              colors={["rgba(49, 50, 68, 0.95)", "rgba(30, 30, 46, 0.95)"]}
              style={styles.modalGradient}
            >
              <Text style={styles.modalTitle}>¿Salir del Focus Mode?</Text>
              <Text style={styles.modalSubtitle}>
                {subtasks.filter((s) => !s.isCompleted).length} subtarea
                {subtasks.filter((s) => !s.isCompleted).length !== 1 ? "s" : ""}{" "}
                pendiente
                {subtasks.filter((s) => !s.isCompleted).length !== 1 ? "s" : ""}
              </Text>

              <View style={styles.modalButtons}>
                <Pressable
                  onPress={handleConfirmExit}
                  style={styles.modalButton}
                >
                  <LinearGradient
                    colors={PRIMARY_GRADIENT_COLORS}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.modalButtonGradient}
                  >
                    <Text style={styles.modalButtonText}>Guardar y Salir</Text>
                  </LinearGradient>
                </Pressable>

                <Pressable
                  onPress={handleCancelExit}
                  style={styles.modalSecondaryButton}
                >
                  <Text style={styles.modalSecondaryButtonText}>
                    Seguir Aquí
                  </Text>
                </Pressable>
              </View>
            </LinearGradient>
          </View>
        </View>
      )}
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  vignetteOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
  },
  ambientGlow: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0,
  },
  safeArea: {
    flex: 1,
    zIndex: 2,
  },

  // Header
  header: {
    paddingHorizontal: 20,
    paddingTop: 8,
    gap: 12,
  },
  closeButton: {
    position: "absolute",
    top: 8,
    right: 16,
    padding: 8,
    zIndex: 10,
  },
  taskTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingRight: 40,
  },
  taskEmoji: {
    fontSize: 33,
  },
  taskTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.textPrimary,
    letterSpacing: -0.3,
  },
  progressBarsContainer: {
    flexDirection: "row",
    gap: 4,
    paddingHorizontal: 4,
  },
  progressBar: {
    flex: 1,
    height: 3,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 2,
  },
  progressBarCompleted: {
    backgroundColor: colors.success,
  },
  progressBarActive: {
    backgroundColor: colors.primary,
    height: 4,
  },
  progressText: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: "center",
  },

  // Content
  content: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  navButton: {
    padding: 14,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.05)",
  },
  navButtonLeft: {
    marginRight: 8,
  },
  navButtonRight: {
    marginLeft: 8,
  },
  subtaskContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  subtaskContent: {
    alignItems: "center",
    gap: 20,
  },
  stepIndicator: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: colors.primary + "1F",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.primary + "33",
  },
  stepText: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.primary,
    letterSpacing: -0.2,
  },
  subtaskTitle: {
    fontSize: 32,
    fontWeight: "700",
    color: colors.textPrimary,
    textAlign: "center",
    letterSpacing: -0.5,
    lineHeight: 42,
    paddingHorizontal: 8,
  },
  timerContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  timerText: {
    fontSize: 26,
    fontWeight: "800",
    color: colors.textPrimary,
    fontVariant: ["tabular-nums"],
  },
  estimatedTime: {
    fontSize: 14,
    color: colors.textSecondary,
  },

  // Footer
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 20,
    gap: 16,
  },
  tipText: {
    fontSize: 10,
    color: colors.textSecondary,
    textAlign: "center",
    opacity: 0.6,
    textTransform: "uppercase",
    letterSpacing: 2,
  },

  // Slider - Frosted glass
  sliderContainer: {
    alignItems: "center",
  },
  sliderTrack: {
    width: SLIDER_WIDTH,
    height: SLIDER_HEIGHT,
    borderRadius: SLIDER_HEIGHT / 2,
    justifyContent: "center",
    overflow: "hidden",
    backgroundColor: "rgba(0, 0, 0, 0.2)", // Deepens the background slightly behind the blur
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  sliderFill: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: SLIDER_HEIGHT / 2,
  },
  sliderText: {
    fontSize: 14,
    fontWeight: "400",
    color: "rgba(255,255,255,0.7)" + 40,
    textAlign: "center",
    marginLeft: THUMB_SIZE + 10,
    letterSpacing: 1,
  },
  sliderThumbWrapper: {
    position: "absolute",
    left: 4,
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    justifyContent: "center",
    alignItems: "center",
  },
  thumbGlow: {
    position: "absolute",
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_SIZE / 2,
    backgroundColor: "#ffffff",
    opacity: 0.8,
    shadowColor: "#ffffff",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 15,
    elevation: 10,
  },
  sliderThumbApple: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_SIZE / 2,
    justifyContent: "center",
    alignItems: "center",
    elevation: 5,
  },
  sliderThumb: {
    position: "absolute",
    left: 4,
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_SIZE / 2,
    backgroundColor: colors.primary,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 8,
  },

  // Confetti / Burst
  burstContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 100,
  },
  burstParticle: {
    position: "absolute",
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  floatingCoinBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(0,0,0,0.55)",
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 40,
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  floatingCoinText: {
    fontSize: 28,
    fontWeight: "900",
    color: colors.primary,
    letterSpacing: -0.5,
  },

  // Exit Modal
  modalOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 200,
  },
  modalContainer: {
    width: SCREEN_WIDTH - 48,
    borderRadius: 24,
    overflow: "hidden",
  },
  modalGradient: {
    padding: 32,
    gap: 20,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#FFFFFF",
    textAlign: "center",
  },
  modalSubtitle: {
    fontSize: 16,
    color: "rgba(255, 255, 255, 0.7)",
    textAlign: "center",
  },
  modalButtons: {
    gap: 12,
    marginTop: 8,
  },
  modalButton: {
    borderRadius: 16,
    overflow: "hidden",
  },
  modalButtonGradient: {
    paddingVertical: 16,
    alignItems: "center",
  },
  modalButtonText: {
    fontSize: 18,
    fontWeight: "600",
    color: colors.background,
  },
  modalSecondaryButton: {
    paddingVertical: 16,
    alignItems: "center",
  },
  modalSecondaryButtonText: {
    fontSize: 16,
    color: "rgba(255, 255, 255, 0.6)",
  },
});

export default FocusModeScreen;
