import { colors } from '@/constants/theme';
import { ProgressCard } from '@/src/components/ProgressCard';
import { WeeklyCalendar } from '@/src/components/WeeklyCalendar';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { CalendarCheck, Grid2x2 } from 'lucide-react-native';
import React, { createRef, useRef, useState } from 'react';
import { Dimensions, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import PagerView from 'react-native-pager-view';
import IndexScreen from './index';
import TwoScreen from './two';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Ref para llamar función del IndexScreen
export const addTaskRef = createRef<{ openTaskModal: () => void }>();

export default function SwipeableLayout() {
  const pagerRef = useRef<PagerView>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const router = useRouter();

  const handleTabPress = (page: number) => {
    if (Platform.OS === 'ios') {
      Haptics.selectionAsync();
    } else {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    pagerRef.current?.setPage(page);
  };

  const handleAddPress = () => {
    if (Platform.OS === 'ios') {
      Haptics.selectionAsync();
    } else {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    // Abrir modal de agregar tarea
    addTaskRef.current?.openTaskModal();
  };

  return (
    <View style={styles.container}>
      {/* Fixed Header Components */}
      <View style={styles.fixedHeader}>
        <WeeklyCalendar />
        <View style={styles.progressWrapper}>
          <ProgressCard 
            completedToday={0}
            totalToday={0}
          />
        </View>
      </View>

      {/* Swipeable Content */}
      <PagerView
        ref={pagerRef}
        style={styles.pagerView}
        initialPage={0}
        onPageSelected={(e) => setCurrentPage(e.nativeEvent.position)}
      >
        <View key="1" style={styles.page}>
          <IndexScreen />
        </View>
        <View key="2" style={styles.page}>
          <TwoScreen />
        </View>
      </PagerView>

      {/* Tab Bar */}
      <View style={styles.tabBar}>
        <Pressable
          style={[styles.tabItem, currentPage === 0 && styles.tabItemActive]}
          onPress={() => handleTabPress(0)}
        >
          <CalendarCheck
            size={22}
            color={currentPage === 0 ? '#181824' : '#9CA3AF'}
          />
          <Text style={[styles.tabLabel, currentPage === 0 && styles.tabLabelActive]}>
            Tareas
          </Text>
        </Pressable>

        <Pressable style={styles.centralButtonContainer} onPress={handleAddPress}>
          <View style={styles.centralButton}>
            <FontAwesome name="plus" size={24} color="#F5F5F5" />
          </View>
        </Pressable>

        <Pressable
          style={[styles.tabItem, currentPage === 1 && styles.tabItemActive]}
          onPress={() => handleTabPress(1)}
        >
          <Grid2x2
            size={22}
            color={currentPage === 1 ? '#181824' : '#9CA3AF'}
          />
          <Text style={[styles.tabLabel, currentPage === 1 && styles.tabLabelActive]}>
            Rutinas
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  fixedHeader: {
    backgroundColor: '#F5F5F5',
    zIndex: 1,
  },
  progressWrapper: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  pagerView: {
    flex: 1,
  },
  page: {
    flex: 1,
  },
  tabBar: {
    position: 'absolute',
    bottom: 10,
    left: 0,
    right: 0,
    height: 110,
    backgroundColor: 'rgba(255, 255, 255, 0.98)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingBottom: 50,
    paddingTop: 10,
    paddingHorizontal: 8,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  tabItemActive: {
    // Puedes agregar estilos adicionales para el tab activo
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 4,
    color: '#9CA3AF',
  },
  tabLabelActive: {
    color: '#181824',
  },
  centralButtonContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  centralButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 6,
  },
});
