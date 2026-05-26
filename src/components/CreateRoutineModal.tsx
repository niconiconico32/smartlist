import { PRIMARY_GRADIENT_COLORS } from "@/constants/buttons";
import { colors } from "@/constants/theme";
import { AppText as Text } from "@/src/components/AppText";
import DateTimePicker from "@react-native-community/datetimepicker";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import {
    Bell,
    GripVertical,
    Plus,
    Trash2,
    X,
} from "lucide-react-native";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
    Alert,
    Image,
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
import { useEggCatalog } from "@/src/hooks/useEggCatalog";
import {
    EggId,
    useEggStore,
} from "@/src/store/eggStore";
import { useAchievementsStore } from "@/src/store/achievementsStore";

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

// Day data: `short` = stored DB key (language-agnostic internal), `i18nKey` = display key
const DAYS_OF_WEEK = [
  { short: "Lun", i18nKey: "days.mon_abbr" },
  { short: "Mar", i18nKey: "days.tue_abbr" },
  { short: "Mié", i18nKey: "days.wed_abbr" },
  { short: "Jue", i18nKey: "days.thu_abbr" },
  { short: "Vie", i18nKey: "days.fri_abbr" },
  { short: "Sáb", i18nKey: "days.sat_abbr" },
  { short: "Dom", i18nKey: "days.sun_abbr" },
];

const PLACEHOLDER_TEXT_KEYS = [
  "routine_form.name_placeholder_0",
  "routine_form.name_placeholder_1",
  "routine_form.name_placeholder_2",
];

const RARITY_COLORS = {
  common: { border: "#8B5E3C" },
  rare: { border: "#C0C0C0" },
  legendary: { border: "#F97316" },
} as const;

const RARITY_MEDAL_IMAGES = {
  common: require("../../assets/images/pets/rarities/common.png"),
  rare: require("../../assets/images/pets/rarities/rare.png"),
  legendary: require("../../assets/images/pets/rarities/legendary.png"),
} as const;

const generateId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 9);
};

