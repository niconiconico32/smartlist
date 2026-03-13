import { colors } from '@/constants/theme';
import { LinearGradient } from 'expo-linear-gradient';
import { Check, Crown, LucideIcon } from 'lucide-react-native';
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
  isLast: boolean;
  onPress: () => void;
}

export function AchievementCard({ achievement, isLast, onPress }: AchievementCardProps) {
  const Icon = achievement.icon;
  // Aseguramos que el progreso no supere el 100% visualmente
  const progressPercentage = Math.min((achievement.progress / achievement.total) * 100, 100);
  
  return (
    <View style={styles.achievementRow}>
      {/* Columna Izquierda: Línea de tiempo */}
      <View style={styles.progressLineContainer}>
        <View style={[
          styles.progressCircle,
          achievement.completed && styles.progressCircleCompleted
        ]}>
          {achievement.completed && (
            <Check size={14} color={colors.background} strokeWidth={3} />
          )}
        </View>
        {/* Renderizamos la línea solo si NO es el último elemento */}
        {!isLast && <View style={styles.progressLine} />}
      </View>

      {/* Tarjeta del Logro */}
      <Pressable 
        onPress={onPress}
        style={({ pressed }) => [
          styles.achievementCard,
          achievement.completed && styles.achievementCardCompleted,
          pressed && { opacity: 0.8, transform: [{ scale: 0.98 }] } // Feedback visual
        ]}
      >
        {/* Icono con Gradiente */}
        <LinearGradient
          colors={achievement.gradient}
          style={styles.iconContainer}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Icon size={28} color="#FFFFFF" strokeWidth={2.5} />
        </LinearGradient>

        {/* Contenido principal */}
        <View style={styles.achievementContent}>
          <View style={styles.titleRow}>
            <Text style={[
              styles.achievementTitle,
              achievement.completed && styles.achievementTitleCompleted
            ]}>
              {achievement.title}
            </Text>
            <View style={styles.coinsBadge}>
              <Crown size={12} color="#FCD34D" strokeWidth={2.5} />
              <Text style={styles.coinsText}>{achievement.coins}</Text>
            </View>
          </View>
          
          {/* Barra de Progreso y Texto */}
          <View style={styles.progressContainer}>
            <View style={styles.progressBarBackground}>
              <View style={[styles.progressBarFill, { width: `${progressPercentage}%` }]} />
            </View>
            <Text style={styles.progressText}>
              {achievement.progress}/{achievement.total}
            </Text>
          </View>
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  achievementRow: {
    flexDirection: 'row',
    alignItems: 'stretch', // Cambiado a stretch para que la línea ocupe el alto total
    marginBottom: 16, // Espaciado entre tarjetas
  },
  progressLineContainer: {
    alignItems: 'center',
    width: 24, // Ancho fijo para alinear perfectamente los círculos
    marginRight: 16,
    marginTop: 16, // Ajustado para centrarse mejor con la tarjeta
  },
  progressCircle: {
    width: 22,
    height: 22,
    borderRadius: 11, // Mitad del width/height
    borderWidth: 3,
    borderColor: colors.textSecondary,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2, // Asegura que el círculo quede por encima de la línea
  },
  progressCircleCompleted: {
    backgroundColor: '#C9FD5A', // TODO: Mover a colors.success / colors.accent
    borderColor: '#C9FD5A',
  },
  progressLine: {
    width: 2,
    flex: 1,
    backgroundColor: colors.textSecondary,
    opacity: 0.3,
    marginTop: 4, // Pequeña separación del círculo
    marginBottom: -20, // Conecta con el siguiente círculo superando el marginBottom del row
  },
  achievementCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECF0ED', // TODO: Mover a colors.surfaceVariant
    borderRadius: 24,
    padding: 12,
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  achievementCardCompleted: {
    opacity: 0.7,
    backgroundColor: 'rgba(115, 99, 242, 0.1)', // Ajustada la opacidad para que no sea tan invasivo
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  achievementContent: {
    flex: 1,
    gap: 8,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
  },
  achievementTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textTertiary,
    lineHeight: 20,
    flex: 1,
  },
  coinsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(252, 211, 77, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    gap: 3,
  },
  coinsText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FCD34D',
  },
  achievementTitleCompleted: {
    textDecorationLine: 'line-through',
    color: colors.textSecondary,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 12,
    gap: 8,
  },
  progressBarBackground: {
    flex: 1,
    height: 10,
    backgroundColor: 'rgba(108, 112, 134, 0.2)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#F9E2AF', // TODO: Mover a colors.warning / colors.gold
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textTertiary,
    minWidth: 35,
    textAlign: 'right', // Asegura que los números queden alineados
  },
});