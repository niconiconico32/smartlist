import { colors } from "@/constants/theme";
import { useAuth } from "@/src/contexts/AuthContext";
import * as routineService from "@/src/lib/routineService";
import type { CompletionHistory } from "@/src/types/routine";
import * as Haptics from "expo-haptics";
import { addDays, format } from "date-fns";
import { es } from "date-fns/locale";
import {
    Bell,
    Calendar,
    Check,
    ChevronLeft,
    Edit3,
    Trash2
} from "lucide-react-native";
import React, { useEffect, useState } from "react";
import {
    Alert,
    KeyboardAvoidingView,
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import Animated, {
    FadeInDown,
    useAnimatedStyle,
    useSharedValue,
    withSequence,
    withSpring,
    withTiming
} from "react-native-reanimated";

import { ROUTINE_COLORS } from '@/constants/routineColors';

const DAYS_OF_WEEK = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

// JS day (0=Sun) -> index in DAYS_OF_WEEK
const JS_DAY_TO_INDEX: Record<number, number> = { 0: 6, 1: 0, 2: 1, 3: 2, 4: 3, 5: 4, 6: 5 };

/**
 * Returns the next date (starting from tomorrow) when this routine is scheduled.
 */
const getNextRoutineDate = (routineDays: string[]): Date | null => {
  if (!routineDays || routineDays.length === 0) return null;
  const today = new Date();
  for (let i = 1; i <= 7; i++) {
    const candidate = addDays(today, i);
    const idx = JS_DAY_TO_INDEX[candidate.getDay()];
    if (routineDays.includes(DAYS_OF_WEEK[idx])) {
      return candidate;
    }
  }
  return null;
};

// Función para obtener los días del mes en formato de calendario
const getCalendarDays = (year: number, month: number) => {
  // Usar hora del mediodía para evitar problemas de zona horaria
  const firstDay = new Date(year, month, 1, 12, 0, 0);
  const lastDay = new Date(year, month + 1, 0, 12, 0, 0);
  
  // Día de la semana del primer día (0 = domingo, ajustamos a lunes = 0)
  let startDayOfWeek = firstDay.getDay() - 1;
  if (startDayOfWeek === -1) startDayOfWeek = 6; // Si es domingo, lo ponemos al final
  
  const daysInMonth = lastDay.getDate();
  const days: (number | null)[] = [];
  
  // Agregar días vacíos al inicio
  for (let i = 0; i < startDayOfWeek; i++) {
    days.push(null);
  }
  
  // Agregar los días del mes
  for (let day = 1; day <= daysInMonth; day++) {
    days.push(day);
  }
  
  return days;
};

// Función para verificar si una fecha corresponde a un día de la rutina
const isRoutineDay = (date: Date, routineDays: string[]) => {
  // Crear fecha al mediodía para evitar problemas de zona horaria
  const normalizedDate = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12, 0, 0);
  const dayOfWeek = normalizedDate.getDay(); // 0 = domingo, 1 = lunes, ...
  // Ajustar índice: DAYS_OF_WEEK es [Lun, Mar, Mié, Jue, Vie, Sáb, Dom]
  const dayIndex = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const dayName = DAYS_OF_WEEK[dayIndex];
  return routineDays.includes(dayName);
};

// Función para verificar si una fecha ya pasó
const isPastDay = (year: number, month: number, day: number, currentDate: Date) => {
  // Usar hora del mediodía para comparaciones consistentes
  const date = new Date(year, month, day, 12, 0, 0);
  const today = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate(), 12, 0, 0);
  return date < today;
};

