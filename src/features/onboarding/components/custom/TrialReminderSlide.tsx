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
import { Bell } from "lucide-react-native";
import React, { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Pressable, StyleSheet, View } from "react-native";
import Animated, {
    Easing,
    FadeInDown,
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withSequence,
    withTiming,
} from "react-native-reanimated";

// ============================================
// TRIAL REMINDER SLIDE
// ============================================
interface Props {
  onNext: () => void;
}

const TrialReminderSlide: React.FC<Props> = ({ onNext }) => {
  const { t } = useTranslation();
  const bellFloat = useSharedValue(0);
  const bellRotate = useSharedValue(0);

  useEffect(() => {
    bellFloat.value = withRepeat(
      withSequence(
        withTiming(-10, { duration: 1500, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 1500, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      true,
    );

    bellRotate.value = withRepeat(
      withSequence(
        withTiming(12, { duration: 200, easing: Easing.inOut(Easing.ease) }),
        withTiming(-12, { duration: 200, easing: Easing.inOut(Easing.ease) }),
        withTiming(8, { duration: 160, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 160, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 2000 }),
      ),
      -1,
      false,
    );
  }, []);

  const bellFloatStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: bellFloat.value }],
  }));

  const bellStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${bellRotate.value}deg` }],
  }));

  const handleContinue = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onNext();
  };

  return (
    <View style={s.container}>
      <View style={s.content}>
        <Animated.Text
          entering={FadeInDown.delay(120).duration(450)}
          style={s.title}
        >
          {t("onboarding.trial_reminder.title")}
        </Animated.Text>

        <Animated.View
          entering={FadeInDown.delay(260).duration(500)}
          style={[s.bellWrap, bellFloatStyle]}
        >
          <Animated.View style={[s.bellIcon, bellStyle]}>
            <Bell size={86} color={colors.textSecondary} strokeWidth={1.6} />
          </Animated.View>
          <View style={s.badge}>
            <Text style={s.badgeText}>1</Text>
          </View>
        </Animated.View>
      </View>

      <View style={s.buttonContainer}>
        <Pressable onPress={handleContinue} style={primaryButtonStyles}>
          <LinearGradient
            colors={PRIMARY_GRADIENT_COLORS}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={primaryButtonGradient}
          >
            <Text style={primaryButtonText}>
              {t("onboarding.trial_reminder.cta")}
            </Text>
          </LinearGradient>
        </Pressable>
      </View>
    </View>
  );
};

export default TrialReminderSlide;

// ============================================
// STYLES
// ============================================
const s = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "space-between",
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  title: {
    fontSize: 24,
    fontWeight: "900",
    color: colors.background,
    textAlign: "center",
    lineHeight: 32,
    letterSpacing: -0.3,
    marginBottom: 28,
    paddingHorizontal: 10,
  },
  bellWrap: {
    alignItems: "center",
    justifyContent: "center",
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: `${colors.surface}`,
    borderWidth: 1,
    borderColor: `${colors.textPrimary}0F`,
    marginBottom: 22,
  },
  bellIcon: {
    alignItems: "center",
    justifyContent: "center",
  },
  badge: {
    position: "absolute",
    top: 28,
    right: 34,
    width: 56,
    height: 56,
    borderRadius: 32,
    backgroundColor: colors.danger,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: colors.background,
  },
  badgeText: {
    fontSize: 18,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  reassureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  reassureText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.surface,
  },
  buttonContainer: {
    paddingHorizontal: 24,
    paddingBottom: 32,
  },
});
