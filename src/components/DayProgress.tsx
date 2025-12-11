import { colors } from '@/constants/theme';
import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
    interpolateColor,
    useAnimatedStyle,
    useSharedValue,
    withSequence,
    withSpring,
    withTiming,
} from 'react-native-reanimated';

interface DayProgressProps {
  completedTasks: number;
  totalTasks: number;
}

export function DayProgress({ completedTasks, totalTasks }: DayProgressProps) {
  const progress = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
  const isComplete = progress === 100;

  // Shared values
  const progressWidth = useSharedValue(0);
  const pulseScale = useSharedValue(1);
  const glowIntensity = useSharedValue(0);

  useEffect(() => {
    // Animar el ancho de la barra
    progressWidth.value = withSpring(progress, {
      damping: 20,
      stiffness: 90,
      mass: 1,
    });

    // Si llega al 100%, hacer pulso y glow
    if (isComplete) {
      pulseScale.value = withSequence(
        withSpring(1.05, { damping: 10, stiffness: 200 }),
        withSpring(1, { damping: 15, stiffness: 150 })
      );
      glowIntensity.value = withTiming(1, { duration: 400 });
    } else {
      glowIntensity.value = withTiming(0, { duration: 200 });
    }
  }, [progress, isComplete]);

  // Estilo animado de la barra de progreso
  const animatedBarStyle = useAnimatedStyle(() => {
    const backgroundColor = interpolateColor(
      glowIntensity.value,
      [0, 1],
      [colors.primary, colors.warning] // Cian -> Dorado brillante
    );

    return {
      width: `${progressWidth.value}%`,
      backgroundColor,
      transform: [{ scaleY: pulseScale.value }],
      shadowColor: backgroundColor,
      shadowOpacity: glowIntensity.value * 0.8,
      shadowRadius: glowIntensity.value * 12,
      elevation: glowIntensity.value * 10,
    };
  });

  return (
    <View style={styles.container}>
      <View style={styles.track}>
        <Animated.View style={[styles.bar, animatedBarStyle]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  track: {
    height: 6,
    backgroundColor: colors.surface,
    borderRadius: 999,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  bar: {
    height: '100%',
    borderRadius: 999,
    shadowOffset: { width: 0, height: 0 },
  },
});
