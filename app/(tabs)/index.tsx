import { colors } from '@/constants/theme';
import { ActivityButton } from '@/src/components/ActivityButton';
import { useBottomTabInset } from '@/src/hooks/useBottomTabInset';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Check, Clock, Edit2, Plus, RefreshCw, Trash2, X } from 'lucide-react-native';
import React, { useEffect, useImperativeHandle, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View
} from 'react-native';
import ConfettiCannon from 'react-native-confetti-cannon';
import { addTaskRef } from './swipeable-layout';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const ACTIVITIES_STORAGE_KEY = '@smartlist_activities';

// Paleta de colores para iconos de tareas
const ICON_COLORS = [
  '#E8D5FF', // Lavanda suave
  '#FFE5F1', // Rosa pastel
  '#D4F1F4', // Aqua claro
  '#FFE8CC', // Melocotón
  '#E5F9E0', // Verde menta
  '#FFF4E0', // Amarillo crema
  '#E8E8FF', // Azul lavanda
  '#FFE4E1', // Rosa misty
];

const getRandomIconColor = () => {
  return ICON_COLORS[Math.floor(Math.random() * ICON_COLORS.length)];
};

interface Activity {
  id: string;
  title: string;
  emoji: string;
  metric: string;
  color: string;
  iconColor?: string;
  action: 'add' | 'play';
  completed: boolean;
  recurrence?: {
    type: 'once' | 'daily' | 'weekly' | 'monthly';
    days?: number[]; // Para semanal: [0,2,4] = L,M,V
    time?: string; // "14:30" opcional
  };
  completedDates?: string[]; // ['2025-12-12', '2025-12-13']
  subtasks?: Subtask[];
  reminder?: {
    enabled: boolean;
    minutesBefore: number;
  };
}

interface Subtask {
  title: string;
  duration: number;
}

