import { colors } from "@/constants/theme";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import {
  Bell,
  Calendar,
  Edit3,
} from "lucide-react-native";
import React, { useEffect } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
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

// Colores para las rutinas (se asignan de forma rotativa)
const ROUTINE_COLORS = ["#FAB387", "#CBA6F7", "#A6E3A1", "#89B4FA", "#F5C2E7"];

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
  onPress?: () => void;
  onEdit?: (id: string) => void;
}

export const RoutineCard: React.FC<RoutineCardProps> = ({
  id,
  name,
  days,
  tasks: initialTasks,
  reminderEnabled,
  reminderTime,
  colorIndex = 0,
  onPress,
  onEdit,
}) => {
  const color = ROUTINE_COLORS[colorIndex % ROUTINE_COLORS.length];

  // Cálculo de progreso
  const completedCount = initialTasks.filter((t) => t.completed).length;
  const progressPercent =
    initialTasks.length > 0 ? (completedCount / initialTasks.length) * 100 : 0;

  // Animaciones suaves
  const cardScale = useSharedValue(1);
  const progressWidth = useSharedValue(progressPercent);
  const headerPressScale = useSharedValue(1);
  const editButtonScale = useSharedValue(1);

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

  const handleEdit = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (e) {}

    editButtonScale.value = withSequence(
      withTiming(0.85, { duration: 80 }),
      withSpring(1, { damping: 15, stiffness: 300 }),
    );

    onEdit?.(id);
  };

  // Estilos animados

  const cardAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: cardScale.value }],
  }));

  const headerAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: headerPressScale.value }],
  }));

  const editButtonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: editButtonScale.value }],
  }));

  const progressAnimatedStyle = useAnimatedStyle(() => ({
    width: `${progressWidth.value}%`,
  }));

  // Formatear días para mostrar
  const daysText =
    days.length === 7
      ? "Todos los días"
      : days.map((d) => d.slice(0, 3)).join(", ");

  return (
    <Animated.View
      entering={FadeIn.duration(300)}
      layout={Layout.duration(250)}
      style={[styles.container, cardAnimatedStyle]}
    >
      {/* Borde superior con gradiente */}
      <LinearGradient
        colors={[color, `${color}50`]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.topBorder}
      />

      {/* Header */}
      <Animated.View style={headerAnimatedStyle}>
        <Pressable
          onPress={handleCardPress}
          onPressIn={onHeaderPressIn}
          onPressOut={onHeaderPressOut}
          style={styles.header}
        >
          <View style={styles.headerContent}>
            {/* Icono con color */}
            <Animated.View
              style={[styles.iconContainer, { backgroundColor: `${color}20` }]}
            >
              <Calendar size={18} color={color} />
            </Animated.View>

            {/* Información */}
            <View style={styles.infoContainer}>
              <Text style={styles.title} numberOfLines={1}>
                {name}
              </Text>
              <View style={styles.metaRow}>
                {reminderEnabled && reminderTime && (
                  <View style={styles.reminderBadge}>
                    <Bell size={10} color={colors.textSecondary} />
                    <Text style={styles.reminderText}>{reminderTime}</Text>
                  </View>
                )}
              </View>
            </View>

            {/* Acciones */}
            <View style={styles.actionsRow}>
              <Animated.View style={editButtonAnimatedStyle}>
                <Pressable
                  onPress={(e) => {
                    e.stopPropagation();
                    handleEdit();
                  }}
                  style={styles.actionButton}
                  hitSlop={12}
                >
                  <Edit3 size={16} color={colors.textSecondary} />
                </Pressable>
              </Animated.View>
            </View>
          </View>

          {/* Barra de progreso */}
          <View style={styles.progressSection}>
            <View style={styles.progressInfo}>
              <Text style={styles.progressText}>
                {completedCount}/{initialTasks.length} tareas
              </Text>
              <Text style={[styles.progressPercent, { color }]}>
                {Math.round(progressPercent)}%
              </Text>
            </View>
            <View style={styles.progressBar}>
              <Animated.View
                style={[
                  styles.progressFill,
                  { backgroundColor: color },
                  progressAnimatedStyle,
                ]}
              />
            </View>
          </View>
        </Pressable>
      </Animated.View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 12,
  },
  topBorder: {
    height: 3,
    width: "100%",
  },
  header: {
    padding: 12,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconContainer: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  infoContainer: {
    flex: 1,
  },
  title: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.textPrimary,
    marginBottom: 2,
    letterSpacing: -0.3,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  daysText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: "500",
  },
  reminderBadge: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: 10,
    backgroundColor: "rgba(203, 166, 247, 0.1)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  reminderText: {
    fontSize: 10,
    color: colors.textSecondary,
    marginLeft: 3,
    fontWeight: "600",
  },
  actionsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  actionButton: {
    padding: 8,
  },
  progressSection: {
    marginTop: 10,
  },
  progressInfo: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  progressText: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: "500",
  },
  progressPercent: {
    fontSize: 11,
    fontWeight: "700",
  },
  progressBar: {
    height: 4,
    backgroundColor: colors.background,
    borderRadius: 2,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 2,
  },
});
