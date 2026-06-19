import {
  PRIMARY_GRADIENT_COLORS,
  primaryButtonGradient,
  primaryButtonStyles,
  primaryButtonText,
} from "@/constants/buttons";
import { colors } from "@/constants/theme";
import { AppText as Text } from "@/src/components/AppText";
import { BlurView } from "expo-blur";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import {
  Check,
  ChevronLeft,
  Clock,
  GripVertical,
  Play,
  Plus,
  Trash2,
} from "lucide-react-native";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useTranslation } from "react-i18next";
import {
  Dimensions,
  FlatList,
  Keyboard,
  LayoutAnimation,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  UIManager,
  View,
} from "react-native";
import DraggableFlatList, {
  RenderItemParams,
  ScaleDecorator,
} from "react-native-draggable-flatlist";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import Animated, {
  FadeIn,
  Layout,
  SlideInRight,
  useAnimatedKeyboard,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

// Enable LayoutAnimation for Android
if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const ORB_SIZE = Math.min(SCREEN_WIDTH, SCREEN_HEIGHT) * 2.5;

// --- Animated Radial Gradient Orb (same as Copilot expanded phase) ---
function ExpandedGradientOrb() {
  const scale = useSharedValue(0.5);
  const opacity = useSharedValue(0);

  useEffect(() => {
    scale.value = withSpring(1, { damping: 18, stiffness: 80 });
    opacity.value = withTiming(1, { duration: 600 });
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          position: "absolute",
          width: ORB_SIZE,
          height: ORB_SIZE,
          borderRadius: ORB_SIZE / 2,
          alignSelf: "center",
          top: "50%",
          marginTop: -(ORB_SIZE / 2),
          overflow: "hidden",
        },
        animStyle,
      ]}
    >
      <BlurView
        intensity={60}
        style={{
          ...StyleSheet.absoluteFillObject,
          borderRadius: ORB_SIZE / 2,
        }}
      />
    </Animated.View>
  );
}

