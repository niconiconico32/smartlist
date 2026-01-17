// --- Type Definitions ---
type Subtask = {
  id: string;
  title: string;
  duration: number;
  isCompleted: boolean;
};

type Activity = {
  id: string;
  title: string;
  emoji: string;
  metric: string;
  color: string;
  iconColor: string;
  action: 'add' | 'play';
  completed: boolean;
  subtasks: Subtask[];
  recurrence?: {
    type: 'once' | 'daily' | 'weekly';
    days?: number[];
    time?: string;
  };
  reminder?: {
    enabled: boolean;
    minutesBefore: number;
  };
  completedDates?: string[];
};

// --- Fallbacks for missing imports ---
function getRandomIconColor() {
  // Return a random color from a palette
  const palette = ['#CBA6F7', '#FAB387', '#F38BA8', '#F9E2AF', '#A6E3A1', '#89B4FA', '#F5C2E7'];
  return palette[Math.floor(Math.random() * palette.length)];
}

// Dummy fallback for ConfettiCannon if not imported
const ConfettiCannon = (props: any) => null;
import { colors } from '@/constants/theme';
import { ActivityButton } from '@/src/components/ActivityButton';
import { FocusModeScreen } from '@/src/components/FocusModeScreen';
import { SubtaskListScreen } from '@/src/components/SubtaskListScreen';
import { TaskModalNew } from '@/src/components/TaskModalNew';
import { useBottomTabInset } from '@/src/hooks/useBottomTabInset';
import { useVoiceTask } from '@/src/hooks/useVoiceTask';
import {
    ONBOARDING_BUTTONS,
    ONBOARDING_COLORS,
    ONBOARDING_DIMENSIONS,
    ONBOARDING_DOTS,
    ONBOARDING_SHADOWS,
    ONBOARDING_TYPOGRAPHY,
} from '@/src/styles/onboardingStyles';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Check, Clock, X } from 'lucide-react-native';
import React, { useEffect, useImperativeHandle, useRef, useState } from 'react';
import {
    Alert,
    Dimensions,
    Image,
    Modal,
    Pressable,
    Animated as RNAnimated,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const ACTIVITIES_STORAGE_KEY = '@smartlist_activities';
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const AnimatedPressable = RNAnimated.createAnimatedComponent(Pressable);

const PlanScreen = React.forwardRef(function PlanScreen({ 
  setIsFirstTime, 
  pulseAnim: parentPulseAnim, 
  isFirstTime: parentIsFirstTime 
}: { 
  setIsFirstTime?: (value: boolean) => void; 
  pulseAnim?: any; 
  isFirstTime?: boolean;
}, ref: any) {
  const bottomInset = useBottomTabInset();
  const router = useRouter();
  
  // Local state for isFirstTime if not passed from parent
  const [taskInput, setTaskInput] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [localIsFirstTime, setLocalIsFirstTime] = useState(parentIsFirstTime !== undefined ? parentIsFirstTime : true);
  const localPulseAnimFirstTime = useRef(new RNAnimated.Value(1)).current;
  
  const { recording, isProcessing, startRecording, stopRecording, cleanup } = useVoiceTask(
    (transcribedText: string) => {
      setTaskInput(transcribedText);
      setIsListening(false);
    }
  );
  
  const handleMicPressIn = async () => {
    try {
      setIsListening(true);
      await startRecording();
    } catch (error) {
      console.error('Error in handleMicPressIn:', error);
      setIsListening(false);
    }
  };
  
  const handleMicPressOut = async () => {
    try {
      await stopRecording();
    } catch (error) {
      console.error('Error in handleMicPressOut:', error);
    } finally {
      setIsListening(false);
    }
  };
  
  // Onboarding Modal State
  const [showOnboardingModal, setShowOnboardingModal] = useState(false);
  const [onboardingStep, setOnboardingStep] = useState(1);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const onboardingSlideAnim = useRef(new RNAnimated.Value(0)).current;

  // Task Modal States
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showScheduleOption, setShowScheduleOption] = useState(false);
  const [shouldShowTaskModalAfterSchedule, setShouldShowTaskModalAfterSchedule] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [generatedTaskTitle, setGeneratedTaskTitle] = useState('');
  const [generatedEmoji, setGeneratedEmoji] = useState('✨');
  const [editingSubtaskIndex, setEditingSubtaskIndex] = useState<number | null>(null);
  const [showSubtasksModal, setShowSubtasksModal] = useState(false);
  
  // Focus Mode States
  const [showFocusMode, setShowFocusMode] = useState(false);
  const [focusModeSubtasks, setFocusModeSubtasks] = useState<Subtask[]>([]);
  const [showStartTaskModal, setShowStartTaskModal] = useState(false);
  const [pendingActivityToStart, setPendingActivityToStart] = useState<Activity | null>(null);

  // Schedule States  
  const [isScheduled, setIsScheduled] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [recurrenceType, setRecurrenceType] = useState<'once' | 'daily' | 'weekly'>('once');
  const [selectedDays, setSelectedDays] = useState<number[]>([]);
  const [scheduledTime, setScheduledTime] = useState<Date | null>(null);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [reminderEnabled, setReminderEnabled] = useState(true);
  const [reminderTime, setReminderTime] = useState(15);

  // Execution Modal States
  const [showExecutionModal, setShowExecutionModal] = useState(false);
  const [executingActivity, setExecutingActivity] = useState<Activity | null>(null);
  const [currentSubtaskIndex, setCurrentSubtaskIndex] = useState(0);
  const [showSuccessScreen, setShowSuccessScreen] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const executionSlideAnim = useRef(new RNAnimated.Value(0)).current;
  const micVibrationAnim = useRef(new RNAnimated.Value(0)).current;
  const pulseAnim = useRef(new RNAnimated.Value(1)).current;
  const dot1Opacity = useRef(new RNAnimated.Value(0.3)).current;
  const dot2Opacity = useRef(new RNAnimated.Value(0.3)).current;
  const dot3Opacity = useRef(new RNAnimated.Value(0.3)).current;
  const confettiRef = useRef<any>(null);

  const [activities, setActivities] = useState<Activity[]>([]);

  // Función para avanzar al siguiente paso del onboarding
  const goToNextStep = () => {
    setOnboardingStep((prev) => prev + 1);
  };

  // Función para volver al paso anterior (solo para la pantalla 1)
  const goToPreviousStep = () => {
    setOnboardingStep(1);
  };

  // Exponer función para abrir modal desde el botón +
  useImperativeHandle(ref, () => ({
    openTaskModal: (showSchedule = false) => {
      setShowTaskModal(true);
      setShowScheduleOption(showSchedule);
      setShouldShowTaskModalAfterSchedule(false);
    },
    openProgramScheduleModal: () => {
      setShowScheduleModal(true);
      setShouldShowTaskModalAfterSchedule(true);
    }
  }));

  // Load activities from AsyncStorage
  useEffect(() => {
    // Only keep activities in memory during session
    // Commenting out loadActivities to clear data on reload (Ctrl+R in console)
    // loadActivities();
    // clearAllActivities();
  }, []);

  // Save activities to memory only (not persisted)
  useEffect(() => {
    if (activities.length > 0) {
      // Not saving to AsyncStorage - kept only in memory during session
      // saveActivities();
      setLocalIsFirstTime(false);
      if (setIsFirstTime) {
        setIsFirstTime(false);
      }
    }
  }, [activities]);

  // Microphone vibration animation
  useEffect(() => {
    if (recording || isListening) {
      RNAnimated.loop(
        RNAnimated.sequence([
          RNAnimated.timing(micVibrationAnim, {
            toValue: 1,
            duration: 150,
            useNativeDriver: true,
          }),
          RNAnimated.timing(micVibrationAnim, {
            toValue: -1,
            duration: 150,
            useNativeDriver: true,
          }),
          RNAnimated.timing(micVibrationAnim, {
            toValue: 0,
            duration: 150,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      micVibrationAnim.setValue(0);
    }
  }, [recording, isListening]);

  // Clean up listening state when processing finishes
  useEffect(() => {
    if (!recording && !isProcessing && isListening) {
      setIsListening(false);
    }
  }, [recording, isProcessing]);

  // Cleanup recording when modal closes
  useEffect(() => {
    if (!showTaskModal && (recording || isListening)) {
      cleanup();
      setIsListening(false);
    }
  }, [showTaskModal]);

  // Pulse animation effect while listening
  useEffect(() => {
    if (recording || isListening) {
      RNAnimated.loop(
        RNAnimated.sequence([
          RNAnimated.timing(pulseAnim, {
            toValue: 1.15,
            duration: 800,
            useNativeDriver: true,
          }),
          RNAnimated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [recording, isListening]);

  // Pulse animation for first time overlay
  useEffect(() => {
    const effectiveIsFirstTime = parentIsFirstTime !== undefined ? parentIsFirstTime : localIsFirstTime;
    const effectivePulseAnim = parentPulseAnim || localPulseAnimFirstTime;
    
    if (effectiveIsFirstTime) {
      RNAnimated.loop(
        RNAnimated.sequence([
          RNAnimated.timing(effectivePulseAnim, {
            toValue: 1.15,
            duration: 1000,
            useNativeDriver: true,
          }),
          RNAnimated.timing(effectivePulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      effectivePulseAnim.setValue(1);
    }
  }, [parentIsFirstTime, localIsFirstTime]);

  // Dots loading animation while processing
  useEffect(() => {
    if (isProcessing) {
      RNAnimated.loop(
        RNAnimated.sequence([
          RNAnimated.timing(dot1Opacity, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
          }),
          RNAnimated.timing(dot2Opacity, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
          }),
          RNAnimated.timing(dot3Opacity, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
          }),
          RNAnimated.timing(dot1Opacity, {
            toValue: 0.3,
            duration: 400,
            useNativeDriver: true,
          }),
          RNAnimated.timing(dot2Opacity, {
            toValue: 0.3,
            duration: 400,
            useNativeDriver: true,
          }),
          RNAnimated.timing(dot3Opacity, {
            toValue: 0.3,
            duration: 400,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      dot1Opacity.setValue(0.3);
      dot2Opacity.setValue(0.3);
      dot3Opacity.setValue(0.3);
    }
  }, [isProcessing]);

  const loadActivities = async () => {
    try {
      const stored = await AsyncStorage.getItem(ACTIVITIES_STORAGE_KEY);
      if (stored) {
        const activities = JSON.parse(stored);
        setActivities(activities);
        if (activities.length > 0) {
          setLocalIsFirstTime(false);
          if (setIsFirstTime) {
            setIsFirstTime(false);
          }
        }
      }
    } catch (error) {
      console.error('Error loading activities:', error);
    }
  };

  const clearAllActivities = async () => {
    try {
      await AsyncStorage.removeItem(ACTIVITIES_STORAGE_KEY);
      setActivities([]);
      setLocalIsFirstTime(true);
      if (setIsFirstTime) {
        setIsFirstTime(true);
      }
    } catch (error) {
      console.error('Error clearing activities:', error);
    }
  };

  const saveActivities = async () => {
    try {
      await AsyncStorage.setItem(ACTIVITIES_STORAGE_KEY, JSON.stringify(activities));
    } catch (error) {
      console.error('Error saving activities:', error);
    }
  };

  const generateSubtasks = async (inputText: string) => {
    if (!inputText.trim()) {
      Alert.alert('Error', 'Escribe una tarea primero');
      return;
    }

    setIsGenerating(true);
    setTaskInput(inputText);
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
          body: JSON.stringify({ task: inputText.trim() }),
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
      let finalTitle = data.title || inputText;
      
      // Si el título es muy largo, truncar a 50 caracteres
      if (finalTitle.length > 50) {
        finalTitle = finalTitle.substring(0, 47) + '...';
      }

      setGeneratedTaskTitle(finalTitle);
      setGeneratedEmoji(data.emoji || '✨');
      
      // Transform subtasks to include id and isCompleted
      const transformedSubtasks: Subtask[] = data.tasks.map((task: any, index: number) => ({
        id: `${Date.now()}-${index}`,
        title: task.title,
        duration: task.duration,
        isCompleted: false,
      }));
      setSubtasks(transformedSubtasks);

      // Cerrar el modal de tarea y mostrar el modal de subtareas
      setShowTaskModal(false);
      
      // Mostrar las subtareas generadas después de un pequeño delay
      setTimeout(() => {
        setShowSubtasksModal(true);
      }, 300);
    } catch (error) {
      console.error('Error generando subtareas:', error);
      Alert.alert('Error', 'No se pudieron generar las subtareas. Intenta de nuevo.');
    } finally {
      setIsGenerating(false);
    }
  };

  const addTaskToList = (finalSubtasks?: Subtask[]) => {
    const tasksToUse = finalSubtasks || subtasks;
    
    if (!generatedTaskTitle || tasksToUse.length === 0) {
      Alert.alert('Error', 'Genera subtareas primero');
      return;
    }

    const newActivity: Activity = {
      id: Date.now().toString(),
      title: generatedTaskTitle,
      emoji: generatedEmoji,
      metric: `${tasksToUse.reduce((sum, t) => sum + t.duration, 0)} min`,
      color: '#A6E3A1',
      iconColor: getRandomIconColor(),
      action: 'play',
      completed: false,
      subtasks: tasksToUse,
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
    setShowSubtasksModal(false);
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

    // Si tiene subtareas, mostrar modal para iniciar
    if (activity.subtasks && activity.subtasks.length > 0) {
      setPendingActivityToStart(activity);
      setShowStartTaskModal(true);
    } else {
      // Sin subtareas, solo toggle
      toggleActivityStatus(activity.id);
    }
  };

  const handleEditSubtasks = (activity: Activity) => {
    if (activity.subtasks && activity.subtasks.length > 0) {
      setGeneratedTaskTitle(activity.title);
      setGeneratedEmoji(activity.emoji);
      setSubtasks(activity.subtasks);
      setShowSubtasksModal(true);
    }
  };

  // Stopwatch effect (counts up)
  useEffect(() => {
    let interval: number;
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
      RNAnimated.timing(executionSlideAnim, {
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
    <>
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
                  hasSubtasks={activity.subtasks ? activity.subtasks.length > 0 : false}
                  onPress={() => handleActivityPress(activity)}
                  onEditPress={() => handleEditSubtasks(activity)}
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
                hasSubtasks={activity.subtasks ? activity.subtasks.length > 0 : false}
                onPress={() => handleActivityPress(activity)}
                onEditPress={() => handleEditSubtasks(activity)}
              />
            ))}
          </View>

          {/* Test Onboarding Button */}
          <Pressable 
            style={styles.testOnboardingButton}
            onPress={() => setShowOnboardingModal(true)}
          >
            <Text style={styles.testOnboardingText}>Test Onboarding</Text>
          </Pressable>
        </ScrollView>

        {/* Onboarding Modal */}
        <Modal
          visible={showOnboardingModal}
          animationType="slide"
          transparent={false}
        >
          <SafeAreaView style={styles.onboardingContainer}>
            <View style={styles.onboardingHeader}>
              <Pressable 
                onPress={() => {
                  setShowOnboardingModal(false);
                  setOnboardingStep(1);
                  onboardingSlideAnim.setValue(0);
                }} 
                style={styles.backButton}
              >
                <X size={24} color={colors.textPrimary} />
              </Pressable>
            </View>

            <View style={styles.onboardingScrollContainer}>
              {/* Progress Dots - Hidden on first screen */}
              {onboardingStep !== 1 && (
                <View style={styles.progressDotsContainer}>
                  {[0, 1, 2, 3, 4, 5].map((index) => (
                    <View
                      key={index}
                      style={
                        index === onboardingStep - 1
                          ? {
                              width: 16,
                              height: 14,
                              borderRadius: 25,
                              backgroundColor: colors.primary,
                            }
                          : {
                              width: 9,
                              height: 9,
                              borderRadius: 55,
                              backgroundColor: colors.primary,
                            }
                      }
                    />
                  ))}
                </View>
              )}

              {/* Fixed Height Content Container */}
              <View style={styles.onboardingContentWrapper}>
                {/* Title Section - Fixed Height */}
                <View style={styles.onboardingTitleSection}>
                  <Text style={styles.onboardingTitle}>
                    {onboardingStep === 1 && 'Your Focus Keeper'}
                    {onboardingStep === 3 && "Don't worry"}
                    {(onboardingStep === 2 || onboardingStep === 4 || onboardingStep === 5 || onboardingStep === 6) && 'Have you been diagnosed with ADHD or do you suspect you have it?'}
                  </Text>
                </View>

                {/* Subtitle Section - Fixed Height */}
                <View style={styles.onboardingSubtitleSection}>
                  {onboardingStep === 1 && (
                    <Text style={styles.onboardingSubtitle}>
                      ADHD daily companion.{"\n"}
                      Habits for focus, peace, and progress,{"\n"}
                      by the team behind 🔥 FABULOUS
                    </Text>
                  )}
                  {onboardingStep === 3 && (
                    <Text style={styles.onboardingSubtitle}>
                      Having a brain that works differently can feel like having too many programs running on your computer.
                    </Text>
                  )}
                </View>

                {/* Image Section - Fixed Height & Size */}
                <View style={styles.onboardingImageSection}>
                  {(onboardingStep === 1 || onboardingStep === 3) && (
                    <Image
                      source={require('@/assets/images/Scrum board-rafiki.png')}
                      style={styles.onboardingImage}
                      resizeMode="contain"
                    />
                  )}
                </View>

                {/* Options Section - Flex for different layouts */}
                <View style={styles.onboardingOptionsSection}>
                  {(onboardingStep === 2 || onboardingStep === 4 || onboardingStep === 5 || onboardingStep === 6) && (
                    <View style={styles.optionsContainer}>
                      {["Yes, I've been diagnosed with ADHD", "I think I might have it", "No, but I'd like to improve my focus and productivity"].map((option, idx) => (
                        <Pressable
                          key={idx}
                          style={[
                            styles.optionButton,
                            selectedOption === idx && { borderColor: colors.primary, borderWidth: 3 },
                          ]}
                          onPress={() => {
                            setSelectedOption(idx);
                            setTimeout(() => {
                              setSelectedOption(null);
                              goToNextStep();
                            }, 200);
                          }}
                        >
                          <Text style={styles.optionText}>{option}</Text>
                        </Pressable>
                      ))}
                    </View>
                  )}
                </View>
              </View>

              {/* Button - Positioned at bottom */}
              {onboardingStep === 1 && (
                <Pressable 
                  style={styles.comenzarButton}
                  onPress={goToNextStep}
                >
                  <Text style={styles.comenzarButtonText}>Comenzar</Text>
                </Pressable>
              )}
            </View>
          </SafeAreaView>
        </Modal>

        {/* Task Creation Modal - New Design */}
        <TaskModalNew
          visible={showTaskModal}
          onClose={() => {
            // Cleanup recording if active
            if (isListening) {
              cleanup();
              setIsListening(false);
            }
            setShowTaskModal(false);
            setTaskInput('');
            setSubtasks([]);
            setGeneratedTaskTitle('');
            setGeneratedEmoji('✨');
          }}
          onSubmit={generateSubtasks}
          onVoiceStart={handleMicPressIn}
          onVoiceStop={handleMicPressOut}
          isListening={isListening}
          isProcessing={isGenerating || isProcessing}
          transcribedText={taskInput}
        />

        {/* Subtasks Modal - Full-screen SubtaskListScreen */}
        <Modal
          visible={showSubtasksModal}
          animationType="slide"
          transparent={false}
          onRequestClose={() => {
            setShowSubtasksModal(false);
            setSubtasks([]);
            setGeneratedTaskTitle('');
            setGeneratedEmoji('✨');
          }}
        >
          <SubtaskListScreen
            taskTitle={generatedTaskTitle}
            taskEmoji={generatedEmoji}
            initialSubtasks={subtasks}
            onStart={(finalSubtasks) => {
              // First add the task to the list
              addTaskToList(finalSubtasks);
              // Then open Focus Mode
              setFocusModeSubtasks(finalSubtasks);
              setShowSubtasksModal(false);
              setTimeout(() => {
                setShowFocusMode(true);
              }, 300);
            }}
            onClose={() => {
              setShowSubtasksModal(false);
              setSubtasks([]);
              setGeneratedTaskTitle('');
              setGeneratedEmoji('✨');
            }}
          />
        </Modal>

        {/* Focus Mode Screen - Immersive Task Execution */}
        <Modal
          visible={showFocusMode}
          animationType="fade"
          transparent={false}
          onRequestClose={() => setShowFocusMode(false)}
          statusBarTranslucent
        >
          <FocusModeScreen
            taskTitle={generatedTaskTitle}
            taskEmoji={generatedEmoji}
            subtasks={focusModeSubtasks}
            onComplete={() => {
              setShowFocusMode(false);
              setFocusModeSubtasks([]);
              setSubtasks([]);
              setGeneratedTaskTitle('');
              setGeneratedEmoji('✨');
              Alert.alert('🎉 ¡Felicidades!', 'Has completado todas las subtareas');
            }}
            onClose={() => {
              setShowFocusMode(false);
            }}
          />
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
                      <X size={16} color="#9CA3AF" />
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
                onPress={() => {
                  setShowScheduleModal(false);
                  // Si se abrió desde "Programar Tarea", abre el modal de tarea
                  if (shouldShowTaskModalAfterSchedule) {
                    setShowTaskModal(true);
                    setShouldShowTaskModalAfterSchedule(false);
                  }
                }}
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
                    <X size={28} color="#1E1E2E" />
                  </Pressable>
                </View>
                {/* Progress Indicator */}
                <View style={styles.progressContainer}>
                  {executingActivity?.subtasks?.map((_: Subtask, index: number) => (
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
                    <RNAnimated.View
                      style={[
                        styles.sliderThumb,
                        {
                          transform: [{
                            translateX: executionSlideAnim.interpolate({
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
                          executionSlideAnim.setValue(progress);
                        },
                        onResponderRelease: () => {
                          const currentValue = (executionSlideAnim as any)._value;
                          if (currentValue > 0.8) {
                            RNAnimated.spring(executionSlideAnim, {
                              toValue: 1,
                              useNativeDriver: true,
                            }).start(() => {
                              handleSlideComplete();
                            });
                          } else {
                            RNAnimated.spring(executionSlideAnim, {
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

        {/* Start Task Modal */}
        <Modal
          visible={showStartTaskModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowStartTaskModal(false)}
        >
          <View style={styles.startTaskModalOverlay}>
            <View style={styles.startTaskModalContent}>
              <LinearGradient
                colors={['#CBA6F7', '#DFC0FF', '#CBA6F7']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
              
              {/* Content */}
              <View style={styles.startTaskModalInner}>
                {/* Close Button */}
                <Pressable
                  onPress={() => setShowStartTaskModal(false)}
                  style={styles.startTaskCloseButton}
                >
                  <X size={24} color="rgba(59, 66, 97, 0.6)" />
                </Pressable>

                {/* Emoji */}
                <Text style={styles.startTaskEmoji}>{pendingActivityToStart?.emoji}</Text>

                {/* Title */}
                <Text style={styles.startTaskTitle}>¿Empezar Tarea?</Text>

                {/* Subtitle */}
                <Text style={styles.startTaskSubtitle}>
                  {pendingActivityToStart?.title}
                </Text>

                {/* Buttons */}
                <View style={styles.startTaskButtonsContainer}>
                  {/* Cancel Button */}
                  <Pressable
                    onPress={() => setShowStartTaskModal(false)}
                    style={styles.startTaskCancelButton}
                  >
                    <Text style={styles.startTaskCancelButtonText}>Más Tarde</Text>
                  </Pressable>

                  {/* Start Button */}
                  <Pressable
                    onPress={() => {
                      if (pendingActivityToStart) {
                        setGeneratedTaskTitle(pendingActivityToStart.title);
                        setGeneratedEmoji(pendingActivityToStart.emoji);
                        setFocusModeSubtasks(pendingActivityToStart.subtasks || []);
                        setShowFocusMode(true);
                        setShowStartTaskModal(false);
                      }
                    }}
                    style={styles.startTaskStartButton}
                  >
                    <LinearGradient
                      colors={['#1E1E2E', '#252536']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.startTaskStartButtonGradient}
                    >
                      <Text style={styles.startTaskStartButtonText}>Empezar</Text>
                    </LinearGradient>
                  </Pressable>
                </View>
              </View>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </>
  );
});

PlanScreen.displayName = 'PlanScreen';
export default PlanScreen;

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background } as any,
  container: { flex: 1 } as any,
  contentContainer: { paddingTop: 16, marginBottom: 24 } as any,
  notificationWrapper: { paddingHorizontal: 20, marginBottom: 32 } as any,
  sectionHeader: { paddingHorizontal: 20, marginBottom: 16 } as any,
  sectionTitle: { fontSize: 20, fontWeight: '700', color: colors.textPrimary, letterSpacing: -0.5, textAlign: 'center', marginBottom: 32, paddingHorizontal: 16 } as any,
  activitiesContainer: { paddingHorizontal: 20 } as any,
  testOnboardingButton: { marginHorizontal: 20, marginTop: 24, backgroundColor: colors.primary, paddingVertical: 16, paddingHorizontal: 24, borderRadius: 12, alignItems: 'center' } as any,
  testOnboardingText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '600',
  } as any,
  // Subtasks Modal Styles
  subtasksContainer: {
    flex: 1,
    backgroundColor: colors.background,
  } as any,
  subtasksHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  } as any,
  subtasksTitle: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  } as any,
  subtasksTitleEmoji: {
    fontSize: 28,
  } as any,
  subtasksTitleText: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    maxWidth: 200,
  } as any,
  subtasksScrollView: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  } as any,
  subtasksLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 16,
  } as any,
  subtaskItem: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
  } as any,
  subtaskContent: {
    flexDirection: 'column',
  } as any,
  subtaskItemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 4,
  } as any,
  subtaskItemDuration: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '500',
  } as any,
  totalDuration: {
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 24,
  } as any,
  totalDurationLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
  } as any,
  totalDurationValue: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primary,
  } as any,
  subtasksActions: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingBottom: 24,
    paddingTop: 12,
  } as any,
  subtasksCancelButton: {
    flex: 1,
    backgroundColor: '#E5E7EB',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  } as any,
  subtasksCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textSecondary,
  } as any,
  subtasksConfirmButton: {
    flex: 1,
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  } as any,
  subtasksConfirmText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  } as any,
  onboardingContainer: {
    flex: 1,
    backgroundColor: colors.background,
  } as any,
  onboardingHeader: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  } as any,
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  } as any,
  onboardingContentWrapper: {
    flex: 1,
    width: '100%',
    paddingHorizontal: ONBOARDING_DIMENSIONS.horizontalPadding,
    justifyContent: 'flex-start',
    alignItems: 'center',
  } as any,
  onboardingTitleSection: {
    height: ONBOARDING_DIMENSIONS.titleSectionHeight,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: ONBOARDING_DIMENSIONS.marginTop,
  } as any,
  onboardingSubtitleSection: {
    height: ONBOARDING_DIMENSIONS.subtitleSectionHeight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: ONBOARDING_DIMENSIONS.verticalGap,
  } as any,
  onboardingImageSection: {
    height: ONBOARDING_DIMENSIONS.imageSectionHeight,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: ONBOARDING_DIMENSIONS.verticalGap,
  } as any,
  onboardingOptionsSection: {
    flex: 1,
    width: '100%',
    justifyContent: 'flex-start',
    alignItems: 'center',
  } as any,
  onboardingContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 32,
    width: '100%',
  } as any,
  onboardingScrollContainer: {
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingBottom: 20,
  } as any,
  progressDotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: ONBOARDING_DOTS.gap,
    marginBottom: ONBOARDING_DOTS.marginBottom,
  } as any,
  progressDot: {
    width: 11,
    height: 11,
    borderRadius: 5.5,
    backgroundColor: '#000000',
  } as any,
  // Fix misplaced properties
  progressDotText: {
    textAlign: 'left',
    marginBottom: 32,
    paddingHorizontal: 20,
    lineHeight: 30,
  } as any,
  optionsContainer: {
    width: '100%',
    paddingHorizontal: ONBOARDING_DIMENSIONS.horizontalPadding,
    gap: ONBOARDING_BUTTONS.optionButtonGap,
    alignItems: 'center',
    justifyContent: 'center',
  } as any,
  optionButton: {
    backgroundColor: ONBOARDING_COLORS.optionButtonBg,
    paddingVertical: ONBOARDING_BUTTONS.optionButtonPaddingVertical,
    paddingHorizontal: ONBOARDING_BUTTONS.optionButtonPaddingHorizontal,
    borderRadius: ONBOARDING_BUTTONS.optionButtonBorderRadius,
    borderWidth: ONBOARDING_BUTTONS.optionButtonBorderWidth,
    borderColor: ONBOARDING_COLORS.optionButtonBorder,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  } as any,
  optionText: {
    fontSize: ONBOARDING_TYPOGRAPHY.optionFontSize,
    fontWeight: ONBOARDING_TYPOGRAPHY.optionFontWeight,
    color: ONBOARDING_COLORS.optionTextColor,
    textAlign: 'center',
  } as any,
  onboardingSubtitle: {
    fontSize: ONBOARDING_TYPOGRAPHY.subtitleFontSize,
    fontWeight: ONBOARDING_TYPOGRAPHY.subtitleFontWeight,
    color: ONBOARDING_COLORS.subtitleColor,
    textAlign: 'center',
    lineHeight: ONBOARDING_TYPOGRAPHY.subtitleLineHeight,
  } as any,
  onboardingImage: {
    width: ONBOARDING_DIMENSIONS.imageWidth,
    height: ONBOARDING_DIMENSIONS.imageHeight,
    resizeMode: 'contain',
  } as any,
  onboardingFooter: {
    paddingHorizontal: 40,
    paddingBottom: 40,
  } as any,
  comenzarButton: {
    backgroundColor: ONBOARDING_COLORS.primaryButton,
    paddingVertical: ONBOARDING_BUTTONS.primaryButtonPaddingVertical,
    paddingHorizontal: ONBOARDING_BUTTONS.primaryButtonPaddingHorizontal,
    borderRadius: ONBOARDING_BUTTONS.primaryButtonBorderRadius,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: ONBOARDING_BUTTONS.primaryButtonMarginBottom,
    minWidth: ONBOARDING_BUTTONS.primaryButtonMinWidth,
    shadowColor: ONBOARDING_COLORS.shadowColor,
    shadowOffset: ONBOARDING_SHADOWS.shadowOffset,
    shadowOpacity: ONBOARDING_SHADOWS.shadowOpacity,
    shadowRadius: ONBOARDING_SHADOWS.shadowRadius,
    elevation: ONBOARDING_SHADOWS.elevation,
  } as any,
  comenzarButtonText: {
    color: ONBOARDING_COLORS.buttonTextColor,
    fontSize: ONBOARDING_TYPOGRAPHY.buttonFontSize,
    fontWeight: ONBOARDING_TYPOGRAPHY.buttonFontWeight,
  } as any,
  onboardingTitle: {
    fontSize: ONBOARDING_TYPOGRAPHY.titleFontSize,
    fontWeight: ONBOARDING_TYPOGRAPHY.titleFontWeight,
    color: ONBOARDING_COLORS.titleColor,
    textAlign: 'center',
    marginBottom: ONBOARDING_DIMENSIONS.verticalGap,
  } as any,
  emptyPlaceholder: {
    fontSize: 16,
    color: colors.textPrimary,
    opacity: 0.4,
    textAlign: 'center',
    paddingVertical: 32,
  } as any,
  taskModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
    position: 'relative',
  } as any,
  taskModalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 20,
    maxHeight: '90%',
  } as any,
  taskModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(168, 230, 207, 0.3)',
  } as any,
  taskModalTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: colors.textPrimary,
    letterSpacing: -0.5,
  } as any,
  taskModalBody: {
    padding: 20,
  } as any,
  taskInputWrapper: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'rgba(168, 230, 207, 0.3)',
    padding: 16,
    marginBottom: 16,
    position: 'relative',
  } as any,
  inputContainer: {
    position: 'relative',
    width: '100%',
    overflow: 'visible',
  } as any,
  taskInput: {
    fontSize: 16,
    color: colors.textPrimary,
    fontWeight: '500',
    minHeight: 140,
    paddingRight: 50,
    paddingTop: 12,
    paddingBottom: 12,
  } as any,
  voiceButton: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    width: 54,
    height: 54,
    borderRadius: 27,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.danger,
    zIndex: 1002,
    shadowColor: colors.danger,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  } as any,
  voiceButtonActive: {
    backgroundColor: '#D96C82',
  } as any,
  voiceSectionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    marginTop: 20,
    paddingHorizontal: 8,
  } as any,

  voiceButtonContainer: {
    width: 54,
    height: 54,
  } as any,
  voiceText: {
    fontSize: 12,
    color: 'rgba(168, 230, 207, 0.6)',
    fontWeight: '500',
    flex: 1,
    marginRight: 12,
  } as any,
  processingText: {
    fontSize: 13,
    color: '#A6E3A1',
    fontWeight: '600',
    flex: 1,
    marginRight: 12,
  } as any,
  processingButton: {
    backgroundColor: '#9CA3AF',
  } as any,
  loadingDot: {
    fontSize: 24,
    color: '#FFFFFF',
    fontWeight: '900',
  } as any,
  recordingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
    pointerEvents: 'none',
  } as any,
  recordingContent: {
    alignItems: 'center',
    justifyContent: 'center',
  } as any,
  recordingPulse: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#EF4444',
    opacity: 0.4,
    marginTop: 24,
  } as any,
  recordingButtonContainer: {
    marginBottom: 24,
  } as any,
  recordingButton: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 20,
    elevation: 10,
  } as any,
  recordingButtonProcessing: {
    backgroundColor: '#9CA3AF',
    shadowColor: '#9CA3AF',
  } as any,
  recordingStatusText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 1.5,
  } as any,
  recordingDots: {
    fontSize: 24,
    color: '#FFFFFF',
    letterSpacing: 4,
  } as any,
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
  } as any,
  recordingDot: {
    fontSize: 20,
    color: '#FFFFFF',
    fontWeight: '900',
  } as any,
  generateButton: {
    backgroundColor: '#A6E3A1',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: 'center',
    marginBottom: 16,
  } as any,
  generateButtonDisabled: {
    backgroundColor: 'rgba(168, 230, 207, 0.3)',
    opacity: 0.5,
  } as any,
  generateButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#121212',
  } as any,
  generatedTaskSection: {
    backgroundColor: 'rgba(168, 230, 207, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  } as any,
  taskHeader: {
    marginBottom: 12,
  } as any,
  generatedTaskTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.success,
  } as any,
  subtasksList: {
    backgroundColor: 'rgba(166, 227, 161, 0.15)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: colors.success,
  } as any,
  subtaskText: {
    fontSize: 14,
    color: colors.success,
    flex: 1,
    fontWeight: '600',
  } as any,
  subtaskDuration: {
    fontSize: 12,
    color: '#FFD3B6',
    fontWeight: '700',
    backgroundColor: 'rgba(255, 211, 182, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  } as any,
  addTaskButton: {
    backgroundColor: colors.success,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  } as any,
  addTaskButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.background,
  } as any,
  actionOptionsContainer: {
    gap: 12,
    marginBottom: 16,
  } as any,
  actionOptionButton: {
    backgroundColor: colors.success,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  } as any,
  actionOptionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  } as any,
  actionOptionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.background,
  } as any,
  actionOptionSubtext: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  } as any,
  scheduleToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 16,
  } as any,
  scheduleToggleContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  } as any,
  scheduleLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  } as any,
  scheduleBadge: {
    backgroundColor: colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginLeft: 4,
  } as any,
  subtasksSection: {
    marginBottom: 24,
  } as any,
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
  } as any,
  regenerateText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  } as any,
  subtaskCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 16,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(168, 230, 207, 0.2)',
  } as any,
  subtaskNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  } as any,
  subtaskNumberText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#1E1E2E',
  } as any,
  subtaskTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E1E2E',
    marginBottom: 4,
  } as any,
  subtaskInput: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E1E2E',
    marginBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: colors.primary,
  } as any,
  subtaskActions: {
    flexDirection: 'row',
    gap: 8,
  } as any,
  iconButton: {
    padding: 4,
  } as any,
  totalDurationText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#1E1E2E',
  } as any,
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
  } as any,
  addToListButtonText: {
    fontSize: 18,
    fontWeight: '900',
    color: '#1E1E2E',
  } as any,
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  } as any,
  modalContent: {
    backgroundColor: '#313244',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 20,
    maxHeight: '85%',
  } as any,
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  } as any,
  modalTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#1E1E2E',
    letterSpacing: -0.5,
  } as any,
  modalBody: {
    padding: 20,
  } as any,
  modalButton: {
    backgroundColor: '#A6E3A1',
    marginHorizontal: 20,
    marginVertical: 20,
    paddingVertical: 18,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  } as any,
  modalButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E1E2E',
    letterSpacing: 0.3,
  } as any,
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E1E2E',
    marginBottom: 12,
    marginTop: 8,
  } as any,
  frequencyChips: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
    marginBottom: 16,
  } as any,
  chip: {
    flex: 1,
    minWidth: 70,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    alignItems: 'center',
  } as any,
  chipActive: {
    backgroundColor: '#A6E3A1',
    borderColor: '#A6E3A1',
  } as any,
  chipText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  } as any,
  chipTextActive: {
    color: '#121212',
  } as any,
  daySelector: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'space-between',
    marginBottom: 16,
  } as any,
  dayChip: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  } as any,
  dayChipActive: {
    backgroundColor: '#A6E3A1',
    borderColor: '#A6E3A1',
  } as any,
  dayChipText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#6B7280',
  } as any,
  dayChipTextActive: {
    color: '#121212',
  } as any,
  timePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    padding: 16,
    marginBottom: 16,
  } as any,
  timePickerText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: '#1E1E2E',
  } as any,
  reminderSection: {
    marginTop: 8,
  } as any,
  reminderToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  } as any,
  reminderOptions: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  } as any,
  executionContainer: {
    flex: 1,
    backgroundColor: '#ffc300',
  } as any,
  executionHeader: {
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  } as any,
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  } as any,
  executionTaskTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '300',
    color: '#1E1E2E',
  } as any,
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 20,
    marginBottom: 40,
  } as any,
  subtaskDisplay: {
    alignItems: 'center',
    paddingHorizontal: 24,
    marginBottom: 320,
    flex: 1,
    justifyContent: 'center',
  } as any,
  subtaskDisplayTitle: {
    fontSize: 48,
    fontWeight: '900',
    color: '#1E1E2E',
    textAlign: 'center',
    lineHeight: 56,
  } as any,
  sliderContainer: {
    position: 'absolute',
    bottom: 60,
    left: 0,
    right: 0,
    paddingHorizontal: 40,
    alignItems: 'center',
  } as any,
  sliderLabel: {
    position: 'absolute',
    fontSize: 15,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.5)',
    zIndex: 1,
    letterSpacing: 0.5,
  } as any,
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
  } as any,
  sliderThumb: {
    position: 'absolute',
    left: 4,
    width: 80,
    height: 80,
    borderRadius: 66,
    backgroundColor: '#313244',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  } as any,
  successScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#A6E3A1',
  } as any,
  successIcon: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
  } as any,
  successTitle: {
    fontSize: 36,
    fontWeight: '900',
    color: '#FFFFFF',
    marginBottom: 12,
    letterSpacing: -1,
  } as any,
  startTaskModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  } as any,
  startTaskModalContent: {
    width: '85%',
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#CBA6F7',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 12,
  } as any,
  startTaskModalInner: {
    paddingHorizontal: 24,
    paddingVertical: 32,
    alignItems: 'center',
  } as any,
  startTaskCloseButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    padding: 8,
    zIndex: 10,
  } as any,
  startTaskEmoji: {
    fontSize: 60,
    marginBottom: 20,
  } as any,
  startTaskTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: '#3B4261',
    letterSpacing: -0.5,
    marginBottom: 8,
  } as any,
  startTaskSubtitle: {
    fontSize: 16,
    fontWeight: '600',
    color: 'rgba(59, 66, 97, 0.75)',
    textAlign: 'center',
    marginBottom: 28,
    paddingHorizontal: 12,
  } as any,
  startTaskButtonsContainer: {
    width: '100%',
    gap: 12,
  } as any,
  startTaskCancelButton: {
    paddingVertical: 12,
    alignItems: 'center',
  } as any,
  startTaskCancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(59, 66, 97, 0.6)',
  } as any,
  startTaskStartButton: {
    borderRadius: 50,
    overflow: 'hidden',
  } as any,
  startTaskStartButtonGradient: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    alignItems: 'center',
  } as any,
  startTaskStartButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: -0.3,
  } as any,
}) as any;
