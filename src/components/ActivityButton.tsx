import { colors } from '@/constants/theme';
import * as Haptics from 'expo-haptics';
import { Edit2, RotateCcw, Trash2 } from 'lucide-react-native';
import React, { useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { AppText as Text } from '@/src/components/AppText';
import Svg, { Circle } from 'react-native-svg';

interface ActivityButtonProps {
  title: string;
  emoji: string;
  metric: string;
  color: string;
  iconColor?: string;
  action: 'add' | 'play';
  onPress?: () => void;
  onEditPress?: () => void;
  onDeletePress?: () => void;
  onResetPress?: () => void;
  hasSubtasks?: boolean;
  completed?: boolean;
  index?: number;
  difficulty?: "easy" | "moderate" | "hard";
  subtasksProgress?: {
    completed: number;
    total: number;
  };
}

const BORDER_COLORS = ['#C9FD5A', '#CBA6F7', '#A6E3A1']; // Peach, Lavender, Matcha
const CARD_COLORS = [colors.surface]; // Dark backgrounds

// Difficulty colors
const difficultyColors = {
  easy: colors.success,    // Verde - #A6E3A1
  moderate: colors.accent, // Naranja - #FAB387
  hard: colors.danger,     // Rojo - #F38BA8
};

// Circular Progress Component
const CircularProgress = ({ percentage, color }: { percentage: number; color: string }) => {
  const size = 50;
  const strokeWidth = 4;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ transform: [{ rotate: '-90deg' }] }}>
        {/* Background circle */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="rgba(255, 255, 255, 0.4)"
          strokeWidth={strokeWidth}
          fill="none"
        />
        {/* Progress circle */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
        />
      </Svg>
      <View style={{ position: 'absolute' }}>
        <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '700' }}>
          {Math.round(percentage)}%
        </Text>
      </View>
    </View>
  );
};

