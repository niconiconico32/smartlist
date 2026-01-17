import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useState } from 'react';
import { Dimensions, Image, StyleSheet, Text, View } from 'react-native';
import Animated, {
    Easing,
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withTiming
} from 'react-native-reanimated';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const PHRASES = [
  'Tu cerebro es para crear, no para almacenar. Nosotros guardamos el plan.',
  'Al escribirlo aquí, liberas RAM mental para lo que importa: Ejecutar.',
  'Protegemos tu memoria de trabajo: una tarea a la vez, cero ruido.',
  'Hackeamos tu parálisis: dividimos la montaña en piedras que sí puedes mover.',
  'La inercia se rompe con micro-pasos. La ciencia de lo pequeño funciona.',
  'No luches contra el reloj, visualízalo. El control vuelve a ti.',
];

interface FocusHeroCardProps {
  completedToday?: number;
  totalToday?: number;
}

export function FocusHeroCard({ completedToday = 0, totalToday = 0 }: FocusHeroCardProps) {
  const scale = useSharedValue(1);
  const fadeAnim = useSharedValue(0);
  const [currentPhraseIndex, setCurrentPhraseIndex] = useState(0);

  // Breathing Effect Animation
  useEffect(() => {
    scale.value = withRepeat(
      withTiming(1.02, {
        duration: 2000,
        easing: Easing.inOut(Easing.ease),
      }),
      -1,
      true // Reverse at the end
    );
  }, [scale]);

  // Phrase rotation with fade animation
  useEffect(() => {
    // Start fade in
    fadeAnim.value = withTiming(1, { duration: 500, easing: Easing.inOut(Easing.ease) });

    // Set timer to change phrase
    const phraseTimer = setTimeout(() => {
      setCurrentPhraseIndex((prev) => (prev + 1) % PHRASES.length);
      fadeAnim.value = 0; // Reset for next fade in
    }, 5000); // Show each phrase for 5 seconds

    return () => clearTimeout(phraseTimer);
  }, [currentPhraseIndex, fadeAnim]);

  // Animated style for breathing effect
  const animatedContainerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  // Animated style for text fade
  const animatedTextStyle = useAnimatedStyle(() => ({
    opacity: fadeAnim.value,
  }));

  return (
    <Animated.View style={[styles.container, animatedContainerStyle]}>
      <LinearGradient
        colors={['#CBA6F7', '#FAB387']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        {/* Content */}
        <View style={styles.content}>
          {/* Left: Rotating Phrases */}
          <Animated.View style={[styles.textContainer, animatedTextStyle]}>
            <Text style={styles.title}>{PHRASES[currentPhraseIndex]}</Text>
          </Animated.View>

          {/* Right: Logo */}
          <View style={styles.logoContainer}>
            <Image
              source={require('../../assets/images/logomain.png')}
              style={styles.logo}
              resizeMode="contain"
            />
          </View>
        </View>
      </LinearGradient>
      
      {/* Fade out gradient at the bottom */}
      <LinearGradient
        colors={['rgba(0, 0, 0, 0.3)', 'rgba(0, 0, 0, 0)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={styles.fadeOutGradient}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 1,
    marginVertical: 12,
    borderRadius: 33, // rounded-3xl
    overflow: 'hidden',
    // Shadow for iOS
    shadowColor: '#CBA6F7',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    // Shadow for Android
    elevation: 8,
  },
  gradient: {
    paddingHorizontal: 24,
    paddingVertical: 28,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 140,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  textContainer: {
    flex: 1,
    paddingRight: 10,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E1E2E',
    letterSpacing: -0.3,
    lineHeight: 24,
  },
  logoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 96,
    height: 96,
  },
  fadeOutGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 40,
    borderBottomLeftRadius: 33,
    borderBottomRightRadius: 33,
  },
});

export default FocusHeroCard;
