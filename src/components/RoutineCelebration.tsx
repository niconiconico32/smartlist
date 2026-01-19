import { colors } from '@/constants/theme';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { PartyPopper, Sparkles, Star, Trophy, Zap } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
    Dimensions,
    Modal,
    Pressable,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import Animated, {
    Easing,
    FadeIn,
    useAnimatedStyle,
    useSharedValue,
    withDelay,
    withRepeat,
    withSequence,
    withSpring,
    withTiming
} from 'react-native-reanimated';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Mensajes motivacionales dinámicos (trend 2026: variedad para evitar fatiga)
const CELEBRATION_MESSAGES = [
  { title: '¡Rutina Completada!', subtitle: 'Eres imparable 🔥' },
  { title: '¡Lo lograste!', subtitle: 'Cada día más fuerte 💪' },
  { title: '¡Increíble!', subtitle: 'La consistencia es tu superpoder ⚡' },
  { title: '¡Misión cumplida!', subtitle: 'Hoy fue un gran día ✨' },
  { title: '¡Excelente!', subtitle: 'Tu yo del futuro te lo agradece 🌟' },
  { title: '¡Boom!', subtitle: 'Otro día, otra victoria 🏆' },
  { title: '¡Perfecto!', subtitle: 'Estás en racha 🎯' },
  { title: '¡Genial!', subtitle: 'La disciplina vence al talento 💎' },
];

// Frases de streak (rachas)
const STREAK_MESSAGES: Record<number, string> = {
  3: '¡3 días seguidos! 🔥',
  5: '¡5 días! Estás en fuego 🔥🔥',
  7: '¡Una semana completa! 🏅',
  14: '¡2 semanas imparables! 🚀',
  21: '¡21 días = nuevo hábito! 🧠',
  30: '¡Un mes de disciplina! 👑',
};

interface RoutineCelebrationProps {
  visible: boolean;
  routineName: string;
  completedTasks: number;
  totalTasks: number;
  streakDays?: number;
  routineColor?: string;
  onClose: () => void;
}

// Burst Particle Component (partículas que explotan)
const BurstParticle = ({ 
  delay, 
  angle, 
  color,
  distance = 200,
}: { 
  delay: number; 
  angle: number; 
  color: string;
  distance?: number;
}) => {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const opacity = useSharedValue(1);
  const scale = useSharedValue(0);
  const rotation = useSharedValue(0);

  useEffect(() => {
    const actualDistance = distance + Math.random() * 80;
    const radian = (angle * Math.PI) / 180;
    const endX = Math.cos(radian) * actualDistance;
    const endY = Math.sin(radian) * actualDistance;
    
    scale.value = withDelay(delay, withSpring(1, { damping: 8 }));
    rotation.value = withDelay(delay, withTiming(360 * (Math.random() > 0.5 ? 1 : -1), { duration: 2000 }));
    translateX.value = withDelay(
      delay,
      withTiming(endX, { 
        duration: 2200,
        easing: Easing.out(Easing.cubic),
      })
    );
    translateY.value = withDelay(
      delay,
      withTiming(endY, { 
        duration: 2200,
        easing: Easing.out(Easing.cubic),
      })
    );
    opacity.value = withDelay(
      delay + 1600,
      withTiming(0, { duration: 600 })
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
      { rotate: `${rotation.value}deg` },
    ],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        styles.burstParticle,
        { backgroundColor: color },
        animatedStyle,
      ]}
    />
  );
};

// Confetti falling from top
const ConfettiPiece = ({ delay, startX }: { delay: number; startX: number }) => {
  const translateY = useSharedValue(-50);
  const translateX = useSharedValue(startX);
  const rotation = useSharedValue(0);
  const opacity = useSharedValue(0);

  const colors = ['#CBA6F7', '#FAB387', '#A6E3A1', '#89B4FA', '#F5C2E7', '#F9E2AF'];
  const color = colors[Math.floor(Math.random() * colors.length)];
  const size = 8 + Math.random() * 8;

  useEffect(() => {
    opacity.value = withDelay(delay, withTiming(1, { duration: 100 }));
    translateY.value = withDelay(
      delay,
      withTiming(SCREEN_HEIGHT + 100, {
        duration: 3000 + Math.random() * 2000,
        easing: Easing.linear,
      })
    );
    translateX.value = withDelay(
      delay,
      withTiming(startX + (Math.random() - 0.5) * 100, {
        duration: 3000,
        easing: Easing.inOut(Easing.sin),
      })
    );
    rotation.value = withDelay(
      delay,
      withTiming(720 * (Math.random() > 0.5 ? 1 : -1), { duration: 3000 })
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { rotate: `${rotation.value}deg` },
    ],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        styles.confettiPiece,
        { backgroundColor: color, width: size, height: size * 2, borderRadius: size / 4 },
        animatedStyle,
      ]}
    />
  );
};

