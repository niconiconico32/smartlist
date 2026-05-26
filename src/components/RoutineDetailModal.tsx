import { colors } from "@/constants/theme";
import { AppText as Text } from "@/src/components/AppText";
import { useAuth } from "@/src/contexts/AuthContext";
import * as routineService from "@/src/lib/routineService";
import type { CompletionHistory } from "@/src/types/routine";
import { addDays, format } from "date-fns";
import { enUS, es } from "date-fns/locale";
import * as Haptics from "expo-haptics";
import {
  Bell,
  Calendar,
  Check,
  ChevronLeft,
  Edit3,
  Trash2,
} from "lucide-react-native";
import React, { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import Animated, {
  FadeInDown,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAchievementsStore } from "@/src/store/achievementsStore";
import { ROUTINE_COLORS } from "@/constants/routineColors";
import { useEggCatalog } from "@/src/hooks/useEggCatalog";
import { EGG_MAX_XP, useEggStore } from "@/src/store/eggStore";

// Internal data keys for days (stored in DB as Spanish abbrs)
const DAYS_OF_WEEK = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
// Mapping from stored key to i18n display key
const DAY_DISPLAY_KEYS: Record<string, string> = {
  Lun: "days.mon_abbr",
  Mar: "days.tue_abbr",
  Mié: "days.wed_abbr",
  Jue: "days.thu_abbr",
  Vie: "days.fri_abbr",
  Sáb: "days.sat_abbr",
  Dom: "days.sun_abbr",
};

// JS day (0=Sun) -> index in DAYS_OF_WEEK
const JS_DAY_TO_INDEX: Record<number, number> = {
  0: 6,
  1: 0,
  2: 1,
  3: 2,
  4: 3,
  5: 4,
  6: 5,
};

const CHEST_IMAGES = [
  require("@/assets/images/pets/chest/1.png"),
  require("@/assets/images/pets/chest/2.png"),
  require("@/assets/images/pets/chest/3.png"),
  require("@/assets/images/pets/chest/4.png"),
  require("@/assets/images/pets/chest/5.png"),
  require("@/assets/images/pets/chest/6.png"),
  require("@/assets/images/pets/chest/7.png"),
] as const;

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
  const normalizedDate = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    12,
    0,
    0,
  );
  const dayOfWeek = normalizedDate.getDay(); // 0 = domingo, 1 = lunes, ...
  // Ajustar índice: DAYS_OF_WEEK es [Lun, Mar, Mié, Jue, Vie, Sáb, Dom]
  const dayIndex = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const dayName = DAYS_OF_WEEK[dayIndex];
  return routineDays.includes(dayName);
};

