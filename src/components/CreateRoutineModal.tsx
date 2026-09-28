import { colors } from "@/constants/theme";
import { AppText as Text } from "@/src/components/AppText";
import DateTimePicker from "@react-native-community/datetimepicker";
import * as Haptics from "expo-haptics";
import {
    GripVertical,
    Plus,
    Trash2,
    X,
} from "lucide-react-native";
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
    Alert,
    Image,
    Keyboard,
    KeyboardAvoidingView,
    Modal,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    TextInput,
    View,
} from "react-native";
import DraggableFlatList, {
    RenderItemParams,
    ScaleDecorator,
} from "react-native-draggable-flatlist";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Path, SvgXml } from "react-native-svg";
import { pixelButtonPath } from "@/src/features/onboarding/components/pixelGeometry";
import Animated, { SlideInRight, useSharedValue, useAnimatedStyle, withRepeat, withSequence, withTiming, withDelay } from "react-native-reanimated";
import ChevronLeftIcon from "@/src/features/onboarding/components/ChevronLeftIcon";
import PixelCTAButton from "@/src/features/onboarding/components/PixelCTAButton";
import { useEggCatalog } from "@/src/hooks/useEggCatalog";
import {
    EggId,
    useEggStore,
} from "@/src/store/eggStore";
import { useAchievementsStore } from "@/src/store/achievementsStore";
import { PaywallModal } from "@/src/components/PaywallModal";
import { useProStore } from "@/src/store/proStore";

interface Task {
  id: string;
  title: string;
}

interface CreateRoutineModalProps {
  visible: boolean;
  onClose: () => void;
  onCreateRoutine: (routine: {
    name: string;
    days: string[];
    tasks: Task[];
    reminderEnabled: boolean;
    reminderTime?: string;
    icon?: string;
    eggId?: EggId;
  }) => void;
}

const DAYS_OF_WEEK = [
  { short: "Dom", i18nKey: "days.sun_abbr" },
  { short: "Lun", i18nKey: "days.mon_abbr" },
  { short: "Mar", i18nKey: "days.tue_abbr" },
  { short: "Mié", i18nKey: "days.wed_abbr" },
  { short: "Jue", i18nKey: "days.thu_abbr" },
  { short: "Vie", i18nKey: "days.fri_abbr" },
  { short: "Sáb", i18nKey: "days.sat_abbr" },
];

const PLACEHOLDER_TEXT_KEYS = [
  "routine_form.name_placeholder_0",
  "routine_form.name_placeholder_1",
  "routine_form.name_placeholder_2",
];

const RARITY_MEDAL_IMAGES = {
  common: require("../../assets/images/pets/rarities/common.png"),
  rare: require("../../assets/images/pets/rarities/rare.png"),
  legendary: require("../../assets/images/pets/rarities/legendary.png"),
} as const;

const EGG_DISPLAY_NAMES: Record<number, string> = {
  1: "Mochi", 2: "Pip", 3: "Bao", 4: "Miso", 5: "Nimo", 6: "Dot",
  7: "Kobo", 8: "Yumi", 9: "Momo", 10: "Kiwi", 11: "Bibi", 12: "Tako",
  13: "Nubi", 14: "Poko", 15: "Zumo", 16: "Lumi", 17: "Xion", 18: "Nano",
};

const generateId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 9);
};

const PIXEL_BTN_SHADOW = 3;
const CHECK_PATH =
  "M10 18H8v-2h2v2Zm-2-2H6v-2h2v2Zm4-2v2h-2v-2h2Zm-6 0H4v-2h2v2Zm8 0h-2v-2h2v2Zm2-2h-2v-2h2v2Zm2-2h-2V8h2v2Zm2-2h-2V6h2v2Z";

