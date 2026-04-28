import { AppText as Text } from '@/src/components/AppText';
import * as Haptics from 'expo-haptics';
import React, { useCallback, useEffect, useState } from 'react';
import { Image, Pressable, View } from 'react-native';
import Animated, {
  Easing,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { slideStyles } from '../../styles/shared';
import { DialogueSlideConfig } from '../../types';
import TypewriterText from '../TypewriterText';

interface Props {
  config: DialogueSlideConfig;
  onNext: () => void;
}

const DialogueSlide: React.FC<Props> = ({ config, onNext }) => {
  const [dialoguePhase, setDialoguePhase] = useState(0);
  const [typewriterDone, setTypewriterDone] = useState(false);
  const [bubbleReady, setBubbleReady] = useState(false);

  const breathingAnim = useSharedValue(0);
  const buttonScale = useSharedValue(1);
  const bubbleScale = useSharedValue(0);
  const bubbleOpacity = useSharedValue(0);

  const messages = config.messages;
  const isLastMessage = dialoguePhase >= messages.length - 1;

  useEffect(() => {
    breathingAnim.value = withRepeat(
      withTiming(1, { duration: 2500, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
  }, []);

  // Reset dialogue state on mount
  useEffect(() => {
    setDialoguePhase(0);
    setTypewriterDone(false);
    setBubbleReady(false);
    bubbleScale.value = 0;
    bubbleOpacity.value = 0;

    const timer = setTimeout(() => {
      setBubbleReady(true);
      bubbleScale.value = withSpring(1, { damping: 6, stiffness: 100 });
      bubbleOpacity.value = withTiming(1, { duration: 150 });
    }, 300);

    return () => clearTimeout(timer);
  }, []);

  const handleDialogueContinue = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (!isLastMessage) {
      setTypewriterDone(false);
      bubbleScale.value = withSequence(
        withTiming(0.9, { duration: 250 }),
        withSpring(1, { damping: 12, stiffness: 200 }),
      );
      setDialoguePhase((p) => p + 1);
    } else {
      onNext();
    }
  }, [isLastMessage, onNext]);

  // Auto-advance dialogue phase
  useEffect(() => {
    if (typewriterDone) {
      if (!isLastMessage) {
        const timer = setTimeout(() => {
          handleDialogueContinue();
        }, 2000); // Wait 2 seconds before auto-advancing to the next message
        return () => clearTimeout(timer);
      } else if (config.autoAdvanceAtEnd) {
        const timer = setTimeout(() => {
          onNext();
        }, 2000); // Wait 2 seconds before auto-advancing to the next slide
        return () => clearTimeout(timer);
      }
    }
  }, [typewriterDone, isLastMessage, handleDialogueContinue, config.autoAdvanceAtEnd, onNext]);

  const mascotAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: breathingAnim.value * -12 },
      { scale: 1 + breathingAnim.value * 0.03 },
    ],
  }));

  const buttonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }],
  }));

  const handleButtonPressIn = () => {
    buttonScale.value = withSpring(0.96, { damping: 10, stiffness: 300 });
  };

  const handleButtonPressOut = () => {
    buttonScale.value = withSpring(1, { damping: 10, stiffness: 300 });
  };

  return (
    <View style={slideStyles.welcomeSlideSimple}>
      <View style={slideStyles.welcomeDialogueArea}>
        {/* Speech bubble */}
        <Animated.View style={slideStyles.speechBubbleContainer}>
          <View >
            {bubbleReady && (
              <TypewriterText
                key={`phase-${dialoguePhase}`}
                text={messages[dialoguePhase]}
                style={slideStyles.speechBubbleText}
                delay={dialoguePhase === 0 ? 200 : 100}
                onComplete={() => setTypewriterDone(true)}
              />
            )}
          </View>
        </Animated.View>

        {/* Mascot */}
        <Animated.View
          entering={FadeInDown.delay(100).duration(700)}
          style={[slideStyles.welcomeMascotCenter, mascotAnimatedStyle, { marginBottom: 0, marginTop: 8, position: 'relative' }]}
        >
          {/* Blurred Glow Circle */}

          <Image
            source={require('@/assets/images/logomain.png')}
            style={slideStyles.welcomeMascotLarge}
            resizeMode="contain"
          />
        </Animated.View>
      </View>

      {/* Button — always rendered, opacity changes */}
      <View style={[slideStyles.welcomeButtonsContainer, { minHeight: 60 }]}>
        {isLastMessage && typewriterDone && !config.autoAdvanceAtEnd && (
          <Animated.View entering={FadeInDown.duration(800).delay(300)}>
            <Pressable
              onPress={handleDialogueContinue}
              style={({ pressed }) => [
                {
                  paddingVertical: 16,
                  alignItems: 'center',
                  justifyContent: 'center',
                },
                pressed && { opacity: 0.6 },
              ]}
            >
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: '600',
                  color: '#A0A0A0', // Tenuemente
                  letterSpacing: 0.5,
                }}
              >
                Toca para empezar
              </Text>
            </Pressable>
          </Animated.View>
        )}
      </View>
    </View>
  );
};

export default DialogueSlide;
