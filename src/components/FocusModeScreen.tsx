import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Pressable,
} from 'react-native';
import { GestureDetector, Gesture, GestureHandlerRootView } from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withSequence,
  withRepeat,
  withDelay,
  runOnJS,
  interpolate,
  interpolateColor,
  Easing,
  FadeInDown,
  FadeOutUp,
  FadeIn,
  SlideInRight,
  SlideOutLeft,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { 
  ChevronLeft, 
  ChevronRight, 
  X, 
  Clock,
  Sparkles,
  Trophy,
} from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Types
export type FocusSubtask = {
  id: string;
  title: string;
  duration: number;
  isCompleted: boolean;
};

interface FocusModeScreenProps {
  taskTitle: string;
  taskEmoji: string;
  subtasks: FocusSubtask[];
  onComplete: () => void;
  onClose: () => void;
}

// Slider constants
const SLIDER_WIDTH = SCREEN_WIDTH - 48;
const SLIDER_HEIGHT = 64;
const THUMB_SIZE = 56;
const SLIDE_THRESHOLD = SLIDER_WIDTH - THUMB_SIZE - 8;

// Confetti Particle Component
const ConfettiParticle = ({ 
  delay, 
  startX, 
  color 
}: { 
  delay: number; 
  startX: number; 
  color: string;
}) => {
  const translateY = useSharedValue(0);
  const translateX = useSharedValue(startX);
  const rotate = useSharedValue(0);
  const opacity = useSharedValue(1);
  const scale = useSharedValue(0);

  useEffect(() => {
    const randomX = (Math.random() - 0.5) * 200;
    const randomRotation = Math.random() * 720 - 360;
    
    scale.value = withDelay(delay, withSpring(1, { damping: 8 }));
    translateY.value = withDelay(
      delay,
      withTiming(SCREEN_HEIGHT * 0.7, { 
        duration: 2000,
        easing: Easing.out(Easing.quad),
      })
    );
    translateX.value = withDelay(
      delay,
      withTiming(startX + randomX, { 
        duration: 2000,
        easing: Easing.out(Easing.quad),
      })
    );
    rotate.value = withDelay(
      delay,
      withTiming(randomRotation, { duration: 2000 })
    );
    opacity.value = withDelay(
      delay + 1500,
      withTiming(0, { duration: 500 })
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { rotate: `${rotate.value}deg` },
      { scale: scale.value },
    ],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        styles.confettiParticle,
        { backgroundColor: color },
        animatedStyle,
      ]}
    />
  );
};

