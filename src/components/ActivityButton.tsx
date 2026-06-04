import { colors } from "@/constants/theme";
import { AppText as Text } from "@/src/components/AppText";
import { useAppStreakStore } from "@/src/store/appStreakStore";
import { Crown } from "lucide-react-native";
import React from "react";
import { useTranslation } from "react-i18next";
import { Pressable, StyleSheet, View } from "react-native";
import Svg, { Circle } from "react-native-svg";

interface ActivityButtonProps {
  title: string;
  emoji: string;
  metric: string;
  color: string;
  iconColor?: string;
  action: "add" | "play";
  onPress?: () => void;
  onEditPress?: () => void;
  onDeletePress?: () => void;
  onResetPress?: () => void;
  hasSubtasks?: boolean;
  completed?: boolean;
  index?: number;
  difficulty?: "easy" | "moderate" | "hard";
  subtasksProgress?: {
    completed: number;
    total: number;
  };
  nextSubtaskName?: string;
}

const BORDER_COLORS = ["#C9FD5A", "#CBA6F7", "#A6E3A1"]; // Peach, Lavender, Matcha
const CARD_COLORS = [colors.surface]; // Dark backgrounds

// Difficulty colors
const difficultyColors = {
  easy: colors.success, // Verde - #A6E3A1
  moderate: colors.accent, // Naranja - #FAB387
  hard: colors.danger, // Rojo - #F38BA8
};

