import { colors } from "@/constants/theme";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import {
  Bell,
  Calendar,
  Check,
  ChevronDown,
  Edit3,
  Plus,
  Trash2,
} from "lucide-react-native";
import React, { useEffect, useState } from "react";
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  Layout,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { RoutineCelebration } from "./RoutineCelebration";

// Colores para las rutinas (se asignan de forma rotativa)
const ROUTINE_COLORS = ["#FAB387", "#CBA6F7", "#A6E3A1", "#89B4FA", "#F5C2E7"];

// Componente TaskRow con animaciones propias (trend 2026: micro-feedback)
const TaskRow = ({
  task,
  color,
  onToggle,
}: {
  task: { id: string; title: string; completed?: boolean };
  color: string;
  onToggle: () => void;
}) => {
  const checkboxScale = useSharedValue(1);
  const rowScale = useSharedValue(1);
  const checkOpacity = useSharedValue(task.completed ? 1 : 0);
  const checkScale = useSharedValue(task.completed ? 1 : 0);

  useEffect(() => {
    checkOpacity.value = withTiming(task.completed ? 1 : 0, { duration: 200 });
    checkScale.value = withSpring(task.completed ? 1 : 0, {
      damping: 12,
      stiffness: 200,
    });
  }, [task.completed]);

  const handlePress = () => {
    // Animación de bounce del checkbox
    checkboxScale.value = withSequence(
      withTiming(0.8, { duration: 80 }),
      withSpring(1, { damping: 10, stiffness: 300 }),
    );

    // Animación sutil de toda la fila
    rowScale.value = withSequence(
      withTiming(0.98, { duration: 80 }),
      withSpring(1, { damping: 15, stiffness: 200 }),
    );

    onToggle();
  };

  const checkboxAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: checkboxScale.value }],
  }));

  const rowAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: rowScale.value }],
  }));

  const checkAnimatedStyle = useAnimatedStyle(() => ({
    opacity: checkOpacity.value,
    transform: [{ scale: checkScale.value }],
  }));

  return (
    <Animated.View style={rowAnimatedStyle}>
      <TouchableOpacity
        onPress={handlePress}
        style={styles.taskRow}
        activeOpacity={0.8}
      >
        <Animated.View
          style={[
            styles.checkbox,
            task.completed
              ? { backgroundColor: color, borderColor: "transparent" }
              : {
                  backgroundColor: "transparent",
                  borderColor: `${colors.textSecondary}40`,
                },
            checkboxAnimatedStyle,
          ]}
        >
          <Animated.View style={checkAnimatedStyle}>
            <Check size={14} color={colors.background} strokeWidth={3} />
          </Animated.View>
        </Animated.View>
        <Text
          style={[
            styles.taskLabel,
            task.completed && styles.taskLabelCompleted,
          ]}
        >
          {task.title}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
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
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
  onTaskToggle?: (
    routineId: string,
    taskId: string,
    completed: boolean,
  ) => void;
}

