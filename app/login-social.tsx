import { colors } from "@/constants/theme";
import { AppText as Text } from "@/src/components/AppText";
import { GoogleButton } from "@/src/components/GoogleButton";
import { LoginLegalNotice } from "@/src/components/LoginLegalNotice";
import { posthog } from "@/src/config/posthog";
import { useAuth } from "@/src/contexts/AuthContext";
import * as AppleAuthentication from "expo-apple-authentication";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { ArrowLeft } from "lucide-react-native";
import React, { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Image,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

const BUTTON_HEIGHT = 52;
const BUTTON_RADIUS = BUTTON_HEIGHT / 2;

export default function LoginSocialScreen() {
  const { t } = useTranslation();
  const {
    signInWithOAuth,
    signInWithApple,
    isLoading,
    isAnonymous,
    session,
  } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const isUpgrading = !!session && isAnonymous;

  useEffect(() => {
    posthog.capture("login_social_view");
  }, []);

  const [appleAvailable, setAppleAvailable] = useState(false);
  useEffect(() => {
    if (Platform.OS === "ios") {
      AppleAuthentication.isAvailableAsync().then(setAppleAvailable);
    }
  }, []);

  const handleBack = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/login");
    }
  }, [router]);

  const handleGoogleSignIn = useCallback(async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await signInWithOAuth("google");
  }, [signInWithOAuth]);

  const handleAppleSignIn = useCallback(async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await signInWithApple();
  }, [signInWithApple]);

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <Pressable
          testID="loginSocialBack"
          accessibilityRole="button"
          accessibilityLabel={t("common.back")}
          style={[styles.backButton, { top: insets.top + 8 }]}
          onPress={handleBack}
        >
          <ArrowLeft size={24} color="#1A1C20" />
        </Pressable>

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
          {Platform.OS === "ios" && appleAvailable && (
            <AppleAuthentication.AppleAuthenticationButton
              buttonType={
                AppleAuthentication.AppleAuthenticationButtonType.CONTINUE
              }
              buttonStyle={
                AppleAuthentication.AppleAuthenticationButtonStyle.BLACK
              }
              cornerRadius={BUTTON_RADIUS}
              style={styles.appleButton}
              onPress={handleAppleSignIn}
            />
          )}

          <GoogleButton
            text={t("login.continue_with_google")}
            onPress={handleGoogleSignIn}
            disabled={isLoading}
            theme="light"
            style={styles.googleButton}
          />

          {!isUpgrading && (
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>{t("login.or")}</Text>
              <View style={styles.dividerLine} />
            </View>
          )}

          {!isUpgrading ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t("login.email_login")}
              onPress={() => {
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push("/login-existing");
              }}
              testID="loginEmailOpen"
              style={styles.emailLoginRow}
            >
              <Text style={styles.emailLoginLink}>
                {t("login.email_login")}
              </Text>
            </Pressable>
          ) : (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t("login.back_to_app")}
              style={({ pressed }) => [
                styles.skipButton,
                pressed && styles.buttonPressed,
              ]}
              onPress={() => router.replace("/(tabs)")}
              disabled={isLoading}
            >
              <View style={styles.skipButtonGradient}>
                <Text style={styles.skipButtonText}>
                  {t("login.back_to_app")}
                </Text>
              </View>
            </Pressable>
          )}

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
  backButton: {
    position: "absolute",
    left: 24,
    zIndex: 10,
    padding: 8,
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
  appleButton: {
    width: "100%",
    height: BUTTON_HEIGHT,
  },
  googleButton: {
    width: "100%",
    height: BUTTON_HEIGHT,
    borderRadius: BUTTON_RADIUS,
  },
  buttonPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginVertical: 4,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "rgba(0,0,0,0.1)",
  },
  dividerText: {
    fontSize: 13,
    fontWeight: "500",
    color: "#6B7280",
  },
  skipButton: {
    borderRadius: 28,
    overflow: "hidden",
    borderWidth: 1.5,
    borderColor: "rgba(0,0,0,0.1)",
  },
  skipButtonGradient: {
    height: 56,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ECF0ED",
  },
  skipButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1A1C20",
  },
  emailLoginRow: {
    alignItems: "center",
    paddingVertical: 10,
    backgroundColor: "rgba(0,0,0,0.04)",
    borderRadius: 28,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.1)",
  },
  emailLoginLink: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1A1C20",
  },
});