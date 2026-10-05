import { AppText as Text } from "@/src/components/AppText";
import { LoginLegalNotice } from "@/src/components/LoginLegalNotice";
import { posthog } from "@/src/config/posthog";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { ArrowLeft } from "lucide-react-native";
import React, { useCallback, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Pressable, StyleSheet, View } from "react-native";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

export default function LoginOptionsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    posthog.capture("login_options_view");
  }, []);

  const handleFirstTime = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    // replace (not push) so the decision screen is not in the history stack:
    // going back from onboarding should not return to this question.
    router.replace("/onboarding-v3");
  }, [router]);

  const handleExistingAccount = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push("/login-existing");
  }, [router]);

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <Pressable
          testID="loginOptionsBack"
          accessibilityRole="button"
          accessibilityLabel={t("common.back")}
          style={[styles.backButton, { top: insets.top + 8 }]}
          onPress={() => router.back()}
        >
          <ArrowLeft size={24} color="#1A1C20" />
        </Pressable>

        <Animated.View
          entering={FadeInUp.duration(600).delay(200)}
          style={styles.heroSection}
        >
          <Text style={styles.title}>{t("login_options.title")}</Text>
          <Text style={styles.subtitle}>{t("login_options.subtitle")}</Text>
        </Animated.View>

        <Animated.View
          entering={FadeInDown.duration(600).delay(400)}
          style={styles.buttonsSection}
        >
          <Pressable
            testID="loginOptionsFirstTime"
            accessibilityRole="button"
            accessibilityLabel={t("login_options.first_time")}
            accessibilityHint={t("login_options.first_time_hint")}
            style={({ pressed }) => [
              styles.ctaButton,
              pressed && styles.buttonPressed,
            ]}
            onPress={handleFirstTime}
          >
            <Text style={styles.ctaButtonText}>
              {t("login_options.first_time")}
            </Text>
            <Text style={styles.ctaSmallText}>
              {t("login_options.first_time_hint")}
            </Text>
          </Pressable>

          <Pressable
            testID="loginOptionsHasSubscription"
            accessibilityRole="button"
            accessibilityLabel={t("login_options.has_subscription")}
            accessibilityHint={t("login_options.has_subscription_hint")}
            style={({ pressed }) => [
              styles.ctaButton,
              pressed && styles.buttonPressed,
            ]}
            onPress={handleExistingAccount}
          >
            <Text style={styles.ctaButtonText}>
              {t("login_options.has_subscription")}
            </Text>
            <Text style={styles.ctaSmallText}>
              {t("login_options.has_subscription_hint")}
            </Text>
          </Pressable>

          <LoginLegalNotice />
        </Animated.View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ECF0ED",
  },
  safeArea: {
    flex: 1,
    paddingHorizontal: 28,
    paddingBottom: 24,
  },
  backButton: {
    position: "absolute",
    left: 24,
    zIndex: 10,
    padding: 8,
  },
  heroSection: {
    flex: 1,
    alignItems: "flex-start",
    justifyContent: "center",
    gap: 12,
  },
  title: {
    fontSize: 36,
    fontWeight: "900",
    color: "#1A1C20",
    letterSpacing: -1,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: "500",
    color: "#4B5563",
    lineHeight: 24,
  },
  buttonsSection: {
    gap: 16,
    paddingBottom: 8,
  },
  ctaButton: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    paddingVertical: 20,
    paddingHorizontal: 24,
    alignItems: "center",
  },
  ctaButtonText: {
    fontSize: 17,
    fontWeight: "700",
    color: "#6B7280",
  },
  ctaSmallText: {
    fontSize: 13,
    fontWeight: "400",
    color: "#9CA3AF",
    marginTop: 6,
  },
  buttonPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
});