export default function PlanScreen() {
  const bottomInset = useBottomTabInset();
  
  // Task Modal States
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [taskInput, setTaskInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [generatedTaskTitle, setGeneratedTaskTitle] = useState('');
  const [generatedEmoji, setGeneratedEmoji] = useState('✨');
  const [editingSubtaskIndex, setEditingSubtaskIndex] = useState<number | null>(null);
  
  // Schedule States  
  const [isScheduled, setIsScheduled] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [recurrenceType, setRecurrenceType] = useState<'once' | 'daily' | 'weekly' | 'monthly'>('once');
  const [selectedDays, setSelectedDays] = useState<number[]>([]);
  const [scheduledTime, setScheduledTime] = useState<Date | null>(null);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [reminderTime, setReminderTime] = useState(15);
  
  // Execution Modal States
  const [showExecutionModal, setShowExecutionModal] = useState(false);
  const [executingActivity, setExecutingActivity] = useState<Activity | null>(null);
  const [currentSubtaskIndex, setCurrentSubtaskIndex] = useState(0);
  const [showSuccessScreen, setShowSuccessScreen] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const slideAnim = useRef(new Animated.Value(0)).current;
  const confettiRef = useRef<any>(null);
  
  const [activities, setActivities] = useState<Activity[]>([]);

  // Exponer función para abrir modal desde el botón +
  useImperativeHandle(addTaskRef, () => ({
    openTaskModal: () => {
      setShowTaskModal(true);
    }
  }));

  // Load activities from AsyncStorage
  useEffect(() => {
    loadActivities();
  }, []);

  // Save activities to AsyncStorage whenever they change
  useEffect(() => {
    if (activities.length > 0) {
      saveActivities();
    }
  }, [activities]);

  const loadActivities = async () => {
    try {
      const stored = await AsyncStorage.getItem(ACTIVITIES_STORAGE_KEY);
      if (stored) {
        setActivities(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Error loading activities:', error);
    }
  };

  const saveActivities = async () => {
    try {
      await AsyncStorage.setItem(ACTIVITIES_STORAGE_KEY, JSON.stringify(activities));
    } catch (error) {
      console.error('Error saving activities:', error);
    }
  };

  const generateSubtasks = async () => {
    if (!taskInput.trim()) {
      Alert.alert('Error', 'Escribe una tarea primero');
      return;
    }

    setIsGenerating(true);
    setSubtasks([]);
    setGeneratedTaskTitle('');

    try {
      const response = await fetch(
        'https://wdqwgqfisiteswbbdurg.supabase.co/functions/v1/divide-task',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndkcXdncWZpc2l0ZXN3YmJkdXJnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU1MDgxNTUsImV4cCI6MjA4MTA4NDE1NX0.oLadI1C5H89CWqGAz0NjDjbp_zwDGsl726YMVvlqIYg',
            'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndkcXdncWZpc2l0ZXN3YmJkdXJnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU1MDgxNTUsImV4cCI6MjA4MTA4NDE1NX0.oLadI1C5H89CWqGAz0NjDjbp_zwDGsl726YMVvlqIYg',
          },
          body: JSON.stringify({ task: taskInput.trim() }),
        }
      );

      const data = await response.json();

      console.log('Respuesta de la API:', data);

      if (data.error) {
        throw new Error(data.error);
      }

      if (!data.tasks || !Array.isArray(data.tasks) || data.tasks.length === 0) {
        throw new Error('No se pudieron generar subtareas');
      }

      // Usar el título generado por la IA o resumir el input del usuario
      let finalTitle = data.title || taskInput;
      
      // Si el título es muy largo, truncar a 50 caracteres
      if (finalTitle.length > 50) {
        finalTitle = finalTitle.substring(0, 47) + '...';
      }

      setGeneratedTaskTitle(finalTitle);
      setGeneratedEmoji(data.emoji || '✨');
      setSubtasks(data.tasks);
    } catch (error) {
      console.error('Error generando subtareas:', error);
      Alert.alert('Error', 'No se pudieron generar las subtareas. Intenta de nuevo.');
    } finally {
      setIsGenerating(false);
    }
  };

  const addTaskToList = () => {
    if (!generatedTaskTitle || subtasks.length === 0) {
      Alert.alert('Error', 'Genera subtareas primero');
      return;
    }

    const newActivity: Activity = {
      id: Date.now().toString(),
      title: generatedTaskTitle,
      emoji: generatedEmoji,
      metric: `${subtasks.reduce((sum, t) => sum + t.duration, 0)} min`,
      color: '#A8E6CF',
      iconColor: getRandomIconColor(),
      action: 'play',
      completed: false,
      subtasks: subtasks,
      recurrence: isScheduled ? {
        type: recurrenceType,
        days: recurrenceType === 'weekly' ? selectedDays : undefined,
        time: scheduledTime?.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
      } : { type: 'once' },
      reminder: reminderEnabled ? {
        enabled: true,
        minutesBefore: reminderTime,
      } : undefined,
      completedDates: [],
    };

    setActivities(prev => [newActivity, ...prev]);
    
    // Reset modal
    setShowTaskModal(false);
    setTaskInput('');
    setSubtasks([]);
    setGeneratedTaskTitle('');
    setGeneratedEmoji('✨');
    setIsScheduled(false);
    setRecurrenceType('once');
    setSelectedDays([]);
    setScheduledTime(null);
    setReminderEnabled(false);
    setReminderTime(15);
    
    Alert.alert('✅ Tarea agregada', `"${generatedTaskTitle}" fue agregada a tu lista`);
  };

  const handleActivityPress = (activity: Activity) => {
    // Si está completada, solo toggle
    const today = new Date().toISOString().split('T')[0];
    const isCompleted = activity.recurrence?.type !== 'once' 
      ? activity.completedDates?.includes(today)
      : activity.completed;
    
    if (isCompleted) {
      toggleActivityStatus(activity.id);
      return;
    }

    // Si tiene subtareas, mostrar alert para iniciar
    if (activity.subtasks && activity.subtasks.length > 0) {
      Alert.alert(
        '¿Empezar Tarea?',
        activity.title,
        [
          {
            text: 'Más Tarde',
            style: 'cancel',
          },
          {
            text: 'Empezar',
            onPress: () => {
              setExecutingActivity(activity);
              setCurrentSubtaskIndex(0);
              setShowSuccessScreen(false);
              setElapsedTime(0);
              setShowExecutionModal(true);
            },
          },
        ]
      );
    } else {
      // Sin subtareas, solo toggle
      toggleActivityStatus(activity.id);
    }
  };

  // Stopwatch effect (counts up)
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (showExecutionModal && !showSuccessScreen) {
      interval = setInterval(() => {
        setElapsedTime(prev => prev + 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [showExecutionModal, showSuccessScreen]);

  // Confetti effect
  useEffect(() => {
    if (showSuccessScreen && confettiRef.current) {
      setTimeout(() => {
        confettiRef.current?.start();
      }, 100);
    }
  }, [showSuccessScreen]);

  const handleSlideComplete = () => {
    if (!executingActivity) return;

    const nextIndex = currentSubtaskIndex + 1;
    
    if (nextIndex < executingActivity.subtasks!.length) {
      // Next subtask
      setCurrentSubtaskIndex(nextIndex);
      setElapsedTime(0);
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      // All subtasks completed!
      setShowSuccessScreen(true);
      setTimeout(() => {
        toggleActivityStatus(executingActivity.id);
        setShowExecutionModal(false);
        setExecutingActivity(null);
        setCurrentSubtaskIndex(0);
        setShowSuccessScreen(false);
      }, 3000);
    }
  };

  const toggleActivityStatus = (id: string) => {
    const today = new Date().toISOString().split('T')[0];
    
    setActivities(prevActivities =>
      prevActivities.map(activity => {
        if (activity.id !== id) return activity;

        const isRecurrent = activity.recurrence?.type !== 'once';
        
        if (isRecurrent) {
          // Para tareas recurrentes, agregar fecha a completedDates
          const alreadyCompletedToday = activity.completedDates?.includes(today);
          return {
            ...activity,
            completedDates: alreadyCompletedToday
              ? activity.completedDates?.filter(d => d !== today)
              : [...(activity.completedDates || []), today],
          };
        } else {
          // Para tareas de una vez, toggle completed
          return { ...activity, completed: !activity.completed };
        }
      })
    );
  };

  // Filtrar actividades considerando recurrencia
  const today = new Date().toISOString().split('T')[0];
  const pendingActivities = activities.filter(a => {
    if (a.recurrence?.type !== 'once') {
      return !a.completedDates?.includes(today);
    }
    return !a.completed;
  });
  
  const completedActivities = activities.filter(a => {
    if (a.recurrence?.type !== 'once') {
      return a.completedDates?.includes(today);
    }
    return a.completed;
  });
  
  const totalCompleted = completedActivities.length;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView 
        style={styles.container}
        contentContainerStyle={[styles.contentContainer, { paddingBottom: bottomInset + 130 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Por Hacer</Text>
        </View>

        <View style={styles.activitiesContainer}>
          {pendingActivities.length === 0 ? (
            <Text style={styles.emptyPlaceholder}>
              No tienes tareas para hoy. Agrega una pinchando +
            </Text>
          ) : (
            pendingActivities.map(activity => (
              <ActivityButton
                key={activity.id}
                title={activity.title}
                emoji={activity.emoji}
                metric={activity.metric}
                color={activity.color}
                iconColor={activity.iconColor}
                action={activity.action}
                completed={false}
                onPress={() => handleActivityPress(activity)}
              />
            ))
          )}
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Completadas</Text>
        </View>

        <View style={styles.activitiesContainer}>
          {completedActivities.map(activity => (
            <ActivityButton
              key={activity.id}
              title={activity.title}
              emoji={activity.emoji}
              metric={activity.metric}
              color={activity.color}
              iconColor={activity.iconColor}
              action={activity.action}
              completed={true}
              onPress={() => handleActivityPress(activity)}
            />
          ))}
        </View>
      </ScrollView>

      {/* Task Creation Modal */}
      <Modal
        visible={showTaskModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowTaskModal(false)}
      >
        <View style={styles.taskModalOverlay}>
          <View style={styles.taskModalContent}>
            <View style={styles.taskModalHeader}>
              <Text style={styles.taskModalTitle}>Nueva Tarea</Text>
              <Pressable onPress={() => setShowTaskModal(false)}>
                <X size={24} color={colors.textSecondary} />
              </Pressable>
            </View>

            <ScrollView style={styles.taskModalBody} showsVerticalScrollIndicator={false}>
              {/* Task Input */}
              <View style={styles.taskInputWrapper}>
                <TextInput
                  style={styles.taskInput}
                  placeholder="Describe tu tarea con detalle..."
                  placeholderTextColor={colors.textTertiary}
                  value={taskInput}
                  onChangeText={setTaskInput}
                  multiline
                  numberOfLines={6}
                  textAlignVertical="top"
                  editable={!isGenerating}
                  autoFocus
                />
              </View>

              {/* Schedule Toggle */}
              <Pressable 
                style={styles.scheduleToggle}
                onPress={() => {
                  if (!isScheduled) {
                    setShowScheduleModal(true);
                  }
                  setIsScheduled(!isScheduled);
                }}
              >
                <View style={styles.scheduleToggleContent}>
                  <Clock size={16} color={colors.textSecondary} />
                  <Text style={styles.scheduleLabel}>Programar</Text>
                  {isScheduled && (
                    <View style={styles.scheduleBadge}>
                      <Text style={styles.scheduleBadgeText}>
                        {recurrenceType === 'once' ? 'Una vez' : 
                         recurrenceType === 'daily' ? 'Diaria' :
                         recurrenceType === 'weekly' ? 'Semanal' : 'Mensual'}
                      </Text>
                    </View>
                  )}
                </View>
                <Switch
                  value={isScheduled}
                  onValueChange={(value) => {
                    if (value) {
                      setShowScheduleModal(true);
                    }
                    setIsScheduled(value);
                  }}
                  trackColor={{ false: '#E0E0E0', true: colors.primary }}
                  thumbColor={'#FFFFFF'}
                />
              </Pressable>

              {/* Generate Button */}
              <Pressable
                style={[styles.generateButton, isGenerating && styles.generateButtonDisabled]}
                onPress={generateSubtasks}
                disabled={isGenerating}
              >
                {isGenerating ? (
                  <>
                    <ActivityIndicator size="small" color="#1C2120" />
                    <Text style={styles.generateButtonText}>Generando...</Text>
                  </>
                ) : (
                  <>
                    <Plus size={20} color="#1C2120" />
                    <Text style={styles.generateButtonText}>Generar Subtareas</Text>
                  </>
                )}
              </Pressable>

              {/* Subtasks Result */}
              {subtasks.length > 0 && (
                <View style={styles.subtasksSection}>
                  <View style={styles.subtasksHeader}>
                    <Text style={styles.subtasksTitle}>{generatedTaskTitle}</Text>
                    <Pressable onPress={generateSubtasks} style={styles.regenerateButton}>
                      <RefreshCw size={18} color={colors.textSecondary} />
                      <Text style={styles.regenerateText}>Regenerar</Text>
                    </Pressable>
                  </View>

                  <View style={styles.subtasksList}>
                    {subtasks.map((subtask, index) => (
                      <View key={index} style={styles.subtaskCard}>
                        <View style={styles.subtaskNumber}>
                          <Text style={styles.subtaskNumberText}>{index + 1}</Text>
                        </View>
                        <View style={styles.subtaskContent}>
                          {editingSubtaskIndex === index ? (
                            <TextInput
                              style={styles.subtaskInput}
                              value={subtask.title}
                              onChangeText={(text) => {
                                const newSubtasks = [...subtasks];
                                newSubtasks[index] = { ...subtask, title: text };
                                setSubtasks(newSubtasks);
                              }}
                              onBlur={() => setEditingSubtaskIndex(null)}
                              autoFocus
                            />
                          ) : (
                            <Text style={styles.subtaskTitle}>{subtask.title}</Text>
                          )}
                          <Text style={styles.subtaskDuration}>{subtask.duration} min</Text>
                        </View>
                        <View style={styles.subtaskActions}>
                          <Pressable 
                            onPress={() => setEditingSubtaskIndex(index)}
                            style={styles.iconButton}
                          >
                            <Edit2 size={16} color={colors.textTertiary} />
                          </Pressable>
                          <Pressable 
                            onPress={() => {
                              const newSubtasks = subtasks.filter((_, i) => i !== index);
                              setSubtasks(newSubtasks);
                            }}
                            style={styles.iconButton}
                          >
                            <Trash2 size={16} color="#FF8B94" />
                          </Pressable>
                        </View>
                      </View>
                    ))}
                  </View>

                  <View style={styles.totalDuration}>
                    <Text style={styles.totalDurationText}>
                      Duración total: {subtasks.reduce((sum, task) => sum + task.duration, 0)} minutos
                    </Text>
                  </View>
                </View>
              )}
            </ScrollView>

            {/* Add to List Button */}
            {subtasks.length > 0 && (
              <Pressable
                style={styles.addToListButton}
                onPress={addTaskToList}
              >
                <Text style={styles.addToListButtonText}>Agregar a Por Hacer</Text>
              </Pressable>
            )}
          </View>
        </View>
      </Modal>

      {/* Schedule Modal - Copy from add.tsx */}
      <Modal
        visible={showScheduleModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowScheduleModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Programar Tarea</Text>
              <Pressable onPress={() => setShowScheduleModal(false)}>
                <X size={24} color={colors.textSecondary} />
              </Pressable>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              {/* Frequency Chips */}
              <Text style={styles.sectionLabel}>Frecuencia</Text>
              <View style={styles.frequencyChips}>
                <Pressable
                  style={[styles.chip, recurrenceType === 'once' && styles.chipActive]}
                  onPress={() => setRecurrenceType('once')}
                >
                  <Text style={[styles.chipText, recurrenceType === 'once' && styles.chipTextActive]}>
                    Una vez
                  </Text>
                </Pressable>
                <Pressable
                  style={[styles.chip, recurrenceType === 'daily' && styles.chipActive]}
                  onPress={() => setRecurrenceType('daily')}
                >
                  <Text style={[styles.chipText, recurrenceType === 'daily' && styles.chipTextActive]}>
                    Diaria
                  </Text>
                </Pressable>
                <Pressable
                  style={[styles.chip, recurrenceType === 'weekly' && styles.chipActive]}
                  onPress={() => setRecurrenceType('weekly')}
                >
                  <Text style={[styles.chipText, recurrenceType === 'weekly' && styles.chipTextActive]}>
                    Semanal
                  </Text>
                </Pressable>
                <Pressable
                  style={[styles.chip, recurrenceType === 'monthly' && styles.chipActive]}
                  onPress={() => setRecurrenceType('monthly')}
                >
                  <Text style={[styles.chipText, recurrenceType === 'monthly' && styles.chipTextActive]}>
                    Mensual
                  </Text>
                </Pressable>
              </View>

              {/* Day Selector for Weekly */}
              {recurrenceType === 'weekly' && (
                <>
                  <Text style={styles.sectionLabel}>Días</Text>
                  <View style={styles.daySelector}>
                    {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((day, index) => (
                      <Pressable
                        key={index}
                        style={[
                          styles.dayChip,
                          selectedDays.includes(index) && styles.dayChipActive
                        ]}
                        onPress={() => {
                          setSelectedDays(prev =>
                            prev.includes(index)
                              ? prev.filter(d => d !== index)
                              : [...prev, index].sort()
                          );
                        }}
                      >
                        <Text
                          style={[
                            styles.dayChipText,
                            selectedDays.includes(index) && styles.dayChipTextActive
                          ]}
                        >
                          {day}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </>
              )}

              {/* Time Picker */}
              <Text style={styles.sectionLabel}>Hora (opcional)</Text>
              <Pressable
                style={styles.timePickerButton}
                onPress={() => setShowTimePicker(true)}
              >
                <Clock size={20} color={colors.textSecondary} />
                <Text style={styles.timePickerText}>
                  {scheduledTime 
                    ? scheduledTime.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
                    : 'Sin hora específica'
                  }
                </Text>
                {scheduledTime && (
                  <Pressable
                    onPress={() => setScheduledTime(null)}
                    hitSlop={8}
                  >
                    <X size={16} color={colors.textTertiary} />
                  </Pressable>
                )}
              </Pressable>

              {showTimePicker && (
                <DateTimePicker
                  value={scheduledTime || new Date()}
                  mode="time"
                  is24Hour={true}
                  onChange={(event, selectedDate) => {
                    setShowTimePicker(false);
                    if (selectedDate) {
                      setScheduledTime(selectedDate);
                    }
                  }}
                />
              )}

              {/* Reminder Toggle */}
              <View style={styles.reminderSection}>
                <View style={styles.reminderToggle}>
                  <Text style={styles.sectionLabel}>Recordatorio</Text>
                  <Switch
                    value={reminderEnabled}
                    onValueChange={setReminderEnabled}
                    trackColor={{ false: '#E0E0E0', true: colors.primary }}
                    thumbColor={'#FFFFFF'}
                  />
                </View>
                {reminderEnabled && (
                  <View style={styles.reminderOptions}>
                    {[5, 15, 30, 60].map((mins) => (
                      <Pressable
                        key={mins}
                        style={[styles.chip, reminderTime === mins && styles.chipActive]}
                        onPress={() => setReminderTime(mins)}
                      >
                        <Text style={[styles.chipText, reminderTime === mins && styles.chipTextActive]}>
                          {mins} min antes
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                )}
              </View>
            </ScrollView>

            <Pressable
              style={styles.modalButton}
              onPress={() => setShowScheduleModal(false)}
            >
              <Text style={styles.modalButtonText}>Confirmar</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Execution Modal */}
      <Modal
        visible={showExecutionModal}
        animationType="fade"
        transparent={false}
        onRequestClose={() => {
          Alert.alert('¿Salir?', '¿Quieres abandonar esta tarea?', [
            { text: 'Continuar', style: 'cancel' },
            { 
              text: 'Salir', 
              style: 'destructive',
              onPress: () => {
                setShowExecutionModal(false);
                setExecutingActivity(null);
                setCurrentSubtaskIndex(0);
                setShowSuccessScreen(false);
              }
            },
          ]);
        }}
      >
        <SafeAreaView style={styles.executionContainer}>
          {showSuccessScreen ? (
            /* Success Screen */
            <View style={styles.successScreen}>
              <View style={styles.successIcon}>
                <Check size={80} color="#FFFFFF" strokeWidth={4} />
              </View>
              <Text style={styles.successTitle}>¡Tarea Completada!</Text>
              <Text style={styles.successSubtitle}>{executingActivity?.title}</Text>
              <ConfettiCannon
                ref={confettiRef}
                count={200}
                origin={{x: SCREEN_WIDTH / 2, y: 0}}
                autoStart={false}
                fadeOut={true}
                fallSpeed={3000}
              />
            </View>
          ) : (
            /* Execution Screen */
            <>
              {/* Header */}
              <View style={styles.executionHeader}>
                <Pressable
                  style={styles.closeButton}
                  onPress={() => {
                    Alert.alert('¿Salir?', '¿Quieres abandonar esta tarea?', [
                      { text: 'Continuar', style: 'cancel' },
                      { 
                        text: 'Salir', 
                        style: 'destructive',
                        onPress: () => {
                          setShowExecutionModal(false);
                          setExecutingActivity(null);
                          setCurrentSubtaskIndex(0);
                          setShowSuccessScreen(false);
                        }
                      },
                    ]);
                  }}
                >
                  <X size={28} color="#1C2120" />
                </Pressable>
                <Text style={styles.executionTaskTitle}>{executingActivity?.title}</Text>
              </View>

              {/* Progress Indicator */}
              <View style={styles.progressContainer}>
                {executingActivity?.subtasks?.map((_, index) => (
                  <View
                    key={index}
                    style={[
                      styles.progressDot,
                      index === currentSubtaskIndex && styles.progressDotActive,
                      index < currentSubtaskIndex && styles.progressDotCompleted,
                    ]}
                  />
                ))}
              </View>

              {/* Subtask Counter & Stopwatch */}
              <View style={styles.counterContainer}>

                <Text style={styles.stopwatchText}>
                  {Math.floor(elapsedTime / 60)}:{String(elapsedTime % 60).padStart(2, '0')}
                </Text>
              </View>

              {/* Current Subtask - Main Element */}
              <View style={styles.subtaskDisplay}>
                <Text style={styles.subtaskDisplayTitle}>
                  {executingActivity?.subtasks?.[currentSubtaskIndex]?.title}
                </Text>
              </View>

              {/* Slider to Complete */}
              <View style={styles.sliderContainer}>
                <View style={styles.sliderTrack}>
                  <Text style={styles.sliderLabel}>desliza para completar</Text>
                  <Animated.View
                    style={[
                      styles.sliderThumb,
                      {
                        transform: [{
                          translateX: slideAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: [0, SCREEN_WIDTH - 140],
                          })
                        }]
                      }
                    ]}
                    {...({
                      onStartShouldSetResponder: () => true,
                      onResponderMove: (evt: any) => {
                        const x = evt.nativeEvent.pageX - 50;
                        const maxX = SCREEN_WIDTH - 140;
                        const progress = Math.max(0, Math.min(1, x / maxX));
                        slideAnim.setValue(progress);
                      },
                      onResponderRelease: () => {
                        const currentValue = (slideAnim as any)._value;
                        if (currentValue > 0.8) {
                          Animated.spring(slideAnim, {
                            toValue: 1,
                            useNativeDriver: true,
                          }).start(() => {
                            handleSlideComplete();
                          });
                        } else {
                          Animated.spring(slideAnim, {
                            toValue: 0,
                            useNativeDriver: true,
                          }).start();
                        }
                      },
                    } as any)}
                  />
                </View>
              </View>
            </>
          )}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingTop: 16,
    marginBottom: 24,
  },
  notificationWrapper: {
    paddingHorizontal: 20,
    marginBottom: 32,
  },
  sectionHeader: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#121212',
    letterSpacing: -0.5,
  },
  activitiesContainer: {
    paddingHorizontal: 20,
  },
  emptyPlaceholder: {
    fontSize: 16,
    color: '#F9FAFB ',
    opacity: 0.4,
    textAlign: 'center',
    paddingVertical: 32,
  },
  taskModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  taskModalContent: {
    backgroundColor: '#F9FAFB',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 20,
    maxHeight: '90%',
  },
  taskModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(168, 230, 207, 0.3)',
  },
  taskModalTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#121212',
    letterSpacing: -0.5,
  },
  taskModalBody: {
    padding: 20,
  },
  taskInputWrapper: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'rgba(168, 230, 207, 0.3)',
    padding: 16,
    marginBottom: 16,
  },
  taskInput: {
    fontSize: 16,
    color: '#F9FAFB ',
    fontWeight: '500',
    minHeight: 140,
  },
  scheduleToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 16,
  },
  scheduleToggleContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  scheduleLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1C2120',
  },
  scheduleBadge: {
    backgroundColor: colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginLeft: 4,
  },
  scheduleBadgeText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#1C2120',
  },
  generateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 16,
    gap: 8,
    marginBottom: 24,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  generateButtonDisabled: {
    opacity: 0.6,
  },
  generateButtonText: {
    fontSize: 17,
    fontWeight: '900',
    color: '#F9FAFB',
  },
  subtasksSection: {
    marginBottom: 24,
  },
  subtasksHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  subtasksTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#FFFFFF',
    flex: 1,
    letterSpacing: -0.5,
  },
  regenerateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  regenerateText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  subtasksList: {
    gap: 12,
  },
  subtaskCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 16,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(168, 230, 207, 0.2)',
  },
  subtaskNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subtaskNumberText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#1C2120',
  },
  subtaskContent: {
    flex: 1,
  },
  subtaskTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C2120',
    marginBottom: 4,
  },
  subtaskInput: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C2120',
    marginBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: colors.primary,
  },
  subtaskDuration: {
    fontSize: 14,
    color: colors.textTertiary,
    fontWeight: '500',
  },
  subtaskActions: {
    flexDirection: 'row',
    gap: 8,
  },
  iconButton: {
    padding: 4,
  },
  totalDuration: {
    marginTop: 16,
    padding: 16,
    backgroundColor: 'rgba(168, 230, 207, 0.15)',
    borderRadius: 16,
    alignItems: 'center',
  },
  totalDurationText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#1C2120',
  },
  addToListButton: {
    backgroundColor: colors.primary,
    marginHorizontal: 20,
    marginVertical: 20,
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
  },
  addToListButtonText: {
    fontSize: 18,
    fontWeight: '900',
    color: '#1C2120',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#2B0057',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 20,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(168, 230, 207, 0.3)',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#121212',
  },
  modalBody: {
    padding: 20,
  },
  modalButton: {
    backgroundColor: colors.primary,
    marginHorizontal: 20,
    marginVertical: 20,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  modalButtonText: {
    fontSize: 17,
    fontWeight: '900',
    color: '#1C2120',
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1C2120',
    marginBottom: 12,
    marginTop: 8,
  },
  frequencyChips: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  chip: {
    flex: 1,
    minWidth: 70,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
  },
  chipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  chipTextActive: {
    color: '#1C2120',
  },
  daySelector: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  dayChip: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  dayChipText: {
    fontSize: 14,
    fontWeight: '900',
    color: colors.textSecondary,
  },
  dayChipTextActive: {
    color: '#1C2120',
  },
  timePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    padding: 16,
    marginBottom: 16,
  },
  timePickerText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: '#1C2120',
  },
  reminderSection: {
    marginTop: 8,
  },
  reminderToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  reminderOptions: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  executionContainer: {
    flex: 1,
    backgroundColor: '#ffc300',
  },
  executionHeader: {
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  executionTaskTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '300',
    color: '#1C2120',
  },
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 20,
    marginBottom: 40,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(28, 33, 32, 0.2)',
  },
  progressDotActive: {
    backgroundColor: '#1C2120',
    width: 24,
  },
  progressDotCompleted: {
    backgroundColor: '#1C2120',
  },
  counterContainer: {
    alignItems: 'center',
    marginBottom: 60,
  },
  subtaskNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: 'rgba(28, 33, 32, 0.6)',
    marginBottom: 12,
  },
  stopwatchText: {
    fontSize: 18,
    fontWeight: '900',
    color: '#1C2120',
    fontVariant: ['tabular-nums'],
  },
  subtaskDisplay: {
    alignItems: 'center',
    paddingHorizontal: 24,
    marginBottom: 320,
    flex: 1,
    justifyContent: 'center',
  },
  subtaskDisplayTitle: {
    fontSize: 48,
    fontWeight: '900',
    color: '#1C2120',
    textAlign: 'center',
    lineHeight: 56,
  },
  sliderContainer: {
    position: 'absolute',
    bottom: 60,
    left: 0,
    right: 0,
    paddingHorizontal: 40,
    alignItems: 'center',
  },
  sliderLabel: {
    position: 'absolute',
    fontSize: 15,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.5)',
    zIndex: 1,
    letterSpacing: 0.5,
  },
  sliderTrack: {
    width: SCREEN_WIDTH - 80,
    height: 72,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 66,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  sliderThumb: {
    position: 'absolute',
    left: 4,
    width: 80,
    height: 80,
    borderRadius: 66,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  successScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#A8E6CF',
  },
  successIcon: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
  },
  successTitle: {
    fontSize: 36,
    fontWeight: '900',
    color: '#FFFFFF',
    marginBottom: 12,
    letterSpacing: -1,
  },
  successSubtitle: {
    fontSize: 20,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    paddingHorizontal: 40,
  },
});
