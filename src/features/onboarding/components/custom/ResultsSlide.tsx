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
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { AppText as Text } from '@/src/components/AppText';
import Animated, {
    Easing,
    FadeInDown,
    SharedValue,
    useAnimatedStyle,
    useSharedValue,
    withDelay,
    withTiming,
} from 'react-native-reanimated';

import type { OnboardingAnswers } from '../../types';

// ============================================
// RESULTS SLIDE
// ============================================
interface Props {
  answers: OnboardingAnswers;
  onNext: () => void;
}

const CATEGORIES = [
  { key: 'focus', label: 'Enfoque', color: '#FF6B6B' },
  { key: 'memory', label: 'Memoria', color: '#4ECDC4' },
  { key: 'organization', label: 'Organización', color: '#FFE66D' },
  { key: 'control', label: 'Control', color: '#A78BFA' },
];

/** Map agreement string answers to numeric score for bars */
function agreementToScore(val: string | null): number {
  switch (val) {
    case 'strongly_agree': return 5;
    case 'somewhat_agree': return 3;
    case 'disagree': return 2;
    case 'strongly_disagree': return 1;
    default: return 3;
  }
}

const ResultsSlide: React.FC<Props> = ({ answers, onNext }) => {
  const userName = answers.userName || 'tu perfil';

  // Derive scores from agreement answers
  const scores = [
    agreementToScore(answers.statement1),
    agreementToScore(answers.statement2),
    agreementToScore(answers.statement3),
    Math.round((agreementToScore(answers.statement1) + agreementToScore(answers.statement3)) / 2),
  ];

  const maxCat = CATEGORIES.reduce(
    (max: { key: string; label: string; color: string; score: number }, cat, idx) =>
      scores[idx] > max.score ? { ...cat, score: scores[idx] } : max,
    { ...CATEGORIES[0], score: scores[0] },
  );

  // Bar height animations
  const barHeights = CATEGORIES.map(() => useSharedValue(0));

  useEffect(() => {
    CATEGORIES.forEach((_, idx) => {
      barHeights[idx].value = withDelay(
        400 + idx * 200,
        withTiming((scores[idx] / 5) * 140, {
          duration: 800,
          easing: Easing.out(Easing.cubic),
        }),
      );
    });
  }, []);

  return (
    <View style={s.container}>
      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Animated.Text entering={FadeInDown.delay(100).duration(400)} style={s.title}>
          ¡Plan de {userName} listo!
        </Animated.Text>
        <Animated.Text entering={FadeInDown.delay(200).duration(400)} style={s.subtitle}>
          Tus áreas de oportunidad
        </Animated.Text>

        {/* Bar chart */}
        <Animated.View entering={FadeInDown.delay(300).duration(500)} style={s.chartContainer}>
          {CATEGORIES.map((cat, idx) => (
            <View key={cat.key} style={s.chartColumn}>
              <Text style={s.chartValue}>{scores[idx]}/5</Text>
              <View style={s.chartBarTrack}>
                <BarFill height={barHeights[idx]} color={cat.color} />
              </View>
              <Text style={s.chartLabel}>{cat.label}</Text>
            </View>
          ))}
        </Animated.View>

        {/* Result card */}
        <Animated.View entering={FadeInDown.delay(700).duration(400)} style={s.resultCard}>
          <Text style={s.resultText}>
            Hemos detectado que tu mayor reto es{' '}
            <Text style={s.resultHighlight}>{maxCat.label}</Text>.
            Tenemos las herramientas exactas para eso.
          </Text>
        </Animated.View>
      </ScrollView>

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
            <Text style={primaryButtonText}>Ver mi solución</Text>
          </LinearGradient>
        </Pressable>
      </View>
    </View>
  );
};

// Animated bar fill sub-component
function BarFill({ height, color }: { height: SharedValue<number>; color: string }) {
  const style = useAnimatedStyle(() => ({
    height: height.value,
    backgroundColor: color,
  }));
  return <Animated.View style={[s.chartBarFill, style]} />;
}

export default ResultsSlide;

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
    paddingHorizontal: 32,
    paddingTop: 40,
    paddingBottom: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
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
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    width: '100%',
    height: 200,
    marginBottom: 32,
    paddingTop: 20,
  },
  chartColumn: {
    alignItems: 'center',
    flex: 1,
  },
  chartValue: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  chartBarTrack: {
    width: 32,
    height: 140,
    backgroundColor: `${colors.textPrimary}0D`,
    borderRadius: 16,
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  chartBarFill: {
    width: '100%',
    borderRadius: 16,
  },
  chartLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    marginTop: 8,
  },
  resultCard: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: `${colors.textPrimary}1A`,
    width: '100%',
  },
  resultText: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.textPrimary,
    lineHeight: 22,
    textAlign: 'center',
  },
  resultHighlight: {
    fontWeight: '800',
    color: colors.primary,
  },
  buttonContainer: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    paddingBottom: 40,
  },
});
