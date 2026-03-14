import {
    PRIMARY_GRADIENT_COLORS,
    primaryButtonGradient,
    primaryButtonStyles,
    primaryButtonText,
} from '@/constants/buttons';
import { colors } from '@/constants/theme';
import { usePurchases } from '@/src/contexts/PurchasesContext';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { CreditCard, Shield, Unlock } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';
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

interface Props {
  onFinish: () => void;
}

const ReverseTrialSlide: React.FC<Props> = ({ onFinish }) => {
  const { packages, purchasePackage, isLoadingPurchases } = usePurchases();
  const [isPurchasing, setIsPurchasing] = useState(false);
  const cardY = useSharedValue(0);
  const badgePulse = useSharedValue(1);
  const glowOpacity = useSharedValue(0.3);
  const buttonScale = useSharedValue(1);

  useEffect(() => {
    cardY.value = withRepeat(
      withSequence(
        withTiming(-8, { duration: 2500, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 2500, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      true,
    );
    badgePulse.value = withRepeat(
      withSequence(withTiming(1.05, { duration: 1000 }), withTiming(1, { duration: 1000 })),
      -1,
      true,
    );
    glowOpacity.value = withRepeat(
      withSequence(withTiming(0.6, { duration: 2000 }), withTiming(0.3, { duration: 2000 })),
      -1,
      true,
    );
  }, []);

  const cardStyle = useAnimatedStyle(() => ({ transform: [{ translateY: cardY.value }] }));
  const badgeStyle = useAnimatedStyle(() => ({ transform: [{ scale: badgePulse.value }] }));
  const glowStyle = useAnimatedStyle(() => ({ opacity: glowOpacity.value }));
  const buttonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }],
  }));

  const handleButtonPressIn = () => {
    buttonScale.value = withSpring(0.96, { damping: 10, stiffness: 300 });
  };
  const handleButtonPressOut = () => {
    buttonScale.value = withSpring(1, { damping: 10, stiffness: 300 });
  };

  const handleStartTrial = async () => {
    if (!packages.length) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onFinish();
      return;
    }

    setIsPurchasing(true);
    try {
      const mainPackage = packages[0];
      const result = await purchasePackage(mainPackage);

      if (result.success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        onFinish();
      } else if (result.cancelled) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } else if (result.errorMessage) {
        Alert.alert('Error', 'No se pudo completar la compra. Intenta de nuevo.');
      }
    } catch (error) {
      console.error('❌ Trial purchase error:', error);
      Alert.alert('Error', 'Ocurrió un error inesperado.');
    } finally {
      setIsPurchasing(false);
    }
  };

  return (
    <LinearGradient colors={[colors.background, '#16213E']} style={s.container}>
      <ScrollView contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
        <Animated.Text entering={FadeInDown.delay(100).duration(500)} style={s.headerTitle}>
          Hagamos un trato honesto.
        </Animated.Text>

        <Animated.View style={[s.cardGlow, glowStyle]} />

        <Animated.View
          entering={FadeInDown.delay(300).duration(600)}
          style={[s.cardContainer, cardStyle]}
        >
          <LinearGradient
            colors={[`${colors.surface}E6`, `${colors.background}F2`]}
            style={s.card}
          >
            <View style={s.iconContainer}>
              <LinearGradient colors={['#FFD700', '#FFA500']} style={s.shieldGlow} />
              <View style={s.shieldIcon}>
                <Shield
                  size={75}
                  color="#FFD700"
                  strokeWidth={1.2}
                  fill="rgba(255, 215, 0, 0.2)"
                />
              </View>
              <Image
                source={require('@/assets/images/logomain.png')}
                style={s.mascotSmall}
                resizeMode="contain"
              />
            </View>

            <Text style={s.cardHeadline}>
              Probablemente odias las pruebas gratuitas que piden tu tarjeta.
            </Text>

            <Text style={s.cardBody}>
              Sabemos que algunas apps ofrecen una prueba gratis y esperan que sus usuarios olviden
              cancelarla. Aquí no hacemos eso.
            </Text>

            <View style={s.offerContainer}>
              <LinearGradient
                colors={['rgba(255, 215, 0, 0.15)', 'rgba(255, 165, 0, 0.1)']}
                style={s.offerGradient}
              >
                <Text style={s.offerText}>
                  3 Días Premium.{'\n'} 0 Riesgos.
                </Text>
                <Text style={s.offerHighlight}>No pedimos tarjeta.</Text>
              </LinearGradient>
            </View>

            <View style={s.trustBadges}>
              <Animated.View style={[s.trustBadge, badgeStyle]}>
                <View style={s.badgeIconContainer}>
                  <CreditCard size={16} color="#F38BA8" strokeWidth={2} />
                  <View style={s.crossLine} />
                </View>
                <Text style={s.trustBadgeText}>Sin Cobros Sorpresa</Text>
              </Animated.View>
              <View style={s.badgeDivider} />
              <View style={s.trustBadge}>
                <Unlock size={16} color="#A6E3A1" strokeWidth={2} />
                <Text style={s.trustBadgeText}>Acceso Total</Text>
              </View>
            </View>
          </LinearGradient>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(700).duration(500)} style={s.buttonContainer}>
          <Animated.View style={buttonAnimatedStyle}>
            <Pressable
              onPress={handleStartTrial}
              onPressIn={handleButtonPressIn}
              onPressOut={handleButtonPressOut}
              disabled={isPurchasing || isLoadingPurchases}
              style={primaryButtonStyles}
            >
              <LinearGradient
                colors={PRIMARY_GRADIENT_COLORS}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={primaryButtonGradient}
              >
                {isPurchasing ? (
                  <ActivityIndicator color={colors.background} />
                ) : (
                  <Text style={primaryButtonText}>Acepto el Regalo (Empezar)</Text>
                )}
              </LinearGradient>
            </Pressable>
          </Animated.View>
        </Animated.View>

        <Animated.Text entering={FadeInDown.delay(900).duration(500)} style={s.secondaryText}>
          Después de 3 días, tú decides si vale la pena.
        </Animated.Text>
      </ScrollView>
    </LinearGradient>
  );
};

