import { AppText as Text } from "@/src/components/AppText";
import { LoginLegalNotice } from "@/src/components/LoginLegalNotice";
import { posthog } from "@/src/config/posthog";
import { useAuth } from "@/src/contexts/AuthContext";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { ArrowLeft } from "lucide-react-native";
import React, { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

const VALID_EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export default function LoginExistingScreen() {
  const { t } = useTranslation();
  const { signInWithEmail } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  // Local submit state: the global auth isLoading also flips on unrelated auth
  // activity, which would disable this form for reasons the user can't see.
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    posthog.capture("login_existing_view");
  }, []);

  const handleSubmit = useCallback(async () => {
    if (isSubmitting) return;

    const normalized = email.trim().toLowerCase();
    if (!VALID_EMAIL.test(normalized)) {
      setError(t("login_existing.email_invalid"));
      return;
    }
    if (!password) {
      // Reachable from the keyboard "done" action, which bypasses canSubmit.
      setError(t("login_existing.password_required"));
      return;
    }

    setError("");
    setIsSubmitting(true);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await signInWithEmail(normalized, password);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      posthog.capture("login_existing_submitted");
      // Navigation after success is owned by the root layout guard.
    } catch (err: any) {
      // Supabase throws raw English messages ("Invalid login credentials").
      // Showing them verbatim leaks an untranslated string into the UI.
      setError(
        err?.message === "Invalid login credentials"
          ? t("login_existing.invalid_credentials")
          : t("auth.sign_in_error_message"),
      );
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsSubmitting(false);
    }
  }, [email, isSubmitting, password, signInWithEmail, t]);

  const canSubmit =
    !isSubmitting && email.trim().length > 0 && password.length > 0;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <SafeAreaView style={styles.safeArea}>
        <Pressable
          testID="loginExistingBack"
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
          <Text style={styles.title}>{t("login_existing.title")}</Text>
          <Text style={styles.subtitle}>{t("login_existing.subtitle")}</Text>
        </Animated.View>

        <Animated.View
          entering={FadeInDown.duration(600).delay(400)}
          style={styles.formSection}
        >
          <TextInput
            testID="loginExistingEmail"
            accessibilityLabel={t("auth.email_placeholder")}
            style={styles.input}
            value={email}
            onChangeText={(value) => {
              setEmail(value);
              if (error) setError("");
            }}
            placeholder={t("auth.email_placeholder")}
            placeholderTextColor="rgba(0,0,0,0.3)"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            keyboardType="email-address"
            textContentType="emailAddress"
            returnKeyType="next"
            editable={!isSubmitting}
          />

          <TextInput
            testID="loginExistingPassword"
            accessibilityLabel={t("auth.password_placeholder")}
            style={styles.input}
            value={password}
            onChangeText={(value) => {
              setPassword(value);
              if (error) setError("");
            }}
            placeholder={t("auth.password_placeholder")}
            placeholderTextColor="rgba(0,0,0,0.3)"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="password"
            textContentType="password"
            secureTextEntry
            returnKeyType="done"
            onSubmitEditing={handleSubmit}
            editable={!isSubmitting}
          />

          {error ? (
            <Text style={styles.errorText} accessibilityLiveRegion="polite">
              {error}
            </Text>
          ) : null}

          <Pressable
            testID="loginExistingSubmit"
            accessibilityRole="button"
            accessibilityLabel={t("login_existing.submit")}
            style={[
              styles.submitButton,
              !canSubmit && styles.submitButtonDisabled,
            ]}
            onPress={handleSubmit}
            disabled={!canSubmit}
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.submitButtonText}>
                {t("login_existing.submit")}
              </Text>
            )}
          </Pressable>

          {/* Escape hatch: accounts created with Google / Apple / OTP have no
              password, so this form alone would strand them. */}
          <Pressable
            testID="loginExistingAltSignIn"
            accessibilityRole="button"
            accessibilityLabel={t("login_existing.alt_signin")}
            accessibilityHint={t("login_existing.alt_signin_hint")}
            style={({ pressed }) => [
              styles.altSignInRow,
              pressed && styles.altSignInPressed,
            ]}
            onPress={() => router.push("/login-social")}
            disabled={isSubmitting}
          >
            <Text style={styles.altSignInText}>
              {t("login_existing.alt_signin")}
            </Text>
          </Pressable>

          <LoginLegalNotice />
        </Animated.View>
      </SafeAreaView>
    </KeyboardAvoidingView>
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
  formSection: {
    gap: 12,
    paddingBottom: 8,
  },
  input: {
    height: 52,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: "rgba(0,0,0,0.1)",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    fontSize: 16,
    color: "#1A1C20",
  },
  errorText: {
    fontSize: 13,
    color: "#DC2626",
    marginTop: -4,
  },
  submitButton: {
    height: 52,
    borderRadius: 16,
    backgroundColor: "#1A1C20",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  submitButtonDisabled: {
    opacity: 0.4,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  altSignInRow: {
    alignItems: "center",
    paddingVertical: 12,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.15)",
    marginTop: 2,
  },
  altSignInPressed: {
    opacity: 0.7,
  },
  altSignInText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1A1C20",
  },
});