import { colors } from '@/constants/theme';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import * as Haptics from 'expo-haptics';
import { Clock, Play } from 'lucide-react-native';
import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View
} from 'react-native';

interface LiquidFABProps {
  onHacerTareaPress: () => void;
  onProgramarTareaPress: () => void;
  onOpenChange?: (isOpen: boolean) => void;
  isOpen?: boolean;
}

export const LiquidFAB: React.FC<LiquidFABProps> = ({
  onHacerTareaPress,
  onProgramarTareaPress,
  onOpenChange,
  isOpen: externalIsOpen,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  // Sincronizar estado interno con el prop externo
  useEffect(() => {
    if (externalIsOpen !== undefined && externalIsOpen !== isOpen) {
      const toValue = externalIsOpen ? 1 : 0;

      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue,
          friction: 6,
          tension: 40,
          useNativeDriver: true,
        }),
        Animated.timing(rotateAnim, {
          toValue,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();

      setIsOpen(externalIsOpen);
    }
  }, [externalIsOpen]);

  const toggleFAB = () => {
    const toValue = isOpen ? 0 : 1;

    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue,
        friction: 6,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.timing(rotateAnim, {
        toValue: isOpen ? 0 : 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();

    const newState = !isOpen;
    setIsOpen(newState);
    onOpenChange?.(newState);

    if (Platform.OS === 'ios') {
      Haptics.selectionAsync();
    } else {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const handleHacerTareaPress = () => {
    if (Platform.OS === 'ios') {
      Haptics.selectionAsync();
    } else {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onHacerTareaPress();
    toggleFAB();
  };

  const handleProgramarTareaPress = () => {
    if (Platform.OS === 'ios') {
      Haptics.selectionAsync();
    } else {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onProgramarTareaPress();
    toggleFAB();
  };

  const rotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '45deg'],
  });

  const buttonScale = scaleAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  const voiceOpacity = scaleAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, 0, 1],
  });

  const attachmentOpacity = scaleAnim.interpolate({
    inputRange: [0, 0.75, 1],
    outputRange: [0, 0, 1],
  });

  return (
    <View style={styles.container}>
      {/* Hacer Tarea Option */}
      <Animated.View
        style={[
          styles.optionButton,
          {
            transform: [
              {
                translateY: scaleAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, -140],
                }),
              },
              {
                translateX: scaleAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, -10],
                }),
              },
            ],
            opacity: voiceOpacity,
          },
        ]}
      >
        <Text style={styles.optionLabel}>Nueva Tarea</Text>
        <Pressable
          style={styles.optionButtonInner}
          onPress={handleHacerTareaPress}
        >
          <Play size={20} color="#F5F5F5" strokeWidth={2} fill="#F5F5F5" />
        </Pressable>
      </Animated.View>

      {/* Programar Tarea Option */}
      <Animated.View
        style={[
          styles.optionButton,
          {
            transform: [
              {
                translateY: scaleAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, -80],
                }),
              },
              {
                translateX: scaleAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, -10],
                }),
              },
            ],
            opacity: attachmentOpacity,
          },
        ]}
      >
        <Text style={styles.optionLabel}>Programar Tarea</Text>
        <Pressable
          style={styles.optionButtonInner}
          onPress={handleProgramarTareaPress}
        >
          <Clock size={20} color="#F5F5F5" strokeWidth={2} />
        </Pressable>
      </Animated.View>

      {/* Main FAB Button */}
      <Animated.View
        style={[
          styles.mainButtonContainer,
          {
            transform: [{ rotate }],
          },
        ]}
      >
        <Pressable
          style={styles.mainButton}
          onPress={toggleFAB}
        >
          <MaterialCommunityIcons name="plus" size={28} color="#F5F5F5" />
        </Pressable>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  mainButtonContainer: {
    zIndex: 10,
  },
  mainButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  optionButton: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'flex-end',
    zIndex: 5,
    flexDirection: 'row',
    gap: 12,
  },
  optionButtonInner: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 6,
  },
  optionLabel: {
    color: '#F5F5F5',
    fontSize: 12,
    fontWeight: '600',
    minWidth: 90,
    textAlign: 'right',

  },
});
