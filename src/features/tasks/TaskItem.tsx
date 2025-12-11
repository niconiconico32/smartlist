import { colors } from '@/constants/theme';
import { useSensory } from '@/src/hooks/useSensory';
import { CheckCircle, Circle, Trash2 } from 'lucide-react-native';
import React, { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
    interpolateColor,
    useAnimatedStyle,
    useSharedValue,
    withSpring,
    withTiming,
} from 'react-native-reanimated';

interface Task {
  id: string;
  title: string;
  completed: boolean;
}

interface TaskItemProps {
  task: Task;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function TaskItem({ task, onToggle, onDelete }: TaskItemProps) {
  const { successFeedback, softFeedback } = useSensory();
  
  // Animaciones
  const scale = useSharedValue(1);
  const completionProgress = useSharedValue(task.completed ? 1 : 0);

  // Actualizar progreso cuando cambie completed
  useEffect(() => {
    completionProgress.value = withTiming(task.completed ? 1 : 0, { duration: 300 });
    if (task.completed) {
      successFeedback();
    }
  }, [task.completed]);

  // Estilo animado del contenedor
  const animatedContainerStyle = useAnimatedStyle(() => {
    const backgroundColor = interpolateColor(
      completionProgress.value,
      [0, 1],
      [colors.surface, colors.surface]
    );

    const borderColor = interpolateColor(
      completionProgress.value,
      [0, 1],
      [colors.border, colors.success]
    );

    return {
      transform: [{ scale: scale.value }],
      backgroundColor,
      borderColor,
      borderWidth: 2,
      shadowColor: completionProgress.value === 1 ? colors.success : 'transparent',
      shadowOpacity: completionProgress.value * 0.6,
      shadowRadius: 12,
      elevation: completionProgress.value * 8,
    };
  });

  // Estilo animado del texto
  const animatedTextStyle = useAnimatedStyle(() => {
    const textColor = interpolateColor(
      completionProgress.value,
      [0, 1],
      [colors.textPrimary, colors.textSecondary]
    );

    return {
      color: textColor,
      opacity: 1 - completionProgress.value * 0.4,
    };
  });

  const handlePressIn = () => {
    scale.value = withSpring(0.95, {
      damping: 15,
      stiffness: 300,
    });
    softFeedback();
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, {
      damping: 10,
      stiffness: 200,
    });
  };

  const handleToggle = () => {
    onToggle(task.id);
  };

  return (
    <AnimatedPressable
      style={[styles.container, animatedContainerStyle]}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={handleToggle}
    >
      <View style={styles.content}>
        {task.completed ? (
          <CheckCircle size={24} color={colors.success} strokeWidth={2.5} />
        ) : (
          <Circle size={24} color={colors.textTertiary} strokeWidth={2} />
        )}
        
        <Animated.Text
          style={[
            styles.title,
            animatedTextStyle,
            task.completed && styles.titleCompleted,
          ]}
        >
          {task.title}
        </Animated.Text>
      </View>

      <Pressable
        onPress={() => onDelete(task.id)}
        hitSlop={8}
      >
        <Trash2 size={20} color={colors.danger} />
      </Pressable>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  content: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.textPrimary,
    flex: 1,
  },
  titleCompleted: {
    textDecorationLine: 'line-through',
  },
});