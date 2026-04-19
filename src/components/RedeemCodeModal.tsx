import { colors } from "@/constants/theme";
import { useAchievementsStore } from "@/src/store/achievementsStore";
import * as Haptics from "expo-haptics";
import { Gift, X } from "lucide-react-native";
import React, { useState } from "react";
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

interface RedeemCodeModalProps {
  visible: boolean;
  onClose: () => void;
}

export function RedeemCodeModal({ visible, onClose }: RedeemCodeModalProps) {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [phase, setPhase] = useState<"input" | "success" | "error">("input");
  const [errorMessage, setErrorMessage] = useState("");
  const [rewardCoins, setRewardCoins] = useState(0);

  const { redeemPromoCode } = useAchievementsStore();

  const handleRedeem = async () => {
    if (!code.trim() || loading) return;

    setLoading(true);
    const result = await redeemPromoCode(code.trim());
    setLoading(false);

    if (result.success) {
      setRewardCoins(result.coinsAwarded ?? 0);
      setPhase("success");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      setErrorMessage(result.error ?? "No se pudo canjear el código.");
      setPhase("error");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  const handleClose = () => {
    setCode("");
    setPhase("input");
    setErrorMessage("");
    onClose();
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
              <Gift size={20} color={colors.primary} strokeWidth={2} />
              <Text style={styles.title}>Canjear código</Text>
            </View>
            <Pressable
              onPress={handleClose}
              hitSlop={8}
              style={styles.closeBtn}
            >
              <X size={18} color={colors.textSecondary} />
            </Pressable>
          </View>

          {phase === "success" ? (
            <View style={styles.successContainer}>
              <Text style={styles.successEmoji}>🎉</Text>
              <Text style={styles.successTitle}>¡Código canjeado!</Text>
              <Text style={styles.successSubtitle}>
                +{rewardCoins} coronas añadidas a tu cuenta
              </Text>
              <Pressable style={styles.doneButton} onPress={handleClose}>
                <Text style={styles.doneButtonText}>¡Genial!</Text>
              </Pressable>
            </View>
          ) : (
            <>
              <Text style={styles.subtitle}>
                Ingresa tu código promocional para recibir coronas.
              </Text>

              <TextInput
                style={styles.input}
                value={code}
                onChangeText={(t) => {
                  setCode(t.toUpperCase());
                  if (phase === "error") setPhase("input");
                }}
                placeholder="CODIGO123"
                placeholderTextColor="rgba(255,255,255,0.25)"
                autoCapitalize="characters"
                autoCorrect={false}
                autoComplete="off"
                maxLength={30}
                returnKeyType="done"
                onSubmitEditing={handleRedeem}
              />

              {phase === "error" && (
                <Text style={styles.errorText}>{errorMessage}</Text>
              )}

              <Pressable
                style={[
                  styles.redeemButton,
                  (!code.trim() || loading) && styles.redeemButtonDisabled,
                ]}
                onPress={handleRedeem}
                disabled={!code.trim() || loading}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#1A1C20" />
                ) : (
                  <Text style={styles.redeemButtonText}>Canjear</Text>
                )}
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

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
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

  // Subtitle
  subtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 16,
    lineHeight: 18,
  },

  // Input
  input: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "rgba(255,255,255,0.05)",
    paddingHorizontal: 16,
    fontSize: 16,
    fontWeight: "700",
    color: colors.textPrimary,
    letterSpacing: 2,
    marginBottom: 8,
  },

  // Error
  errorText: {
    fontSize: 12,
    color: "#F87171",
    marginBottom: 12,
    marginTop: 4,
  },

  // Redeem button
  redeemButton: {
    height: 48,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  redeemButtonDisabled: {
    opacity: 0.4,
  },
  redeemButtonText: {
    fontSize: 16,
    fontWeight: "800",
    color: "#1A1C20",
  },

  // Success state
  successContainer: {
    alignItems: "center",
    paddingVertical: 12,
    gap: 8,
  },
  successEmoji: {
    fontSize: 48,
  },
  successTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: colors.textPrimary,
    marginTop: 4,
  },
  successSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: "center",
  },
  doneButton: {
    marginTop: 16,
    height: 48,
    width: "100%",
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  doneButtonText: {
    fontSize: 16,
    fontWeight: "800",
    color: "#1A1C20",
  },
});
