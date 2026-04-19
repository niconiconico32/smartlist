import { colors } from "@/constants/theme";
import { AppText as Text } from "@/src/components/AppText";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import * as Linking from "expo-linking";
import React from "react";
import { Image, Modal, Platform, Pressable, StyleSheet } from "react-native";

// Stores the streak count at which the review was last shown.
// Lets us re-ask every 5 days (day 5, 10, 15, 20...).
const REVIEW_LAST_STREAK_KEY = "@smartlist_review_last_streak";

const PLAY_STORE_URL =
  "https://play.google.com/store/apps/details?id=com.brainyahdh.app";
const APP_STORE_URL = "https://apps.apple.com/app/idXXXXXXXXXX"; // TODO: replace with real App Store ID

interface ReviewRequestModalProps {
  visible: boolean;
  streak: number;
  onClose: () => void;
}

export function ReviewRequestModal({
  visible,
  streak,
  onClose,
}: ReviewRequestModalProps) {
  const markShown = async () => {
    await AsyncStorage.setItem(REVIEW_LAST_STREAK_KEY, String(streak));
  };

  const handleReview = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    await markShown();
    const url = Platform.OS === "android" ? PLAY_STORE_URL : APP_STORE_URL;
    Linking.openURL(url);
    onClose();
  };

  const handleDismiss = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    await markShown();
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleDismiss}
    >
      <Pressable style={styles.overlay} onPress={handleDismiss}>
        <Pressable style={styles.card} onPress={(e) => e.stopPropagation()}>
          <Image
            source={require("@/assets/images/logomain.png")}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.title}>¿Disfrutando de Brainy?</Text>
          <Text style={styles.body}>
            Nuestro equipo ha dedicado cientos de horas para hacer de Brainy el
            mejor copiloto para tu cerebro. ¿Nos ayudas con una reseña? Solo
            toma 2 minutos.
          </Text>
          <Pressable style={styles.primaryButton} onPress={handleReview}>
            <Text style={styles.primaryButtonText}>Dejar reseña ⭐</Text>
          </Pressable>
          <Pressable style={styles.secondaryButton} onPress={handleDismiss}>
            <Text style={styles.secondaryButtonText}>Ahora no</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

/**
 * Returns true if the review modal should be shown.
 * Fires at streak multiples of 5 (5, 10, 15, 20...) and only once per milestone.
 */
export async function shouldAskForReview(streak: number): Promise<boolean> {
  if (streak < 5 || streak % 5 !== 0) return false;
  const stored = await AsyncStorage.getItem(REVIEW_LAST_STREAK_KEY);
  const lastStreak = stored ? parseInt(stored, 10) : 0;
  return lastStreak < streak;
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  card: {
    backgroundColor: colors.textRoutineCard,
    borderRadius: 24,
    paddingVertical: 28,
    paddingHorizontal: 24,
    width: "82%",
    alignItems: "center",
  },
  logo: {
    width: 132,
    height: 132,
    marginBottom: 12,
  },
  emoji: {
    fontSize: 44,
    marginBottom: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.background,
    marginBottom: 8,
    textAlign: "center",
  },
  body: {
    fontSize: 12,
    color: colors.surface,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 20,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 32,
    width: "100%",
    alignItems: "center",
    marginBottom: 10,
  },
  primaryButtonText: {
    color: colors.primaryContent,
    fontSize: 16,
    fontWeight: "700",
  },
  secondaryButton: {
    paddingVertical: 8,
  },
  secondaryButtonText: {
    color: colors.textTertiary,
    fontSize: 10,
  },
});
