import {
    PRIMARY_GRADIENT_COLORS,
    primaryButtonGradient,
    primaryButtonStyles,
    primaryButtonText,
} from '@/constants/buttons';
import { colors } from '@/constants/theme';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

// ============================================
// PAYWALL SLIDE
// ============================================
interface Props {
  onFinish: () => void;
}

const TIMELINE = [
  { day: 'Hoy', label: 'Acceso total', color: colors.primary },
  { day: 'Día 12', label: 'Recordatorio', color: '#FFE66D' },
  { day: 'Día 14', label: 'Cobro', color: '#FF6B6B' },
];

const PaywallSlide: React.FC<Props> = ({ onFinish }) => {
  const [loading, setLoading] = useState(false);

  const handleStartTrial = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setLoading(true);
    // TODO: Integrate RevenueCat purchasePackage
    setTimeout(() => {
      setLoading(false);
      onFinish();
    }, 1000);
  };

  return (
    <View style={s.container}>
      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeInDown.delay(100).duration(400)} style={s.mascotContainer}>
          <Image
            source={require('@/assets/images/streak.png')}
            style={s.mascot}
            resizeMode="contain"
          />
        </Animated.View>

        <Animated.Text entering={FadeInDown.delay(200).duration(400)} style={s.title}>
          Empieza tu transformación hoy
        </Animated.Text>
        <Animated.Text entering={FadeInDown.delay(300).duration(400)} style={s.subtitle}>
          Prueba Brainy Premium gratis por 14 días.{'\n'}
          Te avisaremos 2 días antes de que termine.
        </Animated.Text>

        {/* Timeline */}
        <Animated.View entering={FadeInDown.delay(450).duration(500)} style={s.timeline}>
          <View style={s.timelineLine} />
          {TIMELINE.map((t, idx) => (
            <View key={idx} style={s.timelineNode}>
              <View style={[s.timelineDot, { backgroundColor: t.color }]} />
              <Text style={s.timelineLabel}>
                {t.day}
                {'\n'}
                <Text style={s.timelineSublabel}>{t.label}</Text>
              </Text>
            </View>
          ))}
        </Animated.View>
      </ScrollView>

      <View style={s.buttonContainer}>
        <Pressable
          onPress={handleStartTrial}
          style={[primaryButtonStyles, loading && { opacity: 0.6 }]}
          disabled={loading}
        >
          <LinearGradient
            colors={PRIMARY_GRADIENT_COLORS}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={primaryButtonGradient}
          >
            <Text style={primaryButtonText}>
              {loading ? 'Procesando...' : 'Iniciar mis 14 días gratis'}
            </Text>
          </LinearGradient>
        </Pressable>

        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onFinish();
          }}
          style={s.skipButton}
        >
          <Text style={s.skipText}>Quizás más tarde (Versión limitada)</Text>
        </Pressable>
      </View>
    </View>
  );
};

export default PaywallSlide;

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
  mascotContainer: {
    marginBottom: 20,
  },
  mascot: {
    width: 100,
    height: 100,
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: 12,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  timeline: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    width: '100%',
    position: 'relative',
    paddingHorizontal: 8,
    marginTop: 8,
  },
  timelineLine: {
    position: 'absolute',
    top: 10,
    left: 30,
    right: 30,
    height: 3,
    backgroundColor: `${colors.textPrimary}1A`,
    borderRadius: 1.5,
  },
  timelineNode: {
    alignItems: 'center',
    flex: 1,
  },
  timelineDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 3,
    borderColor: colors.background,
    marginBottom: 10,
    zIndex: 1,
  },
  timelineLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
    lineHeight: 20,
  },
  timelineSublabel: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  buttonContainer: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    paddingBottom: 40,
    alignItems: 'center',
  },
  skipButton: {
    marginTop: 14,
    paddingVertical: 8,
  },
  skipText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textSecondary,
  },
});
