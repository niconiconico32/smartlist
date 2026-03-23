import { colors } from '@/constants/theme';
import { Check, Crown, Hexagon, HelpCircle, LucideIcon } from 'lucide-react-native';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

export interface Achievement {
  id: string;
  title: string;
  icon: LucideIcon;
  gradient: string[];
  progress: number;
  total: number;
  completed: boolean;
  coins: number;
}

interface AchievementCardProps {
  achievement: Achievement;
  isLast: boolean; // Mantenido por compatibilidad
  onPress: () => void;
}

export function AchievementCard({ achievement, isLast, onPress }: AchievementCardProps) {
  const isStarted = achievement.progress > 0;
  const isCompleted = achievement.progress >= achievement.total;
  
  const Icon = isStarted ? achievement.icon : HelpCircle;
  const mainColor = achievement.gradient[0] || colors.primary;
  
  // Colores mejorados para alto contraste
  const iconInsideColor = isStarted ? '#EAF0FC' : '#9CA3AF'; // Background screen color / Gris
  const accentColor = isStarted ? colors.surface : '#9CA3AF'; // Morado fuerte / Gris para barra y nivel

  const progressPercentage = Math.min((achievement.progress / achievement.total) * 100, 100);

  return (
    <Pressable 
      onPress={onPress}
      style={({ pressed }) => [
        styles.cardContainer,
        isCompleted && { opacity: 0.5 },
        pressed && { opacity: isCompleted ? 0.4 : 0.9, transform: [{ scale: 0.98 }] }
      ]}
    >
      {/* Lado Izquierdo: Hexagon y Nivel */}
      <View style={styles.leftSection}>
        <View style={styles.hexagonWrapper}>
          <Hexagon 
            size={68} 
            fill={isStarted ? mainColor : '#F3F4F6'} 
            color={isStarted ? mainColor : '#F3F4F6'} 
          />
          <View style={styles.iconOverlay}>
            <Icon size={28} color={iconInsideColor} strokeWidth={2.5} />
          </View>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
          <Crown size={12} color={accentColor} strokeWidth={2.5} />
          <Text style={[styles.levelText, { color: accentColor }]}>
            +{achievement.coins}
          </Text>
        </View>
      </View>

      {/* Lado Derecho: Contenido y Progreso */}
      <View style={styles.contentSection}>
        <View style={styles.textStack}>
          <Text style={styles.titleText}>{achievement.title}</Text>
          {/* Si quieres agregar subtitulo mas adelante, lo harías aquí */}
          <Text style={styles.subtitleText}>Completar objetivo</Text>
        </View>

        <View style={styles.progressSection}>
          <View style={styles.progressTrack}>
            <View 
              style={[
                styles.progressFill, 
                { width: `${progressPercentage}%`, backgroundColor: accentColor }
              ]} 
            />
          </View>
          <Text style={[styles.progressNumber, { color: accentColor }]}>
            {achievement.progress}/{achievement.total}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  cardContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 16,
    padding: 16,
    gap: 16,
  },
  leftSection: {
    alignItems: 'center',
    gap: 6,
    width: 68,
  },
  hexagonWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 68,
    height: 68,
    position: 'relative',
  },
  iconOverlay: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: '100%',
  },
  levelText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  contentSection: {
    flex: 1,
    gap: 12,
  },
  textStack: {
    gap: 4,
  },
  titleText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  subtitleText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  progressSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  progressTrack: {
    flex: 1,
    height: 8,
    backgroundColor: '#F3F4F6',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressNumber: {
    fontSize: 13,
    fontWeight: '700',
    minWidth: 32,
    textAlign: 'right',
  },
});