// Función para verificar si una fecha ya pasó
const isPastDay = (
  year: number,
  month: number,
  day: number,
  currentDate: Date,
) => {
  // Usar hora del mediodía para comparaciones consistentes
  const date = new Date(year, month, day, 12, 0, 0);
  const today = new Date(
    currentDate.getFullYear(),
    currentDate.getMonth(),
    currentDate.getDate(),
    12,
    0,
    0,
  );
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
  const { t } = useTranslation();
  // Usar hora del mediodía para evitar problemas de zona horaria
  const dayDate = new Date(currentYear, currentMonth, day, 12, 0, 0);
  const isPast = isPastDay(currentYear, currentMonth, day, now);
  const isScheduled = isRoutineDay(dayDate, routine.days);
  const isToday =
    day === now.getDate() &&
    currentMonth === now.getMonth() &&
    currentYear === now.getFullYear();
  const isCompleted = isToday && completedToday;

  // Verificar si este día fue completado en el historial
  const dateKey = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  const wasCompletedInPast = completionHistory[dateKey] === true;

  // Obtener fecha de creación de la rutina (solo la fecha, sin hora, usar mediodía)
  const createdDate = routine.created_at ? new Date(routine.created_at) : null;
  const createdDateOnly = createdDate
    ? new Date(
        createdDate.getFullYear(),
        createdDate.getMonth(),
        createdDate.getDate(),
        12,
        0,
        0,
      )
    : null;
  const dayDateOnly = new Date(currentYear, currentMonth, day, 12, 0, 0);

  // Solo mostrar emoji de fracaso si el día es DESPUÉS de la fecha de creación
  const isAfterCreation = !createdDateOnly || dayDateOnly >= createdDateOnly;
  const isPastScheduled =
    isPast && isScheduled && !wasCompletedInPast && isAfterCreation;

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
        {isCompleted || wasCompletedInPast ? (
          <Check size={20} color={colors.surface} strokeWidth={3} />
        ) : isPastScheduled ? (
          <Text style={styles.emojiText}>😢</Text>
        ) : (
          <Text style={[styles.dayNumber, getTextStyle()]}>
            {isToday ? t("routine_detail.today") : day}
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
        style={[
          styles.taskRow,
          task.completed ? styles.taskRowCompleted : styles.taskRowPending,
          disabled && styles.taskRowDisabled,
        ]}
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
  onTaskToggle?: (
    routineId: string,
    taskId: string,
    completed: boolean,
  ) => void;
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
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [completedToday, setCompletedToday] = useState(false);
  const [completionHistory, setCompletionHistory] = useState<CompletionHistory>(
    {},
  );
  const color = ROUTINE_COLORS[colorIndex % ROUTINE_COLORS.length];
  const dateLocale = i18n.language?.startsWith("es") ? es : enUS;
  const { width: windowWidth } = useWindowDimensions();
  const [carouselPage, setCarouselPage] = useState(0);
  const carouselRef = useRef<ScrollView | null>(null);
  const catalog = useEggCatalog();
  const eggs = useEggStore((s) => s.eggs);
  const eggData = routine
    ? (eggs.find((e) => e.routineId === routine.id) ?? null)
    : null;
  // Always display an egg/pet image — prefer the actually assigned egg, fall back to colorIndex
  const assignedEggMeta = eggData
    ? (catalog.find((m) => m.id === eggData.id) ?? catalog[colorIndex % catalog.length])
    : catalog[colorIndex % catalog.length];
  const eggXp = eggData?.xp ?? 0;
  const isEvolved = eggData?.evolved ?? false;
  const petXp = eggData?.petXp ?? 0;
  const petLevel = eggData?.petLevel ?? 0;
  // Guard: if state is somehow corrupted (evolved=true but petLevel=0), treat as 1.
  const safePetLevel = isEvolved && petLevel === 0 ? 1 : petLevel;
  // Show cumulative XP against the current cumulative threshold in the UI.
  const cumulativeXpTarget = safePetLevel * 30;
  const canLevelUp = isEvolved && petXp >= safePetLevel * 30;
  const chestImage = CHEST_IMAGES[Math.min(safePetLevel, CHEST_IMAGES.length) - 1] ?? CHEST_IMAGES[0];
  const displayPetImage = isEvolved ? assignedEggMeta?.petImage : assignedEggMeta?.image;

  // Egg hatching pulse: subtle scale bump + wobble rotation
  const eggScale = useSharedValue(1);
  const eggRotate = useSharedValue(0);
  useEffect(() => {
    if (isEvolved) {
      // Stop the wobble when the egg has hatched
      cancelAnimation(eggScale);
      cancelAnimation(eggRotate);
      eggScale.value = withTiming(1, { duration: 200 });
      eggRotate.value = withTiming(0, { duration: 200 });
      return;
    }
    eggScale.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1400 }),
        withTiming(1.07, { duration: 220 }),
        withTiming(0.97, { duration: 160 }),
        withTiming(1.05, { duration: 180 }),
        withTiming(1, { duration: 700 }),
      ),
      -1,
      false,
    );
    eggRotate.value = withRepeat(
      withSequence(
        withTiming(0, { duration: 1400 }),
        withTiming(-2.5, { duration: 110 }),
        withTiming(2.5, { duration: 160 }),
        withTiming(-1.2, { duration: 110 }),
        withTiming(0, { duration: 700 }),
      ),
      -1,
      false,
    );
    return () => {
      cancelAnimation(eggScale);
      cancelAnimation(eggRotate);
    };
  }, [isEvolved]);
  const eggAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: eggScale.value },
      { rotate: `${eggRotate.value}deg` },
    ],
  }));

  // Pet idle animation: a subtle floating motion after evolution.
  const petScale = useSharedValue(1);
  const petTranslateY = useSharedValue(0);
  useEffect(() => {
    if (!isEvolved) {
      cancelAnimation(petScale);
      cancelAnimation(petTranslateY);
      petScale.value = withTiming(1, { duration: 200 });
      petTranslateY.value = withTiming(0, { duration: 200 });
      return;
    }

    petScale.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 900 }),
        withTiming(1.03, { duration: 1200 }),
        withTiming(1, { duration: 1200 }),
      ),
      -1,
      false,
    );
    petTranslateY.value = withRepeat(
      withSequence(
        withTiming(0, { duration: 900 }),
        withTiming(-5, { duration: 1200 }),
        withTiming(0, { duration: 1200 }),
      ),
      -1,
      false,
    );

    return () => {
      cancelAnimation(petScale);
      cancelAnimation(petTranslateY);
    };
  }, [isEvolved]);
  const petAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: petTranslateY.value },
      { scale: petScale.value },
    ],
  }));

  // Evolucionar button: pulse when ready, explode on press
  const evolveButtonScale = useSharedValue(1);
  const evolveAnimatingRef = useRef(false);
  const evolveButtonReady = eggXp >= EGG_MAX_XP && !isEvolved;
  useEffect(() => {
    if (evolveButtonReady) {
      evolveButtonScale.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 700 }),
          withTiming(1.08, { duration: 350 }),
          withTiming(1, { duration: 350 }),
        ),
        -1,
        false,
      );
    } else if (!evolveAnimatingRef.current) {
      cancelAnimation(evolveButtonScale);
      evolveButtonScale.value = withTiming(1, { duration: 200 });
    }
    return () => cancelAnimation(evolveButtonScale);
  }, [evolveButtonReady]);
  const evolveButtonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: evolveButtonScale.value }],
  }));

  // Chest button: pulse when level-up is claimable
  const chestScale = useSharedValue(1);
  const chestAnimatingRef = useRef(false);
  useEffect(() => {
    if (canLevelUp) {
      chestScale.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 500 }),
          withTiming(1.18, { duration: 300 }),
          withTiming(1, { duration: 300 }),
        ),
        -1,
        false,
      );
    } else if (!chestAnimatingRef.current) {
      cancelAnimation(chestScale);
      chestScale.value = withTiming(1, { duration: 200 });
    }
    return () => cancelAnimation(chestScale);
  }, [canLevelUp]);
  const chestStyle = useAnimatedStyle(() => ({
    transform: [{ scale: chestScale.value }],
  }));

  // Next scheduled day for read-only banner
  const nextRoutineDate =
    isReadOnly && routine ? getNextRoutineDate(routine.days) : null;
  const nextDayLabel = nextRoutineDate
    ? format(nextRoutineDate, "EEEE d 'de' MMMM", { locale: dateLocale })
    : null;

  // Obtener mes y año actuales
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  const calendarDays = getCalendarDays(currentYear, currentMonth);

  // Actualizar tareas cuando cambie la rutina o se abra el modal
  useEffect(() => {
    if (routine && visible) {
      const mappedTasks = routine.tasks.map((t) => ({
        ...t,
        completed: t.completed || false,
      }));
      setTasks(mappedTasks);
      // Initialize completedToday based on whether all tasks are already done
      const allDone =
        mappedTasks.length > 0 && mappedTasks.every((t) => t.completed);
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
          currentMonth,
        );
        setCompletionHistory(history);
      } catch (error) {
        console.error("Error loading completion history:", error);
      }
    }

    loadCompletionHistory();
  }, [routine?.id, visible, user, currentYear, currentMonth]);

  useEffect(() => {
    if (!visible) return;
    setCarouselPage(0);
    carouselRef.current?.scrollTo({ x: 0, animated: false });
  }, [visible, routine?.id]);

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
        Haptics.selectionAsync();
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
      t("routine_detail.delete_title"),
      t("routine_detail.delete_message", { name: routine.name }),
      [
        { text: t("routine_detail.cancel"), style: "cancel" },
        {
          text: t("routine_detail.delete"),
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
      ? t("routine_card.all_days")
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
          <View
            style={[
              styles.header,
              {
                paddingTop: Math.max(insets.top + 12, 28),
                paddingBottom: 18,
              },
            ]}
          >
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
                  {t("routine_detail.read_only_banner_prefix")}{" "}
                  <Text style={styles.readOnlyBannerDay}>{nextDayLabel}</Text>.
                </Text>
              </View>
            )}
            {/* Borde superior con gradiente */}

            {/* Calendar / Egg Carousel */}
            <View style={styles.carouselWrapper}>
              <ScrollView
                ref={carouselRef}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                decelerationRate="fast"
                onMomentumScrollEnd={(e) => {
                  const page = Math.round(
                    e.nativeEvent.contentOffset.x / windowWidth,
                  );
                  setCarouselPage(page);
                }}
              >
                {/* Slide 1: Pet */}
                <View style={[styles.carouselSlide, styles.eggSlide, { width: windowWidth }]}>

                  <View style={styles.eggVisualStage}>
                    <View
                      style={isEvolved ? styles.petImageContainer : styles.eggImageContainer}
                    >
                      <Animated.Image
                        source={displayPetImage}
                        style={[
                          isEvolved ? styles.petImage : styles.eggImage,
                          isEvolved && petAnimatedStyle,
                          !isEvolved && eggAnimatedStyle,
                        ]}
                        resizeMode="contain"
                      />
                      {petLevel > 0 && isEvolved && (
                        <View style={styles.eggMedalBadge}>
                          <Text style={styles.eggMedalText}>
                            {t("routine_card.level", { level: safePetLevel })}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                  <View style={styles.eggXpSection}>
                    {!isEvolved ? (
                      /* ── Hatching nodes (pre-evolution) ── */
                      <View style={styles.evolutionNodesRow}>
                        {/* Node 1 */}
                        <View
                          style={[
                            styles.evolutionNode,
                            eggXp >= 1 && styles.evolutionNodeFilled,
                          ]}
                        />
                        {/* Connector 1–2 */}
                        <View
                          style={[
                            styles.evolutionLine,
                            eggXp >= 2 && styles.evolutionLineFilled,
                          ]}
                        />
                        {/* Node 2 */}
                        <View
                          style={[
                            styles.evolutionNode,
                            eggXp >= 2 && styles.evolutionNodeFilled,
                          ]}
                        />
                        {/* Connector 2–3 */}
                        <View
                          style={[
                            styles.evolutionLine,
                            eggXp >= EGG_MAX_XP && styles.evolutionLineFilled,
                          ]}
                        />
                        {/* Node 3 — Evolucionar button */}
                        <Animated.View style={evolveButtonStyle}>
                          <Pressable
                            onPress={() => {
                              if (eggData?.routineId) {
                                evolveAnimatingRef.current = true;
                                cancelAnimation(evolveButtonScale);
                                evolveButtonScale.value = withSequence(
                                  withTiming(0.88, { duration: 70 }),
                                  withSpring(1.22, { damping: 6, stiffness: 280 }),
                                  withSpring(1, { damping: 14, stiffness: 200 }),
                                );
                                setTimeout(() => { evolveAnimatingRef.current = false; }, 700);
                                try {
                                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
                                  Haptics.notificationAsync(
                                    Haptics.NotificationFeedbackType.Success,
                                  );
                                } catch (e) {}
                                useEggStore.getState().evolveEgg(eggData.routineId);
                              }
                            }}
                            disabled={eggXp < EGG_MAX_XP}
                            style={[
                              styles.evolutionNodeFinal,
                              eggXp >= EGG_MAX_XP && styles.evolutionNodeFinalReady,
                            ]}
                          >
                            <Text
                              style={[
                                styles.evolutionNodeFinalText,
                                eggXp >= EGG_MAX_XP &&
                                  styles.evolutionNodeFinalTextActive,
                              ]}
                            >
                              evolucionar!
                            </Text>
                          </Pressable>
                        </Animated.View>
                      </View>
                    ) : (
                      /* ── Pet XP bar (post-evolution) ── */
                      <View style={styles.petXpWrapper}>
                        <View style={styles.petXpHeader}>
                          <Text style={styles.petXpLabel}>XP</Text>
                          <Text style={styles.petXpValue}>
                            {petXp} / {cumulativeXpTarget}
                          </Text>
                        </View>
                        <View style={styles.petXpBarRow}>
                          <View style={styles.petXpBarTrack}>
                            <View
                              style={[
                                styles.petXpBarFill,
                                {
                                  width: `${Math.min(
                                    (petXp / cumulativeXpTarget) * 100,
                                    100,
                                  )}%`,
                                },
                              ]}
                            />
                          </View>
                          <Animated.View style={chestStyle}>
                            <Pressable
                              disabled={!canLevelUp}
                              onPress={() => {
                                if (eggData?.routineId && canLevelUp) {
                                  chestAnimatingRef.current = true;
                                  cancelAnimation(chestScale);
                                  chestScale.value = withSequence(
                                    withTiming(0.85, { duration: 60 }),
                                    withSpring(1.25, { damping: 5, stiffness: 260 }),
                                    withSpring(1, { damping: 14, stiffness: 200 }),
                                  );
                                  setTimeout(() => { chestAnimatingRef.current = false; }, 700);
                                  useEggStore
                                    .getState()
                                    .claimPetLevelUp(eggData.routineId);
                                  // Coins scale by chest level: 200 at L1, +150 per level, capped at L7 (1100)
                                  const chestLevel = Math.min(safePetLevel, 7);
                                  const coinsForLevel = (chestLevel - 1) * 150 + 200;
                                  useAchievementsStore
                                    .getState()
                                    .addCoins(coinsForLevel);
                                  try {
                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
                                    Haptics.notificationAsync(
                                      Haptics.NotificationFeedbackType.Success,
                                    );
                                  } catch (e) {}
                                }
                              }}
                              style={[
                                styles.chestButton,
                                canLevelUp && styles.chestButtonReady,
                              ]}
                            >
                              <Image
                                source={chestImage}
                                style={styles.chestImage}
                                resizeMode="contain"
                              />
                            </Pressable>
                          </Animated.View>
                        </View>
                      </View>
                    )}
                    {__DEV__ && eggData && (
                      <Pressable
                        onPress={() => {
                          useEggStore.setState((s) => ({
                            eggs: s.eggs.map((e) =>
                              e.routineId === eggData.routineId
                                ? e.evolved
                                  ? { ...e, petXp: e.petXp + 10 }
                                  : {
                                      ...e,
                                      xp: e.xp >= EGG_MAX_XP ? 0 : e.xp + 1,
                                      evolved: e.xp >= EGG_MAX_XP ? false : e.evolved,
                                      petXp: e.xp >= EGG_MAX_XP ? 0 : e.petXp,
                                      petLevel: e.xp >= EGG_MAX_XP ? 0 : e.petLevel,
                                    }
                                : e
                            ),
                          }));
                        }}
                        style={{
                          marginTop: 8,
                          alignSelf: "center",
                          backgroundColor: "#ff6b00",
                          paddingHorizontal: 14,
                          paddingVertical: 5,
                          borderRadius: 6,
                        }}
                      >
                        <Text style={{ color: "#fff", fontSize: 11 }}>
                          {isEvolved
                            ? `[DEV] +10 petXP (${petXp} total, lv${petLevel})`
                            : `[DEV] +XP (${eggXp}/${EGG_MAX_XP})`}
                        </Text>
                      </Pressable>
                    )}
                  </View>
                </View>

                {/* Slide 2: History */}
                <View style={[styles.carouselSlide, { width: windowWidth }]}>
                  <Text style={styles.sectionTitleCalendar}>
                    {format(
                      new Date(currentYear, currentMonth, 1),
                      "MMMM yyyy",
                      { locale: dateLocale },
                    )}
                  </Text>
                  <View style={styles.calendarHeader}>
                    {DAYS_OF_WEEK.map((day) => (
                      <View key={day} style={styles.dayHeaderCell}>
                        <Text style={styles.dayHeaderText}>
                          {t(DAY_DISPLAY_KEYS[day] ?? day)}
                        </Text>
                      </View>
                    ))}
                  </View>
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

              {/* Carousel section labels */}
              <View style={styles.carouselTabs}>
                <Text
                  style={[
                    styles.carouselTabLabel,
                    carouselPage === 0 ? styles.carouselTabLabelActive : null,
                  ]}
                >
                  pet
                </Text>
                <Text
                  style={[
                    styles.carouselTabLabel,
                    carouselPage === 1 ? styles.carouselTabLabelActive : null,
                  ]}
                >
                  history
                </Text>
              </View>
            </View>

            {/* Tasks List */}
            <View style={styles.tasksSection}>
              <View style={styles.tasksHeaderRow}>
                <Text style={styles.sectionTitleTasks}>
                  {t("routine_detail.tasks")}
                </Text>
                <View style={styles.tasksMetaBlock}>
                  <View style={styles.metaRow}>
                    <Text style={styles.daysText} numberOfLines={1}>
                      {daysText}
                    </Text>
                    {routine.reminderEnabled && routine.reminderTime && (
                      <View style={styles.reminderBadge}>
                        <Bell size={10} color={colors.textSecondary} />
                        <Text style={styles.reminderText}>
                          {routine.reminderTime}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              </View>
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
    flexDirection: "column",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.05)",
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: colors.textPrimary,
    flex: 1,
    textAlign: "center",
    marginHorizontal: 16,
  },
  headerActions: {
    flexDirection: "row",
    gap: 8,
  },
  editIconButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(203, 166, 247, 0.1)",
    borderRadius: 12,
  },
  deleteIconButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(243, 139, 168, 0.1)",
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
    width: "100%",
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "nowrap",
    justifyContent: "flex-end",
    gap: 8,
  },
  daysText: {
    fontSize: 14,
    color: colors.surface,
    fontFamily: "Jersey10",
    flexShrink: 1,
  },
  reminderBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(203, 166, 247, 0.1)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  reminderText: {
    fontSize: 11,
    color: colors.textSecondary,
    marginLeft: 4,
  },
  progressSection: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  progressInfo: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  progressText: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: "500",
  },
  progressPercent: {
    fontSize: 14,
    fontWeight: "700",
  },
  progressBar: {
    height: 6,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderRadius: 3,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 3,
  },
  tasksSection: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    paddingTop: 12,
  },
  tasksHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
    width: "100%",
  },
  tasksMetaBlock: {
    flexShrink: 1,
    minWidth: 0,
    maxWidth: "65%",
    marginLeft: 12,
  },
  sectionTitleCalendar: {
    fontSize: 26,
    fontFamily: "Jersey10",
    color: colors.surface,
    marginTop: 16,
  },
  sectionTitleTasks: {
    fontSize: 32,
      fontFamily: "Jersey10",
    color: colors.textPrimary,
    marginBottom: 0,
  },
  taskRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 8,
    borderRadius: 12,
  },
  taskRowPending: {
    borderStyle: "dashed",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.18)",
    backgroundColor: "transparent",
  },
  taskRowCompleted: {
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "rgba(255, 255, 255, 0.08)",
    backgroundColor: "rgba(255, 255, 255, 0.06)",
  },
  taskRowDisabled: {
    opacity: 0.55,
  },
  checkbox: {
    width: 26,
    height: 26,
    borderRadius: 8,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  taskLabel: {
    fontSize: 15,
    color: colors.textPrimary,
    fontWeight: "500",
    flex: 1,
  },
  taskLabelCompleted: {
    textDecorationLine: "line-through",
    color: colors.textSecondary,
    opacity: 0.7,
  },
  // Calendar styles
  calendarSection: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  calendarHeader: {
    flexDirection: "row",
    marginBottom: 12,
  },
  dayHeaderCell: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 8,
  },
  dayHeaderText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.surface,
    opacity: 0.7,
  },
  calendarGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  calendarCell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    padding: 2,
  },
  daySquare: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 0.5,
    borderColor: colors.textSecondary
  },
  daySquarePast: {
    backgroundColor: "rgba(108, 112, 134, 0.0)",
    borderColor: colors.surface,
    opacity: 0.5,  
    borderWidth: 1,
    borderStyle: 'dotted',
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
    fontWeight: "500",
    color: colors.textSecondary,
  },
  dayNumberPast: {
    color: colors.textTertiary,
    opacity: 0.3,
  },
  dayNumberScheduled: {
    color: colors.textTertiary,
    fontWeight: "700",
  },
  dayNumberToday: {
    color: colors.primary,
    fontWeight: "700",
    fontSize: 12,
  },
  dayNumberCompleted: {
    color: colors.textRoutineCard, // Texto blanco sobre el fondo de día completado
    fontWeight: "800",
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
    backgroundColor: "rgba(250, 179, 135, 0.15)",
    borderRadius: 12,
    borderLeftWidth: 3,
    borderLeftColor: "#FAB387",
  },
  readOnlyBannerText: {
    fontSize: 13,
    color: "#FAB387",
    fontWeight: "600",
    lineHeight: 18,
  },
  readOnlyBannerDay: {
    fontWeight: "800",
    textTransform: "capitalize",
  },
  // Carousel
  carouselWrapper: {
    paddingBottom: 8,
    overflow: "hidden",
    backgroundColor: "#eff4ff",
  },
  carouselSlide: {
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  eggSlide: {
    alignItems: "center",
  },
  eggVisualStage: {
    width: "100%",
    height: 280,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  eggImageContainer: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  petImageContainer: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  eggMedalBadge: {
    position: "absolute",
    top: 18,
    left: 10,
    backgroundColor: "#FFD700",
    borderWidth: 2,
    borderColor: "#000000",
    paddingHorizontal: 10,
    paddingVertical: 4,
    shadowColor: "#000000",
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 2,
  },
  eggMedalText: {
    fontSize: 22,
    fontFamily: "Jersey10",
    color: "#000000",
    textAlign: "center",
    letterSpacing: 2,
  },
  eggImage: {
    width: 150,
    height: 150,
  },
  petImage: {
    width: 230,
    height: 230,
    top: 15,
  },
  eggXpSection: {
    width: "80%",
  },
  eggXpInfo: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center", 
},
  eggXpLabel: {
    fontSize: 26,
    color: colors.surface,
    fontFamily: "Jersey10",
  },
  eggXpValue: {
    fontSize: 24,
    color: colors.surface,
    fontFamily: "Jersey10",
  },
  eggXpBar: {
    backgroundColor: "#ecece8",
    borderWidth: 2,
    borderColor: "#000000",
    paddingHorizontal: 4,
    paddingVertical: 4,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 2,
    shadowColor: "#000000",
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 2,
  },
  eggXpSegment: {
    flex: 1,
    height: 12,
    backgroundColor: "#FFF8E1",
    borderWidth: 1,
    borderColor: "#000000",
  },
  eggXpSegmentFilled: {
    backgroundColor: "#FFD700",
    borderColor: "#000000",
  },
  noEggText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: "center",
    paddingVertical: 40,
  },
  carouselTabs: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 14,
    paddingTop: 12,
    paddingBottom: 8,
  },
  carouselTabLabel: {
    fontSize: 14,
    fontFamily: "Jersey10",
    color: colors.surface,
    opacity: 0.45,
  },
  carouselTabLabelActive: {
    opacity: 1,
  },
  evolutionNodesRow: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    marginVertical: 12,
  },
  evolutionNode: {
    width: 28,
    height: 28,
    borderWidth: 2,
    borderColor: "#000000",
    backgroundColor: "#FFF8E1",
    shadowColor: "#000000",
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 2,
    borderRadius: 14,

  },
  evolutionNodeFilled: {
    backgroundColor: "#FFD700",
    borderRadius: 14,
  },
  evolutionLine: {
    flex: 1,
    height: 6,
    backgroundColor: "#ecece8",
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#000000",
  },
  evolutionLineFilled: {
    backgroundColor: "#FFD700",
  },
  evolutionNodeFinal: {
    paddingHorizontal: 22,
    paddingVertical: 22,
    borderWidth: 2,
    borderColor: "#000000",
    backgroundColor: "#ecece8",
    shadowColor: "#000000",
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 3,
    borderRadius: 32,

  },
  evolutionNodeFinalReady: {
    backgroundColor: "#FFD700",
  },
  evolutionNodeFinalDone: {
    backgroundColor: "#a8e6cf",
  },
  evolutionNodeFinalText: {
    fontSize: 16,
    fontFamily: "Jersey10",
    color: "#aaaaaa",
  },
  evolutionNodeFinalTextActive: {
    color: "#000000",
    fontSize: 18,
  },
  // ── Pet XP bar (post-evolution) ──────────────────────────────────
  petXpWrapper: {
    paddingHorizontal: 4,
    gap: 6,
  },
  petXpHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  petXpLabel: {
    fontFamily: "Jersey10",
    fontSize: 14,
    color: "#888",
    letterSpacing: 1,
  },
  petXpValue: {
    fontFamily: "Jersey10",
    fontSize: 14,
    color: "#555",
  },
  petXpBarRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  petXpBarTrack: {
    flex: 1,
    height: 14,
    backgroundColor: "#e0e0e0",
    borderRadius: 3,
    borderWidth: 2,
    borderColor: "#bbb",
    overflow: "hidden",
  },
  petXpBarFill: {
    height: "100%",
    backgroundColor: "#FFD700",
    borderRadius: 1,
  },
  chestButton: {
    width: 36,
    height: 36,
    justifyContent: "center",
    alignItems: "center",
    opacity: 0.4,
  },
  chestButtonReady: {
    opacity: 1,
  },
  chestImage: {
    width: 36,
    height: 36,
    left: 4,
  },
});
