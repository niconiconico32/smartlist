import { colors } from "@/constants/theme";
import { useAuth } from "@/src/contexts/AuthContext";
import { useOnboardingStore } from "@/src/store/onboardingStore";
import { hapticLight, hapticSelection, hapticSuccess } from "@/utils/haptics";
import { LinearGradient } from "expo-linear-gradient";
import { router, Stack, useLocalSearchParams } from "expo-router";
import React, {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";
import { useTranslation } from "react-i18next";
import { BackHandler, Image, Pressable, StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  SlideInLeft,
  SlideInRight,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Polygon } from "react-native-svg";

import ChevronLeftIcon from "./components/ChevronLeftIcon";
import PixelCTAButton from "./components/PixelCTAButton";
import SlideRenderer from "./components/SlideRenderer";
import { LIGHT_BACKGROUND } from "./constants";
import { SLIDES_V3, TOTAL_SLIDES_V3 } from "./slides-v3";
import { INITIAL_ANSWERS, OnboardingAnswers } from "./types";
import { useOnboardingTracking } from "./useOnboardingTracking";

// ============================================
// ONBOARDING V3 SCREEN (Orchestrator)
// ============================================
export default function OnboardingV3Screen() {
  const { t, i18n } = useTranslation();
  const { startAt } = useLocalSearchParams<{ startAt?: string }>();
  const initialSlide = useMemo(() => {
    if (startAt === "last3") {
      return Math.max(TOTAL_SLIDES_V3 - 3, 0);
    }
    if (startAt !== undefined) {
      const parsed = Number(startAt);
      if (!Number.isNaN(parsed)) {
        return Math.min(Math.max(parsed, 0), TOTAL_SLIDES_V3 - 1);
      }
    }
    return 0;
  }, [startAt]);
  const [currentSlide, setCurrentSlide] = useState(initialSlide);
  const [answers, setAnswers] = useState<OnboardingAnswers>(INITIAL_ANSWERS);
  const [slideDirection, setSlideDirection] = useState<"forward" | "backward">(
    "forward",
  );
  const { signInAnonymously } = useAuth();
  const prevSlideRef = useRef(initialSlide);
  const restoredRef = useRef(false);

  const {
    trackStart,
    trackStepViewed,
    trackStepCompleted,
    trackStepBack,
    trackCompleted,
    trackAbandoned,
  } = useOnboardingTracking();

  const config = SLIDES_V3[currentSlide];

  // ── Tracking: start on mount, step viewed on slide change ──
  useEffect(() => {
    trackStart();
    trackStepViewed(initialSlide, "forward");
  }, [initialSlide]);

  // ── Restore saved progress on mount ──
  useEffect(() => {
    if (restoredRef.current) return;
    restoredRef.current = true;
    const store = useOnboardingStore.getState();
    store.loadProgress().then((saved) => {
      if (saved && saved.currentSlide > 0) {
        const safeSlide = Math.min(saved.currentSlide, TOTAL_SLIDES_V3 - 1);
        const sanitizedAnswers = { ...saved.answers };
        if (typeof sanitizedAnswers.taskText !== 'string') {
          sanitizedAnswers.taskText = '';
        }
        setCurrentSlide(safeSlide);
        setAnswers((prev) => ({ ...prev, ...sanitizedAnswers }));
      }
    });
  }, []);

  useEffect(() => {
    if (currentSlide === 0) return; // handled by mount effect
    const direction =
      currentSlide > prevSlideRef.current ? "forward" : "backward";
    trackStepViewed(currentSlide, direction);
    prevSlideRef.current = currentSlide;
  }, [currentSlide]);

  // ── Track: abandon on unmount (user navigates away) ──
  useEffect(() => {
    return () => {
      trackAbandoned('unmount');
    };
  }, [trackAbandoned]);

  // ── Persist progress on every slide/answer change ──
  useEffect(() => {
    if (!restoredRef.current) return;
    const store = useOnboardingStore.getState();
    store.saveProgress({ currentSlide, answers: answers as unknown as Record<string, unknown> });
  }, [currentSlide, answers]);

  // ── Navigation ──
  const finishOnboarding = useCallback(async () => {
    try {
      hapticSuccess();
      // Persist answers to the onboarding store
      const store = useOnboardingStore.getState();
      store.setName(answers.userName);
      store.setSymptoms(answers.adhdSymptoms);
      store.setGoal(answers.goals.join(", "));

      await store.completeOnboarding();
      await store.clearProgress();

      trackCompleted(answers);
    } catch (e) {
      console.error(t("onboarding.logs.complete_onboarding_error"), e);
    } finally {
      // ALWAYS navigate off the onboarding regardless of db errors
      if (router.canGoBack()) {
        router.dismissAll();
      }
      router.replace("/(tabs)");
    }
  }, [answers]);

  const goToNextSlide = useCallback(() => {
    trackStepCompleted(currentSlide, answers);
    if (currentSlide < TOTAL_SLIDES_V3 - 1) {
      hapticSelection();
      setSlideDirection("forward");
      setCurrentSlide((s) => s + 1);
    } else {
      finishOnboarding();
    }
  }, [currentSlide, finishOnboarding, answers, trackStepCompleted]);

  const goToPrevSlide = useCallback(() => {
    if (currentSlide > 0) {
      trackStepBack(currentSlide, currentSlide - 1);
      hapticLight();
      setSlideDirection("backward");
      setCurrentSlide((s) => s - 1);
    }
  }, [currentSlide, trackStepBack]);

  // ── Answer handler ──
  const handleAnswer = useCallback(
    <K extends keyof OnboardingAnswers>(
      key: K,
      value: OnboardingAnswers[K],
    ) => {
      setAnswers((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  // ── Can continue? ──
  const canContinue = config.canContinue ? config.canContinue(answers) : true;

  // Slides that should hide the back button (auto-advancing slides)
  const hideBackOnSlides = [
    "welcome",
    "paywall",
    "trial-reminder",
    "paywall-onboarding",
    ...(__DEV__ ? [] : ["dialogue"]),
  ];
  const showBack = currentSlide > 0 && !hideBackOnSlides.includes(config.type);

  // Slides sobre fondo claro (preguntas): adapta back/progress a color oscuro
  const isLightBackground =
    config.backgroundColor === LIGHT_BACKGROUND ||
    config.backgroundColor === "#f2f2f2";

  // Banda diagonal #e3e3e3 en el tercio superior de las pantallas con opciones
  const showOptionBand = ["single-select", "multi-select", "agreement"].includes(
    config.type,
  );
  const [optionBandSize, setOptionBandSize] = useState({ width: 0, height: 0 });

  // ── Transición entre preguntas: slide horizontal + fade, 250ms ease-out ──
  const transitionSlide = useMemo(() => {
    const easing = Easing.out(Easing.ease);
    return slideDirection === "forward"
      ? SlideInRight.duration(250).easing(easing)
      : SlideInLeft.duration(250).easing(easing);
  }, [slideDirection]);

  const transitionFade = useMemo(
    () => FadeIn.duration(250).easing(Easing.out(Easing.ease)),
    [],
  );

  // ── hardware back handler ──
  React.useEffect(() => {
    const onBackPress = () => {
      if (showBack) {
        goToPrevSlide();
      }
      return true; // ALWAYS prevent native back navigation
    };
    const subscription = BackHandler.addEventListener(
      "hardwareBackPress",
      onBackPress,
    );
    return () => subscription.remove();
  }, [showBack, goToPrevSlide]);

  return (
    <View
      style={[
        s.outerContainer,
        config.backgroundColor
          ? { backgroundColor: config.backgroundColor }
          : null,
        config.backgroundImage || config.backgroundGradient
          ? { backgroundColor: "transparent" }
          : null,
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

      {/* Tercio superior #e3e3e3 con corte diagonal desde la mitad del tercio hasta
          la esquina inferior derecha del tercio (pantallas con opciones) */}
      {showOptionBand && (
        <View
          pointerEvents="none"
          style={StyleSheet.absoluteFill}
          onLayout={(e) =>
            setOptionBandSize({
              width: e.nativeEvent.layout.width,
              height: e.nativeEvent.layout.height,
            })
          }
        >
          {optionBandSize.width > 0 && (
            <Svg
              width="100%"
              height="100%"
              viewBox={`0 0 ${optionBandSize.width} ${optionBandSize.height}`}
            >
              <Polygon
                points={`0,0 ${optionBandSize.width},0 ${optionBandSize.width},${
                  optionBandSize.height / 3
                } 0,${optionBandSize.height / 6}`}
                fill="#e3e3e3"
              />
            </Svg>
          )}
        </View>
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
                  style={({ pressed }) => [
                    s.backButton,
                    pressed && s.backButtonPressed,
                  ]}
                >
                  <ChevronLeftIcon
                    color={isLightBackground ? colors.primaryContent : colors.textPrimary}
                  />
                </Pressable>
              </Animated.View>
            </View>

            <View style={s.progressBarWrapper}>
              <View
                style={[
                  s.progressBarBackground,
                  isLightBackground && s.progressBarBackgroundLight,
                ]}
              >
                <Animated.View
                  entering={FadeInDown.duration(400)}
                  style={[
                    s.progressBarFill,
                    {
                      width: `${((currentSlide + 1) / TOTAL_SLIDES_V3) * 100}%`,
                    },
                  ]}
                />
              </View>
            </View>
          </View>
        )}

        <View style={s.slideContainer}>
          <Animated.View
            key={currentSlide}
            entering={transitionFade}
            style={{ flex: 1 }}
          >
            <Animated.View entering={transitionSlide} style={{ flex: 1 }}>
              <SlideRenderer
                config={config}
                answers={answers}
                onAnswer={handleAnswer}
                onNext={goToNextSlide}
                onBack={goToPrevSlide}
                onFinish={finishOnboarding}
              />
            </Animated.View>
          </Animated.View>
        </View>

        {/* Bottom nav button (only for slides that opt-in via showNavButton) */}
        {config.showNavButton && (
          <View style={s.navigationContainer}>
            {/* TEST: PixelCTAButton prototipo; OnboardingCTAButton se conserva sin tocar */}
            <PixelCTAButton
              label={t(config.buttonText ?? "onboarding.continue")}
              onPress={goToNextSlide}
              disabled={!canContinue}
            />
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
    width: "100%",
    height: "100%",
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
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 8,
    gap: 12,
  },
  backButtonArea: {
    width: 40,
    height: 40,
    justifyContent: "center",
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  backButtonPressed: {
    transform: [{ scale: 0.95 }],
  },
  progressBarWrapper: {
    flex: 1,
    justifyContent: "center",
    marginRight: 60,
  },
  progressBarBackground: {
    height: 10,
    backgroundColor: `${colors.textPrimary}1A`,
    borderRadius: 9,
    overflow: "hidden",
  },
  progressBarBackgroundLight: {
    backgroundColor: `${colors.primaryContent}1A`,
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: colors.surface,
    borderRadius: 3,
  },
  navigationContainer: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    paddingBottom: 40,
  },
  devLanguageSwitcher: {
    position: "absolute",
    right: 16,
    top: 10,
    zIndex: 1000,
    flexDirection: "row",
    gap: 8,
  },
  devLanguageButton: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: `${colors.textPrimary}55`,
    backgroundColor: `${colors.background}CC`,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  devLanguageButtonActive: {
    backgroundColor: colors.surface,
    borderColor: colors.surface,
  },
  devLanguageText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.textPrimary,
  },
});
