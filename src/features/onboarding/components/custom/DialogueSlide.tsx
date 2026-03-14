import {
    PRIMARY_GRADIENT_COLORS,
    primaryButtonGradient,
    primaryButtonStyles,
    primaryButtonText,
} from '@/constants/buttons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useCallback, useEffect, useState } from 'react';
import { Image, Pressable, Text, View } from 'react-native';
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
        withTiming(0.9, { duration: 150 }),
        withSpring(1, { damping: 12, stiffness: 200 }),
      );
      setDialoguePhase((p) => p + 1);
    } else {
      onNext();
    }
  }, [isLastMessage, onNext]);

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
          <View style={slideStyles.speechBubble}>
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
          <View style={slideStyles.speechBubbleTail} />
        </Animated.View>

        {/* Mascot */}
        <Animated.View
          entering={FadeInDown.delay(100).duration(700)}
          style={[slideStyles.welcomeMascotCenter, mascotAnimatedStyle, { marginBottom: 0, marginTop: 8 }]}
        >
          <Image
            source={require('@/assets/images/logomain.png')}
            style={slideStyles.welcomeMascotLarge}
            resizeMode="contain"
          />
        </Animated.View>
      </View>

      {/* Button — always rendered, opacity changes */}
      <View style={slideStyles.welcomeButtonsContainer}>
        <Animated.View style={buttonAnimatedStyle}>
          <Pressable
            onPress={typewriterDone ? handleDialogueContinue : undefined}
            onPressIn={typewriterDone ? handleButtonPressIn : undefined}
            onPressOut={typewriterDone ? handleButtonPressOut : undefined}
            style={[primaryButtonStyles, { opacity: typewriterDone ? 1 : 0.3 }]}
          >
            <LinearGradient
              colors={PRIMARY_GRADIENT_COLORS}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={primaryButtonGradient}
            >
              <Text style={primaryButtonText}>Continuar</Text>
            </LinearGradient>
          </Pressable>
        </Animated.View>
      </View>
    </View>
  );
};

export default DialogueSlide;
