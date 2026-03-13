import { BlurView } from 'expo-blur';
import { Flame } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming
} from 'react-native-reanimated';
import { useAchievementsStore } from '../store/achievementsStore';

// Static background image map (require() must be static)
const BG_IMAGES: Record<string, any> = {
  bg_spring: require('../../assets/images/pixelbgs/spring.png'),
  bg_beach: require('../../assets/images/pixelbgs/beach.png'),
  bg_autumn: require('../../assets/images/pixelbgs/autumm.png'),
  bg_winter: require('../../assets/images/pixelbgs/winter.png'),
  bg_woods: require('../../assets/images/pixelbgs/woods.png'),
};

const DEFAULT_BG = require('../../assets/images/pixelbgs/spring.png');

const FLAME_ACTIVE_COLOR = '#FF6B6B';
const FLAME_INACTIVE_COLOR = '#94A3B8';

interface FocusHeroCardProps {
  currentStreak?: number;
  isStreakActiveToday?: boolean;
}

export function FocusHeroCard({ 
  currentStreak = 0, 
  isStreakActiveToday = false 
}: FocusHeroCardProps) {
  const flameScale = useSharedValue(1);
  const mascotY = useSharedValue(0);
  const [showBubble, setShowBubble] = useState(false);
  const activeBackground = useAchievementsStore((s) => s.activeBackground);

  // Resolve background image source
  const bgSource = activeBackground && BG_IMAGES[activeBackground]
    ? BG_IMAGES[activeBackground]
    : DEFAULT_BG;

  // Animación de "Fuego Vivo" para el streak badge
  useEffect(() => {
    if (isStreakActiveToday) {
      flameScale.value = withRepeat(
        withSequence(
          withTiming(1.2, { duration: 600, easing: Easing.inOut(Easing.ease) }),
          withTiming(1, { duration: 600, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      );
    } else {
      flameScale.value = withTiming(1, { duration: 300 });
    }
  }, [isStreakActiveToday]);

  // Floating mascot animation
  useEffect(() => {
    mascotY.value = withRepeat(
      withSequence(
        withTiming(-6, { duration: 2000, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 2000, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      true
    );
  }, []);

  // Speech bubble: show after 5s, hide after 8s
  useEffect(() => {
    const showTimer = setTimeout(() => setShowBubble(true), 5000);
    const hideTimer = setTimeout(() => setShowBubble(false), 13000);
    return () => {
      clearTimeout(showTimer);
      clearTimeout(hideTimer);
    };
  }, []);

  const flameAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: flameScale.value }],
  }));

  const mascotAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: mascotY.value }],
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
    <View style={styles.container}>
      {/* --- FONDO: Imagen pixel art --- */}
      <Image
        source={bgSource}
        style={styles.backgroundImage}
        resizeMode="cover"
      />

      {/* --- CONTENIDO: Mascota centrada + Burbuja arriba --- */}
      <View style={styles.contentContainer}>
        {/* Speech Bubble - positioned above mascot */}
        {showBubble && (
          <Animated.View
            entering={FadeIn.duration(400).springify()}
            exiting={FadeOut.duration(300)}
            style={styles.bubbleWrapper}
          >
            <Pressable
              style={styles.speechBubble}
              onPress={() => {
                // TODO: abrir tip diario
              }}
            >
              <Text style={styles.speechBubbleText}>
                ¡Hey! Tócame para leer tu tip diario  {'\n'}  para  ayudarte a lidiar con el TDAH.
              </Text>
              <View style={styles.speechBubbleTail} />
            </Pressable>
          </Animated.View>
        )}

        <Animated.View style={[styles.mascotWrapper, mascotAnimatedStyle]}>
          <Image
            source={require('../../assets/images/logomain.png')}
            style={styles.mascot}
            resizeMode="contain"
          />
          <View style={styles.mascotShadow} />
          <StreakBadge />
        </Animated.View>
      </View>
      
      {/* Borde sutil */}
      <View style={styles.borderOverlay} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 4,
    height: 160,
    borderRadius: 32,
    overflow: 'hidden',
    backgroundColor: '#4A7C59',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 10,
  },
  backgroundImage: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  contentContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mascotWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  mascot: {
    width: 110,
    height: 110,
    zIndex: 10,
  },
  mascotShadow: {
    position: 'absolute',
    width: 60,
    height: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.15)',
    bottom: -2,
    borderRadius: 30,
    transform: [{ scaleX: 1.5 }],
    zIndex: 0,
  },
  // Speech Bubble - positioned absolutely above the mascot
  bubbleWrapper: {
    position: 'absolute',
    top: 8,
    right: 16,
    left: 16,
    zIndex: 30,
  },
  speechBubble: {
    backgroundColor: 'rgba(255, 255, 255, 0.72)',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 8,
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  speechBubbleText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#1E1E2E',
    lineHeight: 16,
    textAlign: 'center',
  },
  speechBubbleTail: {
    position: 'absolute',
    bottom: -7,
    alignSelf: 'center',
    left: '50%',
    marginLeft: -6,
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 7,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: 'rgba(255, 255, 255, 0.72)',
  },
  // Streak Badge
  streakBadgeContainer: {
    position: 'absolute',
    top: -4,
    right: -12,
    zIndex: 20,
    borderRadius: 20,
    overflow: 'hidden',
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
    borderColor: 'rgba(255, 255, 255, 0.2)',
    zIndex: 20,
  },
});