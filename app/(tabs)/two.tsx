import { colors } from "@/constants/theme";
import { EditRoutineModal } from "@/src/components/EditRoutineModal";
import { RoutineCard } from "@/src/components/RoutineCard";
import { RoutineDetailModal } from "@/src/components/RoutineDetailModal";
import {
    cancelRoutineReminders,
    requestNotificationPermissions,
    rescheduleAllReminders,
    scheduleRoutineReminders,
} from "@/src/lib/notificationService";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import { useFocusEffect } from "expo-router";
import { Sparkles } from "lucide-react-native";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
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

interface Routine {
  id: string;
  name: string;
  days: string[];
  tasks: Array<{ id: string; title: string; completed?: boolean }>;
  reminderEnabled: boolean;
  reminderTime?: string;
}

// Rutinas de ejemplo hardcodeadas
const DEFAULT_ROUTINES: Routine[] = [
  {
    id: "default-morning",
    name: "Rutina Matutina",
    days: ["Lun", "Mar", "Mié", "Jue", "Vie"],
    tasks: [
      { id: "m1", title: "Beber un vaso de agua", completed: false },
      { id: "m2", title: "Hacer la cama", completed: false },
      { id: "m3", title: "10 min de estiramiento", completed: false },
      { id: "m4", title: "Desayunar saludable", completed: false },
      { id: "m5", title: "Revisar agenda del día", completed: false },
    ],
    reminderEnabled: true,
    reminderTime: "07:00",
  },
  {
    id: "default-night",
    name: "Rutina Nocturna",
    days: ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"],
    tasks: [
      { id: "n1", title: "Preparar ropa de mañana", completed: false },
      { id: "n2", title: "Lavarse los dientes", completed: false },
      { id: "n3", title: "Leer 15 minutos", completed: false },
      { id: "n4", title: "Apagar pantallas", completed: false },
    ],
    reminderEnabled: true,
    reminderTime: "22:00",
  },
];

export default function RoutinesScreen({ selectedDate, onRoutineCompleted }: RoutinesScreenProps) {
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [editingRoutine, setEditingRoutine] = useState<Routine | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedRoutine, setSelectedRoutine] = useState<Routine | null>(null);
  const [selectedRoutineIndex, setSelectedRoutineIndex] = useState(0);

  // Get current day abbreviation from selected date
  const currentDayAbbrev = useMemo(() => {
    const date = selectedDate || new Date();
    const abbrev = DAY_NUMBER_TO_ABBREV[date.getDay()];
    console.log('Selected date:', date, 'Day abbrev:', abbrev);
    return abbrev;
  }, [selectedDate]);

  // Filter routines for the selected day
  const filteredRoutines = useMemo(() => {
    console.log('All routines:', routines.map(r => ({ name: r.name, days: r.days })));
    console.log('Current day abbrev:', currentDayAbbrev);
    const filtered = routines.filter(routine => 
      routine.days.includes(currentDayAbbrev)
    );
    console.log('Filtered routines:', filtered.map(r => r.name));
    return filtered;
  }, [routines, currentDayAbbrev]);

  // Solicitar permisos de notificación al montar
  useEffect(() => {
    requestNotificationPermissions();
  }, []);

  // Cargar rutinas cuando la pantalla se enfoca
  useFocusEffect(
    useCallback(() => {
      loadRoutines();
    }, []),
  );

  const loadRoutines = async () => {
    try {
      const stored = await AsyncStorage.getItem("@smartlist_routines");
      const lastResetDate = await AsyncStorage.getItem("@smartlist_routines_last_reset");
      const today = new Date().toISOString().split("T")[0];
      
      if (stored) {
        let parsedRoutines = JSON.parse(stored);
        
        // Si hay rutinas guardadas (y no está vacío)
        if (parsedRoutines && parsedRoutines.length > 0) {
          // Verificar si necesitamos resetear las tareas (nuevo día)
          if (lastResetDate !== today) {
            // Resetear todas las tareas completadas
            parsedRoutines = parsedRoutines.map((routine: any) => ({
              ...routine,
              tasks: routine.tasks?.map((task: any) => ({
                ...task,
                completed: false,
              })) || [],
            }));
            
            // Guardar rutinas reseteadas y fecha
            await AsyncStorage.setItem(
              "@smartlist_routines",
              JSON.stringify(parsedRoutines),
            );
            await AsyncStorage.setItem("@smartlist_routines_last_reset", today);
            console.log("Rutinas reseteadas para nuevo día:", today);
          }
          
          setRoutines(parsedRoutines);
          return;
        }
      }
      // Si no hay rutinas guardadas o está vacío, usar las de ejemplo
      setRoutines(DEFAULT_ROUTINES);
      // Guardarlas para que persistan
      await AsyncStorage.setItem(
        "@smartlist_routines",
        JSON.stringify(DEFAULT_ROUTINES),
      );
      await AsyncStorage.setItem("@smartlist_routines_last_reset", today);
      // Programar notificaciones para las rutinas de ejemplo
      await rescheduleAllReminders(DEFAULT_ROUTINES);
    } catch (error) {
      console.error("Error al cargar rutinas:", error);
      // En caso de error, mostrar las de ejemplo
      setRoutines(DEFAULT_ROUTINES);
    }
  };

  // Función para resetear a rutinas de ejemplo (útil para debug)
  const resetToDefaultRoutines = async () => {
    await AsyncStorage.setItem(
      "@smartlist_routines",
      JSON.stringify(DEFAULT_ROUTINES),
    );
    setRoutines(DEFAULT_ROUTINES);
  };

  const handleDeleteRoutine = async (id: string) => {
    try {
      // Cancelar las notificaciones de esta rutina
      await cancelRoutineReminders(id);

      const updatedRoutines = routines.filter((r) => r.id !== id);
      await AsyncStorage.setItem(
        "@smartlist_routines",
        JSON.stringify(updatedRoutines),
      );
      setRoutines(updatedRoutines);
    } catch (error) {
      console.error("Error al eliminar rutina:", error);
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
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) {}

    try {
      const updatedRoutines = routines.map((r) =>
        r.id === updatedRoutine.id ? updatedRoutine : r,
      );
      await AsyncStorage.setItem(
        "@smartlist_routines",
        JSON.stringify(updatedRoutines),
      );
      setRoutines(updatedRoutines);

      // Reprogramar notificaciones para esta rutina
      await scheduleRoutineReminders(updatedRoutine);

      setShowEditModal(false);
      setEditingRoutine(null);
    } catch (error) {
      console.error("Error al guardar rutina:", error);
    }
  };

  const handleTaskToggle = async (
    routineId: string,
    taskId: string,
    completed: boolean,
  ) => {
    try {
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
      await AsyncStorage.setItem(
        "@smartlist_routines",
        JSON.stringify(updatedRoutines),
      );
      setRoutines(updatedRoutines);
      
      // Check if ENTIRE routine is now complete - only then update streak
      if (completed && onRoutineCompleted) {
        const updatedRoutine = updatedRoutines.find(r => r.id === routineId);
        if (updatedRoutine) {
          const allTasksComplete = updatedRoutine.tasks.every(t => t.completed);
          if (allTasksComplete) {
            onRoutineCompleted();
          }
        }
      }
    } catch (error) {
      console.error("Error al actualizar tarea:", error);
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
              onPress={() => {
                setSelectedRoutine(routine);
                setSelectedRoutineIndex(index);
              }}
              onEdit={handleEditRoutine}
              onDelete={handleDeleteRoutine}
              onTaskToggle={handleTaskToggle}
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
