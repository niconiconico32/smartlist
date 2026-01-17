import { colors } from '@/constants/theme';
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';

type TimePeriod = 'day' | 'week' | 'month';

interface NotificationCardProps {
  tasksCompleted?: {
    day: number;
    week: number;
    month: number;
  };
}

export function NotificationCard({ tasksCompleted = { day: 2, week: 8, month: 24 } }: NotificationCardProps) {
  const [period, setPeriod] = useState<TimePeriod>('day');

  const periodLabels = {
    day: 'hoy',
    week: 'esta semana',
    month: 'este mes',
  };

  const nextPeriod: Record<TimePeriod, TimePeriod> = {
    day: 'week',
    week: 'month',
    month: 'day',
  };

  const handlePress = () => {
    setPeriod(nextPeriod[period]);
  };

  return (
    <Pressable onPress={handlePress} style={styles.container}>
      <Text style={styles.emoji}>🎉</Text>
      <Text style={styles.text}>
        {tasksCompleted[period]} tareas completadas {periodLabels[period]}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: 24,
    padding: 20,
    gap: 12,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 4,
  },
  emoji: {
    fontSize: 28,
  },
  text: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
});
