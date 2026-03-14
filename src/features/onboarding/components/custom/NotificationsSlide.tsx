import {
    PRIMARY_GRADIENT_COLORS,
    primaryButtonGradient,
    primaryButtonStyles,
    primaryButtonText,
} from '@/constants/buttons';
import { colors } from '@/constants/theme';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import * as Notifications from 'expo-notifications';
import React, { useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

// ============================================
// NOTIFICATIONS SLIDE
// ============================================
interface Props {
  onNext: () => void;
}

const NotificationsSlide: React.FC<Props> = ({ onNext }) => {
  const [granted, setGranted] = useState(false);

  const requestPermission = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const { status } = await Notifications.requestPermissionsAsync();
    if (status === 'granted') {
      setGranted(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setTimeout(onNext, 700);
    }
  };

  return (
    <View style={s.container}>
      <View style={s.contentArea}>
        <Animated.View entering={FadeInDown.delay(100).duration(400)} style={s.mascotContainer}>
          <Image
            source={require('@/assets/images/streak.png')}
            style={s.mascot}
            resizeMode="contain"
          />
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
    marginBottom: 24,
  },
  mascot: {
    width: 110,
    height: 110,
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
