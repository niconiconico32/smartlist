import { colors } from '@/constants/theme';
import * as Haptics from 'expo-haptics';
import { Check, Plus } from 'lucide-react-native';
import React from 'react';
import { Pressable, ScrollView } from 'react-native';
import { AppText as Text } from '@/src/components/AppText';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { layoutStyles, slideStyles } from '../../styles/shared';
import { MultiSelectSlideConfig, OnboardingAnswers, SelectOption } from '../../types';

interface Props {
  config: MultiSelectSlideConfig;
  answers: OnboardingAnswers;
  onAnswer: <K extends keyof OnboardingAnswers>(key: K, value: OnboardingAnswers[K]) => void;
  resolvedOptions: SelectOption[];
}

const MultiSelectSlide: React.FC<Props> = ({ config, answers, onAnswer, resolvedOptions }) => {
  const selected = (answers[config.answerKey!] as string[]) ?? [];

  const toggleItem = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const key = config.answerKey! as 'adhdSymptoms' | 'goals';
    if (selected.includes(id)) {
      onAnswer(key, selected.filter((s) => s !== id));
    } else {
      onAnswer(key, [...selected, id]);
    }
  };

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
        style={slideStyles.pillGrid}
      >
        {resolvedOptions.map((option, index) => (
          <Animated.View
            key={option.id}
            entering={FadeInDown.delay(400 + index * 50).duration(400)}
          >
            <Pressable
              onPress={() => toggleItem(option.id)}
              style={({ pressed }) => [
                slideStyles.pill,
                selected.includes(option.id) && slideStyles.pillSelected,
                pressed && { opacity: 0.7 },
              ]}
            >
              <Text style={slideStyles.pillLabel}>{option.label}</Text>
              {selected.includes(option.id) ? (
                <Check size={16} color={colors.primary} strokeWidth={3} />
              ) : (
                <Plus size={16} color={colors.textSecondary} strokeWidth={2} />
              )}
            </Pressable>
          </Animated.View>
        ))}
      </Animated.View>
    </ScrollView>
  );
};

export default MultiSelectSlide;
