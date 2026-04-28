import {
  PRIMARY_GRADIENT_COLORS,
  primaryButtonGradient,
  primaryButtonStyles,
  primaryButtonText,
} from '@/constants/buttons';
import { colors } from '@/constants/theme';
import { AppText as Text } from '@/src/components/AppText';
import { useAuth } from '@/src/contexts/AuthContext';
import { useOnboardingStore } from '@/src/store/onboardingStore';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { router, Stack } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { BackHandler, Image, Pressable, StyleSheet, View } from 'react-native';
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
import { useOnboardingTracking } from './useOnboardingTracking';

// ============================================
// ONBOARDING V3 SCREEN (Orchestrator)
// ============================================
export default function OnboardingV3Screen() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [answers, setAnswers] = useState<OnboardingAnswers>(INITIAL_ANSWERS);
  const buttonScale = useSharedValue(1);
  const { signInAnonymously } = useAuth();
  const prevSlideRef = useRef(0);

  const { trackStart, trackStepViewed, trackStepCompleted, trackCompleted, trackBack } =
    useOnboardingTracking();

  const config = SLIDES_V3[currentSlide];

  // ── Tracking: start on mount, step viewed on slide change ──
  useEffect(() => {
    trackStart();
    trackStepViewed(0, 'forward');
  }, []);

  useEffect(() => {
    if (currentSlide === 0) return; // handled by mount effect
    const direction = currentSlide > prevSlideRef.current ? 'forward' : 'backward';
    trackStepViewed(currentSlide, direction);
    prevSlideRef.current = currentSlide;
  }, [currentSlide]);

  // ── Navigation ──
  const finishOnboarding = useCallback(async () => {
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      // Persist answers to the onboarding store
      const store = useOnboardingStore.getState();
      store.setName(answers.userName);
      store.setSymptoms(answers.adhdSymptoms);
      store.setGoal(answers.goals.join(', '));

      await store.completeOnboarding();

      trackCompleted(answers);
    } catch (e) {
      console.error('Error during completeOnboarding:', e);
    } finally {
      // ALWAYS navigate off the onboarding regardless of db errors
      if (router.canGoBack()) {
        router.dismissAll();
      }
      router.replace('/(tabs)');
    }
  }, [answers]);

  const goToNextSlide = useCallback(() => {
    trackStepCompleted(currentSlide, answers);
    if (currentSlide < TOTAL_SLIDES_V3 - 1) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setCurrentSlide((s) => s + 1);
    } else {
      finishOnboarding();
    }
  }, [currentSlide, finishOnboarding, answers, trackStepCompleted]);

  const goToPrevSlide = useCallback(() => {
    if (currentSlide > 0) {
      trackBack();
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setCurrentSlide((s) => s - 1);
    }
  }, [currentSlide, trackBack]);

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
  const hideBackOnSlides = ['welcome', 'processing', ...(__DEV__ ? [] : ['dialogue'])];
  const showBack = currentSlide > 0 && !hideBackOnSlides.includes(config.type);

  // ── hardware back handler ──
  React.useEffect(() => {
    const onBackPress = () => {
      if (showBack) {
        goToPrevSlide();
      }
      return true; // ALWAYS prevent native back navigation
    };
    const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => subscription.remove();
  }, [showBack, goToPrevSlide]);

  return (
    <View
      style={[
        s.outerContainer,
        config.backgroundColor ? { backgroundColor: config.backgroundColor } : null,
        (config.backgroundImage || config.backgroundGradient) ? { backgroundColor: 'transparent' } : null
      ]}
    >
      {config.backgroundGradient && (
        <LinearGradient
          colors={config.backgroundGradient as [string, string, ...string[]]}
          style={s.absoluteGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
        />
      )}
      {config.backgroundImage && (
        <Image
          source={config.backgroundImage}
          style={s.absoluteImage}
          resizeMode="cover"
        />
      )}
      <SafeAreaView style={s.container}>
        {/* Disable iOS swipe back and header */}
        <Stack.Screen options={{ gestureEnabled: false, headerShown: false }} />

        {/* Header: back + progress bar */}
        {showBack && (
          <View style={s.headerContainer}>
            <View style={s.backButtonArea}>
              <Animated.View entering={FadeInDown.duration(300)}>
                <Pressable
                  onPress={goToPrevSlide}
                  style={({ pressed }) => [s.backButton, pressed && s.backButtonPressed]}
                >
                  <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
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
    </View>
  );
}

// ============================================
// STYLES
// ============================================
const s = StyleSheet.create({
  outerContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  absoluteImage: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  absoluteGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  container: {
    flex: 1,
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
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonPressed: {
    transform: [{ scale: 0.95 }],
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
});
