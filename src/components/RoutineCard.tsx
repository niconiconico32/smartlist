import { colors } from "@/constants/theme";
import { AppText as Text } from "@/src/components/AppText";
import { useAchievementsStore } from "@/src/store/achievementsStore";
import { useAppStreakStore } from "@/src/store/appStreakStore";
import { useRoutineStreakStore } from "@/src/store/routineStreakStore";
import * as Haptics from "expo-haptics";
import LottieView from "lottie-react-native";
import {
    Activity,
    Bike,
    Book,
    Brain,
    Briefcase,
    Calendar,
    Check,
    Circle,
    Coffee,
    Crown,
    Dumbbell,
    Flower2,
    GraduationCap,
    Heart,
    Home,
    Laptop,
    Lightbulb,
    Moon,
    ShoppingBag,
    Smile,
    Sparkles,
    Sun,
    Target,
    Utensils,
} from "lucide-react-native";
import React, { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Pressable, StyleSheet, View } from "react-native";
import Animated, {
    Easing,
    FadeIn,
    Layout,
    useAnimatedStyle,
    useSharedValue,
    withSequence,
    withSpring,
    withTiming,
} from "react-native-reanimated";

import {
    ROUTINE_BACKGROUND_COLORS,
    ROUTINE_COLORS,
} from "@/constants/routineColors";

const AVAILABLE_ICONS: Record<string, any> = {
  Dumbbell,
  Activity,
  Bike,
  Heart,
  Book,
  GraduationCap,
  Lightbulb,
  Brain,
  Briefcase,
  Coffee,
  Laptop,
  Target,
  Home,
  ShoppingBag,
  Utensils,
  Sparkles,
  Moon,
  Sun,
  Flower2,
  Smile,
  Calendar,
  Circle,
};

const getIconComponent = (iconName?: string) => {
  return AVAILABLE_ICONS[iconName || "Calendar"] || Calendar;
};

interface Task {
  id: string;
  title: string;
  completed?: boolean;
}

interface RoutineCardProps {
  id: string;
  name: string;
  days: string[];
  tasks: Task[];
  reminderEnabled?: boolean;
  reminderTime?: string;
  colorIndex?: number;
  icon?: string;
  onPress?: () => void;
}

