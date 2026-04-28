import { PRIMARY_GRADIENT_COLORS, primaryButtonGradient, primaryButtonStyles, primaryButtonText } from '@/constants/buttons';
import { colors } from '@/constants/theme';
import { AppText as Text } from '@/src/components/AppText';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Check,
  Clock,
  GripVertical,
  Plus,
  Sparkles,
  Trash2,
} from 'lucide-react-native';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { FlatList, Keyboard, LayoutAnimation, Platform, Pressable, ScrollView, StyleSheet, TextInput, UIManager, View } from 'react-native';
import DraggableFlatList, {
  RenderItemParams,
  ScaleDecorator,
} from 'react-native-draggable-flatlist';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, {
  FadeIn,
  FadeInDown,
  Layout,
  SlideInRight,
  useAnimatedKeyboard,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { slideStyles } from '../../styles/shared';

// Enable LayoutAnimation for Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// Utility para generar IDs seguros
const generateId = () => `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

// Types
export type Subtask = {
  id: string;
  title: string;
  duration: number;
  isCompleted: boolean;
};

interface OnboardingSubtaskListProps {
  taskTitle: string;
  taskEmoji: string;
  initialSubtasks: Subtask[];
  onAddToHome: (subtasks: Subtask[], difficulty: "easy" | "moderate" | "hard") => void;
}

// Animated Pressable
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function OnboardingSubtaskList({
  taskTitle,
  taskEmoji,
  initialSubtasks,
  onAddToHome,
}: OnboardingSubtaskListProps) {

  const [subtasks, setSubtasks] = useState<Subtask[]>(initialSubtasks);
  const [difficulty, setDifficulty] = useState<"easy" | "moderate" | "hard">("easy");
  const [editingId, setEditingId] = useState<string | null>(null);

  const taskInputRefs = useRef<{ [key: string]: TextInput | null }>({});
  const flatListRef = useRef<FlatList<Subtask>>(null);
  const timeoutRefs = useRef<Array<ReturnType<typeof setTimeout>>>([]);

  // Animation values
  const buttonScale = useSharedValue(1);
  const keyboard = useAnimatedKeyboard();

  // Limpieza de timeouts
  useEffect(() => {
    return () => {
      timeoutRefs.current.forEach(clearTimeout);
    };
  }, []);

  const registerTimeout = useCallback((callback: () => void, delay: number) => {
    const id = setTimeout(callback, delay);
    timeoutRefs.current.push(id);
  }, []);

  // Handlers
  const handleDragBegin = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }, []);

  const handleDragEnd = useCallback(({ data }: { data: Subtask[] }) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSubtasks(data);
  }, []);

  const handleInsertStep = useCallback((atIndex: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);

    const newTask: Subtask = {
      id: generateId(),
      title: '',
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

  const handleAddToHomePress = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    buttonScale.value = withSequence(
      withTiming(0.95, { duration: 100 }),
      withTiming(1, { duration: 100 })
    );

    const validSubtasks = subtasks.filter(t => t.title.trim() !== '');
    registerTimeout(() => onAddToHome(validSubtasks, difficulty), 200);
  }, [subtasks, difficulty, onAddToHome, buttonScale, registerTimeout]);

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
          <View
            style={[
              styles.taskItem,
              isActive && styles.taskItemDragging
            ]}
          >
            {/* Drag Handle */}
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
              <GripVertical size={20} color={`${colors.background}66`} />
            </Pressable>

            <View style={styles.cardContent}>
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
                    !item.title && styles.taskItemTextEmpty
                  ]}
                  value={item.title}
                  onChangeText={(text) => {
                    setSubtasks(prev => prev.map(t => t.id === item.id ? { ...t, title: text } : t));
                  }}
                  placeholder="Tarea vacía"
                  placeholderTextColor={colors.textSecondary + '80'}
                  multiline={false}
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
                      }, 100);
                    }}
                    style={{ flexGrow: 1, justifyContent: 'center' }}
                  >
                    <Text
                      style={[
                        styles.taskItemText,
                        !item.title && styles.taskItemTextEmpty
                      ]}
                    >
                      {item.title || "Tarea vacía"}
                    </Text>
                  </Pressable>
                </ScrollView>
              )}

              <View style={styles.cardMeta}>
                <View style={styles.durationBadge}>
                  <Clock size={12} color="#FFFFFF" />
                  <Text style={styles.cardDurationInput}>
                    {item.duration > 0 ? item.duration : '0'}
                  </Text>
                  <Text style={styles.cardDurationLabel}>min</Text>
                </View>
              </View>
            </View>

            {/* Action button: Check when editing, Trash when not */}
            <Pressable
              onPress={() => {
                if (isItemEditing) {
                  Keyboard.dismiss();
                  setEditingId(null);
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                } else {
                  handleDelete(item.id);
                }
              }}
              style={styles.actionIcon}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              {isItemEditing ? (
                <Check size={18} color={colors.surface} strokeWidth={3} />
              ) : (
                <Trash2 size={18} color={`${colors.background}66`} />
              )}
            </Pressable>
          </View>

          {/* Insert button */}
          <View style={styles.insertStepButtonWrapper}>
            <Pressable
              onPress={() => handleInsertStep(index + 1)}
              style={({ pressed }) => [
                styles.insertStepButton,
                pressed && styles.insertStepButtonPressed
              ]}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Plus size={16} color="#FFFFFF" />
            </Pressable>
          </View>
        </Animated.View>
      </ScaleDecorator>
    );
  }, [
    editingId,
    handleDelete,
    handleInsertStep,
  ]);

  const ListHeaderComponent = useCallback(() => (
    <Animated.View style={styles.header}>
      <Animated.Text entering={FadeInDown.delay(100).duration(500)} style={[slideStyles.slideSubtitle, { color: colors.surface }]}>
        ¡listo! dividí tu tarea
      </Animated.Text>

      <Animated.Text entering={FadeInDown.delay(200).duration(500)} style={[slideStyles.slideTitle, { color: colors.background, marginBottom: 24 }]}>
        acá tienes el paso a paso para empezar a <Text style={{ color: colors.surface }}>{taskTitle.toLowerCase()}</Text>
      </Animated.Text>
    </Animated.View>
  ), [taskTitle, taskEmoji, difficulty]);

  const ListFooterComponent = useCallback(() => (
    <>
      <Animated.View entering={FadeIn.delay(100).duration(300)} style={styles.footer}>
        <View style={styles.tipContainer}>
          <Sparkles size={14} color={colors.surface} />
          <Text style={styles.tipText}>
            Mantén presionado y arrastra para reordenar
          </Text>
        </View>
      </Animated.View>

      <Animated.View style={footerSpacerStyle} />
    </>
  ), [footerSpacerStyle]);

  return (
    <GestureHandlerRootView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
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

      {/* Bottom button */}
      <SafeAreaView edges={['bottom']} style={styles.bottomSafeArea}>
        <Animated.View
          entering={FadeIn.duration(300)}
          style={[styles.buttonsContainer, buttonsContainerAnimatedStyle]}
          pointerEvents={editingId !== null ? 'none' : 'box-none'}
        >
          <AnimatedPressable onPress={handleAddToHomePress} style={[buttonAnimatedStyle, styles.createButton]}>
            <LinearGradient
              colors={PRIMARY_GRADIENT_COLORS}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.createButtonGradient}
            >
              <Plus size={20} color="#1E1E2E" style={{ marginRight: 8 }} />
              <Text style={styles.createButtonText}>Continuar</Text>
            </LinearGradient>
          </AnimatedPressable>
        </Animated.View>
      </SafeAreaView>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f2f2f2',
  },
  safeArea: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  header: {
    paddingBottom: 16,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 24,
  },
  emojiContainer: {
    paddingLeft: 4,
  },
  emoji: {
    fontSize: 22,
  },
  taskTitle: {
    fontSize: 18,
    fontWeight: '800',
    flex: 1,
  },
  footer: {
    paddingTop: 8,
    paddingBottom: 8,
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
    color: `${colors.background}99`, // Darker color for visibility on light background
    fontStyle: 'italic',
  },
  itemContainer: {
    flexDirection: 'column',
    alignItems: 'stretch',
    marginBottom: 0,
    position: 'relative',
    zIndex: 1,
    overflow: 'visible',
    paddingBottom: 12,
  },
  itemContainerActive: {
    zIndex: 100,
  },
  taskItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#EAEAEC',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  taskItemDragging: {
    backgroundColor: '#FFFFFF',
    borderColor: colors.surface,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 10,
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
    fontSize: 15,
    fontWeight: '600',
    color: colors.background,
    marginBottom: 6,
    padding: 0,
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
    backgroundColor: colors.surface,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  cardDurationInput: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
    padding: 0,
    margin: 0,
    minWidth: 15,
    textAlign: 'center',
  },
  cardDurationLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  actionIcon: {
    padding: 6,
    marginRight: 6,
  },
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
    borderColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.surface,
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
    backgroundColor: '#f2f2f2',
  },
  bottomSafeArea: {
    backgroundColor: '#f2f2f2',
  },
  createButton: {
    ...primaryButtonStyles,
  },
  createButtonGradient: {
    ...primaryButtonGradient,
  },
  createButtonText: {
    ...primaryButtonText,
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
    backgroundColor: '#f2f2f2',
    borderWidth: 1,
    borderColor: '#f2f2f2',
  },
  difficultyOptionText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
});

export default OnboardingSubtaskList;
