import { colors } from '@/constants/theme';
import React, { useEffect, useState } from 'react';
import { StyleSheet, Text } from 'react-native';

interface TaskTimerProps {
  isRunning: boolean;
  initialMinutes: number;
}

export function TaskTimer({ isRunning, initialMinutes }: TaskTimerProps) {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    if (!isRunning) return;

    const interval = setInterval(() => {
      setSeconds((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [isRunning]);

  useEffect(() => {
    // Reset cuando cambia la tarea
    setSeconds(0);
  }, [initialMinutes]);

  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Text style={styles.timer}>
      {formatTime(seconds)} / {initialMinutes}min
    </Text>
  );
}

const styles = StyleSheet.create({
  timer: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.background,
    fontVariant: ['tabular-nums'],
    letterSpacing: 1,
  },
});
