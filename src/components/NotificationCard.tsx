import { colors } from "@/constants/theme";
import { AppText as Text } from "@/src/components/AppText";
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { Pressable, StyleSheet } from "react-native";

type TimePeriod = "day" | "week" | "month";

interface NotificationCardProps {
  tasksCompleted?: {
    day: number;
    week: number;
    month: number;
  };
}

export function NotificationCard({
  tasksCompleted = { day: 2, week: 8, month: 24 },
}: NotificationCardProps) {
  const { t } = useTranslation();
  const [period, setPeriod] = useState<TimePeriod>("day");

  const periodLabels = {
    day: t("notification_card.tasks_completed_day", {
      count: tasksCompleted.day,
    }),
    week: t("notification_card.tasks_completed_week", {
      count: tasksCompleted.week,
    }),
    month: t("notification_card.tasks_completed_month", {
      count: tasksCompleted.month,
    }),
  };

  const nextPeriod: Record<TimePeriod, TimePeriod> = {
    day: "week",
    week: "month",
    month: "day",
  };

  const handlePress = () => {
    setPeriod(nextPeriod[period]);
  };

  return (
    <Pressable onPress={handlePress} style={styles.container}>
      <Text style={styles.emoji}>🎉</Text>
      <Text style={styles.text}>{periodLabels[period]}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.primary,
    borderRadius: 24,
    padding: 20,
    gap: 12,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 4,
  },
  emoji: {
    fontSize: 28,
  },
  text: {
    flex: 1,
    fontSize: 18,
    fontWeight: "700",
    color: "#FFFFFF",
    letterSpacing: 0.3,
  },
});
