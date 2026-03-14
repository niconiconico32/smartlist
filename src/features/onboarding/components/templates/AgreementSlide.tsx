import { colors } from '@/constants/theme';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { Image, Pressable, ScrollView, Text, View } from 'react-native';
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
        style={slideStyles.statementSubtitle}
      >
        ¿Qué tan de acuerdo estás con esta afirmación?
      </Animated.Text>

      <Animated.View
        entering={FadeInDown.delay(200).duration(500)}
        style={slideStyles.statementWrapper}
      >
        <Image
          source={require('@/assets/images/logoonboarding5.png')}
          style={slideStyles.statementOwl}
          resizeMode="contain"
        />
        <View style={slideStyles.speechCard}>
          <Text style={slideStyles.quoteOpen}>"</Text>
          <Text style={slideStyles.speechCardText}>
            {statement.textMain}
            <Text style={slideStyles.speechCardHighlight}>
              {statement.textHighlight}
            </Text>
          </Text>
          <Text style={slideStyles.quoteClose}>"</Text>
        </View>
      </Animated.View>

      <Animated.View
        entering={FadeInDown.delay(300).duration(500)}
        style={slideStyles.agreementOptions}
      >
        {AGREEMENT_OPTIONS.map((option, index) => (
          <Animated.View
            key={option.id}
            entering={FadeInDown.delay(400 + index * 50).duration(400)}
          >
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onAnswer(config.answerKey! as 'statement1', option.value ?? null);
                if (config.autoAdvance !== false) {
                  setTimeout(() => onNext(), 300);
                }
              }}
              style={[
                slideStyles.agreementOption,
                selected === option.value && slideStyles.agreementOptionSelected,
              ]}
            >
              <LinearGradient
                colors={
                  selected === option.value
                    ? ['#FF9A9E', '#FECFEF', '#D4A5FF']
                    : [`${colors.surface}CC`, `${colors.surface}CC`]
                }
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={slideStyles.agreementOptionGradient}
              >
                <View
                  style={[
                    slideStyles.agreementOptionInner,
                    selected === option.value && slideStyles.agreementOptionInnerSelected,
                  ]}
                >
                  <Text
                    style={[
                      slideStyles.agreementOptionText,
                      selected === option.value && slideStyles.agreementOptionTextSelected,
                    ]}
                  >
                    {option.label}
                  </Text>
                </View>
              </LinearGradient>
            </Pressable>
          </Animated.View>
        ))}
      </Animated.View>
    </ScrollView>
  );
};

export default AgreementSlide;
