import { colors } from "@/constants/theme";
import { AppText as Text } from "@/src/components/AppText";
import { requestNotificationPermissions } from "@/src/lib/notificationService";
import * as Haptics from "expo-haptics";
import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Image, Pressable, StyleSheet, View } from "react-native";
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

// ============================================
// NOTIFICATIONS SLIDE
// ============================================
interface Props {
  onNext: () => void;
}

const NotificationsSlide: React.FC<Props> = ({ onNext }) => {
  const { t } = useTranslation();
  const [granted, setGranted] = useState(false);

  const mascotY = useSharedValue(0);
  const bellRotate = useSharedValue(0);

  useEffect(() => {
    // Floating mascot
    mascotY.value = withRepeat(
      withSequence(
        withTiming(-10, { duration: 1500, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 1500, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      true,
    );
    // Bell wiggle
    bellRotate.value = withRepeat(
      withSequence(
        withTiming(15, { duration: 200, easing: Easing.inOut(Easing.ease) }),
        withTiming(-15, { duration: 200, easing: Easing.inOut(Easing.ease) }),
        withTiming(10, { duration: 150, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 150, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 2000 }), // pause
      ),
      -1,
      false,
    );
  }, []);

  const mascotStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: mascotY.value }],
  }));

  const bellStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${bellRotate.value}deg` }],
  }));

  const requestPermission = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const success = await requestNotificationPermissions();

    if (success) {
      setGranted(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setTimeout(onNext, 700);
    } else {
      // Si el usuario deniega los permisos en el OS, avanzamos igual
      // para que no se quede bloqueado en esta pantalla
      onNext();
    }
  };

  return (
    <View style={s.container}>
      <View style={s.contentArea}>
        {/* Mascot + bell */}
        <Animated.View
          entering={FadeInDown.delay(100).duration(600)}
          style={[s.mascotContainer, mascotStyle]}
        >
          <Image
            source={require("@/assets/images/logomain.png")}
            style={s.mascot}
            resizeMode="contain"
          />
          <Animated.Text style={[s.bell, bellStyle]}>🔔</Animated.Text>
        </Animated.View>

        <Animated.Text
          entering={FadeInDown.delay(200).duration(400)}
          style={[slideStyles.slideTitle, slideStyles.questionTitle, s.title]}
        >
          {t("onboarding.notifications.title")}
        </Animated.Text>
        <Animated.Text
          entering={FadeInDown.delay(350).duration(400)}
          style={s.subtitle}
        >
          {t("onboarding.notifications.subtitle")}
        </Animated.Text>

        {granted && (
          <Animated.View
            entering={FadeInDown.duration(300)}
            style={s.successRow}
          >
            <Text style={s.successIcon}>✓</Text>
            <Text style={s.successText}>
              {t("onboarding.notifications.success")}
            </Text>
          </Animated.View>
        )}
      </View>

      <View style={s.buttonContainer}>
        {!granted ? (
          <>
            <PixelCTAButton
              label={t("onboarding.notifications.activate_cta")}
              onPress={requestPermission}
            />
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onNext();
              }}
              style={s.skipButton}
            >
              <Text style={s.skipText}>
                {t("onboarding.notifications.skip")}
              </Text>
            </Pressable>
          </>
        ) : (
          <PixelCTAButton
            label={t("onboarding.continue")}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              onNext();
            }}
          />
        )}
      </View>
    </View>
  );
};

export default NotificationsSlide;

// ============================================
// STYLES
// ============================================
const s = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentArea: {
    flex: 1,
    paddingHorizontal: 32,
    paddingTop: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  mascotContainer: {
    alignItems: "center",
    marginBottom: 24,
  },
  mascot: {
    width: 140,
    height: 140,
  },
  bell: {
    position: "absolute",
    right: -10,
    bottom: 20,
    fontSize: 32,
  },
  title: {
    color: colors.textPrimary,
    textAlign: "center",
    alignSelf: "center",
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 15,
    fontWeight: "500",
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 22,
    paddingHorizontal: 16,
  },
  successRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 20,
    backgroundColor: `${colors.primary}1A`,
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  successIcon: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.primary,
  },
  successText: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.primary,
  },
  buttonContainer: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    paddingBottom: 40,
    alignItems: "center",
  },
  skipButton: {
    marginTop: 14,
    paddingVertical: 8,
  },
  skipText: {
    fontSize: 14,
    fontWeight: "500",
    color: colors.textSecondary,
  },
});