// Confetti Explosion Component
const ConfettiExplosion = ({ visible }: { visible: boolean }) => {
  if (!visible) return null;

  const colors = ['#7c3aed', '#a855f7', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#ef4444'];
  const particles = Array.from({ length: 50 }, (_, i) => ({
    id: i,
    delay: Math.random() * 300,
    startX: SCREEN_WIDTH / 2 + (Math.random() - 0.5) * 100,
    color: colors[Math.floor(Math.random() * colors.length)],
  }));

  return (
    <View style={styles.confettiContainer} pointerEvents="none">
      {particles.map((particle) => (
        <ConfettiParticle
          key={particle.id}
          delay={particle.delay}
          startX={particle.startX}
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
}: { 
  onComplete: () => void;
  isLastTask: boolean;
}) => {
  const translateX = useSharedValue(0);
  const isCompleted = useSharedValue(false);
  const textOpacity = useSharedValue(1);
  const thumbScale = useSharedValue(1);
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

  const panGesture = Gesture.Pan()
    .onStart(() => {
      thumbScale.value = withSpring(1.1);
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
      thumbScale.value = withSpring(1);
      
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
      { scale: thumbScale.value },
    ],
  }));

  const textStyle = useAnimatedStyle(() => ({
    opacity: textOpacity.value,
  }));

  const backgroundStyle = useAnimatedStyle(() => ({
    width: interpolate(
      backgroundProgress.value,
      [0, 1],
      [THUMB_SIZE + 8, SLIDER_WIDTH]
    ),
  }));

  const thumbColorStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      backgroundProgress.value,
      [0, 1],
      ['#7c3aed', '#10b981']
    ),
  }));

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
          <Animated.View style={[styles.sliderThumb, thumbStyle, thumbColorStyle]}>
            <ChevronRight size={28} color="#ffffff" strokeWidth={3} />
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
      entering={FadeIn.delay(index * 50)}
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
    if (isTimerRunning) {
      interval = setInterval(() => {
        setElapsedTime((prev) => prev + 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isTimerRunning]);

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
    
    // Mark current task as completed
    setSubtasks((prev) =>
      prev.map((task, idx) =>
        idx === currentIndex ? { ...task, isCompleted: true } : task
      )
    );

    // Wait for celebration, then move to next or finish
    setTimeout(() => {
      setShowConfetti(false);
      
      if (isLastTask) {
        // All done!
        setTimeout(() => {
          onComplete();
        }, 500);
      } else {
        // Next task
        setCurrentIndex((prev) => prev + 1);
        setElapsedTime(0);
      }
    }, 1500);
  }, [currentIndex, isLastTask, onComplete]);

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
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onClose();
  }, [onClose]);

  return (
    <GestureHandlerRootView style={styles.container}>
      {/* Animated Background Gradient */}
      <LinearGradient
        colors={['#0f0a1a', '#1a0f2e', '#0f172a', '#0a0f1a']}
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
      <Animated.View 
        entering={FadeIn.duration(1000)}
        style={styles.ambientGlow}
      >
        <LinearGradient
          colors={['transparent', 'rgba(124, 58, 237, 0.15)', 'transparent']}
          style={StyleSheet.absoluteFill}
          start={{ x: 0.5, y: 0.3 }}
          end={{ x: 0.5, y: 0.7 }}
        />
      </Animated.View>

      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          {/* Close Button */}
          <Pressable onPress={handleClose} style={styles.closeButton}>
            <X size={24} color="rgba(255,255,255,0.6)" />
          </Pressable>

          {/* Task Title */}
          <Animated.View 
            entering={FadeInDown.duration(500)}
            style={styles.taskTitleContainer}
          >
            <Text style={styles.taskEmoji}>{taskEmoji}</Text>
            <Text style={styles.taskTitle} numberOfLines={1}>
              {taskTitle}
            </Text>
          </Animated.View>

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
              size={32} 
              color={currentIndex === 0 ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.4)'} 
            />
          </Pressable>

          {/* Current Subtask */}
          <View style={styles.subtaskContainer}>
            {currentSubtask && (
              <Animated.View
                key={currentSubtask.id}
                entering={FadeInDown.springify().damping(15)}
                exiting={FadeOutUp.duration(300)}
                style={styles.subtaskContent}
              >
                {/* Step indicator */}
                <Animated.View 
                  entering={FadeIn.delay(200)}
                  style={styles.stepIndicator}
                >
                  <Sparkles size={16} color="#7c3aed" />
                  <Text style={styles.stepText}>
                    Paso {currentIndex + 1} de {subtasks.length}
                  </Text>
                </Animated.View>

                {/* Subtask Title */}
                <Animated.Text
                  entering={FadeInDown.delay(100).springify()}
                  style={styles.subtaskTitle}
                >
                  {currentSubtask.title}
                </Animated.Text>

                {/* Timer / Duration */}
                <Animated.View 
                  entering={FadeIn.delay(300)}
                  style={styles.timerContainer}
                >
                  <Clock size={18} color="rgba(255,255,255,0.5)" />
                  <Text style={styles.timerText}>
                    {formatTime(elapsedTime)}
                  </Text>
                  <Text style={styles.estimatedTime}>
                    / {currentSubtask.duration} min estimado
                  </Text>
                </Animated.View>
              </Animated.View>
            )}
          </View>

          {/* Navigation - Next */}
          <Pressable
            onPress={goToNext}
            style={[styles.navButton, styles.navButtonRight]}
            disabled={currentIndex === subtasks.length - 1}
          >
            <ChevronRight 
              size={32} 
              color={currentIndex === subtasks.length - 1 ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.4)'} 
            />
          </Pressable>
        </View>

        {/* Footer - Swipe Slider */}
        <View style={styles.footer}>
          {/* Tip */}
          <Animated.Text 
            entering={FadeIn.delay(500)}
            style={styles.tipText}
          >
            💡 Enfócate solo en este paso
          </Animated.Text>

          <SwipeToCompleteSlider 
            onComplete={handleCompleteTask}
            isLastTask={isLastTask}
          />
        </View>
      </SafeAreaView>

      {/* Confetti */}
      <ConfettiExplosion visible={showConfetti} />

      {/* Success Overlay (when completing last task) */}
      {showConfetti && isLastTask && (
        <Animated.View 
          entering={FadeIn.duration(500)}
          style={styles.successOverlay}
        >
          <Trophy size={64} color="#f59e0b" />
          <Text style={styles.successText}>¡Tarea Completada!</Text>
        </Animated.View>
      )}
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0a1a',
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
    fontSize: 20,
  },
  taskTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.7)',
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
    backgroundColor: '#10b981',
  },
  progressBarActive: {
    backgroundColor: '#7c3aed',
    height: 4,
  },
  progressText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.4)',
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
    backgroundColor: 'rgba(255,255,255,0.05)',
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
    backgroundColor: 'rgba(124, 58, 237, 0.15)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(124, 58, 237, 0.3)',
  },
  stepText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#a78bfa',
    letterSpacing: -0.2,
  },
  subtaskTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: '#ffffff',
    textAlign: 'center',
    letterSpacing: -1,
    lineHeight: 40,
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
    color: 'rgba(255,255,255,0.8)',
    fontVariant: ['tabular-nums'],
  },
  estimatedTime: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.4)',
  },

  // Footer
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 20,
    gap: 16,
  },
  tipText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
  },

  // Slider
  sliderContainer: {
    alignItems: 'center',
  },
  sliderTrack: {
    width: SLIDER_WIDTH,
    height: SLIDER_HEIGHT,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: SLIDER_HEIGHT / 2,
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  sliderFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: 'rgba(124, 58, 237, 0.3)',
    borderRadius: SLIDER_HEIGHT / 2,
  },
  sliderText: {
    fontSize: 15,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
    marginLeft: THUMB_SIZE + 16,
    letterSpacing: -0.3,
  },
  sliderThumb: {
    position: 'absolute',
    left: 4,
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_SIZE / 2,
    backgroundColor: '#7c3aed',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#7c3aed',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },

  // Confetti
  confettiContainer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 100,
  },
  confettiParticle: {
    position: 'absolute',
    top: SCREEN_HEIGHT * 0.3,
    width: 10,
    height: 10,
    borderRadius: 2,
  },

  // Success Overlay
  successOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    zIndex: 99,
  },
  successText: {
    fontSize: 28,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: -0.5,
  },
});

export default FocusModeScreen;
