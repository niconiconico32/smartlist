import { PRIMARY_GRADIENT_COLORS } from '@/constants/buttons';
import { colors } from '@/constants/theme';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { useKeepAwake } from 'expo-keep-awake';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  X
} from 'lucide-react-native';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AppState,
  Dimensions,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
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
  withTiming
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

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
const SLIDER_WIDTH = SCREEN_WIDTH - 48;
const SLIDER_HEIGHT = 85;
const THUMB_SIZE = 70;
const SLIDE_THRESHOLD = SLIDER_WIDTH - THUMB_SIZE - 8;

// Burst Particle Component
const BurstParticle = ({
  delay,
  angle,
  color
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
      })
    );
    translateY.value = withDelay(
      delay,
      withTiming(endY, {
        duration: 2800,
        easing: Easing.out(Easing.cubic),
      })
    );
    opacity.value = withDelay(
      delay + 2200,
      withTiming(0, { duration: 600 })
    );
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
      style={[
        styles.burstParticle,
        { backgroundColor: color },
        animatedStyle,
      ]}
    />
  );
};

// Burst Explosion Component
const BurstExplosion = ({ visible }: { visible: boolean }) => {
  if (!visible) return null;

  const colors = ['#CBA6F7', '#FAB387', '#F38BA8', '#F9E2AF', '#A6E3A1', '#89B4FA', '#F5C2E7'];
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

  const triggerHapticSuccess = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, []);

  const triggerHapticLight = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  // Use a ref so the gesture worklet always has the latest callback
  // without the gesture object needing to be recreated on every re-render
  const onCompleteRef = useRef(onComplete);
  useEffect(() => { onCompleteRef.current = onComplete; }, [onComplete]);

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

  const panGesture = useMemo(() => Gesture.Pan()
    .onStart(() => {
      if (isCompleted.value) return;
      runOnJS(triggerHapticLight)();
    })
    .onUpdate((event) => {
      if (isCompleted.value) return;
      const newX = Math.max(0, Math.min(event.translationX, SLIDE_THRESHOLD));
      translateX.value = newX;
      backgroundProgress.value = newX / SLIDE_THRESHOLD;
      textOpacity.value = interpolate(
        newX,
        [0, SLIDE_THRESHOLD * 0.5],
        [1, 0]
      );
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
    }), []);  // stable — all callbacks use refs, no deps needed

  const thumbStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
    ],
  }));

  const textStyle = useAnimatedStyle(() => ({
    opacity: textOpacity.value,
  }));

  const backgroundStyle = useAnimatedStyle(() => {
    const progress = backgroundProgress.value;
    return {
      width: interpolate(
        progress,
        [0, 1],
        [THUMB_SIZE + 8, SLIDER_WIDTH]
      ),
      // Cambiar color del fill a medida que se arrastra (Lavender → Peach)
      backgroundColor: interpolateColor(
        progress,
        [0, 0.5, 1],
        ['rgba(203, 166, 247, 0.25)', '#CBA6F7', '#FAB387']
      ),
    };
  });

  return (
    <View style={styles.sliderContainer}>
      <View style={styles.sliderTrack}>
        {/* Progress fill */}
        <Animated.View style={[styles.sliderFill, backgroundStyle]} />

        {/* Text */}
        <Animated.Text style={[styles.sliderText, textStyle]}>
          {isLastTask ? 'Desliza para finalizar 🎉' : 'Desliza para completar >>>'}
        </Animated.Text>

        {/* Thumb */}
        <GestureDetector gesture={panGesture}>
          <Animated.View style={[thumbStyle, styles.sliderThumbWrapper]}>
            <LinearGradient
              colors={PRIMARY_GRADIENT_COLORS}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.sliderThumbGradient}
            >
              <ChevronRight size={22} color={colors.background} strokeWidth={3} />
            </LinearGradient>
          </Animated.View>
        </GestureDetector>
      </View>
    </View>
  );
};