const ALERT_BELL_XML = `<svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg"><path d="M30.47 25.9H32v3.05h-1.53Z" fill="currentColor"/><path d="M30.47 3.05H32V6.1h-1.53Z" fill="currentColor"/><path d="M28.95 28.95h1.52v1.53h-1.52Z" fill="currentColor"/><path d="M28.95 1.52h1.52v1.53h-1.52Z" fill="currentColor"/><path d="M27.43 25.9h1.52v1.53h-1.52Z" fill="currentColor"/><path d="M27.43 19.81h1.52v3.05h-1.52Z" fill="currentColor"/><path d="M27.43 4.57h1.52V6.1h-1.52Z" fill="currentColor"/><path d="M25.9 0h3.05v1.52H25.9Z" fill="currentColor"/><path d="M25.9 30.48h3.05V32H25.9Z" fill="currentColor"/><path d="M25.9 27.43h1.53v1.52H25.9Z" fill="currentColor"/><path d="M25.9 22.86h1.53v1.52H25.9Z" fill="currentColor"/><path d="M25.9 18.29h1.53v1.52H25.9Z" fill="currentColor"/><path d="M25.9 3.05h1.53v1.52H25.9Z" fill="currentColor"/><path d="M22.85 24.38h3.05v1.52h-3.05Z" fill="currentColor"/><path d="M24.38 10.67h1.52v7.62h-1.52Z" fill="currentColor"/><path d="M22.85 21.33h1.53v1.53h-1.53Z" fill="currentColor"/><path d="M22.85 7.62h1.53v3.05h-1.53Z" fill="currentColor"/><path d="m9.14 21.33 3.05 0 0 1.53 1.52 0 0 1.52 4.57 0 0 -1.52 1.53 0 0 -1.53 3.04 0 0 -1.52 -13.71 0 0 1.52z" fill="currentColor"/><path d="M21.33 6.1h1.52v1.52h-1.52Z" fill="currentColor"/><path d="M9.14 25.9h13.71v1.53H9.14Z" fill="currentColor"/><path d="M18.28 4.57h3.05V6.1h-3.05Z" fill="currentColor"/><path d="M13.71 3.05h4.57v1.52h-4.57Z" fill="currentColor"/><path d="M10.66 4.57h3.05V6.1h-3.05Z" fill="currentColor"/><path d="M9.14 6.1h1.52v1.52H9.14Z" fill="currentColor"/><path d="M6.09 24.38h3.05v1.52H6.09Z" fill="currentColor"/><path d="M7.62 21.33h1.52v1.53H7.62Z" fill="currentColor"/><path d="M7.62 7.62h1.52v3.05H7.62Z" fill="currentColor"/><path d="M6.09 10.67h1.53v7.62H6.09Z" fill="currentColor"/><path d="M4.57 27.43h1.52v1.52H4.57Z" fill="currentColor"/><path d="M4.57 22.86h1.52v1.52H4.57Z" fill="currentColor"/><path d="M4.57 18.29h1.52v1.52H4.57Z" fill="currentColor"/><path d="M4.57 3.05h1.52v1.52H4.57Z" fill="currentColor"/><path d="M3.05 0h3.04v1.52H3.05Z" fill="currentColor"/><path d="M3.05 30.48h3.04V32H3.05Z" fill="currentColor"/><path d="M3.05 25.9h1.52v1.53H3.05Z" fill="currentColor"/><path d="M3.05 19.81h1.52v3.05H3.05Z" fill="currentColor"/><path d="M3.05 4.57h1.52V6.1H3.05Z" fill="currentColor"/><path d="M1.52 28.95h1.53v1.53H1.52Z" fill="currentColor"/><path d="M1.52 1.52h1.53v1.53H1.52Z" fill="currentColor"/><path d="M0 25.9h1.52v3.05H0Z" fill="currentColor"/><path d="M0 3.05h1.52V6.1H0Z" fill="currentColor"/></svg>`;

function PixelDayButton({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  const [side, setSide] = useState(0);
  const [pressed, setPressed] = useState(false);
  const fillColor = selected ? colors.primary : colors.background;
  const borderColor = selected ? colors.primary : "#FFFFFF";

  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      style={styles.pixelDayRoot}
    >
      <Text
        style={[
          styles.pixelDayText,
          { color: selected ? colors.primary : "#FFFFFF" },
        ]}
        numberOfLines={1}
      >
        {label}
      </Text>
      <View
        style={styles.pixelDayContainer}
        onLayout={(e) => {
          const w = e.nativeEvent.layout.width;
          if (w > 0) setSide(w);
        }}
      >
        {side > 0 && (
          <>
            <Svg
              style={styles.pixelDaySvg}
              width={side + PIXEL_BTN_SHADOW}
              height={side + PIXEL_BTN_SHADOW}
              viewBox={`0 0 ${side + PIXEL_BTN_SHADOW} ${side + PIXEL_BTN_SHADOW}`}
            >
              {!pressed && (
                <Path
                  d={pixelButtonPath(side, side)}
                  fill={SHADOW_COLOR}
                  transform={`translate(${PIXEL_BTN_SHADOW} ${PIXEL_BTN_SHADOW})`}
                />
              )}
              <Path
                d={pixelButtonPath(side, side)}
                fill={fillColor}
                stroke={borderColor}
                strokeWidth={2}
                transform={
                  pressed
                    ? `translate(${PIXEL_BTN_SHADOW} ${PIXEL_BTN_SHADOW})`
                    : undefined
                }
              />
            </Svg>
            {selected && (
              <View style={styles.pixelDayCheck} pointerEvents="none">
                <Svg
                  width={side * 0.45}
                  height={side * 0.45}
                  viewBox="0 0 24 24"
                >
                  <Path d={CHECK_PATH} fill={colors.background} />
                </Svg>
              </View>
            )}
          </>
        )}
      </View>
    </Pressable>
  );
}

const SHADOW_COLOR = "#0a0a0a";

