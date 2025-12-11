import { colors } from '@/constants/theme';
import { CheckCircle, Circle, Clock } from 'lucide-react-native';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { TaskTimer } from './TaskTimer';

interface Task {
  id: string;
  title: string;
  completed: boolean;
  duration: number;
}

interface FlowTaskCardProps {
  task: Task;
  isActive: boolean;
  isCompleted: boolean;
}

export function FlowTaskCard({ task, isActive, isCompleted }: FlowTaskCardProps) {
  const animatedStyle = useAnimatedStyle(() => {
    const opacity = isCompleted ? 0.5 : isActive ? 1.0 : 0.3;
    const scale = isActive ? 1 : 0.98;
    
    return {
      opacity: withTiming(opacity, { duration: 300 }),
      transform: [{ scale: withTiming(scale, { duration: 300 }) }],
    };
  });

  const containerStyle = [
    styles.container,
    isActive && styles.containerActive,
  ];

  return (
    <Animated.View style={[containerStyle, animatedStyle]}>
      <View style={styles.header}>
        <View style={styles.iconContainer}>
          {isCompleted ? (
            <CheckCircle size={28} color={colors.success} strokeWidth={2.5} />
          ) : (
            <Circle size={28} color={isActive ? colors.background : colors.textTertiary} strokeWidth={2} />
          )}
        </View>
        
        <Text style={[
          styles.title,
          isCompleted && styles.titleCompleted,
          isActive && styles.titleActive,
        ]}>
          {task.title}
        </Text>
      </View>

      <View style={styles.footer}>
        {isActive ? (
          <TaskTimer isRunning={true} initialMinutes={task.duration} />
        ) : (
          <View style={styles.durationContainer}>
            <Clock size={16} color={colors.textTertiary} />
            <Text style={styles.duration}>{task.duration} min</Text>
          </View>
        )}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    padding: 24,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(168, 230, 207, 0.15)',
  },
  containerActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 6,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 16,
  },
  iconContainer: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  title: {
    flex: 1,
    fontSize: 20,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  titleActive: {
    fontSize: 22,
    fontWeight: '600',
    color: colors.background,
  },color: colors.textPrimary,
  },
  titleCompleted: {
    textDecorationLine: 'line-through',
    color: colors.textTertiary,
  },
  footer: {
    paddingLeft: 48,
  },
  durationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  duration: {
    fontSize: 14,
    color: colors.textTertiary,
    fontWeight: '500',
  },
});
