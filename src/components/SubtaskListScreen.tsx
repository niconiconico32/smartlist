import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Check,
  Clock,
  Edit2,
  GripVertical,
  Play,
  Plus,
  Sparkles,
  Trash2,
  X
} from 'lucide-react-native';
import React, { useCallback, useRef, useState } from 'react';
import {
  Dimensions,
  LayoutAnimation,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  UIManager,
  useColorScheme,
  View,
} from 'react-native';
import DraggableFlatList, {
  RenderItemParams,
  ScaleDecorator,
} from 'react-native-draggable-flatlist';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, {
  FadeIn,
  Layout,
  SlideInRight,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming
} from 'react-native-reanimated';
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
  onAddToList?: (taskTitle: string, subtasks: Subtask[]) => void;
  // Props for editing existing tasks
  isEditing?: boolean;
  activityId?: string;
  onUpdateTask?: (activityId: string, subtasks: Subtask[]) => void;
  onDeleteTask?: (activityId: string) => void;
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

  // Colors based on theme - Deep Ambient style
  const colors = {
    background: '#1A1A2E',
    surface: 'rgba(49, 50, 68, 0.8)',
    surfaceLight: 'rgba(255, 255, 255, 0.98)',
    text: '#f1f5f9',
    textSecondary: '#94a3b8',
    accent: '#CBA6F7',
    accentLight: '#D4A5FF',
    danger: '#ef4444',
    success: '#A6E3A1',
    border: 'rgba(255, 255, 255, 0.1)',
    metroLine: ['#FF9A9E', '#FECFEF', '#D4A5FF'],
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

  const handleInsertStep = useCallback((atIndex: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    
    const newTask: Subtask = {
      id: Date.now().toString(),
      title: 'Nuevo Subarea',
      duration: 5,
      isCompleted: false,
    };
    
    const newSubtasks = [...subtasks];
    newSubtasks.splice(atIndex, 0, newTask);
    setSubtasks(newSubtasks);
    
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

  const handleStart = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    buttonScale.value = withSequence(
      withTiming(0.95, { duration: 100 }),
      withTiming(1, { duration: 100 })
    );
    
    // Si es edición, actualizar la tarea existente antes de iniciar
    if (isEditing && activityId && onUpdateTask) {
      onUpdateTask(activityId, subtasks);
    }
    
    setTimeout(() => onStart(subtasks), 200);
  }, [subtasks, onStart, buttonScale, isEditing, activityId, onUpdateTask]);

  const handleAddToList = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    // Si es edición, solo actualizar y cerrar
    if (isEditing && activityId && onUpdateTask) {
      onUpdateTask(activityId, subtasks);
      onClose();
      return;
    }
    
    // Si es nueva tarea, agregar a la lista
    if (onAddToList) {
      onAddToList(taskTitle, subtasks);
    }
    onClose();
  }, [taskTitle, subtasks, onAddToList, onClose, isEditing, activityId, onUpdateTask]);

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

  // Render Item
  const renderItem = useCallback(({ item, drag, isActive, getIndex }: RenderItemParams<Subtask>) => {
    const index = getIndex() ?? 0;
    const isEditing = editingId === item.id;

    return (
      <>
        <ScaleDecorator>
          <Animated.View
            entering={SlideInRight.delay(index * 30).duration(300)}
            layout={Layout.springify().damping(15)}
            style={[
              styles.itemContainer,
              isActive && styles.itemContainerActive,
            ]}
          >
            {/* Metro Line Node */}
           

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
                      onPress={() => handleStartEdit(item)}
                      style={styles.actionButton}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <Edit2 size={18} color={colors.accent} />
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

        {/* Insert Step Button (between items) */}
        <Animated.View
          entering={FadeIn.duration(300)}
          layout={Layout.springify().damping(15)}
          style={styles.insertStepButtonContainer}
        >
          <Pressable
            onPress={() => handleInsertStep(index + 1)}
            style={({ pressed }) => [
              styles.insertStepButton,
              pressed && styles.insertStepButtonPressed,
              { borderColor: colors.border }
            ]}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Plus size={16} color={colors.textSecondary} />
          </Pressable>
        </Animated.View>
      </>
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
    handleDelete,
    handleInsertStep,
  ]);

  // Header Component
  const ListHeaderComponent = useCallback(() => (
    <Animated.View 
      entering={FadeIn.duration(300)}
      style={styles.header}
    >
      {/* Task Title */}
      <View style={styles.taskTitleContainer}>
        <Text style={styles.taskEmoji}>{taskEmoji}</Text>
        <Text style={[styles.taskTitle, { color: colors.text }]} numberOfLines={2}>
          {taskTitle}
        </Text>
      </View>

      
      


    </Animated.View>
  ), [taskTitle, taskEmoji, totalSteps, totalMinutes, colors, isDark, handleAddStep]);

  // Footer Component
  const ListFooterComponent = useCallback(() => (
    <Animated.View 
      entering={FadeIn.delay(100).duration(300)}
      style={styles.footer}
    >
      
     

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
          entering={FadeIn.duration(200)}
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

        {/* Buttons Container */}
        <Animated.View 
          entering={FadeIn.duration(300)}
          style={styles.buttonsContainer}
        >
          {/* Start Button - Inner Light Gradient */}
          <AnimatedPressable
            onPress={handleStart}
            style={[buttonAnimatedStyle]}
          >
            <LinearGradient
              colors={['#FF9A9E', '#FECFEF', '#D4A5FF']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.startButton}
            >
              <Play size={22} color="#ffffff" fill="#ffffff" />
              <Text style={styles.startButtonText}>Comenzar Tarea</Text>
            </LinearGradient>
          </AnimatedPressable>

          {/* Add to List / Save Changes Button */}
          {(onAddToList || isEditing) && (
            <Pressable
              onPress={handleAddToList}
              style={styles.addToListButton}
            >
              <Plus size={18} color={colors.textSecondary} />
              <Text style={styles.addToListButtonText}>
                {isEditing ? 'Guardar Cambios' : 'Agregar a Lista de Tareas'}
              </Text>
            </Pressable>
          )}

          {/* Delete Task Button - Only shown when editing */}
          {isEditing && onDeleteTask && (
            <Pressable
              onPress={handleDeleteTask}
              style={styles.deleteTaskButton}
            >
              <Trash2 size={18} color={colors.danger} />
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
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 240,
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
    fontSize: 40,
  },
  taskTitle: {
    fontSize: 26,
    fontWeight: '800',
    flex: 1,
    letterSpacing: -0.5,
    color: '#f1f5f9',
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
    backgroundColor: 'rgba(203, 166, 247, 0.3)',
    marginHorizontal: 24,
  },
  addStepButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 16,
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
    marginBottom: 0,
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
    backgroundColor: 'rgba(203, 166, 247, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    borderWidth: 2,
    borderColor: '#CBA6F7',
  },
  metroNodeCompleted: {
    backgroundColor: 'rgba(166, 227, 161, 0.15)',
    borderColor: '#A6E3A1',
  },
  metroNodeActive: {
    backgroundColor: '#CBA6F7',
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
    shadowColor: '#CBA6F7',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 12,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    minHeight: 74,
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
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(203, 166, 247, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(203, 166, 247, 0.2)',
  },
  editActions: {
    flexDirection: 'row',
    marginLeft: 8,
    gap: 4,
  },
  editButton: {
    padding: 6,
  },
  insertStepButtonContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 0,
  },
  insertStepButton: {
    width: 26,
    height: 26,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(203, 166, 247, 0.08)',
  },
  insertStepButtonPressed: {
    backgroundColor: 'rgba(203, 166, 247, 0.15)',
    transform: [{ scale: 0.92 }],
  },
  buttonsContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    paddingTop: 12,
    backgroundColor: 'rgba(26, 26, 46, 0.95)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
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
    shadowColor: '#D4A5FF',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  startButtonText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: -0.3,
  },
  addToListButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    marginTop: 10,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  addToListButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#94a3b8',
    letterSpacing: -0.2,
  },
  deleteTaskButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    marginTop: 10,
    borderRadius: 16,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  deleteTaskButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#ef4444',
    letterSpacing: -0.2,
  },
});

export default SubtaskListScreen;
