import { colors } from "@/constants/theme";
import { AppText as Text } from "@/src/components/AppText";
import * as Haptics from "expo-haptics";
import React from "react";
import { Image, Pressable, StyleSheet, View } from "react-native";

const hapticsLight = () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});

export interface Achievement {
  id: string;
  title: string;
  icon: any;
  gradient: string[];
  progress: number;
  total: number;
  completed: boolean;
  coins: number;
  claimed?: boolean;
}

interface AchievementCardProps {
  achievement: Achievement;
  isLast: boolean;
  onPress: () => void;
  onClaim?: () => void;
}

export function AchievementCard({
  achievement,
  isLast,
  onPress,
  onClaim,
}: AchievementCardProps) {
  const isStarted = achievement.progress > 0;
  const isCompleted = achievement.progress >= achievement.total;
  const isClaimed = achievement.claimed === true;
  const showClaimButton = isCompleted && !isClaimed;

  const accentColor = isStarted ? colors.surface : "#9CA3AF";

  const progressPercentage = Math.min(
    (achievement.progress / achievement.total) * 100,
    100,
  );

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.cardContainer,
        isClaimed && { opacity: 0.6 },
        pressed && {
          opacity: isClaimed ? 0.4 : 0.9,
          transform: [{ scale: 0.98 }],
        },
      ]}
    >
      {/* Lado Izquierdo */}
      <View style={styles.leftSection}>
        <Image
          source={require("@/assets/images/crownIcon.png")}
          style={styles.crownAchievementIcon}
          resizeMode="contain"
        />
        <View style={{ flexDirection: "row", alignItems: "center", gap: 2 }}>

          <Text style={[styles.levelText, { color: colors.surface }]}>
            +{achievement.coins}
          </Text>
        </View>
      </View>

      {/* Lado Derecho: Contenido y Progreso */}
      <View style={styles.contentSection}>
        <View style={styles.textStack}>
          <Text style={styles.titleText}>{achievement.title}</Text>
        </View>

        <View style={styles.progressSection}>
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${progressPercentage}%`,
                  backgroundColor: accentColor,
                },
              ]}
            />
          </View>
          <Text style={[styles.progressNumber, { color: colors.surface }]}>
            {achievement.progress}/{achievement.total}
          </Text>
        </View>

        {showClaimButton && (
          <Pressable onPress={() => { hapticsLight(); onClaim?.(); }} style={styles.claimButton}>
            <Image
              source={require("@/assets/images/achievement_getButton.png")}
              style={styles.claimImage}
              resizeMode="contain"
            />
          </Pressable>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  cardContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#e4ce9d",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 16,
    padding: 16,
    gap: 16,
  },
  leftSection: {
    alignItems: "center",
    gap: 6,
    width: 68,
  },
  crownAchievementIcon: {
    width: 68,
    height: 68,
  },
  crownCoinIcon: {
    width: 12,
    height: 12,
  },
  levelText: {
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  contentSection: {
    flex: 1,
    gap: 12,
  },
  textStack: {
    gap: 4,
  },
  titleText: {
    fontSize: 16,
    fontWeight: "700",
    fontFamily: "Jersey10",
    color: "#131211"
  },
  progressSection: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  progressTrack: {
    flex: 1,
    height: 8,
    backgroundColor: "#F3F4F6",
    borderRadius: 4,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 4,
  },
  progressNumber: {
    fontSize: 13,
    fontWeight: "700",
    minWidth: 32,
    textAlign: "right",
  },
  claimButton: {
    alignSelf: "flex-end",
  },
  claimImage: {
    width: 100,
    height: 32,
  },
});
