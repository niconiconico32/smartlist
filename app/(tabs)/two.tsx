import { colors, shadows } from '@/constants/theme';
import { FlowTaskCard } from '@/src/components/FlowTaskCard';
import { useSensory } from '@/src/hooks/useSensory';
import { loadDinnerTasks } from '@/src/lib/testHelpers';
import { useTaskStore } from '@/src/store/taskStore';
import * as Haptics from 'expo-haptics';
import React, { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeOut, Layout } from 'react-native-reanimated';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export default function TimerScreen() {
  const { 
    tasks, 
    activeTaskId,
    setActiveTask,
    toggleTask,
  } = useTaskStore();
  
  const { crispClick, successFeedback } = useSensory();

  // Cargar tareas al montar si no existen
  useEffect(() => {
    if (tasks.length === 0) {
      loadDinnerTasks();
    }
  }, []);

  // Establecer primera tarea como activa si no hay ninguna activa
  useEffect(() => {
    if (tasks.length > 0 && !activeTaskId) {
      const firstIncomplete = tasks.find(t => !t.completed);
      if (firstIncomplete) {
        setActiveTask(firstIncomplete.id);
      }
    }
  }, [tasks, activeTaskId]);

  const handleCompleteStep = async () => {
    if (!activeTaskId) return;

    // Vibración háptica
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    successFeedback();

    // Completar tarea actual
    toggleTask(activeTaskId);

    // Buscar siguiente tarea incompleta
    const currentIndex = tasks.findIndex(t => t.id === activeTaskId);
    const nextTask = tasks.slice(currentIndex + 1).find(t => !t.completed);

    if (nextTask) {
      setActiveTask(nextTask.id);
    } else {
      setActiveTask(null);
    }
  };

  const hasActiveTasks = tasks.some(t => !t.completed);
  const activeTask = tasks.find(t => t.id === activeTaskId);

  return (
    <View style={styles.container}>
      {!hasActiveTasks ? (
        // Estado completado: Botón de reinicio
        <AnimatedPressable
          entering={FadeIn.duration(400)}
          style={[styles.startButton, shadows.strongGlow]}
          onPress={() => {
            crispClick();
            loadDinnerTasks();
          }}
        >
          <Text style={styles.startEmoji}>✨</Text>
          <Text style={styles.startText}>¡COMPLETADO!</Text>
          <Text style={styles.subtitle}>Toca para nueva sesión</Text>
        </AnimatedPressable>
      ) : (
        <>
          {/* Lista de tareas con animaciones de layout */}
          <Animated.ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {tasks.map((task) => (
              <Animated.View
                key={task.id}
                layout={Layout.springify().damping(20).stiffness(200)}
              >
                <FlowTaskCard
                  task={task}
                  isActive={task.id === activeTaskId}
                  isCompleted={task.completed}
                />
              </Animated.View>
            ))}
          </Animated.ScrollView>

          {/* Botón fijo de completar */}
          {activeTask && (
            <Animated.View
              entering={FadeIn.duration(300)}
              exiting={FadeOut.duration(200)}
              style={styles.actionContainer}
            >
              <Pressable
                style={[styles.completeButton, shadows.neonPrimary]}
                onPress={handleCompleteStep}
              >
                <Text style={styles.completeButtonText}>
                  Completar: {activeTask.title.split(':')[0]}
                </Text>
              </Pressable>
            </Animated.View>
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F0F9F8',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingTop: 60,
    paddingBottom: 120,
  },
  startButton: {
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: colors.success,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    alignSelf: 'center',
    marginTop: '50%',
  },
  startEmoji: {
    fontSize: 64,
  },
  startText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#000',
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: 14,
    color: '#000',
    opacity: 0.7,
  },
  actionContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    paddingBottom: 40,
    backgroundColor: '#F0F9F8',
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  completeButton: {
    backgroundColor: colors.primary,
    paddingVertical: 18,
    paddingHorizontal: 32,
    borderRadius: 16,
    alignItems: 'center',
  },
  completeButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
    letterSpacing: 0.5,
  },
});
