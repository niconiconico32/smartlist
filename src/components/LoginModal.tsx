import { colors } from "@/constants/theme";
import { useAuth } from "@/src/contexts/AuthContext";
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

type Mode = "login" | "signup";

export function LoginModal({ visible, onClose }: LoginModalProps) {
  const { t } = useTranslation();
  const { signInWithEmail, signUpWithEmail } = useAuth();

  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const reset = () => {
    setMode("login");
    setEmail("");
    setPassword("");
    setConfirmPassword("");
    setLoading(false);
    setError("");
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleLogin = async () => {
    if (!email.trim() || !password) return;

    setError("");
    setLoading(true);
    try {
      await signInWithEmail(email.trim().toLowerCase(), password);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      handleClose();
    } catch (err: any) {
      setError(err.message || t("auth.sign_in_error_message"));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async () => {
    if (!email.trim() || !password) return;

    if (password !== confirmPassword) {
      setError(t("auth.passwords_do_not_match"));
      return;
    }
    if (password.length < 6) {
      setError(t("auth.password_too_short"));
      return;
    }

    setError("");
    setLoading(true);
    try {
      await signUpWithEmail(email.trim().toLowerCase(), password);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      handleClose();
    } catch (err: any) {
      setError(err.message || t("auth.sign_up_error_message"));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
    }
  };

  const switchMode = () => {
    setMode(mode === "login" ? "signup" : "login");
    setError("");
  };

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
              {mode === "login" ? (
                <LogIn size={20} color={colors.primary} strokeWidth={2} />
              ) : (
                <UserPlus size={20} color={colors.primary} strokeWidth={2} />
              )}
              <Text style={styles.title}>
                {mode === "login"
                  ? t("auth.email_login_title")
                  : t("auth.email_signup_title")}
              </Text>
            </View>
            <Pressable
              onPress={handleClose}
              hitSlop={8}
              style={styles.closeBtn}
            >
              <X size={18} color={colors.textSecondary} />
            </Pressable>
          </View>

          <Text style={styles.subtitle}>
            {mode === "login"
              ? t("auth.email_login_subtitle")
              : t("auth.email_signup_subtitle")}
          </Text>

          {/* Email */}
          <TextInput
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
            returnKeyType="next"
            editable={!loading}
          />

          {/* Password */}
          <TextInput
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
            autoComplete={mode === "signup" ? "new-password" : "password"}
            textContentType={mode === "signup" ? "newPassword" : "password"}
            secureTextEntry
            returnKeyType={mode === "signup" ? "next" : "done"}
            onSubmitEditing={mode === "signup" ? undefined : handleLogin}
            editable={!loading}
          />

          {/* Confirm Password (signup only) */}
          {mode === "signup" && (
            <TextInput
              style={styles.input}
              value={confirmPassword}
              onChangeText={(t_) => {
                setConfirmPassword(t_);
                if (error) setError("");
              }}
              placeholder={t("auth.confirm_password_placeholder")}
              placeholderTextColor="rgba(255,255,255,0.25)"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="new-password"
              textContentType="newPassword"
              secureTextEntry
              returnKeyType="done"
              onSubmitEditing={handleSignUp}
              editable={!loading}
            />
          )}

          {/* Error */}
          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          {/* Submit button */}
          <Pressable
            style={[
              styles.submitButton,
              (!email.trim() || !password || loading) &&
                styles.submitButtonDisabled,
            ]}
            onPress={mode === "login" ? handleLogin : handleSignUp}
            disabled={!email.trim() || !password || loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#1A1C20" />
            ) : (
              <Text style={styles.submitButtonText}>
                {mode === "login"
                  ? t("auth.email_login_button")
                  : t("auth.email_signup_button")}
              </Text>
            )}
          </Pressable>

          {/* Switch mode */}
          <Pressable onPress={switchMode} style={styles.switchRow}>
            <Text style={styles.switchText}>
              {mode === "login"
                ? t("auth.no_account")
                : t("auth.has_account")}
            </Text>
            <Text style={styles.switchLink}>
              {mode === "login"
                ? t("auth.sign_up_link")
                : t("auth.log_in_link")}
            </Text>
          </Pressable>
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
  switchRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 4,
    marginTop: 16,
    paddingVertical: 4,
  },
  switchText: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  switchLink: {
    fontSize: 13,
    color: colors.primary,
    fontWeight: "700",
    textDecorationLine: "underline",
  },
});