export const RoutineCard: React.FC<RoutineCardProps> = ({
  id,
  name,
  days,
  tasks: initialTasks,
  reminderEnabled,
  reminderTime,
  colorIndex = 0,
  icon,
  onPress,
}) => {
  const { t } = useTranslation();
  const color = ROUTINE_COLORS[colorIndex % ROUTINE_COLORS.length];
  const backgroundColor =
    ROUTINE_BACKGROUND_COLORS[colorIndex % ROUTINE_BACKGROUND_COLORS.length];
  const IconComponent = getIconComponent(icon);

  // Nivel logic
  const { getLevel } = useRoutineStreakStore();
  const routineLevel = getLevel(id);
  const lottieRef = useRef<LottieView>(null);

  // Cálculo de progreso
  const completedCount = initialTasks.filter((t) => t.completed).length;
  const progressPercent =
    initialTasks.length > 0 ? (completedCount / initialTasks.length) * 100 : 0;

  // Animaciones suaves
  const cardScale = useSharedValue(1);
  const progressWidth = useSharedValue(progressPercent);
  const headerPressScale = useSharedValue(1);

  // Actualizar barra de progreso con animación suave
  useEffect(() => {
    progressWidth.value = withTiming(progressPercent, {
      duration: 500,
      easing: Easing.bezierFn(0.25, 0.1, 0.25, 1),
    });
  }, [progressPercent]);

  const handleCardPress = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (e) {}

    cardScale.value = withSequence(
      withTiming(0.98, { duration: 100 }),
      withSpring(1, { damping: 15, stiffness: 200 }),
    );

    onPress?.();
  };

  const onHeaderPressIn = () => {
    headerPressScale.value = withTiming(0.98, { duration: 150 });
  };

  const onHeaderPressOut = () => {
    headerPressScale.value = withSpring(1, { damping: 15, stiffness: 200 });
  };

  // Estilos animados

  const cardAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: cardScale.value }],
  }));

  const headerAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: headerPressScale.value }],
  }));

  const progressAnimatedStyle = useAnimatedStyle(() => ({
    width: `${progressWidth.value}%`,
  }));

  // Formatear días para mostrar
  const daysText =
    days.length === 7
      ? t("routine_card.all_days")
      : days.map((d) => d.slice(0, 3)).join(", ");

  // Lógica de recompensa
  const multiplier = useAppStreakStore((state) => state.getMultiplier());
  const dailyRoutinesCompletedCount = useAchievementsStore(
    (state) => state.dailyRoutinesCompletedCount,
  );
  const fadingFactor = Math.pow(0.5, dailyRoutinesCompletedCount);
  const xpReward = Math.round(100 * fadingFactor * multiplier);

  return (
    <Animated.View
      entering={FadeIn.duration(300)}
      layout={Layout.duration(250)}
      style={[cardAnimatedStyle, { marginBottom: 8, marginTop: 6 }]}
    >
      <Animated.View style={headerAnimatedStyle}>
        <Pressable
          onPress={handleCardPress}
          onPressIn={onHeaderPressIn}
          onPressOut={onHeaderPressOut}
          style={[
            styles.container,
            progressPercent === 100 && styles.containerCompleted,
          ]}
        >
          {/* Medalla de Nivel (Acumulativo) */}
          {routineLevel > 0 && (
            <View style={styles.medalBadge}>
              <Text style={styles.medalText}>
                {t("routine_card.level", { level: routineLevel })}
              </Text>
            </View>
          )}

          {/* Icon Box Izquierdo */}
          <View style={styles.iconBox}>
            <IconComponent size={24} color={color} />
          </View>

          {/* Información Central */}
          <View style={styles.infoContainer}>
            <Text style={styles.title} numberOfLines={2}>
              {name}
            </Text>
            <View style={styles.rewardRow}>
              <Text style={styles.rewardText}>+{xpReward}</Text>
              <Crown
                size={13}
                color={colors.surface}
                strokeWidth={2.5}
                style={{ marginLeft: 0, marginTop: -2 }}
              />
              <Text style={styles.rewardText}>
                {initialTasks.length > 0
                  ? `  • ${completedCount}/${initialTasks.length}`
                  : ""}
              </Text>
            </View>
          </View>

          {/* Checkbox Box Derecho */}
          <View style={styles.checkboxBox}>
            <View
              style={[
                styles.checkboxCircle,
                progressPercent === 100 && styles.checkboxCircleCompleted,
              ]}
            >
              {progressPercent === 100 && (
                <Check size={14} color="#000000" strokeWidth={3} />
              )}
            </View>
          </View>
        </Pressable>
      </Animated.View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    borderWidth: 3,
    borderColor: "#000000",
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#000000",
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 4,
    position: "relative",
  },
  containerCompleted: {
    backgroundColor: "#F8F9FA",
  },
  medalBadge: {
    position: "absolute",
    top: -14,
    right: -8,
    backgroundColor: "#FFD700", // Dorado para la medalla
    borderWidth: 2,
    borderColor: "#000000",
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    shadowColor: "#000000",
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 2,
    zIndex: 10,
  },
  medalText: {
    fontSize: 12,
    fontWeight: "900",
    color: "#000000",
    letterSpacing: 0.5,
  },
  iconBox: {
    width: 48,
    height: 48,
    backgroundColor: "#FFFFFF",
    borderWidth: 2,
    borderColor: "#000000",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000000",
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 3,
    marginRight: 16,
  },
  infoContainer: {
    flex: 1,
    justifyContent: "center",
  },
  title: {
    fontSize: 20,
    fontFamily: "Jersey10",
    color: "#1A202C",
    marginBottom: 4,
  },
  rewardRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  rewardText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#718096",
    textTransform: "uppercase",
  },
  checkboxBox: {
    width: 40,
    height: 40,
    backgroundColor: "#FFFFFF",
    borderWidth: 2,
    borderColor: "#000000",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000000",
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 3,
    marginLeft: 16,
  },
  checkboxCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#CBD5E0",
    justifyContent: "center",
    alignItems: "center",
  },
  checkboxCircleCompleted: {
    borderColor: "#000000",
    backgroundColor: "#C9FD5A", // Verde acento cuando está completado
  },
});
