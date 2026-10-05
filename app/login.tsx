import { colors } from "@/constants/theme";
import { AppText as Text } from "@/src/components/AppText";
import { LoginLegalNotice } from "@/src/components/LoginLegalNotice";
import { posthog } from "@/src/config/posthog";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Image, Pressable, StyleSheet, View } from "react-native";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

export default function LoginScreen() {
  const { t } = useTranslation();
  const router = useRouter();

  useEffect(() => {
    posthog.capture("login_view");
  }, []);

  const handleStart = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push("/login-options");
  }, [router]);

  const handleExistingAccount = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push("/login-social");
  }, [router]);

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <Animated.View
          entering={FadeInUp.duration(600).delay(200)}
          style={styles.heroSection}
        >
          <Image
            source={require("../assets/images/logomain.png")}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.title}>{t("login.title")}</Text>
        </Animated.View>

        <Animated.View
          entering={FadeInDown.duration(600).delay(400)}
          style={styles.buttonsSection}
        >
          <Pressable
            testID="loginStart"
            accessibilityRole="button"
            accessibilityLabel={t("login.start")}
            style={({ pressed }) => [
              styles.primaryButton,
              pressed && styles.buttonPressed,
            ]}
            onPress={handleStart}
          >
            <Text style={styles.primaryButtonText}>{t("login.start")}</Text>
          </Pressable>

          <Pressable
            testID="loginHaveAccount"
            accessibilityRole="button"
            accessibilityLabel={t("login.have_account")}
            style={({ pressed }) => [
              styles.secondaryButton,
              pressed && styles.buttonPressed,
            ]}
            onPress={handleExistingAccount}
          >
            <Text style={styles.secondaryButtonText}>
              {t("login.have_account")}
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
    justifyContent: "space-between",
    paddingHorizontal: 28,
    paddingBottom: 24,
  },
  heroSection: {
    flex: 1,
    alignItems: "flex-start",
    justifyContent: "flex-end",
    gap: 8,
  },
  logo: {
    width: 180,
    height: 180,
    marginBottom: 4,
  },
  title: {
    fontSize: 42,
    fontWeight: "900",
    color: colors.background,
    letterSpacing: -1.5,
    paddingBottom: 42,
  },
  buttonsSection: {
    gap: 12,
    paddingBottom: 8,
  },
  primaryButton: {
    height: 52,
    borderRadius: 26,
    backgroundColor: "#1A1C20",
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  secondaryButton: {
    height: 52,
    borderRadius: 26,
    backgroundColor: "transparent",
    borderWidth: 1.5,
    borderColor: "#1A1C20",
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1A1C20",
  },
  buttonPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
});