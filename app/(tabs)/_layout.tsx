import { colors } from '@/constants/theme';
import { TAB_BAR_BOTTOM_MARGIN, TAB_BAR_HEIGHT } from '@/src/hooks/useBottomTabInset';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import * as Haptics from 'expo-haptics';
import { Tabs } from 'expo-router';
import React from 'react';
import { Platform } from 'react-native';

function TabBarIcon(props: {
  name: React.ComponentProps<typeof FontAwesome>['name'];
  color: string;
}) {
  return <FontAwesome size={24} {...props} />;
}

// Función para feedback háptico al cambiar de tab
const handleTabPress = () => {
  if (Platform.OS === 'ios') {
    Haptics.selectionAsync();
  } else {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }
};

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: '#8B9E96',
        tabBarShowLabel: false,
        tabBarStyle: {
          position: 'absolute',
          bottom: TAB_BAR_BOTTOM_MARGIN,
          left: 20,
          right: 20,
          height: TAB_BAR_HEIGHT,
          backgroundColor: 'rgba(44, 51, 49, 0.98)',
          borderRadius: 32,
          borderTopWidth: 0,
          paddingBottom: 8,
          paddingTop: 8,
          paddingHorizontal: 20,
          shadowColor: '#000000',
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.2,
          shadowRadius: 16,
          elevation: 8,
        },
        tabBarItemStyle: {
          paddingVertical: 0,
        },
        headerShown: false,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Plan',
          tabBarIcon: ({ color }) => <TabBarIcon name="list-ul" color={color} />,
        }}
        listeners={{
          tabPress: handleTabPress,
        }}
      />
      <Tabs.Screen
        name="add"
        options={{
          title: 'Testing',
          tabBarIcon: ({ color }) => (
            <FontAwesome 
              name="flask" 
              size={24} 
              color={color}
            />
          ),
        }}
        listeners={{
          tabPress: handleTabPress,
        }}
      />
      <Tabs.Screen
        name="two"
        options={{
          title: 'Focus',
          tabBarIcon: ({ color }) => <TabBarIcon name="bullseye" color={color} />,
        }}
        listeners={{
          tabPress: handleTabPress,
        }}
      />
    </Tabs>
  );
}