// Componente para cada día del calendario
const CalendarDay = ({
  day,
  currentYear,
  currentMonth,
  now,
  routine,
  completedToday,
  completionHistory,
}: {
  day: number;
  currentYear: number;
  currentMonth: number;
  now: Date;
  routine: { days: string[]; created_at?: string };
  completedToday: boolean;
  completionHistory: CompletionHistory;
}) => {
  // Usar hora del mediodía para evitar problemas de zona horaria
  const dayDate = new Date(currentYear, currentMonth, day, 12, 0, 0);
  const isPast = isPastDay(currentYear, currentMonth, day, now);
  const isScheduled = isRoutineDay(dayDate, routine.days);
  const isToday = day === now.getDate() && currentMonth === now.getMonth() && currentYear === now.getFullYear();
  const isCompleted = isToday && completedToday;
  
  // Verificar si este día fue completado en el historial
  const dateKey = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  const wasCompletedInPast = completionHistory[dateKey] === true;
  
  // Obtener fecha de creación de la rutina (solo la fecha, sin hora, usar mediodía)
  const createdDate = routine.created_at ? new Date(routine.created_at) : null;
  const createdDateOnly = createdDate ? new Date(createdDate.getFullYear(), createdDate.getMonth(), createdDate.getDate(), 12, 0, 0) : null;
  const dayDateOnly = new Date(currentYear, currentMonth, day, 12, 0, 0);
  
  // Solo mostrar emoji de fracaso si el día es DESPUÉS de la fecha de creación
  const isAfterCreation = !createdDateOnly || dayDateOnly >= createdDateOnly;
  const isPastScheduled = isPast && isScheduled && !wasCompletedInPast && isAfterCreation;

  // Determinar el estilo del cuadrado sin mezclas
  const getSquareStyle = () => {
    if (isCompleted) return styles.daySquareCompleted;
    if (wasCompletedInPast) return styles.daySquareCompleted;
    if (isPastScheduled) return styles.daySquarePast;
    if (isToday) return styles.daySquareToday;
    if (isScheduled && !isPast) return styles.daySquareScheduled;
    if (isPast) return styles.daySquarePast;
    return null;
  };

  // Determinar el estilo del texto
  const getTextStyle = () => {
    if (isToday) return styles.dayNumberToday;
    if (isScheduled) return styles.dayNumberScheduled;
    if (isPast) return styles.dayNumberPast;
    return null;
  };

  return (
    <View style={styles.calendarCell}>
      <View style={[styles.daySquare, getSquareStyle()]}>
        {(isCompleted || wasCompletedInPast) ? (
          <Check size={20} color={colors.surface} strokeWidth={3} />
        ) : isPastScheduled ? (
          <Text style={styles.emojiText}>😢</Text>
        ) : (
          <Text style={[styles.dayNumber, getTextStyle()]}>
            {isToday ? 'Hoy' : day}
          </Text>
        )}
      </View>
    </View>
  );
};

