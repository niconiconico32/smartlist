import React from "react";
import { useTranslation } from "react-i18next";
import { StyleSheet, Text, View } from "react-native";

const ConfettiCannon = (props: any) => null;

interface TaskSuccessScreenProps {
  taskTitle: string | undefined;
  confettiRef?: React.RefObject<any>;
  screenWidth: number;
}

export function TaskSuccessScreen({
  taskTitle,
  confettiRef,
  screenWidth,
}: TaskSuccessScreenProps) {
  const { t } = useTranslation();

  return (
    <View style={styles.container}>
      <View style={styles.iconContainer}>
        <Text style={styles.checkmark}>✓</Text>
      </View>
      <Text style={styles.title}>
        {t("index_tab.execution.completed")}
      </Text>
      <Text style={styles.subtitle}>{taskTitle}</Text>
      <ConfettiCannon
        count={200}
        origin={{ x: screenWidth / 2, y: 0 }}
        autoStart={false}
        fadeOut={true}
        fallSpeed={3000}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#A6E3A1",
  } as any,
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "rgba(255, 255, 255, 0.3)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 32,
  } as any,
  checkmark: {
    fontSize: 60,
    color: "#FFFFFF",
    fontWeight: "900",
  } as any,
  title: {
    fontSize: 36,
    fontWeight: "900",
    color: "#FFFFFF",
    marginBottom: 12,
    letterSpacing: -1,
  } as any,
  subtitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "rgba(255, 255, 255, 0.9)",
    textAlign: "center",
    paddingHorizontal: 24,
  } as any,
});
