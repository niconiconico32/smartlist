import { colors } from '@/constants/theme';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { Bell, BellOff, Check, Plus, Trash2, X } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
    Keyboard,
    KeyboardAvoidingView,
    Modal,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View,
} from 'react-native';
import Animated, {
    FadeIn,
    FadeOut,
    Layout,
} from 'react-native-reanimated';

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

const DAYS = [
  { id: 'Lun', label: 'L' },
  { id: 'Mar', label: 'M' },
  { id: 'Mié', label: 'X' },
  { id: 'Jue', label: 'J' },
  { id: 'Vie', label: 'V' },
  { id: 'Sáb', label: 'S' },
  { id: 'Dom', label: 'D' },
];

export const EditRoutineModal: React.FC<EditRoutineModalProps> = ({
  visible,
  routine,
  onClose,
  onSave,
}) => {
  const [name, setName] = useState('');
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [reminderTime, setReminderTime] = useState(new Date());
  const [showTimePicker, setShowTimePicker] = useState(false);

  // Cargar datos de la rutina cuando cambia
  useEffect(() => {
    if (routine) {
      setName(routine.name);
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
  }, [routine]);

  const handleToggleDay = (dayId: string) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (e) {}
    
    setSelectedDays(prev => {
      if (prev.includes(dayId)) {
        if (prev.length > 1) {
          return prev.filter(d => d !== dayId);
        }
        return prev;
      }
      return [...prev, dayId];
    });
  };

  const handleAddTask = () => {
    if (newTaskTitle.trim()) {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      } catch (e) {}
      
      const newTask: Task = {
        id: Date.now().toString(),
        title: newTaskTitle.trim(),
        completed: false,
      };
      setTasks([...tasks, newTask]);
      setNewTaskTitle('');
    }
  };

  const handleRemoveTask = (taskId: string) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (e) {}
    
    setTasks(tasks.filter(t => t.id !== taskId));
  };

  const handleTimeChange = (event: any, selectedDate?: Date) => {
    setShowTimePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setReminderTime(selectedDate);
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  };

  const handleSave = () => {
    if (!name.trim() || selectedDays.length === 0) return;

    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) {}

    const updatedRoutine: Routine = {
      id: routine?.id || Date.now().toString(),
      name: name.trim(),
      days: selectedDays,
      tasks: tasks,
      reminderEnabled,
      reminderTime: reminderEnabled ? formatTime(reminderTime) : undefined,
    };

    onSave(updatedRoutine);
    onClose();
  };

  const isValid = name.trim().length > 0 && selectedDays.length > 0;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.overlay}>
          <View style={styles.modalContainer}>
            <LinearGradient
              colors={['rgba(203, 166, 247, 0.15)', 'rgba(30, 30, 46, 0)']}
              style={styles.gradientTop}
            />

            {/* Header */}
            <View style={styles.header}>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <X size={24} color={colors.textSecondary} />
              </TouchableOpacity>
              <Text style={styles.headerTitle}>Editar Rutina</Text>
              <TouchableOpacity
                onPress={handleSave}
                disabled={!isValid}
                style={[styles.saveButton, !isValid && styles.saveButtonDisabled]}
              >
                <Check size={24} color={isValid ? colors.primary : colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Content */}
            <KeyboardAvoidingView 
              style={styles.keyboardAvoid}
              behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
              <ScrollView 
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              >
                {/* Name Input */}
                <View style={styles.section}>
                  <Text style={styles.sectionLabel}>Nombre de la rutina</Text>
                  <TextInput
                    style={styles.nameInput}
                    placeholder="Ej: Rutina matutina"
                    placeholderTextColor={colors.textSecondary}
                    value={name}
                    onChangeText={setName}
                  />
                </View>

                {/* Days Selection */}
                <View style={styles.section}>
                  <Text style={styles.sectionLabel}>Días de la semana</Text>
                  <View style={styles.daysContainer}>
                    {DAYS.map(day => {
                      const isSelected = selectedDays.includes(day.id);
                      return (
                        <TouchableOpacity
                          key={day.id}
                          style={[styles.dayButton, isSelected && styles.dayButtonSelected]}
                          onPress={() => handleToggleDay(day.id)}
                        >
                          <Text style={[styles.dayText, isSelected && styles.dayTextSelected]}>
                            {day.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                  {selectedDays.length > 0 && (
                    <Text style={styles.selectedDaysText}>
                      {selectedDays.join(', ')}
                    </Text>
                  )}
                </View>

                {/* Tasks */}
                <Animated.View 
                  entering={FadeIn.duration(250)}
                  style={styles.section}
                >
                  <Text style={styles.sectionLabel}>Tareas ({tasks.length})</Text>
                  
                  <View style={styles.addTaskRow}>
                    <TextInput
                      style={styles.taskInput}
                      placeholder="Añadir tarea..."
                      placeholderTextColor={colors.textSecondary}
                      value={newTaskTitle}
                      onChangeText={setNewTaskTitle}
                      onSubmitEditing={handleAddTask}
                      returnKeyType="done"
                    />
                    <TouchableOpacity
                      style={[styles.addTaskButton, !newTaskTitle.trim() && styles.addTaskButtonDisabled]}
                      onPress={handleAddTask}
                      disabled={!newTaskTitle.trim()}
                      activeOpacity={0.8}
                    >
                      <Plus size={20} color={newTaskTitle.trim() ? colors.background : colors.textSecondary} />
                    </TouchableOpacity>
                  </View>

                  <View style={styles.tasksList}>
                    {tasks.map((task, index) => (
                      <Animated.View
                        key={task.id}
                        entering={FadeIn.delay(index * 30).duration(200)}
                        exiting={FadeOut.duration(150)}
                        layout={Layout.duration(200)}
                        style={styles.taskItem}
                      >
                        <View style={styles.taskInfo}>
                          <View style={styles.taskDot} />
                          <Text style={styles.taskTitle} numberOfLines={1}>{task.title}</Text>
                        </View>
                        <TouchableOpacity
                          style={styles.removeTaskButton}
                          onPress={() => handleRemoveTask(task.id)}
                          activeOpacity={0.7}
                        >
                          <Trash2 size={16} color="#F38BA8" />
                        </TouchableOpacity>
                      </Animated.View>
                    ))}
                  </View>
                </Animated.View>

                {/* Reminder */}
                <View style={styles.section}>
                  <Text style={styles.sectionLabel}>Recordatorio</Text>
                  <Pressable
                    style={styles.reminderRow}
                    onPress={() => setReminderEnabled(!reminderEnabled)}
                  >
                    <View style={styles.reminderLeft}>
                      {reminderEnabled ? (
                        <Bell size={20} color={colors.primary} />
                      ) : (
                        <BellOff size={20} color={colors.textSecondary} />
                      )}
                      <Text style={[styles.reminderText, reminderEnabled && styles.reminderTextActive]}>
                        {reminderEnabled ? 'Activado' : 'Desactivado'}
                      </Text>
                    </View>
                    <View style={[styles.toggle, reminderEnabled && styles.toggleActive]}>
                      <View style={[styles.toggleThumb, reminderEnabled && styles.toggleThumbActive]} />
                    </View>
                  </Pressable>

                  {reminderEnabled && (
                    <Animated.View entering={FadeIn} style={styles.timePickerContainer}>
                      <TouchableOpacity
                        style={styles.timeButton}
                        onPress={() => setShowTimePicker(true)}
                      >
                        <Text style={styles.timeButtonText}>{formatTime(reminderTime)}</Text>
                      </TouchableOpacity>

                      {showTimePicker && (
                        <DateTimePicker
                          value={reminderTime}
                          mode="time"
                          is24Hour={true}
                          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                          onChange={handleTimeChange}
                          themeVariant="dark"
                        />
                      )}
                    </Animated.View>
                  )}
                </View>
              </ScrollView>
            </KeyboardAvoidingView>
          </View>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    height: '85%',
    minHeight: 500,
    position: 'relative',
  },
  gradientTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 120,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
    zIndex: 1,
  },
  closeButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  saveButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  keyboardAvoid: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  nameInput: {
    backgroundColor: colors.background,
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 16,
    fontSize: 16,
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  daysContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  dayButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
    marginBottom: 8,
  },
  dayButtonSelected: {
    backgroundColor: 'rgba(203, 166, 247, 0.2)',
    borderColor: colors.primary,
  },
  dayText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  dayTextSelected: {
    color: colors.primary,
  },
  selectedDaysText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 8,
    textAlign: 'center',
  },
  addTaskRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  taskInput: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.textPrimary,
    marginRight: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  addTaskButton: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addTaskButtonDisabled: {
    backgroundColor: colors.background,
  },
  tasksList: {
    // Sin maxHeight para permitir scroll completo
  },
  taskItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.background,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 8,
  },
  taskInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  taskDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
    marginRight: 12,
  },
  taskTitle: {
    fontSize: 15,
    color: colors.textPrimary,
    flex: 1,
  },
  removeTaskButton: {
    padding: 8,
  },
  reminderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.background,
    borderRadius: 16,
    padding: 16,
  },
  reminderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  reminderText: {
    fontSize: 15,
    color: colors.textSecondary,
    marginLeft: 12,
  },
  reminderTextActive: {
    color: colors.textPrimary,
  },
  toggle: {
    width: 50,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    padding: 2,
    justifyContent: 'center',
  },
  toggleActive: {
    backgroundColor: colors.primary,
  },
  toggleThumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.textSecondary,
  },
  toggleThumbActive: {
    backgroundColor: colors.background,
    alignSelf: 'flex-end',
  },
  timePickerContainer: {
    marginTop: 12,
    alignItems: 'center',
  },
  timeButton: {
    backgroundColor: 'rgba(203, 166, 247, 0.1)',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  timeButtonText: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.primary,
  },
});