export const CreateRoutineModal: React.FC<CreateRoutineModalProps> = ({
  visible,
  onClose,
  onCreateRoutine,
}) => {
  const { t, i18n } = useTranslation();
  const PLACEHOLDER_TEXTS = useMemo(
    () => PLACEHOLDER_TEXT_KEYS.map((key) => t(key)),
    [i18n.language],
  );
  const [routineName, setRoutineName] = useState("");
  const [selectedDays, setSelectedDays] = useState<string[]>(["Dom"]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [reminderTime, setReminderTime] = useState(new Date());
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [displayedText, setDisplayedText] = useState("");
  const [eggIndex, setEggIndex] = useState(0);
  const taskInputRefs = useRef<{ [key: string]: TextInput | null }>({});
  const nameInputRef = useRef<TextInput | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedEggId, setSelectedEggId] = useState<EggId | null>(null);
  const catalog = useEggCatalog();
  const storeEggs = useEggStore((s) => s.eggs);

  const availableCatalog = React.useMemo(
    () =>
      catalog.filter((egg) => {
        const storeEgg = storeEggs.find((e) => e.id === egg.id);
        if (!storeEgg) return true;
        return !(storeEgg.unlocked && !!storeEgg.routineId);
      }),
    [catalog, storeEggs],
  );
  const totalCoins = useAchievementsStore((s) => s.totalCoins);
  const spendCoins = useAchievementsStore((s) => s.spendCoins);
  const isPro = useProStore((s) => s.isPro);
  const [showPaywall, setShowPaywall] = useState(false);
  const [reminderCardSize, setReminderCardSize] = useState({ w: 0, h: 0 });
  const [purchasing, setPurchasing] = useState(false);
  const [taskItemSizes, setTaskItemSizes] = useState<Record<string, { w: number; h: number }>>({});
  const [newTaskId, setNewTaskId] = useState<string | null>(null);
  const insets = useSafeAreaInsets();

  const storeLockerImg = require("../../assets/images/store_Locker.png");

  const eggWobbleX = useSharedValue(0);
  const eggWobbleR = useSharedValue(0);

  const [currentStep, setCurrentStep] = useState(0);

  React.useEffect(() => {
    if (currentStep !== 4) return;
    eggWobbleX.value = 0;
    eggWobbleR.value = 0;
    eggWobbleX.value = withDelay(
      600,
      withRepeat(
        withSequence(
          withTiming(3, { duration: 120 }),
          withTiming(-3, { duration: 120 }),
          withTiming(2, { duration: 120 }),
          withTiming(-2, { duration: 120 }),
          withTiming(0, { duration: 120 }),
        ),
        -1,
        true,
      ),
    );
    eggWobbleR.value = withDelay(
      600,
      withRepeat(
        withSequence(
          withTiming(2, { duration: 150 }),
          withTiming(-2, { duration: 150 }),
          withTiming(1.5, { duration: 150 }),
          withTiming(-1.5, { duration: 150 }),
          withTiming(0, { duration: 150 }),
        ),
        -1,
        true,
      ),
    );
  }, [currentStep]);

  const eggWobbleStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: eggWobbleX.value },
      { rotate: `${eggWobbleR.value}deg` },
    ],
  }));

  const triggerHaptic = (style: "light" | "medium" | "selection" = "light") => {
    if (style === "selection") Haptics.selectionAsync();
    else if (style === "medium")
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    else Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const typingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const advanceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useLayoutEffect(() => {
    if (!visible) return;
    const firstTask: Task = { id: generateId(), title: "" };
    setRoutineName("");
    setSelectedDays(["Dom"]);
    setTasks([firstTask]);
    setEditingTaskId(firstTask.id);
    setReminderEnabled(false);
    setReminderTime(new Date());
    setShowTimePicker(false);
    setHasUnsavedChanges(false);
    taskInputRefs.current = {};
    setSelectedEggId(null);
    setShowPaywall(false);
    setPurchasing(false);
    setCurrentStep(0);
    setEggIndex(0);
    setTimeout(() => nameInputRef.current?.focus(), 400);
  }, [visible]);

  useEffect(() => {
    if (!visible) return;

    let idx = 0;
    let charIdx = 0;
    let active = true;

    const typeNext = () => {
      if (!active) return;
      if (typingTimerRef.current) clearInterval(typingTimerRef.current);
      if (advanceTimerRef.current) clearTimeout(advanceTimerRef.current);
      charIdx = 0;
      setDisplayedText("");
      const target = PLACEHOLDER_TEXTS[idx];
      if (!target) return;
      typingTimerRef.current = setInterval(() => {
        if (!active) { clearInterval(typingTimerRef.current!); return; }
        if (charIdx < target.length) {
          charIdx++;
          setDisplayedText(target.slice(0, charIdx));
        } else {
          clearInterval(typingTimerRef.current!);
          typingTimerRef.current = null;
          advanceTimerRef.current = setTimeout(() => {
            idx = (idx + 1) % PLACEHOLDER_TEXTS.length;
            typeNext();
          }, 2000);
        }
      }, 50);
    };

    typeNext();

    return () => {
      active = false;
      if (typingTimerRef.current) clearInterval(typingTimerRef.current);
      if (advanceTimerRef.current) clearTimeout(advanceTimerRef.current);
      typingTimerRef.current = null;
      advanceTimerRef.current = null;
    };
  }, [visible]);

  useEffect(() => {
    if (!visible) return;

    const hasContent =
      routineName.trim() !== "" ||
      tasks.some((t) => t.title.trim() !== "") ||
      selectedDays.length > 1 ||
      !selectedDays.includes("Dom") ||
      reminderEnabled;

    setHasUnsavedChanges(hasContent);
  }, [routineName, selectedDays, tasks, reminderEnabled]);

  const handleAddTask = () => {
    const newTask: Task = {
      id: generateId(),
      title: "",
    };

    setTasks((prev) => [...prev, newTask]);
    setEditingTaskId(newTask.id);
    setNewTaskId(newTask.id);
    triggerHaptic("light");
  };

  const handleUpdateTask = (taskId: string, newTitle: string) => {
    setTasks((prev) =>
      prev.map((task) =>
        task.id === taskId ? { ...task, title: newTitle } : task,
      ),
    );
  };

  const handleToggleDay = (day: string) => {
    setSelectedDays((prev) => {
      if (prev.includes(day)) {
        if (prev.length === 1) return prev;
        return prev.filter((d) => d !== day);
      } else {
        return [...prev, day];
      }
    });
    triggerHaptic("selection");
  };

  const handleRemoveTask = (taskId: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
    delete taskInputRefs.current[taskId];
    triggerHaptic("medium");
  };

  const handleTimeChange = (event: any, selectedTime?: Date) => {
    if (Platform.OS === "android") {
      setShowTimePicker(false);
    }
    if (selectedTime) {
      setReminderTime(selectedTime);
    }
  };

  const handleCreateRoutine = (eggIdOverride?: EggId) => {
    const validTasks = tasks.filter((task) => task.title.trim() !== "");

    if (
      routineName.trim() &&
      validTasks.length > 0 &&
      selectedDays.length > 0
    ) {
      triggerHaptic("medium");
      const hh = String(reminderTime.getHours()).padStart(2, "0");
      const mm = String(reminderTime.getMinutes()).padStart(2, "0");
      const timeString = `${hh}:${mm}`;

      onCreateRoutine({
        name: routineName,
        days: selectedDays,
        tasks: validTasks,
        reminderEnabled,
        reminderTime: reminderEnabled ? timeString : undefined,
        icon: "Dumbbell",
        eggId: eggIdOverride ?? selectedEggId ?? undefined,
      });

      setRoutineName("");
      setSelectedDays(["Dom"]);
      setTasks([]);
      setReminderEnabled(false);
      setReminderTime(new Date());
      setEditingTaskId(null);
      taskInputRefs.current = {};
      setHasUnsavedChanges(false);
      onClose();
    }
  };

  const handleClose = () => {
    if (hasUnsavedChanges) {
      Alert.alert(
        t("routine_form.discard_title"),
        t("routine_form.discard_message"),
        [
          { text: t("routine_form.cancel"), style: "cancel" },
          {
            text: t("routine_form.discard"),
            style: "destructive",
            onPress: () => {
              setEditingTaskId(null);
              setHasUnsavedChanges(false);
              onClose();
            },
          },
        ],
      );
    } else {
      setEditingTaskId(null);
      onClose();
    }
  };

  const dismissKeyboard = () => {
    Keyboard.dismiss();
    setEditingTaskId(null);
  };

  const formatTime = (date: Date) => {
    const hh = String(date.getHours()).padStart(2, "0");
    const mm = String(date.getMinutes()).padStart(2, "0");
    return `${hh}:${mm}`;
  };

  const canProceed = (): boolean => {
    switch (currentStep) {
      case 0:
        return routineName.trim().length > 0;
      case 1:
        return selectedDays.length > 0;
      case 2:
        return tasks.some((task) => task.title.trim() !== "");
      case 3:
        return true;
      case 4:
        return true;
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (currentStep < 4 && canProceed()) {
      setCurrentStep((prev) => prev + 1);
      dismissKeyboard();
      triggerHaptic("light");
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
      dismissKeyboard();
      triggerHaptic("light");
    }
  };

  const handleEggStepCTA = () => {
    if (purchasing) return;
    const meta = availableCatalog[eggIndex];
    if (!meta) return;

    const eggData = storeEggs.find((e) => e.id === meta.id);
    const isUnlocked = eggData?.unlocked ?? false;
    const inUse = isUnlocked && !!eggData?.routineId;
    const requiresPro = meta.rarity !== "common";

    if (inUse) {
      Alert.alert(
        meta.name,
        t("routine_form.busy"),
        [{ text: t("routine_form.ok"), style: "cancel" }],
      );
      return;
    }

    if (!isUnlocked) {
      if (requiresPro && !isPro) {
        setShowPaywall(true);
        return;
      }

      const canAfford = totalCoins >= meta.cost;
      Alert.alert(
        meta.name,
        canAfford
          ? t("routine_form.unlock_for_crowns", { cost: meta.cost.toLocaleString(), total: totalCoins.toLocaleString() })
          : t("routine_form.not_enough_crowns", { cost: meta.cost.toLocaleString(), total: totalCoins.toLocaleString() }),
        canAfford
          ? [
              { text: t("routine_form.cancel"), style: "cancel" },
              {
                text: t("routine_form.buy_for_crowns", { cost: meta.cost.toLocaleString() }),
                onPress: async () => {
                  setPurchasing(true);
                  try {
                    const ok = await spendCoins(meta.cost);
                    if (ok) {
                      useEggStore.getState().unlockEgg(meta.id as EggId);
                      setSelectedEggId(meta.id as EggId);
                      triggerHaptic("medium");
                      handleCreateRoutine(meta.id as EggId);
                    }
                  } finally {
                    setPurchasing(false);
                  }
                },
              },
            ]
          : [{ text: t("routine_form.ok"), style: "cancel" }],
      );
      return;
    }

    handleCreateRoutine(meta.id as EggId);
  };

  const STEP_TITLES = [
    t("routine_form.name_label"),
    t("routine_form.which_days"),
    t("routine_form.routine_tasks"),
    t("routine_form.reminder_question"),
    t("routine_form.choose_companion"),
  ];

  const STEP_SUBTITLES = [
    t("routine_form.step_name_subtitle"),
    t("routine_form.step_days_subtitle"),
    t("routine_form.step_tasks_subtitle"),
    t("routine_form.step_reminder_subtitle"),
    t("routine_form.step_egg_subtitle"),
  ];

  const renderTaskItem = useCallback(
    ({ item, drag, isActive, getIndex }: RenderItemParams<Task>) => {
      const index = getIndex() ?? 0;
      const isEditing = editingTaskId === item.id;
      const isLastItem = index === tasks.length - 1;
      const size = taskItemSizes[item.id];
      const isNew = item.id === newTaskId;

      return (
        <ScaleDecorator>
          <View
            onLayout={(e) => {
              const { width, height } = e.nativeEvent.layout;
              setTaskItemSizes((prev) => {
                if (prev[item.id]?.w === width && prev[item.id]?.h === height) return prev;
                return { ...prev, [item.id]: { w: width, h: height } };
              });
            }}
            style={styles.taskItemOuter}
          >
            {size && (
              <Svg
                style={styles.taskItemSvg}
                width={size.w + PIXEL_BTN_SHADOW}
                height={size.h + PIXEL_BTN_SHADOW}
                viewBox={`0 0 ${size.w + PIXEL_BTN_SHADOW} ${size.h + PIXEL_BTN_SHADOW}`}
              >
                <Path
                  d={pixelButtonPath(size.w, size.h)}
                  fill={SHADOW_COLOR}
                  transform={`translate(${PIXEL_BTN_SHADOW} ${PIXEL_BTN_SHADOW})`}
                />
                <Path
                  d={pixelButtonPath(size.w, size.h)}
                  fill="#FFFFFF"
                  stroke="transparent"
                  strokeWidth={2}
                />
              </Svg>
            )}
            <View style={styles.taskItemInner}>
              <Pressable
                onLongPress={() => {
                  if (!isEditing) {
                    triggerHaptic("medium");
                    drag();
                  }
                }}
                onPressIn={drag}
                style={styles.dragHandle}
                disabled={isEditing}
              >
                <GripVertical size={18} color={colors.textSecondary} />
              </Pressable>

              <TextInput
                ref={(ref) => {
                  if (ref) {
                    taskInputRefs.current[item.id] = ref;
                  } else {
                    delete taskInputRefs.current[item.id];
                  }
                }}
                style={[
                  styles.taskItemText,
                  !item.title && styles.taskItemTextEmpty,
                ]}
                value={item.title}
                onChangeText={(text) => {
                  handleUpdateTask(item.id, text);
                  if (item.id === newTaskId && text.length > 0) setNewTaskId(null);
                }}
                placeholder={t("routine_form.empty_task")}
                placeholderTextColor="#00000099"
                onFocus={() => setEditingTaskId(item.id)}
                autoFocus={isEditing}
                multiline={false}
                blurOnSubmit={false}
              />

              {isLastItem ? (
                <Pressable
                  onPress={handleAddTask}
                  style={styles.addTaskButtonInline}
                >
                  <Plus size={24} color={colors.background} strokeWidth={3} />
                </Pressable>
              ) : (
                <Pressable
                  onPress={() => handleRemoveTask(item.id)}
                  style={styles.actionIcon}
                  hitSlop={10}
                  disabled={isDragging || isActive}
                >
                  <Trash2
                    size={18}
                    color="#FF0000"
                    opacity={0.35}
                  />
                </Pressable>
              )}
            </View>
          </View>
        </ScaleDecorator>
      );
    },
    [tasks, editingTaskId, isDragging, handleUpdateTask, handleAddTask, handleRemoveTask, newTaskId],
  );

  const isValid =
    routineName.trim().length > 0 &&
    tasks.filter((t) => t.title.trim()).length > 0 &&
    selectedDays.length > 0;

  return (
    <Modal
      visible={visible}
      transparent={false}
      animationType="slide"
      onRequestClose={handleClose}
    >
      <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.background }}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.keyboardAvoidingView}
          keyboardVerticalOffset={insets.top}
        >
          <View style={styles.screen}>
            <View
              style={[
                styles.header,
                { paddingTop: Math.max(insets.top, 16) },
              ]}
            >
              {currentStep > 0 ? (
                <Pressable onPress={handleBack} style={styles.backButton}>
                  <ChevronLeftIcon color={colors.textPrimary} size={28} />
                </Pressable>
              ) : (
                <View style={{ width: 32 }} />
              )}

              <View style={styles.dotsContainer}>
                {[0, 1, 2, 3, 4].map((i) => (
                  <View
                    key={i}
                    style={[
                      styles.dot,
                      i === currentStep && styles.dotActive,
                    ]}
                  />
                ))}
              </View>

              <Pressable onPress={handleClose} style={styles.closeButton}>
                <X size={24} color={colors.textPrimary} />
              </Pressable>
            </View>

            <View
              style={[
                styles.stepHeaderContainer,
                currentStep === 0 && { alignItems: "center" },
              ]}
            >
              <Text style={styles.stepTitle}>{STEP_TITLES[currentStep]}</Text>
              {currentStep !== 0 && (
                <Text style={styles.stepSubtitle}>
                  {STEP_SUBTITLES[currentStep]}
                </Text>
              )}
            </View>

            <Animated.View
              key={currentStep}
              entering={SlideInRight.duration(300)}
              style={{ flex: 1 }}
            >
              {currentStep === 0 && (
                <View style={{ flex: 1, justifyContent: "center" }}>
                  <ScrollView
                    contentContainerStyle={styles.nameStepContent}
                    keyboardShouldPersistTaps="always"
                    showsVerticalScrollIndicator={false}
                  >
                  <View style={styles.nameInputWrapper}>
                    {!routineName && !!displayedText && (
                      <Text
                        style={styles.namePlaceholder}
                        pointerEvents="none"
                      >
                        {displayedText}
                      </Text>
                    )}
                    <TextInput
                      ref={nameInputRef}
                      style={styles.nameInput}
                      value={routineName}
                      onChangeText={setRoutineName}
                      textAlign="center"
                    />
                  </View>
                  </ScrollView>
                </View>
              )}

              {currentStep === 1 && (
                <ScrollView
                  contentContainerStyle={styles.stepContent}
                  keyboardShouldPersistTaps="always"
                  showsVerticalScrollIndicator={false}
                >
                  <View style={styles.daysRow}>
                    {DAYS_OF_WEEK.map((day) => {
                      const isSelected = selectedDays.includes(day.short);
                      return (
                        <PixelDayButton
                          key={day.short}
                          label={t(day.i18nKey)}
                          selected={isSelected}
                          onPress={() => {
                            handleToggleDay(day.short);
                            dismissKeyboard();
                          }}
                        />
                      );
                    })}
                  </View>
                </ScrollView>
              )}

              {currentStep === 2 && (
                <DraggableFlatList
                  data={tasks}
                  onDragBegin={() => setIsDragging(true)}
                  onDragEnd={({ data }) => {
                    setIsDragging(false);
                    setTasks(data);
                    triggerHaptic("medium");
                  }}
                  keyExtractor={(item) => item.id}
                  renderItem={renderTaskItem}
                  contentContainerStyle={styles.stepContent}
                  showsVerticalScrollIndicator={false}
                  keyboardShouldPersistTaps="always"
                  activationDistance={10}
                />
              )}

              {currentStep === 3 && (
                <ScrollView
                  contentContainerStyle={styles.stepContent}
                  keyboardShouldPersistTaps="always"
                  showsVerticalScrollIndicator={false}
                >
                  <View
                    onLayout={(e) => {
                      const { width, height } = e.nativeEvent.layout;
                      setReminderCardSize((prev) => {
                        if (prev.w === width && prev.h === height) return prev;
                        return { w: width, h: height };
                      });
                    }}
                  >
                    <Pressable
                      onPress={() => {
                        setReminderEnabled(!reminderEnabled);
                        dismissKeyboard();
                      }}
                      style={styles.reminderCardOuter}
                    >
                      {reminderCardSize.w > 0 && (
                        <Svg
                          style={styles.reminderCardSvg}
                          width={reminderCardSize.w + PIXEL_BTN_SHADOW}
                          height={reminderCardSize.h + PIXEL_BTN_SHADOW}
                          viewBox={`0 0 ${reminderCardSize.w + PIXEL_BTN_SHADOW} ${reminderCardSize.h + PIXEL_BTN_SHADOW}`}
                        >
                          <Path
                            d={pixelButtonPath(
                              reminderCardSize.w,
                              reminderCardSize.h,
                            )}
                            fill={SHADOW_COLOR}
                            transform={`translate(${PIXEL_BTN_SHADOW} ${PIXEL_BTN_SHADOW})`}
                          />
                          <Path
                            d={pixelButtonPath(
                              reminderCardSize.w,
                              reminderCardSize.h,
                            )}
                            fill={
                              reminderEnabled
                                ? colors.surface
                                : colors.background
                            }
                            stroke={
                              reminderEnabled
                                ? colors.primary
                                : "rgba(255,255,255,0.18)"
                            }
                            strokeWidth={2}
                          />
                        </Svg>
                      )}
                      <View style={styles.reminderCardContent}>
                        <View style={styles.reminderInfo}>
                          <SvgXml
                            xml={ALERT_BELL_XML}
                            width={28}
                            height={28}
                            color={colors.primary}
                          />
                          <View>
                            <Text
                              style={[
                                styles.reminderTitle,
                                reminderEnabled &&
                                  styles.reminderTitleActive,
                              ]}
                            >
                              {reminderEnabled
                                ? t("routine_form.reminder_enabled")
                                : t("routine_form.reminder_disabled")}
                            </Text>
                            <Text style={styles.reminderSubtitle}>
                              {reminderEnabled
                                ? t("routine_form.reminder_subtitle_on")
                                : t("routine_form.reminder_subtitle_off")}
                            </Text>
                          </View>
                        </View>

                        {reminderEnabled && (
                          <Pressable
                            style={styles.timeDisplay}
                            onPress={() => {
                              setShowTimePicker(true);
                              dismissKeyboard();
                            }}
                          >
                            <Text style={styles.timeDisplayText}>
                              {formatTime(reminderTime)}
                            </Text>
                          </Pressable>
                        )}
                      </View>
                    </Pressable>
                  </View>

                  {showTimePicker &&
                    (Platform.OS === "ios" ? (
                      <Pressable
                        style={styles.timePickerContainer}
                        onPress={() => setShowTimePicker(false)}
                      >
                        <Pressable onPress={(e) => e.stopPropagation()}>
                          <DateTimePicker
                            value={reminderTime}
                            mode="time"
                            display="spinner"
                            onChange={handleTimeChange}
                          />
                        </Pressable>
                      </Pressable>
                    ) : (
                      <DateTimePicker
                        value={reminderTime}
                        mode="time"
                        display="default"
                        onChange={handleTimeChange}
                      />
                    ))}
                </ScrollView>
              )}

              {currentStep === 4 && (
                <ScrollView
                  contentContainerStyle={[styles.stepContent, styles.eggStepContent]}
                  keyboardShouldPersistTaps="always"
                  showsVerticalScrollIndicator={false}
                >
                  <View style={styles.carouselPickerRow}>
                    <Pressable
                      onPress={() => {
                        triggerHaptic("light");
                        setEggIndex((i) => Math.max(0, i - 1));
                      }}
                      disabled={eggIndex === 0}
                      style={({ pressed }) => [
                        styles.carouselArrowBtn,
                        (pressed || eggIndex === 0) && styles.carouselArrowDisabled,
                      ]}
                    >
                      <ChevronLeftIcon color={colors.textPrimary} size={28} />
                    </Pressable>

                    <View style={[
                      styles.carouselStageWrap,
                      (selectedEggId === availableCatalog[eggIndex]?.id) && styles.carouselStageSelected,
                    ]}>
                      <View style={styles.carouselEggContainer}>
                        <Animated.View style={[{ width: "100%", height: "100%", alignItems: "center", justifyContent: "center" }, eggWobbleStyle]}>
                          <Image
                            source={(() => {
                              const eggData = storeEggs.find((e) => e.id === availableCatalog[eggIndex]?.id);
                              if (eggData?.evolved) return availableCatalog[eggIndex]?.petImage;
                              return availableCatalog[eggIndex]?.image;
                            })()}
                            style={styles.carouselEggImage}
                            resizeMode="contain"
                          />
                        </Animated.View>
                        {(() => {
                          const eggData = storeEggs.find((e) => e.id === availableCatalog[eggIndex]?.id);
                          const isUnlocked = eggData?.unlocked ?? false;
                          const inUse = isUnlocked && !!eggData?.routineId;
                          const requiresPro = availableCatalog[eggIndex]?.rarity !== "common";
                          const isLockedByPro = requiresPro && !isPro && !isUnlocked;
                          const isLockedByCoins = !isUnlocked && !isLockedByPro;

                          if (isLockedByPro || isLockedByCoins) {
                            return (
                              <View style={styles.carouselLockOverlay}>
                                <Image
                                  source={storeLockerImg}
                                  style={styles.carouselLockImage}
                                  resizeMode="contain"
                                />
                              </View>
                            );
                          }
                          if (inUse) {
                            return (
                              <View style={styles.carouselBusyOverlay}>
                                <Text style={styles.carouselBusyText}>{t("routine_form.busy")}</Text>
                              </View>
                            );
                          }
                          return null;
                        })()}
                        <View style={styles.carouselRarityBadge}>
                          <Image
                            source={RARITY_MEDAL_IMAGES[availableCatalog[eggIndex]?.rarity]}
                            style={styles.carouselRarityBadgeImage}
                          />
                        </View>
                      </View>
                      <Text style={styles.carouselEggName}>
                        {EGG_DISPLAY_NAMES[availableCatalog[eggIndex]?.id] ?? availableCatalog[eggIndex]?.name}
                      </Text>
                    </View>

                    <Pressable
                      onPress={() => {
                        triggerHaptic("light");
                        setEggIndex((i) => Math.min(availableCatalog.length - 1, i + 1));
                      }}
                      disabled={eggIndex === availableCatalog.length - 1}
                      style={({ pressed }) => [
                        styles.carouselArrowBtn,
                        (pressed || eggIndex === availableCatalog.length - 1) &&
                          styles.carouselArrowDisabled,
                      ]}
                    >
                      <View style={styles.carouselFlip}>
                        <ChevronLeftIcon color={colors.textPrimary} size={28} />
                      </View>
                    </Pressable>
                  </View>

                  <Text style={styles.carouselCounter}>
                    {eggIndex + 1} / {availableCatalog.length}
                  </Text>
                </ScrollView>
              )}
            </Animated.View>

            <View
              style={[
                styles.stickyFooter,
                { paddingBottom: insets.bottom + 12 },
              ]}
            >
              <PixelCTAButton
                label={
                  currentStep === 4
                    ? (() => {
                        const meta = availableCatalog[eggIndex];
                        if (!meta) return t("routine_form.create");
                        const eggData = storeEggs.find((e) => e.id === meta.id);
                        const isUnlocked = eggData?.unlocked ?? false;
                        const requiresPro = meta.rarity !== "common";
                        if (!isUnlocked && requiresPro && !isPro) return t("routine_form.get_pro");
                        if (!isUnlocked) return t("routine_form.unlock_egg", { cost: meta.cost.toLocaleString() });
                        return t("routine_form.create");
                      })()
                    : t("routine_form.next")
                }
                variant={
                  currentStep === 4
                    ? (() => {
                        const meta = availableCatalog[eggIndex];
                        if (!meta) return "default";
                        const eggData = storeEggs.find((e) => e.id === meta.id);
                        const isUnlocked = eggData?.unlocked ?? false;
                        const requiresPro = meta.rarity !== "common";
                        return !isUnlocked && requiresPro && !isPro ? "primary" : "default";
                      })()
                    : "default"
                }
                onPress={
                  currentStep === 4 ? handleEggStepCTA : handleNext
                }
                disabled={currentStep === 4 ? !isValid || purchasing : !canProceed()}
                loading={currentStep === 4 && purchasing}
              />
            </View>
          </View>
        </KeyboardAvoidingView>
      </GestureHandlerRootView>
      <PaywallModal
        visible={showPaywall}
        onClose={() => setShowPaywall(false)}
        source="egg_picker"
      />
    </Modal>
  );
};

