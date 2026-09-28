import { colors } from "@/constants/theme";
import { AppText as Text } from "@/src/components/AppText";
import { hapticMedium } from "@/utils/haptics";
import { playWhoosh } from "@/utils/sounds";
import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  AccessibilityInfo,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { slideStyles } from "../../styles/shared";
import type { OnboardingAnswers } from "../../types";
import PixelCTAButton from "../PixelCTAButton";
import {
  HorrorGhostIcon,
  MapNavigationPinIcon,
  UserWomanIncreasingArrowIcon,
} from "../PixelSuggestionIcons";

interface Props {
  answers: OnboardingAnswers;
  onNext: () => void;
}

// ============================================
// REVEAL BLOCK
// Fade-in + translateY(20 -> 0) con spring.
// Dispara onReveal en el momento exacto en que
// el bloque empieza a hacerse visible (para haptic).
// ============================================
interface RevealBlockProps {
  delay: number;
  onReveal?: () => void;
  animate?: boolean;
  style?: object;
  children: React.ReactNode;
}

const RevealBlock: React.FC<RevealBlockProps> = ({
  delay,
  onReveal,
  animate = true,
  style,
  children,
}) => {
  const opacity = useSharedValue(animate ? 0 : 1);
  const translateY = useSharedValue(animate ? 20 : 0);

  useEffect(() => {
    if (!animate) return;
    const timer = setTimeout(() => {
      onReveal?.();
      opacity.value = withSpring(1, { damping: 16, stiffness: 130 });
      translateY.value = withSpring(0, { damping: 16, stiffness: 130 });
    }, delay);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [delay, animate]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View style={[style, animate && animatedStyle]}>
      {children}
    </Animated.View>
  );
};

const ResultsSlide: React.FC<Props> = ({ answers: _answers, onNext }) => {
  const { t } = useTranslation();
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled().then((value) => {
      if (mounted) setReduceMotion(value);
    });
    return () => {
      mounted = false;
    };
  }, []);

  const goalText = t("onboarding.results.goal_text");
  const areaText = t("onboarding.results.area_text");
  const symptomsText = [
    t("onboarding.results.obstacles.default_1"),
    t("onboarding.results.obstacles.default_2"),
    t("onboarding.results.obstacles.default_3"),
  ];

  // Delay base + 150ms entre bloques
  const base = useMemo(() => (reduceMotion ? 0 : 100), [reduceMotion]);
  const blockDelay = useMemo(
    () => (index: number) => base + 150 * index,
    [base],
  );

  return (
    <View style={s.container}>
      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <RevealBlock delay={blockDelay(0)} animate={!reduceMotion}>
          <Text
            style={[
              slideStyles.slideTitle,
              slideStyles.questionTitle,
              { color: colors.background, marginBottom: 32 },
            ]}
          >
            {t("onboarding.results.analysis_title")}
          </Text>
        </RevealBlock>

        {/* SECTION 1 */}
        <RevealBlock
          delay={blockDelay(1)}
          onReveal={hapticMedium}
          animate={!reduceMotion}
          style={s.section}
        >
          <View style={s.sectionHeader}>
            <UserWomanIncreasingArrowIcon size={20} color={colors.surface} />
            <Text style={s.sectionLabel}>
              {t("onboarding.results.pills.where_you_want_to_go")}
            </Text>
          </View>
          <Text style={s.sectionText}>{goalText}</Text>
        </RevealBlock>

        <RevealBlock delay={blockDelay(2)} animate={!reduceMotion}>
          <View style={s.dashedLine} />
        </RevealBlock>

        {/* SECTION 2 */}
        <RevealBlock
          delay={blockDelay(3)}
          onReveal={hapticMedium}
          animate={!reduceMotion}
          style={s.section}
        >
          <View style={s.sectionHeader}>
            <MapNavigationPinIcon size={20} color={colors.surface} />
            <Text style={s.sectionLabel}>
              {t("onboarding.results.pills.where_you_are_now")}
            </Text>
          </View>
          <Text style={s.sectionText}>{areaText}</Text>
        </RevealBlock>

        <RevealBlock delay={blockDelay(4)} animate={!reduceMotion}>
          <View style={s.dashedLine} />
        </RevealBlock>

        {/* SECTION 3: cada punto se revela individualmente */}
        <RevealBlock
          delay={blockDelay(5)}
          onReveal={hapticMedium}
          animate={!reduceMotion}
          style={s.section}
        >
          <View style={s.sectionHeader}>
            <Text style={s.sectionLabel}>
              {t("onboarding.results.pills.what_holds_you_back")}
            </Text>
          </View>
          <View style={s.listContainer}>
            {symptomsText.map((txt, i) => (
              <RevealBlock
                key={i}
                delay={blockDelay(6) + 150 * i}
                onReveal={
                  i === symptomsText.length - 1
                    ? () => {
                        hapticMedium();
                        playWhoosh();
                      }
                    : hapticMedium
                }
                animate={!reduceMotion}
                style={s.listItem}
              >
                <HorrorGhostIcon size={16} color={colors.surface} />
                <Text style={s.sectionText}>{txt}</Text>
              </RevealBlock>
            ))}
          </View>
        </RevealBlock>
      </ScrollView>

      {/* Button to continue */}
      <RevealBlock
        delay={blockDelay(7) + 150 * Math.max(symptomsText.length - 1, 0)}
        animate={!reduceMotion}
        style={s.footer}
      >
        <PixelCTAButton
          label={t("onboarding.continue")}
          onPress={() => {
            hapticMedium();
            onNext();
          }}
        />
      </RevealBlock>
    </View>
  );
};

export default ResultsSlide;

const s = StyleSheet.create({
  container: {
    flex: 1,
    // Background color is handled by the parent slide wrapper
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 32,
    paddingTop: 24,
    paddingBottom: 40,
  },
  section: {
    paddingVertical: 20,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  sectionLabel: {
    color: colors.surface,
    fontSize: 12,
    fontWeight: "700",
    textTransform: "lowercase",
  },
  sectionText: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.background,
    lineHeight: 24,
  },
  dashedLine: {
    borderTopWidth: 2,
    borderStyle: "dashed",
    borderColor: colors.surface,
  },
  listContainer: {
    gap: 12,
  },
  listItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  footer: {
    paddingHorizontal: 32,
    paddingBottom: 40,
    paddingTop: 20,
  },
});
