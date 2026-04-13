import {
    PRIMARY_GRADIENT_COLORS,
    primaryButtonGradient,
    primaryButtonStyles,
    primaryButtonText,
} from '@/constants/buttons';
import { colors } from '@/constants/theme';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
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
    withTiming,
} from 'react-native-reanimated';

// ============================================
// PREMIUM BENEFITS SLIDE — Comparison table
// ============================================

const FEATURES = [
  { label: 'Organizar tareas', free: true, premium: true },
  { label: 'Rutinas ilimitadas', free: false, premium: true },
  { label: 'Sin anuncios', free: false, premium: true },
  { label: 'IA para TDAH', free: false, premium: true },
  { label: 'Recordatorios inteligentes', free: false, premium: true },
];

interface Props {
  onNext: () => void;
}

const PremiumBenefitsSlide: React.FC<Props> = ({ onNext }) => {
  const mascotY = useSharedValue(0);

  useEffect(() => {
    mascotY.value = withRepeat(
      withSequence(
        withTiming(-8, { duration: 1500, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 1500, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      true,
    );
  }, []);

  const mascotStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: mascotY.value }],
  }));

  return (
    <View style={s.container}>
      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero section with gradient bg */}
        <LinearGradient
          colors={[colors.background, colors.surface, colors.background]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={s.heroSection}
        >
          <Animated.Text entering={FadeInDown.delay(100).duration(400)} style={s.title}>
            Usuarios Brainy tienen{' '}
            <Text style={s.titleHighlight}>4.2x</Text> más probabilidad de
            mantener sus hábitos
          </Animated.Text>

          {/* Mascot */}
          <Animated.View
            entering={FadeInDown.delay(200).duration(500)}
            style={[s.mascotContainer, mascotStyle]}
          >
            <Image
              source={require('@/assets/images/logomain.png')}
              style={s.mascot}
              resizeMode="contain"
            />
          </Animated.View>
        </LinearGradient>

        {/* Comparison table */}
        <View style={s.tableContainer}>
          {/* Column headers */}
          <Animated.View entering={FadeInDown.delay(300).duration(400)} style={s.headerRow}>
            <View style={s.featureLabelCol} />
            <View style={s.colHeader}>
              <Text style={s.colHeaderText}>Otras{'\n'}Apps</Text>
            </View>
            <View style={[s.colHeader, s.colHeaderPremium]}>
              <LinearGradient
                colors={[colors.primary, colors.accent]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={s.premiumBadge}
              >
                <Text style={s.premiumBadgeText}>Brainy</Text>
              </LinearGradient>
            </View>
          </Animated.View>

          {/* Feature rows */}
          {FEATURES.map((feature, idx) => (
            <FeatureRow
              key={feature.label}
              label={feature.label}
              free={feature.free}
              premium={feature.premium}
              delay={400 + idx * 80}
              isLast={idx === FEATURES.length - 1}
            />
          ))}
        </View>
      </ScrollView>

      {/* Button */}
      <View style={s.buttonContainer}>
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            onNext();
          }}
          style={primaryButtonStyles}
        >
          <LinearGradient
            colors={PRIMARY_GRADIENT_COLORS}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={primaryButtonGradient}
          >
            <Text style={primaryButtonText}>Continuar</Text>
          </LinearGradient>
        </Pressable>
      </View>
    </View>
  );
};

// ── Feature row with animation ──
function FeatureRow({
  label,
  free,
  premium,
  delay,
  isLast,
}: {
  label: string;
  free: boolean;
  premium: boolean;
  delay: number;
  isLast: boolean;
}) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(14);

  useEffect(() => {
    opacity.value = withDelay(
      delay,
      withTiming(1, { duration: 350, easing: Easing.out(Easing.cubic) }),
    );
    translateY.value = withDelay(
      delay,
      withTiming(0, { duration: 350, easing: Easing.out(Easing.cubic) }),
    );
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View style={[s.featureRow, !isLast && s.featureRowBorder, animStyle]}>
      <Text style={s.featureLabel}>{label}</Text>
      <View style={s.featureCheckCol}>
        {free ? (
          <Text style={s.checkFree}>✓</Text>
        ) : (
          <Text style={s.dash}>—</Text>
        )}
      </View>
      <View style={s.featureCheckCol}>
        <View style={s.checkPremiumCircle}>
          <Text style={s.checkPremium}>✓</Text>
        </View>
      </View>
    </Animated.View>
  );
}

export default PremiumBenefitsSlide;

// ============================================
// STYLES
// ============================================
const s = StyleSheet.create({
  container: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 10,
  },
  // ── Hero ──
  heroSection: {
    paddingTop: 24,
    paddingBottom: 20,
    alignItems: 'center',
    paddingHorizontal: 28,
  },
  title: {
    fontSize: 24,
    fontWeight: '900',
    color: colors.textPrimary,
    textAlign: 'center',
    lineHeight: 32,
    letterSpacing: -0.3,
    marginBottom: 16,
  },
  titleHighlight: {
    color: colors.success,
    fontSize: 28,
    fontWeight: '900',
  },
  mascotContainer: {
    alignItems: 'center',
  },
  mascot: {
    width: 130,
    height: 130,
  },
  // ── Table ──
  tableContainer: {
    paddingHorizontal: 24,
    paddingTop: 8,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 8,
    paddingBottom: 12,
  },
  featureLabelCol: {
    flex: 1,
  },
  colHeader: {
    width: 70,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  colHeaderText: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.textPrimary,
    textAlign: 'center',
    lineHeight: 18,
  },
  colHeaderPremium: {
    width: 70,
  },
  premiumBadge: {
    borderRadius: 10,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  premiumBadgeText: {
    fontSize: 13,
    fontWeight: '900',
    color: colors.background,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  // ── Rows ──
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
  },
  featureRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: `${colors.textPrimary}12`,
  },
  featureLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  featureCheckCol: {
    width: 70,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkFree: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  dash: {
    fontSize: 18,
    fontWeight: '400',
    color: `${colors.textPrimary}33`,
  },
  checkPremiumCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: `${colors.primary}20`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkPremium: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.primary,
  },
  // ── Button ──
  buttonContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingBottom: 40,
  },
});
