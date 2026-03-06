import { colors } from "@/constants/theme";
import { EditRoutineModal } from "@/src/components/EditRoutineModal";
import { RoutineCard } from "@/src/components/RoutineCard";
import { RoutineDetailModal } from "@/src/components/RoutineDetailModal";
import { useAuth } from "@/src/contexts/AuthContext";
import {
    cancelRoutineReminders,
    requestNotificationPermissions,
    rescheduleAllReminders,
    scheduleRoutineReminders,
} from "@/src/lib/notificationService";
import * as routineService from "@/src/lib/routineService";
import type { Routine } from "@/src/types/routine";
import * as Haptics from "expo-haptics";
import { useFocusEffect } from "expo-router";
import { Sparkles } from "lucide-react-native";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, View } from "react-native";
import Animated, {
    FadeIn,
    FadeInDown,
    FadeInUp,
} from "react-native-reanimated";

// Map day number to abbreviation
const DAY_NUMBER_TO_ABBREV: Record<number, string> = {
  0: 'Dom',
  1: 'Lun',
  2: 'Mar',
  3: 'Mié',
  4: 'Jue',
  5: 'Vie',
  6: 'Sáb',
};

interface RoutinesScreenProps {
  selectedDate?: Date;
  onRoutineCompleted?: () => void;
}

