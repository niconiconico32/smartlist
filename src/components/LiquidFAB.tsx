import { colors } from '@/constants/theme';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
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
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Pulsación sutil y continua en reposo
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.08,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

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
  }, [externalIsOpen, isOpen]);

  const toggleFAB = () => {
    const newOpenState = !isOpen;
    const toValue = newOpenState ? 1 : 0;

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

    setIsOpen(newOpenState);
    onOpenChange?.(newOpenState);

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
        pointerEvents={isOpen ? 'auto' : 'none'}
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
          hitSlop={20}
          style={styles.optionButtonInner}
          onPress={handleHacerTareaPress}
        >
          <Play size={20} color="#F5F5F5" strokeWidth={2} fill="#F5F5F5" />
        </Pressable>
      </Animated.View>

      {/* Programar Tarea Option */}
      <Animated.View
        pointerEvents={isOpen ? 'auto' : 'none'}
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
          hitSlop={20}
          style={styles.optionButtonInner}
          onPress={handleProgramarTareaPress}
        >
          <Clock size={20} color="#F5F5F5" strokeWidth={2} />
        </Pressable>
      </Animated.View>

      {/* Main FAB Button - Con Gradiente Digital Sunset */}
      <Animated.View
        style={[
          styles.mainButtonContainer,
          {
            transform: [
              { rotate },
              { scale: pulseAnim }
            ],
          },
        ]}
      >
        <Pressable
          style={[styles.mainButton]}
          onPress={() => {
            console.log('FAB pressed, isOpen:', isOpen);
            toggleFAB();
          }}
        >
          <LinearGradient
            colors={['#CBA6F7', '#FAB387']} // Lavender Haze to Peach Fuzz
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.gradientButton}
          >
            <MaterialCommunityIcons name="plus" size={32} color="#FFFFFF" />
          </LinearGradient>
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
    width: 70,
    height: 70,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mainButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    shadowColor: '#CBA6F7',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 10,
  },
  gradientButton: {
    width: '100%',
    height: '100%',
    borderRadius: 35,
    alignItems: 'center',
    justifyContent: 'center',
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
    color: colors.textPrimary,
    fontSize: 12,
    fontWeight: '600',
    minWidth: 90,
    textAlign: 'right',
  },
});
