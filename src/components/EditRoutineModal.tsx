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
    Circle,
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
    Sparkles,
    Sun,
    Target,
    Trash2,
    Utensils,
    X,
} from "lucide-react-native";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
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
  { short: "Lun", full: "Lunes" },
  { short: "Mar", full: "Martes" },
  { short: "Mié", full: "Miércoles" },
  { short: "Jue", full: "Jueves" },
  { short: "Vie", full: "Viernes" },
  { short: "Sáb", full: "Sábado" },
  { short: "Dom", full: "Domingo" },
];

const AVAILABLE_ICONS = [
  { name: "Dumbbell", component: Dumbbell, label: "Ejercicio" },
  { name: "Activity", component: Activity, label: "Actividad" },
  { name: "Bike", component: Bike, label: "Ciclismo" },
  { name: "Heart", component: Heart, label: "Salud" },
  { name: "Book", component: Book, label: "Lectura" },
  { name: "GraduationCap", component: GraduationCap, label: "Estudio" },
  { name: "Lightbulb", component: Lightbulb, label: "Ideas" },
  { name: "Brain", component: Brain, label: "Mental" },
  { name: "Briefcase", component: Briefcase, label: "Trabajo" },
  { name: "Coffee", component: Coffee, label: "Café" },
  { name: "Laptop", component: Laptop, label: "Computador" },
  { name: "Target", component: Target, label: "Meta" },
  { name: "Home", component: Home, label: "Hogar" },
  { name: "ShoppingBag", component: ShoppingBag, label: "Compras" },
  { name: "Utensils", component: Utensils, label: "Comida" },
  { name: "Sparkles", component: Sparkles, label: "Brillo" },
  { name: "Moon", component: Moon, label: "Noche" },
  { name: "Sun", component: Sun, label: "Día" },
  { name: "Flower2", component: Flower2, label: "Naturaleza" },
  { name: "Smile", component: Smile, label: "Bienestar" },
];

const PLACEHOLDER_TEXTS = [
  "Mi Rutina de cardio...",
  "Practicar Piano...",
  "Estudiar Japonés...",
];

const getIconComponent = (iconName?: string) => {
  const icon = AVAILABLE_ICONS.find((i) => i.name === iconName);
  return icon?.component || Circle;
};

