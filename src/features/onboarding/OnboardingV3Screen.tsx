import {
    PRIMARY_GRADIENT_COLORS,
    primaryButtonGradient,
    primaryButtonStyles,
    primaryButtonText,
} from '@/constants/buttons';
import { colors } from '@/constants/theme';
import { useOnboardingStore } from '@/src/store/onboardingStore';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
    FadeInDown,
    useAnimatedStyle,
    useSharedValue,
    withSpring,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import SlideRenderer from './components/SlideRenderer';
import { SLIDES_V3, TOTAL_SLIDES_V3 } from './slides-v3';
import { INITIAL_ANSWERS, OnboardingAnswers } from './types';

// ============================================
// ONBOARDING V3 SCREEN (Orchestrator)
// ============================================
export default function OnboardingV3Screen() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [answers, setAnswers] = useState<OnboardingAnswers>(INITIAL_ANSWERS);
  const buttonScale = useSharedValue(1);

  const config = SLIDES_V3[currentSlide];

  // ── Navigation ──
  const goToNextSlide = useCallback(() => {
    if (currentSlide < TOTAL_SLIDES_V3 - 1) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setCurrentSlide((s) => s + 1);
    }
  }, [currentSlide]);

  const goToPrevSlide = useCallback(() => {
    if (currentSlide > 0) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setCurrentSlide((s) => s - 1);
    }
  }, [currentSlide]);

  const finishOnboarding = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    // Persist answers to the onboarding store
    const store = useOnboardingStore.getState();
    store.setName(answers.userName);
    store.setSymptoms(answers.adhdSymptoms);
    store.setGoal(answers.goals.join(', '));
    store.completeOnboarding();
    router.replace('/(tabs)');
  }, [answers]);

  // ── Answer handler ──
  const handleAnswer = useCallback(
    <K extends keyof OnboardingAnswers>(key: K, value: OnboardingAnswers[K]) => {
      setAnswers((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  // ── Button animation ──
  const buttonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }],
  }));

  const handleButtonPressIn = () => {
    buttonScale.value = withSpring(0.96, { damping: 10, stiffness: 300 });
  };

  const handleButtonPressOut = () => {
    buttonScale.value = withSpring(1, { damping: 10, stiffness: 300 });
  };

  // ── Can continue? ──
  const canContinue = config.canContinue ? config.canContinue(answers) : true;

  // Slides that should hide the back button (auto-advancing slides like processing)
  const hideBackOnSlides = ['welcome', 'processing'];
  const showBack = currentSlide > 0 && !hideBackOnSlides.includes(config.type);

  return (
    <SafeAreaView style={s.container}>
      {/* Dev close button */}
      {__DEV__ && (
        <Pressable onPress={() => router.replace('/(tabs)')} style={s.devCloseButton}>
          <Text style={s.devCloseButtonText}>×</Text>
        </Pressable>
      )}

      {/* Header: back + progress bar */}
      {showBack && (
        <View style={s.headerContainer}>
          <View style={s.backButtonArea}>
            <Animated.View entering={FadeInDown.duration(300)}>
              <Pressable
                onPress={goToPrevSlide}
                style={({ pressed }) => [s.backButton, pressed && s.backButtonPressed]}
              >
                <Text style={s.backButtonText}>←</Text>
              </Pressable>
            </Animated.View>
          </View>

          <View style={s.progressBarWrapper}>
            <View style={s.progressBarBackground}>
              <Animated.View
                entering={FadeInDown.duration(400)}
                style={[
                  s.progressBarFill,
                  { width: `${((currentSlide + 1) / TOTAL_SLIDES_V3) * 100}%` },
                ]}
              />
            </View>
          </View>

          <View style={s.backButtonArea} />
        </View>
      )}

      {/* Slide content */}
      <View style={s.slideContainer}>
        <SlideRenderer
          config={config}
          answers={answers}
          onAnswer={handleAnswer}
          onNext={goToNextSlide}
          onBack={goToPrevSlide}
          onFinish={finishOnboarding}
        />
      </View>

      {/* Bottom nav button (only for slides that opt-in via showNavButton) */}
      {config.showNavButton && (
        <View style={s.navigationContainer}>
          <Animated.View style={buttonAnimatedStyle}>
            <Pressable
              onPress={goToNextSlide}
              onPressIn={handleButtonPressIn}
              onPressOut={handleButtonPressOut}
              disabled={!canContinue}
              style={[primaryButtonStyles, !canContinue && { opacity: 0.5 }]}
            >
              <LinearGradient
                colors={PRIMARY_GRADIENT_COLORS}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={primaryButtonGradient}
              >
                <Text style={primaryButtonText}>{config.buttonText ?? 'Continuar'}</Text>
              </LinearGradient>
            </Pressable>
          </Animated.View>
        </View>
      )}
    </SafeAreaView>
  );
}

// ============================================
// STYLES
// ============================================
const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  slideContainer: {
    flex: 1,
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 4,
    gap: 12,
  },
  backButtonArea: {
    width: 40,
    height: 40,
    justifyContent: 'center',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: `${colors.textPrimary}14`,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: `${colors.textPrimary}0D`,
  },
  backButtonPressed: {
    backgroundColor: `${colors.textPrimary}26`,
  },
  backButtonText: {
    fontSize: 20,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  progressBarWrapper: {
    flex: 1,
    justifyContent: 'center',
  },
  progressBarBackground: {
    height: 6,
    backgroundColor: `${colors.textPrimary}1A`,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 3,
  },
  navigationContainer: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    paddingBottom: 40,
  },
  devCloseButton: {
    position: 'absolute',
    top: 60,
    right: 20,
    zIndex: 999,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: `${colors.textPrimary}33`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  devCloseButtonText: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '700',
  },
});
