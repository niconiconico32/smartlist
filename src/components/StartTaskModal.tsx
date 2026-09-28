import { colors } from "@/constants/theme";
import { AppText as Text } from "@/src/components/AppText";
import { LinearGradient } from "expo-linear-gradient";
import { X } from "lucide-react-native";
import React from "react";
import { useTranslation } from "react-i18next";
import {
    Modal,
    Pressable,
    StyleSheet,
    View,
} from "react-native";

interface Activity {
  id: string;
  title: string;
  emoji: string;
  subtasks?: { id: string; title: string; duration: number; isCompleted: boolean }[];
}

interface StartTaskModalProps {
  visible: boolean;
  activity: Activity | null;
  onClose: () => void;
  onStart: (activity: Activity) => void;
}

export function StartTaskModal({
  visible,
  activity,
  onClose,
  onStart,
}: StartTaskModalProps) {
  const { t } = useTranslation();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.content}>
          <LinearGradient
            colors={["#CBA6F7", "#DFC0FF", "#CBA6F7"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />

          <View style={styles.inner}>
            <Pressable onPress={onClose} style={styles.closeButton}>
              <X size={24} color="rgba(59, 66, 97, 0.6)" />
            </Pressable>

            <Text style={styles.emoji}>{activity?.emoji}</Text>
            <Text style={styles.title}>
              {t("index_tab.start_task_title")}
            </Text>
            <Text style={styles.subtitle}>{activity?.title}</Text>

            <View style={styles.buttonsContainer}>
              <Pressable onPress={onClose} style={styles.cancelButton}>
                <Text style={styles.cancelButtonText}>
                  {t("index_tab.start_task_later")}
                </Text>
              </Pressable>

              <Pressable
                onPress={() => activity && onStart(activity)}
                style={styles.startButton}
              >
                <LinearGradient
                  colors={["#1E1E2E", "#252536"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.startButtonGradient}
                >
                  <Text style={styles.startButtonText}>
                    {t("index_tab.start_task_start")}
                  </Text>
                </LinearGradient>
              </Pressable>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    alignItems: "center",
  } as any,
  content: {
    width: "85%",
    borderRadius: 20,
    overflow: "hidden",
    shadowColor: "#CBA6F7",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 12,
  } as any,
  inner: {
    paddingHorizontal: 24,
    paddingVertical: 32,
    alignItems: "center",
  } as any,
  closeButton: {
    position: "absolute",
    top: 12,
    right: 12,
    padding: 8,
    zIndex: 10,
  } as any,
  emoji: {
    fontSize: 60,
    marginBottom: 20,
  } as any,
  title: {
    fontSize: 28,
    fontWeight: "900",
    color: "#3B4261",
    letterSpacing: -0.5,
    marginBottom: 8,
  } as any,
  subtitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "rgba(59, 66, 97, 0.75)",
    textAlign: "center",
    marginBottom: 28,
    paddingHorizontal: 12,
  } as any,
  buttonsContainer: {
    width: "100%",
    gap: 12,
  } as any,
  cancelButton: {
    paddingVertical: 12,
    alignItems: "center",
  } as any,
  cancelButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "rgba(59, 66, 97, 0.6)",
  } as any,
  startButton: {
    borderRadius: 50,
    overflow: "hidden",
  } as any,
  startButtonGradient: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    alignItems: "center",
  } as any,
  startButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#ffffff",
    letterSpacing: -0.3,
  } as any,
});
