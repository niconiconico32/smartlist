import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  X
} from 'lucide-react-native';
import React, { useCallback, useEffect, useState } from 'react';
import {
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
import { SuccessScreen } from './SuccessScreen';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

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
  onClose: () => void;
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

  const handleComplete = useCallback(() => {
    onComplete();
  }, [onComplete]);

  // Reset slider when task changes
  useEffect(() => {
    translateX.value = 0;
    isCompleted.value = false;
    textOpacity.value = 1;
    backgroundProgress.value = 0;
  }, [currentIndex]);

  const panGesture = Gesture.Pan()
    .onStart(() => {
      runOnJS(triggerHapticLight)();
    })
    .onUpdate((event) => {
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
    });

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
              colors={['#CBA6F7', '#FAB387']} // Lavender Haze to Peach Fuzz
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.sliderThumbGradient}
            >
              <ChevronRight size={22} color="#ffffff" strokeWidth={3} />
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
  index,
}: { 
  isActive: boolean;
  isCompleted: boolean;
  index: number;
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
  const [subtasks, setSubtasks] = useState(initialSubtasks);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(true);
  const [isClosing, setIsClosing] = useState(false);
  const [showSuccessScreen, setShowSuccessScreen] = useState(false);
  const [totalElapsedTime, setTotalElapsedTime] = useState(0);
  const [showExitModal, setShowExitModal] = useState(false);

  // Load saved progress on mount
  useEffect(() => {
    const loadProgress = async () => {
      try {
        const saved = await AsyncStorage.getItem(`focus_progress_${activityId}`);
        if (saved) {
          const progress = JSON.parse(saved);
          setSubtasks(progress.subtasks);
          setCurrentIndex(progress.currentIndex);
          setTotalElapsedTime(progress.totalElapsedTime);
          setElapsedTime(progress.elapsedTime);
        }
      } catch (error) {
        console.error('Error loading progress:', error);
      }
    };
    loadProgress();
  }, [activityId]);

  // Save progress whenever state changes
  useEffect(() => {
    const saveProgress = async () => {
      try {
        const progress = {
          subtasks,
          currentIndex,
          totalElapsedTime,
          elapsedTime,
        };
        await AsyncStorage.setItem(`focus_progress_${activityId}`, JSON.stringify(progress));
      } catch (error) {
        console.error('Error saving progress:', error);
      }
    };
    saveProgress();
  }, [subtasks, currentIndex, totalElapsedTime, elapsedTime, activityId]);

  // Background gradient animation
  const gradientPosition = useSharedValue(0);

  useEffect(() => {
    gradientPosition.value = withRepeat(
      withTiming(1, { duration: 10000, easing: Easing.linear }),
      -1,
      true
    );
  }, []);

  // Timer
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | undefined;
    if (isTimerRunning && !isClosing) {
      interval = setInterval(() => {
        setElapsedTime((prev) => prev + 1);
        setTotalElapsedTime((prev) => prev + 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isTimerRunning, isClosing]);

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

    // Wait for celebration, then move to next or finish
    const timeout1 = setTimeout(() => {
      if (!isClosing) {
        setShowConfetti(false);
        
        if (isLastTask) {
          // Show success screen after celebration
          const timeout2 = setTimeout(() => {
            if (!isClosing) {
              setShowSuccessScreen(true);
            }
          }, 500);
          return () => clearTimeout(timeout2);
        } else {
          // Next task
          setCurrentIndex((prev) => prev + 1);
          setElapsedTime(0);
          setIsTimerRunning(true);
        }
      }
    }, 2800);
    
    return () => clearTimeout(timeout1);
  }, [currentIndex, isLastTask, onComplete, isClosing]);

  const goToPrevious = useCallback(() => {
    if (currentIndex > 0) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setCurrentIndex((prev) => prev - 1);
      setElapsedTime(0);
    }
  }, [currentIndex]);

  const goToNext = useCallback(() => {
    if (currentIndex < subtasks.length - 1) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setCurrentIndex((prev) => prev + 1);
      setElapsedTime(0);
    }
  }, [currentIndex, subtasks.length]);

  const handleClose = useCallback(() => {
    setShowExitModal(true);
  }, []);

  const handleConfirmExit = useCallback(async () => {
    setIsClosing(true);
    setIsTimerRunning(false);
    
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    } catch (error) {}
    
    // Save progress before closing
    try {
      const progress = {
        subtasks,
        currentIndex,
        totalElapsedTime,
        elapsedTime,
      };
      await AsyncStorage.setItem(`focus_progress_${activityId}`, JSON.stringify(progress));
    } catch (error) {
      console.error('Error saving progress:', error);
    }
    
    setTimeout(() => {
      onClose();
    }, 50);
  }, [subtasks, currentIndex, totalElapsedTime, elapsedTime, activityId, onClose]);

  const handleCancelExit = useCallback(() => {
    setShowExitModal(false);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    } catch (error) {}
  }, []);

  const handleSuccessComplete = useCallback(async () => {
    // Clear saved progress when completing successfully
    try {
      await AsyncStorage.removeItem(`focus_progress_${activityId}`);
    } catch (error) {
      console.error('Error clearing progress:', error);
    }
    onComplete();
  }, [activityId, onComplete]);

  // Show success screen if all tasks completed
  if (showSuccessScreen) {
    return (
      <SuccessScreen
        taskTitle={taskTitle}
        timeSpent={totalElapsedTime}
        streakCount={subtasks.length}
        onGoHome={handleSuccessComplete}
      />
    );
  }

  return (
    <GestureHandlerRootView style={styles.container}>
      {/* Animated Background Gradient - Velvet Dark */}
      <LinearGradient
        colors={['#1E1E2E', '#252536', '#1E1E2E', '#1a1a28']}
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

      {/* Ambient glow behind current task - Lavender Haze */}
      <View style={styles.ambientGlow}>
        <LinearGradient
          colors={['transparent', 'rgba(203, 166, 247, 0.12)', 'transparent']}
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
            <X size={24} color="rgba(166, 173, 200, 0.6)" />
          </Pressable>

          {/* Task Title */}
          <View style={styles.taskTitleContainer}>
            <Text style={styles.taskTitle} numberOfLines={1}>
              {taskTitle}
            </Text>
          </View>

          {/* Progress Bars (Stories style) */}
          <View style={styles.progressBarsContainer}>
            {subtasks.map((subtask, index) => (
              <ProgressBar
                key={subtask.id}
                index={index}
                isActive={index === currentIndex}
                isCompleted={subtask.isCompleted}
              />
            ))}
          </View>

          {/* Progress Text */}
          <Text style={styles.progressText}>
            {completedCount + (currentIndex < subtasks.length ? 0 : 0)} / {subtasks.length} completados
          </Text>
        </View>

        {/* Main Content */}
        <View style={styles.content}>
          {/* Navigation - Previous */}
          <Pressable
            onPress={goToPrevious}
            style={[styles.navButton, styles.navButtonLeft]}
            disabled={currentIndex === 0}
          >
            <ChevronLeft 
              size={24} 
              color={currentIndex === 0 ? 'rgba(108, 112, 134, 0.3)' : 'rgba(166, 173, 200, 0.5)'} 
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
                  <Clock size={18} color="rgba(166, 173, 200, 0.5)" />
                  <Text style={styles.timerText}>
                    {formatTime(elapsedTime)}
                  </Text>
                  <Text style={styles.estimatedTime}>
                    / {currentSubtask.duration} min estimado
                  </Text>
                </View>

                {/* Subtask Title */}
                <Text style={styles.subtaskTitle}>
                  {currentSubtask.title}
                </Text>
              </View>
            )}
          </View>

          {/* Navigation - Next */}
          <Pressable
            onPress={goToNext}
            style={[styles.navButton, styles.navButtonRight]}
            disabled={currentIndex === subtasks.length - 1}
          >
            <ChevronRight 
              size={14} 
              color={currentIndex === subtasks.length - 1 ? 'rgba(108, 112, 134, 0.3)' : 'rgba(166, 173, 200, 0.5)'} 
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
                    colors={['#CBA6F7', '#B491E0']}
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
    backgroundColor: '#1E1E2E', // Deep Dream
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
    color: 'rgba(205, 214, 244, 0.7)', // Cloud White
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
    backgroundColor: '#A6E3A1', // Matcha Latte
  },
  progressBarActive: {
    backgroundColor: '#CBA6F7', // Lavender Haze
    height: 4,
  },
  progressText: {
    fontSize: 12,
    color: 'rgba(166, 173, 200, 0.7)', // Mist Grey
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
    backgroundColor: 'rgba(49, 50, 68, 0.5)', // Soft Layer glass
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
    backgroundColor: 'rgba(203, 166, 247, 0.12)', // Lavender glass
    borderRadius: 24, // More squishy
    borderWidth: 1,
    borderColor: 'rgba(203, 166, 247, 0.2)',
  },
  stepText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#CBA6F7', // Lavender Haze
    letterSpacing: -0.2,
  },
  subtaskTitle: {
    fontSize: 42,
    fontWeight: '800',
    color: '#CDD6F4', // Cloud White
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
    color: 'rgba(205, 214, 244, 0.85)', // Cloud White
    fontVariant: ['tabular-nums'],
  },
  estimatedTime: {
    fontSize: 14,
    color: 'rgba(166, 173, 200, 0.6)', // Mist Grey
  },

  // Footer
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 20,
    gap: 16,
  },
  tipText: {
    fontSize: 13,
    color: 'rgba(166, 173, 200, 0.6)', // Mist Grey
    textAlign: 'center',
  },

  // Slider - Frosted glass
  sliderContainer: {
    alignItems: 'center',
  },
  sliderTrack: {
    width: SLIDER_WIDTH,
    height: SLIDER_HEIGHT,
    backgroundColor: 'rgba(49, 50, 68, 0.8)', // Soft Layer glass
    borderRadius: SLIDER_HEIGHT / 2,
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(203, 166, 247, 0.15)', // Lavender glass border
  },
  sliderFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: 'rgba(203, 166, 247, 0.25)', // Lavender glass fill
    borderRadius: SLIDER_HEIGHT / 2,
  },
  sliderText: {
    fontSize: 15,
    fontWeight: '600',
    color: 'rgba(205, 214, 244, 0.6)', // Cloud White muted
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
    shadowColor: '#CBA6F7',
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
    backgroundColor: '#CBA6F7', // Lavender Haze
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#CBA6F7',
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
    color: '#FFFFFF',
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