// Circular Progress Component
const CircularProgress = ({
  percentage,
  color,
}: {
  percentage: number;
  color: string;
}) => {
  const size = 50;
  const strokeWidth = 4;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <View
      style={{
        width: size,
        height: size,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Svg
        width={size}
        height={size}
        style={{ transform: [{ rotate: "-90deg" }] }}
      >
        {/* Background circle */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="rgba(255, 255, 255, 0.4)"
          strokeWidth={strokeWidth}
          fill="none"
        />
        {/* Progress circle */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
        />
      </Svg>
      <View style={{ position: "absolute" }}>
        <Text style={{ color: "#FFFFFF", fontSize: 12, fontWeight: "700" }}>
          {Math.round(percentage)}%
        </Text>
      </View>
    </View>
  );
};

export function ActivityButton({
  title,
  emoji,
  metric,
  color,
  iconColor,
  action,
  onPress,
  hasSubtasks = false,
  completed = false,
  index = 0,
  difficulty = "easy",
  subtasksProgress,
  nextSubtaskName,
}: ActivityButtonProps) {
  const { t } = useTranslation();
  const multiplier = useAppStreakStore((state) => state.getMultiplier());
  // El cálculo base para coronas de subtareas según achievementsStore es entre 15 y 20 por subtarea. Usaremos 20 como máximo para mostrar en UI.
  const coinsPerSubtask = Math.round(20 * multiplier);

  const cardIndex = (index || 0) % CARD_COLORS.length;
  const borderColor = difficulty
    ? difficultyColors[difficulty]
    : colors.primary;
  const cardColor = CARD_COLORS[cardIndex];
  const difficultyLabels = {
    easy: "Fácil",
    moderate: "Moderada",
    hard: "Difícil",
  };

  // Colores vibrantes para tareas completadas - transmiten satisfacción y dopamina
  const completedCardColor = completed ? borderColor + "25" : cardColor; // Fondo vibrante con color de dificultad (15% opacidad)
  const completedBorderColor = completed ? borderColor : borderColor; // 100% opacidad - máxima vibración

  // Calcular porcentaje de progreso
  const progressPercentage =
    subtasksProgress && subtasksProgress.total > 0
      ? (subtasksProgress.completed / subtasksProgress.total) * 100
      : 0;

  return (
    <>
      <Pressable
        style={({ pressed }) => [
          styles.card,
          completed && styles.cardCompleted,
          pressed && styles.pressed,
        ]}
        onPress={onPress}
      >
        <View style={styles.topRow}>
          {/* Icon Box Izquierdo */}
          <View
            style={[
              styles.iconBox,
              { backgroundColor: iconColor || "#E9D5FF" },
            ]}
          >
            <Text style={styles.emojiText}>{emoji}</Text>
          </View>

          {/* Center Content */}
          <View style={styles.titleContainer}>
            <Text
              style={[styles.cardTitle, completed && styles.completedText]}
              numberOfLines={2}
            >
              {title.toUpperCase()}
            </Text>
          </View>
        </View>

        {/* Subtasks Bottom Section */}
        {hasSubtasks && subtasksProgress && (
          <View style={styles.subtasksContainer}>
            <View style={styles.subtasksHeader}>
              <Text style={styles.nextSubtaskTitle} numberOfLines={1}>
                {nextSubtaskName
                  ? `${t("activity_button.continue_with").toUpperCase()}: ${nextSubtaskName.toUpperCase()}`
                  : t("activity_button.completed").toUpperCase()}
              </Text>
              <View style={styles.progressTextRow}>
                <Text style={styles.progressText}>
                  {subtasksProgress.completed * coinsPerSubtask} /{" "}
                  {subtasksProgress.total * coinsPerSubtask}
                </Text>
                <Crown
                  size={14}
                  color={colors.surface}
                  strokeWidth={2.5}
                  style={{ marginLeft: 2, marginTop: -4 }}
                />
              </View>
            </View>

            <View style={styles.progressBarContainer}>
              {Array.from({ length: subtasksProgress.total }).map((_, i) => (
                <View
                  key={i}
                  style={[
                    styles.progressSegment,
                    i < subtasksProgress.completed &&
                      styles.progressSegmentFilled,
                  ]}
                />
              ))}
            </View>
          </View>
        )}
      </Pressable>
    </>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderWidth: 3,
    borderColor: "#000000",
    shadowColor: "#000000",
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 4,
    position: "relative",
    marginBottom: 12,
  },
  cardCompleted: {
    opacity: 0.5,
  },
  pressed: {
    transform: [{ scale: 0.98 }, { translateY: 2 }, { translateX: 2 }], // Brutalist click feel
  },
  topRow: {
    flexDirection: "row",
    alignItems: "stretch",
    minHeight: 64,
  },
  iconBox: {
    width: 64,
    borderRightWidth: 3,
    borderColor: "#000000",
    justifyContent: "center",
    alignItems: "center",
  },
  emojiText: {
    fontSize: 24,
  },
  titleContainer: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  cardTitle: {
    fontSize: 20,
    fontFamily: "Jersey10",
    color: "#FFFFFF",
    letterSpacing: 0.5,
  },
  subtasksContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    paddingTop: 8,
    borderTopWidth: 3,
    borderColor: "#000000",
    backgroundColor: "#FFFFFF", // Blanco abajo para contrastar brutalista
  },
  subtasksHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  nextSubtaskTitle: {
    fontSize: 10,
    fontWeight: "800",
    color: "#333333",
    letterSpacing: 1,
    flex: 1,
    marginRight: 8,
  },
  progressTextRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  progressText: {
    fontSize: 11,
    fontWeight: "900",
    color: "#6600FF",
  },
  progressBarContainer: {
    flexDirection: "row",
    height: 18,
    borderWidth: 2,
    borderColor: "#000000",
    backgroundColor: "#FFFFFF",
    padding: 2,
    gap: 2,
  },
  progressSegment: {
    flex: 1,
    backgroundColor: "#D1D5DB", // gris
  },
  progressSegmentFilled: {
    backgroundColor: colors.surface, // púrpura
  },
  completedText: {
    color: "rgba(255, 255, 255, 0.95)", // Texto brillante
  },
  completedBadgeText: {
    color: "#1E1E2E", // Texto oscuro sobre fondo vibrante
    fontWeight: "700",
  },
});
