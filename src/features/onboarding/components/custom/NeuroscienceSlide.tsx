import { colors } from '@/constants/theme';
import React, { useEffect } from 'react';
import { Dimensions, Image, StyleSheet, Text, View } from 'react-native';
import Animated, {
    Easing,
    FadeInDown,
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withSpring,
    withTiming,
} from 'react-native-reanimated';

const SCREEN_WIDTH = Dimensions.get('window').width;

const NeuroscienceSlide: React.FC = () => {
  const breathingAnim = useSharedValue(0);
  const bubbleScale = useSharedValue(0);

  useEffect(() => {
    // Mascot floating
    breathingAnim.value = withRepeat(
      withTiming(1, { duration: 2500, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
    // Bubble pop-in
    bubbleScale.value = withSpring(1, { damping: 8, stiffness: 100 });
  }, []);

  const mascotStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: breathingAnim.value * -10 },
      { scale: 1 + breathingAnim.value * 0.03 },
    ],
  }));

  const bubbleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: bubbleScale.value }],
  }));

  return (
    <View style={s.slide}>
      {/* Main area: speech bubble + mascot */}
      <View style={s.content}>
        {/* Speech bubble */}
        <Animated.View style={[s.bubbleContainer, bubbleStyle]}>
          <View style={s.bubble}>
            <Text style={s.bubbleText}>
              La neurociencia confirma que lograr{' '}
              <Text style={s.bubbleHighlight}>'micro-victorias'</Text> libera la dopamina
              necesaria para mantener tu motivación.
            </Text>
          </View>
          <View style={s.bubbleTail} />
        </Animated.View>

        {/* Mascot */}
        <Animated.View
          entering={FadeInDown.delay(100).duration(700)}
          style={[s.mascotContainer, mascotStyle]}
        >
          <Image
            source={require('@/assets/images/logomain.png')}
            style={s.mascot}
            resizeMode="contain"
          />
        </Animated.View>
      </View>

      {/* Subtitle — positioned just above the Continuar button area */}
      <Animated.Text entering={FadeInDown.delay(400).duration(500)} style={s.subtitle}>
        Respaldado por investigaciones enfocadas en la Terapia Cognitivo-Conductual (TCC)
      </Animated.Text>
    </View>
  );
};

const s = StyleSheet.create({
  slide: {
    flex: 1,
    paddingHorizontal: 20,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // ── Speech Bubble ──
  bubbleContainer: {
    alignItems: 'center',
    marginBottom: 0,
  },
  bubble: {
    backgroundColor: colors.background,
    borderRadius: 20,
    borderWidth: 2.5,
    borderColor: colors.textRoutineCard,
    paddingHorizontal: 22,
    paddingVertical: 18,
    maxWidth: SCREEN_WIDTH - 80,
    minWidth: SCREEN_WIDTH * 0.6,
  },
  bubbleTail: {
    width: 0,
    height: 0,
    borderLeftWidth: 12,
    borderRightWidth: 12,
    borderTopWidth: 14,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: colors.textRoutineCard,
    marginTop: -1,
  },
  bubbleText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    textAlign: 'center',
    lineHeight: 26,
  },
  bubbleHighlight: {
    fontWeight: '900',
    color: colors.primary,
  },
  // ── Mascot ──
  mascotContainer: {
    alignItems: 'center',
    marginTop: 8,
  },
  mascot: {
    width: 170,
    height: 170,
  },
  // ── Subtitle ──
  subtitle: {
    fontSize: 11,
    fontWeight: '500',
    color: colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: 32,
    lineHeight: 20,
    marginBottom: 2,
  },
});

export default NeuroscienceSlide;
