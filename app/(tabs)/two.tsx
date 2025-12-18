import { HabitTracker } from '@/src/components/HabitTracker';
import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

export default function RoutinesScreen() {
  // Datos de ejemplo para los hábitos
  const habits = [
    {
      title: 'Workout',
      subtitle: 'Entrenar 30 minutos',
      streak: 12,
      weeklyProgress: [true, true, false, true, true, true, true],
    },
    {
      title: 'Leer',
      subtitle: '20 páginas diarias',
      streak: 7,
      weeklyProgress: [true, true, true, true, false, true, true],
    },
    {
      title: 'Meditar',
      subtitle: '10 min de mindfulness',
      streak: 5,
      weeklyProgress: [false, true, true, true, true, true, false],
    },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Rutinas</Text>
      </View>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {habits.map((habit, index) => (
          <HabitTracker
            key={index}
            title={habit.title}
            subtitle={habit.subtitle}
            streak={habit.streak}
            weeklyProgress={habit.weeklyProgress}
          />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 12,
    backgroundColor: '#F5F5F5',
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
    color: '#121212',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 130,
    gap: 16,
  },
});