// Progress Bar Component
const ProgressBar = ({
  isActive,
  isCompleted,
}: {
  isActive: boolean;
  isCompleted: boolean;
}) => {
  const pulseOpacity = useSharedValue(1);
  const scale = useSharedValue(1);

  useEffect(() => {
    if (isActive) {
      pulseOpacity.value = withRepeat(
        withSequence(
          withTiming(0.5, { duration: 800 }),
          withTiming(1, { duration: 800 })
        ),
        -1,
        true
      );
      scale.value = withRepeat(
        withSequence(
          withTiming(1.05, { duration: 800 }),
          withTiming(1, { duration: 800 })
        ),
        -1,
        true
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
    <Animated.View
      style={[
        styles.progressBar,
        isCompleted && styles.progressBarCompleted,
        isActive && styles.progressBarActive,
        animatedStyle,
      ]}
    />
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
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(true);
  const [isClosing, setIsClosing] = useState(false);
  const [totalElapsedTime, setTotalElapsedTime] = useState(0);
  const [showExitModal, setShowExitModal] = useState(false);

  // Timestamps para calcular el tiempo
  const startTimeRef = useRef<number>(Date.now());
  const baseTotalTimeRef = useRef<number>(0);
  const subtasksRef = useRef<FocusSubtask[]>(subtasks);
  const celebrationTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Mantener ref actualizado con las subtasks más recientes
  useEffect(() => {
    subtasksRef.current = subtasks;
  }, [subtasks]);

  // Guardar subtasks cuando el componente se desmonte, SOLO si no cerró explícitamente
  const isExplicitlyClosedRef = useRef(false);
  useEffect(() => {
    return () => {
      if (!isExplicitlyClosedRef.current) {
        onClose(subtasksRef.current);
      }
    };
  }, [onClose]);

  // Load saved progress on mount
  useEffect(() => {
    const loadProgress = async () => {
      try {
        const saved = await AsyncStorage.getItem(`focus_progress_${activityId}`);
        if (saved) {
          const progress = JSON.parse(saved);
          setCurrentIndex(progress.currentIndex);

          if (progress.startTime) {
            // Nuevo formato con timestamps reales
            startTimeRef.current = progress.startTime;
            baseTotalTimeRef.current = progress.baseTotalTime || 0;
            const newElapsed = Math.max(0, Math.floor((Date.now() - progress.startTime) / 1000));
            setElapsedTime(newElapsed);
            setTotalElapsedTime(baseTotalTimeRef.current + newElapsed);
          } else if (progress.elapsedTime !== undefined) {
            // Fallback para formato antiguo
            setTotalElapsedTime(progress.totalElapsedTime);
            setElapsedTime(progress.elapsedTime);
            baseTotalTimeRef.current = progress.totalElapsedTime - progress.elapsedTime;
            startTimeRef.current = Date.now() - (progress.elapsedTime * 1000);
          }
        }
      } catch (error) {
        console.error('Error loading progress:', error);
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
      await AsyncStorage.setItem(`focus_progress_${activityId}`, JSON.stringify(progress));
    } catch (error) {
      console.error('Error saving progress:', error);
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
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        // Fuerza actualización inmediata visual cuando la app vuelve
        if (isTimerRunning && !isClosing && startTimeRef.current > 0) {
          const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
          setElapsedTime(elapsed);
          setTotalElapsedTime(baseTotalTimeRef.current + elapsed);
        }
      } else if (nextAppState === 'background' || nextAppState === 'inactive') {
        saveCurrentProgress();
      }
    });

    return () => subscription.remove();
  }, [isTimerRunning, isClosing, saveCurrentProgress]);

  // Limpiar timeout de celebración si el componente se desmonta inesperadamente
  useEffect(() => {
    return () => {
      if (celebrationTimeoutRef.current) clearTimeout(celebrationTimeoutRef.current);
    };
  }, []);

  const currentSubtask = subtasks[currentIndex];
  const isLastTask = currentIndex === subtasks.length - 1;
  const completedCount = subtasks.filter((s) => s.isCompleted).length;

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleCompleteTask = useCallback(() => {
    // Show confetti
    setShowConfetti(true);
    setIsTimerRunning(false);

    // Mark current task as completed
    setSubtasks((prev) =>
      prev.map((task, idx) =>
        idx === currentIndex ? { ...task, isCompleted: true } : task
      )
    );

    // Wait for celebration, then move to next or close
    if (celebrationTimeoutRef.current) clearTimeout(celebrationTimeoutRef.current);

    celebrationTimeoutRef.current = setTimeout(async () => {
      if (!isExplicitlyClosedRef.current) {
        setShowConfetti(false);

        if (isLastTask) {
          // Limpiar progreso guardado
          try {
            await AsyncStorage.removeItem(`focus_progress_${activityId}`);
          } catch (error) {
            console.error('Error clearing progress:', error);
          }

          // Cerrar la pantalla — marcar como cerrado explícito para evitar doble onClose en unmount
          isExplicitlyClosedRef.current = true;
          onClose(subtasksRef.current);
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
  }, [currentIndex, isLastTask, activityId, isClosing, onClose, totalElapsedTime]);

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
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => { });
    } catch (error) { }

    // Clear saved progress when exiting
    try {
      await AsyncStorage.removeItem(`focus_progress_${activityId}`);
    } catch (error) {
      console.error('Error clearing progress:', error);
    }

    setTimeout(() => {
      onClose(subtasksRef.current); // Pass updated subtasks to parent
    }, 50);
  }, [activityId, onClose]);

  const handleCancelExit = useCallback(() => {
    setShowExitModal(false);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => { });
    } catch (error) { }
  }, []);



  return (
    <GestureHandlerRootView style={styles.container}>
      {/* Animated Background Gradient */}
      <LinearGradient
        colors={[colors.background, colors.surface, colors.background, colors.surface]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      {/* Vignette Effect */}
      <View style={styles.vignetteOverlay}>
        <LinearGradient
          colors={['rgba(0,0,0,0.8)', 'transparent', 'transparent', 'rgba(0,0,0,0.8)']}
          style={StyleSheet.absoluteFill}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
        />
        <LinearGradient
          colors={['rgba(0,0,0,0.6)', 'transparent', 'transparent', 'rgba(0,0,0,0.6)']}
          style={StyleSheet.absoluteFill}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
        />
      </View>

      {/* Ambient glow behind current task */}
      <View style={styles.ambientGlow}>
        <LinearGradient
          colors={['transparent', 'rgba(236, 242, 48, 0.12)', 'transparent']}
          style={StyleSheet.absoluteFill}
          start={{ x: 0.5, y: 0.3 }}
          end={{ x: 0.5, y: 0.7 }}
        />
      </View>

      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          {/* Close Button */}
          <Pressable onPress={handleClose} style={styles.closeButton}>
            <X size={24} color={colors.textSecondary} />
          </Pressable>

          {/* Task Title */}
          <View style={styles.taskTitleContainer}>
            <Text style={styles.taskEmoji}>{taskEmoji}</Text>
            <Text style={styles.taskTitle} numberOfLines={1}>
              {taskTitle}
            </Text>
          </View>

          {/* Progress Bars (Stories style) */}
          <View style={styles.progressBarsContainer}>
            {subtasks.map((subtask, index) => (
              <ProgressBar
                key={subtask.id}
                isActive={index === currentIndex}
                isCompleted={subtask.isCompleted}
              />
            ))}
          </View>

          {/* Progress Text */}
          <Text style={styles.progressText}>
            {completedCount} / {subtasks.length} completados
          </Text>
        </View>

        {/* Main Content */}
        <View style={styles.content}>
          {/* Navigation - Previous */}
          <Pressable
            onPress={goToPrevious}
            style={[styles.navButton, styles.navButtonLeft]}
            disabled={currentIndex === 0 || showConfetti}
          >
            <ChevronLeft
              size={24}
              color={currentIndex === 0 || showConfetti ? colors.disabled : colors.textSecondary}
            />
          </Pressable>

          {/* Current Subtask */}
          <View style={styles.subtaskContainer}>
            {currentSubtask && (
              <View
                key={currentSubtask.id}
                style={styles.subtaskContent}
              >
                {/* Timer / Duration */}
                <View style={styles.timerContainer}>
                  <Clock size={18} color={colors.textSecondary} />
                  <Text style={styles.timerText}>
                    {formatTime(elapsedTime)}
                  </Text>
                  <Text style={styles.estimatedTime}>
                    / {currentSubtask.duration} min estimado
                  </Text>
                </View>

                {/* Subtask Title */}
                <Text
                  style={styles.subtaskTitle}
                  adjustsFontSizeToFit
                  numberOfLines={3}
                >
                  {currentSubtask.title}
                </Text>
              </View>
            )}
          </View>

          {/* Navigation - Next */}
          <Pressable
            onPress={goToNext}
            style={[styles.navButton, styles.navButtonRight]}
            disabled={currentIndex === subtasks.length - 1 || showConfetti}
          >
            <ChevronRight
              size={24}
              color={currentIndex === subtasks.length - 1 || showConfetti ? colors.disabled : colors.textSecondary}
            />
          </Pressable>
        </View>

        {/* Footer - Swipe Slider */}
        <View style={styles.footer}>
          {/* Tip */}
          <Text style={styles.tipText}>
            💡 Enfócate solo en este paso
          </Text>

          <SwipeToCompleteSlider
            onComplete={handleCompleteTask}
            isLastTask={isLastTask}
            currentIndex={currentIndex}
          />
        </View>
      </SafeAreaView>

      {/* Confetti */}
      <BurstExplosion visible={showConfetti} />

      {/* Exit Confirmation Modal */}
      {showExitModal && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <LinearGradient
              colors={['rgba(49, 50, 68, 0.95)', 'rgba(30, 30, 46, 0.95)']}
              style={styles.modalGradient}
            >
              <Text style={styles.modalTitle}>¿Salir del Focus Mode?</Text>
              <Text style={styles.modalSubtitle}>
                {subtasks.filter(s => !s.isCompleted).length} subtarea{subtasks.filter(s => !s.isCompleted).length !== 1 ? 's' : ''} pendiente{subtasks.filter(s => !s.isCompleted).length !== 1 ? 's' : ''}
              </Text>

              <View style={styles.modalButtons}>
                <Pressable onPress={handleConfirmExit} style={styles.modalButton}>
                  <LinearGradient
                    colors={PRIMARY_GRADIENT_COLORS}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.modalButtonGradient}
                  >
                    <Text style={styles.modalButtonText}>Guardar y Salir</Text>
                  </LinearGradient>
                </Pressable>

                <Pressable onPress={handleCancelExit} style={styles.modalSecondaryButton}>
                  <Text style={styles.modalSecondaryButtonText}>Seguir Aquí</Text>
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
    position: 'absolute',
    top: 8,
    right: 16,
    padding: 8,
    zIndex: 10,
  },
  taskTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingRight: 40,
  },
  taskEmoji: {
    fontSize: 33,
  },
  taskTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    letterSpacing: -0.3,
  },
  progressBarsContainer: {
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 4,
  },
  progressBar: {
    flex: 1,
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.2)',
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
    textAlign: 'center',
  },

  // Content
  content: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  navButton: {
    padding: 12,
    borderRadius: 50,
    backgroundColor: colors.surface + '80',
  },
  navButtonLeft: {
    marginRight: 8,
  },
  navButtonRight: {
    marginLeft: 8,
  },
  subtaskContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  subtaskContent: {
    alignItems: 'center',
    gap: 20,
  },
  stepIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: colors.primary + '1F',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.primary + '33',
  },
  stepText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.primary,
    letterSpacing: -0.2,
  },
  subtaskTitle: {
    fontSize: 42,
    fontWeight: '800',
    color: colors.textPrimary,
    textAlign: 'center',
    letterSpacing: -1,
    lineHeight: 50,
    paddingHorizontal: 8,
  },
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  timerText: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.textPrimary,
    fontVariant: ['tabular-nums'],
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
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
  },

  // Slider - Frosted glass
  sliderContainer: {
    alignItems: 'center',
  },
  sliderTrack: {
    width: SLIDER_WIDTH,
    height: SLIDER_HEIGHT,
    backgroundColor: colors.surface + 'CC',
    borderRadius: SLIDER_HEIGHT / 2,
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.primary + '26',
  },
  sliderFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: SLIDER_HEIGHT / 2,
  },
  sliderText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.background,
    textAlign: 'center',
    marginLeft: THUMB_SIZE + 16,
    letterSpacing: -0.3,
  },
  sliderThumbWrapper: {
    position: 'absolute',
    left: 4,
  },
  sliderThumbGradient: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_SIZE / 2,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 8,
  },
  sliderThumb: {
    position: 'absolute',
    left: 4,
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_SIZE / 2,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 8,
  },

  // Confetti
  burstContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  burstParticle: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
  },

  // Exit Modal
  modalOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 200,
  },
  modalContainer: {
    width: SCREEN_WIDTH - 48,
    borderRadius: 24,
    overflow: 'hidden',
  },
  modalGradient: {
    padding: 32,
    gap: 20,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
  },
  modalButtons: {
    gap: 12,
    marginTop: 8,
  },
  modalButton: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  modalButtonGradient: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  modalButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.background,
  },
  modalSecondaryButton: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  modalSecondaryButtonText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.6)',
  },
});

export default FocusModeScreen;
