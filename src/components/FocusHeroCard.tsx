import { BlurView } from 'expo-blur';
import { Flame } from 'lucide-react-native';
import React, { useEffect, useRef } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,

  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming
} from 'react-native-reanimated';
import { useAchievementsStore } from '../store/achievementsStore';

// Static background image map (require() must be static)
export const BG_IMAGES: Record<string, any> = {
  bg_spring: require('../../assets/images/pixelbgs/spring.png'),
  bg_beach:  require('../../assets/images/pixelbgs/beach.png'),
  bg_autumn: require('../../assets/images/pixelbgs/autumm.png'),
  bg_winter: require('../../assets/images/pixelbgs/winter.png'),
  bg_woods:  require('../../assets/images/pixelbgs/woods.png'),
  // nuevos WebP
  bg_w1:  require('../../assets/images/pixelbgs/1.webp'),
  bg_w2:  require('../../assets/images/pixelbgs/2.webp'),
  bg_w3:  require('../../assets/images/pixelbgs/3.webp'),
  bg_w4:  require('../../assets/images/pixelbgs/4.webp'),
  bg_w5:  require('../../assets/images/pixelbgs/5.webp'),
  bg_w6:  require('../../assets/images/pixelbgs/6.webp'),
  bg_w7:  require('../../assets/images/pixelbgs/7.webp'),
  bg_w8:  require('../../assets/images/pixelbgs/8.webp'),
  bg_w9:  require('../../assets/images/pixelbgs/9.webp'),
  bg_w10: require('../../assets/images/pixelbgs/10.webp'),
};

const OUTFIT_IMAGES: Record<string, any> = {
  outfit_1_1: require('../../assets/images/outfits/1_1.png'),
  outfit_1_2: require('../../assets/images/outfits/1_2.png'),
  outfit_1_3: require('../../assets/images/outfits/1_3.png'),
  outfit_1_4: require('../../assets/images/outfits/1_4.png'),
  // nuevos WebP
  outfit_w5:  require('../../assets/images/outfits/5.webp'),
  outfit_w6:  require('../../assets/images/outfits/6.webp'),
  outfit_w7:  require('../../assets/images/outfits/7.webp'),
  outfit_w8:  require('../../assets/images/outfits/8.webp'),
  outfit_w9:  require('../../assets/images/outfits/9.webp'),
  outfit_w10: require('../../assets/images/outfits/10.webp'),
  outfit_w11: require('../../assets/images/outfits/11.webp'),
  outfit_w12: require('../../assets/images/outfits/12.webp'),
  outfit_w13: require('../../assets/images/outfits/13.webp'),
  outfit_w14: require('../../assets/images/outfits/14.webp'),
};

export const DEFAULT_BG = require('../../assets/images/pixelbgs/spring.png');

const FLAME_ACTIVE_COLOR = '#FF6B6B';
const FLAME_INACTIVE_COLOR = '#94A3B8';

interface FocusHeroCardProps {
  currentStreak?: number;
  isStreakActiveToday?: boolean;
  onTripleTap?: () => void;
}

export function FocusHeroCard({ 
  currentStreak = 0, 
  isStreakActiveToday = false,
  onTripleTap,
}: FocusHeroCardProps) {
  const flameScale = useSharedValue(1);
  const mascotY = useSharedValue(0);
  const tapCountRef = useRef(0);
  const tapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { activeBackground, activeOutfit } = useAchievementsStore();

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
      {/* --- CONTENIDO: Mascota centrada + Burbuja arriba --- */}
      <View style={styles.contentContainer}>

        <Pressable
          onPress={() => {
            if (!onTripleTap) return;
            tapCountRef.current += 1;
            if (tapTimerRef.current) clearTimeout(tapTimerRef.current);
            tapTimerRef.current = setTimeout(() => {
              tapCountRef.current = 0;
            }, 1000);
            if (tapCountRef.current >= 3) {
              tapCountRef.current = 0;
              if (tapTimerRef.current) clearTimeout(tapTimerRef.current);
              onTripleTap();
            }
          }}
          style={{ alignItems: 'center', justifyContent: 'center' }}
        >
          <Animated.View style={[styles.mascotWrapper, mascotAnimatedStyle]}>
            {activeOutfit && OUTFIT_IMAGES[activeOutfit] ? (
              <Image
                source={OUTFIT_IMAGES[activeOutfit]}
                style={styles.mascot}
                resizeMode="contain"
              />
            ) : (
              <Image
                source={require('../../assets/images/logomain.png')}
                style={styles.mascot}
                resizeMode="contain"
              />
            )}
            <View style={styles.mascotShadow} />
            <StreakBadge />
          </Animated.View>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 4,
    height: 160,
    overflow: 'hidden',
    backgroundColor: 'transparent',
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
  mascotOutfit: {
    width: 110,
    height: 110,
    position: 'absolute',
    top: 0,
    left: 0,
    zIndex: 11,
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
});