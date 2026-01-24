import { BlurView } from 'expo-blur';
import { Flame } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { Dimensions, Image, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  FadeInDown,
  FadeOutUp,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  withSequence,
  withDelay
} from 'react-native-reanimated';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const PHRASES = [
  'La parálisis por análisis es vencible. Divide y vencerás.',
  'Tu cerebro es para crear, no para almacenar. Deja que SmartList guarde el plan.',
  'Recupera tu ancho de banda mental. Saca el caos de tu cabeza y ponlo aquí.',
  'No es falta de capacidad, es falta de claridad. Nosotros ponemos el foco.',
  'La inercia se rompe con micro-pasos. Te decimos exactamente por dónde empezar.',
  'Cambia la culpa por consistencia. Un paso a la vez es suficiente.',
  'Hackea tu dopamina: tachar tareas pequeñas crea el impulso para las grandes.',
];

// Colores de tu paleta
const COLOR_PRIMARY = '#CBA6F7'; // Lavender
const COLOR_ACCENT = '#FAB387';  // Peach
const TEXT_COLOR = '#1E1E2E';    // Dark
const FLAME_ACTIVE_COLOR = '#FF6B6B'; // Orange Fire
const FLAME_INACTIVE_COLOR = '#94A3B8'; // Gray

interface FocusHeroCardProps {
  currentStreak?: number;
  isStreakActiveToday?: boolean;
}

