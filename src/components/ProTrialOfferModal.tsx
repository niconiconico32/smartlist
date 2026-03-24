import * as Haptics from 'expo-haptics';
import React from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useProStore } from '../store/proStore';

interface ProTrialOfferModalProps {
  visible: boolean;
  onClose: () => void;
}

export const ProTrialOfferModal: React.FC<ProTrialOfferModalProps> = ({
  visible,
  onClose,
}) => {
  const { activateTrial, dismissTrialOffer } = useProStore();

  const handleActivate = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await activateTrial();
    onClose();
  };

  const handleDismiss = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await dismissTrialOffer();
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={handleDismiss}
    >
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Pressable style={styles.activateButton} onPress={handleActivate}>
            <Text style={styles.activateButtonText}>Activar Pro</Text>
          </Pressable>

          <Pressable style={styles.dismissButton} onPress={handleDismiss}>
            <Text style={styles.dismissButtonText}>Ahora no</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 32,
    paddingBottom: 48,
    alignItems: 'center',
    gap: 12,
  },
  activateButton: {
    width: '100%',
    backgroundColor: '#7C3AED',
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
  },
  activateButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  dismissButton: {
    width: '100%',
    paddingVertical: 12,
    alignItems: 'center',
  },
  dismissButtonText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#9CA3AF',
  },
});
