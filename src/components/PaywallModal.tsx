import React from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Crown, ShieldAlert, Store } from 'lucide-react-native';
import { useRevenueCat } from '../hooks/useRevenueCat';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';

interface PaywallModalProps {
  visible: boolean;
  onClose: () => void;
}

export const PaywallModal: React.FC<PaywallModalProps> = ({ visible, onClose }) => {
  const { currentPackage, isPurchasing, isFetching, purchasePro } = useRevenueCat();

  const handlePurchase = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    const success = await purchasePro();
    if (success) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onClose(); // Cerrar modal porque el estado isPro ya desbloqueó la app detrás
    }
  };

  const handleDismiss = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onClose();
  };

  // Extraemos el texto del precio dinámico, o mostramos un texto genérico si cargando
  const priceText = currentPackage 
    ? `Suscribirse por ${currentPackage.product.priceString}/mes`
    : 'Suscribirse Ahora';

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="formSheet"
      onRequestClose={handleDismiss}
    >
      <LinearGradient
        colors={['#1F2937', '#111827']}
        style={styles.container}
      >
        <View style={styles.header}>
          <Text style={styles.superTitle}>VERSIÓN PRO</Text>
          <Text style={styles.title}>Desbloquea el Máximo Poder de Brainy</Text>
        </View>

        <View style={styles.benefitsContainer}>
          <View style={styles.benefitRow}>
            <View style={[styles.iconBox, { backgroundColor: 'rgba(56, 189, 248, 0.2)' }]}>
              <Crown color="#38BDF8" size={24} strokeWidth={2.5} />
            </View>
            <Text style={styles.benefitText}>Multiplicador <Text style={styles.highlight}>+50% de coronas</Text> en tus tareas</Text>
          </View>

          <View style={styles.benefitRow}>
            <View style={[styles.iconBox, { backgroundColor: 'rgba(245, 158, 11, 0.2)' }]}>
              <ShieldAlert color="#F59E0B" size={24} strokeWidth={2.5} />
            </View>
            <Text style={styles.benefitText}><Text style={styles.highlight}>Escudos de racha</Text> para proteger tu progreso</Text>
          </View>

          <View style={styles.benefitRow}>
            <View style={[styles.iconBox, { backgroundColor: 'rgba(236, 72, 153, 0.2)' }]}>
              <Store color="#EC4899" size={24} strokeWidth={2.5} />
            </View>
            <Text style={styles.benefitText}>Acceso ilimitado a la <Text style={styles.highlight}>Tienda VIP</Text> exclusiva</Text>
          </View>
        </View>

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
                  isPurchasing && styles.primaryButtonDisabled
                ]}
                onPress={handlePurchase}
                disabled={isPurchasing}
              >
                {isPurchasing ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.primaryButtonText}>{priceText}</Text>
                )}
              </Pressable>

              <Pressable 
                style={({ pressed }) => [
                  styles.secondaryButton,
                  pressed && styles.secondaryButtonPressed
                ]}
                onPress={handleDismiss}
                disabled={isPurchasing}
              >
                <Text style={styles.secondaryButtonText}>Quizás más tarde</Text>
              </Pressable>
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
    padding: 24,
    justifyContent: 'space-between',
  },
  header: {
    marginTop: 40,
    alignItems: 'center',
    paddingHorizontal: 10,
  },
  superTitle: {
    color: '#38BDF8',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 2,
    marginBottom: 12,
  },
  title: {
    color: '#F9FAFB',
    fontSize: 32,
    fontWeight: '800',
    textAlign: 'center',
    lineHeight: 40,
  },
  benefitsContainer: {
    flex: 1,
    justifyContent: 'center',
    gap: 32,
    paddingHorizontal: 10,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  iconBox: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  benefitText: {
    flex: 1,
    color: '#D1D5DB',
    fontSize: 17,
    lineHeight: 24,
    fontWeight: '500',
  },
  highlight: {
    color: '#F9FAFB',
    fontWeight: '800',
  },
  footer: {
    marginBottom: 40,
    gap: 16,
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
    backgroundColor: '#38BDF8',
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#38BDF8',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  primaryButtonPressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.9,
  },
  primaryButtonDisabled: {
    opacity: 0.5,
  },
  primaryButtonText: {
    color: '#0F172A',
    fontSize: 18,
    fontWeight: '800',
  },
  secondaryButton: {
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  secondaryButtonPressed: {
    opacity: 0.5,
  },
  secondaryButtonText: {
    color: '#9CA3AF',
    fontSize: 15,
    fontWeight: '600',
  },
});
