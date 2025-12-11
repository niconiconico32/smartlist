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
          backgroundColor: 'rgba(44, 51, 49, 0.98)', // Surface con 98% opacidad
          borderRadius: 32,
          borderTopWidth: 0,
          borderWidth: 1,
          borderColor: 'rgba(168, 230, 207, 0.1)',
          paddingBottom: 0,
          paddingTop: 0,
          shadowColor: '#000000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.15,
          shadowRadius: 10,
          elevation: 5,
        },
        tabBarItemStyle: {
          justifyContent: 'center',
          alignItems: 'center',
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
          title: 'Add',
          tabBarIcon: ({ color }) => (
            <FontAwesome 
              name="plus" 
              size={26} 
              color="#1C2120"
              style={{
                backgroundColor: colors.primary,
                width: 52,
                height: 52,
                borderRadius: 26,
                textAlign: 'center',
                textAlignVertical: 'center',
                lineHeight: 52,
                shadowColor: colors.primary,
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.3,
                shadowRadius: 6,
                elevation: 4,
              }}
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
