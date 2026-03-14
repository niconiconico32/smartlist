import { colors } from '@/constants/theme';
import * as Haptics from 'expo-haptics';
import { Check, Plus } from 'lucide-react-native';
import React from 'react';
import { Pressable, Text } from 'react-native';
import Animated, {
    FadeInDown,
    useAnimatedStyle,
    useSharedValue,
    withSpring,
} from 'react-native-reanimated';
import { slideStyles } from '../styles/shared';
import { GoalOption } from '../types';

interface GoalPillProps {
  goal: GoalOption;
  selected: boolean;
  onPress: () => void;
  delay: number;
}

const GoalPill: React.FC<GoalPillProps> = ({ goal, selected, onPress, delay }) => {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    scale.value = withSpring(0.92, { damping: 8, stiffness: 400 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 8, stiffness: 400 });
  };

  return (
    <Animated.View entering={FadeInDown.delay(delay).duration(400)} style={animatedStyle}>
      <Pressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[slideStyles.goalPill, selected && slideStyles.goalPillSelected]}
      >
        <Text style={slideStyles.goalEmoji}>{goal.emoji}</Text>
        <Text style={slideStyles.goalLabel}>{goal.label}</Text>
        {selected ? (
          <Check size={16} color={colors.primary} strokeWidth={3} />
        ) : (
          <Plus size={16} color={colors.textSecondary} strokeWidth={2} />
        )}
      </Pressable>
    </Animated.View>
  );
};

export default GoalPill;