const s = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 40,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '900',
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: 32,
    letterSpacing: -0.5,
  },
  cardGlow: {
    position: 'absolute',
    top: 100,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(255, 215, 0, 0.15)',
  },
  cardContainer: { width: '100%', marginBottom: 24 },
  card: {
    borderRadius: 24,
    padding: 24,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 215, 0, 0.3)',
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 10,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 20,
    position: 'relative',
  },
  shieldGlow: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    opacity: 0.2,
  },
  shieldIcon: {
    position: 'absolute',
    top: 5,
    zIndex: 1,
  },
  mascotSmall: {
    width: 70,
    height: 70,
    marginTop: 15,
  },
  cardHeadline: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 24,
  },
  cardBody: {
    fontSize: 13,
    fontWeight: '400',
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  offerContainer: { marginBottom: 20 },
  offerGradient: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.2)',
  },
  offerText: {
    fontSize: 25,
    fontWeight: '800',
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: 4,
  },
  offerHighlight: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFD700',
    textAlign: 'center',
  },
  trustBadges: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  trustBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  badgeIconContainer: { position: 'relative' },
  crossLine: {
    position: 'absolute',
    top: 7,
    left: -2,
    width: 20,
    height: 2,
    backgroundColor: '#F38BA8',
    transform: [{ rotate: '45deg' }],
  },
  trustBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  badgeDivider: {
    width: 1,
    height: 20,
    backgroundColor: `${colors.textPrimary}33`,
  },
  buttonContainer: { width: '100%', marginBottom: 16 },
  secondaryText: {
    fontSize: 13,
    fontWeight: '400',
    color: colors.textSecondary,
    textAlign: 'center',
  },
});

export default ReverseTrialSlide;