// Componente TaskRow con animaciones propias
const TaskRow = ({
  task,
  color,
  onToggle,
  index,
  disabled,
}: {
  task: { id: string; title: string; completed?: boolean };
  color: string;
  onToggle: () => void;
  index: number;
  disabled?: boolean;
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
    if (disabled) return;

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
        style={[styles.taskRow, disabled && styles.taskRowDisabled]}
        activeOpacity={disabled ? 1 : 0.8}
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
            disabled && { opacity: 0.4 },
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
            disabled && { opacity: 0.5 },
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
  isReadOnly?: boolean;
  onClose: () => void;
  onTaskToggle?: (routineId: string, taskId: string, completed: boolean) => void;
  onDelete?: (id: string) => void;
  onEdit?: (id: string) => void;
}

export const RoutineDetailModal: React.FC<RoutineDetailModalProps> = ({
  visible,
  routine,
  colorIndex = 0,
  isReadOnly = false,
  onClose,
  onTaskToggle,
  onDelete,
  onEdit,
}) => {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [completedToday, setCompletedToday] = useState(false);
  const [completionHistory, setCompletionHistory] = useState<CompletionHistory>({});
  const color = ROUTINE_COLORS[colorIndex % ROUTINE_COLORS.length];

  // Next scheduled day for read-only banner
  const nextRoutineDate = isReadOnly && routine ? getNextRoutineDate(routine.days) : null;
  const nextDayLabel = nextRoutineDate
    ? format(nextRoutineDate, "EEEE d 'de' MMMM", { locale: es })
    : null;

  // Obtener mes y año actuales
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  const calendarDays = getCalendarDays(currentYear, currentMonth);
  
  const monthNames = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  // Actualizar tareas cuando cambie la rutina o se abra el modal
  useEffect(() => {
    if (routine && visible) {
      const mappedTasks = routine.tasks.map((t) => ({ ...t, completed: t.completed || false }));
      setTasks(mappedTasks);
      // Initialize completedToday based on whether all tasks are already done
      const allDone = mappedTasks.length > 0 && mappedTasks.every((t) => t.completed);
      setCompletedToday(allDone);
    }
  }, [routine?.id, visible]);

  // Cargar historial de completados cuando se abre el modal
  useEffect(() => {
    async function loadCompletionHistory() {
      if (!routine || !visible || !user) return;

      try {
        const history = await routineService.fetchCompletionHistory(
          routine.id,
          user.id,
          currentYear,
          currentMonth
        );
        setCompletionHistory(history);
      } catch (error) {
        console.error('Error loading completion history:', error);
      }
    }

    loadCompletionHistory();
  }, [routine?.id, visible, user, currentYear, currentMonth]);

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
      // Marcar el día actual como completado
      setCompletedToday(true);
    } else if (!allCompleted) {
      // Si se desmarca una tarea, quitar el estado de completado
      setCompletedToday(false);
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

  // Formatear días para mostrar
  const daysText =
    routine.days.length === 7
      ? "Todos los días"
      : routine.days.join(", ");

  return (
    <Modal
      visible={visible}
      transparent={false}
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior="padding"
        style={styles.keyboardAvoidingView}
      >
        <View style={styles.container}>
          {/* Header con botón de volver */}
          <View style={styles.header}>
            <Pressable onPress={onClose} style={styles.backButton}>
              <ChevronLeft size={24} color={colors.textPrimary} />
            </Pressable>
            <Text style={styles.headerTitle}>{routine.name}</Text>
            <View style={styles.headerActions}>
              <Pressable 
                onPress={() => {
                  try {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  } catch (e) {}
                  onEdit?.(routine.id);
                  onClose();
                }} 
                style={styles.editIconButton}
              >
                <Edit3 size={20} color={colors.primary} />
              </Pressable>
              <Pressable onPress={handleDelete} style={styles.deleteIconButton}>
                <Trash2 size={20} color="#F38BA8" />
              </Pressable>
            </View>
          </View>

          {/* Content ScrollView */}
          <ScrollView
            style={styles.scrollContent}
            contentContainerStyle={styles.scrollContentContainer}
            showsVerticalScrollIndicator={true}
          >
            {/* Read-only banner */}
            {isReadOnly && nextDayLabel && (
              <View style={styles.readOnlyBanner}>
                <Text style={styles.readOnlyBannerText}>
                  🔒 No te toca esta rutina hoy. Vuelve el{' '}
                  <Text style={styles.readOnlyBannerDay}>{nextDayLabel}</Text>.
                </Text>
              </View>
            )}
            {/* Borde superior con gradiente */}


            {/* Info Section */}
            <View style={styles.infoSection}>
              <View style={styles.headerLeft}>
                <View style={[styles.iconContainer, { backgroundColor: `${color}20` }]}>
                  <Calendar size={22} color={color} />
                </View>
                <View style={styles.headerInfo}>
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
            <View style={styles.tasksSection}>
              <Text style={styles.sectionTitle}>Tareas</Text>
              {tasks.map((task, index) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  color={color}
                  onToggle={() => toggleTask(task.id)}
                  index={index}
                  disabled={isReadOnly}
                />
              ))}
            </View>

            {/* Calendar Section */}
            <View style={styles.calendarSection}>
              <Text style={styles.sectionTitle}>
                {monthNames[currentMonth]} {currentYear}
              </Text>
              
              {/* Days of week header */}
              <View style={styles.calendarHeader}>
                {DAYS_OF_WEEK.map((day) => (
                  <View key={day} style={styles.dayHeaderCell}>
                    <Text style={styles.dayHeaderText}>{day}</Text>
                  </View>
                ))}
              </View>

              {/* Calendar grid */}
              <View style={styles.calendarGrid}>
                {calendarDays.map((day, index) => {
                  if (day === null) {
                    return <View key={index} style={styles.calendarCell} />;
                  }

                  return (
                    <CalendarDay
                      key={index}
                      day={day}
                      currentYear={currentYear}
                      currentMonth={currentMonth}
                      now={now}
                      routine={routine}
                      completedToday={completedToday}
                      completionHistory={completionHistory}
                    />
                  );
                })}
              </View>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  keyboardAvoidingView: {
    flex: 1,
  },
  container: {
    backgroundColor: colors.background,
    flex: 1,
    flexDirection: 'column',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.textPrimary,
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 12,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  editIconButton: {
    padding: 8,
    backgroundColor: 'rgba(203, 166, 247, 0.1)',
    borderRadius: 12,
  },
  deleteIconButton: {
    padding: 8,
    backgroundColor: 'rgba(243, 139, 168, 0.1)',
    borderRadius: 12,
  },
  scrollContent: {
    flex: 1,
  },
  scrollContentContainer: {
    paddingBottom: 40,
  },
  topBorder: {
    height: 4,
    width: '100%',
  },
  infoSection: {
    padding: 20,
    paddingBottom: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  headerInfo: {
    flex: 1,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  daysText: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  reminderBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(203, 166, 247, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  reminderText: {
    fontSize: 11,
    color: colors.textSecondary,
    marginLeft: 4,
    fontWeight: '600',
  },
  progressSection: {
    paddingHorizontal: 20,
    paddingBottom: 20,
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
  tasksSection: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 16,
  },
  taskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: colors.surface,
    borderRadius: 14,
    marginBottom: 8,
  },
  taskRowDisabled: {
    opacity: 0.55,
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
  // Calendar styles
  calendarSection: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  calendarHeader: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  dayHeaderCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
  },
  dayHeaderText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  calendarCell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    padding: 2,
  },
  daySquare: {
    flex: 1,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 0.5,
    borderColor: colors.textSecondary,
  },
  daySquarePast: {
    borderColor: 'rgba(108, 112, 134, 0.4)',
    backgroundColor: 'rgba(108, 112, 134, 0.4)',
  },
  daySquareScheduled: {
    backgroundColor: colors.textSecondary,
    borderColor: colors.primaryDark,
  },
  daySquareToday: {
    backgroundColor: colors.background,
    borderColor: colors.primary,
    borderWidth: 2,
  },
  daySquareCompleted: {
    backgroundColor: colors.primary,
    borderColor: colors.surface,
    borderWidth: 2,
  },
  dayNumber: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  dayNumberPast: {
    color: colors.textTertiary,
    opacity: 0.6,
  },
  dayNumberScheduled: {
    color: colors.textTertiary,
    fontWeight: '700',
  },
  dayNumberToday: {
    color: colors.primary,
    fontWeight: '700',
    fontSize: 12,
  },
  dayNumberCompleted: {
    color: colors.textRoutineCard, // Texto blanco sobre el fondo de día completado
    fontWeight: '800',
    fontSize: 12,
  },
  emojiText: {
    fontSize: 18,
  },
  readOnlyBanner: {
    marginHorizontal: 20,
    marginTop: 16,
    marginBottom: 4,
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: 'rgba(250, 179, 135, 0.15)',
    borderRadius: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#FAB387',
  },
  readOnlyBannerText: {
    fontSize: 13,
    color: '#FAB387',
    fontWeight: '600',
    lineHeight: 18,
  },
  readOnlyBannerDay: {
    fontWeight: '800',
    textTransform: 'capitalize',
  },
});