export const RoutineCard: React.FC<RoutineCardProps> = ({
  id,
  name,
  days,
  tasks: initialTasks,
  reminderEnabled,
  reminderTime,
  colorIndex = 0,
  onEdit,
  onDelete,
  onTaskToggle,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [tasks, setTasks] = useState(
    initialTasks.map((t) => ({ ...t, completed: t.completed || false })),
  );
  const [showCelebration, setShowCelebration] = useState(false);
  const color = ROUTINE_COLORS[colorIndex % ROUTINE_COLORS.length];

  // Actualizar tareas cuando cambien las props (después de editar)
  useEffect(() => {
    setTasks(
      initialTasks.map((t) => ({ ...t, completed: t.completed || false })),
    );
  }, [initialTasks]);

  // Cálculo de progreso
  const completedCount = tasks.filter((t) => t.completed).length;
  const progressPercent =
    tasks.length > 0 ? (completedCount / tasks.length) * 100 : 0;

  // Animaciones suaves (trend 2026: micro-interacciones fluidas)
  const rotation = useSharedValue(0);
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

  const toggleExpand = () => {
    // Haptic suave
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (e) {}

    const target = !isExpanded;
    setIsExpanded(target);

    // Animación de rotación más suave
    rotation.value = withSpring(target ? 180 : 0, {
      damping: 15,
      stiffness: 120,
      mass: 0.8,
    });

    // Micro-bounce de la card
    cardScale.value = withSequence(
      withTiming(0.98, { duration: 100 }),
      withSpring(1, { damping: 15, stiffness: 200 }),
    );
  };

  const onHeaderPressIn = () => {
    headerPressScale.value = withTiming(0.98, { duration: 150 });
  };

  const onHeaderPressOut = () => {
    headerPressScale.value = withSpring(1, { damping: 15, stiffness: 200 });
  };

  const toggleTask = (taskId: string) => {
    const task = tasks.find((t) => t.id === taskId);
    const willBeCompleted = !task?.completed;

    // Haptic diferenciado según acción
    try {
      if (willBeCompleted) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      } else {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    } catch (e) {}

    const newTasks = tasks.map((t) =>
      t.id === taskId ? { ...t, completed: !t.completed } : t,
    );
    setTasks(newTasks);

    if (task && onTaskToggle) {
      onTaskToggle(id, taskId, !task.completed);
    }

    // Verificar si se completaron todas las tareas
    const allCompleted = newTasks.every((t) => t.completed);

    if (allCompleted && willBeCompleted && newTasks.length > 0) {
      // Pequeño delay para que se vea la animación del checkbox
      setTimeout(() => {
        setShowCelebration(true);
      }, 400);
    }
  };

  const handleEdit = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (e) {}

    // Animación de press
    editButtonScale.value = withSequence(
      withTiming(0.85, { duration: 80 }),
      withSpring(1, { damping: 15, stiffness: 300 }),
    );

    onEdit?.(id);
  };

  const handleDelete = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    } catch (e) {}

    Alert.alert(
      "Eliminar Rutina",
      `¿Estás seguro que deseas eliminar "${name}"?`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: () => {
            try {
              Haptics.notificationAsync(
                Haptics.NotificationFeedbackType.Warning,
              );
            } catch (e) {}
            onDelete?.(id);
          },
        },
      ],
    );
  };

  // Estilos animados
  const arrowStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

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
          onPress={toggleExpand}
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
                  onPress={handleEdit}
                  style={styles.actionButton}
                  hitSlop={12}
                >
                  <Edit3 size={16} color={colors.textSecondary} />
                </Pressable>
              </Animated.View>
              <Animated.View style={arrowStyle}>
                <View
                  style={[
                    styles.expandButton,
                    { backgroundColor: `${color}20` },
                  ]}
                >
                  {isExpanded ? (
                    <ChevronDown size={16} color={color} />
                  ) : (
                    <Plus size={16} color={color} />
                  )}
                </View>
              </Animated.View>
            </View>
          </View>

          {/* Barra de progreso */}
          <View style={styles.progressSection}>
            <View style={styles.progressInfo}>
              <Text style={styles.progressText}>
                {completedCount}/{tasks.length} tareas
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

      {/* Body expandible con tareas */}
      {isExpanded && (
        <Animated.View
          entering={FadeIn.duration(200)}
          exiting={FadeOut.duration(150)}
          style={styles.body}
        >
          <View style={styles.separator} />

          {tasks.map((task, index) => (
            <Animated.View
              key={task.id}
              entering={FadeIn.delay(index * 40).duration(200)}
              exiting={FadeOut.duration(120)}
              layout={Layout.duration(200)}
            >
              <TaskRow
                task={task}
                color={color}
                onToggle={() => toggleTask(task.id)}
              />
            </Animated.View>
          ))}

          {/* Botón eliminar al final */}
          <Animated.View
            entering={FadeIn.delay(tasks.length * 40 + 80).duration(180)}
          >
            <Pressable
              onPress={handleDelete}
              style={({ pressed }) => [
                styles.deleteButton,
                pressed && styles.deleteButtonPressed,
              ]}
            >
              <Trash2 size={16} color="#F38BA8" />
              <Text style={styles.deleteText}>Eliminar rutina</Text>
            </Pressable>
          </Animated.View>
        </Animated.View>
      )}

      {/* Celebración cuando se completan todas las tareas */}
      <RoutineCelebration
        visible={showCelebration}
        routineName={name}
        completedTasks={tasks.length}
        totalTasks={tasks.length}
        routineColor={color}
        onClose={() => setShowCelebration(false)}
      />
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
  expandButton: {
    padding: 6,
    borderRadius: 10,
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
  body: {
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
  separator: {
    height: 1,
    backgroundColor: "rgba(203, 166, 247, 0.1)",
    marginBottom: 8,
  },
  taskRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    minHeight: 44,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    marginRight: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  taskLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: colors.textPrimary,
    flex: 1,
  },
  taskLabelCompleted: {
    color: colors.textTertiary,
    textDecorationLine: "line-through",
  },
  deleteButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    marginTop: 4,
    borderTopWidth: 1,
    borderTopColor: "rgba(243, 139, 168, 0.2)",
    borderRadius: 8,
    minHeight: 44,
  },
  deleteButtonPressed: {
    backgroundColor: "rgba(243, 139, 168, 0.1)",
    transform: [{ scale: 0.98 }],
  },
  deleteText: {
    fontSize: 14,
    color: "#F38BA8",
    fontWeight: "600",
    marginLeft: 8,
  },
});
