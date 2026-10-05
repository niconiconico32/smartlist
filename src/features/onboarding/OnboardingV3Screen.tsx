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
  const {
    t,
    i18n,
  } = useTranslation();
  const { signInAnonymously, session } = useAuth();
  const { startAt, reset } = useLocalSearchParams<{
    startAt?: string;
    reset?: string;
  }>();
  const shouldReset = reset === "1" || reset === "true";
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
  const prevSlideRef = useRef(initialSlide);
  const restoreStartedRef = useRef(false);
  // Writing is only safe once loadProgress() has resolved. Using a separate ref
  // from restoreStartedRef avoids persisting the empty initial state on mount,
  // which would wipe the saved progress before it is even read.
  const canPersistRef = useRef(false);

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

  // ── Session bootstrap ──
  // Slides in the middle of the questionnaire (routine-picker and
  // routine-egg-flow) persist data scoped to the user, so the session must
  // exist BEFORE the flow starts. The legacy "welcome" slide used to guarantee
  // this by signing in anonymously at slide 0; without it those slides sit on a
  // dead button. The ref guard keeps it to a single call: signInAnonymously is
  // re-created on every provider render, which would otherwise re-fire this.
  const anonSessionStartedRef = useRef(false);
  useEffect(() => {
    if (session || anonSessionStartedRef.current) return;
    anonSessionStartedRef.current = true;
    void signInAnonymously();
  }, [session, signInAnonymously]);

// ── Restore saved progress on mount ──
  // Skipped when an explicit startAt is passed (DebugPanel deep links) or when
  // reset=1, so those entry points actually honour the slide they asked for.
  useEffect(() => {
    if (restoreStartedRef.current) return;
    restoreStartedRef.current = true;

    const store = useOnboardingStore.getState();

    if (reset || startAt !== undefined) {
      if (reset) void store.clearProgress();
      canPersistRef.current = true;
      return;
    }

    store
      .loadProgress()
      .then((saved) => {
        if (saved && saved.currentSlide > 0) {
          const safeSlide = Math.min(saved.currentSlide, TOTAL_SLIDES_V3 - 1);
          const sanitizedAnswers = { ...saved.answers };
          if (typeof sanitizedAnswers.taskText !== "string") {
            sanitizedAnswers.taskText = "";
          }
          setCurrentSlide(safeSlide);
          setAnswers((prev) => ({ ...prev, ...sanitizedAnswers }));
        }
      })
      .catch(() => {})
      .finally(() => {
        // Enable persistence only after the read settled.
        canPersistRef.current = true;
      });
  }, [reset, startAt]);

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
    if (!canPersistRef.current) return;
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
      // The login funnel owns authentication, so a user arriving straight at
      // the questionnaire never passed through the old "welcome" slide (the
      // only place that used to create the anonymous session). Create it here,
      // otherwise the root guard would bounce them back to /login.
      if (!session) {
        try {
          await signInAnonymously();
        } catch (e) {
          console.error("Onboarding: could not create anonymous session", e);
        }
      }
      // ALWAYS navigate off the onboarding regardless of db errors
      if (router.canGoBack()) {
        router.dismissAll();
      }
      router.replace("/(tabs)");
    }
  }, [answers, session, signInAnonymously]);

  // The back button is only offered on the first screens of the questionnaire,
// and even there it can only move backwards WITHIN the onboarding (goToPrevSlide
// is clamped at 0), so it can never drop the user back into the login funnel.
// From this point on the flow is forward-only and only the progress bar shows.
const BACK_BUTTON_SLIDE_LIMIT = 4;

// Slides that auto-advance should not offer a manual back step.
const hideBackOnSlides = ["paywall", "trial-reminder", "paywall-onboarding"];
const showBack =
  currentSlide < BACK_BUTTON_SLIDE_LIMIT &&
  !hideBackOnSlides.includes(config.type);

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
    // Clamped at 0: back never escapes the onboarding.
    if (currentSlide > 0 && showBack) {
      trackStepBack(currentSlide, currentSlide - 1);
      hapticLight();
      setSlideDirection("backward");
      setCurrentSlide((s) => Math.max(0, s - 1));
    }
  }, [currentSlide, showBack, trackStepBack]);

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

        {/* Header: back (first slides only) + progress bar (always) */}
        <View style={s.headerContainer}>
          {/* Always rendered so the progress bar keeps the same width whether or
              not the back button is shown. */}
          <View style={s.backButtonArea}>
            {showBack && (
              <Animated.View entering={FadeInDown.duration(300)}>
                <Pressable
                  testID="onboardingBack"
                  accessibilityRole="button"
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
            )}
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
