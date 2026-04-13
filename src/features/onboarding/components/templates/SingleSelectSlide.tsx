import { colors } from '@/constants/theme';
import * as Haptics from 'expo-haptics';
import { Check, Plus } from 'lucide-react-native';
import React from 'react';
import { Pressable, ScrollView } from 'react-native';
import { AppText as Text } from '@/src/components/AppText';
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
        {resolvedOptions.map((option, index) => (
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
                { width: '100%', minHeight: 64, justifyContent: 'center', alignItems: 'center' },
                selected === option.id && slideStyles.pillSelected,
                pressed && { opacity: 0.7 },
              ]}
            >
              <Text style={[slideStyles.pillLabel, { fontSize: 16 }]}>{option.label}</Text>
              {selected === option.id && (
                <Check size={20} color={colors.primary} strokeWidth={3} style={{ position: 'absolute', right: 20 }} />
              )}
            </Pressable>
          </Animated.View>
        ))}
      </Animated.View>
    </ScrollView>
  );
};

export default SingleSelectSlide;
