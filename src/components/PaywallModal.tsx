import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Dimensions, FlatList, Image, Modal, Pressable, StyleSheet, View } from 'react-native';
import { AppText as Text } from '@/src/components/AppText';
import { Crown, ShieldAlert, Store } from 'lucide-react-native';
import { posthog } from '@/src/config/posthog';
import { useRevenueCat } from '../hooks/useRevenueCat';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { Alert, Linking } from 'react-native';
import { restorePurchases, isPremiumActive } from '../utils/purchases';
import { useProStore } from '../store/proStore';
import { colors } from '@/constants/theme';
import { CoinsCounter } from './CoinsCounter';
import { useAchievementsStore } from '../store/achievementsStore';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH * 0.58;
const CARD_GAP = 12;

// Same benefit cards as ProTrialOfferModal Phase 2
const BENEFIT_CARDS = [
  {
    id: '1',
    title: 'Multiplicador de Coronas',
    subtitle: 'Las coronas que ganas aumentarán un 15% por cada día de tu Racha Diaria.',
    image: require('@/assets/images/probird.png'),
    icon: <Crown color="#38BDF8" size={28} strokeWidth={2.5} />,
    iconBg: 'rgba(56, 189, 248, 0.2)',
  },
  {
    id: '2',
    title: 'Escudo de Racha',
    subtitle: '2 protecciones semanales para que no pierdas tu bonus de Racha Diaria.',
    image: require('@/assets/images/escudo.png'),
    icon: <ShieldAlert color="#F59E0B" size={28} strokeWidth={2.5} />,
    iconBg: 'rgba(245, 158, 11, 0.2)',
  },
  {
    id: '3',
    title: 'Tienda Exclusiva',
    subtitle: 'Fondos animados, skins y accesorios premium disponibles en la Tienda.',
    image: require('@/assets/images/ropero.png'),
    icon: <Store color="#EC4899" size={28} strokeWidth={2.5} />,
    iconBg: 'rgba(236, 72, 153, 0.2)',
  },
];

interface PaywallModalProps {
  visible: boolean;
  onClose: () => void;
}

