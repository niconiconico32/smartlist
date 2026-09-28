import { colors } from "@/constants/theme";
import { AppText as Text } from "@/src/components/AppText";
import { useAuth } from "@/src/contexts/AuthContext";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
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
import { SafeAreaView } from "react-native-safe-area-context";

type Phase = "validating" | "form" | "success" | "error";

const MIN_PASSWORD_LENGTH = 6;

export default function ResetPasswordScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useLocalSearchParams<{
    token_hash?: string;
    code?: string;
    email?: string;
  }>();
  const { session, isLoading: authLoading, updateUserPassword, verifyRecoveryToken } = useAuth();

  const [phase, setPhase] = useState<Phase>("validating");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const startedRef = useRef(false);
  const tokenVerifiedRef = useRef(false);

  const tokenHash =
    typeof params.token_hash === "string" ? params.token_hash.trim() : "";
  const code = typeof params.code === "string" ? params.code.trim() : "";
  const email = typeof params.email === "string" ? params.email.trim() : "";

  const hasRecoveryParams = !!(tokenHash || code);

  const validate = useCallback((): string => {
    if (password.length < MIN_PASSWORD_LENGTH) {
      return t("auth.password_too_short");
    }
    if (password !== confirmPassword) {
      return t("auth.passwords_do_not_match");
    }
    return "";
  }, [password, confirmPassword, t]);

  const handleSubmit = useCallback(async () => {
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setError("");
    setLoading(true);

    try {
      const { error: updateError } = await updateUserPassword(password);
      if (updateError) throw updateError;

      setPhase("success");
    } catch (err: any) {
      setError(err.message || t("auth.password_reset_error"));
      setPhase("error");
    } finally {
      setLoading(false);
    }
  }, [validate, password, t]);

  useEffect(() => {
    if (authLoading || startedRef.current) return;
    startedRef.current = true;

    const establishSession = async () => {
      if (session?.user) {
        tokenVerifiedRef.current = true;
        setPhase("form");
        return;
      }

      if (!hasRecoveryParams) {
        setPhase("error");
        setError(t("auth.password_reset_error"));
        return;
      }

      const type = code ? "pkce" : "token_hash";
      const value = code || tokenHash;

      const { error: verifyError } = await verifyRecoveryToken(
        value,
        email || undefined,
        type,
      );

      if (verifyError) {
        setPhase("error");
        setError(verifyError.message || t("auth.password_reset_error"));
        return;
      }

      tokenVerifiedRef.current = true;
      setPhase("form");
    };

    establishSession().catch((err) => {
      setPhase("error");
      setError(err.message || t("auth.password_reset_error"));
    });
  }, [authLoading, session, hasRecoveryParams, code, tokenHash, email, t, verifyRecoveryToken]);

  const goToLogin = useCallback(() => {
    router.replace("/login");
  }, [router]);

  const goHome = useCallback(() => {
    router.replace("/(tabs)");
  }, [router]);

  if (phase === "validating") {
    return (
      <View style={styles.container}>
        <SafeAreaView style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.validatingText}>
            {t("auth.reset_password_validating")}
          </Text>
        </SafeAreaView>
      </View>
    );
  }

  if (phase === "success") {
    return (
      <View style={styles.container}>
        <SafeAreaView style={styles.center}>
          <Text style={styles.successTitle}>
            {t("auth.password_reset_success_title")}
          </Text>
          <Text style={styles.successMessage}>
            {t("auth.password_reset_success_message")}
          </Text>
          <Pressable
            testID="resetPasswordSuccessCta"
            style={({ pressed }) => [styles.cta, pressed && styles.ctaPressed]}
            onPress={goHome}
          >
            <Text style={styles.ctaText}>
              {t("auth.password_reset_continue_home")}
            </Text>
          </Pressable>
        </SafeAreaView>
      </View>
    );
  }

  if (phase === "error") {
    return (
      <View style={styles.container}>
        <SafeAreaView style={styles.center}>
          <Text style={styles.errorTitle}>
            {t("auth.password_reset_error_title")}
          </Text>
          <Text style={styles.errorMessage}>
            {error || t("auth.password_reset_error")}
          </Text>
          <Pressable
            testID="resetPasswordErrorCta"
            style={({ pressed }) => [styles.cta, pressed && styles.ctaPressed]}
            onPress={goToLogin}
          >
            <Text style={styles.ctaText}>
              {t("auth.back_to_login")}
            </Text>
          </Pressable>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.keyboardView}
        >
          <Text style={styles.title}>
            {t("auth.reset_password_title")}
          </Text>
          <Text style={styles.subtitle}>
            {t("auth.reset_password_subtitle")}
          </Text>

          <TextInput
            testID="resetPasswordInput"
            style={styles.input}
            value={password}
            onChangeText={(text) => {
              setPassword(text);
              if (error) setError("");
            }}
            placeholder={t("auth.new_password_placeholder")}
            placeholderTextColor="rgba(255,255,255,0.25)"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="new-password"
            textContentType="newPassword"
            secureTextEntry
            editable={!loading}
          />

          <TextInput
            testID="resetPasswordConfirmInput"
            style={styles.input}
            value={confirmPassword}
            onChangeText={(text) => {
              setConfirmPassword(text);
              if (error) setError("");
            }}
            placeholder={t("auth.confirm_password_placeholder")}
            placeholderTextColor="rgba(255,255,255,0.25)"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="new-password"
            textContentType="newPassword"
            secureTextEntry
            editable={!loading}
            onSubmitEditing={handleSubmit}
          />

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <Pressable
            testID="resetPasswordSubmit"
            style={[
              styles.cta,
              (loading || !password || !confirmPassword) && styles.ctaDisabled,
            ]}
            onPress={handleSubmit}
            disabled={loading || !password || !confirmPassword}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#1A1C20" />
            ) : (
              <Text style={styles.ctaText}>
                {t("auth.reset_password_button")}
              </Text>
            )}
          </Pressable>

          <Pressable
            testID="resetPasswordBackToLogin"
            onPress={goToLogin}
            style={styles.backLink}
          >
            <Text style={styles.backLinkText}>
              {t("auth.back_to_login")}
            </Text>
          </Pressable>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  safeArea: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28,
    gap: 12,
  },
  keyboardView: {
    gap: 16,
  },
  title: {
    fontSize: 26,
    fontWeight: "800",
    color: colors.textPrimary,
    letterSpacing: -0.5,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 15,
    fontWeight: "500",
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 8,
  },
  input: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "rgba(255,255,255,0.05)",
    paddingHorizontal: 16,
    fontSize: 15,
    color: colors.textPrimary,
  },
  errorText: {
    fontSize: 13,
    color: "#F87171",
    textAlign: "center",
  },
  cta: {
    height: 48,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  ctaDisabled: {
    opacity: 0.4,
  },
  ctaText: {
    fontSize: 16,
    fontWeight: "800",
    color: "#1A1C20",
  },
  ctaPressed: {
    opacity: 0.85,
  },
  backLink: {
    paddingVertical: 12,
    alignItems: "center",
  },
  backLinkText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.textSecondary,
    textDecorationLine: "underline",
  },
  successTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: colors.textPrimary,
    textAlign: "center",
    letterSpacing: -0.5,
  },
  successMessage: {
    fontSize: 15,
    fontWeight: "500",
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 22,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: colors.textPrimary,
    textAlign: "center",
    letterSpacing: -0.5,
  },
  errorMessage: {
    fontSize: 15,
    fontWeight: "500",
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 22,
  },
  validatingText: {
    fontSize: 15,
    fontWeight: "500",
    color: colors.textSecondary,
    textAlign: "center",
    marginTop: 16,
  },
});
