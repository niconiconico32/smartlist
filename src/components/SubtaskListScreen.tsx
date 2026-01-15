import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Pressable,
  TextInput,
  useColorScheme,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import DraggableFlatList, {
  ScaleDecorator,
  RenderItemParams,
} from 'react-native-draggable-flatlist';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withSequence,
  FadeIn,
  FadeOut,
  SlideInDown,
  SlideInRight,
  ZoomIn,
  Layout,
  Easing,
  interpolateColor,
  runOnJS,
} from 'react-native-reanimated';
import { 
  GripVertical, 
  Trash2, 
  Plus, 
  Play, 
  Clock, 
  Sparkles,
  CheckCircle2,
  Circle,
  Edit3,
  X,
  Check,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';

// Enable LayoutAnimation for Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

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
  onStart: (subtasks: Subtask[]) => void;
  onClose: () => void;
}

// Animated Pressable
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function SubtaskListScreen({
  taskTitle,
  taskEmoji,
  initialSubtasks,
  onStart,
  onClose,
}: SubtaskListScreenProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  
  const [subtasks, setSubtasks] = useState<Subtask[]>(initialSubtasks);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');
  const editInputRef = useRef<TextInput>(null);
  
  // Animation values
  const buttonScale = useSharedValue(1);
  const headerOpacity = useSharedValue(0);

  // Colors based on theme
  const colors = {
    background: isDark ? '#0f0f0f' : '#f8fafc',
    surface: isDark ? 'rgba(30, 30, 40, 0.8)' : 'rgba(255, 255, 255, 0.85)',
    text: isDark ? '#f1f5f9' : '#1e293b',
    textSecondary: isDark ? '#94a3b8' : '#64748b',
    accent: '#7c3aed',
    accentLight: '#a78bfa',
    danger: '#ef4444',
    success: '#22c55e',
    border: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)',
    metroLine: isDark ? ['#7c3aed', '#a78bfa', '#c4b5fd'] : ['#7c3aed', '#8b5cf6', '#a78bfa'],
  };

  // Calculate totals
  const totalSteps = subtasks.length;
  const totalMinutes = subtasks.reduce((sum, task) => sum + task.duration, 0);

  // Handlers
  const handleDragBegin = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }, []);

  const handleDragEnd = useCallback(({ data }: { data: Subtask[] }) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSubtasks(data);
  }, []);

  const handleAddStep = useCallback((position: 'start' | 'end') => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    
    const newTask: Subtask = {
      id: Date.now().toString(),
      title: 'Nuevo paso',
      duration: 5,
      isCompleted: false,
    };
    
    if (position === 'start') {
      setSubtasks([newTask, ...subtasks]);
    } else {
      setSubtasks([...subtasks, newTask]);
    }
    
    // Start editing the new task
    setTimeout(() => {
      setEditingId(newTask.id);
      setEditingText(newTask.title);
    }, 100);
  }, [subtasks]);

  const handleDelete = useCallback((id: string) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setSubtasks(subtasks.filter(task => task.id !== id));
  }, [subtasks]);

  const handleStartEdit = useCallback((task: Subtask) => {
    Haptics.selectionAsync();
    setEditingId(task.id);
    setEditingText(task.title);
    setTimeout(() => editInputRef.current?.focus(), 100);
  }, []);

  const handleSaveEdit = useCallback(() => {
    if (editingId && editingText.trim()) {
      setSubtasks(subtasks.map(task => 
        task.id === editingId 
          ? { ...task, title: editingText.trim() }
          : task
      ));
    }
    setEditingId(null);
    setEditingText('');
    Haptics.selectionAsync();
  }, [editingId, editingText, subtasks]);

  const handleCancelEdit = useCallback(() => {
    setEditingId(null);
    setEditingText('');
  }, []);

  const handleToggleComplete = useCallback((id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSubtasks(subtasks.map(task =>
      task.id === id ? { ...task, isCompleted: !task.isCompleted } : task
    ));
  }, [subtasks]);

  const handleStart = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    buttonScale.value = withSequence(
      withTiming(0.95, { duration: 100 }),
      withTiming(1, { duration: 100 })
    );
    setTimeout(() => onStart(subtasks), 200);
  }, [subtasks, onStart, buttonScale]);

  // Animated styles
  const buttonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }],
  }));

  // Render Item
  const renderItem = useCallback(({ item, drag, isActive, getIndex }: RenderItemParams<Subtask>) => {
    const index = getIndex() ?? 0;
    const isEditing = editingId === item.id;
    const isLast = index === subtasks.length - 1;

    return (
      <ScaleDecorator>
        <Animated.View
          entering={SlideInRight.delay(index * 50).springify().damping(15)}
          layout={Layout.springify().damping(15)}
          style={[
            styles.itemContainer,
            isActive && styles.itemContainerActive,
          ]}
        >
          {/* Metro Line Node */}
          <View style={styles.metroNodeContainer}>
            <LinearGradient
              colors={colors.metroLine as [string, string, ...string[]]}
              style={[
                styles.metroLine,
                index === 0 && styles.metroLineFirst,
                isLast && styles.metroLineLast,
              ]}
            />
            <Animated.View 
              style={[
                styles.metroNode,
                item.isCompleted && styles.metroNodeCompleted,
                isActive && styles.metroNodeActive,
              ]}
            >
              {item.isCompleted ? (
                <CheckCircle2 size={16} color="#22c55e" />
              ) : (
                <Text style={[styles.metroNodeText, { color: colors.accent }]}>
                  {index + 1}
                </Text>
              )}
            </Animated.View>
          </View>

          {/* Card */}
          <Pressable
            onLongPress={drag}
            onPress={() => !isEditing && handleStartEdit(item)}
            delayLongPress={150}
            disabled={isActive}
            style={[styles.cardWrapper, isActive && styles.cardWrapperActive]}
          >
            <BlurView
              intensity={isActive ? 50 : 30}
              tint={isDark ? 'dark' : 'light'}
              style={[
                styles.card,
                { 
                  backgroundColor: isActive 
                    ? (isDark ? 'rgba(124, 58, 237, 0.15)' : 'rgba(124, 58, 237, 0.1)')
                    : colors.surface,
                  borderColor: isActive ? colors.accent : colors.border,
                },
              ]}
            >
              {/* Drag Handle */}
              <View style={styles.dragHandle}>
                <GripVertical 
                  size={18} 
                  color={isActive ? colors.accent : colors.textSecondary} 
                />
              </View>

              {/* Content */}
              <View style={styles.cardContent}>
                {isEditing ? (
                  <View style={styles.editContainer}>
                    <TextInput
                      ref={editInputRef}
                      value={editingText}
                      onChangeText={setEditingText}
                      style={[styles.editInput, { color: colors.text }]}
                      placeholder="Nombre del paso..."
                      placeholderTextColor={colors.textSecondary}
                      onSubmitEditing={handleSaveEdit}
                      autoFocus
                      selectTextOnFocus
                    />
                    <View style={styles.editActions}>
                      <Pressable 
                        onPress={handleCancelEdit}
                        style={styles.editButton}
                      >
                        <X size={18} color={colors.danger} />
                      </Pressable>
                      <Pressable 
                        onPress={handleSaveEdit}
                        style={styles.editButton}
                      >
                        <Check size={18} color={colors.success} />
                      </Pressable>
                    </View>
                  </View>
                ) : (
                  <>
                    <Text 
                      style={[
                        styles.cardTitle, 
                        { color: colors.text },
                        item.isCompleted && styles.cardTitleCompleted,
                      ]}
                      numberOfLines={2}
                    >
                      {item.title}
                    </Text>
                    <View style={styles.cardMeta}>
                      <Clock size={12} color={colors.textSecondary} />
                      <Text style={[styles.cardDuration, { color: colors.textSecondary }]}>
                        {item.duration} min
                      </Text>
                    </View>
                  </>
                )}
              </View>

              {/* Actions */}
              {!isEditing && (
                <View style={styles.cardActions}>
                  <Pressable
                    onPress={() => handleToggleComplete(item.id)}
                    style={styles.actionButton}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    {item.isCompleted ? (
                      <CheckCircle2 size={20} color={colors.success} />
                    ) : (
                      <Circle size={20} color={colors.textSecondary} />
                    )}
                  </Pressable>
                  <Pressable
                    onPress={() => handleDelete(item.id)}
                    style={styles.actionButton}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Trash2 size={18} color={colors.danger} />
                  </Pressable>
                </View>
              )}
            </BlurView>
          </Pressable>
        </Animated.View>
      </ScaleDecorator>
    );
  }, [
    colors, 
    isDark, 
    editingId, 
    editingText, 
    subtasks.length,
    handleStartEdit,
    handleSaveEdit,
    handleCancelEdit,
    handleToggleComplete,
    handleDelete,
  ]);

  // Header Component
  const ListHeaderComponent = useCallback(() => (
    <Animated.View 
      entering={FadeIn.duration(400)}
      style={styles.header}
    >
      {/* Task Title */}
      <View style={styles.taskTitleContainer}>
        <Text style={styles.taskEmoji}>{taskEmoji}</Text>
        <Text style={[styles.taskTitle, { color: colors.text }]} numberOfLines={2}>
          {taskTitle}
        </Text>
      </View>

      {/* Stats */}
      <View style={[styles.statsContainer, { backgroundColor: colors.surface }]}>
        <BlurView intensity={20} tint={isDark ? 'dark' : 'light'} style={styles.statsBlur}>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.accent }]}>{totalSteps}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Pasos</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.accent }]}>{totalMinutes}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Minutos</Text>
          </View>
        </BlurView>
      </View>

      {/* Add Step at Start */}
      <Pressable
        onPress={() => handleAddStep('start')}
        style={({ pressed }) => [
          styles.addStepButton,
          styles.addStepButtonTop,
          { 
            backgroundColor: pressed ? colors.accent : 'transparent',
            borderColor: colors.accent,
          },
        ]}
      >
        <Plus size={16} color={colors.accent} />
        <Text style={[styles.addStepText, { color: colors.accent }]}>
          Agregar paso inicial
        </Text>
      </Pressable>
    </Animated.View>
  ), [taskTitle, taskEmoji, totalSteps, totalMinutes, colors, isDark, handleAddStep]);

  // Footer Component
  const ListFooterComponent = useCallback(() => (
    <Animated.View 
      entering={FadeIn.delay(200).duration(400)}
      style={styles.footer}
    >
      {/* Add Step at End */}
      <Pressable
        onPress={() => handleAddStep('end')}
        style={({ pressed }) => [
          styles.addStepButton,
          { 
            backgroundColor: pressed ? colors.accent : 'transparent',
            borderColor: colors.border,
          },
        ]}
      >
        <Plus size={16} color={colors.textSecondary} />
        <Text style={[styles.addStepText, { color: colors.textSecondary }]}>
          Agregar paso final
        </Text>
      </Pressable>

      {/* Tip */}
      <View style={styles.tipContainer}>
        <Sparkles size={14} color={colors.accentLight} />
        <Text style={[styles.tipText, { color: colors.textSecondary }]}>
          Mantén presionado y arrastra para reordenar
        </Text>
      </View>
    </Animated.View>
  ), [colors, handleAddStep]);

  return (
    <GestureHandlerRootView style={[styles.container, { backgroundColor: colors.background }]}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {/* Close Button */}
        <Animated.View 
          entering={FadeIn.duration(300)}
          style={styles.closeButtonContainer}
        >
          <Pressable
            onPress={onClose}
            style={[styles.closeButton, { backgroundColor: colors.surface }]}
          >
            <X size={22} color={colors.text} />
          </Pressable>
        </Animated.View>

        {/* Draggable List */}
        <DraggableFlatList
          data={subtasks}
          onDragBegin={handleDragBegin}
          onDragEnd={handleDragEnd}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          ListHeaderComponent={ListHeaderComponent}
          ListFooterComponent={ListFooterComponent}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          activationDistance={10}
        />

        {/* Start Button */}
        <Animated.View 
          entering={SlideInDown.springify().damping(15)}
          style={styles.startButtonContainer}
        >
          <AnimatedPressable
            onPress={handleStart}
            style={[buttonAnimatedStyle]}
          >
            <LinearGradient
              colors={['#7c3aed', '#8b5cf6', '#a78bfa']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.startButton}
            >
              <Play size={22} color="#ffffff" fill="#ffffff" />
              <Text style={styles.startButtonText}>Comenzar Tarea</Text>
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
  },
  safeArea: {
    flex: 1,
  },
  closeButtonContainer: {
    position: 'absolute',
    top: 60,
    right: 20,
    zIndex: 100,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 120,
  },
  header: {
    paddingTop: 20,
    paddingBottom: 16,
    marginRight: 50,
  },
  taskTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 24,
  },
  taskEmoji: {
    fontSize: 36,
  },
  taskTitle: {
    fontSize: 24,
    fontWeight: '800',
    flex: 1,
    letterSpacing: -0.5,
  },
  statsContainer: {
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 24,
  },
  statsBlur: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    paddingHorizontal: 32,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: -1,
  },
  statLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: 'rgba(124, 58, 237, 0.3)',
    marginHorizontal: 24,
  },
  addStepButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1.5,
    borderStyle: 'dashed',
  },
  addStepButtonTop: {
    marginBottom: 8,
  },
  addStepText: {
    fontSize: 14,
    fontWeight: '600',
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
    fontSize: 13,
    fontWeight: '500',
  },
  itemContainer: {
    flexDirection: 'row',
    alignItems: 'stretch',
    marginBottom: 12,
  },
  itemContainerActive: {
    zIndex: 100,
  },
  metroNodeContainer: {
    width: 36,
    alignItems: 'center',
    marginRight: 12,
  },
  metroLine: {
    position: 'absolute',
    width: 3,
    top: 0,
    bottom: 0,
    borderRadius: 1.5,
  },
  metroLineFirst: {
    top: 28,
  },
  metroLineLast: {
    bottom: '50%',
  },
  metroNode: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(124, 58, 237, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    borderWidth: 2,
    borderColor: '#7c3aed',
  },
  metroNodeCompleted: {
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    borderColor: '#22c55e',
  },
  metroNodeActive: {
    backgroundColor: '#7c3aed',
    transform: [{ scale: 1.2 }],
  },
  metroNodeText: {
    fontSize: 12,
    fontWeight: '800',
  },
  cardWrapper: {
    flex: 1,
  },
  cardWrapperActive: {
    shadowColor: '#7c3aed',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 12,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    minHeight: 70,
  },
  dragHandle: {
    paddingRight: 10,
    paddingVertical: 4,
  },
  cardContent: {
    flex: 1,
    marginRight: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
    lineHeight: 22,
  },
  cardTitleCompleted: {
    textDecorationLine: 'line-through',
    opacity: 0.6,
  },
  cardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  cardDuration: {
    fontSize: 12,
    fontWeight: '500',
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionButton: {
    padding: 6,
  },
  editContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  editInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(124, 58, 237, 0.1)',
  },
  editActions: {
    flexDirection: 'row',
    marginLeft: 8,
    gap: 4,
  },
  editButton: {
    padding: 6,
  },
  startButtonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    paddingTop: 12,
  },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 18,
    borderRadius: 20,
    shadowColor: '#7c3aed',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  startButtonText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: -0.3,
  },
});

export default SubtaskListScreen;
