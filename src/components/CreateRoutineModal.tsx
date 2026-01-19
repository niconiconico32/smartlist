import { colors } from '@/constants/theme';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { Plus, X } from 'lucide-react-native';
import React, { useState } from 'react';
import {
    Modal,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    View,
} from 'react-native';

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
  }) => void;
}

const DAYS_OF_WEEK = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

export const CreateRoutineModal: React.FC<CreateRoutineModalProps> = ({
  visible,
  onClose,
  onCreateRoutine,
}) => {
  const [routineName, setRoutineName] = useState('');
  const [selectedDays, setSelectedDays] = useState<string[]>(['Lunes']);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [reminderTime, setReminderTime] = useState(new Date());
  const [showTimePicker, setShowTimePicker] = useState(false);

  const handleAddTask = () => {
    if (newTaskTitle.trim()) {
      const newTask: Task = {
        id: Date.now().toString(),
        title: newTaskTitle,
      };
      setTasks([...tasks, newTask]);
      setNewTaskTitle('');
      
      if (Platform.OS === 'ios') {
        Haptics.selectionAsync();
      } else {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    }
  };

  const handleToggleDay = (day: string) => {
    setSelectedDays((prev) => {
      if (prev.includes(day)) {
        // Si solo hay un día seleccionado, no permitir deseleccionar
        if (prev.length === 1) {
          return prev;
        }
        return prev.filter((d) => d !== day);
      } else {
        return [...prev, day];
      }
    });

    if (Platform.OS === 'ios') {
      Haptics.selectionAsync();
    } else {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const handleRemoveTask = (taskId: string) => {
    setTasks(tasks.filter((t) => t.id !== taskId));
  };

  const handleTimeChange = (event: any, selectedTime?: Date) => {
    if (selectedTime) {
      setReminderTime(selectedTime);
    }
    setShowTimePicker(false);
  };

  const handleCreateRoutine = () => {
    if (routineName.trim() && tasks.length > 0 && selectedDays.length > 0) {
      const timeString = reminderTime.toLocaleTimeString('es-ES', {
        hour: '2-digit',
        minute: '2-digit',
      });

      onCreateRoutine({
        name: routineName,
        days: selectedDays,
        tasks,
        reminderEnabled,
        reminderTime: reminderEnabled ? timeString : undefined,
      });

      // Reset form
      setRoutineName('');
      setSelectedDays(['Lunes']);
      setTasks([]);
      setNewTaskTitle('');
      setReminderEnabled(false);
      setReminderTime(new Date());
      onClose();
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Nueva Rutina</Text>
            <Pressable onPress={onClose} style={styles.closeButton}>
              <X size={24} color={colors.textPrimary} />
            </Pressable>
          </View>

          <ScrollView
            style={styles.content}
            contentContainerStyle={styles.contentContainer}
            showsVerticalScrollIndicator={false}
          >
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
                    key={day}
                    onPress={() => handleToggleDay(day)}
                    style={[
                      styles.dayButton,
                      selectedDays.includes(day) && styles.dayButtonActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.dayButtonText,
                        selectedDays.includes(day) && styles.dayButtonTextActive,
                      ]}
                    >
                      {day.slice(0, 3)}
                    </Text>
                  </Pressable>
                ))}
              </View>
              <Text style={styles.helperText}>
                Seleccionados: {selectedDays.join(', ')}
              </Text>
            </View>

            {/* Tasks Section */}
            <View style={styles.section}>
              <Text style={styles.label}>Tareas de esta rutina</Text>
              <View style={{ height: 12 }} />

              {/* Task Input */}
              <View style={styles.taskInputContainer}>
                <TextInput
                  style={styles.taskInput}
                  placeholder="Escribir título de la tarea..."
                  placeholderTextColor={colors.textSecondary}
                  value={newTaskTitle}
                  onChangeText={setNewTaskTitle}
                />
                <Pressable onPress={handleAddTask} style={styles.addTaskButton}>
                  <Plus size={20} color="#FFFFFF" strokeWidth={3} />
                </Pressable>
              </View>

              {/* Task List */}
              {tasks.length > 0 && (
                <View style={styles.taskList}>
                  {tasks.map((task) => (
                    <View key={task.id} style={styles.taskItem}>
                      <Text style={styles.taskItemText}>{task.title}</Text>
                      <Pressable onPress={() => handleRemoveTask(task.id)}>
                        <X size={18} color={colors.textSecondary} />
                      </Pressable>
                    </View>
                  ))}
                </View>
              )}

              {tasks.length === 0 && (
                <Text style={styles.emptyTasksText}>
                  Agrega al menos una tarea
                </Text>
              )}
            </View>

            {/* Reminder Section */}
            <View style={styles.section}>
              <View style={styles.reminderHeader}>
                <Text style={styles.label}>Recordatorio</Text>
                <Switch
                  value={reminderEnabled}
                  onValueChange={setReminderEnabled}
                  trackColor={{ false: colors.surface, true: colors.primary }}
                  thumbColor={reminderEnabled ? colors.primary : colors.textSecondary}
                />
              </View>

              {reminderEnabled && (
                <View style={styles.timePickerSection}>
                  <Text style={styles.reminderQuestion}>
                    ¿A qué hora deberíamos recordarte?
                  </Text>
                  <Pressable
                    onPress={() => setShowTimePicker(true)}
                    style={styles.timeButton}
                  >
                    <Text style={styles.timeButtonText}>{formatTime(reminderTime)}</Text>
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
              )}
            </View>
          </ScrollView>

          {/* Create Button */}
          <View style={styles.footer}>
            <Pressable
              onPress={handleCreateRoutine}
              disabled={!routineName.trim() || tasks.length === 0}
              style={[
                styles.createButton,
                (!routineName.trim() || tasks.length === 0) &&
                  styles.createButtonDisabled,
              ]}
            >
              <LinearGradient
                colors={['#CBA6F7', '#FAB387']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.createButtonGradient}
              >
                <Text style={styles.createButtonText}>Crear Rutina</Text>
              </LinearGradient>
            </Pressable>
          </View>
        </View>
      </View>
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
    height: '85%',
    minHeight: 500,
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
    fontSize: 24,
    fontWeight: '900',
    color: colors.textPrimary,
    letterSpacing: -0.5,
  },
  closeButton: {
    padding: 8,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    paddingBottom: 40,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  label: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  helperText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 12,
    fontStyle: 'italic',
  },
  input: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 14,
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: 'rgba(203, 166, 247, 0.2)',
  },
  daysContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
  },
  dayButton: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: 'rgba(203, 166, 247, 0.2)',
    backgroundColor: 'transparent',
    minWidth: 60,
    alignItems: 'center',
    marginHorizontal: 4,
    marginBottom: 8,
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
  },
  taskInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  taskInput: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
    marginRight: 10,
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: 'rgba(203, 166, 247, 0.2)',
  },
  addTaskButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  taskList: {
    marginTop: 12,
  },
  taskItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 10,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
    marginBottom: 8,
  },
  taskItemText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: colors.textPrimary,
  },
  emptyTasksText: {
    fontSize: 14,
    color: colors.textSecondary,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 20,
  },
  reminderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  reminderQuestion: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 10,
  },
  timePickerSection: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: 'rgba(203, 166, 247, 0.2)',
  },
  timeButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  timeButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primary,
  },
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(203, 166, 247, 0.1)',
  },
  createButton: {
    borderRadius: 50,
    overflow: 'hidden',
  },
  createButtonDisabled: {
    opacity: 0.5,
  },
  createButtonGradient: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
});
