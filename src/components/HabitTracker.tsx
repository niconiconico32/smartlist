import { Feather } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface HabitTrackerProps {
  title: string;
  subtitle: string;
  streak: number;
  weeklyProgress: boolean[];
}

export function HabitTracker({ title, subtitle, streak, weeklyProgress }: HabitTrackerProps) {
  // Calcular porcentaje de cumplimiento
  const completedDays = weeklyProgress.filter(day => day).length;
  const percentage = Math.round((completedDays / weeklyProgress.length) * 100);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.textContainer}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
        </View>

        <View style={styles.badgesContainer}>
          {/* Streak Badge */}
          <View style={styles.streakBadge}>
            <Text style={styles.flameIcon}>🔥</Text>
            <Text style={styles.streakText}>{streak}</Text>
          </View>

          {/* Percentage Badge */}
          <View style={styles.percentageBadge}>
            <Feather name="trending-up" size={14} color="#4ADE80" />
            <Text style={styles.percentageText}>{percentage}%</Text>
          </View>
        </View>
      </View>

      {/* Weekly Progress Grid */}
      <View style={styles.grid}>
        {weeklyProgress.map((completed, index) => (
          <TouchableOpacity
            key={index}
            style={[
              styles.daySquare,
              completed ? styles.dayCompleted : styles.dayIncomplete
            ]}
            activeOpacity={0.7}
          >
            {completed && (
              <Feather name="check" size={16} color="#FFFFFF" />
            )}
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  textContainer: {
    flex: 1,
    marginRight: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#242424',
    marginBottom: 4,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 13,
    fontWeight: '400',
    color: '#9CA3AF',
  },
  badgesContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 165, 0, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 165, 0, 0.3)',
  },
  streakText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFA500',
  },
  flameIcon: {
    fontSize: 14,
  },
  percentageBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(74, 222, 128, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(74, 222, 128, 0.3)',
  },
  percentageText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#4ADE80',
  },
  grid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  daySquare: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayCompleted: {
    backgroundColor: '#7F00FF',
  },
  dayIncomplete: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#7F00FF',
    opacity: 0.3
  },
});
