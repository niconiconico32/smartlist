import { PRIMARY_GRADIENT_COLORS } from "@/constants/buttons";
import { colors } from "@/constants/theme";
import { AppText as Text } from "@/src/components/AppText";
import DateTimePicker from "@react-native-community/datetimepicker";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import {
    Activity,
    Bell,
    Bike,
    Book,
    Brain,
    Briefcase,
    Coffee,
    Dumbbell,
    Flower2,
    GraduationCap,
    GripVertical,
    Heart,
    Home,
    Laptop,
    Lightbulb,
    Moon,
    Plus,
    ShoppingBag,
    Smile,
    SmilePlus,
    Sparkles,
    Sun,
    Target,
    Trash2,
    Utensils,
    X,
} from "lucide-react-native";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
    Alert,
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

const AVAILABLE_ICONS = [
  { name: "Dumbbell", component: Dumbbell, i18nKey: "routine_icons.dumbbell" },
  { name: "Activity", component: Activity, i18nKey: "routine_icons.activity" },
  { name: "Bike", component: Bike, i18nKey: "routine_icons.bike" },
  { name: "Heart", component: Heart, i18nKey: "routine_icons.heart" },
  { name: "Book", component: Book, i18nKey: "routine_icons.book" },
  {
    name: "GraduationCap",
    component: GraduationCap,
    i18nKey: "routine_icons.graduation",
  },
  {
    name: "Lightbulb",
    component: Lightbulb,
    i18nKey: "routine_icons.lightbulb",
  },
  { name: "Brain", component: Brain, i18nKey: "routine_icons.brain" },
  {
    name: "Briefcase",
    component: Briefcase,
    i18nKey: "routine_icons.briefcase",
  },
  { name: "Coffee", component: Coffee, i18nKey: "routine_icons.coffee" },
  { name: "Laptop", component: Laptop, i18nKey: "routine_icons.laptop" },
  { name: "Target", component: Target, i18nKey: "routine_icons.target" },
  { name: "Home", component: Home, i18nKey: "routine_icons.home" },
  {
    name: "ShoppingBag",
    component: ShoppingBag,
    i18nKey: "routine_icons.shopping",
  },
  { name: "Utensils", component: Utensils, i18nKey: "routine_icons.food" },
  { name: "Sparkles", component: Sparkles, i18nKey: "routine_icons.sparkles" },
  { name: "Moon", component: Moon, i18nKey: "routine_icons.moon" },
  { name: "Sun", component: Sun, i18nKey: "routine_icons.sun" },
  { name: "Flower2", component: Flower2, i18nKey: "routine_icons.flower" },
  { name: "Smile", component: Smile, i18nKey: "routine_icons.smile" },
];

const PLACEHOLDER_TEXT_KEYS = [
  "routine_form.name_placeholder_0",
  "routine_form.name_placeholder_1",
  "routine_form.name_placeholder_2",
];

const generateId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 9);
};

