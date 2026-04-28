import { colors } from '@/constants/theme';
import { AppText as Text } from '@/src/components/AppText';
import * as Haptics from 'expo-haptics';
import LottieView from 'lottie-react-native';
import React, { useRef } from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { slideStyles } from '../../styles/shared';

interface Props {
  onNext: () => void;
}

export default function AllDoneSlide({ onNext }: Props) {
  const lottieRef = useRef<LottieView>(null);

  return (
    <View style={s.container}>
      {/* Animation + Logo stacked */}
      <Animated.View entering={FadeInUp.delay(100).duration(700)} style={s.animationWrapper}>
        {/* Lottie behind */}
        <LottieView
          ref={lottieRef}
          source={{ uri: 'https://lottie.host/00209cc7-fa23-41cf-8f33-1b012b69abf6/JblMturQEG.lottie' }}
          autoPlay
          loop
          style={s.lottie}
        />

        {/* Logo on top */}
        <Image
          source={require('@/assets/images/logomain.png')}
          style={s.logo}
          resizeMode="contain"
        />
      </Animated.View>

      {/* Text */}
      <Animated.View entering={FadeInDown.delay(500).duration(600)} style={s.textContainer}>
        <Text style={[slideStyles.slideTitle, s.centeredTitle, { color: colors.background }]}>
          ¡todo listo!
        </Text>
        <Text style={[slideStyles.slideSubtitle, s.centeredSubtitle]}>
          estoy preparado para ser tu copiloto en esta aventura. veo grandes logros en tu futuro.
        </Text>
      </Animated.View>

      {/* Button */}
      <Animated.View entering={FadeInDown.delay(800).duration(500)} style={s.footer}>
        <Pressable
          style={s.button}
          onPress={() => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            onNext();
          }}
        >
          <Text style={s.buttonText}>¡Firmar Compromiso!</Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 40,
  },
  animationWrapper: {
    width: 360,
    height: 360,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  lottie: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  logo: {
    width: 200,
    height: 200,
    zIndex: 1,
  },
  textContainer: {
    alignItems: 'center',
    marginTop: 16,
    width: '100%',
  },
  centeredTitle: {
    textAlign: 'center',
    alignSelf: 'center',
  },
  centeredSubtitle: {
    textAlign: 'center',
    alignSelf: 'center',
    lineHeight: 22,
  },
  footer: {
    width: '100%',
    marginTop: 40,
  },
  button: {
    backgroundColor: colors.surface,
    paddingVertical: 18,
    borderRadius: 30,
    alignItems: 'center',
    shadowColor: colors.surface,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 6,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
  },
});
