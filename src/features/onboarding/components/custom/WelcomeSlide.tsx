import {
    PRIMARY_GRADIENT_COLORS,
    primaryButtonGradient,
    primaryButtonStyles,
    primaryButtonText,
} from '@/constants/buttons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { useEffect } from 'react';
import { Image, Pressable, Text, View } from 'react-native';
import Animated, {
    Easing,
    FadeInDown,
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withSpring,
    withTiming,
} from 'react-native-reanimated';
import { slideStyles } from '../../styles/shared';

interface Props {
  onNext: () => void;
}

const WelcomeSlide: React.FC<Props> = ({ onNext }) => {
  const breathingAnim = useSharedValue(0);
  const buttonScale = useSharedValue(1);

  useEffect(() => {
    breathingAnim.value = withRepeat(
      withTiming(1, { duration: 2500, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
  }, []);

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
      <View style={slideStyles.welcomeContentArea}>
        <Animated.View
          entering={FadeInDown.delay(100).duration(700)}
          style={[slideStyles.welcomeMascotCenter, mascotAnimatedStyle]}
        >
          <Image
            source={require('@/assets/images/logomain.png')}
            style={slideStyles.welcomeMascotLarge}
            resizeMode="contain"
          />
        </Animated.View>

        <Animated.Text
          entering={FadeInDown.delay(400).duration(600)}
          style={slideStyles.welcomeTitleCenter}
        >
          ¡Bienvenid@ a Brainy!
        </Animated.Text>

        <Animated.Text
          entering={FadeInDown.delay(550).duration(600)}
          style={slideStyles.welcomeSubtitleCenter}
        >
          Tu cerebro no está roto.{'\n'}Solo necesita un copiloto.
        </Animated.Text>
      </View>

      <Animated.View
        entering={FadeInDown.delay(700).duration(500)}
        style={slideStyles.welcomeButtonsContainer}
      >
        <Animated.View style={buttonAnimatedStyle}>
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              onNext();
            }}
            onPressIn={handleButtonPressIn}
            onPressOut={handleButtonPressOut}
            style={primaryButtonStyles}
          >
            <LinearGradient
              colors={PRIMARY_GRADIENT_COLORS}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={primaryButtonGradient}
            >
              <Text style={primaryButtonText}>Empezar</Text>
            </LinearGradient>
          </Pressable>
        </Animated.View>

        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.replace('/(tabs)');
          }}
          style={({ pressed }) => [
            slideStyles.welcomeButtonSecondary,
            pressed && { opacity: 0.6 },
          ]}
        >
          <Text style={slideStyles.welcomeButtonSecondaryText}>Ya Tengo cuenta</Text>
        </Pressable>
      </Animated.View>
    </View>
  );
};

export default WelcomeSlide;
