import { colors } from '@/constants/theme';
import { AppText as Text } from '@/src/components/AppText';
import * as Haptics from 'expo-haptics';
import { Check } from 'lucide-react-native';
import React from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { layoutStyles, slideStyles } from '../../styles/shared';
import { OnboardingAnswers, SelectOption, SingleSelectSlideConfig } from '../../types';

interface Props {
  config: SingleSelectSlideConfig;
  answers: OnboardingAnswers;
  onAnswer: <K extends keyof OnboardingAnswers>(key: K, value: OnboardingAnswers[K]) => void;
  resolvedOptions: SelectOption[];
}

const SingleSelectSlide: React.FC<Props> = ({ config, answers, onAnswer, resolvedOptions }) => {
  const selected = answers[config.answerKey!] as string | null;

  return (
    <ScrollView
      style={layoutStyles.slideScroll}
      contentContainerStyle={layoutStyles.slideScrollContent}
      showsVerticalScrollIndicator={false}
    >
      {config.subtitle && (
        <Animated.Text
          entering={FadeInDown.delay(100).duration(500)}
          style={slideStyles.slideSubtitle}
        >
          {config.subtitle}
        </Animated.Text>
      )}

      <Animated.Text
        entering={FadeInDown.delay(200).duration(500)}
        style={slideStyles.slideTitle}
      >
        {config.title}
      </Animated.Text>

      <Animated.View
        entering={FadeInDown.delay(300).duration(500)}
        style={[
          slideStyles.pillGrid,
          {
            flexDirection: 'column',
            width: '100%',
            paddingHorizontal: 0,
            gap: 16
          }
        ]}
      >
        {resolvedOptions.map((option, index) => {
          const isSelected = selected === option.id;
          return (
            <Animated.View
              key={option.id}
              entering={FadeInDown.delay(400 + index * 50).duration(400)}
              style={{ width: '100%' }}
            >
              <Pressable
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  onAnswer(config.answerKey! as 'ageRange', option.id);
                }}
                style={({ pressed }) => [
                  slideStyles.pill,
                  {
                    width: '100%',
                    minHeight: 64,
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    backgroundColor: isSelected ? colors.surface : '#f2f2f2', // Clean white background like the image
                    borderWidth: 2,
                    borderColor: isSelected ? colors.primary : 'transparent',
                    borderRadius: 16,
                    paddingHorizontal: 20,
                  },
                  pressed && { opacity: 0.7 },
                ]}
              >
                <Text style={[slideStyles.pillLabel, { fontSize: 16, fontWeight: '600', color: isSelected ? '#f2f2f2' : 'black' }]}>{option.label}</Text>
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

export default SingleSelectSlide;
