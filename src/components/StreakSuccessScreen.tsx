/**
 * StreakSuccessScreen
 * 🔥 Pantalla de celebración cuando el usuario completa su objetivo diario
 * 
 * Diseño: "Calma Satisfactoria" (Satisfying Calm) - Tendencias 2026
 * Optimizado para neurodivergencia (TDAH)
 * 
 * @example
 * // Uso con estado global/contexto
 * import { useStreakStore } from '@/src/store/streakStore';
 * 
 * function MyComponent() {
 *   const { currentStreak, showSuccess, hideSuccess } = useStreakStore();
 *   
 *   if (showSuccess) {
 *     return (
 *       <StreakSuccessScreen 
 *         streakDays={currentStreak} 
 *         onDismiss={hideSuccess}
 *       />
 *     );
 *   }
 *   // ... resto del componente
 * }
 */

import { colors } from '@/constants/theme';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useMemo } from 'react';
import {
  Dimensions,
  Image,
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
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// ============================================================================
// MENSAJES DE MOTIVACIÓN
// ============================================================================

const MESSAGES_DAY_ONE = [
  "¡El primer paso es el más valiente! Lo hiciste.",
  "Hoy le ganaste a la inercia. ¡Bien hecho!",
  "Racha iniciada. Tu cerebro te lo agradece.",
];

const MESSAGES_STREAK = [
  "¡Imparable! Un día más sumado a tu consistencia.",
  "Mira esa racha crecer. Se siente bien, ¿verdad?",
  "Tu esfuerzo se está notando. ¡Sigue brillando!",
  "Otra victoria diaria para la colección. ¡Genial!",
  "La constancia te queda muy bien. ¡Felicidades!",
  "¡Eso es! Manteniendo el ritmo un día a la vez.",
];

// ============================================================================
// TYPES
// ============================================================================

interface StreakSuccessScreenProps {
  /** Número de días consecutivos de la racha actual */
  streakDays: number;
  /** Callback cuando el usuario cierra la pantalla */
  onDismiss: () => void;
}

// ============================================================================
// GLOW RING COMPONENT
// ============================================================================

const GlowRing = ({ delay, size }: { delay: number; size: number }) => {
  const scale = useSharedValue(0.8);
  const opacity = useSharedValue(0);

  useEffect(() => {
    scale.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(1.2, { duration: 2000, easing: Easing.out(Easing.ease) }),
          withTiming(0.8, { duration: 2000, easing: Easing.in(Easing.ease) })
        ),
        -1,
        true
      )
    );
    opacity.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(0.6, { duration: 2000 }),
          withTiming(0.2, { duration: 2000 })
        ),
        -1,
        true
      )
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
        {
          width: size,
          height: size,
          borderRadius: size / 2,
        },
        animatedStyle,
      ]}
    />
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function StreakSuccessScreen({
  streakDays,
  onDismiss,
}: StreakSuccessScreenProps) {
  // Selección de mensaje aleatorio (solo una vez al montar)
  const motivationalMessage = useMemo(() => {
    const messages = streakDays === 1 ? MESSAGES_DAY_ONE : MESSAGES_STREAK;
    const randomIndex = Math.floor(Math.random() * messages.length);
    return messages[randomIndex];
  }, [streakDays]);

  // Valores animados
  const mascotScale = useSharedValue(0);
  const mascotTranslateY = useSharedValue(0);
  const titleOpacity = useSharedValue(0);
  const titleScale = useSharedValue(0.8);
  const messageOpacity = useSharedValue(0);
  const buttonOpacity = useSharedValue(0);
  const glowPulse = useSharedValue(0);

  useEffect(() => {
    // 🎯 Feedback háptico suave al mostrar la pantalla
    // Sugiere satisfacción sin ser intrusivo (ideal para TDAH)
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      // Silenciar en dispositivos sin hápticos
    }

    // Animación de entrada de la mascota con rebote feliz
    mascotScale.value = withSpring(1, {
      damping: 8,
      stiffness: 120,
    });

    // Rebote feliz continuo (breathing + bounce)
    mascotTranslateY.value = withDelay(
      500,
      withRepeat(
        withSequence(
          withTiming(-15, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
          withTiming(0, { duration: 1200, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      )
    );

    // Glow pulsante
    glowPulse.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.5, { duration: 1500, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );

    // Título con delay
    titleOpacity.value = withDelay(300, withTiming(1, { duration: 600 }));
    titleScale.value = withDelay(300, withSpring(1, { damping: 10 }));

    // Mensaje motivacional
    messageOpacity.value = withDelay(600, withTiming(1, { duration: 500 }));

    // Botón
    buttonOpacity.value = withDelay(900, withTiming(1, { duration: 400 }));
  }, []);

  // Estilos animados
  const mascotAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: mascotScale.value },
      { translateY: mascotTranslateY.value },
    ],
  }));

  const glowAnimatedStyle = useAnimatedStyle(() => ({
    opacity: glowPulse.value * 0.7,
    transform: [{ scale: 1 + glowPulse.value * 0.1 }],
  }));

  const titleAnimatedStyle = useAnimatedStyle(() => ({
    opacity: titleOpacity.value,
    transform: [{ scale: titleScale.value }],
  }));

  const messageAnimatedStyle = useAnimatedStyle(() => ({
    opacity: messageOpacity.value,
    transform: [{ translateY: (1 - messageOpacity.value) * 10 }],
  }));

  const buttonAnimatedStyle = useAnimatedStyle(() => ({
    opacity: buttonOpacity.value,
    transform: [{ translateY: (1 - buttonOpacity.value) * 20 }],
  }));

  const handleDismiss = () => {
    // 🎯 Háptico ligero al tocar el botón
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (error) {
      // Silenciar
    }
    onDismiss();
  };

  return (
    <View style={styles.container}>
      {/* Fondo Deep Ambient - Gradiente radial cálido (amanecer interno) */}
      <LinearGradient
        colors={['#2E1A1A', '#3A2420', '#4A2F1F', '#3A2420', '#2E1A1A']}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.5, y: 0.5 }}
        end={{ x: 1, y: 1 }}
      />
      
      {/* Overlay radial para simular gradiente radial */}
      <View style={styles.radialOverlay}>
        <LinearGradient
          colors={['rgba(250, 179, 135, 0.15)', 'transparent']}
          style={styles.radialGlow}
          start={{ x: 0.5, y: 0.3 }}
          end={{ x: 0.5, y: 1 }}
        />
      </View>

      <SafeAreaView style={styles.content}>
        {/* Sección Superior - Mascota con Glow */}
        <View style={styles.heroSection}>
          {/* Glow Rings pulsantes */}
          <View style={styles.glowContainer}>
            <GlowRing delay={0} size={220} />
            <GlowRing delay={500} size={280} />
            <GlowRing delay={1000} size={340} />
          </View>

          {/* Glow principal detrás de la mascota */}
          <Animated.View style={[styles.mascotGlow, glowAnimatedStyle]} />

          {/* Mascota */}
          <Animated.View style={[styles.mascotContainer, mascotAnimatedStyle]}>
            <Image
              source={require('@/assets/images/logomain.png')}
              style={styles.mascotImage}
              resizeMode="contain"
            />
          </Animated.View>
        </View>

        {/* Sección Central - Contador de Racha (Héroe) */}
        <View style={styles.streakSection}>
          <Animated.View style={titleAnimatedStyle}>
            <Text style={styles.streakLabel}>🔥 RACHA</Text>
            <Text style={styles.streakNumber}>¡DÍA {streakDays}!</Text>
          </Animated.View>

          {/* Mensaje motivacional */}
          <Animated.Text style={[styles.motivationalMessage, messageAnimatedStyle]}>
            {motivationalMessage}
          </Animated.Text>
        </View>

        {/* Sección Inferior - Botón */}
        <Animated.View style={[styles.buttonSection, buttonAnimatedStyle]}>
          <Pressable
            onPress={handleDismiss}
            style={({ pressed }) => [
              styles.continueButton,
              pressed && styles.continueButtonPressed,
            ]}
          >
            <LinearGradient
              colors={['#FF9A9E', '#FECFEF', '#D4A5FF']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.continueButtonGradient}
            >
              <View style={styles.continueButtonInner}>
                <Text style={styles.continueButtonText}>¡Seguir adelante!</Text>
              </View>
            </LinearGradient>
          </Pressable>
        </Animated.View>
      </SafeAreaView>
    </View>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#2E1A1A',
  },
  radialOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radialGlow: {
    width: SCREEN_WIDTH * 1.5,
    height: SCREEN_HEIGHT * 0.8,
    borderRadius: SCREEN_WIDTH,
  },
  content: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 32,
  },
  heroSection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 40,
  },
  glowContainer: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  glowRing: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: 'rgba(250, 179, 135, 0.3)',
    backgroundColor: 'transparent',
  },
  mascotGlow: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(250, 179, 135, 0.25)',
    shadowColor: '#FAB387',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 50,
  },
  mascotContainer: {
    zIndex: 10,
  },
  mascotImage: {
    width: 140,
    height: 140,
  },
  streakSection: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  streakLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: 'rgba(250, 179, 135, 0.9)',
    letterSpacing: 3,
    textAlign: 'center',
    marginBottom: 8,
  },
  streakNumber: {
    fontSize: 52,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
    letterSpacing: -1,
    textShadowColor: 'rgba(250, 179, 135, 0.5)',
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 20,
  },
  motivationalMessage: {
    fontSize: 17,
    fontWeight: '400',
    color: 'rgba(255, 255, 255, 0.75)',
    textAlign: 'center',
    lineHeight: 26,
    marginTop: 24,
    paddingHorizontal: 20,
  },
  buttonSection: {
    paddingBottom: 40,
  },
  continueButton: {
    borderRadius: 50,
    overflow: 'hidden',
    shadowColor: '#FF9A9E',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 8,
  },
  continueButtonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  continueButtonGradient: {
    borderRadius: 50,
    padding: 2,
  },
  continueButtonInner: {
    backgroundColor: 'rgba(46, 26, 26, 0.4)',
    borderRadius: 48,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  continueButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
});

export default StreakSuccessScreen;