const styles = StyleSheet.create({
  keyboardAvoidingView: {
    flex: 1,
  },
  screen: {
    flex: 1,
    backgroundColor: colors.background,
    flexDirection: "column",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 13,
  },
  backButton: {
    padding: 3,
    width: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  closeButton: {
    padding: 3,
    width: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  dotsContainer: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.textSecondary + "40",
  },
  dotActive: {
    backgroundColor: colors.primary,
    width: 24,
  },
  stepHeaderContainer: {
    paddingHorizontal: 20,
    marginBottom: 4,
  },
  stepTitle: {
    fontFamily: "Jersey10",
    fontSize: 20,
    color: colors.textPrimary,
  },
  stepSubtitle: {
    fontFamily: "Jersey10",
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 2,
    opacity: 0.7,
  },
  stepContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
  },
  eggStepContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingTop: 0,
  },
  nameStepContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  section: {
    marginBottom: 20,
  },
  tasksSection: {
    marginBottom: 0,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  label: {
    fontFamily: "Jersey10",
    fontSize: 18,
    color: colors.textPrimary,
    letterSpacing: 0.5,
  },
  helperText: {
    fontFamily: "Jersey10",
    fontSize: 13,
    color: colors.textSecondary,
    opacity: 0.7,
  },
  input: {
    backgroundColor: colors.surface,
    borderRadius: 4,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 14,
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  nameInput: {
    fontFamily: "Jersey10",
    fontSize: 36,
    color: colors.textPrimary,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  nameInputWrapper: {
    position: "relative",
    justifyContent: "center",
  },
  namePlaceholder: {
    position: "absolute",
    fontFamily: "Jersey10",
    fontSize: 36,
    color: colors.textSecondary + "BB",
    paddingHorizontal: 20,
    paddingVertical: 16,
    textAlign: "center",
    opacity: 0.6,
    width: "100%",
  },
  daysRow: {
    flexDirection: "row",
    gap: 6,
  },
  pixelDayRoot: {
    flex: 1,
    alignItems: "center",
    gap: 4,
  },
  pixelDayContainer: {
    width: "100%",
    aspectRatio: 1,
  },
  pixelDaySvg: {
    position: "absolute",
    top: 0,
    left: 0,
  },
  pixelDayCheck: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1,
  },
  pixelDayText: {
    fontFamily: "Jersey10",
    fontSize: 13,
    textAlign: "center",
    letterSpacing: 0.4,
  },

  taskNumber: {
    width: 26,
    height: 26,
    borderRadius: 4,
    backgroundColor: "rgba(255,255,255,0.05)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  taskNumberText: {
    fontFamily: "Jersey10",
    fontSize: 14,
    color: colors.textSecondary,
  },
  taskItemOuter: {
    marginBottom: 8,
    position: "relative",
  },
  taskItemDraggingOuter: {
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  taskItemSvg: {
    position: "absolute",
    top: 0,
    left: 0,
  },
  taskItemInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  taskItemText: {
    flex: 1,
    fontFamily: "Jersey10",
    fontSize: 18,
    fontWeight: "500",
    color: "#000000",
    opacity: 0.8,
    padding: 0,
  },
  taskItemTextEmpty: {
    fontStyle: "italic",
  },
  dragHandle: {
    padding: 4,
    marginRight: -4,
  },
  actionIcon: {
    padding: 4,
  },
  addTaskButtonInline: {
    padding: 4,
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },

  reminderCardOuter: {
    position: "relative",
  },
  reminderCardSvg: {
    position: "absolute",
    top: 0,
    left: 0,
  },
  reminderCardContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingVertical: 18,
  },
  reminderInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  reminderTitle: {
    fontFamily: "Jersey10",
    fontSize: 15,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  reminderTitleActive: {
    color: colors.textPrimary,
  },
  reminderSubtitle: {
    fontFamily: "Jersey10",
    fontSize: 12,
    color: colors.textSecondary,
    opacity: 0.7,
  },
  timeDisplay: {
    backgroundColor: colors.background,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  timeDisplayText: {
    fontFamily: "Jersey10",
    fontSize: 16,
    fontWeight: "700",
    color: colors.primary,
  },
  timePickerContainer: {
    marginTop: 16,
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.primary + "40",
  },

  stickyFooter: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.06)",
  },

  carouselPickerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  carouselArrowBtn: {
    width: 44,
    height: 160,
    alignItems: "center",
    justifyContent: "center",
  },
  carouselArrowDisabled: {
    opacity: 0.3,
  },
  carouselStageWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  carouselStageSelected: {
    borderWidth: 2,
    borderColor: colors.primary,
    borderRadius: 16,
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  carouselEggContainer: {
    width: "100%",
    height: 160,
    alignItems: "center",
    justifyContent: "center",
  },
  carouselEggImage: {
    width: 128,
    height: 128,
    resizeMode: "contain",
  },
  carouselLockOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  carouselLockImage: {
    width: 60,
    height: 60,
  },
  carouselBusyOverlay: {
    position: "absolute",
    bottom: 16,
    left: 0,
    right: 0,
    alignItems: "center",
  },
  carouselBusyText: {
    fontSize: 12,
    fontFamily: "Jersey10",
    color: colors.warning,
    textTransform: "uppercase",
  },
  carouselRarityBadge: {
    position: "absolute",
    top: 0,
    right: 20,
    width: 22,
    height: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  carouselRarityBadgeImage: {
    width: "100%",
    height: "100%",
    resizeMode: "contain",
  },
  carouselEggName: {
    marginTop: 12,
    fontFamily: "Jersey10",
    fontSize: 42,
    color: colors.textPrimary,
    textAlign: "center",
  },
  carouselFlip: {
    transform: [{ scaleX: -1 }],
  },
  carouselCounter: {
    marginTop: 20,
    textAlign: "center",
    fontFamily: "Jersey10",
    fontSize: 20,
    color: colors.textTertiary,
  },
});
