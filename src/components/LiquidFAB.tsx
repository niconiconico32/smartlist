import { PRIMARY_GRADIENT_COLORS } from '@/constants/buttons';
import { colors } from '@/constants/theme';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { Clock, Play, Plus } from 'lucide-react-native';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, View } from 'react-native';
import { AppText as Text } from '@/src/components/AppText';

interface LiquidFABProps {
  currentPage: number;
  onHacerTareaPress: () => void;
  onProgramarTareaPress: () => void;
  onCreateRoutinePress: () => void;
  onOpenChange?: (isOpen: boolean) => void;
  isOpen?: boolean;
  onLongPress?: () => void;
}

export const LiquidFAB: React.FC<LiquidFABProps> = ({
  currentPage,
  onHacerTareaPress,
  onProgramarTareaPress,
  onCreateRoutinePress,
  onOpenChange,
  isOpen: externalIsOpen,
  onLongPress,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  // Track whether options should render at all (avoids ghost shadows)
  const [shouldRenderOptions, setShouldRenderOptions] = useState(false);
  const expandAnim = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Gentle breathing pulse when idle
  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.06,
          duration: 1500,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1500,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, []);

  const animateOpen = useCallback(() => {
    setShouldRenderOptions(true);
    Animated.parallel([
      Animated.spring(expandAnim, {
        toValue: 1,
        friction: 9,
        tension: 200,
        useNativeDriver: true,
      }),
      Animated.spring(rotateAnim, {
        toValue: 1,
        friction: 10,
        tension: 200,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const animateClose = useCallback(() => {
    Animated.parallel([
      Animated.timing(expandAnim, {
        toValue: 0,
        duration: 200,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(rotateAnim, {
        toValue: 0,
        duration: 200,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start(() => {
      // Only hide option DOM after animation fully completes → no ghost shadows
      setShouldRenderOptions(false);
    });
  }, []);

  // Sync with external isOpen prop
  useEffect(() => {
    if (externalIsOpen !== undefined && externalIsOpen !== isOpen) {
      if (externalIsOpen) {
        animateOpen();
      } else {
        animateClose();
      }
      setIsOpen(externalIsOpen);
    }
  }, [externalIsOpen]);

  const toggleFAB = () => {
    const newOpenState = !isOpen;
    if (newOpenState) {
      animateOpen();
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } else {
      animateClose();
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setIsOpen(newOpenState);
    onOpenChange?.(newOpenState);
  };

  const handleOptionPress = (callback: () => void) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    callback();
    // Close after a tiny delay so the haptic registers before animation
    const newOpenState = false;
    animateClose();
    setIsOpen(newOpenState);
    onOpenChange?.(newOpenState);
  };

  const rotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '45deg'],
  });

  // Clamped interpolations — prevent spring overshoot from causing negative opacity/scale
  const option1Translate = expandAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -140],
    extrapolate: 'clamp',
  });
  const option2Translate = expandAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -80],
    extrapolate: 'clamp',
  });
  const routineOptionTranslate = expandAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -110],
    extrapolate: 'clamp',
  });
  const optionXShift = expandAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -10],
    extrapolate: 'clamp',
  });

  // Faster opacity — visible almost immediately
  const option1Opacity = expandAnim.interpolate({
    inputRange: [0, 0.15, 1],
    outputRange: [0, 0.8, 1],
    extrapolate: 'clamp',
  });
  const option2Opacity = expandAnim.interpolate({
    inputRange: [0, 0.2, 1],
    outputRange: [0, 0.7, 1],
    extrapolate: 'clamp',
  });

  // Scale for option buttons (pop-in effect — starts bigger for faster feel)
  const option1Scale = expandAnim.interpolate({
    inputRange: [0, 0.15, 1],
    outputRange: [0.5, 0.9, 1],
    extrapolate: 'clamp',
  });
  const option2Scale = expandAnim.interpolate({
    inputRange: [0, 0.2, 1],
    outputRange: [0.5, 0.85, 1],
    extrapolate: 'clamp',
  });

  return (
    <View style={styles.container}>
      {shouldRenderOptions && currentPage === 0 && (
        <>
          {/* Nueva Tarea Option */}
          <Animated.View
            style={[
              styles.optionButton,
              {
                transform: [
                  { translateY: option1Translate },
                  { translateX: optionXShift },
                  { scale: option1Scale },
                ],
                opacity: option1Opacity,
              },
            ]}
          >
            <Pressable
              style={styles.optionHitArea}
              onPress={() => handleOptionPress(onHacerTareaPress)}
            >
              <Text style={styles.optionLabel}>Nueva Tarea</Text>
              <View style={styles.optionButtonInner}>
                <Play size={20} color={colors.background} strokeWidth={2} fill={colors.background} />
              </View>
            </Pressable>
          </Animated.View>

          {/* Programar Tarea Option */}
          <Animated.View
            style={[
              styles.optionButton,
              {
                transform: [
                  { translateY: option2Translate },
                  { translateX: optionXShift },
                  { scale: option2Scale },
                ],
                opacity: option2Opacity,
              },
            ]}
          >
            <Pressable
              style={styles.optionHitArea}
              onPress={() => handleOptionPress(onProgramarTareaPress)}
            >
              <Text style={styles.optionLabel}>Programar Tarea</Text>
              <View style={styles.optionButtonInner}>
                <Clock size={20} color={colors.background} strokeWidth={2} />
              </View>
            </Pressable>
          </Animated.View>
        </>
      )}

      {shouldRenderOptions && currentPage === 1 && (
        <>
          {/* Nueva Rutina Option */}
          <Animated.View
            style={[
              styles.optionButton,
              {
                transform: [
                  { translateY: routineOptionTranslate },
                  { translateX: optionXShift },
                  { scale: option1Scale },
                ],
                opacity: option1Opacity,
              },
            ]}
          >
            <Pressable
              style={styles.optionHitArea}
              onPress={() => handleOptionPress(onCreateRoutinePress)}
            >
              <Text style={styles.optionLabel}>Nueva Rutina</Text>
              <View style={styles.optionButtonInner}>
                <MaterialCommunityIcons name="calendar-plus" size={20} color={colors.background} />
              </View>
            </Pressable>
          </Animated.View>
        </>
      )}

      {/* Main FAB Button */}
      <Animated.View
        style={[
          styles.mainButtonContainer,
          {
            transform: [
              { scale: isOpen ? 1 : pulseAnim },
            ],
          },
        ]}
      >
        <Pressable
          style={styles.mainButton}
          onPress={toggleFAB}
          onLongPress={onLongPress}
        >
          <LinearGradient
            colors={PRIMARY_GRADIENT_COLORS}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.gradientButton}
          >
            <Animated.View style={{ transform: [{ rotate }] }}>
              <Plus
                size={30}
                color={colors.background}
                strokeWidth={2.5}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </Animated.View>
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
    zIndex: 1,
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
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
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
    zIndex: 100,
  },
  optionHitArea: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginVertical: -10,
    marginHorizontal: -14,
  },
  optionButtonInner: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 6,
  },
  optionLabel: {
    color: colors.textRoutineCard,
    fontSize: 12,
    fontWeight: '600',
    minWidth: 90,
    textAlign: 'right',
  },
});
