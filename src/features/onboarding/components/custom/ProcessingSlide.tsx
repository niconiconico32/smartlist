import { colors } from '@/constants/theme';
import * as Haptics from 'expo-haptics';
import React, { useEffect, useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';
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

import type { OnboardingAnswers } from '../../types';

// ============================================
// PROCESSING SLIDE
// ============================================
interface Props {
  answers: OnboardingAnswers;
  onNext: () => void;
}

const STEPS = [
  'Calculando perfil cognitivo...',
  'Diseñando ruta de dopamina...',
  'Ajustando recordatorios inteligentes...',
];

const ProcessingSlide: React.FC<Props> = ({ answers, onNext }) => {
  const [currentStep, setCurrentStep] = useState(-1);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const mascotY = useSharedValue(0);

  // Progress bar widths for each step
  const bar0 = useSharedValue(0);
  const bar1 = useSharedValue(0);
  const bar2 = useSharedValue(0);
  const bars = [bar0, bar1, bar2];

  // Mascot float animation
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
      bars[idx].value = withTiming(1, { duration: 900, easing: Easing.out(Easing.cubic) });
      setTimeout(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setCompletedSteps((prev) => [...prev, idx]);
        setTimeout(() => runStep(idx + 1), 350);
      }, 950);
    };
    const timeout = setTimeout(() => runStep(0), 700);
    return () => clearTimeout(timeout);
  }, []);

  const mascotStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: mascotY.value }],
  }));

  const userName = answers.userName || 'amigo/a';

  return (
    <View style={s.container}>
      <Animated.View style={[s.mascotContainer, mascotStyle]}>
        <Image
          source={require('@/assets/images/brainycomputing.png')}
          style={s.mascot}
          resizeMode="contain"
        />
      </Animated.View>

      <Animated.Text entering={FadeInDown.delay(200).duration(400)} style={s.title}>
        Analizando tus respuestas...
      </Animated.Text>
      <Animated.Text entering={FadeInDown.delay(350).duration(400)} style={s.subtitle}>
        Preparando todo para ti, {userName}
      </Animated.Text>

      <View style={s.stepsContainer}>
        {STEPS.map((step, idx) => {
          const isCompleted = completedSteps.includes(idx);
          const isCurrent = currentStep === idx && !isCompleted;
          const isVisible = idx <= currentStep;

          return (
            <Animated.View
              key={idx}
              entering={FadeInDown.delay(500 + idx * 100).duration(300)}
              style={[s.stepRow, { opacity: isVisible ? 1 : 0.3 }]}
            >
              <View style={s.stepHeader}>
                {isCompleted ? (
                  <View style={s.checkCircle}>
                    <Text style={s.checkMark}>✓</Text>
                  </View>
                ) : (
                  <View
                    style={[
                      s.emptyCircle,
                      isCurrent && { borderColor: colors.primary },
                    ]}
                  />
                )}
                <Text
                  style={[
                    s.stepText,
                    isCurrent && { fontWeight: '600' },
                    isCompleted && { color: colors.primary },
                  ]}
                >
                  {step}
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
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  mascotContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  mascot: {
    width: 120,
    height: 120,
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 40,
  },
  stepsContainer: {
    width: '85%',
    gap: 20,
  },
  stepRow: {},
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 10,
  },
  checkCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkMark: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.background,
  },
  emptyCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: `${colors.textPrimary}33`,
  },
  stepText: {
    fontSize: 14,
    fontWeight: '400',
    color: colors.textPrimary,
  },
  barTrack: {
    height: 4,
    borderRadius: 2,
    backgroundColor: `${colors.textPrimary}15`,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 2,
    backgroundColor: colors.primary,
  },
});
