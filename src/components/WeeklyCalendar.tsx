import { colors } from '@/constants/theme';
import { addDays, format, isToday, isSameDay, subDays } from 'date-fns';
import { es } from 'date-fns/locale';
import React, { useEffect, useRef, useState } from 'react';
import { Dimensions, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

const SCREEN_WIDTH = Dimensions.get('window').width;
const DAY_WIDTH = 64; // minWidth + gap

// Map of day abbreviations to day of week numbers (0 = Sunday, 1 = Monday, etc.)
const DAY_ABBREV_TO_NUMBER: Record<string, number> = {
  'Dom': 0,
  'Lun': 1,
  'Mar': 2,
  'Mié': 3,
  'Jue': 4,
  'Vie': 5,
  'Sáb': 6,
};

interface ScheduledRoutine {
  id: string;
  name: string;
  days: string[]; // ['Lun', 'Mar', 'Mié', etc.]
}

interface WeeklyCalendarProps {
  onDateSelect?: (date: Date) => void;
  completedTasksHistory?: Record<string, { tasks: number; routines: number }>;
  scheduledRoutines?: ScheduledRoutine[];
  scheduledTasksHistory?: Record<string, { tasks: number; routines: number }>; // Tareas programadas pero no completadas
}

export function WeeklyCalendar({ 
  onDateSelect, 
  completedTasksHistory = {},
  scheduledRoutines = [],
  scheduledTasksHistory = {},
}: WeeklyCalendarProps) {
  const today = new Date();
  const [selectedDate, setSelectedDate] = useState<Date>(today);
  const scrollViewRef = useRef<ScrollView>(null);
  
  // Generate 15 days back and 30 days forward from today (total 46 days)
  const startDate = subDays(today, 15);
  const allDays = Array.from({ length: 46 }, (_, i) => addDays(startDate, i));

  // Find index of today
  const todayIndex = allDays.findIndex(day => isToday(day));

  useEffect(() => {
    // Center today's date on mount
    if (scrollViewRef.current && todayIndex >= 0) {
      const scrollToX = (todayIndex * DAY_WIDTH) - (SCREEN_WIDTH / 2) + (DAY_WIDTH / 2);
      setTimeout(() => {
        scrollViewRef.current?.scrollTo({ x: scrollToX, animated: false });
      }, 100);
    }
  }, []);

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
    onDateSelect?.(date);
  };

  return (
    <View style={styles.container}>
      {/* Header - Day and Date */}
      <View style={styles.header}>
        <View style={styles.dayNameContainer}>
          <Text style={styles.dayName}>{format(selectedDate, 'EEE', { locale: es })}</Text>
          <View style={styles.redDot} />
        </View>
        <Text style={styles.fullDate}>{format(selectedDate, 'MMMM d', { locale: es })}</Text>
        <Text style={styles.year}>{format(selectedDate, 'yyyy')}</Text>
      </View>

      {/* Scrollable Week Days Row */}
      <ScrollView 
        ref={scrollViewRef}
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.weekScrollContent}
        style={styles.weekScroll}
      >
        {allDays.map((day, index) => {
          const isCurrentDay = isToday(day);
          const isSelected = isSameDay(day, selectedDate);
          const dateKey = format(day, 'yyyy-MM-dd');
          const dayActivity = completedTasksHistory[dateKey];
          const scheduledActivity = scheduledTasksHistory[dateKey];
          
          const totalCompleted = dayActivity ? (dayActivity.tasks + dayActivity.routines) : 0;
          const totalScheduled = scheduledActivity ? (scheduledActivity.tasks + scheduledActivity.routines) : 0;
          
          const hasCompletedTasks = totalCompleted > 0;
          const hasScheduledTasks = totalScheduled > 0;
          const hasExcess = totalCompleted > 3;
          
          // Build dots array for completed tasks (max 3 visible)
          const completedDots: ('routine' | 'task')[] = [];
          if (dayActivity) {
            // Add routines first (priority)
            for (let i = 0; i < Math.min(dayActivity.routines, 3); i++) {
              completedDots.push('routine');
            }
            // Fill remaining with tasks
            const remainingSlots = 3 - completedDots.length;
            for (let i = 0; i < Math.min(dayActivity.tasks, remainingSlots); i++) {
              completedDots.push('task');
            }
          }
          
          // Build dots for scheduled tasks (outline only)
          const scheduledDots: ('routine' | 'task')[] = [];
          if (scheduledActivity && !hasCompletedTasks) {
            // Solo mostrar scheduled si no hay tareas completadas
            for (let i = 0; i < Math.min(scheduledActivity.routines, 3); i++) {
              scheduledDots.push('routine');
            }
            const remainingSlots = 3 - scheduledDots.length;
            for (let i = 0; i < Math.min(scheduledActivity.tasks, remainingSlots); i++) {
              scheduledDots.push('task');
            }
          }

          return (
            <Pressable 
              key={index} 
              style={styles.dayContainer}
              onPress={() => handleDateSelect(day)}
            >
              <View style={[
                styles.dayNumberContainer
              ]}>
                <Text style={[
                  styles.dayNumber,
                  isSelected && styles.dayNumberSelected,
                  isCurrentDay && styles.dayNumberToday
                ]}>
                  {format(day, 'd')}
                </Text>
              </View>
              <Text style={[
                styles.dayLabel,
                isSelected && styles.dayLabelSelected,
                isCurrentDay && styles.dayLabelToday
              ]}>
                {format(day, 'EEE', { locale: es }).toUpperCase().slice(0, 3)}
              </Text>
              
              {/* Activity Indicators Row - Always rendered for consistent height */}
              <View style={styles.activityRow}>
                {hasCompletedTasks ? (
                  // Mostrar puntos llenos para tareas completadas
                  <>
                    {completedDots.map((type, dotIndex) => (
                      <View 
                        key={dotIndex}
                        style={[
                          styles.activityDot,
                          type === 'routine' && styles.activityDotRoutine
                        ]} 
                      />
                    ))}
                    {hasExcess && (
                      <Text style={styles.excessIndicator}>+</Text>
                    )}
                  </>
                ) : hasScheduledTasks ? (
                  // Mostrar puntos outline para tareas programadas sin completar
                  <>
                    {scheduledDots.map((type, dotIndex) => (
                      <View 
                        key={`scheduled-${dotIndex}`}
                        style={[
                          styles.activityDotScheduled,
                          type === 'routine' && styles.activityDotScheduledRoutine
                        ]} 
                      />
                    ))}
                    {totalScheduled > 3 && (
                      <Text style={styles.excessIndicator}>+</Text>
                    )}
                  </>
                ) : (
                  <View style={styles.activityDotPlaceholder} />
                )}
              </View>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background,
    paddingTop: 20,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 8,
  },
  dayNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dayName: {
    fontSize: 48,
    fontWeight: '900',
    color: colors.primary,
    letterSpacing: -1,
  },
  redDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
  },
  fullDate: {
    fontSize: 14,
    fontWeight: '400',
    color: colors.textSecondary,
    marginLeft: 'auto',
  },
  year: {
    fontSize: 14,
    fontWeight: '400',
    color: colors.textSecondary,
  },
  weekScroll: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.15)',
    paddingTop: 12,
  },
  weekScrollContent: {
    paddingHorizontal: 20,
    gap: 24,
  },
  dayContainer: {
    alignItems: 'center',
    gap: 6,
    width: 40,
  },
  dayNumberContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },

  dayNumber: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  dayNumberSelected: {
    fontSize: 20,
    fontWeight: '900',
    color: colors.primary,
  },
  dayLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
    letterSpacing: 0.5,
  },
  dayLabelSelected: {
    color: colors.primary,
    fontWeight: '700',
  },
  activityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    height: 12,
    marginTop: 4,
  },
  activityDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: colors.primary,
    opacity: 0.7,
  },
  activityDotRoutine: {
    backgroundColor: '#FAB387',
  },
  activityDotScheduled: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.primary,
  },
  activityDotScheduledRoutine: {
    borderColor: '#FAB387',
  },
  activityDotPlaceholder: {
    height: 5,
    opacity: 0,
  },
  excessIndicator: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textSecondary,
    marginLeft: 1,
    top: -2,
  },
  dayNumberToday: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  dayLabelToday: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
});
