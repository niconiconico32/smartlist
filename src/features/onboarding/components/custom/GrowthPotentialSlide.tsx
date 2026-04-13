import {
    PRIMARY_GRADIENT_COLORS,
    primaryButtonGradient,
    primaryButtonStyles,
    primaryButtonText,
} from '@/constants/buttons';
import { colors } from '@/constants/theme';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { Brain, Sparkles, Zap } from 'lucide-react-native';
import React, { useEffect } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { AppText as Text } from '@/src/components/AppText';
import Animated, {
    Easing,
    FadeInDown,
    useAnimatedStyle,
    useSharedValue,
    withDelay,
    withRepeat,
    withSequence,
    withSpring,
    withTiming,
} from 'react-native-reanimated';

// ============================================
// GROWTH BAR (internal)
// ============================================
interface GrowthBarProps {
  label: string;
  value: number;
  maxValue: number;
  isPotential?: boolean;
  delay: number;
}

const GrowthBar: React.FC<GrowthBarProps> = ({ value, maxValue, isPotential = false, delay }) => {
  const barHeight = useSharedValue(0);
  const glowOpacity = useSharedValue(0);
  const targetHeight = (value / maxValue) * 160;

  useEffect(() => {
    barHeight.value = withDelay(delay, withSpring(targetHeight, { damping: 12, stiffness: 80 }));
    if (isPotential) {
      glowOpacity.value = withDelay(
        delay + 400,
        withRepeat(
          withSequence(withTiming(0.8, { duration: 1500 }), withTiming(0.3, { duration: 1500 })),
          -1,
          true,
        ),
      );
    }
  }, []);

  const barStyle = useAnimatedStyle(() => ({ height: barHeight.value }));
  const glowStyle = useAnimatedStyle(() => ({ opacity: glowOpacity.value }));

  return (
    <View style={s.barWrapper}>
      <View style={s.barContainer}>
        {isPotential ? (
          <>
            <Animated.View style={[s.barGlow, glowStyle, { height: targetHeight }]} />
            <Animated.View style={[s.barAnimated, barStyle]}>
              <LinearGradient
                colors={['#FF9A9E', '#FECFEF', '#D4A5FF']}
                start={{ x: 0, y: 1 }}
                end={{ x: 0, y: 0 }}
                style={s.barGradient}
              />
            </Animated.View>
          </>
        ) : (
          <Animated.View style={[s.barAnimated, barStyle]}>
            <View style={s.barDimmed} />
          </Animated.View>
        )}
      </View>
    </View>
  );
};

// ============================================
// GROWTH POTENTIAL SLIDE
// ============================================
interface Props {
  onNext: () => void;
}

