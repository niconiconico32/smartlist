import { format } from 'date-fns';
import * as Haptics from 'expo-haptics';
import LottieView from 'lottie-react-native';
import { Crown } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
  Dimensions,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface RoutineCelebrationProps {
  visible: boolean;
  routineName: string;
  earnedCoins: number;
  onClose: () => void;
}

export const RoutineCelebration: React.FC<RoutineCelebrationProps> = ({
  visible,
  routineName,
  earnedCoins,
  onClose,
}) => {
  const [completionTime, setCompletionTime] = useState(new Date());

  useEffect(() => {
    if (visible) {
      setCompletionTime(new Date());

      // Haptic sequence for celebration
      setTimeout(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success), 300);
      setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy), 600);
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent={false}
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.container}>



        {/* Lottie Animation (Confetti + Checkmark) */}
        <View style={styles.lottieContainer}>
          <LottieView
            source={{ uri: 'https://lottie.host/c676685f-f2f7-4fb6-a9cb-5622085f3811/okjqHbos24.lottie' }}
            autoPlay
            loop={false}
            style={styles.lottie}
            resizeMode="cover"
          />
        </View>

        {/* Texts */}
        <View style={styles.textContainer}>
          <Text style={styles.title}>¡Rutina completada!</Text>
          <Text style={styles.subtitle}>
            Sigue así y mantén tu racha activa todos los días
          </Text>
        </View>

        {/* Bottom Card */}
        <View style={styles.bottomSection}>
          <View style={styles.card}>
            <View style={styles.cardLeft}>
              <Text style={styles.cardTitle} numberOfLines={2}>
                {routineName || "Rutina"}
              </Text>
              <Text style={styles.cardSubtitle}>
                {format(completionTime, 'HH:mm')}
              </Text>
            </View>
            <View style={styles.cardRight}>
              <Text style={styles.pointsText}>+{earnedCoins}</Text>
              <Crown size={28} color="#FFD700" fill="#FFD700" />
            </View>
          </View>

          {/* Continue Button */}
          <Pressable
            style={({ pressed }) => [
              styles.continueButton,
              pressed && styles.continueButtonPressed
            ]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              onClose();
            }}
          >
            <Text style={styles.continueButtonText}>Continuar</Text>
          </Pressable>
        </View>

      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
    justifyContent: 'space-between',
  },
  closeButtonContainer: {
    position: 'absolute',
    top: 60,
    right: 24,
    zIndex: 10,
    padding: 8,
  },
  closeButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#3F37C9', // Estilo azul link
  },
  lottieContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 40,
    zIndex: 1,
  },
  lottie: {
    width: SCREEN_WIDTH * 1.2,
    height: SCREEN_WIDTH * 1.2,
    position: 'absolute',
  },
  textContainer: {
    alignItems: 'center',
    paddingHorizontal: 32,
    zIndex: 2,
    marginTop: -40,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#1E1E1E',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '400',
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
  },
  bottomSection: {
    paddingHorizontal: 24,
    paddingBottom: 50,
    paddingTop: 40,
    zIndex: 2,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
  },
  cardLeft: {
    flex: 1,
    paddingRight: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E1E1E',
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 14,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  cardRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFBEB', // Light yellow tint to pair with crown
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 16,
  },
  pointsText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#D97706',
  },
  continueButton: {
    backgroundColor: '#F3F4F6',
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  continueButtonPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
  continueButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1E1E1E',
  },
});
