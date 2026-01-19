import { colors } from '@/constants/theme';
import * as Haptics from 'expo-haptics';
import { Check, ChevronDown, Plus, Sun } from 'lucide-react-native';
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  Layout,
  useAnimatedStyle,
  useSharedValue,
  withSpring
} from 'react-native-reanimated';

// --- TIPOS DE DATOS ---
type TaskItem = {
  id: string;
  label: string;
  completed: boolean;
};

type RoutineAccordionProps = {
  title: string;
  subtitle?: string;
  icon?: React.ElementType;
  color?: string;
  tasks: TaskItem[];
  onTaskToggle?: (id: string, completed: boolean) => void;
};

export function RoutineAccordion({
  title = "Rutina de Mañana",
  subtitle,
  icon: Icon = Sun,
  color = "#FAB387",
  tasks: initialTasks,
  onTaskToggle,
}: RoutineAccordionProps) {

  const [isExpanded, setIsExpanded] = useState(false);
  const [tasks, setTasks] = useState(initialTasks);

  // Cálculo de progreso
  const completedCount = tasks.filter(t => t.completed).length;
  const progressPercent = tasks.length > 0 ? (completedCount / tasks.length) * 100 : 0;

  // Animación de rotación para la flecha/botón
  const rotation = useSharedValue(0);

  const toggleExpand = () => {
    try {
      Haptics.selectionAsync();
    } catch (e) {}
    const target = !isExpanded;
    setIsExpanded(target);
    rotation.value = withSpring(target ? 180 : 0, {
      damping: 8,
      mass: 0.8,
      overshootClamping: true,
    });
  };

  const toggleTask = (id: string) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (e) {}
    setTasks(prev => prev.map(t =>
      t.id === id ? { ...t, completed: !t.completed } : t
    ));
    const task = tasks.find(t => t.id === id);
    if (task && onTaskToggle) {
      onTaskToggle(id, !task.completed);
    }
  };

  const arrowStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  return (
    <Animated.View
      layout={Layout.springify().damping(20).mass(0.8)}
      style={styles.container}
    >
      {/* === HEADER (SIEMPRE VISIBLE) === */}
      <Pressable
        onPress={toggleExpand}
        style={styles.header}
      >
        <View style={styles.headerTop}>

          {/* Lado Izquierdo: Icono + Textos */}
          <View style={styles.leftSection}>
            {/* Icon Box con color dinámico suave */}
            <View
              style={[styles.iconBox, { backgroundColor: `${color}20` }]}
            >
              <Icon size={24} color={color} />
            </View>

            <View style={styles.textContainer}>
              <Text style={styles.title}>
                {title}
              </Text>
              <Text style={styles.subtitle}>
                {completedCount} de {tasks.length} completadas
              </Text>
            </View>
          </View>

          {/* Botón de expansión (Animado) */}
          <Animated.View style={arrowStyle}>
            <View style={styles.expandButton}>
              {isExpanded ? (
                <ChevronDown size={20} color={colors.textSecondary} />
              ) : (
                <Plus size={20} color={color} />
              )}
            </View>
          </Animated.View>
        </View>

        {/* Barra de Progreso */}
        <View style={styles.progressBarContainer}>
          <Animated.View
            style={[
              styles.progressBarFill,
              {
                width: `${progressPercent}%`,
                backgroundColor: color
              }
            ]}
          />
        </View>
      </Pressable>

      {/* === BODY (LISTA DESPLEGABLE) === */}
      {isExpanded && (
        <View style={styles.body}>
          <View style={styles.separator} />

          {tasks.map((task, index) => (
            <Animated.View
              key={task.id}
              entering={FadeIn.delay(index * 50).duration(200)}
              exiting={FadeOut.duration(100)}
            >
              <TouchableOpacity
                onPress={() => toggleTask(task.id)}
                style={styles.taskRow}
                activeOpacity={0.7}
              >
                {/* Checkbox Customizado */}
                <View
                  style={[
                    styles.checkbox,
                    task.completed
                      ? { backgroundColor: color, borderColor: 'transparent' }
                      : { backgroundColor: 'transparent', borderColor: `${colors.textSecondary}50` }
                  ]}
                >
                  {task.completed && <Check size={14} color={colors.background} strokeWidth={4} />}
                </View>

                {/* Texto de la tarea */}
                <Text style={[
                  styles.taskLabel,
                  task.completed && styles.taskLabelCompleted
                ]}>
                  {task.label}
                </Text>
              </TouchableOpacity>
            </Animated.View>
          ))}
        </View>
      )}
    </Animated.View>
  );
}

// Componente HabitTracker que usa RoutineAccordion
interface HabitTrackerProps {
  // Props para futuras extensiones
}

export function HabitTracker({}: HabitTrackerProps) {
  const MORNING_TASKS = [
    { id: '1', label: 'Beber un vaso de agua', completed: true },
    { id: '2', label: 'Hacer la cama', completed: false },
    { id: '3', label: 'Tomar medicación', completed: false },
    { id: '4', label: '10 min de estiramiento', completed: false },
  ];

  return (
    <View style={styles.habitTrackerContainer}>
      <RoutineAccordion
        title="Rutina de Mañana"
        subtitle="Energía para empezar"
        icon={Sun}
        color="#FAB387"
        tasks={MORNING_TASKS}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(203, 166, 247, 0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  header: {
    padding: 20,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.3,
    marginBottom: 4,
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '500',
  },
  expandButton: {
    backgroundColor: 'rgba(203, 166, 247, 0.1)',
    padding: 10,
    borderRadius: 20,
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: colors.surface,
    borderRadius: 4,
    overflow: 'hidden',
    width: '100%',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  body: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    paddingTop: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
  },
  separator: {
    height: 1,
    backgroundColor: 'rgba(203, 166, 247, 0.1)',
    marginBottom: 16,
    width: '100%',
  },
  taskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  taskLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.textPrimary,
    flex: 1,
  },
  taskLabelCompleted: {
    color: colors.textTertiary,
    textDecorationLine: 'line-through',
  },
  habitTrackerContainer: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
    backgroundColor: colors.background,
  },
});