export const EditRoutineModal: React.FC<EditRoutineModalProps> = ({
  visible,
  routine,
  onClose,
  onSave,
}) => {
  const [routineName, setRoutineName] = useState("");
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [reminderTime, setReminderTime] = useState(new Date());
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [selectedIcon, setSelectedIcon] = useState<string>("Circle");
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [currentPlaceholder, setCurrentPlaceholder] = useState(0);
  const [displayedText, setDisplayedText] = useState("");
  const [isTyping, setIsTyping] = useState(true);
  const taskListRef = useRef<any>(null);
  const taskInputRefs = useRef<{ [key: string]: TextInput | null }>({});
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const insets = useSafeAreaInsets();

  // Cargar datos de la rutina cuando cambia
  useEffect(() => {
    if (routine && visible) {
      setRoutineName(routine.name);
      setSelectedDays(routine.days || []);
      setSelectedIcon(routine.icon || "Circle");

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
    const hasIconChanged = selectedIcon !== (routine.icon || "Circle");

    // Solo considerar cambio en reminderTime si está habilitado
    let hasTimeChanged = false;
    if (reminderEnabled && routine.reminderTime) {
      const hh = String(reminderTime.getHours()).padStart(2, "0");
      const mm = String(reminderTime.getMinutes()).padStart(2, "0");
      const currentTime = `${hh}:${mm}`;
      hasTimeChanged = currentTime !== routine.reminderTime;
    }

    setHasUnsavedChanges(
      hasNameChanged ||
        hasDaysChanged ||
        hasTasksChanged ||
        hasReminderChanged ||
        hasIconChanged ||
        hasTimeChanged,
    );
  }, [
    routineName,
    selectedDays,
    tasks,
    reminderEnabled,
    reminderTime,
    selectedIcon,
    routine,
    visible,
  ]);

  // Typewriter effect for placeholder
  useEffect(() => {
    // Detener el efecto si el usuario ya escribió algo
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

  // Change placeholder text after typing finishes
  useEffect(() => {
    // No cambiar placeholder si el usuario ya escribió algo
    if (routineName.trim() !== "" || isTyping) {
      return;
    }

    const timeout = setTimeout(() => {
      setCurrentPlaceholder((prev) => (prev + 1) % PLACEHOLDER_TEXTS.length);
    }, 2000);
    return () => clearTimeout(timeout);
  }, [isTyping, routineName]);

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
        icon: selectedIcon,
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
              placeholder="Tarea Vacía"
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
              >
                <Trash2 size={18} color={colors.textSecondary} />
              </Pressable>
            )}
          </View>
        </ScaleDecorator>
      );
    },
    [tasks, editingTaskId],
  );

  const renderListHeader = (
    <View>
      {/* Routine Name Input */}
      <View style={styles.section}>
        <Text style={styles.label}>Nombre de la rutina</Text>
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
              opacity: 0.6,
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

      {/* Day Selection */}
      <Pressable onPress={dismissKeyboard}>
        <View style={styles.section}>
          <Text style={styles.label}>¿Qué días quieres hacerla?</Text>
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
                  {day.short}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      </Pressable>

      {/* Tasks Section Header */}
      <View style={styles.tasksSection}>
        <View style={styles.sectionHeader}>
          <Text style={styles.label}>Tareas de la rutina</Text>
          {tasks.length > 0 && (
            <Text style={styles.helperText}>
              Mantén presionado para ordenar
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
        <Text style={styles.label}>¿Quieres un recordatorio?</Text>
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
                {reminderEnabled ? "Recordatorio Activado" : "Sin recordatorio"}
              </Text>
              <Text style={styles.reminderSubtitle}>
                {reminderEnabled
                  ? "Te avisaremos a esta hora"
                  : "Toca para activar"}
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

      {/* Save Button Footer */}
      <View style={styles.footer}>
        <Pressable
          onPress={handleSaveRoutine}
          disabled={!isValid}
          style={[styles.createButton, !isValid && styles.createButtonDisabled]}
        >
          <LinearGradient
            colors={!isValid ? ["#6B7280", "#4B5563"] : ["#CBA6F7", "#FAB387"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.createButtonGradient}
          >
            <Text style={styles.createButtonText}>
              {!isValid ? "Completa los campos" : "Guardar Cambios"}
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
              {/* Header */}
              <View
                style={[
                  styles.header,
                  { paddingTop: Math.max(insets.top, 13) },
                ]}
              >
                <Text style={styles.title}>Editar Rutina</Text>
                <Pressable onPress={handleClose} style={styles.closeButton}>
                  <X size={24} color={colors.textPrimary} />
                </Pressable>
              </View>

              {/* DraggableFlatList with Header and Footer */}
              <DraggableFlatList
                ref={taskListRef}
                data={tasks}
                onDragEnd={({ data }) => {
                  setTasks(data);
                  triggerHaptic("medium");
                }}
                keyExtractor={(item) => item.id}
                renderItem={renderTaskItem}
                ListHeaderComponent={renderListHeader}
                ListFooterComponent={renderListFooter}
                contentContainerStyle={styles.listContentContainer}
                showsVerticalScrollIndicator={true}
                keyboardShouldPersistTaps="always"
                activationDistance={10}
                extraData={{
                  routineName,
                  selectedIcon,
                  selectedDays,
                  reminderEnabled,
                  showTimePicker,
                  isValid,
                }}
              />
            </View>
          </View>

          {/* Icon Picker Modal */}
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
                  <Text style={styles.iconPickerTitle}>Elige un ícono</Text>
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
                            {icon.label}
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
    fontSize: 25,
    fontWeight: "800",
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

  // Tasks
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

  // Reminder
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
    fontSize: 16,
    fontWeight: "700",
    color: colors.background,
  },

  // Icon Selector
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
