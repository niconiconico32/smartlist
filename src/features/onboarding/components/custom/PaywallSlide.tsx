import {
  PRIMARY_GRADIENT_COLORS,
  primaryButtonGradient,
  primaryButtonStyles,
  primaryButtonText,
} from "@/constants/buttons";
import { colors } from "@/constants/theme";
import { AppText as Text } from "@/src/components/AppText";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import {
  Check,
  Crown,
  Dog,
  Sparkles,
  Store,
  X,
  Zap,
} from "lucide-react-native";
import React from "react";
import { useTranslation } from "react-i18next";
import { Image, Pressable, ScrollView, StyleSheet, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

// ============================================
// PAYWALL SLIDE
// ============================================
interface Props {
  onNext: () => void;
}

const FEATURES = [
  {
    Icon: Sparkles,
    labelKey: "onboarding.paywall_slide.feature_ai",
  },
  {
    Icon: Zap,
    labelKey: "onboarding.paywall_slide.feature_widget",
  },
  {
    Icon: Crown,
    labelKey: "onboarding.paywall_slide.feature_crowns",
  },
  {
    Icon: Store,
    labelKey: "onboarding.paywall_slide.feature_store",
  },
  {
    Icon: Dog,
    labelKey: "onboarding.paywall_slide.feature_companions",
  },
];

const PaywallSlide: React.FC<Props> = ({ onNext }) => {
  const { t } = useTranslation();
  const handleContinue = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onNext();
  };

  return (
    <View style={s.container}>
      <LinearGradient
        colors={["#F7F8FF", "#EEF2FF", "#F7F7FF"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />
      <View style={s.header}>
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onNext();
          }}
          style={s.closeButton}
          hitSlop={8}
        >
          <X size={18} color={colors.textSecondary} />
        </Pressable>
      </View>
      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View
          entering={FadeInDown.delay(100).duration(400)}
          style={s.mascotContainer}
        >
          <Image
            source={require("@/assets/images/streak.png")}
            style={s.mascot}
            resizeMode="contain"
          />
        </Animated.View>

        <Animated.Text
          entering={FadeInDown.delay(200).duration(400)}
          style={s.title}
        >
          {t("onboarding.paywall_slide.title")}
        </Animated.Text>
        <Animated.Text
          entering={FadeInDown.delay(300).duration(400)}
          style={s.subtitle}
        >
          {t("onboarding.paywall_slide.subtitle")}
        </Animated.Text>

        <Animated.View
          entering={FadeInDown.delay(420).duration(500)}
          style={s.benefitsCard}
        >
          {FEATURES.map(({ Icon, labelKey }, idx) => (
            <View key={labelKey} style={s.benefitRow}>
              <View style={s.benefitIconWrap}>
                <Icon size={24} color={colors.surface} strokeWidth={2.4} />
              </View>
              <Text style={s.benefitText}>{t(labelKey)}</Text>
              {idx < FEATURES.length - 1 && <View style={s.benefitDivider} />}
            </View>
          ))}
        </Animated.View>

        <Animated.View
          entering={FadeInDown.delay(520).duration(450)}
          style={s.reassureRow}
        >
          <Check size={16} color={colors.success} strokeWidth={3} />
          <Text style={s.reassureText}>
            {t("onboarding.paywall_slide.reassure")}
          </Text>
        </Animated.View>
      </ScrollView>

      <View style={s.buttonContainer}>
        <Pressable onPress={handleContinue} style={primaryButtonStyles}>
          <LinearGradient
            colors={PRIMARY_GRADIENT_COLORS}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={primaryButtonGradient}
          >
            <Text style={primaryButtonText}>
              {t("onboarding.paywall_slide.cta")}
            </Text>
          </LinearGradient>
        </Pressable>
      </View>
    </View>
  );
};

export default PaywallSlide;

// ============================================
// STYLES
// ============================================
const s = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 10,
    alignItems: "flex-end",
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(17, 24, 39, 0.06)",
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 24,
    alignItems: "center",
  },
  mascotContainer: {
    marginBottom: 20,
  },
  mascot: {
    width: 180,
    height: 180,
  },
  title: {
    fontSize: 45,
    fontFamily: "Jersey10",
    color: colors.background,
    textAlign: "center",
    letterSpacing: 0.4,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.textTertiary,
    opacity: 0.7,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 20,
    paddingHorizontal: 18,
  },
  benefitsCard: {
    width: "100%",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
  },
  benefitRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  benefitIconWrap: {
    width: 36,
    height: 36,
  },
  benefitText: {
    flex: 1,
    fontSize: 14,
    fontWeight: "400",
    color: colors.textTertiary,
    lineHeight: 18,
  },
  benefitDivider: {
    position: "absolute",
    left: 38,
    right: 0,
    bottom: -6,
    height: 1,
    backgroundColor: "rgba(15, 23, 42, 0.06)",
  },
  reassureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 16,
  },
  reassureText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  buttonContainer: {
    paddingHorizontal: 24,
    paddingBottom: 32,
  },
  priceNote: {
    marginTop: 10,
    fontSize: 12,
    fontWeight: "600",
    color: colors.textSecondary,
  },
});
