import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { Bug, Calendar, Database, Trash2, X } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
    Alert,
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';

const ACTIVITIES_STORAGE_KEY = '@smartlist_activities';
const STREAK_STORAGE_KEY = '@smartlist_streak';

type DebugPanelProps = {
  onTriggerStreak?: (days: number) => void;
};

export default function DebugPanel({ onTriggerStreak }: DebugPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [storageData, setStorageData] = useState<any>(null);
  const [streakData, setStreakData] = useState<any>(null);

  useEffect(() => {
    if (isOpen) {
      loadStorageData();
    }
  }, [isOpen]);

  const loadStorageData = async () => {
    try {
      const activities = await AsyncStorage.getItem(ACTIVITIES_STORAGE_KEY);
      const streak = await AsyncStorage.getItem(STREAK_STORAGE_KEY);
      setStorageData(activities ? JSON.parse(activities) : null);
      setStreakData(streak ? JSON.parse(streak) : null);
    } catch (error) {
      console.error('Error loading storage data:', error);
    }
  };

  const clearAllData = () => {
    Alert.alert(
      '⚠️ Borrar Todos los Datos',
      '¿Estás seguro? Esto eliminará todas las tareas y rachas.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Borrar',
          style: 'destructive',
          onPress: async () => {
            try {
              await AsyncStorage.clear();
              setStorageData(null);
              setStreakData(null);
              Alert.alert('✅ Datos Borrados', 'Todos los datos fueron eliminados. Reinicia la app.');
            } catch (error) {
              console.error('Error clearing data:', error);
              Alert.alert('Error', 'No se pudieron borrar los datos');
            }
          },
        },
      ]
    );
  };

  const clearActivitiesOnly = () => {
    Alert.alert(
      '⚠️ Borrar Tareas',
      '¿Eliminar todas las tareas?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Borrar',
          style: 'destructive',
          onPress: async () => {
            try {
              await AsyncStorage.removeItem(ACTIVITIES_STORAGE_KEY);
              setStorageData(null);
              Alert.alert('✅ Tareas Borradas', 'Recarga la pantalla para ver los cambios');
            } catch (error) {
              console.error('Error clearing activities:', error);
            }
          },
        },
      ]
    );
  };

  const clearStreakOnly = () => {
    Alert.alert(
      '⚠️ Resetear Racha',
      '¿Eliminar datos de racha?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Resetear',
          style: 'destructive',
          onPress: async () => {
            try {
              await AsyncStorage.removeItem(STREAK_STORAGE_KEY);
              setStreakData(null);
              Alert.alert('✅ Racha Reseteada');
            } catch (error) {
              console.error('Error clearing streak:', error);
            }
          },
        },
      ]
    );
  };

  const simulateStreak = (days: number) => {
    if (onTriggerStreak) {
      onTriggerStreak(days);
      setIsOpen(false);
    }
  };

  return (
    <>
      {/* Floating Debug Button */}
      <Pressable
        style={styles.floatingButton}
        onPress={() => setIsOpen(true)}
      >
        <LinearGradient
          colors={['#FF6B6B', '#FF4757']}
          style={styles.floatingButtonGradient}
        >
          <Bug size={24} color="#FFFFFF" />
        </LinearGradient>
      </Pressable>

      {/* Debug Panel Modal */}
      <Modal
        visible={isOpen}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.headerLeft}>
                <Bug size={24} color="#FF6B6B" />
                <Text style={styles.headerTitle}>Debug Panel</Text>
              </View>
              <Pressable onPress={() => setIsOpen(false)} style={styles.closeButton}>
                <X size={24} color="#64748b" />
              </Pressable>
            </View>

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
              {/* Quick Actions */}
              <Text style={styles.sectionTitle}>Acciones Rápidas</Text>
              <View style={styles.section}>
                <Pressable style={styles.actionButton} onPress={clearActivitiesOnly}>
                  <Trash2 size={20} color="#F38BA8" />
                  <Text style={styles.actionButtonText}>Borrar Tareas</Text>
                </Pressable>

                <Pressable style={styles.actionButton} onPress={clearStreakOnly}>
                  <Calendar size={20} color="#FAB387" />
                  <Text style={styles.actionButtonText}>Resetear Racha</Text>
                </Pressable>

                <Pressable style={styles.actionButton} onPress={clearAllData}>
                  <Database size={20} color="#FF6B6B" />
                  <Text style={styles.actionButtonText}>Borrar Todo</Text>
                </Pressable>

                <Pressable style={styles.actionButton} onPress={loadStorageData}>
                  <Database size={20} color="#89B4FA" />
                  <Text style={styles.actionButtonText}>Recargar Datos</Text>
                </Pressable>
              </View>

              {/* Streak Simulation */}
              <Text style={styles.sectionTitle}>Simular Rachas</Text>
              <View style={styles.section}>
                <View style={styles.streakButtons}>
                  {[1, 3, 5, 7, 14, 30].map((days) => (
                    <Pressable
                      key={days}
                      style={styles.streakButton}
                      onPress={() => simulateStreak(days)}
                    >
                      <Text style={styles.streakButtonText}>🔥 {days}d</Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              {/* Storage Data Viewer */}
              <Text style={styles.sectionTitle}>AsyncStorage Data</Text>
              <View style={styles.section}>
                <Text style={styles.dataLabel}>Tareas ({storageData?.length || 0})</Text>
                {storageData && storageData.length > 0 ? (
                  <ScrollView style={styles.dataContainer} nestedScrollEnabled>
                    <Text style={styles.dataText}>
                      {JSON.stringify(storageData, null, 2)}
                    </Text>
                  </ScrollView>
                ) : (
                  <Text style={styles.emptyText}>No hay tareas guardadas</Text>
                )}
              </View>

              <View style={styles.section}>
                <Text style={styles.dataLabel}>Racha</Text>
                {streakData ? (
                  <ScrollView style={styles.dataContainer} nestedScrollEnabled>
                    <Text style={styles.dataText}>
                      {JSON.stringify(streakData, null, 2)}
                    </Text>
                  </ScrollView>
                ) : (
                  <Text style={styles.emptyText}>No hay datos de racha</Text>
                )}
              </View>

              {/* App Info */}
              <Text style={styles.sectionTitle}>App Info</Text>
              <View style={styles.section}>
                <Text style={styles.infoText}>Package: com.brainyahdh.app</Text>
                <Text style={styles.infoText}>Version: 1.0.0</Text>
                <Text style={styles.infoText}>Build: Development</Text>
                <Text style={styles.infoText}>ENV: {__DEV__ ? 'DEV' : 'PROD'}</Text>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  floatingButton: {
    position: 'absolute',
    bottom: 100,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 999,
  },
  floatingButtonGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1E1E2E',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
    paddingTop: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2A2A3C',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  closeButton: {
    padding: 4,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 20,
    marginBottom: 12,
  },
  section: {
    backgroundColor: '#252536',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#2A2A3C',
    borderRadius: 8,
    marginBottom: 8,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  streakButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  streakButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#2A2A3C',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FAB387',
  },
  streakButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FAB387',
  },
  dataLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#89B4FA',
    marginBottom: 8,
  },
  dataContainer: {
    maxHeight: 200,
    backgroundColor: '#1A1A24',
    borderRadius: 8,
    padding: 12,
  },
  dataText: {
    fontSize: 12,
    fontFamily: 'monospace',
    color: '#CDD6F4',
    lineHeight: 18,
  },
  emptyText: {
    fontSize: 14,
    color: '#64748b',
    fontStyle: 'italic',
  },
  infoText: {
    fontSize: 14,
    color: '#94A3B8',
    marginBottom: 6,
    fontFamily: 'monospace',
  },
});
