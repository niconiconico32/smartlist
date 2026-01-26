/**
 * 🧪 Notification Testing Panel
 * Panel para probar el sistema de notificaciones durante desarrollo
 */

import React, { useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Bell, X, Send, Calendar, Trash, Info } from 'lucide-react-native';
import { colors } from '@/constants/theme';
import {
  requestNotificationPermissions,
  checkNotificationPermissions,
  scheduleDailyNotifications,
  cancelAllScheduledNotifications,
  getScheduledNotifications,
  sendTestNotification,
  sendStreakNotification,
} from '@/src/utils/notifications';

interface NotificationTestPanelProps {
  visible: boolean;
  onClose: () => void;
}

export function NotificationTestPanel({ visible, onClose }: NotificationTestPanelProps) {
  const [permissionStatus, setPermissionStatus] = useState<string>('Checking...');
  const [scheduledCount, setScheduledCount] = useState<number>(0);

  const checkStatus = async () => {
    const hasPermission = await checkNotificationPermissions();
    setPermissionStatus(hasPermission ? '✅ Granted' : '❌ Denied');
    
    const notifications = await getScheduledNotifications();
    setScheduledCount(notifications.length);
  };

  React.useEffect(() => {
    if (visible) {
      checkStatus();
    }
  }, [visible]);

  const handleRequestPermissions = async () => {
    const granted = await requestNotificationPermissions();
    if (granted) {
      Alert.alert('✅ Success', 'Notification permissions granted!');
      checkStatus();
    } else {
      Alert.alert('❌ Denied', 'You need to enable notifications in your device settings.');
    }
  };

  const handleScheduleDaily = async () => {
    await scheduleDailyNotifications();
    Alert.alert('✅ Scheduled', 'Daily notifications have been set up!\n\n• 9 AM - Morning\n• 2 PM - Afternoon\n• 8 PM - Evening');
    checkStatus();
  };

  const handleSendTest = async () => {
    await sendTestNotification();
    Alert.alert('🧪 Test Sent', 'Check your notification tray in 2 seconds!');
  };

  const handleTestStreak = async () => {
    Alert.prompt(
      '🔥 Test Streak Notification',
      'Enter streak day (1, 7, 30, etc.):',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send',
          onPress: async (value) => {
            const days = parseInt(value || '1');
            await sendStreakNotification(days);
            Alert.alert('✅ Sent', `Streak notification for day ${days} sent!`);
          },
        },
      ],
      'plain-text',
      '7'
    );
  };

  const handleCancelAll = async () => {
    Alert.alert(
      '🗑️ Cancel All',
      'Are you sure you want to cancel all scheduled notifications?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            await cancelAllScheduledNotifications();
            Alert.alert('✅ Cancelled', 'All scheduled notifications have been removed.');
            checkStatus();
          },
        },
      ]
    );
  };

  const handleViewScheduled = async () => {
    const notifications = await getScheduledNotifications();
    if (notifications.length === 0) {
      Alert.alert('📭 Empty', 'No scheduled notifications found.');
      return;
    }

    const list = notifications.map((n, i) => {
      const trigger = n.trigger as any;
      const time = trigger.hour !== undefined 
        ? `${trigger.hour}:${String(trigger.minute).padStart(2, '0')}` 
        : 'Immediate';
      return `${i + 1}. ${n.content.title}\n   ⏰ ${time}`;
    }).join('\n\n');

    Alert.alert(`📋 Scheduled (${notifications.length})`, list);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.panel}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <Bell size={24} color={colors.primary} />
              <Text style={styles.title}>Notification Testing</Text>
            </View>
            <Pressable onPress={onClose} style={styles.closeButton}>
              <X size={24} color="#CDD6F4" />
            </Pressable>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Status Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>📊 Status</Text>
              <View style={styles.statusCard}>
                <Text style={styles.statusText}>Permissions: {permissionStatus}</Text>
                <Text style={styles.statusText}>Scheduled: {scheduledCount} notifications</Text>
              </View>
            </View>

            {/* Actions */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>🎮 Actions</Text>
              
              <ActionButton
                icon={Bell}
                label="Request Permissions"
                onPress={handleRequestPermissions}
                color="#89B4FA"
              />
              
              <ActionButton
                icon={Calendar}
                label="Schedule Daily Notifications"
                onPress={handleScheduleDaily}
                color="#A6E3A1"
              />
              
              <ActionButton
                icon={Send}
                label="Send Test Notification"
                onPress={handleSendTest}
                color="#FAB387"
              />
              
              <ActionButton
                icon={Send}
                label="Test Streak Notification"
                onPress={handleTestStreak}
                color="#F9E2AF"
              />
              
              <ActionButton
                icon={Info}
                label="View Scheduled"
                onPress={handleViewScheduled}
                color="#89DCEB"
              />
              
              <ActionButton
                icon={Trash}
                label="Cancel All Notifications"
                onPress={handleCancelAll}
                color="#F38BA8"
              />
            </View>

            {/* Info */}
            <View style={styles.infoBox}>
              <Text style={styles.infoText}>
                💡 Note: In Expo Go, notifications have limitations. 
                For full functionality, test in a development build or production.
              </Text>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

interface ActionButtonProps {
  icon: React.ComponentType<any>;
  label: string;
  onPress: () => void;
  color: string;
}

function ActionButton({ icon: Icon, label, onPress, color }: ActionButtonProps) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.actionButton,
        { backgroundColor: color + '20' },
        pressed && styles.buttonPressed,
      ]}
      onPress={onPress}
    >
      <Icon size={20} color={color} />
      <Text style={styles.actionLabel}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  panel: {
    backgroundColor: '#1E1E2E',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#313244',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#CDD6F4',
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#313244',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#CDD6F4',
    marginBottom: 12,
  },
  statusCard: {
    backgroundColor: '#313244',
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  statusText: {
    fontSize: 14,
    color: '#BAC2DE',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  actionLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: '#CDD6F4',
    flex: 1,
  },
  buttonPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.98 }],
  },
  infoBox: {
    backgroundColor: '#313244',
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#89B4FA',
  },
  infoText: {
    fontSize: 13,
    color: '#BAC2DE',
    lineHeight: 20,
  },
});
