import React from 'react';
import { ScrollView } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { layoutStyles, slideStyles } from '../../styles/shared';
import { GoalOption, GoalsSlideConfig, OnboardingAnswers } from '../../types';
import GoalPill from '../GoalPill';

interface Props {
  config: GoalsSlideConfig;
  answers: OnboardingAnswers;
  onAnswer: <K extends keyof OnboardingAnswers>(key: K, value: OnboardingAnswers[K]) => void;
  resolvedOptions: GoalOption[];
}

const GoalsSlide: React.FC<Props> = ({ config, answers, onAnswer, resolvedOptions }) => {
  const selected = (answers[config.answerKey!] as string[]) ?? [];

  const toggleGoal = (id: string) => {
    if (selected.includes(id)) {
      onAnswer('goals', selected.filter((g) => g !== id));
    } else {
      onAnswer('goals', [...selected, id]);
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
        style={slideStyles.goalsGrid}
      >
        {resolvedOptions.map((goal, index) => (
          <GoalPill
            key={goal.id}
            goal={goal}
            selected={selected.includes(goal.id)}
            onPress={() => toggleGoal(goal.id)}
            delay={400 + index * 50}
          />
        ))}
      </Animated.View>
    </ScrollView>
  );
};

export default GoalsSlide;
