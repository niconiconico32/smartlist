import { colors } from "@/constants/theme";
import { AppText as Text } from "@/src/components/AppText";
import { posthog } from "@/src/config/posthog";
import { useAuth } from "@/src/contexts/AuthContext";
import { useOnboardingStore } from "@/src/store/onboardingStore";
import Constants from "expo-constants";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { ArrowLeft } from "lucide-react-native";
import React, { useCallback } from "react";
import {
    ActivityIndicator,
    Dimensions,
    Image,
    Platform,
    Pressable,
    StyleSheet,
    View,
} from "react-native";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
// GoogleSigninButton requires native modules — not available in Expo Go
const isExpoGo = Constants.appOwnership === "expo";
let GoogleSigninButton: any = null;
if (!isExpoGo) {
  GoogleSigninButton =
    require("@react-native-google-signin/google-signin").GoogleSigninButton;
}

const { width: SCREEN_WIDTH } = Dimensions.get("window");

export default function LoginScreen() {
  const {
    signInWithOAuth,
    signInWithApple,
    signInAnonymously,
    isLoading,
    isAnonymous,
    session,
  } = useAuth();
  const router = useRouter();

  // If user is already anonymous, they're here to upgrade — not to start fresh
  const isUpgrading = !!session && isAnonymous;

  const handleGoogleSignIn = useCallback(async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await signInWithOAuth("google");
  }, [signInWithOAuth]);

  const handleAppleSignIn = useCallback(async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await signInWithApple();
  }, [signInWithApple]);

  const handleSkip = useCallback(async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await signInAnonymously();
    posthog.capture("user_signed_in_anonymously");
    await useOnboardingStore.getState().completeOnboarding();
    router.replace("/(tabs)");
  }, [signInAnonymously, router]);

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        {/* ── Back button (when upgrading) ─────────────────────── */}
        {isUpgrading && (
          <Pressable style={styles.backButton} onPress={() => router.back()}>
            <ArrowLeft size={24} color={colors.textPrimary} />
          </Pressable>
        )}

        {/* ── Hero ─────────────────────────────────────────────── */}
        <Animated.View
          entering={FadeInUp.duration(600).delay(200)}
          style={styles.heroSection}
        >
          <Image
            source={require("../assets/images/logomain.png")}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.title}>Brainy</Text>
          <Text style={styles.subtitle}>
            {isUpgrading
              ? `Conecta tu cuenta para guardar\ntu progreso de forma segura`
              : `Tu compañero diario para\nvencer la parálisis por análisis`}
          </Text>
        </Animated.View>

        {/* ── Buttons ──────────────────────────────────────────── */}
        <Animated.View
          entering={FadeInDown.duration(600).delay(400)}
          style={styles.buttonsSection}
        >
          {/* Google */}
          <View style={styles.googleButtonWrapper}>
            {GoogleSigninButton ? (
              <GoogleSigninButton
                size={GoogleSigninButton.Size.Wide}
                color={GoogleSigninButton.Color.Light}
                onPress={handleGoogleSignIn}
                disabled={isLoading}
                style={styles.googleNativeButton}
              />
            ) : (
              <Pressable
                onPress={handleGoogleSignIn}
                disabled={isLoading}
                style={({ pressed }) => [
                  styles.googleFallbackButton,
                  pressed && styles.googleFallbackButtonPressed,
                ]}
                accessibilityRole="button"
                accessibilityLabel="Continuar con Google"
              >
                <Text style={styles.googleFallbackLabel}>Continuar con Google</Text>
              </Pressable>
            )}
          </View>

          {/* Apple — only on iOS (HIG-compliant) */}
          {Platform.OS === "ios" && (
            <Pressable
              style={({ pressed }) => [
                styles.appleSignInButton,
                pressed && styles.appleSignInButtonPressed,
              ]}
              onPress={handleAppleSignIn}
              disabled={isLoading}
              accessibilityRole="button"
              accessibilityLabel="Sign in with Apple"
            >
              <Text style={styles.appleSignInIcon}></Text>
              <Text style={styles.appleSignInLabel}>Sign in with Apple</Text>
            </Pressable>
          )}

          {/* Divider */}
          {!isUpgrading && (
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>o</Text>
              <View style={styles.dividerLine} />
            </View>
          )}

          {/* Skip (anonymous) o Volver a la app si ya es anónimo */}
          {!isUpgrading ? (
            <Pressable
              style={({ pressed }) => [
                styles.skipButton,
                pressed && styles.buttonPressed,
              ]}
              onPress={handleSkip}
              disabled={isLoading}
            >
              <LinearGradient
                colors={["#ECF230", "#F2E852"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.skipButtonGradient}
              >
                {isLoading ? (
                  <ActivityIndicator color={colors.background} />
                ) : (
                  <Text style={styles.skipButtonText}>Empezar sin cuenta</Text>
                )}
              </LinearGradient>
            </Pressable>
          ) : (
            <Pressable
              style={({ pressed }) => [
                styles.skipButton,
                pressed && styles.buttonPressed,
              ]}
              onPress={() => router.replace("/(tabs)")}
              disabled={isLoading}
            >
              <LinearGradient
                colors={["#ECF230", "#F2E852"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.skipButtonGradient}
              >
                <Text style={styles.skipButtonText}>Volver a la app</Text>
              </LinearGradient>
            </Pressable>
          )}

          {/* Extra back button for testing removed for production */}

          <Text style={styles.disclaimer}>
            Al continuar, aceptas nuestros Términos de Servicio{"\n"}y Política
            de Privacidad.
          </Text>
        </Animated.View>
      </SafeAreaView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  safeArea: {
    flex: 1,
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
  backButton: {
    position: "absolute",
    top: 60,
    left: 24,
    zIndex: 10,
    padding: 8,
  },

  // Hero
  heroSection: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  logo: {
    width: 120,
    height: 120,
    marginBottom: 8,
  },
  title: {
    fontSize: 36,
    fontWeight: "900",
    color: colors.textPrimary,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: "500",
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 24,
    opacity: 0.8,
  },

  // Buttons
  buttonsSection: {
    gap: 12,
    paddingBottom: 8,
  },
  googleButtonWrapper: {
    height: 52,
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  googleNativeButton: {
    width: "100%",
    height: 48,
  },
  googleFallbackButton: {
    width: "100%",
    height: 48,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#DADCE0",
  },
  googleFallbackButtonPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.99 }],
  },
  googleFallbackLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F1F1F",
    letterSpacing: 0.1,
  },

  // ── Apple Sign In (HIG-compliant) ──────────────────────────────────────
  appleSignInButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 50,
    borderRadius: 12,
    backgroundColor: "#000000",
    gap: 8,
  },
  appleSignInButtonPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  appleSignInIcon: {
    fontSize: 18,
    color: "#FFFFFF",
    marginTop: -2, // optical alignment for the Apple glyph
  },
  appleSignInLabel: {
    fontSize: 19,
    fontWeight: "600",
    color: "#FFFFFF",
    letterSpacing: 0.1,
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
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  dividerText: {
    fontSize: 13,
    fontWeight: "500",
    color: colors.textSecondary,
    opacity: 0.6,
  },

  // Skip
  skipButton: {
    borderRadius: 28,
    overflow: "hidden",
  },
  skipButtonGradient: {
    height: 56,
    alignItems: "center",
    justifyContent: "center",
  },
  skipButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.background,
  },

  // Disclaimer
  disclaimer: {
    fontSize: 11,
    fontWeight: "400",
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 16,
    opacity: 0.5,
    marginTop: 4,
  },
});
