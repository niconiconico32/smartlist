import { colors } from '@/constants/theme';
import { CreateRoutineModal } from '@/src/components/CreateRoutineModal';
import { FocusHeroCard } from '@/src/components/FocusHeroCard';
import { LiquidFAB } from '@/src/components/LiquidFAB';
import { WeeklyCalendar } from '@/src/components/WeeklyCalendar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { useFocusEffect, useRouter } from 'expo-router';
import { CalendarCheck, Grid2x2 } from 'lucide-react-native';
import React, { createRef, useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Animated, Dimensions, Image, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import PagerView from 'react-native-pager-view';
import Animated_Reanimated, { FadeIn } from 'react-native-reanimated';
import { format, subDays } from 'date-fns';
import { 
  getLocalTodayDateKey, 
  getLocalDateKey,
  isLocalToday, 
  isLocalYesterday, 
  hasCountedToday 
} from '@/src/utils/dateHelpers';
import IndexScreen from './index';
import TwoScreen from './two';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Ref para llamar función del IndexScreen
export const addTaskRef = createRef<{ 
  openTaskModal: (showSchedule?: boolean) => void;
  openProgramScheduleModal: () => void;
}>();

// Type for Activity from IndexScreen
interface Activity {
  id: string;
  title: string;
  completed: boolean;
  recurrence?: {
    type: 'once' | 'daily' | 'weekly';
    days?: number[];
  };
  completedDates?: string[];
  scheduledDate?: string;
}

// Map of day abbreviations to day of week numbers (0 = Sunday, 1 = Monday, etc.)
const DAY_ABBREV_TO_NUMBER: Record<string, number> = {
  'Dom': 0,
  'Lun': 1,
  'Mar': 2,
  'Mié': 3,
  'Jue': 4,
  'Vie': 5,
  'Sáb': 6,
};

export default function SwipeableLayout() {
  const pagerRef = useRef<PagerView>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [isFABOpen, setIsFABOpen] = useState(false);
  const [isFirstTime, setIsFirstTime] = useState(true);
  const [showCreateRoutineModal, setShowCreateRoutineModal] = useState(false);
  const [routines, setRoutines] = useState<Array<{ id: string; name: string; days: string[]; tasks?: Array<{ id: string; completed?: boolean }> }>>([]);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [currentStreak, setCurrentStreak] = useState(0);
  const [isStreakActiveToday, setIsStreakActiveToday] = useState(false);
  const [activities, setActivities] = useState<Activity[]>([]);
  const pulseAnimFirstTime = useRef(new Animated.Value(1)).current;
  const router = useRouter();

  // Load and calculate streak
  const loadStreak = useCallback(async () => {
    try {
      const streakData = await AsyncStorage.getItem('@smartlist_streak');
      if (streakData) {
        const { count, lastCompletedDate } = JSON.parse(streakData);
        
        if (lastCompletedDate) {
          // ✅ TIMEZONE SAFE: Check if streak is still valid
          if (isLocalToday(lastCompletedDate)) {
            // Completed today - streak active
            setCurrentStreak(count);
            setIsStreakActiveToday(true);
          } else if (isLocalYesterday(lastCompletedDate)) {
            // Completed yesterday - streak still valid but not active today yet
            setCurrentStreak(count);
            setIsStreakActiveToday(false);
          } else {
            // Streak lost - reset
            setCurrentStreak(0);
            setIsStreakActiveToday(false);
            await AsyncStorage.setItem('@smartlist_streak', JSON.stringify({
              count: 0,
              lastCompletedDate: null,
            }));
          }
        } else {
          setCurrentStreak(count || 0);
          setIsStreakActiveToday(false);
        }
      }
    } catch (error) {
      console.error('Error loading streak:', error);
    }
  }, []);

  // Update streak when user completes any task (easy reward system)
  const updateStreakOnTaskComplete = useCallback(async () => {
    try {
      const streakData = await AsyncStorage.getItem('@smartlist_streak');
      const today = getLocalTodayDateKey(); // ✅ TIMEZONE SAFE: Use local date
      
      if (streakData) {
        const { count, lastCompletedDate } = JSON.parse(streakData);
        
        // ✅ TIMEZONE SAFE: Check if already counted today
        if (hasCountedToday(lastCompletedDate)) {
          // Already counted today - just ensure UI is updated
          setIsStreakActiveToday(true);
          return;
        }
        
        // Check if streak should continue or reset
        let newCount = 1;
        if (lastCompletedDate && isLocalYesterday(lastCompletedDate)) {
          // Continue streak - they completed yesterday
          newCount = count + 1;
        }
        // If more than 1 day ago or null, streak resets to 1
        
        setCurrentStreak(newCount);
        setIsStreakActiveToday(true);
        await AsyncStorage.setItem('@smartlist_streak', JSON.stringify({
          count: newCount,
          lastCompletedDate: today,
        }));
        
        // Celebration haptic
        try {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch (e) {}
      } else {
        // First time ever
        setCurrentStreak(1);
        setIsStreakActiveToday(true);
        await AsyncStorage.setItem('@smartlist_streak', JSON.stringify({
          count: 1,
          lastCompletedDate: today,
        }));
        
        // Celebration haptic
        try {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch (e) {}
      }
    } catch (error) {
      console.error('Error updating streak:', error);
    }
  }, []);

  // Load routines from AsyncStorage
  const loadRoutines = useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem('@smartlist_routines');
      if (stored) {
        const parsedRoutines = JSON.parse(stored);
        if (parsedRoutines && parsedRoutines.length > 0) {
          setRoutines(parsedRoutines);
        }
      }
    } catch (error) {
      console.error('Error loading routines:', error);
    }
  }, []);

  // Load routines and streak when screen focuses
  useFocusEffect(
    useCallback(() => {
      loadRoutines();
      loadStreak();
    }, [loadRoutines, loadStreak])
  );

  // Calculate real completed tasks history from activities
  const calculateCompletedTasksHistory = () => {
    const history: Record<string, { tasks: number; routines: number }> = {};
    
    // Contar tareas completadas
    activities.forEach(activity => {
      const recurrenceType = activity.recurrence?.type || 'once';
      
      if (recurrenceType === 'once' || !activity.recurrence) {
        // Tareas de una vez: solo contar en su fecha programada si están completadas
        if (activity.scheduledDate && activity.completed) {
          if (!history[activity.scheduledDate]) {
            history[activity.scheduledDate] = { tasks: 0, routines: 0 };
          }
          history[activity.scheduledDate].tasks++;
        }
      } else if (recurrenceType === 'daily') {
        // Tareas diarias: contar en cada fecha donde fue completada
        activity.completedDates?.forEach(date => {
          if (!history[date]) {
            history[date] = { tasks: 0, routines: 0 };
          }
          history[date].tasks++;
        });
      } else if (recurrenceType === 'weekly') {
        // Tareas semanales: contar en cada fecha donde fue completada
        activity.completedDates?.forEach(date => {
          if (!history[date]) {
            history[date] = { tasks: 0, routines: 0 };
          }
          history[date].tasks++;
        });
      }
    });
    
    // Contar rutinas completadas
    routines.forEach(routine => {
      // Las rutinas tienen completedDates por cada día que se completaron
      const routineCompletedDates = (routine as any).completedDates || [];
      routineCompletedDates.forEach((date: string) => {
        if (!history[date]) {
          history[date] = { tasks: 0, routines: 0 };
        }
        history[date].routines++;
      });
    });
    
    return history;
  };
  
  // Calculate scheduled (pending) tasks history from activities
  const calculateScheduledTasksHistory = () => {
    const history: Record<string, { tasks: number; routines: number }> = {};
    const today = new Date();
    
    // Generate dates for past 15 days and next 30 days to check for scheduled tasks
    for (let i = -15; i < 30; i++) {
      const checkDate = new Date(today);
      checkDate.setDate(today.getDate() + i);
      const dateKey = format(checkDate, 'yyyy-MM-dd');
      const dayOfWeek = checkDate.getDay(); // 0 = Sunday, 1 = Monday, etc.
      const adjustedDayOfWeek = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Ajustar para que 0 = Lunes, 6 = Domingo
      
      // Contar tareas programadas
      activities.forEach(activity => {
        const recurrenceType = activity.recurrence?.type || 'once';
        
        if (recurrenceType === 'once' || !activity.recurrence) {
          // Tareas de una vez: contar si está programada para este día y NO está completada
          if (activity.scheduledDate === dateKey && !activity.completed) {
            if (!history[dateKey]) {
              history[dateKey] = { tasks: 0, routines: 0 };
            }
            history[dateKey].tasks++;
          }
        } else if (recurrenceType === 'daily') {
          // Tareas diarias: contar si NO está completada en esta fecha
          if (!activity.completedDates?.includes(dateKey)) {
            if (!history[dateKey]) {
              history[dateKey] = { tasks: 0, routines: 0 };
            }
            history[dateKey].tasks++;
          }
        } else if (recurrenceType === 'weekly') {
          // Tareas semanales: contar si este día está en los días programados y NO está completada
          const isScheduledForThisDay = activity.recurrence?.days?.includes(adjustedDayOfWeek);
          const isCompletedOnThisDay = activity.completedDates?.includes(dateKey);
          
          if (isScheduledForThisDay && !isCompletedOnThisDay) {
            if (!history[dateKey]) {
              history[dateKey] = { tasks: 0, routines: 0 };
            }
            history[dateKey].tasks++;
          }
        }
      });
      
      // Contar rutinas programadas pero no completadas
      routines.forEach(routine => {
        // Verificar si esta rutina está programada para este día de la semana
        const isScheduledForThisDay = routine.days.some(dayAbbrev => 
          DAY_ABBREV_TO_NUMBER[dayAbbrev] === dayOfWeek
        );
        
        if (isScheduledForThisDay) {
          // Verificar si la rutina NO fue completada en este día
          const routineCompletedDates = (routine as any).completedDates || [];
          const isCompletedOnThisDay = routineCompletedDates.includes(dateKey);
          
          if (!isCompletedOnThisDay) {
            if (!history[dateKey]) {
              history[dateKey] = { tasks: 0, routines: 0 };
            }
            history[dateKey].routines++;
          }
        }
      });
    }
    
    return history;
  };
  
  const completedTasksHistory = calculateCompletedTasksHistory();
  const scheduledTasksHistory = calculateScheduledTasksHistory();

  const handleTabPress = (page: number) => {
    if (Platform.OS === 'ios') {
      Haptics.selectionAsync();
    } else {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    pagerRef.current?.setPage(page);
  };

  const handleAddPress = () => {
    if (Platform.OS === 'ios') {
      Haptics.selectionAsync();
    } else {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    // Abrir modal de agregar tarea
    addTaskRef.current?.openTaskModal();
  };

  const handleHacerTareaPress = () => {
    // Abrir modal de agregar tarea sin opción de programar
    addTaskRef.current?.openTaskModal(false);
  };

  const handleProgramarTareaPress = () => {
    // Abrir modal de programación primero, luego la tarea
    addTaskRef.current?.openProgramScheduleModal();
  };

  const handleCreateRoutinePress = () => {
    // Abrir modal para crear una nueva rutina
    setShowCreateRoutineModal(true);
  };

  const handleCreateRoutine = async (routine: {
    name: string;
    days: string[];
    tasks: any[];
    reminderEnabled: boolean;
    reminderTime?: string;
  }) => {
    try {
      // Guardar la rutina en AsyncStorage
      const existingRoutines = await AsyncStorage.getItem('@smartlist_routines');
      const currentRoutines = existingRoutines ? JSON.parse(existingRoutines) : [];
      
      // Asegurarnos de que cada tarea tenga completed: false
      const tasksWithCompleted = routine.tasks.map(task => ({
        ...task,
        completed: task.completed ?? false,
      }));
      
      const newRoutine = {
        id: Date.now().toString(),
        ...routine,
        tasks: tasksWithCompleted,
        createdAt: new Date().toISOString(),
      };
      
      currentRoutines.push(newRoutine);
      await AsyncStorage.setItem('@smartlist_routines', JSON.stringify(currentRoutines));
      
      // Reload routines to update the calendar
      await loadRoutines();
      
      const daysText = routine.days.join(', ');
      Alert.alert('¡Éxito!', `Rutina "${routine.name}" creada para ${daysText}`);
    } catch (error) {
      console.error('Error al crear rutina:', error);
      Alert.alert('Error', 'No se pudo crear la rutina');
    }
  };

  const handleFABOpenChange = (isOpen: boolean) => {
    // Desaparecer overlay cuando se abre el FAB por primera vez
    if (isOpen && isFirstTime) {
      setIsFirstTime(false);
    }
    setIsFABOpen(isOpen);
  };

  // Pulse animation for first time overlay
  React.useEffect(() => {
    if (isFirstTime) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnimFirstTime, {
            toValue: 1.15,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnimFirstTime, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      pulseAnimFirstTime.setValue(1);
    }
  }, [isFirstTime]);

  return (
    <View style={styles.container}>
      {/* Blur overlay cuando FAB está abierto */}
      {isFABOpen && (
        <BlurView intensity={100} tint="dark" style={styles.blurOverlay}>
          <Pressable
            style={styles.blurPressable}
            onPress={() => setIsFABOpen(false)}
          />
        </BlurView>
      )}

      {/* Fixed Header Components */}
      <View style={styles.fixedHeader}>
        <WeeklyCalendar 
          completedTasksHistory={completedTasksHistory}
          scheduledTasksHistory={scheduledTasksHistory}
          scheduledRoutines={routines}
          onDateSelect={(date) => {
            setSelectedDate(date);
            console.log('Fecha seleccionada:', format(date, 'yyyy-MM-dd'));
          }}
        />
        <View style={styles.progressWrapper}>
          <FocusHeroCard 
            currentStreak={currentStreak}
            isStreakActiveToday={isStreakActiveToday}
          />
        </View>
      </View>

      {/* Swipeable Content */}
      <PagerView
        ref={pagerRef}
        style={styles.pagerView}
        initialPage={0}
        scrollEnabled={!showCreateRoutineModal}
        onPageSelected={(e: any) => setCurrentPage(e.nativeEvent.position)}
      >
        <View key="1" style={styles.page}>
          <IndexScreen 
            key={`index-${selectedDate.toISOString()}`}
            ref={addTaskRef} 
            setIsFirstTime={setIsFirstTime} 
            pulseAnim={pulseAnimFirstTime} 
            isFirstTime={isFirstTime} 
            onTaskCompleted={updateStreakOnTaskComplete}
            selectedDate={selectedDate}
            onActivitiesChange={setActivities}
          />
        </View>
        <View key="2" style={styles.page}>
          <TwoScreen selectedDate={selectedDate} key={selectedDate.toISOString()} onRoutineCompleted={updateStreakOnTaskComplete} />
        </View>
      </PagerView>

      {/* Tab Bar */}
      <View style={styles.tabBar}>
        <Pressable
          style={[styles.tabItem, currentPage === 0 && styles.tabItemActive]}
          onPress={() => handleTabPress(0)}
          disabled={showCreateRoutineModal}
        >
          <CalendarCheck
            size={22}
            color={currentPage === 0 ? colors.textPrimary : colors.textSecondary}
          />
          <Text style={[styles.tabLabel, currentPage === 0 && styles.tabLabelActive]}>
            Tareas
          </Text>
        </Pressable>

        <View style={styles.centralButtonContainer}>
          <LiquidFAB 
            currentPage={currentPage}
            onHacerTareaPress={handleHacerTareaPress}
            onProgramarTareaPress={handleProgramarTareaPress}
            onCreateRoutinePress={handleCreateRoutinePress}
            onOpenChange={handleFABOpenChange}
            isOpen={isFABOpen}
          />
        </View>

        <Pressable
          style={[styles.tabItem, currentPage === 1 && styles.tabItemActive]}
          onPress={() => handleTabPress(1)}
          disabled={showCreateRoutineModal}
        >
          <Grid2x2
            size={22}
            color={currentPage === 1 ? colors.textPrimary : colors.textSecondary}
          />
          <Text style={[styles.tabLabel, currentPage === 1 && styles.tabLabelActive]}>
            Rutinas
          </Text>
        </Pressable>
      </View>

      {/* First Time Overlay - Top Level */}
      {isFirstTime && (
        <Animated_Reanimated.View 
          style={styles.firstTimeOverlay}
          entering={FadeIn.duration(500)}
        >
          <View style={styles.firstTimeContent}>
            <Image 
              source={require('@/assets/images/logomain.png')}
              style={styles.firstTimeImage}
              resizeMode="contain"
            />
            <Text 
              style={styles.firstTimeText}
              numberOfLines={3}
            >
              ¡Comencémos creando tu primera tarea!
            </Text>
            <Animated.View
              style={[
                styles.firstTimePulseRing,
                {
                  transform: [{ scale: pulseAnimFirstTime }],
                  opacity: pulseAnimFirstTime.interpolate({
                    inputRange: [1, 1.15],
                    outputRange: [0.3, 0.1],
                  }),
                },
              ]}
            />
          </View>
        </Animated_Reanimated.View>
      )}

      {/* Create Routine Modal */}
      <CreateRoutineModal
        visible={showCreateRoutineModal}
        onClose={() => {
          setShowCreateRoutineModal(false);
          setIsFABOpen(false);
        }}
        onCreateRoutine={handleCreateRoutine}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  blurOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 5,
  },
  blurPressable: {
    ...StyleSheet.absoluteFillObject,
  },
  fixedHeader: {
    backgroundColor: colors.background,
    zIndex: 1,
  },
  progressWrapper: {
    paddingHorizontal: 20,
    marginBottom: 0,
  },
  pagerView: {
    flex: 1,
  },
  page: {
    flex: 1,
  },
  tabBar: {
    position: 'absolute',
    bottom: 10,
    left: 0,
    right: 0,
    height: 110,
    backgroundColor: colors.glass,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingBottom: 50,
    paddingTop: 10,
    paddingHorizontal: 8,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  tabItemActive: {
    // Puedes agregar estilos adicionales para el tab activo
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 4,
    color: colors.textSecondary,
  },
  tabLabelActive: {
    color: colors.textPrimary,
  },
  centralButtonContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    zIndex: 10000,
  },
  centralButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 6,
  },
  firstTimeOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: 140,
    zIndex: 9999,
  } as any,
  firstTimeContent: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginBottom: 20,
    maxWidth: 280,
    paddingHorizontal: 20,
  } as any,
  firstTimeImage: {
    width: 220,
    height: 220,
    marginBottom: 20,
  } as any,
  firstTimeText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 24,
    letterSpacing: 0.3,
    lineHeight: 28,
  } as any,
  firstTimePulseRing: {
    position: 'absolute',
    width: 90,
    height: 90,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: colors.success,
    top: '40%',
    left: '50%',
    marginTop: 211,
    marginLeft: -26,
  } as any,
});
