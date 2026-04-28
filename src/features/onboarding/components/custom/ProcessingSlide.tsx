import { slideStyles } from '../../styles/shared';
import { colors } from '@/constants/theme';
import * as Haptics from 'expo-haptics';
import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Image } from 'react-native';
import { AppText as Text } from '@/src/components/AppText';
import Animated, {
  Easing,
  FadeInDown,
  SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming
} from 'react-native-reanimated';
import { Check } from 'lucide-react-native';

import type { OnboardingAnswers } from '../../types';

// ============================================
// PROCESSING SLIDE
// ============================================
interface Props {
  answers: OnboardingAnswers;
  onNext: () => void;
}

const STEPS = [
  'calculando tu perfil cognitivo',
  'diseñando tu ruta de dopamina',
  'ajustando recordatorios',
];

const ProcessingSlide: React.FC<Props> = ({ answers, onNext }) => {
  const [currentStep, setCurrentStep] = useState(-1);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);

  // Progress bar widths for each step
  const bar0 = useSharedValue(0);
  const bar1 = useSharedValue(0);
  const bar2 = useSharedValue(0);
  const bars = [bar0, bar1, bar2];

  // Mascot float animation
  const mascotY = useSharedValue(0);

  useEffect(() => {
    mascotY.value = withRepeat(
      withSequence(
        withTiming(-8, { duration: 1400, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 1400, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      true,
    );
  }, []);

  // Sequentially run each step
  useEffect(() => {
    const runStep = (idx: number) => {
      if (idx >= STEPS.length) {
        setTimeout(onNext, 600);
        return;
      }
      setCurrentStep(idx);
      // Increased duration significantly for a more flashy/realistic processing feel
      bars[idx].value = withTiming(1, { duration: 2500, easing: Easing.out(Easing.cubic) });
      
      setTimeout(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        setCompletedSteps((prev) => [...prev, idx]);
        setTimeout(() => runStep(idx + 1), 500);
      }, 2600);
    };
    const timeout = setTimeout(() => runStep(0), 1000);
    return () => clearTimeout(timeout);
  }, []);

  const mascotStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: mascotY.value }],
  }));

  return (
    <View style={s.container}>
      <View style={s.headerContainer}>
        <Animated.View style={[s.mascotContainer, mascotStyle]}>
          <Image
            source={require('@/assets/images/brainycomputing.png')}
            style={s.mascot}
            resizeMode="contain"
          />
        </Animated.View>

        <Animated.Text entering={FadeInDown.delay(100).duration(500)} style={[slideStyles.slideSubtitle, { color: colors.surface }]}>
          analizando respuestas...
        </Animated.Text>
        
        <Animated.Text entering={FadeInDown.delay(200).duration(500)} style={slideStyles.slideTitle}>
          preparando tu sistema
        </Animated.Text>
      </View>

      <View style={s.stepsContainer}>
        {STEPS.map((step, idx) => {
          const isCompleted = completedSteps.includes(idx);
          const isCurrent = currentStep === idx && !isCompleted;
          const isVisible = idx <= currentStep;

          return (
            <Animated.View
              key={idx}
              entering={FadeInDown.delay(300 + idx * 100).duration(300)}
              style={[s.stepRow, { opacity: isVisible ? 1 : 0.3 }]}
            >
              <View style={s.stepHeader}>
                {isCompleted ? (
                  <View style={[s.circle, s.circleCompleted]}>
                    <Check size={14} color={colors.background} strokeWidth={3} />
                  </View>
                ) : isCurrent ? (
                  <PulseCircle />
                ) : (
                  <View style={[s.circle, s.circleEmpty]} />
                )}
                <Text
                  style={[
                    s.stepText,
                    isCurrent && { fontWeight: '700', color: colors.textPrimary },
                    isCompleted && { color: colors.textSecondary },
                  ]}
                >
                  {step}
                  {isCurrent && <AnimatedDots />}
                </Text>
              </View>
              <View style={s.barTrack}>
                <StepBar sharedValue={bars[idx]} />
              </View>
            </Animated.View>
          );
        })}
      </View>
    </View>
  );
};

// Animated pulsing dot
function PulseCircle() {
  const anim = useSharedValue(0);

  useEffect(() => {
    anim.value = withRepeat(
      withTiming(1, { duration: 1200, easing: Easing.out(Easing.quad) }),
      -1,
      false
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + anim.value * 2 }],
    opacity: 1 - anim.value,
  }));

  return (
    <View style={s.pulseContainer}>
      <Animated.View style={[s.pulseGlow, animatedStyle]} />
      <View style={s.pulseCore} />
    </View>
  );
}

// Animated trailing dots
function AnimatedDots() {
  const [dots, setDots] = useState('');
  useEffect(() => {
    const interval = setInterval(() => {
      setDots(prev => prev.length >= 3 ? '' : prev + '.');
    }, 400);
    return () => clearInterval(interval);
  }, []);
  return <Text>{dots}</Text>;
}

// Animated bar sub-component
function StepBar({ sharedValue }: { sharedValue: SharedValue<number> }) {
  const style = useAnimatedStyle(() => ({
    width: `${sharedValue.value * 100}%`,
  }));
  return <Animated.View style={[s.barFill, style]} />;
}

export default ProcessingSlide;

// ============================================
// STYLES
// ============================================
const s = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
    justifyContent: 'center',
  },
  headerContainer: {
    marginBottom: 40,
  },
  mascotContainer: {
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  mascot: {
    width: 100,
    height: 100,
  },
  stepsContainer: {
    width: '100%',
    gap: 32,
  },
  stepRow: {},
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 16,
  },
  circle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleCompleted: {
    backgroundColor: colors.surface,
  },
  circleEmpty: {
    borderWidth: 2,
    borderColor: `${colors.textPrimary}20`,
  },
  pulseContainer: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulseGlow: {
    position: 'absolute',
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: colors.surface,
  },
  pulseCore: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.surface,
  },
  stepText: {
    fontSize: 18,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  barTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: `${colors.textPrimary}10`,
    overflow: 'hidden',
    marginLeft: 40,
  },
  barFill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: colors.surface,
  },
});