export const PaywallModal: React.FC<PaywallModalProps> = ({ visible, onClose }) => {
  const { currentPackage, isPurchasing, isFetching, purchasePro } = useRevenueCat();
  const { activatePermanentPro } = useProStore();
  const [isRestoring, setIsRestoring] = useState(false);
  const [activeCardIndex, setActiveCardIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    if (visible) {
      posthog.capture('paywall_viewed', {
        has_package: !!currentPackage,
        price: currentPackage?.product?.priceString,
      });
    }
  }, [visible]);

  const handlePurchase = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    const success = await purchasePro();
    if (success) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onClose();
    }
  };

  const handleRestore = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsRestoring(true);
    try {
      const customerInfo = await restorePurchases();
      if (isPremiumActive(customerInfo)) {
        await activatePermanentPro();
        posthog.capture('purchase_restored');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert('¡Compra restaurada!', 'Tu suscripción Pro ha sido reactivada.');
        onClose();
      } else {
        Alert.alert('Sin compras previas', 'No encontramos una suscripción activa para restaurar.');
      }
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'No se pudo restaurar la compra.');
    } finally {
      setIsRestoring(false);
    }
  };

  const handleDismiss = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onClose();
  };

  const priceText = currentPackage
    ? `Suscribirse por ${currentPackage.product.priceString}/mes`
    : 'Suscribirse Ahora';

  const renderBenefitCard = ({ item }: { item: typeof BENEFIT_CARDS[0] }) => {
    const totalCoins = useAchievementsStore.getState().totalCoins;

    return (
      <View style={styles.benefitCard}>
        {item.id === '1' ? (
          /* Crowns Pill — Centered inside a container matching the image dimensions */
          <View style={[styles.benefitCardImage, { justifyContent: 'center', alignItems: 'center' }]}>
            <View style={styles.crownsPillPreview}>
              <Crown size={28} color="#1A1C20" strokeWidth={2.5} />
              <CoinsCounter coins={totalCoins} size="large" color="#1A1C20" />
              <View style={styles.multiplierBadge}>
                <Text style={styles.multiplierText}>x1.5</Text>
              </View>
            </View>
          </View>
        ) : (
          <Image source={item.image} style={styles.benefitCardImage} resizeMode="contain" />
        )}
        <Text style={styles.benefitCardTitle}>{item.title}</Text>
        <Text style={styles.benefitCardSubtitle}>{item.subtitle}</Text>
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="formSheet"
      onRequestClose={handleDismiss}
    >
      <LinearGradient colors={['#F59E0B', '#FCD34D', '#D97706']} style={styles.container}>

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.superTitle}>VERSIÓN PRO</Text>
          <Text style={styles.title}>Desbloquea el Máximo Poder de Brainy</Text>
          <Text style={styles.subtitle}>Tu prueba ha expirado — continúa sin límites</Text>
        </View>

        {/* Benefit Cards Carousel */}
        <View style={styles.carouselContainer}>
          <FlatList
            ref={flatListRef}
            data={BENEFIT_CARDS}
            renderItem={renderBenefitCard}
            keyExtractor={(item) => item.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            snapToInterval={CARD_WIDTH + CARD_GAP}
            decelerationRate="fast"
            contentContainerStyle={styles.carouselContent}
            onMomentumScrollEnd={(e) => {
              const index = Math.round(e.nativeEvent.contentOffset.x / (CARD_WIDTH + CARD_GAP));
              setActiveCardIndex(index);
            }}
          />
          {/* Pagination dots */}
          <View style={styles.dotsContainer}>
            {BENEFIT_CARDS.map((_, i) => (
              <View
                key={i}
                style={[styles.dot, activeCardIndex === i && styles.dotActive]}
              />
            ))}
          </View>
        </View>

        {/* Footer Buttons */}
        <View style={styles.footer}>
          {(isFetching && !currentPackage) ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator color="#38BDF8" />
              <Text style={styles.loadingText}>Cargando ofertas...</Text>
            </View>
          ) : (
            <>
              <Pressable
                style={({ pressed }) => [
                  styles.primaryButton,
                  pressed && styles.primaryButtonPressed,
                  isPurchasing && styles.primaryButtonDisabled,
                ]}
                onPress={handlePurchase}
                disabled={isPurchasing || isRestoring}
              >
                {isPurchasing ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.primaryButtonText}>{priceText}</Text>
                )}
              </Pressable>

              <Pressable
                style={({ pressed }) => [
                  styles.restoreButton,
                  pressed && styles.secondaryButtonPressed,
                ]}
                onPress={handleRestore}
                disabled={isPurchasing || isRestoring}
              >
                {isRestoring ? (
                  <ActivityIndicator color="#9CA3AF" size="small" />
                ) : (
                  <Text style={styles.restoreButtonText}>Restaurar Compra</Text>
                )}
              </Pressable>

              <Pressable
                style={({ pressed }) => [
                  styles.secondaryButton,
                  pressed && styles.secondaryButtonPressed,
                ]}
                onPress={handleDismiss}
                disabled={isPurchasing || isRestoring}
              >
                <Text style={styles.secondaryButtonText}>Quizás más tarde</Text>
              </Pressable>

              <View style={styles.disclaimerContainer}>
                <Text style={styles.disclaimerText}>
                  La suscripción se renueva automáticamente salvo que se cancele al menos 24 horas antes del fin del periodo actual.
                </Text>
                <View style={styles.disclaimerLinks}>
                  <Pressable onPress={() => Linking.openURL('https://suggestions-brainyapp.vercel.app/terms')} hitSlop={8}>
                    <Text style={styles.disclaimerLinkText}>Términos de uso</Text>
                  </Pressable>
                  <Text style={styles.disclaimerText}> | </Text>
                  <Pressable onPress={() => Linking.openURL('https://suggestions-brainyapp.vercel.app/privacy')} hitSlop={8}>
                    <Text style={styles.disclaimerLinkText}>Política de Privacidad</Text>
                  </Pressable>
                </View>
              </View>
            </>
          )}
        </View>
      </LinearGradient>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 20,
    justifyContent: 'space-between',
  },
  header: {
    alignItems: 'center',
    paddingHorizontal: 8,
    gap: 8,
  },
  superTitle: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 2,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '900',
    textAlign: 'center',
    lineHeight: 36,
    textShadowColor: 'rgba(0,0,0,0.2)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
  subtitle: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
  // ── Carousel ──
  carouselContainer: {
    marginTop: 8,
  },
  carouselContent: {
    paddingHorizontal: (SCREEN_WIDTH - CARD_WIDTH) / 2,
    gap: CARD_GAP,
  },
  benefitCard: {
    width: CARD_WIDTH,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingVertical: 20,
    paddingHorizontal: 16,
    alignItems: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 6,
  },
  benefitCardImage: {
    width: 128,
    height: 128,
    marginBottom: 10,
  },
  crownsPillPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EAF0FC',
    paddingHorizontal: 20,
    paddingVertical: 6,
    borderRadius: 42,
    gap: 6,
    position: 'relative',
  },
  multiplierBadge: {
    position: 'absolute',
    top: -12,
    right: -14,
    backgroundColor: '#C9FD5A',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  multiplierText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#280D8C',
  },
  benefitCardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1A1A2E',
    textAlign: 'center',
  },
  benefitCardSubtitle: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 8,
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 14,
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  dotActive: {
    width: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 4,
  },
  // ── Footer ──
  footer: {
    gap: 10,
    paddingTop: 8,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 60,
  },
  loadingText: {
    color: '#9CA3AF',
    marginTop: 8,
    fontSize: 14,
  },
  primaryButton: {
    backgroundColor: '#FFFFFF',
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
  },
  primaryButtonPressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.9,
  },
  primaryButtonDisabled: {
    opacity: 0.5,
  },
  primaryButtonText: {
    color: '#B45309',
    fontSize: 17,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  restoreButton: {
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  restoreButtonText: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 14,
    fontWeight: '600',
  },
  secondaryButton: {
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  secondaryButtonPressed: {
    opacity: 0.5,
  },
  secondaryButtonText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    fontWeight: '600',
  },
  disclaimerContainer: {
    marginTop: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    gap: 4,
  },
  disclaimerText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 10,
    textAlign: 'center',
    lineHeight: 14,
  },
  disclaimerLinks: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  disclaimerLinkText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 10,
    textDecorationLine: 'underline',
  },
});
