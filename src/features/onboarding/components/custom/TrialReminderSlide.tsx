import { colors } from "@/constants/theme";
import { AppText as Text } from "@/src/components/AppText";
import { requestNotificationPermissions } from "@/src/lib/notificationService";
import { useProStore } from "@/src/store/proStore";
import { scheduleTrialExpirationNotification } from "@/src/utils/notifications";
import * as Haptics from "expo-haptics";
import { Bell } from "lucide-react-native";
import React, { useEffect, useState } from "react";
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
import { slideStyles } from "../../styles/shared";
import PixelCTAButton from "../PixelCTAButton";

const TRIAL_DAYS = 14;

interface Props {
  onNext: () => void;
}

const TrialReminderSlide: React.FC<Props> = ({ onNext }) => {
  const { t } = useTranslation();
  const [isGranting, setIsGranting] = useState(false);
  const { isPro } = useProStore();
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

  const handleEnable = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsGranting(true);
    const granted = await requestNotificationPermissions();
    if (granted && isPro) {
      await scheduleTrialExpirationNotification(TRIAL_DAYS);
    }
    setIsGranting(false);
    onNext();
  };

  const handleSkip = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onNext();
  };

  return (
    <View style={s.container}>
      <View style={s.content}>
        <Animated.Text
          entering={FadeInDown.delay(120).duration(450)}
          style={[slideStyles.slideTitle, slideStyles.questionTitle, s.title]}
        >
          {t("index_tab.onboarding.trial_reminder.title")}
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

        <Animated.Text
          entering={FadeInDown.delay(400).duration(450)}
          style={s.description}
        >
          {t("index_tab.onboarding.trial_reminder.description")}
        </Animated.Text>
      </View>

      <View style={s.buttonContainer}>
        <PixelCTAButton
          label={t("index_tab.onboarding.paywall_slide.cta")}
          onPress={handleEnable}
          disabled={isGranting}
          loading={isGranting}
        />

        <Pressable onPress={handleSkip} style={s.skipButton}>
          <Text style={s.skipText}>
            {t("index_tab.onboarding.trial_reminder.skip")}
          </Text>
        </Pressable>
      </View>
    </View>
  );
};

export default TrialReminderSlide;

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
    color: colors.background,
    textAlign: "center",
    alignSelf: "center",
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
  description: {
    fontSize: 14,
    fontWeight: "500",
    color: colors.surface,
    textAlign: "center",
    lineHeight: 20,
    paddingHorizontal: 16,
  },
  buttonContainer: {
    paddingHorizontal: 24,
    paddingBottom: 32,
    gap: 12,
  },
  skipButton: {
    alignItems: "center",
    paddingVertical: 12,
  },
  skipText: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.surface,
    opacity: 0.7,
  },
});