const getIconComponent = (iconName?: string) => {
  const icon = AVAILABLE_ICONS.find((i) => i.name === iconName);
  return icon?.component || SmilePlus;
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
  const [selectedIcon, setSelectedIcon] = useState<string>("");
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [currentPlaceholder, setCurrentPlaceholder] = useState(0);
  const [displayedText, setDisplayedText] = useState("");
  const [isTyping, setIsTyping] = useState(true);
  const taskListRef = useRef<any>(null);
  const taskInputRefs = useRef<{ [key: string]: TextInput | null }>({});
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
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
    setSelectedIcon("");
    setShowIconPicker(false);
    setShowTimePicker(false);
    setHasUnsavedChanges(false);
    taskInputRefs.current = {};
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
      reminderEnabled ||
      selectedIcon !== "";

    setHasUnsavedChanges(hasContent);
  }, [routineName, selectedDays, tasks, reminderEnabled, selectedIcon]);

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
        icon: selectedIcon || "Circle",
      });

      setRoutineName("");
      setSelectedDays(["Lun"]);
      setTasks([]);
      setReminderEnabled(false);
      setReminderTime(new Date());
      setSelectedIcon("");
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

  const isValid =
    routineName.trim().length > 0 &&
    tasks.filter((t) => t.title.trim()).length > 0 &&
    selectedDays.length > 0;

  const listHeader = (
    <View>
      <View style={styles.section}>
        <Text style={styles.label}>{t("routine_form.name_label")}</Text>
        <View style={{ height: 12 }} />
        <View style={styles.nameInputContainer}>
          <Pressable
            style={styles.iconButton}
            onPress={() => {
              setShowIconPicker(true);
              dismissKeyboard();
            }}
          >
            {React.createElement(getIconComponent(selectedIcon), {
              size: 24,
              color: colors.primary,
              opacity: selectedIcon ? 1 : 0.6,
            })}
          </Pressable>
          <TextInput
            style={styles.input}
            placeholder={routineName ? "" : displayedText}
            placeholderTextColor={colors.textSecondary}
            value={routineName}
            onChangeText={setRoutineName}
          />
        </View>
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

      <View style={styles.footer}>
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
  );

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={handleClose}
    >
      <GestureHandlerRootView style={{ flex: 1 }}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.keyboardAvoidingView}
          keyboardVerticalOffset={Platform.OS === "ios" ? 40 : 0}
        >
          <View style={styles.overlay}>
            <View style={styles.container}>
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
                showsVerticalScrollIndicator={true}
                keyboardShouldPersistTaps="always"
                activationDistance={10}
              />
            </View>
          </View>

          <Modal
            visible={showIconPicker}
            transparent={true}
            animationType="fade"
            onRequestClose={() => setShowIconPicker(false)}
          >
            <Pressable
              style={styles.iconPickerOverlay}
              onPress={() => setShowIconPicker(false)}
            >
              <View style={styles.iconPickerContainer}>
                <View style={styles.iconPickerHeader}>
                  <Text style={styles.iconPickerTitle}>
                    {t("routine_form.choose_icon")}
                  </Text>
                  <Pressable onPress={() => setShowIconPicker(false)}>
                    <X size={20} color={colors.textSecondary} />
                  </Pressable>
                </View>
                <ScrollView style={styles.iconPickerScroll}>
                  <View style={styles.iconGrid}>
                    {AVAILABLE_ICONS.map((icon) => (
                      <Pressable
                        key={icon.name}
                        style={[
                          styles.iconOption,
                          selectedIcon === icon.name &&
                            styles.iconOptionSelected,
                        ]}
                        onPress={() => {
                          setSelectedIcon(icon.name);
                          setShowIconPicker(false);
                          triggerHaptic("selection");
                        }}
                      >
                        <View style={{ gap: 8, alignItems: "center" }}>
                          {React.createElement(icon.component, {
                            size: 28,
                            color:
                              selectedIcon === icon.name
                                ? colors.primary
                                : colors.textSecondary,
                          })}
                          <Text
                            style={[
                              styles.iconLabel,
                              selectedIcon === icon.name &&
                                styles.iconLabelSelected,
                            ]}
                          >
                            {t(icon.i18nKey)}
                          </Text>
                        </View>
                      </Pressable>
                    ))}
                  </View>
                </ScrollView>
              </View>
            </Pressable>
          </Modal>
        </KeyboardAvoidingView>
      </GestureHandlerRootView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  keyboardAvoidingView: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    justifyContent: "center",
    paddingHorizontal: 0,
    paddingVertical: 0,
  },
  container: {
    backgroundColor: colors.background,
    borderRadius: 0,
    flex: 1,
    flexDirection: "column",
    overflow: "hidden",
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
    paddingBottom: 40,
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
    fontSize: 12,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  helperText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontStyle: "italic",
  },
  input: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 22,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 13,
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
  },
  daysContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: -4,
  },
  dayButton: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    backgroundColor: colors.surface,
    minWidth: 40,
    alignItems: "center",
    margin: 4,
    paddingRight: 5,
  },
  dayButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  dayButtonText: {
    fontSize: 12.3,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  dayButtonTextActive: {
    color: "#1E1E2E",
    fontWeight: "700",
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
    fontSize: 13,
    fontWeight: "700",
    color: colors.primary,
  },
  taskItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
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
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
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

  footer: {
    paddingHorizontal: 0,
    paddingVertical: 20,
    backgroundColor: "transparent",
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

  nameInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  iconButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
  },
  iconPickerOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  iconPickerContainer: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    width: "100%",
    maxWidth: 400,
    height: 500,
    maxHeight: "80%",
    overflow: "hidden",
  },
  iconPickerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.05)",
  },
  iconPickerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  iconPickerScroll: {
    flex: 1,
    minHeight: 300,
  },
  iconGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    padding: 16,
    gap: 12,
  },
  iconOption: {
    flex: 1,
    minWidth: 90,
    maxWidth: 110,
    height: 100,
    backgroundColor: colors.background,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "transparent",
  },
  iconOptionSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + "10",
  },
  iconLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.textSecondary,
    textAlign: "center",
    width: "100%",
  },
  iconLabelSelected: {
    color: colors.primary,
  },
});
