import { colors } from "@/constants/theme";
import { useAuth } from "@/src/contexts/AuthContext";
import { posthog } from "@/src/config/posthog";
import * as Haptics from "expo-haptics";
import { LogIn, UserPlus, X } from "lucide-react-native";
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { AppText as Text } from "./AppText";

interface LoginModalProps {
  visible: boolean;
  onClose: () => void;
}

type Step = "otp_email" | "otp_code" | "password" | "forgot_password";

const VALID_EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export function maskEmail(email: string): string {
  const at = email.indexOf("@");
  if (at <= 0) return email;
  const local = email.slice(0, at);
  const domain = email.slice(at);
  const head = local.slice(0, Math.min(2, local.length));
  return `${head}***${domain}`;
}

/**
 * Single email login: OTP-first (signInWithOtp auto-creates the account, so
 * there is no separate "create account with password" form). Works identically
 * for funnel buyers and organic users — both enter with the same flow and the
 * plan is discovered automatically AFTER authentication (no claim banner).
 */
export function LoginModal({ visible, onClose }: LoginModalProps) {
  const { t } = useTranslation();
  const { signInWithEmail, sendOtp, verifyOtp, resetPasswordForEmail } = useAuth();

  const [step, setStep] = useState<Step>("otp_email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [passwordResetSent, setPasswordResetSent] = useState(false);

  const reset = () => {
    setStep("otp_email");
    setEmail("");
    setOtp("");
    setPassword("");
    setLoading(false);
    setError("");
    setPasswordResetSent(false);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSendCode = async () => {
    const normalized = email.trim().toLowerCase();
    if (!normalized || !VALID_EMAIL.test(normalized)) {
      setError(t("auth.email_invalid"));
      return;
    }

    setError("");
    setLoading(true);
    try {
      await sendOtp(normalized);
      posthog.capture("auth_otp_sent");
      setOtp("");
      setStep("otp_code");
    } catch (err: any) {
      setError(err.message || t("auth.otp_send_error"));
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!otp.trim()) return;
    const normalized = email.trim().toLowerCase();

    setError("");
    setLoading(true);
    try {
      await verifyOtp(normalized, otp.trim());
      posthog.capture("auth_otp_verified");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      handleClose();
    } catch (err: any) {
      setError(err.message || t("auth.otp_invalid"));
      setOtp("");
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordLogin = async () => {
    const normalized = email.trim().toLowerCase();
    if (!normalized || !password) return;

    setError("");
    setLoading(true);
    try {
      await signInWithEmail(normalized, password);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      handleClose();
    } catch (err: any) {
      setError(err.message || t("auth.sign_in_error_message"));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
    }
  };

  const showPassword = () => {
    setStep("password");
    setError("");
  };

  const showOtpEmail = () => {
    setStep("otp_email");
    setOtp("");
    setError("");
  };

  const showOtpCode = () => {
    setStep("otp_code");
    setError("");
  };

  const showForgotPassword = () => {
    setStep("forgot_password");
    setError("");
  };

  const handleForgotPassword = async () => {
    const normalized = email.trim().toLowerCase();
    if (!normalized || !VALID_EMAIL.test(normalized)) {
      setError(t("auth.email_invalid"));
      return;
    }

    setError("");
    setLoading(true);
    try {
      await resetPasswordForEmail(normalized);
      posthog.capture("auth_password_reset_sent");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setError("");
      setPasswordResetSent(true);
    } catch (err: any) {
      setError(err.message || t("auth.password_reset_error"));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
    }
  };

  const useOtherEmail = () => {
    setOtp("");
    setError("");
    setStep("otp_email");
  };

  const title =
    step === "password"
      ? t("auth.email_login_title")
      : step === "forgot_password"
        ? t("auth.forgot_password_title")
        : step === "otp_code"
          ? t("auth.otp_title")
          : t("auth.email_otp_title");

  const subtitle =
    step === "password"
      ? t("auth.email_login_subtitle")
      : step === "forgot_password"
        ? t("auth.forgot_password_subtitle")
        : step === "otp_code"
          ? t("auth.otp_subtitle", { email: maskEmail(email.trim().toLowerCase()) })
          : t("auth.email_otp_subtitle");

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.overlay}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />

        <View style={styles.card}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.titleRow}>
              {step === "password" ? (
                <LogIn size={20} color={colors.primary} strokeWidth={2} />
              ) : (
                <UserPlus size={20} color={colors.primary} strokeWidth={2} />
              )}
              <Text style={styles.title}>{title}</Text>
            </View>
            <Pressable
              onPress={handleClose}
              hitSlop={8}
              style={styles.closeBtn}
            >
              <X size={18} color={colors.textSecondary} />
            </Pressable>
          </View>

          <Text style={styles.subtitle}>{subtitle}</Text>

          {/* Email — always visible, editable on first/other-email steps */}
          {step !== "otp_code" ? (
            <TextInput
              testID="loginEmailInput"
              style={styles.input}
              value={email}
              onChangeText={(t_) => {
                setEmail(t_);
                if (error) setError("");
              }}
              placeholder={t("auth.email_placeholder")}
              placeholderTextColor="rgba(255,255,255,0.25)"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
              keyboardType="email-address"
              textContentType="emailAddress"
              returnKeyType="done"
              editable={!loading}
            />
          ) : (
            <View style={styles.maskedRow}>
              <Text style={styles.maskedText}>{maskEmail(email)}</Text>
              <Pressable
                testID="loginUseOtherEmail"
                onPress={useOtherEmail}
                hitSlop={8}
              >
                <Text style={styles.linkBtn}>
                  {t("auth.use_other_email")}
                </Text>
              </Pressable>
            </View>
          )}

          {/* Password (optional secondary login for existing accounts) */}
          {step === "password" && (
            <TextInput
              testID="loginPasswordInput"
              style={styles.input}
              value={password}
              onChangeText={(t_) => {
                setPassword(t_);
                if (error) setError("");
              }}
              placeholder={t("auth.password_placeholder")}
              placeholderTextColor="rgba(255,255,255,0.25)"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="password"
              textContentType="password"
              secureTextEntry
              returnKeyType="done"
              onSubmitEditing={handlePasswordLogin}
              editable={!loading}
            />
          )}

          {/* OTP code input */}
          {step === "otp_code" && (
            <TextInput
              testID="loginOtpInput"
              style={styles.input}
              value={otp}
              onChangeText={(t_) => {
                setOtp(t_);
                if (error) setError("");
              }}
              placeholder={t("auth.code_placeholder")}
              placeholderTextColor="rgba(255,255,255,0.25)"
              keyboardType="number-pad"
              autoComplete="one-time-code"
              textContentType="oneTimeCode"
              returnKeyType="done"
              editable={!loading}
              maxLength={8}
            />
          )}

          {/* Error */}
          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          {/* Primary action */}
          {step !== "password" && (
            <Pressable
              testID={step === "otp_email" ? "loginOtpSend" : "loginOtpVerify"}
              style={[
                styles.submitButton,
                loading && styles.submitButtonDisabled,
              ]}
              onPress={step === "otp_email" ? handleSendCode : handleVerifyCode}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#1A1C20" />
              ) : (
                <Text style={styles.submitButtonText}>
                  {step === "otp_email"
                    ? t("auth.send_otp_button")
                    : t("auth.verify_otp_button")}
                </Text>
              )}
            </Pressable>
          )}

          {step === "password" && (
            <Pressable
              testID="loginSubmit"
              style={[
                styles.submitButton,
                (loading || !email.trim() || !password) && styles.submitButtonDisabled,
              ]}
              onPress={handlePasswordLogin}
              disabled={loading || !email.trim() || !password}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#1A1C20" />
              ) : (
                <Text style={styles.submitButtonText}>
                  {t("auth.email_login_button")}
                </Text>
              )}
            </Pressable>
          )}

          {/* Secondary actions per step */}
          {step === "otp_email" && (
            <View style={styles.otpFooter}>
              <Text style={styles.switchText}>{t("auth.otp_footer")}</Text>
              <Pressable testID="loginPasswordToggle" onPress={showPassword} hitSlop={8}>
                <Text style={styles.linkBtn}>{t("auth.use_password")}</Text>
              </Pressable>
            </View>
          )}

          {step === "otp_code" && (
            <>
              <View style={styles.otpFooter}>
                <Text style={styles.switchText}>{t("auth.otp_footer")}</Text>
                <Pressable testID="loginPasswordToggle" onPress={showPassword} hitSlop={8}>
                  <Text style={styles.linkBtn}>{t("auth.use_password")}</Text>
                </Pressable>
              </View>
              <Pressable testID="loginOtpResend" onPress={handleSendCode} hitSlop={8}>
                <Text style={[styles.linkBtn, styles.centerLink]}>
                  {t("auth.resend_code")}
                </Text>
              </Pressable>
            </>
          )}

          {step === "password" && (
            <>
              <Pressable
                testID="loginForgotPasswordLink"
                onPress={showForgotPassword}
                hitSlop={8}
                style={styles.otpFooter}
              >
                <Text style={styles.linkBtn}>{t("auth.forgot_password_link")}</Text>
              </Pressable>
              <Pressable
                testID="loginOtpToggle"
                onPress={showOtpEmail}
                hitSlop={8}
                style={styles.otpFooter}
              >
                <Text style={styles.linkBtn}>{t("auth.back_to_otp")}</Text>
              </Pressable>
            </>
          )}

          {step === "forgot_password" && !passwordResetSent && (
            <>
              <Pressable
                testID="loginForgotPasswordSubmit"
                style={[
                  styles.submitButton,
                  (loading || !email.trim()) && styles.submitButtonDisabled,
                ]}
                onPress={handleForgotPassword}
                disabled={loading || !email.trim()}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#1A1C20" />
                ) : (
                  <Text style={styles.submitButtonText}>
                    {t("auth.forgot_password_button")}
                  </Text>
                )}
              </Pressable>
              <Pressable
                testID="loginBackToLogin"
                onPress={showOtpEmail}
                hitSlop={8}
                style={styles.otpFooter}
              >
                <Text style={styles.linkBtn}>{t("auth.back_to_login")}</Text>
              </Pressable>
            </>
          )}

          {step === "forgot_password" && passwordResetSent && (
            <>
              <Text style={styles.successMessage}>
                {t("auth.password_reset_web_message")}
              </Text>
              <Pressable
                testID="loginBackToLoginFromSuccess"
                onPress={showOtpEmail}
                hitSlop={8}
                style={styles.otpFooter}
              >
                <Text style={styles.linkBtn}>{t("auth.back_to_login")}</Text>
              </Pressable>
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  card: {
    width: "100%",
    backgroundColor: "#16182A",
    borderRadius: 20,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 20,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  title: {
    fontSize: 17,
    fontWeight: "800",
    color: colors.textPrimary,
  },
  closeBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  subtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 16,
    lineHeight: 18,
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
    marginBottom: 10,
  },
  maskedRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    height: 48,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "rgba(255,255,255,0.05)",
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  maskedText: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  linkBtn: {
    fontSize: 13,
    color: colors.primary,
    fontWeight: "700",
    textDecorationLine: "underline",
    textAlign: "center",
  },
  centerLink: {
    alignSelf: "center",
    marginTop: 10,
  },
  errorText: {
    fontSize: 12,
    color: "#F87171",
    marginBottom: 8,
    marginTop: 2,
  },
  submitButton: {
    height: 48,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  submitButtonDisabled: {
    opacity: 0.4,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: "800",
    color: "#1A1C20",
  },
  otpFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: 16,
    paddingVertical: 4,
  },
  switchText: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  passwordResetWebMessage: {
    fontSize: 15,
    fontWeight: "500",
    color: colors.textPrimary,
    textAlign: "center",
    lineHeight: 22,
  },
  successMessage: {
    fontSize: 15,
    fontWeight: "500",
    color: colors.textPrimary,
    textAlign: "center",
    lineHeight: 22,
  },
});