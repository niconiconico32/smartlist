import { router } from 'expo-router';
import React, { useEffect } from 'react';
import { View } from 'react-native';

export default function AddScreen() {
  useEffect(() => {
    router.replace('/(tabs)');
  }, []);

  return <View />;
}
