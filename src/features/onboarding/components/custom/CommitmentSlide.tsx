import { colors } from '@/constants/theme';
import { AppText as Text } from '@/src/components/AppText';
import * as Haptics from 'expo-haptics';
import { Check } from 'lucide-react-native';
import React, { useState } from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { slideStyles } from '../../styles/shared';

// ============================================
// COMMITMENT SLIDE
// ============================================
const COMMITMENTS = [
  'Prometo ser amable conmigo mismo/a si fallo un día.',
  'Dedicaré al menos 2 minutos al día a revisar mis tareas y rutinas.',
  'Confío en que mi cerebro puede aprender nuevos hábitos.',
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
        {/* Logo */}
        <Animated.View entering={FadeInDown.delay(50).duration(400)} style={s.logoContainer}>
          <Image source={require('@/assets/images/brainysign.png')} style={s.logo} resizeMode="contain" />
        </Animated.View>

        {/* Header */}
        <Animated.View
          entering={FadeInDown.delay(100).duration(500)}
        >
          <Text style={[slideStyles.slideTitle, s.titleOverride]}>
            {'un pequeño trato '}{'\n'}
            <Text style={{ color: colors.primary }}>entre nosotros</Text>
          </Text>
        </Animated.View>
        <Animated.Text
          entering={FadeInDown.delay(200).duration(500)}
          style={[slideStyles.slideSubtitle, s.subtitleOverride]}
        >
          acepta cada compromiso para finalizar.
        </Animated.Text>

        {/* Staggered checklist */}
        <View style={s.checklistContainer}>
          {COMMITMENTS.map((text, idx) => {
            const isVisible = idx === 0 || checked[idx - 1];
            if (!isVisible) return null;

            return (
              <Animated.View
                key={idx}
                entering={FadeInUp.delay(idx === 0 ? 350 : 100).duration(400)}
              >
                <Pressable
                  onPress={() => toggleCheck(idx)}
                  style={[s.commitRow, checked[idx] && s.commitRowActive]}
                >
                  <View style={[s.checkbox, checked[idx] && s.checkboxActive]}>
                    {checked[idx] && <Check size={14} color={colors.surface} strokeWidth={3} />}
                  </View>
                  <Text style={[s.commitText, checked[idx] && s.commitTextActive]}>
                    {text}
                  </Text>
                </Pressable>
              </Animated.View>
            );
          })}
        </View>
      </View>

      {/* Button */}
      <View style={s.buttonContainer}>
        <Pressable
          onPress={() => {
            if (!allChecked) return;
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            onNext();
          }}
          style={[s.button, !allChecked && s.buttonDisabled]}
          disabled={!allChecked}
        >
          <Text style={s.buttonText}>
            {allChecked ? 'Firmar compromiso ✍️' : 'Acepta todos los compromisos'}
          </Text>
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
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  titleOverride: {
    color: '#f2f2f2',
    textAlign: 'left',
    marginBottom: 8,
  },
  subtitleOverride: {
    color: '#f2f2f2',
    textAlign: 'left',
    textTransform: 'none',
    marginBottom: 36,
  },
  logoContainer: {
    marginBottom: 20,
  },
  logo: {
    width: 90,
    height: 90,
  },
  checklistContainer: {
    gap: 14,
  },
  commitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 20,
    padding: 18,
    gap: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  commitRowActive: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderColor: 'rgba(255,255,255,0.35)',
  },
  checkbox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  checkboxActive: {
    backgroundColor: '#FFFFFF',
    borderColor: '#FFFFFF',
  },
  commitText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.75)',
    lineHeight: 22,
  },
  commitTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  buttonContainer: {
    paddingHorizontal: 24,
    paddingBottom: 40,
    paddingTop: 16,
  },
  button: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 18,
    borderRadius: 30,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 6,
  },
  buttonDisabled: {
    opacity: 0.45,
  },
  buttonText: {
    color: colors.surface,
    fontSize: 17,
    fontWeight: '800',
  },
});
