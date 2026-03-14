import { colors } from '@/constants/theme';
import React from 'react';
import { Image, TextInput, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { layoutStyles, slideStyles } from '../../styles/shared';
import { OnboardingAnswers, TextInputSlideConfig } from '../../types';

interface Props {
  config: TextInputSlideConfig;
  answers: OnboardingAnswers;
  onAnswer: <K extends keyof OnboardingAnswers>(key: K, value: OnboardingAnswers[K]) => void;
}

const TextInputSlide: React.FC<Props> = ({ config, answers, onAnswer }) => {
  const value = (answers[config.answerKey!] as string) ?? '';

  return (
    <View style={layoutStyles.slide}>
      {config.showLogo && (
        <Animated.View
          entering={FadeInDown.delay(100).duration(500)}
          style={slideStyles.logoImageContainer}
        >
          <Image
            source={require('@/assets/images/logomain.png')}
            style={slideStyles.logoImageSmall}
            resizeMode="contain"
          />
        </Animated.View>
      )}

      <Animated.Text
        entering={FadeInDown.delay(200).duration(500)}
        style={slideStyles.slideTitle}
      >
        {config.title}
      </Animated.Text>

      <Animated.Text
        entering={FadeInDown.delay(250).duration(500)}
        style={slideStyles.slideSubtitle}
      >
        {config.subtitle}
      </Animated.Text>

      <Animated.View
        entering={FadeInDown.delay(300).duration(500)}
        style={slideStyles.nameInputContainer}
      >
        <TextInput
          style={slideStyles.nameInput}
          placeholder={config.placeholder}
          placeholderTextColor={colors.textSecondary}
          value={value}
          onChangeText={(text) => {
            const key = config.answerKey!;
            onAnswer(key as 'userName', text);
          }}
          autoFocus
        />
      </Animated.View>
    </View>
  );
};

export default TextInputSlide;
