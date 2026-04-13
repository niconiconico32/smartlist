import {
    PRIMARY_GRADIENT_COLORS,
    primaryButtonGradient,
    primaryButtonStyles,
    primaryButtonText,
} from '@/constants/buttons';
import { colors } from '@/constants/theme';
import { useAuth } from '@/src/contexts/AuthContext';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { useEffect } from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, View } from 'react-native';
import { AppText as Text } from '@/src/components/AppText';
import { GoogleButton } from '@/src/components/GoogleButton';
import { useOnboardingStore } from '@/src/store/onboardingStore';
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
  const { signInWithOAuth, signInAnonymously, session, isLoading } = useAuth();

  useEffect(() => {
    // Si inicia sesión (o ya tiene una sesión activa por estar testeando), continuar el flujo automáticamente.
    if (session) {
      onNext();
    }
  }, [session, onNext]);

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
          <View style={styles.googleButtonWrapper}>
            <GoogleButton
              onPress={async () => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                await signInWithOAuth('google');
              }}
              disabled={isLoading}
              style={{ width: '100%', height: 56, borderRadius: 28 }}
            />
          </View>
          <Pressable
            onPress={async () => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              await signInAnonymously();
            }}
            disabled={isLoading}
            style={({ pressed }) => [
              styles.guestButton,
              pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] },
            ]}
          >
            <Text style={styles.guestButtonText}>Continuar como invitado</Text>
          </Pressable>
        </Animated.View>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  googleButtonWrapper: {
    height: 56,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  guestButton: {
    backgroundColor: 'transparent',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 56,
    borderRadius: 28,
    borderWidth: 1.5,
    borderColor: `${colors.textPrimary}33`,
    marginTop: 12,
  },
  guestButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
  },
});

export default WelcomeSlide;
