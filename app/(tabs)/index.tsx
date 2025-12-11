import { colors } from '@/constants/theme';
import { ActivityButton } from '@/src/components/ActivityButton';
import { NotificationCard } from '@/src/components/NotificationCard';
import { WeeklyCalendar } from '@/src/components/WeeklyCalendar';
import { useBottomTabInset } from '@/src/hooks/useBottomTabInset';
import React, { useState } from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';

interface Activity {
  id: string;
  title: string;
  emoji: string;
  metric: string;
  color: string;
  action: 'add' | 'play';
  completed: boolean;
}

export default function PlanScreen() {
  const bottomInset = useBottomTabInset();
  
  const [activities, setActivities] = useState<Activity[]>([
    {
      id: 'running',
      title: 'Running',
      emoji: '👟',
      metric: '5 mi',
      color: '#A8E6CF',
      action: 'add',
      completed: false,
    },
    {
      id: 'reading',
      title: 'Reading',
      emoji: '📚',
      metric: '41m 13s',
      color: '#FF8B94',
      action: 'play',
      completed: false,
    },
  ]);

  const toggleActivityStatus = (id: string) => {
    setActivities(prevActivities =>
      prevActivities.map(activity =>
        activity.id === id
          ? { ...activity, completed: !activity.completed }
          : activity
      )
    );
  };

  const pendingActivities = activities.filter(a => !a.completed);
  const completedActivities = activities.filter(a => a.completed);
  const totalCompleted = completedActivities.length;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView 
        style={styles.container}
        contentContainerStyle={[styles.contentContainer, { paddingBottom: bottomInset }]}
        showsVerticalScrollIndicator={false}
      >
        <WeeklyCalendar />

        <View style={styles.notificationWrapper}>
          <NotificationCard 
            tasksCompleted={{
              day: totalCompleted,
              week: totalCompleted + 6,
              month: totalCompleted + 22,
            }}
          />
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Por Hacer</Text>
        </View>

        <View style={styles.activitiesContainer}>
          {pendingActivities.length === 0 ? (
            <Text style={styles.emptyPlaceholder}>
              No tienes tareas para hoy. Agrega una pinchando +
            </Text>
          ) : (
            pendingActivities.map(activity => (
              <ActivityButton
                key={activity.id}
                title={activity.title}
                emoji={activity.emoji}
                metric={activity.metric}
                color={activity.color}
                action={activity.action}
                completed={false}
                onPress={() => toggleActivityStatus(activity.id)}
              />
            ))
          )}
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Completadas</Text>
        </View>

        <View style={styles.activitiesContainer}>
          {completedActivities.map(activity => (
            <ActivityButton
              key={activity.id}
              title={activity.title}
              emoji={activity.emoji}
              metric={activity.metric}
              color={activity.color}
              action={activity.action}
              completed={true}
              onPress={() => toggleActivityStatus(activity.id)}
            />
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F0F9F8',
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    // paddingBottom será aplicado dinámicamente con bottomInset
  },
  notificationWrapper: {
    paddingHorizontal: 20,
    marginTop: 16,
    marginBottom: 24,
  },
  planHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  planTitle: {
    fontSize: 36,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  sectionHeader: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1C2120',
    letterSpacing: 0.5,
  },
  activitiesContainer: {
    paddingHorizontal: 20,
  },
  emptyPlaceholder: {
    fontSize: 16,
    color: '#1C2120',
    opacity: 0.3,
    textAlign: 'center',
    paddingVertical: 32,
  },
});