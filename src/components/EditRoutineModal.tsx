import { PRIMARY_GRADIENT_COLORS } from "@/constants/buttons";
import { colors } from "@/constants/theme";
import { AppText as Text } from "@/src/components/AppText";
import { useEggCatalog } from "@/src/hooks/useEggCatalog";
import { useAchievementsStore } from "@/src/store/achievementsStore";
import { EggId, useEggStore } from "@/src/store/eggStore";
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

interface Task {
  id: string;
  title: string;
  completed?: boolean;
}

interface Routine {
  id: string;
  name: string;
  days: string[];
  tasks: Task[];
  reminderEnabled: boolean;
  reminderTime?: string;
  icon?: string;
}

interface EditRoutineModalProps {
  visible: boolean;
  routine: Routine | null;
  onClose: () => void;
  onSave: (routine: Routine) => void;
}

const DAYS_OF_WEEK = [
  { short: "Lun", i18nKey: "days.mon_abbr" },
  { short: "Mar", i18nKey: "days.tue_abbr" },
  { short: "Mié", i18nKey: "days.wed_abbr" },
  { short: "Jue", i18nKey: "days.thu_abbr" },
  { short: "Vie", i18nKey: "days.fri_abbr" },
  { short: "Sáb", i18nKey: "days.sat_abbr" },
  { short: "Dom", i18nKey: "days.sun_abbr" },
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

export const EditRoutineModal: React.FC<EditRoutineModalProps> = ({
  visible,
  routine,
  onClose,
  onSave,
}) => {
  const { t } = useTranslation();
  const [routineName, setRoutineName] = useState("");
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [reminderTime, setReminderTime] = useState(new Date());
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const taskListRef = useRef<any>(null);
  const taskInputRefs = useRef<{ [key: string]: TextInput | null }>({});
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // Egg picker
  const [selectedEggId, setSelectedEggId] = useState<EggId | null>(null);
  const catalog = useEggCatalog();
  const storeEggs = useEggStore((s) => s.eggs);
  const totalCoins = useAchievementsStore((s) => s.totalCoins);
  const spendCoins = useAchievementsStore((s) => s.spendCoins);
  const insets = useSafeAreaInsets();

  // Cargar datos de la rutina cuando cambia
  useEffect(() => {
    if (routine && visible) {
      setRoutineName(routine.name);
      setSelectedDays(routine.days || []);

      // Initialize with tasks or one empty task
      const initialTasks =
        routine.tasks && routine.tasks.length > 0
          ? routine.tasks.map((t) => ({
              id: t.id,
              title: t.title,
              completed: t.completed,
            }))
          : [
              {
                id: Date.now().toString(),
                title: "",
                completed: false,
              },
            ];

      setTasks(initialTasks);

      // Set first task as editing if it's empty
      if (initialTasks.length > 0 && !initialTasks[0].title) {
        setEditingTaskId(initialTasks[0].id);
      }

      setReminderEnabled(routine.reminderEnabled);
      if (routine.reminderTime) {
        const [hours, minutes] = routine.reminderTime.split(":");
        const date = new Date();
        date.setHours(parseInt(hours), parseInt(minutes));
        setReminderTime(date);
      }

      // Pre-select the egg currently assigned to this routine
      const currentEgg = storeEggs.find((e) => e.routineId === routine.id);
      setSelectedEggId(currentEgg?.id ?? null);

      setHasUnsavedChanges(false);
    }
  }, [routine, visible]);

  // Detectar cambios sin guardar
  useEffect(() => {
    if (!routine || !visible) return;

    const hasNameChanged = routineName.trim() !== routine.name;
    const hasDaysChanged =
      JSON.stringify(selectedDays.sort()) !==
      JSON.stringify([...(routine.days || [])].sort());

    // Comparar solo título y orden de tareas, ignorar completed
    const currentTaskTitles = tasks
      .map((t) => t.title.trim())
      .filter((t) => t !== "");
    const originalTaskTitles = (routine.tasks || [])
      .map((t) => t.title.trim())
      .filter((t) => t !== "");
    const hasTasksChanged =
      JSON.stringify(currentTaskTitles) !== JSON.stringify(originalTaskTitles);

    const hasReminderChanged = reminderEnabled !== routine.reminderEnabled;

    // Solo considerar cambio en reminderTime si está habilitado
    let hasTimeChanged = false;
    if (reminderEnabled && routine.reminderTime) {
      const hh = String(reminderTime.getHours()).padStart(2, "0");
      const mm = String(reminderTime.getMinutes()).padStart(2, "0");
      const currentTime = `${hh}:${mm}`;
      hasTimeChanged = currentTime !== routine.reminderTime;
    }

    const currentEgg = storeEggs.find((e) => e.routineId === routine.id);
    const hasEggChanged = selectedEggId !== (currentEgg?.id ?? null);

    setHasUnsavedChanges(
      hasNameChanged ||
        hasDaysChanged ||
        hasTasksChanged ||
        hasReminderChanged ||
        hasTimeChanged ||
        hasEggChanged,
    );
  }, [
    routineName,
    selectedDays,
    tasks,
    reminderEnabled,
    reminderTime,
    selectedEggId,
    routine,
    visible,
  ]);

  // Auto-focus y scroll cuando se agrega una nueva tarea
  useEffect(() => {
    if (editingTaskId && taskInputRefs.current[editingTaskId]) {
      const timer = setTimeout(() => {
        taskInputRefs.current[editingTaskId]?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [editingTaskId, tasks.length]);

  const triggerHaptic = (style: "light" | "medium" | "selection" = "light") => {
    if (Platform.OS === "ios") {
      if (style === "selection") Haptics.selectionAsync();
      else if (style === "medium")
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      else Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const handleAddTask = () => {
    const newTask: Task = {
      id: Date.now().toString(),
      title: "",
      completed: false,
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

  const dismissKeyboard = () => {
    setEditingTaskId(null);
  };

  const handleTimeChange = (event: any, selectedTime?: Date) => {
    // En Android, cerrar automáticamente después de seleccionar
    // En iOS, mantener el picker abierto hasta que el usuario toque fuera
    if (Platform.OS === "android") {
      setShowTimePicker(false);
    }
    if (selectedTime) {
      setReminderTime(selectedTime);
    }
  };

  const handleSaveRoutine = () => {
    // Filter out empty tasks
    const validTasks = tasks.filter((task) => task.title.trim() !== "");

    if (
      routineName.trim() &&
      validTasks.length > 0 &&
      selectedDays.length > 0 &&
      routine
    ) {
      // Format time as HH:mm (24h, zero-padded) — toLocaleTimeString is unreliable on Android
      const hh = String(reminderTime.getHours()).padStart(2, "0");
      const mm = String(reminderTime.getMinutes()).padStart(2, "0");
      const timeString = `${hh}:${mm}`;

      // Handle egg reassignment directly in the store
      const eggState = useEggStore.getState();
      const currentEgg = storeEggs.find((e) => e.routineId === routine.id);
      if (currentEgg?.id !== selectedEggId) {
        eggState.freeEgg(routine.id);
        if (selectedEggId) {
          eggState.assignEggToRoutine(selectedEggId, routine.id);
        }
      }

      const updatedRoutine: Routine = {
        id: routine.id,
        name: routineName.trim(),
        days: selectedDays,
        tasks: validTasks.map((t) => ({
          ...t,
          completed: t.completed ?? false,
        })),
        reminderEnabled,
        reminderTime: reminderEnabled ? timeString : undefined,
        icon: routine.icon, // pass through unchanged
      };

      onSave(updatedRoutine);
      setEditingTaskId(null);
      taskInputRefs.current = {};
      setHasUnsavedChanges(false);
      onClose();
    }
  };

  const handleClose = () => {
    // Si hay cambios válidos, guardar automáticamente
    if (hasUnsavedChanges && isValid) {
      handleSaveRoutine();
    } else {
      // Si no hay cambios o son inválidos, simplemente cerrar
      setEditingTaskId(null);
      setHasUnsavedChanges(false);
      onClose();
    }
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
            <View style={styles.taskNumber}>
              <Text style={styles.taskNumberText}>{index + 1}</Text>
            </View>

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

  const renderListHeader = (
    <View>
      {/* Routine Name Input */}
      <View style={styles.section}>
        <Text style={styles.label}>{t("routine_form.name_label")}</Text>
        <View style={{ height: 12 }} />
        <TextInput
          style={styles.input}
          placeholder={t("routine_form.name_placeholder_0")}
          placeholderTextColor={colors.textSecondary}
          value={routineName}
          onChangeText={setRoutineName}
        />
      </View>

      {/* Day Selection */}
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

      {/* Tasks Section Header */}
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

  const isValid =
    routineName.trim().length > 0 &&
    tasks.filter((t) => t.title.trim()).length > 0 &&
    selectedDays.length > 0;

  const renderListFooter = (
    <View>
      {/* Reminder Section */}
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

      {/* ── Companion Picker ─────────────────────────────────────────── */}
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
            // "in use" only if assigned to a DIFFERENT routine
            const inUse =
              isUnlocked &&
              !!eggData?.routineId &&
              eggData.routineId !== routine?.id;
            const isSelected = selectedEggId === meta.id;
            const isSelectable = isUnlocked && !inUse;
            const rc = RARITY_COLORS[meta.rarity];
            const displayImage = eggData?.evolved ? meta.petImage : meta.image;

            return (
              <Pressable
                key={meta.id}
                onPress={() => {
                  if (isSelectable) {
                    // Tap again to deselect
                    setSelectedEggId(isSelected ? null : (meta.id as EggId));
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
                                  useEggStore
                                    .getState()
                                    .unlockEgg(meta.id as EggId);
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
                  { borderColor: rc.border },
                  isSelected && {
                    borderWidth: 2,
                    backgroundColor: rc.border + "30",
                  },
                  !isSelectable && styles.eggCardDimmed,
                ]}
              >
                <View style={styles.rarityBadge}>
                  <Image
                    source={RARITY_MEDAL_IMAGES[meta.rarity]}
                    style={styles.rarityBadgeImage}
                  />
                </View>

                <Image source={displayImage} style={styles.eggCardImage} />

                <Text style={styles.eggCardName} numberOfLines={2}>
                  {meta.name}
                </Text>

                {!isUnlocked && (
                  <View style={styles.eggCardLockBadge}>
                    <Text style={styles.eggCardLockText}>
                      🔒 {meta.cost >= 1000 ? `${meta.cost / 1000}k` : meta.cost}
                    </Text>
                  </View>
                )}

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
            {/* Header */}
            <View
              style={[
                styles.header,
                { paddingTop: Math.max(insets.top, 16) },
              ]}
            >
              <Text style={styles.title}>{t("routine_form.edit_title")}</Text>
              <Pressable onPress={handleClose} style={styles.closeButton}>
                <X size={24} color={colors.textPrimary} />
              </Pressable>
            </View>

            {/* Scrollable content */}
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
                ListHeaderComponent={renderListHeader}
                ListFooterComponent={renderListFooter}
                contentContainerStyle={styles.listContentContainer}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="always"
                activationDistance={10}
                extraData={{
                  routineName,
                  selectedDays,
                  reminderEnabled,
                  showTimePicker,
                  isValid,
                  selectedEggId,
                }}
              />
            </View>

            {/* Sticky save button */}
            <View
              style={[
                styles.stickyFooter,
                { paddingBottom: Math.max(insets.bottom, 16) },
              ]}
            >
              <Pressable
                onPress={handleSaveRoutine}
                disabled={!isValid}
                style={[
                  styles.createButton,
                  !isValid && styles.createButtonDisabled,
                ]}
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
                      : t("routine_form.save_changes")}
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
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.06)",
  },
  title: {
    fontFamily: "Jersey10",
    fontSize: 28,
    color: colors.textPrimary,
  },
  closeButton: {
    padding: 4,
  },
  listContentContainer: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 24,
  },

  // ── Form sections ──
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
    fontSize: 16,
    color: colors.textSecondary,
    letterSpacing: 0.6,
  },
  helperText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontStyle: "italic",
  },
  input: {
    backgroundColor: colors.surface,
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },

  // ── Days ──
  daysContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  dayButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    backgroundColor: colors.surface,
    minWidth: 44,
    alignItems: "center",
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
    color: "#1E1E2E",
  },

  // ── Tasks ──
  taskItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: colors.surfaceHighlight,
    borderRadius: 28,
    paddingHorizontal: 6,
    paddingVertical: 6,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.primary + "20",
  },
  taskItemDragging: {
    backgroundColor: colors.surfaceHighlight,
    borderColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  taskNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primary + "30",
    alignItems: "center",
    justifyContent: "center",
  },
  taskNumberText: {
    fontFamily: "Jersey10",
    fontSize: 15,
    color: colors.primary,
  },
  taskItemText: {
    flex: 1,
    fontSize: 14,
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

  // ── Reminder ──
  reminderCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.surface,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
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

  // ── Egg / Companion Picker ──
  eggPickerRow: {
    gap: 10,
    paddingBottom: 4,
  },
  eggCard: {
    width: 80,
    minHeight: 110,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: "dashed",
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

  // ── Footer ──
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
});
