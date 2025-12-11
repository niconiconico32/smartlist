import { colors } from '@/constants/theme';
import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withTiming,
} from 'react-native-reanimated';

interface ProgressBarProps {
  totalSteps: number;
  currentStep: number;
}

export function ProgressBar({ totalSteps, currentStep }: ProgressBarProps) {
  return (
    <View style={styles.container}>
      {Array.from({ length: totalSteps }).map((_, index) => (
        <ProgressSegment
          key={index}
          isActive={index < currentStep}
          delay={index * 50}
        />
      ))}
    </View>
  );
}

function ProgressSegment({ isActive, delay }: { isActive: boolean; delay: number }) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withTiming(isActive ? 1 : 0, {
      duration: 400,
      // @ts-ignore
      delay,
    });
  }, [isActive]);

  const animatedStyle = useAnimatedStyle(() => ({
    backgroundColor: progress.value > 0 ? colors.success : colors.border,
    opacity: 0.3 + progress.value * 0.7,
    shadowOpacity: progress.value * 0.8,
  }));

  return (
    <Animated.View
      style={[
        styles.segment,
        animatedStyle,
        isActive && {
          shadowColor: colors.success,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: 0 },
          elevation: 6,
        },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  segment: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
  },
});