// Glowing ring effect
const GlowRing = ({ color, delay }: { color: string; delay: number }) => {
  const scale = useSharedValue(0.5);
  const opacity = useSharedValue(0.8);

  useEffect(() => {
    scale.value = withDelay(
      delay,
      withTiming(2.5, { duration: 1500, easing: Easing.out(Easing.cubic) })
    );
    opacity.value = withDelay(
      delay,
      withTiming(0, { duration: 1500, easing: Easing.out(Easing.cubic) })
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        styles.glowRing,
        { borderColor: color },
        animatedStyle,
      ]}
    />
  );
};

export const RoutineCelebration: React.FC<RoutineCelebrationProps> = ({
  visible,
  routineName,
  completedTasks,
  totalTasks,
  streakDays = 0,
  routineColor = '#CBA6F7',
  onClose,
}) => {
  const [message] = useState(() => 
    CELEBRATION_MESSAGES[Math.floor(Math.random() * CELEBRATION_MESSAGES.length)]
  );

  // Animación principal del icono
  const iconScale = useSharedValue(0);
  const iconRotate = useSharedValue(-30);
  const contentOpacity = useSharedValue(0);
  const statsScale = useSharedValue(0.8);
  const buttonOpacity = useSharedValue(0);
  const pulseScale = useSharedValue(1);

  // Haptic pattern (trend 2026: secuencias de haptics)
  const playHapticSequence = async () => {
    try {
      // Secuencia de haptics como "melodía táctil"
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light), 150);
      setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium), 300);
      setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy), 500);
    } catch (error) {
      // Ignore
    }
  };

  useEffect(() => {
    if (visible) {
      // Reset values
      iconScale.value = 0;
      iconRotate.value = -30;
      contentOpacity.value = 0;
      statsScale.value = 0.8;
      buttonOpacity.value = 0;

      // Play haptic sequence
      playHapticSequence();

      // Animaciones en secuencia
      iconScale.value = withDelay(
        100,
        withSpring(1, { damping: 6, stiffness: 150 })
      );
      iconRotate.value = withDelay(
        100,
        withSpring(0, { damping: 8, stiffness: 100 })
      );

      contentOpacity.value = withDelay(400, withSpring(1));
      statsScale.value = withDelay(500, withSpring(1, { damping: 10 }));
      buttonOpacity.value = withDelay(800, withTiming(1, { duration: 300 }));

      // Pulse continuo para el icono
      pulseScale.value = withDelay(
        600,
        withRepeat(
          withSequence(
            withTiming(1.05, { duration: 1000 }),
            withTiming(1, { duration: 1000 })
          ),
          -1,
          true
        )
      );
    }
  }, [visible]);

  const iconAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: iconScale.value * pulseScale.value },
      { rotate: `${iconRotate.value}deg` },
    ],
  }));

  const contentAnimatedStyle = useAnimatedStyle(() => ({
    opacity: contentOpacity.value,
  }));

  const statsAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: statsScale.value }],
    opacity: contentOpacity.value,
  }));

  const buttonAnimatedStyle = useAnimatedStyle(() => ({
    opacity: buttonOpacity.value,
  }));

  // Generar partículas
  const particles = Array.from({ length: 50 }, (_, i) => ({
    id: i,
    delay: Math.random() * 300,
    angle: (360 / 50) * i + (Math.random() - 0.5) * 15,
    color: ['#CBA6F7', '#FAB387', '#F38BA8', '#F9E2AF', '#A6E3A1', '#89B4FA', '#F5C2E7'][
      Math.floor(Math.random() * 7)
    ],
  }));

  // Confetti
  const confettiPieces = Array.from({ length: 30 }, (_, i) => ({
    id: i,
    delay: i * 50,
    startX: Math.random() * SCREEN_WIDTH,
  }));

  const streakMessage = STREAK_MESSAGES[streakDays] || (streakDays > 0 ? `${streakDays} días de racha` : null);

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        {/* Confetti cayendo */}
        <View style={styles.confettiContainer} pointerEvents="none">
          {confettiPieces.map((piece) => (
            <ConfettiPiece key={piece.id} delay={piece.delay} startX={piece.startX} />
          ))}
        </View>

        <View style={styles.container}>
          {/* Glow rings */}
          <View style={styles.glowContainer}>
            <GlowRing color={routineColor} delay={0} />
            <GlowRing color={routineColor} delay={200} />
            <GlowRing color={routineColor} delay={400} />
          </View>

          {/* Burst particles */}
          <View style={styles.burstContainer} pointerEvents="none">
            {particles.map((particle) => (
              <BurstParticle
                key={particle.id}
                delay={particle.delay}
                angle={particle.angle}
                color={particle.color}
              />
            ))}
          </View>

          {/* Main icon */}
          <Animated.View style={[styles.iconContainer, iconAnimatedStyle]}>
            <LinearGradient
              colors={[routineColor, `${routineColor}80`]}
              style={styles.iconGradient}
            >
              <Trophy size={56} color="#1E1E2E" strokeWidth={2.5} />
            </LinearGradient>
          </Animated.View>

          {/* Content */}
          <Animated.View style={[styles.content, contentAnimatedStyle]}>
            <Text style={styles.title}>{message.title}</Text>
            <Text style={styles.subtitle}>{message.subtitle}</Text>
            <Text style={styles.routineName}>{routineName}</Text>
          </Animated.View>

          {/* Stats */}
          <Animated.View style={[styles.statsContainer, statsAnimatedStyle]}>
            <View style={styles.statBox}>
              <View style={[styles.statIconBox, { backgroundColor: `${routineColor}20` }]}>
                <Sparkles size={20} color={routineColor} />
              </View>
              <Text style={styles.statValue}>{completedTasks}/{totalTasks}</Text>
              <Text style={styles.statLabel}>Tareas</Text>
            </View>

            {streakDays > 0 && (
              <View style={styles.statBox}>
                <View style={[styles.statIconBox, { backgroundColor: 'rgba(250, 179, 135, 0.2)' }]}>
                  <Zap size={20} color="#FAB387" />
                </View>
                <Text style={styles.statValue}>{streakDays}</Text>
                <Text style={styles.statLabel}>Racha</Text>
              </View>
            )}
          </Animated.View>

          {/* Streak message */}
          {streakMessage && (
            <Animated.View 
              entering={FadeIn.delay(700)}
              style={styles.streakBadge}
            >
              <Star size={16} color="#F9E2AF" fill="#F9E2AF" />
              <Text style={styles.streakText}>{streakMessage}</Text>
            </Animated.View>
          )}

          {/* Continue button */}
          <Animated.View style={[styles.buttonContainer, buttonAnimatedStyle]}>
            <Pressable
              style={({ pressed }) => [
                styles.continueButton,
                { backgroundColor: routineColor },
                pressed && styles.buttonPressed,
              ]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                onClose();
              }}
            >
              <Text style={styles.buttonText}>¡Genial!</Text>
              <PartyPopper size={20} color="#1E1E2E" />
            </Pressable>
          </Animated.View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(17, 17, 27, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  confettiContainer: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  confettiPiece: {
    position: 'absolute',
    top: 0,
  },
  glowContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  glowRing: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
  },
  burstContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  burstParticle: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  iconContainer: {
    marginBottom: 32,
  },
  iconGradient: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#CBA6F7',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 30,
    elevation: 20,
  },
  content: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 32,
    fontWeight: '900',
    color: colors.textPrimary,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textSecondary,
    marginTop: 8,
    textAlign: 'center',
  },
  routineName: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.textTertiary,
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 20,
    overflow: 'hidden',
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 24,
    marginBottom: 24,
  },
  statBox: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 20,
    minWidth: 100,
  },
  statIconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  statLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.textSecondary,
    marginTop: 4,
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(249, 226, 175, 0.15)',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
    marginBottom: 32,
    borderWidth: 1,
    borderColor: 'rgba(249, 226, 175, 0.3)',
  },
  streakText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#F9E2AF',
  },
  buttonContainer: {
    width: '100%',
  },
  continueButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 18,
    paddingHorizontal: 48,
    borderRadius: 16,
  },
  buttonPressed: {
    transform: [{ scale: 0.97 }],
    opacity: 0.9,
  },
  buttonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E1E2E',
  },
});
