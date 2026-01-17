import { colors } from '@/constants/theme';
import { addDays, format, isToday, startOfWeek, subDays } from 'date-fns';
import { es } from 'date-fns/locale';
import React, { useEffect, useRef } from 'react';
import { Dimensions, ScrollView, StyleSheet, Text, View } from 'react-native';

const SCREEN_WIDTH = Dimensions.get('window').width;
const DAY_WIDTH = 64; // minWidth + gap

export function WeeklyCalendar() {
  const today = new Date();
  const weekStart = startOfWeek(today, { weekStartsOn: 1, locale: es });
  const scrollViewRef = useRef<ScrollView>(null);
  
  // Generate 4 weeks (2 before, current week, 1 after)
  const startDate = subDays(weekStart, 14); // 2 weeks before
  const allDays = Array.from({ length: 28 }, (_, i) => addDays(startDate, i));

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

  return (
    <View style={styles.container}>
      {/* Header - Day and Date */}
      <View style={styles.header}>
        <View style={styles.dayNameContainer}>
          <Text style={styles.dayName}>{format(today, 'EEE', { locale: es })}</Text>
          <View style={styles.redDot} />
        </View>
        <Text style={styles.fullDate}>{format(today, 'MMMM d', { locale: es })}</Text>
        <Text style={styles.year}>{format(today, 'yyyy')}</Text>
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

          return (
            <View key={index} style={styles.dayContainer}>
              <Text style={[
                styles.dayNumber,
                isCurrentDay && styles.dayNumberActive
              ]}>
                {format(day, 'd')}
              </Text>
              <Text style={[
                styles.dayLabel,
                isCurrentDay && styles.dayLabelActive
              ]}>
                {format(day, 'EEE', { locale: es }).toUpperCase().slice(0, 3)}
              </Text>
            </View>
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
  dayNumber: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  dayNumberActive: {
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
  dayLabelActive: {
    color: colors.primary,
  },
});