export const CreateRoutineModal: React.FC<CreateRoutineModalProps> = ({
  visible,
  onClose,
  onCreateRoutine,
}) => {
  const { t } = useTranslation();
  const PLACEHOLDER_TEXTS = PLACEHOLDER_TEXT_KEYS.map((key) => t(key));
  const [routineName, setRoutineName] = useState("");
  const [selectedDays, setSelectedDays] = useState<string[]>(["Lun"]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [reminderTime, setReminderTime] = useState(new Date());
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [currentPlaceholder, setCurrentPlaceholder] = useState(0);
  const [displayedText, setDisplayedText] = useState("");
  const [isTyping, setIsTyping] = useState(true);
  const taskListRef = useRef<any>(null);
  const taskInputRefs = useRef<{ [key: string]: TextInput | null }>({});
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedEggId, setSelectedEggId] = useState<EggId | null>(null);
  const catalog = useEggCatalog();
  const storeEggs = useEggStore((s) => s.eggs);
  const availableEggs = storeEggs.filter((e) => e.unlocked && !e.routineId);
  const totalCoins = useAchievementsStore((s) => s.totalCoins);
  const spendCoins = useAchievementsStore((s) => s.spendCoins);
  const insets = useSafeAreaInsets();

  const triggerHaptic = (style: "light" | "medium" | "selection" = "light") => {
    if (Platform.OS === "ios") {
      if (style === "selection") Haptics.selectionAsync();
      else if (style === "medium")
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      else Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  useEffect(() => {
    if (!visible) return;
    // Siempre resetear el formulario al abrir para que no queden datos de una rutina anterior
    const firstTask: Task = { id: generateId(), title: "" };
    setRoutineName("");
    setSelectedDays(["Lun"]);
    setTasks([firstTask]);
    setEditingTaskId(firstTask.id);
    setReminderEnabled(false);
    setReminderTime(new Date());
    setShowTimePicker(false);
    setHasUnsavedChanges(false);
    taskInputRefs.current = {};
    setSelectedEggId(
      storeEggs.filter((e) => e.unlocked && !e.routineId)[0]?.id ?? null,
    );
  }, [visible]);

  useEffect(() => {
    if (routineName.trim() !== "") {
      return;
    }

    const targetText = PLACEHOLDER_TEXTS[currentPlaceholder];
    let currentIndex = 0;
    setDisplayedText("");
    setIsTyping(true);

    const typingInterval = setInterval(() => {
      if (currentIndex < targetText.length) {
        setDisplayedText(targetText.slice(0, currentIndex + 1));
        currentIndex++;
      } else {
        setIsTyping(false);
        clearInterval(typingInterval);
      }
    }, 50);

    return () => clearInterval(typingInterval);
  }, [currentPlaceholder, routineName]);

  useEffect(() => {
    if (routineName.trim() !== "" || isTyping) {
      return;
    }

    const timeout = setTimeout(() => {
      setCurrentPlaceholder((prev) => (prev + 1) % PLACEHOLDER_TEXTS.length);
    }, 2000);
    return () => clearTimeout(timeout);
  }, [isTyping, routineName]);

  useEffect(() => {
    if (!visible) return;

    const hasContent =
      routineName.trim() !== "" ||
      tasks.some((t) => t.title.trim() !== "") ||
      selectedDays.length > 1 ||
      !selectedDays.includes("Lun") ||
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

  const handleCreateRoutine = () => {
    const validTasks = tasks.filter((task) => task.title.trim() !== "");

    if (
      routineName.trim() &&
      validTasks.length > 0 &&
      selectedDays.length > 0
    ) {
      // Format time as HH:mm (24h, zero-padded) — toLocaleTimeString is unreliable on Android
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
        eggId: selectedEggId ?? undefined,
      });

      setRoutineName("");
      setSelectedDays(["Lun"]);
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
    setEditingTaskId(null);
  };

  const formatTime = (date: Date) => {
    const hh = String(date.getHours()).padStart(2, "0");
    const mm = String(date.getMinutes()).padStart(2, "0");
    return `${hh}:${mm}`;
  };

  const renderTaskItem = useCallback(
    ({ item, drag, isActive, getIndex }: RenderItemParams<Task>) => {
      const index = getIndex() ?? 0;
      const isEditing = editingTaskId === item.id;
      const isLastItem = index === tasks.length - 1;

      return (
        <ScaleDecorator>
          <View style={[styles.taskItem, isActive && styles.taskItemDragging]}>
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
              onChangeText={(text) => handleUpdateTask(item.id, text)}
              placeholder={t("routine_form.empty_task")}
              placeholderTextColor={colors.textSecondary + "80"}
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
                <Plus size={24} color={colors.primary} strokeWidth={3} />
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
                  color={
                    isDragging || isActive
                      ? colors.textSecondary + "40"
                      : colors.textSecondary
                  }
                />
              </Pressable>
            )}
          </View>
        </ScaleDecorator>
      );
    },
    [tasks, editingTaskId, isDragging],
  );

  const isValid =
    routineName.trim().length > 0 &&
    tasks.filter((t) => t.title.trim()).length > 0 &&
    selectedDays.length > 0;

  const listHeader = (
    <View>
      <View style={styles.section}>
        <Text style={styles.label}>{t("routine_form.name_label")}</Text>
        <View style={{ height: 12 }} />
        <TextInput
          style={styles.input}
          placeholder={routineName ? "" : displayedText}
          placeholderTextColor={colors.textSecondary}
          value={routineName}
          onChangeText={setRoutineName}
        />
      </View>

      <Pressable onPress={dismissKeyboard}>
        <View style={styles.section}>
          <Text style={styles.label}>{t("routine_form.which_days")}</Text>
          <View style={{ height: 12 }} />
          <View style={styles.daysContainer}>
            {DAYS_OF_WEEK.map((day) => (
              <Pressable
                key={day.short}
                onPress={() => {
                  handleToggleDay(day.short);
                  dismissKeyboard();
                }}
                style={[
                  styles.dayButton,
                  selectedDays.includes(day.short) && styles.dayButtonActive,
                ]}
              >
                <Text
                  style={[
                    styles.dayButtonText,
                    selectedDays.includes(day.short) &&
                      styles.dayButtonTextActive,
                  ]}
                >
                  {t(day.i18nKey)}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      </Pressable>

      <View style={styles.tasksSection}>
        <View style={styles.sectionHeader}>
          <Text style={styles.label}>{t("routine_form.routine_tasks")}</Text>
          {tasks.length > 0 && (
            <Text style={styles.helperText}>
              {t("routine_form.drag_to_reorder")}
            </Text>
          )}
        </View>
        <View style={{ height: 12 }} />
      </View>
    </View>
  );

  const listFooter = (
    <View>
      <View style={styles.section}>
        <Text style={styles.label}>{t("routine_form.reminder_question")}</Text>
        <View style={{ height: 12 }} />
        <Pressable
          onPress={() => {
            setReminderEnabled(!reminderEnabled);
            dismissKeyboard();
          }}
          style={[
            styles.reminderCard,
            reminderEnabled && styles.reminderCardActive,
          ]}
        >
          <View style={styles.reminderInfo}>
            <View
              style={[
                styles.iconContainer,
                reminderEnabled && styles.iconContainerActive,
              ]}
            >
              <Bell
                size={20}
                color={reminderEnabled ? "#FFF" : colors.textSecondary}
              />
            </View>
            <View>
              <Text
                style={[
                  styles.reminderTitle,
                  reminderEnabled && styles.reminderTitleActive,
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
        </Pressable>

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
      </View>

      {/* ── Egg / Pet Picker ──────────────────────────────────────────── */}
      <View style={styles.section}>
        <Text style={styles.label}>CHOOSE YOUR COMPANION</Text>
        <View style={{ height: 12 }} />

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.eggPickerRow}
        >
          {catalog.map((meta) => {
            const eggData = storeEggs.find((e) => e.id === meta.id);
            const isUnlocked = eggData?.unlocked ?? false;
            const inUse = isUnlocked && !!eggData?.routineId;
            const isSelected = selectedEggId === meta.id;
            const isSelectable = isUnlocked && !inUse;
            const rc = RARITY_COLORS[meta.rarity];
            // Show pet image if the egg has already evolved, otherwise show egg image
            const displayImage = eggData?.evolved ? meta.petImage : meta.image;

            return (
              <Pressable
                key={meta.id}
                onPress={() => {
                  if (isSelectable) {
                    setSelectedEggId(meta.id as EggId);
                    triggerHaptic("selection");
                  } else if (!isUnlocked) {
                    const canAfford = totalCoins >= meta.cost;
                    Alert.alert(
                      meta.name,
                      canAfford
                        ? `Unlock for ${meta.cost.toLocaleString()} 👑 crowns?\n\nYou have: ${totalCoins.toLocaleString()} 👑`
                        : `Costs ${meta.cost.toLocaleString()} 👑 crowns.\nYou only have ${totalCoins.toLocaleString()} 👑 — not enough!`,
                      canAfford
                        ? [
                            { text: "Cancel", style: "cancel" },
                            {
                              text: `Buy · ${meta.cost.toLocaleString()} 👑`,
                              onPress: async () => {
                                const ok = await spendCoins(meta.cost);
                                if (ok) {
                                  useEggStore.getState().unlockEgg(meta.id as EggId);
                                  setSelectedEggId(meta.id as EggId);
                                  triggerHaptic("medium");
                                }
                              },
                            },
                          ]
                        : [{ text: "OK", style: "cancel" }],
                    );
                  }
                }}
                style={[
                  styles.eggCard,
                  {
                    borderColor: rc.border,
                  },
                  isSelected && {
                    borderWidth: 2,
                    backgroundColor: rc.border + "30",
                  },
                  !isSelectable && styles.eggCardDimmed,
                ]}
              >
                {/* Rarity badge */}
                <View style={styles.rarityBadge}>
                  <Image
                    source={RARITY_MEDAL_IMAGES[meta.rarity]}
                    style={styles.rarityBadgeImage}
                  />
                </View>

                <Image source={displayImage} style={styles.eggCardImage} />

               

                {/* Locked overlay */}
                {!isUnlocked && (
                  <View style={styles.eggCardLockBadge}>
                    <Text style={styles.eggCardLockText}>
                      🔒 {meta.cost >= 1000 ? `${meta.cost / 1000}k` : meta.cost}
                    </Text>
                  </View>
                )}

                {/* In-use overlay */}
                {inUse && (
                  <View style={styles.eggCardInUseBadge}>
                    <Text style={styles.eggCardInUseText}>busy</Text>
                  </View>
                )}
              </Pressable>
            );
          })}
        </ScrollView>
      </View>
    </View>
  );

  return (
    <Modal
      visible={visible}
      transparent={false}
      animationType="slide"
      onRequestClose={handleClose}
    >
      <GestureHandlerRootView style={{ flex: 1 }}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.keyboardAvoidingView}
          keyboardVerticalOffset={0}
        >
          <View style={styles.screen}>
            <View
              style={[
                styles.header,
                { paddingTop: Math.max(insets.top, 16) },
              ]}
            >
              <Text style={styles.title}>{t("routine_form.new_title")}</Text>
              <Pressable onPress={handleClose} style={styles.closeButton}>
                <X size={24} color={colors.textPrimary} />
              </Pressable>
            </View>

            <View style={{ flex: 1 }}>
              <DraggableFlatList
                ref={taskListRef}
                data={tasks}
                onDragBegin={() => setIsDragging(true)}
                onDragEnd={({ data }) => {
                  setIsDragging(false);
                  setTasks(data);
                  triggerHaptic("medium");
                }}
                keyExtractor={(item) => item.id}
                renderItem={renderTaskItem}
                ListHeaderComponent={listHeader}
                ListFooterComponent={listFooter}
                contentContainerStyle={styles.listContentContainer}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="always"
                activationDistance={10}
              />
            </View>

            {/* Sticky create button — always visible, rises above keyboard */}
            <View
              style={[
                styles.stickyFooter,
                { paddingBottom: Math.max(insets.bottom, 16) },
              ]}
            >
              <Pressable
                onPress={handleCreateRoutine}
                disabled={!isValid}
                style={[styles.createButton, !isValid && styles.createButtonDisabled]}
              >
                <LinearGradient
                  colors={!isValid ? ["#6B7280", "#4B5563"] : PRIMARY_GRADIENT_COLORS}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.createButtonGradient}
                >
                  <Text style={styles.createButtonText}>
                    {!isValid
                      ? t("routine_form.complete_fields")
                      : t("routine_form.create")}
                  </Text>
                </LinearGradient>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </GestureHandlerRootView>
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
  title: {
    fontFamily: "Jersey10",
    fontSize: 36,
    color: colors.textPrimary,
  },
  closeButton: {
    padding: 3,
  },
  listContentContainer: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
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
  daysContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: -4,
  },
  dayButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    backgroundColor: colors.surface,
    minWidth: 42,
    alignItems: "center",
    margin: 4,
  },
  dayButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  dayButtonText: {
    fontFamily: "Jersey10",
    fontSize: 15,
    color: colors.textSecondary,
  },
  dayButtonTextActive: {
    fontFamily: "Jersey10",
    color: colors.background,
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
  taskItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "transparent",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "rgba(255,255,255,0.18)",
  },
  taskItemDragging: {
    backgroundColor: colors.surfaceHighlight,
    borderStyle: "solid",
    borderColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  taskItemText: {
    flex: 1,
    fontSize: 13,
    fontWeight: "500",
    color: colors.textPrimary,
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

  reminderCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.surface,
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    marginTop: 0,
  },
  reminderCardActive: {
    borderColor: colors.primary,
    backgroundColor: "rgba(203, 166, 247, 0.05)",
  },
  reminderInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.05)",
    alignItems: "center",
    justifyContent: "center",
  },
  iconContainerActive: {
    backgroundColor: colors.primary,
  },
  reminderTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  reminderTitleActive: {
    color: colors.textPrimary,
  },
  reminderSubtitle: {
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
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.06)",
  },
  createButton: {
    borderRadius: 32,
    overflow: "hidden",
  },
  createButtonDisabled: {
    opacity: 0.7,
  },
  createButtonGradient: {
    paddingVertical: 18,
    alignItems: "center",
  },
  createButtonText: {
    fontFamily: "Jersey10",
    fontSize: 26,
    color: colors.background,
  },

  // ── Egg / Pet Picker ────────────────────────────────────────────────────
  eggPickerRow: {
    gap: 10,
    paddingBottom: 4,
  },
  eggCard: {
    width: 80,
    minHeight: 110,
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: "rgba(255,255,255,0.08)",
    backgroundColor: "transparent",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    paddingHorizontal: 4,
    gap: 4,
    position: "relative",
  },
  eggCardDimmed: {
    opacity: 0.45,
  },
  eggCardImage: {
    width: 44,
    height: 44,
    resizeMode: "contain",
  },
  eggCardName: {
    fontFamily: "Jersey10",
    fontSize: 11,
    color: colors.textPrimary,
    textAlign: "center",
    lineHeight: 13,
  },
  rarityBadge: {
    position: "absolute",
    top: 4,
    right: 4,
    width: 18,
    height: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  rarityBadgeImage: {
    width: "100%",
    height: "100%",
    resizeMode: "contain",
  },
  eggCardLockBadge: {
    position: "absolute",
    bottom: 4,
    left: 0,
    right: 0,
    alignItems: "center",
  },
  eggCardLockText: {
    fontSize: 9,
    color: "#9CA3AF",
    fontWeight: "700",
  },
  eggCardInUseBadge: {
    position: "absolute",
    bottom: 4,
    left: 0,
    right: 0,
    alignItems: "center",
  },
  eggCardInUseText: {
    fontSize: 9,
    color: "#6B7280",
    fontWeight: "700",
    textTransform: "uppercase",
  },
});
