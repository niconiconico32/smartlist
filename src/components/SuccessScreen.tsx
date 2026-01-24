import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { CheckCircle2, Clock, Flame, Home } from 'lucide-react-native';
import React, { useEffect } from 'react';
import {
    Dimensions,
    Pressable,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import Animated, {
    Easing,
    useAnimatedStyle,
    useSharedValue,
    withDelay,
    withSpring,
    withTiming
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface SuccessScreenProps {
  taskTitle: string;
  timeSpent: number; // en segundos
  streakCount: number;
  onGoHome: () => void;
}

// Burst Particle Component (reutilizado de FocusModeScreen)
const BurstParticle = ({ 
  delay, 
  angle, 
  color 
}: { 
  delay: number; 
  angle: number; 
  color: string;
}) => {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const opacity = useSharedValue(1);
  const scale = useSharedValue(0);

  useEffect(() => {
    const distance = 300 + Math.random() * 100;
    const radian = (angle * Math.PI) / 180;
    const endX = Math.cos(radian) * distance;
    const endY = Math.sin(radian) * distance;
    
    scale.value = withDelay(delay, withSpring(1, { damping: 8 }));
    translateX.value = withDelay(
      delay,
      withTiming(endX, { 
        duration: 2800,
        easing: Easing.out(Easing.cubic),
      })
    );
    translateY.value = withDelay(
      delay,
      withTiming(endY, { 
        duration: 2800,
        easing: Easing.out(Easing.cubic),
      })
    );
    opacity.value = withDelay(
      delay + 2200,
      withTiming(0, { duration: 600 })
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
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

// Burst Explosion Component
const BurstExplosion = () => {
  const colors = ['#CBA6F7', '#FAB387', '#F38BA8', '#F9E2AF', '#A6E3A1', '#89B4FA', '#F5C2E7'];
  const particleCount = 40;
  const particles = Array.from({ length: particleCount }, (_, i) => ({
    id: i,
    delay: Math.random() * 200,
    angle: (360 / particleCount) * i + (Math.random() - 0.5) * 20,
    color: colors[Math.floor(Math.random() * colors.length)],
  }));

  return (
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
  );
};

export function SuccessScreen({
  taskTitle,
  timeSpent,
  streakCount,
  onGoHome,
}: SuccessScreenProps) {
  // Valores animados para la entrada
  const scaleCheckmark = useSharedValue(0);
  const opacityContent = useSharedValue(0);
  const scaleStats = useSharedValue(0.8);
  const opacityButton = useSharedValue(0);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  useEffect(() => {
    // Feedback sensorial
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      // Ignore
    }

    // Animaciones en secuencia
    scaleCheckmark.value = withSpring(1, {
      damping: 6,
      stiffness: 150,
    });

    opacityContent.value = withDelay(300, withSpring(1));
    scaleStats.value = withDelay(500, withSpring(1));
    opacityButton.value = withDelay(1000, withSpring(1));
  }, []);

  const checkmarkStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scaleCheckmark.value }],
  }));

  const contentStyle = useAnimatedStyle(() => ({
    opacity: opacityContent.value,
  }));

  const statsStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scaleStats.value }],
    opacity: opacityContent.value,
  }));

  const buttonStyle = useAnimatedStyle(() => ({
    opacity: opacityButton.value,
    transform: [{ translateY: (1 - opacityButton.value) * 20 }],
  }));

  const handleGoHome = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (error) {
      // Ignore
    }
    onGoHome();
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Animated Background Gradient - Velvet Dark */}
      <LinearGradient
        colors={['#1E1E2E', '#252536', '#1E1E2E', '#1a1a28']}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      {/* Vignette Effect */}
      <View style={styles.vignetteOverlay}>
        <LinearGradient
          colors={['rgba(0,0,0,0.8)', 'transparent', 'transparent', 'rgba(0,0,0,0.8)']}
          style={StyleSheet.absoluteFill}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
        />
      </View>

      {/* Burst Explosion */}
      <BurstExplosion />

      {/* Content */}
      <View style={styles.content}>
        {/* Checkmark Icon */}
        <Animated.View style={[checkmarkStyle, styles.checkmarkWrapper]}>
          <View style={styles.checkmarkGlow} />
          <LinearGradient
            colors={['#CBA6F7', '#FAB387']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.checkmarkGradient}
          >
            <CheckCircle2 size={80} color="#ffffff" strokeWidth={2} />
          </LinearGradient>
        </Animated.View>

        {/* Title and Subtitle */}
        <Animated.View style={[contentStyle, styles.textContainer]}>
          <Text style={styles.title}>
            ¡MISIÓN CUMPLIDA!
          </Text>
          <Text style={styles.subtitle}>
            {taskTitle}
          </Text>
        </Animated.View>

        {/* Stats Cards */}
        <Animated.View style={[statsStyle, styles.statsContainer]}>
          {/* Time Stat */}
          <View style={styles.statCard}>
            <View style={styles.statGloss} />
            <Clock size={24} color="#CBA6F7" />
            <Text style={styles.statLabel}>Tiempo que te tomó:</Text>
            <Text style={styles.statValue}>{formatTime(timeSpent)}</Text>
          </View>

          {/* Streak Stat */}
         
        </Animated.View>

        {/* Button */}
        <Animated.View style={[buttonStyle, styles.buttonContainer]}>
          <Pressable onPress={handleGoHome} style={styles.buttonWrapper}>
            <LinearGradient
              colors={['#CBA6F7', '#FAB387']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.button}
            >
              <Home size={20} color="#ffffff" />
              <Text style={styles.buttonText}>Volver al Inicio</Text>
            </LinearGradient>
          </Pressable>


        </Animated.View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1E1E2E',
  },
  vignetteOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
  },
  content: {
    flex: 1,
    zIndex: 2,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },

  // Checkmark Section
  checkmarkWrapper: {
    marginBottom: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmarkGlow: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(203, 166, 247, 0.3)',
  },
  checkmarkGradient: {
    width: 128,
    height: 128,
    borderRadius: 64,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#CBA6F7',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.6,
    shadowRadius: 16,
    elevation: 12,
  },

  // Text Section
  textContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 36,
    fontWeight: '900',
    color: '#CDD6F4',
    letterSpacing: -1,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 18,
    fontWeight: '600',
    color: 'rgba(166, 173, 200, 0.7)',
    textAlign: 'center',
  },

  // Stats Section
  statsContainer: {
    flexDirection: 'row',
    gap: 16,
    width: '100%',
    marginBottom: 40,
  },
  statCard: {
    flex: 1,
    paddingVertical: 20,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(49, 50, 68, 0.8)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(203, 166, 247, 0.15)',
    alignItems: 'center',
    overflow: 'hidden',
  },
  statGloss: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(203, 166, 247, 0.3)',
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: 'rgba(166, 173, 200, 0.6)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 8,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '900',
    color: '#CDD6F4',
    letterSpacing: -0.5,
  },

  // Button Section
  buttonContainer: {
    width: '100%',
    gap: 12,
  },
  buttonWrapper: {
    borderRadius: 50,
    overflow: 'hidden',
  },
  button: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#CBA6F7',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: -0.3,
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(166, 173, 200, 0.5)',
    textAlign: 'center',
    paddingVertical: 8,
  },

  // Burst Particles
  burstContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  burstParticle: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
  },
});

export default SuccessScreen;
