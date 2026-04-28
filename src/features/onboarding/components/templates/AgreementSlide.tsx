import { colors } from '@/constants/theme';
import { AppText as Text } from '@/src/components/AppText';
import * as Haptics from 'expo-haptics';
import { Check } from 'lucide-react-native';
import React from 'react';
import { Image, Pressable, ScrollView, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { AGREEMENT_OPTIONS } from '../../constants';
import { layoutStyles, slideStyles } from '../../styles/shared';
import { AgreementSlideConfig, OnboardingAnswers, StatementData } from '../../types';

interface Props {
  config: AgreementSlideConfig;
  answers: OnboardingAnswers;
  onAnswer: <K extends keyof OnboardingAnswers>(key: K, value: OnboardingAnswers[K]) => void;
  onNext: () => void;
  statement: StatementData;
}

const AgreementSlide: React.FC<Props> = ({ config, answers, onAnswer, onNext, statement }) => {
  const selected = answers[config.answerKey!] as string | null;

  return (
    <ScrollView
      style={layoutStyles.slideScroll}
      contentContainerStyle={layoutStyles.slideScrollContent}
      showsVerticalScrollIndicator={false}
    >
      <Animated.Text
        entering={FadeInDown.delay(100).duration(500)}
        style={slideStyles.slideSubtitle}
      >
        ¿qué tan identificado te sientes con esta frase?
      </Animated.Text>

      <Animated.Text
        entering={FadeInDown.delay(200).duration(500)}
        style={slideStyles.slideTitle}
      >
        {statement.textMain}
        <Text style={{ color: colors.primary }}>
          {statement.textHighlight}
        </Text>
      </Animated.Text>

      <Animated.View
        entering={FadeInDown.delay(250).duration(500)}
        style={{ alignItems: 'center', marginBottom: 32, width: '100%' }}
      >
        <Image
          source={require('@/assets/images/logoonboarding5.png')}
          style={{ width: 100, height: 100 }}
          resizeMode="contain"
        />
      </Animated.View>

      <Animated.View
        entering={FadeInDown.delay(300).duration(500)}
        style={slideStyles.agreementOptions}
      >
        {AGREEMENT_OPTIONS.map((option, index) => {
          const isSelected = selected === option.value;
          return (
            <Animated.View
              key={option.id}
              entering={FadeInDown.delay(400 + index * 50).duration(400)}
              style={{ width: '100%', marginBottom: 12 }}
            >
              <Pressable
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  onAnswer(config.answerKey! as 'statement1', option.value ?? null);
                  if (config.autoAdvance !== false) {
                    setTimeout(() => onNext(), 300);
                  }
                }}
                style={({ pressed }) => [
                  slideStyles.pill,
                  {
                    width: '100%',
                    minHeight: 52,
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    backgroundColor: isSelected ? colors.surface : '#f2f2f2',
                    borderWidth: 2,
                    borderColor: isSelected ? colors.primary : 'transparent',
                    borderRadius: 16,
                    paddingHorizontal: 20,
                    flexDirection: 'row',
                  },
                  pressed && { opacity: 0.7 },
                ]}
              >
                <Text style={[slideStyles.pillLabel, { fontSize: 16, fontWeight: '600', color: isSelected ? '#f2f2f2' : 'black' }]}>
                  {option.label}
                </Text>
                {isSelected && (
                  <View style={{
                    width: 24,
                    height: 24,
                    borderRadius: 12,
                    backgroundColor: colors.primary,
                    justifyContent: 'center',
                    alignItems: 'center'
                  }}>
                    <Check size={16} color={colors.background} strokeWidth={3} />
                  </View>
                )}
              </Pressable>
            </Animated.View>
          );
        })}
      </Animated.View>
    </ScrollView>
  );
};

export default AgreementSlide;
