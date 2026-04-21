import { PRIMARY_GRADIENT_COLORS, primaryButtonGradient, primaryButtonStyles, primaryButtonText } from '@/constants/buttons';
import { colors } from '@/constants/theme';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Check,
  Clock,
  GripVertical,
  Play,
  Plus,
  Sparkles,
  Trash2,
  X
} from 'lucide-react-native';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Dimensions, FlatList, Keyboard, LayoutAnimation, Platform, Pressable, StyleSheet, TextInput, UIManager, View } from 'react-native';
import { AppText as Text } from '@/src/components/AppText';
import DraggableFlatList, {
  RenderItemParams,
  ScaleDecorator,
} from 'react-native-draggable-flatlist';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, {
  FadeIn,
  Layout,
  SlideInRight,
  useAnimatedKeyboard,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

// Enable LayoutAnimation for Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Utility para generar IDs seguros
const generateId = () => `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

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
  initialDifficulty?: "easy" | "moderate" | "hard";
  onStart: (subtasks: Subtask[], difficulty: "easy" | "moderate" | "hard") => void;
  onClose: () => void;
  onAddToList?: (taskTitle: string, subtasks: Subtask[], difficulty: "easy" | "moderate" | "hard") => void;
  isEditing?: boolean;
  activityId?: string;
  onUpdateTask?: (activityId: string, subtasks: Subtask[], difficulty: "easy" | "moderate" | "hard") => void;
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
  initialDifficulty,
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

  const [subtasks, setSubtasks] = useState<Subtask[]>(initialSubtasks);
  const [difficulty, setDifficulty] = useState<"easy" | "moderate" | "hard">(initialDifficulty || "easy");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Difficulty colors
  const difficultyColors = {
    easy: colors.success,    // Verde - #A6E3A1
    moderate: colors.accent, // Naranja - #FAB387
    hard: colors.danger,     // Rojo - #F38BA8
  };

  const taskInputRefs = useRef<{ [key: string]: TextInput | null }>({});
  const flatListRef = useRef<FlatList<Subtask>>(null);
  const timeoutRefs = useRef<Array<ReturnType<typeof setTimeout>>>([]);

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

  const handleAddStep = useCallback((position: 'start' | 'end') => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);

    const newTask: Subtask = {
      id: generateId(),
      title: '', // Inicia vacío para mostrar el placeholder
      duration: 5,
      isCompleted: false,
    };

    setSubtasks(prev => position === 'start' ? [newTask, ...prev] : [...prev, newTask]);
    setEditingId(newTask.id);

    registerTimeout(() => {
      if (taskInputRefs.current[newTask.id]) {
        taskInputRefs.current[newTask.id]?.focus();
      }
    }, 100);
  }, [registerTimeout]);

  const handleInsertStep = useCallback((atIndex: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);

    const newTask: Subtask = {
      id: generateId(),
      title: '', // Inicia vacío para mostrar el placeholder
      duration: 5,
      isCompleted: false,
    };

    setSubtasks(prev => {
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
  }, [registerTimeout]);

  const handleDelete = useCallback((id: string) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setSubtasks(prev => prev.filter(task => task.id !== id));
    delete taskInputRefs.current[id];
  }, []);

  const handleStart = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    buttonScale.value = withSequence(
      withTiming(0.95, { duration: 100 }),
      withTiming(1, { duration: 100 })
    );

    if (isEditing && activityId && onUpdateTask) {
      onUpdateTask(activityId, subtasks, difficulty);
    }

    registerTimeout(() => onStart(subtasks, difficulty), 200);
  }, [subtasks, difficulty, onStart, buttonScale, isEditing, activityId, onUpdateTask, registerTimeout]);

  const handleAddToList = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // Filtramos tareas vacías antes de guardar
    const validSubtasks = subtasks.filter(t => t.title.trim() !== '');

    if (isEditing && activityId && onUpdateTask) {
      onUpdateTask(activityId, validSubtasks, difficulty);
      onClose();
      return;
    }

    if (onAddToList) {
      onAddToList(taskTitle, validSubtasks, difficulty);
    }
    onClose();
  }, [taskTitle, subtasks, difficulty, onAddToList, onClose, isEditing, activityId, onUpdateTask]);

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
    const isEditingTask = editingId !== null;

    return {
      transform: [
        {
          translateY: withTiming(
            isEditingTask ? 150 : 0,
            { duration: 300 }
          )
        }
      ],
      opacity: withTiming(isEditingTask ? 0 : 1, { duration: 250 }),
    };
  }, [editingId]);

  const footerSpacerStyle = useAnimatedStyle(() => ({
    height: 240 + keyboard.height.value,
  }));

  // Render Item
  const renderItem = useCallback(({ item, drag, isActive, getIndex }: RenderItemParams<Subtask>) => {
    const index = getIndex() ?? 0;
    const isItemEditing = editingId === item.id;

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
          <Pressable
            onLongPress={() => {
              if (!isItemEditing) {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                drag();
              }
            }}
            delayLongPress={500}
            disabled={isActive}
            style={[
              styles.taskItem,
              isActive && styles.taskItemDragging
            ]}
          >
            {/* Drag Handle */}
            <Pressable
              onLongPress={() => {
                if (!isItemEditing) {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  drag();
                }
              }}
              delayLongPress={500}
              style={styles.dragHandle}
              disabled={isItemEditing}
            >
              <GripVertical size={18} color={colors.textSecondary} />
            </Pressable>

            <View style={styles.cardContent}>
              {/* Título Editable Directamente */}
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
                  !item.title && styles.taskItemTextEmpty
                ]}
                value={item.title}
                onChangeText={(text) => {
                  setSubtasks(prev => prev.map(t => t.id === item.id ? { ...t, title: text } : t));
                }}
                placeholder="Tarea vacía"
                placeholderTextColor={colors.textSecondary + '80'}
                onFocus={() => setEditingId(item.id)}
                onBlur={() => setEditingId(null)}
                multiline={false}
              />

              <View style={styles.cardMeta}>
                <View style={styles.durationBadge}>
                  <Clock size={12} color={colors.primary} />
                  {/* Duración Editable Directamente */}
                  <TextInput
                    value={item.duration > 0 ? item.duration.toString() : ''}
                    onChangeText={(text) => {
                      const parsed = parseInt(text, 10);
                      const newDuration = isNaN(parsed) ? 0 : parsed;
                      setSubtasks(prev => prev.map(t => t.id === item.id ? { ...t, duration: newDuration } : t));
                    }}
                    style={styles.cardDurationInput}
                    placeholder="0"
                    placeholderTextColor={colors.textSecondary + '80'}
                    keyboardType="number-pad"
                    maxLength={3}
                    onFocus={() => setEditingId(item.id)}
                    onBlur={() => setEditingId(null)}
                  />
                  <Text style={styles.cardDurationLabel}>min</Text>
                </View>
              </View>
            </View>

            {/* Botón de Acción: Check cuando edita, Basura cuando no */}
            <Pressable
              onPress={() => {
                if (isItemEditing) {
                  // Guardar cambios: cerrar teclado y hacer blur del input actual
                  Keyboard.dismiss();
                  setEditingId(null);
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
                <Check size={18} color={colors.primary} strokeWidth={3} />
              ) : (
                <Trash2 size={16} color={isDragging ? colors.textSecondary + "40" : colors.textSecondary} />
              )}
            </Pressable>
          </Pressable>

          {/* Botón de Insertar - posicionado absolutamente dentro del item */}
          <View style={styles.insertStepButtonWrapper}>
            <Pressable
              onPress={() => handleInsertStep(index + 1)}
              style={({ pressed }) => [
                styles.insertStepButton,
                pressed && styles.insertStepButtonPressed
              ]}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Plus size={16} color={colors.textSecondary} />
            </Pressable>
          </View>
        </Animated.View>
      </ScaleDecorator>
    );
  }, [
    editingId,
    isDragging,
    handleDelete,
    handleInsertStep,
  ]);

  const ListHeaderComponent = useCallback(() => (
    <Animated.View entering={FadeIn.duration(300)} style={styles.header}>
      <View style={styles.taskTitleContainer}>
        <Text style={styles.taskEmoji}>{taskEmoji}</Text>
        <Text style={styles.taskTitle} numberOfLines={2}>
          {taskTitle}
        </Text>
      </View>

      {/* Difficulty Selector */}
      <View style={styles.difficultySection}>
        <Text style={styles.difficultyLabel}>
          ¿Qué tan complicada es para ti esta tarea?
        </Text>
        <View style={styles.difficultyOptions}>
          <Pressable
            onPress={() => {
              setDifficulty('easy');
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }}
            style={[
              styles.difficultyOption,
              difficulty === 'easy' && {
                backgroundColor: difficultyColors.easy + '20',
                borderColor: difficultyColors.easy,
              },
            ]}
          >
            <Text
              style={[
                styles.difficultyOptionText,
                difficulty === 'easy' && { color: difficultyColors.easy },
              ]}
            >
              Fácil
            </Text>
          </Pressable>

          <Pressable
            onPress={() => {
              setDifficulty('moderate');
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }}
            style={[
              styles.difficultyOption,
              difficulty === 'moderate' && {
                backgroundColor: difficultyColors.moderate + '20',
                borderColor: difficultyColors.moderate,
              },
            ]}
          >
            <Text
              style={[
                styles.difficultyOptionText,
                difficulty === 'moderate' && { color: difficultyColors.moderate },
              ]}
            >
              Moderada
            </Text>
          </Pressable>

          <Pressable
            onPress={() => {
              setDifficulty('hard');
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }}
            style={[
              styles.difficultyOption,
              difficulty === 'hard' && {
                backgroundColor: difficultyColors.hard + '20',
                borderColor: difficultyColors.hard,
              },
            ]}
          >
            <Text
              style={[
                styles.difficultyOptionText,
                difficulty === 'hard' && { color: difficultyColors.hard },
              ]}
            >
              Difícil
            </Text>
          </Pressable>
        </View>
      </View>
    </Animated.View>
  ), [taskTitle, taskEmoji, difficulty]);

  const ListFooterComponent = useCallback(() => (
    <>
      <Animated.View entering={FadeIn.delay(100).duration(300)} style={styles.footer}>
        <View style={styles.tipContainer}>
          <Sparkles size={14} color={colors.primary} />
          <Text style={styles.tipText}>
            Mantén presionado y arrastra para reordenar
          </Text>
        </View>
      </Animated.View>
      <Animated.View style={footerSpacerStyle} />
    </>
  ), [footerSpacerStyle]);

  return (
    <GestureHandlerRootView style={[styles.container]}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <Animated.View entering={FadeIn.duration(200)} style={styles.closeButtonContainer}>
          <Pressable onPress={onClose} style={styles.closeButton}>
            <X size={24} color={colors.textPrimary} />
          </Pressable>
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
            ListHeaderComponent={ListHeaderComponent}
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

      <SafeAreaView edges={['bottom']} style={styles.bottomSafeArea}>
        <Animated.View
          entering={FadeIn.duration(300)}
          style={[styles.buttonsContainer, buttonsContainerAnimatedStyle]}
          pointerEvents={editingId !== null ? 'none' : 'box-none'}
        >
          {makePrimaryAddToList ? (
            /* Mode: "Agregar a Lista" is the primary gradient button, no Start button */
            <AnimatedPressable onPress={handleAddToList} style={[buttonAnimatedStyle, styles.createButton]}>
              <LinearGradient
                colors={PRIMARY_GRADIENT_COLORS}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.createButtonGradient}
              >
                <Plus size={20} color="#1E1E2E" style={{ marginRight: 8 }} />
                <Text style={styles.createButtonText}>
                  {primaryActionLabel || 'Agregar a Inicio'}
                </Text>
              </LinearGradient>
            </AnimatedPressable>
          ) : (
            /* Default mode: Start button is primary */
            <>
              <AnimatedPressable onPress={handleStart} style={[buttonAnimatedStyle, styles.createButton]}>
                <LinearGradient
                  colors={PRIMARY_GRADIENT_COLORS}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.createButtonGradient}
                >
                  <Play size={20} color="#1E1E2E" fill="#1E1E2E" style={{ marginRight: 8 }} />
                  <Text style={styles.createButtonText}>Comenzar Tarea</Text>
                </LinearGradient>
              </AnimatedPressable>

              {(onAddToList || isEditing) && (
                <Pressable onPress={handleAddToList} style={styles.addToListButton}>
                  <Plus size={18} color={colors.textSecondary} />
                  <Text style={styles.addToListButtonText}>
                    {isEditing ? 'Guardar Cambios' : 'Agregar a Lista de Tareas'}
                  </Text>
                </Pressable>
              )}
            </>
          )}

          {isEditing && onDeleteTask && (
            <Pressable onPress={handleDeleteTask} style={styles.deleteTaskButton}>
              <Trash2 size={18} color="#ef4444" />
              <Text style={styles.deleteTaskButtonText}>Eliminar Tarea</Text>
            </Pressable>
          )}
        </Animated.View>
      </SafeAreaView>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  safeArea: {
    flex: 1,
  },
  closeButtonContainer: {
    position: 'absolute',
    top: 17,
    right: 20,
    zIndex: 100,
  },
  closeButton: {
    padding: 3,
    alignItems: 'center',
    justifyContent: 'center',
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 24,
  },
  taskEmoji: {
    fontSize: 22,
    paddingLeft: 4,
  },
  taskTitle: {
    fontSize: 18,
    fontWeight: '800',
    flex: 1,
    color: colors.textPrimary,
  },
  footer: {
    paddingTop: 8,
    paddingBottom: 20,
  },
  tipContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 20,
  },
  tipText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  itemContainer: {
    flexDirection: 'column',
    alignItems: 'stretch',
    marginBottom: 0,
    position: 'relative',
    zIndex: 1,
    overflow: 'visible',
    paddingBottom: 12, // Espacio para el botón de insertar
  },
  itemContainerActive: {
    zIndex: 100,
  },

  // Estilo minimalista de tareas
  taskItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: "#7663F2",
    borderRadius: 28,
    paddingHorizontal: 6,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: colors.primary + '20',
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
  dragHandle: {
    padding: 4,
    marginLeft: 4,
  },
  cardContent: {
    flex: 1,
    paddingVertical: 4,
  },
  taskItemText: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.textPrimary,
    marginBottom: 2,
    padding: 0,
  },
  taskItemTextCompleted: {
    textDecorationLine: 'line-through',
    opacity: 0.6,
  },
  taskItemTextEmpty: {
    fontStyle: 'italic',
  },
  cardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  durationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primary + '15',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  cardDurationInput: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
    padding: 0,
    margin: 0,
    minWidth: 15,
    textAlign: 'center',
  },
  cardDurationLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  actionIcon: {
    padding: 6,
    marginRight: 6,
  },

  // Botón de insertar - wrapper para centrar el botón
  insertStepButtonWrapper: {
    position: 'absolute',
    bottom: 8,
    marginBottom: -8,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 999,
  },
  insertStepButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
    elevation: 10,
  },
  insertStepButtonPressed: {
    backgroundColor: colors.primary + '30',
    borderColor: colors.primary,
    transform: [{ scale: 0.92 }],
  },
  buttonsContainer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
    backgroundColor: colors.background,
  },
  bottomSafeArea: {
    backgroundColor: colors.background,
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    marginTop: 10,
    borderRadius: 32,
    borderWidth: 1,
    borderColor: colors.textRoutineCard + '30',
  },
  addToListButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  deleteTaskButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    marginTop: 10,
    borderRadius: 32,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  deleteTaskButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ef4444',
  },
  difficultySection: {
    marginTop: 20,
    marginBottom: 8,
    marginLeft: 43,
  },
  difficultyLabel: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 12,
    textAlign: 'center',
  },
  difficultyOptions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
  },
  difficultyOption: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.surface,
  },
  difficultyOptionActive: {
    backgroundColor: colors.primary + '20',
    borderColor: colors.primary,
  },
  difficultyOptionText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  difficultyOptionTextActive: {
    color: colors.primary,
  },
});

export default SubtaskListScreen;