export function FocusHeroCard({ 
  currentStreak = 0, 
  isStreakActiveToday = false 
}: FocusHeroCardProps) {
  const [index, setIndex] = useState(0);
  
  // Valores compartidos para animaciones
  const breathingScale = useSharedValue(1);
  const blob1Position = useSharedValue(0);
  const blob2Position = useSharedValue(0);
  const flameScale = useSharedValue(1);

  // 1. Efecto de "Respiración" del contenedor (Breathing)
  useEffect(() => {
    breathingScale.value = withRepeat(
      withTiming(1.02, { duration: 3000, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
  }, []);

  // 2. Animación de "Líquido" en el fondo (Blobs moviéndose)
  useEffect(() => {
    blob1Position.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 4000, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 4000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );

    blob2Position.value = withRepeat(
      withSequence(
        withDelay(1000, withTiming(1, { duration: 5000, easing: Easing.inOut(Easing.ease) })),
        withDelay(1000, withTiming(0, { duration: 5000, easing: Easing.inOut(Easing.ease) }))
      ),
      -1,
      true
    );
  }, []);

  // 3. Animación de "Fuego Vivo" para el streak badge
  useEffect(() => {
    if (isStreakActiveToday) {
      // Palpitar cuando está activo
      flameScale.value = withRepeat(
        withSequence(
          withTiming(1.2, { duration: 600, easing: Easing.inOut(Easing.ease) }),
          withTiming(1, { duration: 600, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      );
    } else {
      // Estático cuando no está activo
      flameScale.value = withTiming(1, { duration: 300 });
    }
  }, [isStreakActiveToday]);

  // 4. Rotación automática de frases
  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % PHRASES.length);
    }, 6000); // Cambio cada 6 segundos
    return () => clearInterval(interval);
  }, []);

  // Estilos animados
  const containerAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: breathingScale.value }],
  }));

  const blob1Style = useAnimatedStyle(() => ({
    transform: [
      { translateX: interpolate(blob1Position.value, [0, 1], [-20, 20]) },
      { translateY: interpolate(blob1Position.value, [0, 1], [-10, 30]) },
      { scale: interpolate(blob1Position.value, [0, 1], [1, 1.2]) },
    ],
  }));

  const blob2Style = useAnimatedStyle(() => ({
    transform: [
      { translateX: interpolate(blob2Position.value, [0, 1], [20, -30]) },
      { translateY: interpolate(blob2Position.value, [0, 1], [20, -20]) },
      { scale: interpolate(blob2Position.value, [0, 1], [1, 1.3]) },
    ],
  }));

  const flameAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: flameScale.value }],
  }));

  // Streak Badge Component
  const StreakBadge = () => {
    if (currentStreak === 0) return null;

    return (
      <View style={styles.streakBadgeContainer}>
        <BlurView intensity={80} tint="light" style={styles.streakBadgeBlur}>
          <View style={styles.streakBadgeContent}>
            <Animated.View style={flameAnimatedStyle}>
              <Flame 
                size={16} 
                color={isStreakActiveToday ? FLAME_ACTIVE_COLOR : FLAME_INACTIVE_COLOR}
                fill={isStreakActiveToday ? FLAME_ACTIVE_COLOR : 'transparent'}
              />
            </Animated.View>
            <Text style={[
              styles.streakBadgeText,
              { color: isStreakActiveToday ? FLAME_ACTIVE_COLOR : FLAME_INACTIVE_COLOR }
            ]}>
              {currentStreak}
            </Text>
          </View>
        </BlurView>
      </View>
    );
  };

  return (
    <Animated.View style={[styles.container, containerAnimatedStyle]}>
      
      {/* --- CAPA 1: FONDO LÍQUIDO (ORBES) --- */}
      <View style={styles.backgroundLayer}>
        <Animated.View style={[styles.blob, styles.blobPrimary, blob1Style]} />
        <Animated.View style={[styles.blob, styles.blobAccent, blob2Style]} />
      </View>

      {/* --- CAPA 2: EFECTO VIDRIO (GLASSMORPHISM) --- */}
      <BlurView intensity={70} tint="light" style={StyleSheet.absoluteFill} />
      
      {/* Capa sutil blanca para unificar el tinte */}
      <View style={styles.glassTint} />

      {/* --- CAPA 3: CONTENIDO --- */}
      <View style={styles.contentContainer}>
        
        {/* TEXTO ANIMADO */}
        <View style={styles.textWrapper}>
          <Animated.Text
            key={index} // La clave reinicia la animación al cambiar el texto
            entering={FadeInDown.duration(600).springify()}
            exiting={FadeOutUp.duration(400)}
            style={styles.text}
          >
            {PHRASES[index]}
          </Animated.Text>
        </View>

        {/* LOGO */}
        <View style={styles.logoWrapper}>
          <Image
            source={require('../../assets/images/logomain.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          {/* Sombra suave para el logo */}
          <View style={styles.logoShadow} />
          {/* Streak Badge */}
          <StreakBadge />
        </View>

      </View>
      
      {/* Borde brillante sutil (Overlay) */}
      <View style={styles.borderOverlay} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 16,
    marginHorizontal: 4,
    height: 160,
    borderRadius: 32,
    overflow: 'hidden', // Crucial para que el blur no se salga
    backgroundColor: '#fff', // Fallback color
    // Sombras complejas para efecto flotante
    shadowColor: COLOR_PRIMARY,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 10,
  },
  backgroundLayer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#FFF5F0', // Fondo base muy suave
    justifyContent: 'center',
    alignItems: 'center',
  },
  blob: {
    position: 'absolute',
    borderRadius: 999,
    opacity: 0.6,
  },
  blobPrimary: {
    width: 200,
    height: 200,
    backgroundColor: COLOR_PRIMARY,
    top: -50,
    left: -20,
  },
  blobAccent: {
    width: 180,
    height: 180,
    backgroundColor: COLOR_ACCENT,
    bottom: -40,
    right: -20,
  },
  glassTint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.2)', // Tinte lechoso
  },
  contentContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  textWrapper: {
    flex: 1,
    paddingRight: 16,
    justifyContent: 'center',
    height: '100%', 
  },
  text: {
    fontSize: 16,
    fontWeight: '700',
    color: TEXT_COLOR,
    lineHeight: 24,
    letterSpacing: -0.3,
  },
  logoWrapper: {
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  logo: {
    width: 90,
    height: 90,
    zIndex: 10,
  },
  logoShadow: {
    position: 'absolute',
    width: 60,
    height: 20,
    backgroundColor: 'rgba(0,0,0,0.1)',
    bottom: 5,
    borderRadius: 20,
    transform: [{ scaleX: 1.5 }],
    zIndex: 0,
  },
  // Streak Badge Styles
  streakBadgeContainer: {
    position: 'absolute',
    top: -8,
    right: -12,
    zIndex: 20,
    borderRadius: 20,
    overflow: 'hidden',
    // Sombra sutil
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  streakBadgeBlur: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  streakBadgeContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  streakBadgeText: {
    fontSize: 13,
    fontWeight: '800',
  },
  borderOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 32,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.4)', // Borde de cristal
    zIndex: 20,
  },
});