import {
    PRIMARY_GRADIENT_COLORS,
    primaryButtonGradient,
    primaryButtonStyles,
    primaryButtonText,
} from '@/constants/buttons';
import { colors } from '@/constants/theme';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { requestNotificationPermissions } from '@/src/lib/notificationService';
import React, { useEffect, useState } from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import { AppText as Text } from '@/src/components/AppText';
import Animated, {
  Easing,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

// ============================================
// NOTIFICATIONS SLIDE
// ============================================
interface Props {
  onNext: () => void;
}

const NotificationsSlide: React.FC<Props> = ({ onNext }) => {
  const [granted, setGranted] = useState(false);

  const mascotY = useSharedValue(0);
  const bellRotate = useSharedValue(0);

  useEffect(() => {
    // Floating mascot
    mascotY.value = withRepeat(
      withSequence(
        withTiming(-10, { duration: 1500, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 1500, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      true
    );
    // Bell wiggle
    bellRotate.value = withRepeat(
      withSequence(
        withTiming(15, { duration: 200, easing: Easing.inOut(Easing.ease) }),
        withTiming(-15, { duration: 200, easing: Easing.inOut(Easing.ease) }),
        withTiming(10, { duration: 150, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 150, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 2000 }) // pause
      ),
      -1,
      false
    );
  }, []);

  const mascotStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: mascotY.value }],
  }));

  const bellStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${bellRotate.value}deg` }],
  }));

  const requestPermission = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const success = await requestNotificationPermissions();
    
    if (success) {
      setGranted(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setTimeout(onNext, 700);
    } else {
      // Si el usuario deniega los permisos en el OS, avanzamos igual 
      // para que no se quede bloqueado en esta pantalla
      onNext();
    }
  };

  return (
    <View style={s.container}>
      <View style={s.contentArea}>
        {/* Mascot + bell */}
        <Animated.View
          entering={FadeInDown.delay(100).duration(600)}
          style={[s.mascotContainer, mascotStyle]}
        >
          <Image
            source={require('@/assets/images/logomain.png')}
            style={s.mascot}
            resizeMode="contain"
          />
          <Animated.Text style={[s.bell, bellStyle]}>🔔</Animated.Text>
        </Animated.View>

        <Animated.Text entering={FadeInDown.delay(200).duration(400)} style={s.title}>
          Déjame ser tu memoria externa
        </Animated.Text>
        <Animated.Text entering={FadeInDown.delay(350).duration(400)} style={s.subtitle}>
          Necesito permiso para avisarte cuando sea momento de brillar. Prometo no ser pesado.
        </Animated.Text>

        {granted && (
          <Animated.View entering={FadeInDown.duration(300)} style={s.successRow}>
            <Text style={s.successIcon}>✓</Text>
            <Text style={s.successText}>¡Notificaciones activadas!</Text>
          </Animated.View>
        )}
      </View>

      <View style={s.buttonContainer}>
        {!granted ? (
          <>
            <Pressable onPress={requestPermission} style={primaryButtonStyles}>
              <LinearGradient
                colors={PRIMARY_GRADIENT_COLORS}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={primaryButtonGradient}
              >
                <Text style={primaryButtonText}>    Activar notificaciones 🔔   </Text>
              </LinearGradient>
            </Pressable>
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onNext();
              }}
              style={s.skipButton}
            >
              <Text style={s.skipText}>Quizás más tarde</Text>
            </Pressable>
          </>
        ) : (
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              onNext();
            }}
            style={primaryButtonStyles}
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
        )}
      </View>
    </View>
  );
};

export default NotificationsSlide;

// ============================================
// STYLES
// ============================================
const s = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentArea: {
    flex: 1,
    paddingHorizontal: 32,
    paddingTop: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mascotContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  mascot: {
    width: 140,
    height: 140,
  },
  bell: {
    position: 'absolute',
    right: -10,
    bottom: 20,
    fontSize: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: 12,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 16,
  },
  successRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 20,
    backgroundColor: `${colors.primary}1A`,
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  successIcon: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primary,
  },
  successText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
  },
  buttonContainer: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    paddingBottom: 40,
    alignItems: 'center',
  },
  skipButton: {
    marginTop: 14,
    paddingVertical: 8,
  },
  skipText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textSecondary,
  },
});
