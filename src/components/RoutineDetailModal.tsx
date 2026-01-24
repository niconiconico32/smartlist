import { colors } from "@/constants/theme";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import {
  Bell,
  Calendar,
  Check,
  Trash2,
  X,
} from "lucide-react-native";
import React, { useEffect, useState } from "react";
import {
  Alert,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ScrollView,
} from "react-native";
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { RoutineCelebration } from "./RoutineCelebration";

// Colores para las rutinas (se asignan de forma rotativa)
const ROUTINE_COLORS = ["#FAB387", "#CBA6F7", "#A6E3A1", "#89B4FA", "#F5C2E7"];

// Componente TaskRow con animaciones propias
const TaskRow = ({
  task,
  color,
  onToggle,
  index,
}: {
  task: { id: string; title: string; completed?: boolean };
  color: string;
  onToggle: () => void;
  index: number;
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
    checkboxScale.value = withSequence(
      withTiming(0.8, { duration: 80 }),
      withSpring(1, { damping: 10, stiffness: 300 }),
    );

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
    <Animated.View 
      style={rowAnimatedStyle}
      entering={FadeInDown.delay(index * 50).duration(300)}
    >
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
            <Check size={16} color={colors.background} strokeWidth={3} />
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

interface RoutineDetailModalProps {
  visible: boolean;
  routine: {
    id: string;
    name: string;
    days: string[];
    tasks: Task[];
    reminderEnabled?: boolean;
    reminderTime?: string;
  } | null;
  colorIndex?: number;
  onClose: () => void;
  onTaskToggle?: (routineId: string, taskId: string, completed: boolean) => void;
  onDelete?: (id: string) => void;
  onEdit?: (id: string) => void;
}

export const RoutineDetailModal: React.FC<RoutineDetailModalProps> = ({
  visible,
  routine,
  colorIndex = 0,
  onClose,
  onTaskToggle,
  onDelete,
  onEdit,
}) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [showCelebration, setShowCelebration] = useState(false);
  const color = ROUTINE_COLORS[colorIndex % ROUTINE_COLORS.length];

  // Actualizar tareas cuando cambie la rutina o se abra el modal
  useEffect(() => {
    if (routine && visible) {
      console.log('RoutineDetailModal: Loading tasks for', routine.name, routine.tasks);
      setTasks(
        routine.tasks.map((t) => ({ ...t, completed: t.completed || false })),
      );
    }
  }, [routine?.id, visible]);

  if (!routine) return null;

  // Cálculo de progreso
  const completedCount = tasks.filter((t) => t.completed).length;
  const progressPercent =
    tasks.length > 0 ? (completedCount / tasks.length) * 100 : 0;

  const toggleTask = (taskId: string) => {
    const task = tasks.find((t) => t.id === taskId);
    const willBeCompleted = !task?.completed;

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
      onTaskToggle(routine.id, taskId, !task.completed);
    }

    // Verificar si se completaron todas las tareas
    const allCompleted = newTasks.every((t) => t.completed);

    if (allCompleted && willBeCompleted && newTasks.length > 0) {
      setTimeout(() => {
        setShowCelebration(true);
      }, 400);
    }
  };

  const handleDelete = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    } catch (e) {}

    Alert.alert(
      "Eliminar Rutina",
      `¿Estás seguro que deseas eliminar "${routine.name}"?`,
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
            onDelete?.(routine.id);
            onClose();
          },
        },
      ],
    );
  };

  const handleCelebrationClose = () => {
    setShowCelebration(false);
    onClose();
  };

  // Formatear días para mostrar
  const daysText =
    routine.days.length === 7
      ? "Todos los días"
      : routine.days.join(", ");

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        
        <Animated.View 
          style={styles.container}
          entering={FadeIn.duration(200)}
        >
          {/* Borde superior con gradiente */}
          <LinearGradient
            colors={[color, `${color}50`]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.topBorder}
          />

          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={[styles.iconContainer, { backgroundColor: `${color}20` }]}>
                <Calendar size={22} color={color} />
              </View>
              <View style={styles.headerInfo}>
                <Text style={styles.title} numberOfLines={2}>
                  {routine.name}
                </Text>
                <View style={styles.metaRow}>
                  <Text style={styles.daysText}>{daysText}</Text>
                  {routine.reminderEnabled && routine.reminderTime && (
                    <View style={styles.reminderBadge}>
                      <Bell size={10} color={colors.textSecondary} />
                      <Text style={styles.reminderText}>{routine.reminderTime}</Text>
                    </View>
                  )}
                </View>
              </View>
            </View>
            <View style={styles.headerActions}>
              <Pressable onPress={handleDelete} style={styles.deleteIconButton}>
                <Trash2 size={20} color="#F38BA8" />
              </Pressable>
              <Pressable onPress={onClose} style={styles.closeButton}>
                <X size={24} color={colors.textPrimary} />
              </Pressable>
            </View>
          </View>

          {/* Progress Bar */}
          <View style={styles.progressSection}>
            <View style={styles.progressInfo}>
              <Text style={styles.progressText}>
                {completedCount} de {tasks.length} completadas
              </Text>
              <Text style={[styles.progressPercent, { color }]}>
                {Math.round(progressPercent)}%
              </Text>
            </View>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  { backgroundColor: color, width: `${progressPercent}%` },
                ]}
              />
            </View>
          </View>

          {/* Tasks List */}
          <ScrollView 
            style={styles.tasksList}
            contentContainerStyle={styles.tasksContent}
            showsVerticalScrollIndicator={false}
          >
            {tasks.map((task, index) => (
              <TaskRow
                key={task.id}
                task={task}
                color={color}
                onToggle={() => toggleTask(task.id)}
                index={index}
              />
            ))}
          </ScrollView>
        </Animated.View>
      </View>

      {/* Celebración cuando se completan todas las tareas */}
      <RoutineCelebration
        visible={showCelebration}
        routineName={routine.name}
        completedTasks={tasks.length}
        totalTasks={tasks.length}
        routineColor={color}
        onClose={handleCelebrationClose}
      />
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  container: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    width: '100%',
    maxWidth: 400,
    maxHeight: '85%',
    minHeight: 400,
  },
  topBorder: {
    height: 4,
    width: '100%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    padding: 20,
    paddingBottom: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  headerInfo: {
    flex: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: 4,
    letterSpacing: -0.3,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  daysText: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  reminderBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(203, 166, 247, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  reminderText: {
    fontSize: 11,
    color: colors.textSecondary,
    marginLeft: 4,
    fontWeight: '600',
  },
  closeButton: {
    padding: 8,
    backgroundColor: colors.background,
    borderRadius: 12,
  },
  progressSection: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  progressInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressText: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  progressPercent: {
    fontSize: 14,
    fontWeight: '700',
  },
  progressBar: {
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  tasksList: {
    flexGrow: 1,
    flexShrink: 1,
    minHeight: 100,
  },
  tasksContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
  },
  taskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: colors.background,
    borderRadius: 14,
    marginBottom: 8,
  },
  checkbox: {
    width: 26,
    height: 26,
    borderRadius: 8,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  taskLabel: {
    fontSize: 15,
    color: colors.textPrimary,
    fontWeight: '500',
    flex: 1,
  },
  taskLabelCompleted: {
    textDecorationLine: 'line-through',
    color: colors.textSecondary,
    opacity: 0.7,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  deleteIconButton: {
    padding: 8,
    backgroundColor: 'rgba(243, 139, 168, 0.1)',
    borderRadius: 12,
  },
});