export default function RoutinesScreen({ selectedDate, onRoutineCompleted }: RoutinesScreenProps) {
  const { user, isLoading: authLoading } = useAuth();
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingRoutine, setEditingRoutine] = useState<Routine | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedRoutine, setSelectedRoutine] = useState<Routine | null>(null);
  const [selectedRoutineIndex, setSelectedRoutineIndex] = useState(0);

  // Get current day abbreviation from selected date
  const currentDayAbbrev = useMemo(() => {
    const date = selectedDate || new Date();
    return DAY_NUMBER_TO_ABBREV[date.getDay()];
  }, [selectedDate]);

  // Filter routines for the selected day
  const filteredRoutines = useMemo(() => {
    return routines.filter(routine => 
      routine.days.includes(currentDayAbbrev)
    );
  }, [routines, currentDayAbbrev]);

  // Solicitar permisos de notificación al montar
  useEffect(() => {
    requestNotificationPermissions();
  }, []);

  // Cargar rutinas cuando la pantalla se enfoca
  useFocusEffect(
    useCallback(() => {
      if (!authLoading && user) {
        loadRoutines();
      }
    }, [user, authLoading]),
  );

  const loadRoutines = async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);

      // Cargar rutinas desde Supabase
      let fetchedRoutines = await routineService.fetchRoutines(user.id);
      
      // Limpiar duplicados
      const uniqueNames = new Map<string, Routine>();
      const toDelete: string[] = [];
      
      const sorted = [...fetchedRoutines].sort((a, b) => {
        return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
      });
      
      for (const routine of sorted) {
        if (!uniqueNames.has(routine.name)) {
          uniqueNames.set(routine.name, routine);
        } else {
          toDelete.push(routine.id);
        }
      }
      
      if (toDelete.length > 0) {
        await Promise.all(toDelete.map(id => routineService.deleteRoutine(id, user.id)));
        fetchedRoutines = await routineService.fetchRoutines(user.id);
      }
      
      // Si no hay rutinas, crear una de prueba
      if (fetchedRoutines.length === 0) {
        await routineService.createRoutine(user.id, {
          name: "Rutina de Prueba",
          days: ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"],
          tasks: [
            { title: "Tarea 1", position: 0 },
            { title: "Tarea 2", position: 1 },
            { title: "Tarea 3", position: 2 },
          ],
          icon: "Star",
          reminderEnabled: false,
        });
        fetchedRoutines = await routineService.fetchRoutines(user.id);
      }
      
      setRoutines(fetchedRoutines);
      await rescheduleAllReminders(fetchedRoutines as any);
    } catch (error) {
      console.error("Error al cargar rutinas:", error);
      Alert.alert('Error', 'No se pudieron cargar las rutinas. Intenta de nuevo.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteRoutine = async (id: string) => {
    if (!user) return;

    try {
      // Cancelar las notificaciones de esta rutina
      await cancelRoutineReminders(id);

      // Borrar de Supabase
      const success = await routineService.deleteRoutine(id, user.id);
      
      if (success) {
        setRoutines(routines.filter((r) => r.id !== id));
      } else {
        Alert.alert('Error', 'No se pudo eliminar la rutina');
      }
    } catch (error) {
      console.error("Error al eliminar rutina:", error);
      Alert.alert('Error', 'Ocurrió un error al eliminar la rutina');
    }
  };

  const handleEditRoutine = (id: string) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (e) {}

    const routineToEdit = routines.find((r) => r.id === id);
    if (routineToEdit) {
      setEditingRoutine(routineToEdit);
      setShowEditModal(true);
    }
  };

  const handleSaveEdit = async (updatedRoutine: Routine) => {
    if (!user) return;

    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) {}

    try {
      // Actualizar en Supabase
      const result = await routineService.updateRoutine(
        updatedRoutine.id,
        user.id,
        {
          name: updatedRoutine.name,
          days: updatedRoutine.days,
          tasks: updatedRoutine.tasks,
          icon: updatedRoutine.icon,
          reminderEnabled: updatedRoutine.reminderEnabled,
          reminderTime: updatedRoutine.reminderTime,
        }
      );

      if (result) {
        // Actualizar estado local
        setRoutines(routines.map((r) => (r.id === result.id ? result : r)));
        
        // Reprogramar notificaciones
        await scheduleRoutineReminders(result as any);

        setShowEditModal(false);
        setEditingRoutine(null);
      } else {
        Alert.alert('Error', 'No se pudo actualizar la rutina');
      }
    } catch (error) {
      console.error("Error al guardar rutina:", error);
      Alert.alert('Error', 'Ocurrió un error al guardar la rutina');
    }
  };

  const handleTaskToggle = async (
    routineId: string,
    taskId: string,
    completed: boolean,
  ) => {
    if (!user) return;

    try {
      // Actualizar en Supabase
      const success = await routineService.updateTaskCompletion(
        taskId,
        routineId,
        user.id,
        completed
      );

      if (!success) {
        Alert.alert('Error', 'No se pudo actualizar la tarea');
        return;
      }

      // Actualizar estado local
      const updatedRoutines = routines.map((r) => {
        if (r.id === routineId) {
          return {
            ...r,
            tasks: r.tasks.map((t) =>
              t.id === taskId ? { ...t, completed } : t,
            ),
          };
        }
        return r;
      });
      setRoutines(updatedRoutines);
      
      // Verificar si la rutina está completa
      const updatedRoutine = updatedRoutines.find(r => r.id === routineId);
      if (updatedRoutine) {
        const allTasksComplete = updatedRoutine.tasks.every(t => t.completed);
        
        if (allTasksComplete && completed) {
          // Marcar rutina como completa
          await routineService.markRoutineComplete(routineId, user.id);
          
          // Notificar al componente padre
          if (onRoutineCompleted) {
            onRoutineCompleted();
          }
        } else if (!allTasksComplete) {
          // Desmarcar si ya no está completa
          await routineService.unmarkRoutineComplete(routineId, user.id);
        }
      }
    } catch (error) {
      console.error("Error al actualizar tarea:", error);
      Alert.alert('Error', 'Ocurrió un error al actualizar la tarea');
    }
  };

  return (
    <View style={styles.container}>
      <Animated.View
        entering={FadeInDown.duration(400).springify()}
        style={styles.header}
      >
        <Text style={styles.title}>Rutinas</Text>
        <Text style={styles.subtitle}>
          {filteredRoutines.length > 0
            ? `${filteredRoutines.length} rutina${filteredRoutines.length > 1 ? "s" : ""} para ${currentDayAbbrev}`
            : routines.length > 0 
              ? `Sin rutinas para ${currentDayAbbrev}`
              : "Crea tu primera rutina"}
        </Text>
      </Animated.View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {filteredRoutines.length === 0 ? (
          <Animated.View
            entering={FadeIn.delay(200).duration(500)}
            style={styles.emptyState}
          >
            <Animated.View
              entering={FadeInUp.delay(300).springify()}
              style={styles.emptyIconContainer}
            >
              <Sparkles size={48} color={colors.primary} />
            </Animated.View>
            <Animated.Text
              entering={FadeInUp.delay(400).springify()}
              style={styles.emptyTitle}
            >
              {routines.length > 0 ? `Sin rutinas para ${currentDayAbbrev}` : "Sin rutinas aún"}
            </Animated.Text>
            <Animated.Text
              entering={FadeInUp.delay(500).springify()}
              style={styles.emptySubtitle}
            >
              {routines.length > 0 
                ? "Selecciona otro día o crea una nueva rutina para este día"
                : "Toca el botón + para crear tu primera rutina y organizar tus hábitos diarios"}
            </Animated.Text>
          </Animated.View>
        ) : (
          filteredRoutines.map((routine, index) => (
            <RoutineCard
              key={routine.id}
              id={routine.id}
              name={routine.name}
              days={routine.days}
              tasks={routine.tasks}
              reminderEnabled={routine.reminderEnabled}
              reminderTime={routine.reminderTime}
              colorIndex={index}
              icon={routine.icon}
              onPress={() => {
                setSelectedRoutine(routine);
                setSelectedRoutineIndex(index);
              }}
            />
          ))
        )}
      </ScrollView>

      {/* Modal de Edición */}
      <EditRoutineModal
        visible={showEditModal}
        routine={editingRoutine}
        onClose={() => {
          setShowEditModal(false);
          setEditingRoutine(null);
        }}
        onSave={handleSaveEdit}
      />

      {/* Modal de Detalle de Rutina */}
      <RoutineDetailModal
        visible={selectedRoutine !== null}
        routine={selectedRoutine}
        colorIndex={selectedRoutineIndex}
        onClose={() => setSelectedRoutine(null)}
        onTaskToggle={handleTaskToggle}
        onDelete={handleDeleteRoutine}
        onEdit={handleEditRoutine}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 20,
    backgroundColor: colors.background,
  },
  title: {
    fontSize: 28,
    fontWeight: "900",
    color: colors.textPrimary,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 4,
    fontWeight: "500",
  },
  scrollView: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 150,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "rgba(203, 166, 247, 0.1)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.textPrimary,
    marginBottom: 12,
  },
  emptySubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 22,
  },
});