const GrowthPotentialSlide: React.FC<Props> = ({ onNext }) => {
  const mascotY = useSharedValue(0);
  const buttonScale = useSharedValue(1);

  useEffect(() => {
    mascotY.value = withRepeat(
      withSequence(
        withTiming(-8, { duration: 2000, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 2000, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      true,
    );
  }, []);

  const mascotStyle = useAnimatedStyle(() => ({ transform: [{ translateY: mascotY.value }] }));
  const buttonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }],
  }));

  const handleButtonPressIn = () => {
    buttonScale.value = withSpring(0.96, { damping: 10, stiffness: 300 });
  };
  const handleButtonPressOut = () => {
    buttonScale.value = withSpring(1, { damping: 10, stiffness: 300 });
  };

  return (
    <ScrollView
      style={s.scroll}
      contentContainerStyle={s.container}
      showsVerticalScrollIndicator={false}
    >
      <Animated.Text entering={FadeInDown.delay(100).duration(500)} style={s.title}>
        Tu Potencial Desbloqueable
      </Animated.Text>

      <Animated.Text entering={FadeInDown.delay(200).duration(500)} style={s.subtitle}>
        Mira lo que puedes lograr con el sistema correcto
      </Animated.Text>

      <Animated.View entering={FadeInDown.delay(300).duration(600)} style={s.chartContainer}>
        <View style={s.barsRow}>
          <View style={s.barColumnActual}>
            <Text style={s.barValueActual}>35%</Text>
            <GrowthBar label="Actual" value={35} maxValue={100} delay={400} />
            <Text style={s.barLabel}>Actual</Text>
          </View>
          <View style={s.barColumnPotential}>
            <Text style={s.barValuePotentialTop}>+85%</Text>
            <GrowthBar label="Con Brainy" value={100} maxValue={100} isPotential delay={700} />
            <Text style={[s.barLabel, s.barLabelPotential]}>Con Brainy</Text>
          </View>
        </View>
        <Animated.View style={[s.mascotContainer, mascotStyle]}>
          <Image
            source={require('@/assets/images/logomain.png')}
            style={s.mascot}
            resizeMode="contain"
          />
          <Text style={s.mascotSpeech}>¡Tu potencial es enorme!</Text>
        </Animated.View>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(500).duration(500)} style={s.statsContainer}>
        {/* Stat card 1 */}
        <View style={s.statCard}>
          <LinearGradient
            colors={[`${colors.success}26`, `${colors.success}0D`]}
            style={s.statCardGradient}
          >
            <View style={s.statCardHeader}>
              <View style={[s.statIconBg, { backgroundColor: `${colors.success}40` }]}>
                <Sparkles size={18} color={colors.success} strokeWidth={2} />
              </View>
              <Text style={s.statCardTitle}>Margen de Mejora</Text>
              <View style={s.statBadge}>
                <Text style={s.statBadgeText}>ALTO</Text>
              </View>
            </View>
            <Text style={s.statCardDescription}>
              Tu mente creativa solo necesita la estructura correcta para brillar.
            </Text>
          </LinearGradient>
        </View>

        {/* Stat card 2 */}
        <View style={s.statCard}>
          <LinearGradient
            colors={[`${colors.primary}26`, `${colors.primary}0D`]}
            style={s.statCardGradient}
          >
            <View style={s.statCardHeader}>
              <View style={[s.statIconBg, { backgroundColor: `${colors.primary}40` }]}>
                <Zap size={18} color={colors.primary} strokeWidth={2} />
              </View>
              <Text style={s.statCardTitle}>Productividad Estimada</Text>
              <View style={[s.statBadge, { backgroundColor: `${colors.primary}33` }]}>
                <Text style={[s.statBadgeText, { color: colors.primary }]}>+3x</Text>
              </View>
            </View>
            <Text style={s.statCardDescription}>
              Usuarios similares triplican su productividad en 4 semanas.
            </Text>
          </LinearGradient>
        </View>

        {/* Stat card 3 */}
        <View style={s.statCard}>
          <LinearGradient
            colors={[`${colors.accent}26`, `${colors.accent}0D`]}
            style={s.statCardGradient}
          >
            <View style={s.statCardHeader}>
              <View style={[s.statIconBg, { backgroundColor: `${colors.accent}40` }]}>
                <Brain size={18} color={colors.accent} strokeWidth={2} />
              </View>
              <Text style={s.statCardTitle}>Claridad Mental</Text>
              <View style={[s.statBadge, { backgroundColor: `${colors.accent}33` }]}>
                <Text style={[s.statBadgeText, { color: colors.accent }]}>ALTA</Text>
              </View>
            </View>
            <Text style={s.statCardDescription}>
              Reduce el ruido mental y enfócate en lo que realmente importa.
            </Text>
          </LinearGradient>
        </View>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(700).duration(500)} style={s.buttonContainer}>
        <Animated.View style={buttonAnimatedStyle}>
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              onNext();
            }}
            onPressIn={handleButtonPressIn}
            onPressOut={handleButtonPressOut}
            style={primaryButtonStyles}
          >
            <LinearGradient
              colors={PRIMARY_GRADIENT_COLORS}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={primaryButtonGradient}
            >
              <Text style={primaryButtonText}>Empezar mi Transformación</Text>
            </LinearGradient>
          </Pressable>
        </Animated.View>
      </Animated.View>
    </ScrollView>
  );
};

const s = StyleSheet.create({
  scroll: { flex: 1 },
  container: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: '900',
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 32,
  },
  chartContainer: {
    backgroundColor: `${colors.surface}80`,
    borderRadius: 24,
    padding: 24,
    marginBottom: 24,
    position: 'relative',
  },
  barsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-end',
    gap: 40,
  },
  barColumnActual: {
    alignItems: 'center',
    justifyContent: 'flex-end',
    height: 220,
  },
  barColumnPotential: {
    alignItems: 'center',
    justifyContent: 'flex-end',
    height: 220,
  },
  barWrapper: { alignItems: 'center', width: 70 },
  barContainer: {
    width: 60,
    height: 160,
    justifyContent: 'flex-end',
    alignItems: 'center',
    position: 'relative',
  },
  barAnimated: { width: 60, borderRadius: 12, overflow: 'hidden' },
  barGradient: { flex: 1, borderRadius: 12 },
  barDimmed: { flex: 1, backgroundColor: `${colors.textPrimary}26`, borderRadius: 12 },
  barGlow: {
    position: 'absolute',
    bottom: 0,
    left: -5,
    width: 70,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 154, 158, 0.3)',
  },
  barLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 12,
  },
  barLabelPotential: { color: colors.textPrimary },
  barValueActual: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: -95,
  },
  barValuePotentialTop: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FF9A9E',
    textAlign: 'center',
    marginBottom: 8,
  },
  mascotContainer: {
    position: 'absolute',
    right: 10,
    top: 20,
    alignItems: 'center',
  },
  mascot: { width: 70, height: 70 },
  mascotSpeech: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.warning,
    maxWidth: 80,
    justifyContent: 'center',
    textAlign: 'center',
  },
  statsContainer: { gap: 12, marginBottom: 24 },
  statCard: { borderRadius: 16, overflow: 'hidden' },
  statCardGradient: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: `${colors.textPrimary}14`,
  },
  statCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  statIconBg: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statCardTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  statBadge: {
    backgroundColor: `${colors.success}33`,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.success,
  },
  statCardDescription: {
    fontSize: 13,
    fontWeight: '400',
    color: colors.textSecondary,
    lineHeight: 18,
    marginLeft: 42,
  },
  buttonContainer: { marginTop: 8 },
});

export default GrowthPotentialSlide;
