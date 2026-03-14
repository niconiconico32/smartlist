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
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';

// ============================================
// COMMITMENT SLIDE
// ============================================
const COMMITMENTS = [
  'Prometo ser amable conmigo mismo/a si fallo un día.',
  'Dedicaré al menos 2 minutos al día a revisar mi plan.',
  'Confío en que mi cerebro puede aprender nuevas rutas.',
];

interface Props {
  onNext: () => void;
}

const CommitmentSlide: React.FC<Props> = ({ onNext }) => {
  const [checked, setChecked] = useState<boolean[]>(COMMITMENTS.map(() => false));
  const allChecked = checked.every(Boolean);

  const toggleCheck = (idx: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setChecked((prev) => prev.map((v, i) => (i === idx ? !v : v)));
  };

  return (
    <View style={s.container}>
      <View style={s.contentArea}>
        <Animated.Text entering={FadeInDown.delay(100).duration(400)} style={s.title}>
          Un pequeño trato entre tú y yo
        </Animated.Text>
        <Animated.Text entering={FadeInDown.delay(200).duration(400)} style={s.subtitle}>
          Estos compromisos harán toda la diferencia.
        </Animated.Text>

        {COMMITMENTS.map((text, idx) => (
          <Animated.View key={idx} entering={FadeInUp.delay(350 + idx * 120).duration(400)}>
            <Pressable onPress={() => toggleCheck(idx)} style={s.commitRow}>
              <View style={[s.checkbox, checked[idx] && s.checkboxActive]}>
                {checked[idx] && <Text style={s.checkmark}>✓</Text>}
              </View>
              <Text style={s.commitText}>{text}</Text>
            </Pressable>
          </Animated.View>
        ))}
      </View>

      <View style={s.buttonContainer}>
        <Pressable
          onPress={() => {
            if (!allChecked) return;
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
            onNext();
          }}
          style={[primaryButtonStyles, { opacity: allChecked ? 1 : 0.4 }]}
          disabled={!allChecked}
        >
          <LinearGradient
            colors={PRIMARY_GRADIENT_COLORS}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={primaryButtonGradient}
          >
            <Text style={primaryButtonText}>Firmar compromiso ✍️</Text>
          </LinearGradient>
        </Pressable>
      </View>
    </View>
  );
};

export default CommitmentSlide;

// ============================================
// STYLES
// ============================================
const s = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentArea: {
    flex: 1,
    paddingHorizontal: 32,
    paddingTop: 60,
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
  commitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: `${colors.textPrimary}0D`,
    gap: 14,
  },
  checkbox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: `${colors.textPrimary}33`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  checkmark: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.background,
  },
  commitText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: colors.textPrimary,
    lineHeight: 22,
  },
  buttonContainer: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    paddingBottom: 40,
  },
});
