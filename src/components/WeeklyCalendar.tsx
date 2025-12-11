import { addDays, format, isBefore, isToday, startOfDay, startOfWeek } from 'date-fns';
import { es } from 'date-fns/locale';
import { Calendar, Check, Paperclip, Settings } from 'lucide-react-native';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export function WeeklyCalendar() {
  const today = new Date();
  const weekStart = startOfWeek(today, { weekStartsOn: 1, locale: es });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  
  // Simular días completados (ayer tiene check)
  const completedDays = [format(addDays(today, -1), 'yyyy-MM-dd')];

  const isDayCompleted = (date: Date) => {
    return completedDays.includes(format(date, 'yyyy-MM-dd'));
  };

  return (
    <View style={styles.container}>
      {/* Header Row */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconButton}>
          <Paperclip size={24} color="#14b8a6" style={{ transform: [{ rotate: '45deg' }] }} />
        </TouchableOpacity>
        
        <View style={styles.centerDate}>
          <Text style={styles.dateText}>{format(today, 'd MMM', { locale: es })}</Text>
          <Calendar size={20} color="#14b8a6" style={styles.calendarIcon} />
        </View>
        
        <TouchableOpacity style={styles.iconButton}>
          <Settings size={24} color="#6b7280" />
        </TouchableOpacity>
      </View>

      {/* Week Days Row */}
      <View style={styles.weekRow}>
        {weekDays.map((day, index) => {
          const isCurrentDay = isToday(day);
          const isPast = isBefore(startOfDay(day), startOfDay(today));
          const isCompleted = isDayCompleted(day);

          return (
            <View key={index} style={styles.dayContainer}>
              <Text style={styles.dayLabel}>
                {format(day, 'EEE', { locale: es }).slice(0, 3)}
              </Text>
              
              {isCompleted && isPast ? (
                <View style={styles.checkContainer}>
                  <Check size={18} color="#14b8a6" strokeWidth={3} />
                </View>
              ) : (
                <View style={[
                  styles.dayNumber,
                  isCurrentDay && styles.dayNumberActive
                ]}>
                  <Text style={[
                    styles.dayNumberText,
                    isCurrentDay && styles.dayNumberTextActive
                  ]}>
                    {format(day, 'd')}
                  </Text>
                </View>
              )}
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#F0F9F8',
    paddingTop: 50,
    paddingBottom: 16,
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  iconButton: {
    padding: 8,
  },
  centerDate: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dateText: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
  },
  calendarIcon: {
    marginTop: 4,
  },
  weekRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  dayContainer: {
    alignItems: 'center',
    gap: 6,
  },
  dayLabel: {
    fontSize: 11,
    color: '#9ca3af',
    textTransform: 'lowercase',
    fontWeight: '500',
  },
  dayNumber: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayNumberActive: {
    backgroundColor: '#99f6e4',
    borderRadius: 12,
  },
  dayNumberText: {
    fontSize: 16,
    color: '#4b5563',
    fontWeight: '600',
  },
  dayNumberTextActive: {
    color: '#111827',
    fontWeight: '700',
  },
  checkContainer: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
