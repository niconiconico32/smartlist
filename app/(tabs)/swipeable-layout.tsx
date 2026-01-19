import { colors } from '@/constants/theme';
import { CreateRoutineModal } from '@/src/components/CreateRoutineModal';
import { FocusHeroCard } from '@/src/components/FocusHeroCard';
import { LiquidFAB } from '@/src/components/LiquidFAB';
import { WeeklyCalendar } from '@/src/components/WeeklyCalendar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { CalendarCheck, Grid2x2 } from 'lucide-react-native';
import React, { createRef, useRef, useState } from 'react';
import { Alert, Animated, Dimensions, Image, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import PagerView from 'react-native-pager-view';
import Animated_Reanimated, { FadeIn } from 'react-native-reanimated';
import IndexScreen from './index';
import TwoScreen from './two';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Ref para llamar función del IndexScreen
export const addTaskRef = createRef<{ 
  openTaskModal: (showSchedule?: boolean) => void;
  openProgramScheduleModal: () => void;
}>();

export default function SwipeableLayout() {
  const pagerRef = useRef<PagerView>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [isFABOpen, setIsFABOpen] = useState(false);
  const [isFirstTime, setIsFirstTime] = useState(true);
  const [showCreateRoutineModal, setShowCreateRoutineModal] = useState(false);
  const pulseAnimFirstTime = useRef(new Animated.Value(1)).current;
  const router = useRouter();

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
      const routines = existingRoutines ? JSON.parse(existingRoutines) : [];
      
      const newRoutine = {
        id: Date.now().toString(),
        ...routine,
        createdAt: new Date().toISOString(),
      };
      
      routines.push(newRoutine);
      await AsyncStorage.setItem('@smartlist_routines', JSON.stringify(routines));
      
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
        <WeeklyCalendar />
        <View style={styles.progressWrapper}>
          <FocusHeroCard 
            completedToday={0}
            totalToday={0}
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
          <IndexScreen ref={addTaskRef} setIsFirstTime={setIsFirstTime} pulseAnim={pulseAnimFirstTime} isFirstTime={isFirstTime} />
        </View>
        <View key="2" style={styles.page}>
          <TwoScreen />
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
              source={require('@/assets/images/amico.png')}
              style={styles.firstTimeImage}
              resizeMode="contain"
            />
            <Text 
              style={styles.firstTimeText}
              numberOfLines={3}
            >
              Comencémos creando tu primera tarea!
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
