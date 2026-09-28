import { colors } from "@/constants/theme";
import { AppText as Text } from "@/src/components/AppText";
import { useAuth } from "@/src/contexts/AuthContext";
import * as routineService from "@/src/lib/routineService";
import type { CompletionHistory } from "@/src/types/routine";
import { addDays, format } from "date-fns";
import { enUS, es, fr, it, ptBR, de } from "date-fns/locale";
import * as Haptics from "expo-haptics";
import LottieView from "lottie-react-native";
import {
  Bell,
  Check,
  ChevronLeft,
  Crown,
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
  useWindowDimensions,
  View,
} from "react-native";
import Svg, { Path, SvgXml } from "react-native-svg";
import { pixelButtonPath } from "@/src/features/onboarding/components/pixelGeometry";
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

function getDateLocale(lang?: string) {
  const lng = (lang ?? "en").split("-")[0];
  switch (lng) {
    case "es":
      return es;
    case "fr":
      return fr;
    case "it":
      return it;
    case "pt":
      return ptBR;
    case "de":
      return de;
    default:
      return enUS;
  }
}

function getDatePattern(lang?: string) {
  const lng = (lang ?? "en").split("-")[0];
  switch (lng) {
    case "es":
      return "EEEE d 'de' MMMM";
    case "pt":
      return "EEEE, d 'de' MMMM";
    case "de":
      return "EEEE, d. MMMM";
    default:
      return "EEEE, MMMM d";
  }
}

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