export function ActivityButton({ title, emoji, metric, color, iconColor, action, onPress, onEditPress, onDeletePress, onResetPress, hasSubtasks = false, completed = false, index = 0, difficulty = "easy", subtasksProgress }: ActivityButtonProps) {
  const cardIndex = (index || 0) % CARD_COLORS.length;
  const borderColor = difficulty ? difficultyColors[difficulty] : colors.primary;
  const cardColor = CARD_COLORS[cardIndex];
  const [showMenu, setShowMenu] = useState(false);

  const difficultyLabels = {
    easy: "Fácil",
    moderate: "Moderada",
    hard: "Difícil",
  };

  // Colores vibrantes para tareas completadas - transmiten satisfacción y dopamina
  const completedCardColor = completed ? borderColor + '25' : cardColor; // Fondo vibrante con color de dificultad (15% opacidad)
  const completedBorderColor = completed ? borderColor : borderColor; // 100% opacidad - máxima vibración

  const handleLongPress = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (e) {}
    setShowMenu(true);
  };

  const handleEdit = () => {
    setShowMenu(false);
    setTimeout(() => {
      onEditPress?.();
    }, 150);
  };

  const handleDelete = () => {
    setShowMenu(false);
    setTimeout(() => {
      onDeletePress?.();
    }, 150);
  };

  const handleReset = () => {
    setShowMenu(false);
    setTimeout(() => {
      onResetPress?.();
    }, 150);
  };

  const handleMenuPress = (e: any) => {
    e.stopPropagation();
    handleLongPress();
  };

  // Calcular porcentaje de progreso
  const progressPercentage = subtasksProgress && subtasksProgress.total > 0
    ? (subtasksProgress.completed / subtasksProgress.total) * 100
    : 0;

  return (
    <>
      <Pressable
        style={({ pressed }) => [
          styles.card,
          { backgroundColor: completedCardColor },
completed && {
  // 1. CRÍTICO: Un fondo sólido. 
  // Usa el color gris oscuro de tu app mezclado con un mínimo de verde para que no se cuele la sombra por detrás.
  backgroundColor: colors.background, // Ajusta este hexadecimal al color base oscuro de tus tarjetas
  
  // 2. Borde de luz (El tubo de neón)
  borderWidth: 1.5,
  borderColor: colors.primary, // Verde brillante puro

  // 3. El resplandor (Glow hacia afuera)
  shadowColor: colors.primary,
  shadowOffset: { width: 0, height: 0 },
  shadowOpacity: 0.9,     // Sube la opacidad para que brille más
  shadowRadius: 20,       // Difuminado más amplio y suave

  // 4. Glow para Android
  elevation: 15,
  
  // 5. Opacidad 50% para tareas completadas
  opacity: 0.5,

          },
          pressed && styles.pressed,
        ]}
        onPress={onPress}
        onLongPress={handleLongPress}
        delayLongPress={500}
      >
 

        {/* Horizontal Layout Container */}
        <View style={styles.horizontalContainer}>
          {/* Circular Progress */}
          <View style={styles.progressContainer}>
            <CircularProgress 
              percentage={progressPercentage} 
              color={borderColor}
            />
          </View>

          {/* Content Container */}
          <View style={styles.contentContainer}>
            {/* Category/Emoji */}
            <View style={styles.categoryContainer}>
              <Text style={[styles.categoryText, completed && styles.completedText]}>{emoji}</Text>
            </View>

            {/* Title */}
            <Text style={[styles.cardTitle, completed && styles.completedText]} numberOfLines={2}>
              {title}
            </Text>

            {/* Badge */}
            <View style={[styles.badge, { backgroundColor: completed ? completedBorderColor : borderColor }]}>
              <Text style={[styles.badgeText, completed && styles.completedBadgeText]}>{difficultyLabels[difficulty]}</Text>
            </View>
          </View>
        </View>
      </Pressable>

      {/* Menu Modal */}
      <Modal
        visible={showMenu}
        transparent
        animationType="fade"
        onRequestClose={() => setShowMenu(false)}
      >
        <Pressable 
          style={styles.menuOverlay}
          onPress={() => setShowMenu(false)}
        >
          <View style={styles.menuContainer}>
            {completed ? (
              // Menú para tareas completadas
              <>
                <Pressable
                  style={styles.menuOption}
                  onPress={handleReset}
                >
                  <RotateCcw size={20} color={colors.textPrimary} />
                  <Text style={styles.menuOptionText}>Reiniciar</Text>
                </Pressable>
                
                <View style={styles.menuDivider} />
                
                <Pressable
                  style={styles.menuOption}
                  onPress={handleDelete}
                >
                  <Trash2 size={20} color="#EF4444" />
                  <Text style={[styles.menuOptionText, { color: '#EF4444' }]}>Eliminar</Text>
                </Pressable>
              </>
            ) : (
              // Menú para tareas pendientes
              <>
                <Pressable
                  style={styles.menuOption}
                  onPress={handleEdit}
                >
                  <Edit2 size={20} color={colors.textPrimary} />
                  <Text style={styles.menuOptionText}>Editar</Text>
                </Pressable>
                
                <View style={styles.menuDivider} />
                
                <Pressable
                  style={styles.menuOption}
                  onPress={handleDelete}
                >
                  <Trash2 size={20} color="#EF4444" />
                  <Text style={[styles.menuOptionText, { color: '#EF4444' }]}>Borrar</Text>
                </Pressable>
              </>
            )}
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 50,
    padding: 10,
    minHeight: 70,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
    position: 'relative',
    borderWidth: 1,
    borderColor: colors.textRoutineCard ,
  },
  pressed: {
    transform: [{ scale: 0.97 }],
    opacity: 0.9,
  },
  menuButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 10,
    padding: 4,
  },
  horizontalContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  progressContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  contentContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  categoryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    marginRight: 8,
  },
  categoryText: {
    fontSize: 20,
    color: '#FFFFFF',
  },
  cardTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
    lineHeight: 20,
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    fontSize:9,
    fontWeight: '600',
    color: '#2E3440',
  },
  menuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuContainer: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    width: 200,
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 10,
  },
  menuOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    gap: 12,
  },
  menuOptionText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  menuDivider: {
    height: 1,
    backgroundColor: colors.background,
  },
  completedText: {
    color: 'rgba(255, 255, 255, 0.95)', // Texto brillante
  },
  completedBadgeText: {
    color: '#1E1E2E', // Texto oscuro sobre fondo vibrante
    fontWeight: '700',
  },
});