// Utility para generar IDs seguros
const generateId = () =>
  `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

// Types
export type Subtask = {
  id: string;
  title: string;
  duration: number;
  isCompleted: boolean;
};

interface SubtaskListScreenProps {
  taskTitle: string;
  taskEmoji: string;
  initialSubtasks: Subtask[];
  onStart: (subtasks: Subtask[], title: string, emoji: string) => void;
  onClose: () => void;
  onAddToList?: (taskTitle: string, emoji: string, subtasks: Subtask[]) => void;
  isEditing?: boolean;
  activityId?: string;
  onUpdateTask?: (
    activityId: string,
    subtasks: Subtask[],
    title: string,
    emoji: string,
  ) => void;
  onDeleteTask?: (activityId: string) => void;
  /** When true, "Agregar a Lista" becomes the primary gradient button and "Comenzar Tarea" is hidden */
  makePrimaryAddToList?: boolean;
  /** Custom label for the primary action button (default: "Agregar a Lista de Tareas" or "Comenzar Tarea") */
  primaryActionLabel?: string;
}

// Animated Pressable
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function SubtaskListScreen({
  taskTitle,
  taskEmoji,
  initialSubtasks,
  onStart,
  onClose,
  onAddToList,
  isEditing = false,
  activityId,
  onUpdateTask,
  onDeleteTask,
  makePrimaryAddToList = false,
  primaryActionLabel,
}: SubtaskListScreenProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const topInset = Math.max(insets.top + 12, 28);
  const bottomInset = Math.max(insets.bottom, 16);
  const [subtasks, setSubtasks] = useState<Subtask[]>(initialSubtasks);
  const [localTitle, setLocalTitle] = useState(taskTitle);
  const [localEmoji, setLocalEmoji] = useState(taskEmoji);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingDurationId, setEditingDurationId] = useState<string | null>(
    null,
  );
  const [isDragging, setIsDragging] = useState(false);

  const taskInputRefs = useRef<{ [key: string]: TextInput | null }>({});
  const flatListRef = useRef<FlatList<Subtask>>(null);
  const timeoutRefs = useRef<Array<ReturnType<typeof setTimeout>>>([]);
  const transientTitleRef = useRef<{ [key: string]: string }>({});
  const transientDurationRef = useRef<{ [key: string]: number }>({});

  // Animation values
  const buttonScale = useSharedValue(1);
  const keyboard = useAnimatedKeyboard();

  // Limpieza de timeouts para evitar memory leaks
  useEffect(() => {
    return () => {
      timeoutRefs.current.forEach(clearTimeout);
    };
  }, []);

  // Helpers de Timeout
  const registerTimeout = useCallback((callback: () => void, delay: number) => {
    const id = setTimeout(callback, delay);
    timeoutRefs.current.push(id);
  }, []);

  // Handlers
  const handleDragBegin = useCallback(() => {
    setIsDragging(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }, []);

  const handleDragEnd = useCallback(({ data }: { data: Subtask[] }) => {
    setIsDragging(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSubtasks(data);
  }, []);

  const handleAddStep = useCallback(
    (position: "start" | "end") => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);

      const newTask: Subtask = {
        id: generateId(),
        title: "", // Inicia vacío para mostrar el placeholder
        duration: 5,
        isCompleted: false,
      };

      setSubtasks((prev) =>
        position === "start" ? [newTask, ...prev] : [...prev, newTask],
      );
      setEditingId(newTask.id);

      registerTimeout(() => {
        if (taskInputRefs.current[newTask.id]) {
          taskInputRefs.current[newTask.id]?.focus();
        }
      }, 100);
    },
    [registerTimeout],
  );

  const handleInsertStep = useCallback(
    (atIndex: number) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);

      const newTask: Subtask = {
        id: generateId(),
        title: "", // Inicia vacío para mostrar el placeholder
        duration: 5,
        isCompleted: false,
      };

      setSubtasks((prev) => {
        const newSubtasks = [...prev];
        newSubtasks.splice(atIndex, 0, newTask);
        return newSubtasks;
      });
      setEditingId(newTask.id);

      registerTimeout(() => {
        if (taskInputRefs.current[newTask.id]) {
          taskInputRefs.current[newTask.id]?.focus();
        }
      }, 100);
    },
    [registerTimeout],
  );

  const handleDelete = useCallback((id: string) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setSubtasks((prev) => prev.filter((task) => task.id !== id));
    delete taskInputRefs.current[id];
  }, []);

  const handleStart = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    buttonScale.value = withSequence(
      withTiming(0.95, { duration: 100 }),
      withTiming(1, { duration: 100 }),
    );

    if (isEditing && activityId && onUpdateTask) {
      onUpdateTask(activityId, subtasks, localTitle, localEmoji);
    }

    registerTimeout(() => onStart(subtasks, localTitle, localEmoji), 200);
  }, [
    subtasks,
    localTitle,
    localEmoji,
    onStart,
    buttonScale,
    isEditing,
    activityId,
    onUpdateTask,
    registerTimeout,
  ]);

  const handleAddToList = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // Filtramos tareas vacías antes de guardar
    const validSubtasks = subtasks.filter((t) => t.title.trim() !== "");

    if (isEditing && activityId && onUpdateTask) {
      onUpdateTask(activityId, validSubtasks, localTitle, localEmoji);
      onClose();
      return;
    }

    if (onAddToList) {
      onAddToList(localTitle, localEmoji, validSubtasks);
    }
    onClose();
  }, [
    localTitle,
    localEmoji,
    subtasks,
    onAddToList,
    onClose,
    isEditing,
    activityId,
    onUpdateTask,
  ]);

  const handleDeleteTask = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    if (isEditing && activityId && onDeleteTask) {
      onDeleteTask(activityId);
    }
    onClose();
  }, [isEditing, activityId, onDeleteTask, onClose]);

  // Animated styles
  const buttonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }],
  }));

  const buttonsContainerAnimatedStyle = useAnimatedStyle(() => {
    const isEditingTask = editingId !== null || editingDurationId !== null;

    return {
      transform: [
        {
          translateY: withTiming(isEditingTask ? 150 : 0, { duration: 300 }),
        },
      ],
      opacity: withTiming(isEditingTask ? 0 : 1, { duration: 250 }),
    };
  }, [editingId, editingDurationId]);

  const footerSpacerStyle = useAnimatedStyle(() => ({
    height: 240 + keyboard.height.value,
  }));

  // Render Item
  const renderItem = useCallback(
    ({ item, drag, isActive, getIndex }: RenderItemParams<Subtask>) => {
      const index = getIndex() ?? 0;
      const isItemEditing =
        editingId === item.id || editingDurationId === item.id;

      return (
        <ScaleDecorator>
          <Animated.View
            entering={SlideInRight.delay(index * 30).duration(300)}
            layout={Layout.springify().damping(15)}
            style={[
              styles.itemContainer,
              isActive && styles.itemContainerActive,
            ]}
          >
            <View
              style={[styles.taskItem, isActive && styles.taskItemDragging]}
            >
              {/* Drag Handle — onPressIn for instant response */}
              <Pressable
                onPressIn={() => {
                  if (!isItemEditing) {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    drag();
                  }
                }}
                style={styles.dragHandle}
                disabled={isItemEditing}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <GripVertical size={18} color={colors.surface} />
              </Pressable>

              <View style={styles.cardContent}>
                {/* Title: Text (display) or TextInput (editing) */}
                {isItemEditing ? (
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
                      item.isCompleted && styles.taskItemTextCompleted,
                      !item.title && styles.taskItemTextEmpty,
                    ]}
                    defaultValue={item.title}
                    onChangeText={(text) => {
                      transientTitleRef.current[item.id] = text;
                    }}
                    placeholder={t("onboarding.subtask_list.empty_task")}
                    placeholderTextColor={colors.textSecondary + "80"}
                    autoFocus
                    multiline={false}
                    returnKeyType="done"
                    onSubmitEditing={() => {
                      const newTitle = transientTitleRef.current[item.id];
                      if (newTitle !== undefined) {
                        setSubtasks((prev) =>
                          prev.map((t) =>
                            t.id === item.id ? { ...t, title: newTitle } : t,
                          ),
                        );
                      }
                      setEditingId(null);
                    }}
                    onBlur={() => {
                      const newTitle = transientTitleRef.current[item.id];
                      if (newTitle !== undefined) {
                        setSubtasks((prev) =>
                          prev.map((t) =>
                            t.id === item.id ? { ...t, title: newTitle } : t,
                          ),
                        );
                      }
                      setEditingId(null);
                    }}
                  />
                ) : (
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                  >
                    <Pressable
                      onPress={() => {
                        setEditingId(item.id);
                        setTimeout(() => {
                          taskInputRefs.current[item.id]?.focus();
                        }, 80);
                      }}
                      style={{ justifyContent: "center" }}
                    >
                      <Text
                        style={[
                          styles.taskItemText,
                          item.isCompleted && styles.taskItemTextCompleted,
                          !item.title && styles.taskItemTextEmpty,
                        ]}
                      >
                        {item.title || t("onboarding.subtask_list.empty_task")}
                      </Text>
                    </Pressable>
                  </ScrollView>
                )}

                <View style={styles.cardMeta}>
                  <View style={styles.durationBadge}>
                    <Clock size={12} color={colors.background} />
                    {editingDurationId === item.id ? (
                      <TextInput
                        defaultValue={
                          item.duration > 0 ? item.duration.toString() : ""
                        }
                        onChangeText={(text) => {
                          const parsed = parseInt(text, 10);
                          transientDurationRef.current[item.id] = isNaN(parsed)
                            ? 0
                            : parsed;
                        }}
                        style={styles.cardDurationInput}
                        placeholder="0"
                        placeholderTextColor={colors.textSecondary + "80"}
                        keyboardType="number-pad"
                        maxLength={3}
                        autoFocus
                        onBlur={() => {
                          const newDur = transientDurationRef.current[item.id];
                          if (newDur !== undefined) {
                            setSubtasks((prev) =>
                              prev.map((t) =>
                                t.id === item.id
                                  ? { ...t, duration: newDur }
                                  : t,
                              ),
                            );
                          }
                          setEditingDurationId(null);
                        }}
                        returnKeyType="done"
                        onSubmitEditing={() => {
                          const newDur = transientDurationRef.current[item.id];
                          if (newDur !== undefined) {
                            setSubtasks((prev) =>
                              prev.map((t) =>
                                t.id === item.id
                                  ? { ...t, duration: newDur }
                                  : t,
                              ),
                            );
                          }
                          setEditingDurationId(null);
                        }}
                      />
                    ) : (
                      <Pressable
                        onPress={() => {
                          setEditingId(null);
                          setEditingDurationId(item.id);
                        }}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Text style={styles.cardDurationInput}>
                          {item.duration > 0 ? item.duration.toString() : "0"}
                        </Text>
                      </Pressable>
                    )}
                    <Text style={styles.cardDurationLabel}>
                      {t("onboarding.subtask_list.minute_abbr")}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Botón de Acción: Check cuando edita, Basura cuando no */}
              <Pressable
                onPress={() => {
                  if (isItemEditing) {
                    Keyboard.dismiss();
                    setEditingId(null);
                    setEditingDurationId(null);
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  } else {
                    handleDelete(item.id);
                  }
                }}
                style={styles.actionIcon}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                disabled={isDragging && !isItemEditing}
              >
                {isItemEditing ? (
                  <Check size={18} color={colors.background} strokeWidth={3} />
                ) : (
                  <Trash2
                    size={16}
                    color={isDragging ? colors.surface + "40" : colors.danger}
                  />
                )}
              </Pressable>
            </View>

            {/* Botón de Insertar */}
            <View style={styles.insertStepButtonWrapper}>
              <Pressable
                onPress={() => handleInsertStep(index + 1)}
                style={({ pressed }) => [
                  styles.insertStepButton,
                  pressed && styles.insertStepButtonPressed,
                ]}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Plus size={16} color={colors.textSecondary} />
              </Pressable>
            </View>
          </Animated.View>
        </ScaleDecorator>
      );
    },
    [editingId, editingDurationId, isDragging, handleDelete, handleInsertStep],
  );

  const ListFooterComponent = useCallback(
    () => (
      <>
        <Animated.View
          entering={FadeIn.delay(100).duration(300)}
          style={styles.footer}
        >
          <View style={styles.tipContainer}>
            <Text style={styles.tipText}>{t("onboarding.subtask_list.subtitle")}</Text>
          </View>
        </Animated.View>
        <Animated.View style={footerSpacerStyle} />
      </>
    ),
    [footerSpacerStyle],
  );

  return (
    <GestureHandlerRootView style={[styles.container]}>
      <SafeAreaView style={styles.safeArea} edges={[]}>
        <Animated.View
          entering={FadeIn.duration(200)}
          style={[
            styles.headerBar,
            { paddingTop: topInset, paddingBottom: 18 },
          ]}
        >
          <Pressable onPress={onClose} style={styles.backButton}>
            <ChevronLeft size={24} color={colors.textPrimary} />
          </Pressable>
          <Text style={styles.headerTitle}>{t("onboarding.subtask_list.list_title")}</Text>
          <View style={styles.headerActions}>
            {isEditing && onDeleteTask && (
              <Pressable onPress={handleDeleteTask} style={styles.headerEmoji}>
                <Trash2 size={18} color={colors.danger} />
              </Pressable>
            )}
          </View>
        </Animated.View>

        <View style={{ flex: 1 }}>
          <DraggableFlatList
            // @ts-ignore
            ref={flatListRef}
            data={subtasks}
            onDragBegin={handleDragBegin}
            onDragEnd={handleDragEnd}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            ListHeaderComponent={useMemo(
              () => (
                <Animated.View
                  entering={FadeIn.duration(300)}
                  style={styles.header}
                >
                  <View style={styles.taskTitleContainer}>
                    <TextInput
                      style={styles.taskEmoji}
                      value={localEmoji}
                      onChangeText={setLocalEmoji}
                      maxLength={2}
                      selectTextOnFocus
                    />
                    <TextInput
                      style={styles.taskTitle}
                      value={localTitle}
                      onChangeText={setLocalTitle}
                      multiline
                      placeholder="Nombre de la tarea..."
                      placeholderTextColor={colors.textSecondary}
                    />
                  </View>
                </Animated.View>
              ),
              [localEmoji, localTitle],
            )}
            ListFooterComponent={ListFooterComponent}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            activationDistance={20}
            keyboardShouldPersistTaps="handled"
            onScrollToIndexFailed={(info) => {
              flatListRef.current?.scrollToOffset({
                offset: info.averageItemLength * info.index,
                animated: true,
              });
            }}
          />
        </View>
      </SafeAreaView>

      <Animated.View entering={FadeIn.delay(120).duration(300)}>
        <View>
          <Text style={styles.tipText}>{t("onboarding.subtask_list.edit_hint")}</Text>
        </View>
      </Animated.View>

      <SafeAreaView
        edges={[]}
        style={[styles.bottomSafeArea, { paddingBottom: bottomInset }]}
      >
        <Animated.View
          entering={FadeIn.duration(300)}
          style={[styles.buttonsContainer, buttonsContainerAnimatedStyle]}
          pointerEvents={
            editingId !== null || editingDurationId !== null
              ? "none"
              : "box-none"
          }
        >
          {makePrimaryAddToList ? (
            /* Mode: "Agregar a Lista" is the primary gradient button, no Start button */
            <AnimatedPressable
              onPress={handleAddToList}
              style={[buttonAnimatedStyle, styles.createButton]}
            >
              <LinearGradient
                colors={PRIMARY_GRADIENT_COLORS}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.createButtonGradient}
              >
                <Plus size={20} color="#1E1E2E" style={{ marginRight: 8 }} />
                <Text style={styles.createButtonText}>
                  {primaryActionLabel || t("onboarding.subtask_list.primary_add_to_home")}
                </Text>
              </LinearGradient>
            </AnimatedPressable>
          ) : (
            /* Default mode: Start button is primary */
            <>
              <AnimatedPressable
                onPress={handleStart}
                style={[buttonAnimatedStyle, styles.createButton]}
              >
                <LinearGradient
                  colors={PRIMARY_GRADIENT_COLORS}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.createButtonGradient}
                >
                  <Play
                    size={20}
                    color="#1E1E2E"
                    fill="#1E1E2E"
                    style={{ marginRight: 8 }}
                  />
                  <Text style={styles.createButtonText}>
                    {t("onboarding.subtask_list.primary_start")}
                  </Text>
                </LinearGradient>
              </AnimatedPressable>

              {(onAddToList || isEditing) && (
                <Pressable
                  onPress={handleAddToList}
                  style={styles.addToListButton}
                >
                  <Plus size={18} color={colors.textSecondary} />
                  <Text style={styles.addToListButtonText}>
                    {isEditing
                      ? t("onboarding.subtask_list.primary_save_changes")
                      : t("onboarding.subtask_list.primary_add_to_list")}
                  </Text>
                </Pressable>
              )}
            </>
          )}
        </Animated.View>
      </SafeAreaView>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9ff", // Fondo claro para resaltar el contenido
  },
  safeArea: {
    flex: 1,
  },
  headerBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.05)",
    zIndex: 100,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    minWidth: 40,
    justifyContent: "flex-end",
  },
  headerTitle: {
    fontSize: 24,
    color: colors.textPrimary,
    fontFamily: "Jersey10",
    flex: 1,
    textAlign: "center",
    marginHorizontal: 16,
  },
  headerEmoji: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(243, 139, 168, 0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerEmojiText: {
    fontSize: 14,
    color: "#F38BA8",
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  listContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  header: {
    paddingBottom: 16,
    marginRight: 40,
  },
  taskTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
    textAlign: "center",
    gap: 12,
  },
  taskEmoji: {
    fontSize: 22,
    paddingLeft: 4,
  },
  taskTitle: {
    fontSize: 32,
    flex: 1,
    color: colors.background,
    fontFamily: "Jersey10",
  },
  footer: {
    paddingTop: 8,
    paddingBottom: 20,
  },
  tipContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 20,
    color: colors.background,
  },
  tipText: {
    fontSize: 12,
    color: colors.surface + "80",
    fontStyle: "italic",
    textAlign: "center",
  },
  itemContainer: {
    flexDirection: "column",
    alignItems: "stretch",
    marginBottom: 0,
    position: "relative",
    zIndex: 1,
    overflow: "visible",
    paddingBottom: 12, // Espacio para el botón de insertar
  },
  itemContainerActive: {
    zIndex: 100,
  },

  // Estilo minimalista de tareas
  taskItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 6,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: colors.surface,
    borderStyle: "dashed",
  },
  taskItemDragging: {
    backgroundColor: colors.surface + "20",
    borderColor: colors.background,
    shadowColor: colors.surface,
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  dragHandle: {
    padding: 4,
    marginLeft: 4,
    color: colors.surface,
  },
  cardContent: {
    flex: 1,
    paddingVertical: 4,
  },
  taskItemText: {
    fontSize: 13,
    fontWeight: "500",
    color: colors.surface,
    marginBottom: 2,
    padding: 0,
  },
  taskItemTextCompleted: {
    textDecorationLine: "line-through",
    opacity: 0.6,
  },
  taskItemTextEmpty: {
    fontStyle: "italic",
  },
  cardMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  durationBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.background + "15",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  cardDurationInput: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.background,
    padding: 0,
    margin: 0,
    minWidth: 15,
    textAlign: "center",
  },
  cardDurationLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.surface,
  },
  actionIcon: {
    padding: 6,
    marginRight: 6,
  },

  // Botón de insertar - wrapper para centrar el botón
  insertStepButtonWrapper: {
    position: "absolute",
    bottom: 8,
    marginBottom: -8,
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 999,
  },
  insertStepButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "rgba(255, 255, 255, 0.15)",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.background,
    elevation: 10,
  },
  insertStepButtonPressed: {
    backgroundColor: colors.primary + "30",
    borderColor: colors.primary,
    transform: [{ scale: 0.92 }],
  },
  buttonsContainer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
  },
  bottomSafeArea: {
    backgroundColor: "transparent",
  },

  // Botones principales
  createButton: {
    ...primaryButtonStyles,
  },
  createButtonGradient: {
    ...primaryButtonGradient,
  },
  createButtonText: {
    ...primaryButtonText,
  },
  addToListButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    marginTop: 10,
    borderRadius: 32,
    borderWidth: 1,
    borderStyle: "dashed",
  },
  addToListButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.background,
  },
});

export default SubtaskListScreen;