const PIXEL_BTN_SHADOW = 3;
const SHADOW_COLOR = "#0a0a0a";

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
  const [pillSize, setPillSize] = useState({ w: 0, h: 0 });

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

  const isCompleted = task.completed;

  return (
    <Animated.View
      style={rowAnimatedStyle}
      entering={FadeInDown.delay(index * 50).duration(300)}
    >
      <Pressable
        onPress={handlePress}
        style={[styles.taskRow, disabled && styles.taskRowDisabled]}
        onLayout={(e) => {
          const { width, height } = e.nativeEvent.layout;
          setPillSize((prev) => {
            if (prev.w === width && prev.h === height) return prev;
            return { w: width, h: height };
          });
        }}
      >
        {pillSize.w > 0 && (
          <Svg
            style={styles.taskPillSvg}
            width={pillSize.w + PIXEL_BTN_SHADOW}
            height={pillSize.h + PIXEL_BTN_SHADOW}
            viewBox={`0 0 ${pillSize.w + PIXEL_BTN_SHADOW} ${pillSize.h + PIXEL_BTN_SHADOW}`}
          >
            <Path
              d={pixelButtonPath(pillSize.w, pillSize.h)}
              fill={SHADOW_COLOR}
              transform={`translate(${PIXEL_BTN_SHADOW} ${PIXEL_BTN_SHADOW})`}
            />
            <Path
              d={pixelButtonPath(pillSize.w, pillSize.h)}
              fill={isCompleted ? color : "#FFFFFF"}
              stroke="transparent"
              strokeWidth={2}
            />
          </Svg>
        )}
        <Animated.View
          style={[
            styles.checkbox,
            isCompleted
              ? { backgroundColor: colors.background, borderColor: "transparent" }
              : {
                  backgroundColor: "transparent",
                  borderColor: "transparent",
                },
            checkboxAnimatedStyle,
            disabled && { opacity: 0.4 },
          ]}
        >
          <Animated.View style={checkAnimatedStyle}>
            <Check size={16} color={isCompleted ? color : "transparent"} strokeWidth={3} />
          </Animated.View>
        </Animated.View>
        <Text
          style={[
            styles.taskLabel,
            isCompleted && styles.taskLabelCompleted,
            disabled && { opacity: 0.5 },
          ]}
        >
          {task.title}
        </Text>
      </Pressable>
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
  const dateLocale = getDateLocale(i18n.language);
  const { width: windowWidth } = useWindowDimensions();
  const [carouselPage, setCarouselPage] = useState(0);
  const carouselRef = useRef<ScrollView | null>(null);
  const [showHatchAnim, setShowHatchAnim] = useState(false);
  const hatchLottieRef = useRef<LottieView>(null);
  const [rewardModalVisible, setRewardModalVisible] = useState(false);
  const [rewardCoinsTarget, setRewardCoinsTarget] = useState(0);
  const [rewardCoinsDisplay, setRewardCoinsDisplay] = useState(0);
  const rewardCountFrameRef = useRef<number | null>(null);
  const rewardCloseTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const catalog = useEggCatalog();
  const eggs = useEggStore((s) => s.eggs);
  const eggData = routine
    ? (eggs.find((e) => e.routineId === routine.id) ?? null)
    : null;
  // Always display an egg/pet image — prefer the actually assigned egg, fall back to colorIndex
  const assignedEggMeta = catalog.length === 0
    ? undefined
    : eggData
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
  const hatchAnimTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const evolveResetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const chestResetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
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
  const rewardModalScale = useSharedValue(0.92);
  const rewardAmountScale = useSharedValue(0.9);
  const rewardModalCardAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: rewardModalScale.value }],
  }));
  const rewardAmountAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: rewardAmountScale.value }],
  }));

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (hatchAnimTimerRef.current) clearTimeout(hatchAnimTimerRef.current);
      if (evolveResetTimerRef.current) clearTimeout(evolveResetTimerRef.current);
      if (chestResetTimerRef.current) clearTimeout(chestResetTimerRef.current);
    };
  }, []);

  // Next scheduled day for read-only banner
  const nextRoutineDate =
    isReadOnly && routine ? getNextRoutineDate(routine.days) : null;
  const nextDayLabel = nextRoutineDate
    ? format(
        nextRoutineDate,
        getDatePattern(i18n.language),
        { locale: dateLocale },
      )
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
  }, [routine?.id, visible, JSON.stringify(routine?.tasks)]);

  // Cargar historial de completados cuando se abre el modal
  useEffect(() => {
    let cancelled = false;
    async function loadCompletionHistory() {
      if (!routine || !visible || !user) return;

      try {
        const history = await routineService.fetchCompletionHistory(
          routine.id,
          user.id,
          currentYear,
          currentMonth,
        );
        if (!cancelled) setCompletionHistory(history);
      } catch (error) {
        if (__DEV__) console.error("Error loading completion history:", error);
      }
    }

    loadCompletionHistory();
    return () => { cancelled = true; };
  }, [routine?.id, visible, user, currentYear, currentMonth]);

  useEffect(() => {
    if (!visible) return;
    setCarouselPage(0);
    carouselRef.current?.scrollTo({ x: 0, animated: false });
  }, [visible, routine?.id]);

  useEffect(() => {
    if (!rewardModalVisible) {
      if (rewardCountFrameRef.current !== null) {
        cancelAnimationFrame(rewardCountFrameRef.current);
        rewardCountFrameRef.current = null;
      }
      if (rewardCloseTimeoutRef.current) {
        clearTimeout(rewardCloseTimeoutRef.current);
        rewardCloseTimeoutRef.current = null;
      }
      rewardModalScale.value = 0.92;
      rewardAmountScale.value = 0.9;
      setRewardCoinsDisplay(0);
      return;
    }

    rewardModalScale.value = withSequence(
      withTiming(0.96, { duration: 80 }),
      withSpring(1.02, { damping: 10, stiffness: 240 }),
      withSpring(1, { damping: 14, stiffness: 220 }),
    );

    let startTime: number | null = null;
    const durationMs = 1150;

    const animateCount = (timestamp: number) => {
      if (startTime === null) startTime = timestamp;
      const elapsed = timestamp - startTime;
      const progress = Math.min(elapsed / durationMs, 1);
      const easedProgress = 1 - Math.pow(1 - progress, 3);
      setRewardCoinsDisplay(Math.round(rewardCoinsTarget * easedProgress));

      if (progress < 1) {
        rewardCountFrameRef.current = requestAnimationFrame(animateCount);
      } else {
        rewardAmountScale.value = withSequence(
          withSpring(1.12, { damping: 8, stiffness: 260 }),
          withSpring(1, { damping: 12, stiffness: 220 }),
        );
        rewardCountFrameRef.current = null;
      }
    };

    rewardCountFrameRef.current = requestAnimationFrame(animateCount);
    rewardCloseTimeoutRef.current = setTimeout(() => {
      setRewardModalVisible(false);
    }, 5200);

    return () => {
      if (rewardCountFrameRef.current !== null) {
        cancelAnimationFrame(rewardCountFrameRef.current);
        rewardCountFrameRef.current = null;
      }
      if (rewardCloseTimeoutRef.current) {
        clearTimeout(rewardCloseTimeoutRef.current);
        rewardCloseTimeoutRef.current = null;
      }
    };
  }, [
    rewardAmountScale,
    rewardCoinsTarget,
    rewardModalScale,
    rewardModalVisible,
  ]);

  if (!routine) return null;

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
    } catch (e) {
      if (__DEV__) console.warn('Haptics error', e);
    }

    if (task && onTaskToggle) {
      onTaskToggle(routine.id, taskId, !task.completed);
    }

    setTasks((prev) => {
      const next = prev.map((t) =>
        t.id === taskId ? { ...t, completed: !t.completed } : t,
      );
      const allDone = next.every((t) => t.completed);
      if (allDone && willBeCompleted && next.length > 0) {
        setCompletedToday(true);
      } else if (!allDone) {
        setCompletedToday(false);
      }
      return next;
    });
  };

  const handleDelete = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    } catch (e) {
      if (__DEV__) console.warn('Haptics error', e);
    }

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
            } catch (e) {
              if (__DEV__) console.warn('Haptics error', e);
            }
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
      : routine.days
          .map((day) => t(DAY_DISPLAY_KEYS[day] ?? day))
          .join(", ");

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
            {!isReadOnly && (
              <View style={styles.headerActions}>
                <Pressable
                  onPress={() => {
                    try {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    } catch (e) {
                      if (__DEV__) console.warn('Haptics error', e);
                    }
                    onEdit?.(routine.id);
                    onClose();
                  }}
                  style={styles.editIconButton}
                >
                <SvgXml
                  xml={`<svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg"><g><path d="M30.47 6.1H32v4.57h-1.53Z" fill="${colors.primary}"/><path d="M28.95 10.67h1.52v1.52h-1.52Z" fill="${colors.primary}"/><path d="M28.95 4.57h1.52V6.1h-1.52Z" fill="${colors.primary}"/><path d="M27.43 12.19h1.52v1.52h-1.52Z" fill="${colors.primary}"/><path d="M27.43 3.05h1.52v1.52h-1.52Z" fill="${colors.primary}"/><path d="M25.9 13.71h1.53v1.53H25.9Z" fill="${colors.primary}"/><path d="M25.9 10.67h1.53v1.52H25.9Z" fill="${colors.primary}"/><path d="M25.9 1.52h1.53v1.53H25.9Z" fill="${colors.primary}"/><path d="M24.38 15.24h1.52v1.52h-1.52Z" fill="${colors.primary}"/><path d="M24.38 9.14h1.52v1.53h-1.52Z" fill="${colors.primary}"/><path d="M22.85 16.76h1.53v1.53h-1.53Z" fill="${colors.primary}"/><path d="M22.85 10.67h1.53v1.52h-1.53Z" fill="${colors.primary}"/><path d="M22.85 7.62h1.53v1.52h-1.53Z" fill="${colors.primary}"/><path d="M21.33 0h4.57v1.52h-4.57Z" fill="${colors.primary}"/><path d="M21.33 18.29h1.52v1.52h-1.52Z" fill="${colors.primary}"/><path d="M21.33 12.19h1.52v1.52h-1.52Z" fill="${colors.primary}"/><path d="M21.33 6.1h1.52v1.52h-1.52Z" fill="${colors.primary}"/><path d="M19.81 19.81h1.52v1.52h-1.52Z" fill="${colors.primary}"/><path d="M19.81 13.71h1.52v1.53h-1.52Z" fill="${colors.primary}"/><path d="M19.81 7.62h1.52v1.52h-1.52Z" fill="${colors.primary}"/><path d="M19.81 4.57h1.52V6.1h-1.52Z" fill="${colors.primary}"/><path d="M19.81 1.52h1.52v1.53h-1.52Z" fill="${colors.primary}"/><path d="M18.28 21.33h1.53v1.53h-1.53Z" fill="${colors.primary}"/><path d="M18.28 15.24h1.53v1.52h-1.53Z" fill="${colors.primary}"/><path d="M18.28 9.14h1.53v1.53h-1.53Z" fill="${colors.primary}"/><path d="M18.28 3.05h1.53v1.52h-1.53Z" fill="${colors.primary}"/><path d="M16.76 22.86h1.52v1.52h-1.52Z" fill="${colors.primary}"/><path d="M16.76 16.76h1.52v1.53h-1.52Z" fill="${colors.primary}"/><path d="M16.76 10.67h1.52v1.52h-1.52Z" fill="${colors.primary}"/><path d="M16.76 4.57h1.52V6.1h-1.52Z" fill="${colors.primary}"/><path d="M15.24 24.38h1.52v1.52h-1.52Z" fill="${colors.primary}"/><path d="M15.24 18.29h1.52v1.52h-1.52Z" fill="${colors.primary}"/><path d="M15.24 12.19h1.52v1.52h-1.52Z" fill="${colors.primary}"/><path d="M15.24 6.1h1.52v1.52h-1.52Z" fill="${colors.primary}"/><path d="M13.71 25.9h1.53v1.53h-1.53Z" fill="${colors.primary}"/><path d="M13.71 19.81h1.53v1.52h-1.53Z" fill="${colors.primary}"/><path d="M13.71 13.71h1.53v1.53h-1.53Z" fill="${colors.primary}"/><path d="M13.71 7.62h1.53v1.52h-1.53Z" fill="${colors.primary}"/><path d="M12.19 27.43h1.52v1.52h-1.52Z" fill="${colors.primary}"/><path d="M12.19 21.33h1.52v1.53h-1.52Z" fill="${colors.primary}"/><path d="M12.19 15.24h1.52v1.52h-1.52Z" fill="${colors.primary}"/><path d="M12.19 9.14h1.52v1.53h-1.52Z" fill="${colors.primary}"/><path d="M10.66 22.86h1.53v1.52h-1.53Z" fill="${colors.primary}"/><path d="M10.66 16.76h1.53v1.53h-1.53Z" fill="${colors.primary}"/><path d="M10.66 10.67h1.53v1.52h-1.53Z" fill="${colors.primary}"/><path d="M10.66 30.48h1.53v-1.53h-1.53v-4.57H7.62v-3.05H3.05v-1.52H1.52v1.52H0V32h10.66Zm-1.52 0H4.57v-1.53H3.05v-1.52H1.52v-4.57h4.57v3.04h3.05Z" fill="${colors.primary}"/><path d="M9.14 18.29h1.52v1.52H9.14Z" fill="${colors.primary}"/><path d="M9.14 12.19h1.52v1.52H9.14Z" fill="${colors.primary}"/><path d="M7.62 19.81h1.52v1.52H7.62Z" fill="${colors.primary}"/><path d="M7.62 13.71h1.52v1.53H7.62Z" fill="${colors.primary}"/><path d="M6.09 15.24h1.53v1.52H6.09Z" fill="${colors.primary}"/><path d="M4.57 16.76h1.52v1.53H4.57Z" fill="${colors.primary}"/><path d="M3.05 18.29h1.52v1.52H3.05Z" fill="${colors.primary}"/></g></svg>`}
                  width={24}
                  height={24}
                />
              </Pressable>
              <Pressable onPress={handleDelete} style={styles.deleteIconButton}>
                <SvgXml
                  xml={`<svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg"><g><path d="m25.905 8.38 0 16.76 1.53 0 0 -16.76 3.04 0 0 -1.52 -1.52 0 0 -1.53 -6.1 0 0 -3.05 -1.52 0 0 3.05 -10.67 0 0 -3.05 -1.52 0 0 3.05 -6.09 0 0 1.53 -1.53 0 0 1.52 3.05 0 0 16.76 1.52 0 0 -16.76 19.81 0z" fill="#F38BA8"/><path d="M24.385 25.14h1.52v4.57h-1.52Z" fill="#F38BA8"/><path d="M7.625 29.71h16.76v1.53H7.625Z" fill="#F38BA8"/><path d="M21.335 11.43h1.52v12.19h-1.52Z" fill="#F38BA8"/><path d="M19.815 23.62h1.52v3.04h-1.52Z" fill="#F38BA8"/><path d="M15.245 11.43h1.52v15.23h-1.52Z" fill="#F38BA8"/><path d="M10.665 0.76h10.67v1.52h-10.67Z" fill="#F38BA8"/><path d="M10.665 23.62h1.53v3.04h-1.53Z" fill="#F38BA8"/><path d="M9.145 11.43h1.52v12.19h-1.52Z" fill="#F38BA8"/><path d="M6.095 25.14h1.53v4.57h-1.53Z" fill="#F38BA8"/></g></svg>`}
                  width={24}
                  height={24}
                />
              </Pressable>
              </View>
            )}
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
                    {/* Hatch celebration — behind the pet */}
                    {showHatchAnim && (
                      <LottieView
                        ref={hatchLottieRef}
                        source={{
                          uri: "https://lottie.host/00209cc7-fa23-41cf-8f33-1b012b69abf6/JblMturQEG.lottie",
                        }}
                        autoPlay
                        loop={false}
                        style={styles.lottieHatchOverlay}
                      />
                    )}
                    <View
                      style={isEvolved ? styles.petImageContainer : styles.eggImageContainer}
                    >
                      <Pressable
                        onPress={() => {
                          if (__DEV__ && !isEvolved && eggData?.routineId && eggXp < EGG_MAX_XP) {
                            useEggStore.getState().debugIncrementXp(eggData.routineId);
                          }
                        }}
                        disabled={!__DEV__ || isEvolved}
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
                      </Pressable>
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
                      /* ── Hatching progress (pre-evolution) ── */
                      <View style={styles.eggProgressWrapper}>
                        {eggXp >= EGG_MAX_XP ? (
                          <Animated.View style={evolveButtonStyle}>
                            <Pressable
                              onPress={() => {
                                if (eggData?.routineId && !evolveAnimatingRef.current) {
                                  evolveAnimatingRef.current = true;
                                  cancelAnimation(evolveButtonScale);
                                  evolveButtonScale.value = withSequence(
                                    withTiming(0.88, { duration: 70 }),
                                    withSpring(1.22, { damping: 6, stiffness: 280 }),
                                    withSpring(1, { damping: 14, stiffness: 200 }),
                                  );
                                  if (evolveResetTimerRef.current) clearTimeout(evolveResetTimerRef.current);
                                  evolveResetTimerRef.current = setTimeout(() => {
                                    evolveAnimatingRef.current = false;
                                  }, 700);
                                  try {
                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
                                    Haptics.notificationAsync(
                                      Haptics.NotificationFeedbackType.Success,
                                    );
                                  } catch (e) {
                                    if (__DEV__) console.warn('Haptics error', e);
                                  }
                                  useEggStore.getState().evolveEgg(eggData.routineId);
                                  setShowHatchAnim(true);
                                  if (hatchAnimTimerRef.current) clearTimeout(hatchAnimTimerRef.current);
                                  hatchAnimTimerRef.current = setTimeout(() => setShowHatchAnim(false), 3500);
                                }
                              }}
                              style={styles.hatchBarButton}
                            >
                              <View style={styles.hatchBarInner}>
                                <Text style={styles.hatchBarText}>
                                  {t("routine_detail.hatch")}
                                </Text>
                              </View>
                            </Pressable>
                          </Animated.View>
                        ) : (
                          <>
                            <View style={styles.eggProgressBarShell}>
                              <Image
                                source={
                                  eggXp === 0
                                    ? require("../../assets/images/expBarEmpty.png")
                                    : eggXp === 1
                                      ? require("../../assets/images/expBar1.png")
                                      : eggXp === 2
                                        ? require("../../assets/images/expBar2.png")
                                        : require("../../assets/images/expBar3.png")
                                }
                                style={styles.eggProgressBgImage}
                                resizeMode="stretch"
                              />
                            </View>
                            <Text style={styles.eggProgressHint}>
                              {t("routine_detail.hatch_hint", {
                                days: EGG_MAX_XP,
                              })}
                            </Text>
                          </>
                        )}
                      </View>
                    ) : (
                      /* ── Pet XP bar (post-evolution) ── */
                      <View style={styles.petXpWrapper}>
                        <View style={styles.petXpHeader}>
                          <Text style={styles.petXpLabel}>
                            {t("routine_detail.pet_xp")}
                          </Text>
                          <Text style={styles.petXpValue}>
                            {petXp} / {cumulativeXpTarget}
                          </Text>
                        </View>
                        <View style={styles.petXpBarRow}>
                          <View style={styles.petXpBarTrack}>
                            <Image
                              source={
                                petXp === 0
                                  ? require("../../assets/images/expBarEmpty.png")
                                  : petXp < cumulativeXpTarget * 0.34
                                    ? require("../../assets/images/expBar1.png")
                                    : petXp < cumulativeXpTarget * 0.67
                                      ? require("../../assets/images/expBar2.png")
                                      : require("../../assets/images/expBar3.png")
                              }
                              style={styles.petXpBgImage}
                              resizeMode="stretch"
                            />
                          </View>
                          <Animated.View style={chestStyle}>
                            <Pressable
                              disabled={!canLevelUp}
                              onPress={() => {
                                if (eggData?.routineId && canLevelUp && !chestAnimatingRef.current) {
                                  chestAnimatingRef.current = true;
                                  cancelAnimation(chestScale);
                                  chestScale.value = withSequence(
                                    withTiming(0.85, { duration: 60 }),
                                    withSpring(1.25, { damping: 5, stiffness: 260 }),
                                    withSpring(1, { damping: 14, stiffness: 200 }),
                                  );
                                  if (chestResetTimerRef.current) clearTimeout(chestResetTimerRef.current);
                                  chestResetTimerRef.current = setTimeout(() => { chestAnimatingRef.current = false; }, 700);
                                  useEggStore
                                    .getState()
                                    .claimPetLevelUp(eggData.routineId);
                                  // Coins scale by chest level: 200 at L1, +150 per level, capped at L7 (1100)
                                  const chestLevel = Math.min(safePetLevel, 7);
                                  const coinsForLevel = (chestLevel - 1) * 150 + 200;
                                  useAchievementsStore
                                    .getState()
                                    .addCoins(coinsForLevel);
                                  setRewardCoinsDisplay(0);
                                  setRewardCoinsTarget(coinsForLevel);
                                  setRewardModalVisible(true);
                                  try {
                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
                                    Haptics.notificationAsync(
                                      Haptics.NotificationFeedbackType.Success,
                                    );
                                  } catch (e) {
                                    if (__DEV__) console.warn('Haptics error', e);
                                  }
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
                  {t("routine_detail.pet_tab")}
                </Text>
                <Text
                  style={[
                    styles.carouselTabLabel,
                    carouselPage === 1 ? styles.carouselTabLabelActive : null,
                  ]}
                >
                  {t("routine_detail.history_tab")}
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

            {rewardModalVisible && (
              <View style={styles.rewardModalBackdrop}>
                <Pressable
                  style={styles.rewardModalDismissLayer}
                  onPress={() => setRewardModalVisible(false)}
                />
                <Animated.View
                  entering={FadeInDown.duration(260)}
                  style={[styles.rewardModalCard, rewardModalCardAnimatedStyle]}
                >
                  <View style={styles.rewardModalGlow} />
                  <View style={[styles.rewardSparkle, styles.rewardSparkleTopLeft]} />
                  <View style={[styles.rewardSparkle, styles.rewardSparkleTopRight]} />
                  <View style={[styles.rewardSparkle, styles.rewardSparkleBottomLeft]} />
                  <View style={[styles.rewardSparkle, styles.rewardSparkleBottomRight]} />
                  <View style={styles.rewardModalHeaderBadge}>
                    <Crown size={20} color={colors.surface} strokeWidth={2.5} />
                  </View>
                  <Text style={styles.rewardModalEyebrow}>
                    {t("routine_detail.reward_eyebrow")}
                  </Text>
                  <Text style={styles.rewardModalTitle}>
                    {t("routine_detail.reward_title")}
                  </Text>
                  <Animated.View
                    style={[styles.rewardAmountRow, rewardAmountAnimatedStyle]}
                  >
                    <Crown size={20} color={colors.surface} strokeWidth={2.5} />
                    <Text style={styles.rewardAmountValue}>{rewardCoinsDisplay}</Text>
                  </Animated.View>
                  <Text style={styles.rewardModalCaption}>
                    {t("routine_detail.reward_caption")}
                  </Text>
                  <Pressable
                    onPress={() => setRewardModalVisible(false)}
                    style={styles.rewardModalButton}
                  >
                    <Text style={styles.rewardModalButtonText}>
                      {t("routine_detail.reward_cta")}
                    </Text>
                  </Pressable>
                </Animated.View>
              </View>
            )}
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
  headerIcon: {
    width: 24,
    height: 24,
  },
  scrollContent: {
    flex: 1,
  },
  scrollContentContainer: {
    paddingBottom: 40,
  },
  rewardModalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
    zIndex: 40,
  },
  rewardModalDismissLayer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(12, 16, 28, 0.62)",
  },
  rewardModalCard: {
    width: "100%",
    maxWidth: 340,
    borderWidth: 4,
    borderColor: "#3C2B12",
    backgroundColor: "#C98C11",
    padding: 6,
    shadowColor: "#1C1204",
    shadowOffset: { width: 6, height: 6 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 10,
    overflow: "hidden",
  },
  rewardModalGlow: {
    position: "absolute",
    top: -40,
    right: -10,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "rgba(255, 228, 149, 0.28)",
  },
  rewardSparkle: {
    position: "absolute",
    width: 10,
    height: 10,
    backgroundColor: "#FFEAA1",
    borderWidth: 2,
    borderColor: "#5B3900",
    opacity: 0.95,
  },
  rewardSparkleTopLeft: {
    top: 26,
    left: 22,
  },
  rewardSparkleTopRight: {
    top: 74,
    right: 28,
  },
  rewardSparkleBottomLeft: {
    bottom: 92,
    left: 30,
  },
  rewardSparkleBottomRight: {
    bottom: 120,
    right: 24,
  },
  rewardModalHeaderBadge: {
    alignSelf: "center",
    width: 52,
    height: 52,
    borderWidth: 3,
    borderColor: "#5B3900",
    backgroundColor: "#F4C542",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
    marginBottom: 12,
  },
  rewardModalEyebrow: {
    fontFamily: "Jersey10",
    fontSize: 20,
    color: "#5B3900",
    textAlign: "center",
    letterSpacing: 2,
    opacity: 0.9,
  },
  rewardModalTitle: {
    fontFamily: "Jersey10",
    fontSize: 38,
    lineHeight: 38,
    color: colors.surface,
    textAlign: "center",
    letterSpacing: 2,
    marginTop: 4,
  },
  rewardAmountRow: {
    marginTop: 18,
    marginBottom: 10,
    minHeight: 72,
    borderWidth: 3,
    borderColor: "#5B3900",
    backgroundColor: "rgba(255, 243, 196, 0.28)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  rewardAmountValue: {
    fontFamily: "Jersey10",
    fontSize: 52,
    lineHeight: 52,
    color: colors.surface,
    letterSpacing: 2,
  },
  rewardModalCaption: {
    fontSize: 13,
    lineHeight: 18,
    color: "#FFF7E1",
    textAlign: "center",
    paddingHorizontal: 12,
    marginBottom: 16,
    opacity: 0.92,
  },
  rewardModalButton: {
    borderWidth: 3,
    borderColor: "#5B3900",
    backgroundColor: "#F4C542",
    minHeight: 54,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  rewardModalButtonText: {
    fontFamily: "Jersey10",
    fontSize: 30,
    lineHeight: 30,
    color: "#5B3900",
    letterSpacing: 2,
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
    position: "relative",
  },
  taskPillSvg: {
    position: "absolute",
    top: 0,
    left: 0,
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
    fontFamily: "Jersey10",
    fontSize: 18,
    fontWeight: "500",
    color: "#000000",
    opacity: 0.8,
    flex: 1,
  },
  taskLabelCompleted: {
    color: colors.background,
    textDecorationLine: "line-through",
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
  lottieHatchOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0,
    pointerEvents: "none",
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
    width: "88%",
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
  eggProgressWrapper: {
    width: "100%",
    marginTop: 6,
    marginBottom: 2,
  },
  eggProgressBarShell: {
    width: "100%",
  },
  eggProgressBgImage: {
    width: "100%",
    height: 48,
  },
  eggProgressHint: {
    fontSize: 11,
    fontWeight: "500",
    color: colors.surface,
    opacity: 0.42,
    textAlign: "center",
    marginTop: 4,
  },
  hatchBarButton: {
    borderWidth: 4,
    borderColor: "#73510E",
    backgroundColor: "#C98C11",
    padding: 4,
    shadowColor: "#5F420A",
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 4,
  },
  hatchBarInner: {
    minHeight: 62,
    backgroundColor: "#F4C542",
    alignItems: "center",
    justifyContent: "center",
  },
  hatchBarText: {
    fontSize: 34,
    lineHeight: 34,
    fontFamily: "Jersey10",
    color: "#5B3900",
    letterSpacing: 2,
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
  },
  petXpBgImage: {
    width: "100%",
    height: 28,
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
