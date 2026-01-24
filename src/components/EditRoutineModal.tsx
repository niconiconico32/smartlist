import { colors } from '@/constants/theme';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { Bell, GripVertical, Plus, Trash2, X } from 'lucide-react-native';
import React, { useCallback, useEffect, useState } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import DraggableFlatList, {
  RenderItemParams,
  ScaleDecorator,
} from 'react-native-draggable-flatlist';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

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
}

interface EditRoutineModalProps {
  visible: boolean;
  routine: Routine | null;
  onClose: () => void;
  onSave: (routine: Routine) => void;
}

const DAYS_OF_WEEK = [
  { short: 'Lun', full: 'Lunes' },
  { short: 'Mar', full: 'Martes' },
  { short: 'Mié', full: 'Miércoles' },
  { short: 'Jue', full: 'Jueves' },
  { short: 'Vie', full: 'Viernes' },
  { short: 'Sáb', full: 'Sábado' },
  { short: 'Dom', full: 'Domingo' },
];

export const EditRoutineModal: React.FC<EditRoutineModalProps> = ({
  visible,
  routine,
  onClose,
  onSave,
}) => {
  const [routineName, setRoutineName] = useState('');
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [reminderTime, setReminderTime] = useState(new Date());
  const [showTimePicker, setShowTimePicker] = useState(false);

  // Cargar datos de la rutina cuando cambia
  useEffect(() => {
    if (routine && visible) {
      setRoutineName(routine.name);
      setSelectedDays(routine.days || []);
      setTasks(routine.tasks || []);
      setReminderEnabled(routine.reminderEnabled);
      if (routine.reminderTime) {
        const [hours, minutes] = routine.reminderTime.split(':');
        const date = new Date();
        date.setHours(parseInt(hours), parseInt(minutes));
        setReminderTime(date);
      }
    }
  }, [routine, visible]);

  const triggerHaptic = (style: 'light' | 'medium' | 'selection' = 'light') => {
    if (Platform.OS === 'ios') {
      if (style === 'selection') Haptics.selectionAsync();
      else if (style === 'medium') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      else Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const handleAddTask = () => {
    if (newTaskTitle.trim()) {
      const newTask: Task = {
        id: Date.now().toString(),
        title: newTaskTitle.trim(),
        completed: false,
      };
      setTasks(prev => [...prev, newTask]);
      setNewTaskTitle('');
      triggerHaptic('light');
    }
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
    triggerHaptic('selection');
  };

  const handleRemoveTask = (taskId: string) => {
    setTasks(prev => prev.filter((t) => t.id !== taskId));
    triggerHaptic('medium');
  };

  const handleTimeChange = (event: any, selectedTime?: Date) => {
    setShowTimePicker(false);
    if (selectedTime) {
      setReminderTime(selectedTime);
    }
  };

  const handleSaveRoutine = () => {
    if (routineName.trim() && tasks.length > 0 && selectedDays.length > 0 && routine) {
      const timeString = reminderTime.toLocaleTimeString('es-ES', {
        hour: '2-digit',
        minute: '2-digit',
      });

      const updatedRoutine: Routine = {
        id: routine.id,
        name: routineName.trim(),
        days: selectedDays,
        tasks: tasks.map(t => ({ ...t, completed: t.completed ?? false })),
        reminderEnabled,
        reminderTime: reminderEnabled ? timeString : undefined,
      };

      onSave(updatedRoutine);
      onClose();
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const renderTaskItem = useCallback(
    ({ item, drag, isActive, getIndex }: RenderItemParams<Task>) => {
      const index = getIndex() ?? 0;
      return (
        <ScaleDecorator>
          <Pressable
            onLongPress={() => {
              triggerHaptic('medium');
              drag();
            }}
            disabled={isActive}
            style={[
              styles.taskItem,
              isActive && styles.taskItemDragging,
            ]}
          >
            <Pressable onPressIn={drag} style={styles.dragHandle}>
              <GripVertical size={18} color={colors.textSecondary} />
            </Pressable>
            <View style={styles.taskNumber}>
              <Text style={styles.taskNumberText}>{index + 1}</Text>
            </View>
            <Text style={styles.taskItemText}>{item.title}</Text>
            <Pressable
              onPress={() => handleRemoveTask(item.id)}
              style={styles.actionIcon}
              hitSlop={10}
            >
              <Trash2 size={18} color={colors.textSecondary} />
            </Pressable>
          </Pressable>
        </ScaleDecorator>
      );
    },
    [tasks]
  );

  const isValid = routineName.trim().length > 0 && tasks.length > 0 && selectedDays.length > 0;

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <GestureHandlerRootView style={{ flex: 1 }}>
        <View style={styles.overlay}>
          <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.title}>Editar Rutina</Text>
              <Pressable onPress={onClose} style={styles.closeButton}>
                <X size={24} color={colors.textPrimary} />
              </Pressable>
            </View>

            {/* Content */}
            <ScrollView 
              style={styles.scrollContent}
              contentContainerStyle={styles.scrollContentContainer}
              showsVerticalScrollIndicator={true}
              keyboardShouldPersistTaps="handled"
              nestedScrollEnabled={true}
            >
              <View>
              {/* Routine Name Input */}
              <View style={styles.section}>
                <Text style={styles.label}>Nombre de la rutina</Text>
                <View style={{ height: 12 }} />
                <TextInput
                  style={styles.input}
                  placeholder="Ej: Rutina Matutina"
                  placeholderTextColor={colors.textSecondary}
                  value={routineName}
                  onChangeText={setRoutineName}
                />
              </View>

              {/* Day Selection */}
              <View style={styles.section}>
                <Text style={styles.label}>Día de la semana</Text>
                <View style={{ height: 12 }} />
                <View style={styles.daysContainer}>
                  {DAYS_OF_WEEK.map((day) => (
                    <Pressable
                      key={day.short}
                      onPress={() => handleToggleDay(day.short)}
                      style={[
                        styles.dayButton,
                        selectedDays.includes(day.short) && styles.dayButtonActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.dayButtonText,
                          selectedDays.includes(day.short) && styles.dayButtonTextActive,
                        ]}
                      >
                        {day.short}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              {/* Tasks Section */}
              <View style={styles.tasksSection}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.label}>Tareas</Text>
                  {tasks.length > 0 && (
                    <Text style={styles.helperText}>Mantén presionado para ordenar</Text>
                  )}
                </View>
                <View style={{ height: 12 }} />

                {/* Task Input */}
                <View style={styles.taskInputContainer}>
                  <TextInput
                    style={styles.taskInput}
                    placeholder="Escribir siguiente paso..."
                    placeholderTextColor={colors.textSecondary}
                    value={newTaskTitle}
                    onChangeText={setNewTaskTitle}
                    onSubmitEditing={handleAddTask}
                    returnKeyType="done"
                  />
                  <Pressable onPress={handleAddTask} style={styles.addTaskButton}>
                    <Plus size={24} color="#FFFFFF" strokeWidth={3} />
                  </Pressable>
                </View>

                <View style={{ height: 12 }} />

                {/* Task List - Draggable */}
                {tasks.length > 0 ? (
                  <View style={styles.taskListWrapper}>
                    <DraggableFlatList
                      data={tasks}
                      onDragEnd={({ data }) => {
                        setTasks(data);
                        triggerHaptic('medium');
                      }}
                      keyExtractor={(item) => item.id}
                      renderItem={renderTaskItem}
                      scrollEnabled={false}
                      containerStyle={{ overflow: 'visible' }}
                    />
                  </View>
                ) : (
                  <View style={styles.emptyStateContainer}>
                    <Text style={styles.emptyTasksText}>
                      Aún no hay tareas. Agrega la primera arriba.
                    </Text>
                  </View>
                )}
              </View>

              {/* Reminder Section */}
              <View style={styles.section}>
                <Pressable 
                  onPress={() => setReminderEnabled(!reminderEnabled)}
                  style={[
                    styles.reminderCard, 
                    reminderEnabled && styles.reminderCardActive
                  ]}
                >
                  <View style={styles.reminderInfo}>
                    <View style={[
                      styles.iconContainer, 
                      reminderEnabled && styles.iconContainerActive
                    ]}>
                      <Bell size={20} color={reminderEnabled ? '#FFF' : colors.textSecondary} />
                    </View>
                    <View>
                      <Text style={[
                        styles.reminderTitle,
                        reminderEnabled && styles.reminderTitleActive
                      ]}>
                        {reminderEnabled ? 'Recordatorio Activado' : 'Sin recordatorio'}
                      </Text>
                      <Text style={styles.reminderSubtitle}>
                        {reminderEnabled ? 'Te avisaremos a esta hora' : 'Toca para activar'}
                      </Text>
                    </View>
                  </View>

                  {reminderEnabled && (
                    <Pressable 
                      style={styles.timeDisplay}
                      onPress={() => setShowTimePicker(true)}
                    >
                      <Text style={styles.timeDisplayText}>{formatTime(reminderTime)}</Text>
                    </Pressable>
                  )}
                </Pressable>

                {showTimePicker && (
                  <DateTimePicker
                    value={reminderTime}
                    mode="time"
                    display="spinner"
                    onChange={handleTimeChange}
                  />
                )}
              </View>

              </View>
            </ScrollView>

          {/* Save Button Footer */}
          <View style={styles.footer}>
            <Pressable
              onPress={handleSaveRoutine}
              disabled={!isValid}
              style={[
                styles.createButton,
                !isValid && styles.createButtonDisabled,
              ]}
            >
              <LinearGradient
                colors={['#CBA6F7', '#FAB387']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.createButtonGradient}
              >
                <Text style={styles.createButtonText}>Guardar Cambios</Text>
              </LinearGradient>
            </Pressable>
          </View>
          </View>
        </View>
      </GestureHandlerRootView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '92%',
    minHeight: '70%',
    flexDirection: 'column',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(203, 166, 247, 0.1)',
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  closeButton: {
    padding: 8,
    backgroundColor: colors.surface,
    borderRadius: 50,
  },
  scrollContent: {
    flex: 1,
    flexGrow: 1,
  },
  scrollContentContainer: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
    flexGrow: 1,
  },
  section: {
    marginBottom: 20,
  },
  tasksSection: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  helperText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  input: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 15,
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  daysContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
  },
  dayButton: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: colors.surface,
    minWidth: 45,
    alignItems: 'center',
    margin: 4,
  },
  dayButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  dayButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  dayButtonTextActive: {
    color: '#1E1E2E',
    fontWeight: '700',
  },
  
  // Tasks
  taskListWrapper: {
    borderRadius: 16,
    width: '100%',
  },
  taskNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primary + '30',
    alignItems: 'center',
    justifyContent: 'center',
  },
  taskNumberText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
  },
  taskItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surfaceHighlight,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.primary + '20',
    minHeight: 56,
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
    fontSize: 15,
    fontWeight: '500',
    color: colors.textPrimary,
  },
  dragHandle: {
    padding: 4,
    marginRight: -4,
  },
  actionIcon: {
    padding: 4,
  },
  emptyStateContainer: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderRadius: 16,
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  emptyTasksText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  taskInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  taskInput: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: colors.primary + '40',
  },
  addTaskButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },

  // Reminder
  reminderCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  reminderCardActive: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(203, 166, 247, 0.05)',
  },
  reminderInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainerActive: {
    backgroundColor: colors.primary,
  },
  reminderTitle: {
    fontSize: 15,
    fontWeight: '600',
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
    fontWeight: '700',
    color: colors.primary,
  },

  footer: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
    backgroundColor: colors.background,
  },
  createButton: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  createButtonDisabled: {
    opacity: 0.5,
  },
  createButtonGradient: {
    paddingVertical: 18,
    alignItems: 'center',
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E1E2E',
  },
});
