import { colors } from '@/constants/theme';
import { useSensory } from '@/src/hooks/useSensory';
import React, { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withSequence,
    withTiming,
} from 'react-native-reanimated';

interface FocusCardProps {
  taskTitle: string;
  onComplete: () => void;
  elapsedSeconds: number;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function FocusCard({ taskTitle, onComplete, elapsedSeconds }: FocusCardProps) {
  const { successFeedback } = useSensory();
  const breatheOpacity = useSharedValue(1);
  const breatheScale = useSharedValue(1);

  // Animación de "respiración" infinita
  useEffect(() => {
    breatheOpacity.value = withRepeat(
      withSequence(
        withTiming(0.4, { duration: 2000 }),
        withTiming(1, { duration: 2000 })
      ),
      -1,
      true
    );

    breatheScale.value = withRepeat(
      withSequence(
        withTiming(1.02, { duration: 2000 }),
        withTiming(1, { duration: 2000 })
      ),
      -1,
      true
    );
  }, []);

  const animatedBorderStyle = useAnimatedStyle(() => ({
    borderColor: colors.primary,
    shadowColor: colors.primary,
    shadowOpacity: breatheOpacity.value * 0.8,
    shadowRadius: breatheOpacity.value * 20,
    transform: [{ scale: breatheScale.value }],
  }));

  const handleComplete = () => {
    successFeedback();
    onComplete();
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <View style={styles.container}>
      {/* Timer */}
      <View style={styles.timerContainer}>
        <Text style={styles.timerLabel}>TIEMPO EN TAREA</Text>
        <Text style={styles.timerText}>{formatTime(elapsedSeconds)}</Text>
      </View>

      {/* Card Principal */}
      <AnimatedPressable
        style={[styles.card, animatedBorderStyle]}
        onPress={handleComplete}
      >
        <Text style={styles.emoji}>🎯</Text>
        <Text style={styles.taskTitle}>{taskTitle}</Text>
      </AnimatedPressable>

      {/* Instrucción */}
      <View style={styles.hintContainer}>
        <Text style={styles.hintText}>Toca para completar</Text>
        <View style={styles.hintDot} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  timerContainer: {
    marginBottom: 40,
    alignItems: 'center',
  },
  timerLabel: {
    fontSize: 12,
    color: colors.textTertiary,
    letterSpacing: 2,
    fontWeight: '600',
    marginBottom: 8,
  },
  timerText: {
    fontSize: 56,
    fontWeight: '700',
    color: colors.primary,
    fontVariant: ['tabular-nums'],
  card: {
    width: '100%',
    minHeight: 300,
    backgroundColor: colors.surface,
    borderRadius: 24,
    borderWidth: 4,
    borderColor: colors.primary,
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 0 },
    elevation: 15,
    position: 'relative',
  },
  emoji: {
    fontSize: 48,
    position: 'absolute',
    top: 24,
    right: 24,
  },
  taskTitle: {
    fontSize: 52,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
    lineHeight: 64,
  },lineHeight: 56,
  },
  hintContainer: {
    marginTop: 40,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  hintText: {
    fontSize: 16,
    color: colors.textTertiary,
    fontWeight: '500',
  },
  hintDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
});
