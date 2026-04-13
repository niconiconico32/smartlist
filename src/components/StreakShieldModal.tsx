import * as Haptics from 'expo-haptics';
import React from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { AppText as Text } from '@/src/components/AppText';
import { ShieldAlert } from 'lucide-react-native';
import { useProStore } from '../store/proStore';
import { useAppStreakStore } from '../store/appStreakStore';

export const StreakShieldModal: React.FC = () => {
  const { pendingShieldOffer, streakShieldCount, consumeShield, clearPendingShieldOffer } = useProStore();
  const { streak, resetStreak, markShieldUsed } = useAppStreakStore();

  if (!pendingShieldOffer) return null;

  const handleUseShield = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await consumeShield();
    markShieldUsed(); // Flag streak as shield-protected so DailyStreakScreen shows ⬤ Protected variant
  };

  const handleDecline = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    await clearPendingShieldOffer();
    await resetStreak(); // Hard reset back to 1
  };

  return (
    <Modal
      visible={pendingShieldOffer}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={handleDecline}
    >
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.iconContainer}>
            <ShieldAlert size={48} color="#F59E0B" strokeWidth={2} />
          </View>

          <Text style={styles.title}>¡Tu racha está en peligro!</Text>
          <Text style={styles.description}>
            Ayer no abriste la aplicación y estás a punto de perder tu racha de {streak} días.
          </Text>

          <View style={styles.shieldInfoContainer}>
            <Text style={styles.shieldInfoText}>
              Tienes <Text style={styles.shieldCount}>{streakShieldCount}</Text> escudos protectores restantes.
            </Text>
          </View>

          <View style={styles.buttonContainer}>
            <Pressable style={styles.primaryButton} onPress={handleUseShield}>
              <Text style={styles.primaryButtonText}>Usar Escudo 🛡️</Text>
            </Pressable>

            <Pressable style={styles.secondaryButton} onPress={handleDecline}>
              <Text style={styles.secondaryButtonText}>Perder racha de {streak} días</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 28,
    width: '100%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1F2937',
    marginBottom: 12,
    textAlign: 'center',
  },
  description: {
    fontSize: 15,
    color: '#4B5563',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 20,
  },
  shieldInfoContainer: {
    backgroundColor: '#F3F4F6',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 28,
    width: '100%',
  },
  shieldInfoText: {
    fontSize: 14,
    color: '#374151',
    textAlign: 'center',
  },
  shieldCount: {
    fontWeight: '700',
    color: '#F59E0B',
  },
  buttonContainer: {
    width: '100%',
    gap: 12,
  },
  primaryButton: {
    backgroundColor: '#10B981',
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    width: '100%',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryButton: {
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
    width: '100%',
  },
  secondaryButtonText: {
    color: '#EF4444',
    fontSize: 15,
    fontWeight: '600',
  },
});
