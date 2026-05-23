import { AppText as Text } from "@/src/components/AppText";
import { GoogleButton } from "@/src/components/GoogleButton";
import { useAuth } from "@/src/contexts/AuthContext";
import * as AppleAuthentication from "expo-apple-authentication";
import * as Haptics from "expo-haptics";
import React, { useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Image,
  Linking,
  Platform,
  Pressable,
  Text as RNText,
  StyleSheet,
  View,
} from "react-native";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

const BUTTON_HEIGHT = 52;
const BUTTON_RADIUS = BUTTON_HEIGHT / 2;

interface Props {
  onNext: () => void;
}

const WelcomeSlide: React.FC<Props> = ({ onNext }) => {
  const { t } = useTranslation();
  const {
    signInWithOAuth,
    signInWithApple,
    signInAnonymously,
    session,
    isLoading,
  } = useAuth();

  useEffect(() => {
    if (session) {
      onNext();
    }
  }, [session, onNext]);

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        {/* ── Hero ─────────────────────────────────────────────── */}
        <Animated.View
          entering={FadeInUp.duration(600).delay(200)}
          style={styles.heroSection}
        >
          <Image
            source={require("@/assets/images/logomain.png")}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.title}>{t("onboarding.welcome_header")}</Text>
        </Animated.View>

        {/* ── Buttons ──────────────────────────────────────────── */}
        <Animated.View
          entering={FadeInDown.duration(600).delay(400)}
          style={styles.buttonsSection}
        >
          {/* Apple — iOS only. System-provided native button (HIG-compliant).
              BLACK style on light background per Apple guidelines. */}
          {Platform.OS === "ios" && (
            <AppleAuthentication.AppleAuthenticationButton
              buttonType={
                AppleAuthentication.AppleAuthenticationButtonType.CONTINUE
              }
              buttonStyle={
                AppleAuthentication.AppleAuthenticationButtonStyle.BLACK
              }
              cornerRadius={BUTTON_RADIUS}
              style={styles.appleButton}
              onPress={async () => {
                await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                await signInWithApple();
              }}
            />
          )}

          {/* Google — custom button matching Apple's dimensions */}
          <GoogleButton
            text={t("login.continue_with_google")}
            onPress={async () => {
              await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              await signInWithOAuth("google");
            }}
            disabled={isLoading}
            theme="light"
            style={styles.googleButton}
          />

          {/* Divider */}
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>{t("login.or")}</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Guest / Continue without account */}
          <Pressable
            style={({ pressed }) => [
              styles.skipButton,
              pressed && styles.buttonPressed,
            ]}
            onPress={async () => {
              await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              await signInAnonymously();
            }}
            disabled={isLoading}
          >
            <View style={styles.skipButtonInner}>
              {isLoading ? (
                <ActivityIndicator color="#1A1C20" />
              ) : (
                <Text style={styles.skipButtonText}>
                  {t("onboarding.continue_as_guest")}
                </Text>
              )}
            </View>
          </Pressable>

          {/* Disclaimer */}
          <RNText style={styles.disclaimer}>
            {"By continuing, you agree to our "}
            <RNText
              style={[styles.disclaimer, styles.link]}
              onPress={() =>
                Linking.openURL("https://brainyadhd.com/terms.html")
              }
              accessibilityRole="link"
            >
              {"Terms of Service"}
            </RNText>
            {" and "}
            <RNText
              style={[styles.disclaimer, styles.link]}
              onPress={() =>
                Linking.openURL("https://brainyadhd.com/privacy.html")
              }
              accessibilityRole="link"
            >
              {"Privacy Policy"}
            </RNText>
            {"."}
          </RNText>
        </Animated.View>
      </SafeAreaView>
    </View>
  );
};

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

  // Hero
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
    color: "#1A1C20",
    letterSpacing: -1.5,
    paddingBottom: 42,
  },

  // Buttons
  buttonsSection: {
    gap: 12,
    paddingBottom: 8,
  },

  // Apple Sign In — native system button (HIG: BLACK on light bg)
  appleButton: {
    width: "100%",
    height: BUTTON_HEIGHT,
  },

  // Google — matches Apple button dimensions exactly
  googleButton: {
    width: "100%",
    height: BUTTON_HEIGHT,
    borderRadius: BUTTON_RADIUS,
  },

  buttonPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },

  // Divider
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

  // Skip / Guest
  skipButton: {
    borderRadius: 28,
    overflow: "hidden",
    borderWidth: 1.5,
    borderColor: "rgba(0,0,0,0.1)",
  },
  skipButtonInner: {
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

  // Disclaimer
  disclaimer: {
    fontSize: 11,
    fontWeight: "400",
    color: "rgba(0,0,0,0.4)",
    textAlign: "center",
    lineHeight: 16,
    marginTop: 4,
  },
  link: {
    color: "#1A1C20",
    textDecorationLine: "underline",
    fontWeight: "500",
  },
});

export default WelcomeSlide;
