import { colors } from '@/constants/theme';
import * as Haptics from 'expo-haptics';
import React, { useEffect } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { AppText as Text } from '@/src/components/AppText';
import Animated, {
    Easing,
    FadeInDown,
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withSequence,
    withTiming,
} from 'react-native-reanimated';

// ============================================
// TRIAL REMINDER SLIDE
// ============================================
interface Props {
  onNext: () => void;
}

/** Calculate reminder date (12 days from now) */
function getReminderDate(): string {
  const d = new Date();
  d.setDate(d.getDate() + 12);
  const months = [
    'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
  ];
  return `${d.getDate()} de ${months[d.getMonth()]}`;
}

const TrialReminderSlide: React.FC<Props> = ({ onNext }) => {
  const mascotY = useSharedValue(0);
  const bellRotate = useSharedValue(0);

  useEffect(() => {
    // Floating mascot
    mascotY.value = withRepeat(
      withSequence(
        withTiming(-10, { duration: 1500, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 1500, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      true,
    );
    // Bell wiggle
    bellRotate.value = withRepeat(
      withSequence(
        withTiming(15, { duration: 200, easing: Easing.inOut(Easing.ease) }),
        withTiming(-15, { duration: 200, easing: Easing.inOut(Easing.ease) }),
        withTiming(10, { duration: 150, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 150, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 2000 }), // pause
      ),
      -1,
      false,
    );
  }, []);

  const mascotStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: mascotY.value }],
  }));

  const bellStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${bellRotate.value}deg` }],
  }));

  const reminderDate = getReminderDate();

  // Auto-advance after 4 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onNext();
    }, 4000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={s.container}>
      <View style={s.content}>
        {/* Title */}
        <Animated.Text entering={FadeInDown.delay(100).duration(500)} style={s.title}>
          Te avisaremos{' '}
          <Text style={s.titleHighlight}>2 días antes</Text>
          {' '}de que termine tu prueba
        </Animated.Text>

        {/* Speech bubble notification */}
        <Animated.View entering={FadeInDown.delay(300).duration(500)} style={s.notifBubble}>
          <Text style={s.notifText}>
            Recibirás una notificación el{'\n'}
            <Text style={s.notifDate}>{reminderDate}</Text>
          </Text>
          <View style={s.notifTail} />
        </Animated.View>

        {/* Mascot + bell */}
        <Animated.View
          entering={FadeInDown.delay(400).duration(600)}
          style={[s.mascotArea, mascotStyle]}
        >
          <Image
            source={require('@/assets/images/logomain.png')}
            style={s.mascot}
            resizeMode="contain"
          />
          <Animated.Text style={[s.bell, bellStyle]}>🔔</Animated.Text>
        </Animated.View>
      </View>

      {/* Bottom text */}
      <Animated.Text entering={FadeInDown.delay(600).duration(400)} style={s.bottomText}>
        Fácil de cancelar, sin penalidades ni cargos
      </Animated.Text>
    </View>
  );
};

export default TrialReminderSlide;

// ============================================
// STYLES
// ============================================
const s = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  // ── Title ──
  title: {
    fontSize: 26,
    fontWeight: '900',
    color: colors.textPrimary,
    textAlign: 'center',
    lineHeight: 34,
    letterSpacing: -0.3,
    marginBottom: 28,
  },
  titleHighlight: {
    color: colors.success,
    fontWeight: '900',
  },
  // ── Notification bubble ──
  notifBubble: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    paddingVertical: 18,
    paddingHorizontal: 28,
    borderWidth: 1,
    borderColor: `${colors.textPrimary}1A`,
    alignItems: 'center',
    marginBottom: 0,
  },
  notifText: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.textPrimary,
    textAlign: 'center',
    lineHeight: 22,
  },
  notifDate: {
    fontWeight: '800',
    color: colors.textPrimary,
  },
  notifTail: {
    position: 'absolute',
    bottom: -12,
    width: 0,
    height: 0,
    borderLeftWidth: 12,
    borderRightWidth: 12,
    borderTopWidth: 14,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: colors.surface,
  },
  // ── Mascot ──
  mascotArea: {
    alignItems: 'center',
    marginTop: 16,
  },
  mascot: {
    width: 160,
    height: 160,
  },
  bell: {
    position: 'absolute',
    right: -10,
    bottom: 20,
    fontSize: 36,
  },
  // ── Bottom ──
  bottomText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: 40,
    paddingBottom: 40,
    marginBottom: 10,
  },
});
