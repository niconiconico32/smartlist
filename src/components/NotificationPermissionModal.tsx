import { colors } from '@/constants/theme';
import * as Notifications from 'expo-notifications';
import { LinearGradient } from 'expo-linear-gradient';
import { Bell, Flame, Sparkles, X } from 'lucide-react-native';
import React, { useState } from 'react';
import {
  Animated,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

interface NotificationPermissionModalProps {
  visible: boolean;
  onClose: () => void;
  onPermissionGranted: () => void;
}

export const NotificationPermissionModal: React.FC<NotificationPermissionModalProps> = ({
  visible,
  onClose,
  onPermissionGranted,
}) => {
  const [isRequesting, setIsRequesting] = useState(false);

  const handleRequestPermission = async () => {
    setIsRequesting(true);
    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus === 'granted') {
        onPermissionGranted();
        onClose();
      } else {
        // User denied - still close modal but don't trigger success
        onClose();
      }
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      onClose();
    } finally {
      setIsRequesting(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        
        <Animated.View style={styles.modalContainer}>
          {/* Close button */}
          <Pressable
            style={styles.closeButton}
            onPress={onClose}
            hitSlop={8}
          >
            <X size={20} color={colors.textSecondary} />
          </Pressable>

          {/* Icon Hero Section */}
          <View style={styles.iconContainer}>
            <LinearGradient
              colors={['#CBA6F7', '#FAB387']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.iconGradient}
            >
              <Bell size={48} color="white" strokeWidth={2} />
            </LinearGradient>
            
            {/* Decorative elements - 2026 trend: soft, floating elements */}
            <View style={[styles.floatingElement, styles.flame]}>
              <Flame size={24} color={colors.accent} fill={colors.accent} />
            </View>
            <View style={[styles.floatingElement, styles.sparkle]}>
              <Sparkles size={20} color={colors.primary} />
            </View>
          </View>

          {/* Content */}
          <View style={styles.content}>
            <Text style={styles.title}>
              Activa las notificaciones
            </Text>
            <Text style={styles.subtitle}>
              para que nunca pierdas tu racha
            </Text>
            
            <View style={styles.benefitsContainer}>
              <BenefitItem 
                icon="🔥"
                text="Recordatorios motivadores durante el día"
              />
              <BenefitItem 
                icon="💪"
                text="Celebra tus logros y mantén el momentum"
              />
              <BenefitItem 
                icon="⚡"
                text="Protege tu racha, nunca más la pierdas"
              />
            </View>
          </View>

          {/* Action Buttons - 2026: Soft gradients, pill shapes */}
          <View style={styles.actions}>
            <Pressable
              style={styles.primaryButton}
              onPress={handleRequestPermission}
              disabled={isRequesting}
            >
              <LinearGradient
                colors={['#CBA6F7', '#FAB387']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.primaryButtonGradient}
              >
                <Text style={styles.primaryButtonText}>
                  {isRequesting ? 'Activando...' : 'Activar notificaciones'}
                </Text>
              </LinearGradient>
            </Pressable>

            <Pressable
              style={styles.secondaryButton}
              onPress={onClose}
            >
              <Text style={styles.secondaryButtonText}>
                Ahora no
              </Text>
            </Pressable>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

const BenefitItem: React.FC<{ icon: string; text: string }> = ({ icon, text }) => (
  <View style={styles.benefitItem}>
    <Text style={styles.benefitIcon}>{icon}</Text>
    <Text style={styles.benefitText}>{text}</Text>
  </View>
);

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(30, 30, 46, 0.85)', // Soft dark overlay - 2026 trend
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: colors.surface,
    borderRadius: 32, // Extra soft corners - 2026 trend
    padding: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.3,
    shadowRadius: 40,
    elevation: 20,
    borderWidth: 1,
    borderColor: 'rgba(203, 166, 247, 0.15)',
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surfaceHighlight,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 24,
    position: 'relative',
  },
  iconGradient: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#CBA6F7',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 10,
  },
  floatingElement: {
    position: 'absolute',
  },
  flame: {
    top: -8,
    right: 0,
    transform: [{ rotate: '15deg' }],
  },
  sparkle: {
    bottom: 0,
    left: -4,
    transform: [{ rotate: '-15deg' }],
  },
  content: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    fontWeight: '500',
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 32,
  },
  benefitsContainer: {
    width: '100%',
    gap: 16,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceHighlight,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 16,
    gap: 12,
  },
  benefitIcon: {
    fontSize: 24,
  },
  benefitText: {
    flex: 1,
    fontSize: 15,
    color: colors.textPrimary,
    fontWeight: '500',
    lineHeight: 20,
  },
  actions: {
    gap: 12,
  },
  primaryButton: {
    width: '100%',
    height: 56,
    borderRadius: 28, // Pill shape - 2026 trend
    overflow: 'hidden',
    shadowColor: '#CBA6F7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  primaryButtonGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: 'white',
    letterSpacing: 0.2,
  },
  secondaryButton: {
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.textSecondary,
  },
});
