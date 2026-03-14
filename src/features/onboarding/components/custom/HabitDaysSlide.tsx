import {
    PRIMARY_GRADIENT_COLORS,
    primaryButtonGradient,
    primaryButtonStyles,
    primaryButtonText,
} from '@/constants/buttons';
import { colors } from '@/constants/theme';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { Flame } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
    FadeInDown,
    useAnimatedStyle,
    useSharedValue,
    withDelay,
    withSequence,
    withSpring,
    withTiming
} from 'react-native-reanimated';
import { HABIT_DAYS } from '../../constants';

// ============================================
// ANIMATED DAY CIRCLE
// ============================================
const AnimatedDayCircle = ({
  label,
  delay,
  onFilled,
}: {
  label: string;
  delay: number;
  onFilled?: () => void;
}) => {
  const fillProgress = useSharedValue(0);
  const scale = useSharedValue(1);
  const checkOpacity = useSharedValue(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      fillProgress.value = withTiming(1, { duration: 400 });
      scale.value = withSequence(
        withTiming(1.2, { duration: 200 }),
        withSpring(1, { damping: 8, stiffness: 200 }),
      );
      checkOpacity.value = withDelay(200, withTiming(1, { duration: 200 }));
      onFilled?.();
    }, delay);

    return () => clearTimeout(timer);
  }, [delay]);

  const circleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    backgroundColor:
      fillProgress.value > 0
        ? `${colors.success}${Math.round(fillProgress.value * 255)
            .toString(16)
            .padStart(2, '0')}`
        : colors.surface,
    borderColor: fillProgress.value > 0 ? colors.success : `${colors.textPrimary}1A`,
  }));

  const checkStyle = useAnimatedStyle(() => ({
    opacity: checkOpacity.value,
  }));

  const labelStyle = useAnimatedStyle(() => ({
    opacity: 1 - checkOpacity.value,
  }));

  return (
    <Animated.View style={[styles.dayCircle, circleStyle]}>
      <Animated.Text style={[styles.dayLabel, labelStyle]}>{label}</Animated.Text>
      <Animated.Text style={[styles.checkMark, checkStyle]}>✓</Animated.Text>
    </Animated.View>
  );
};

// ============================================
// HABIT DAYS SLIDE
// ============================================
interface Props {
  onNext: () => void;
}

const HabitDaysSlide: React.FC<Props> = ({ onNext }) => {
  const [filledCount, setFilledCount] = useState(0);
  const [showButton, setShowButton] = useState(false);
  const titleOpacity = useSharedValue(0);
  const subtitleOpacity = useSharedValue(0);
  const factOpacity = useSharedValue(0);
  const buttonOpacity = useSharedValue(0);
  const buttonScale = useSharedValue(1);

  useEffect(() => {
    titleOpacity.value = withDelay(100, withTiming(1, { duration: 500 }));
    subtitleOpacity.value = withDelay(300, withTiming(1, { duration: 500 }));
    factOpacity.value = withDelay(3500, withTiming(1, { duration: 500 }));

    const buttonTimer = setTimeout(() => {
      setShowButton(true);
      buttonOpacity.value = withTiming(1, { duration: 400 });
    }, 4000);

    return () => clearTimeout(buttonTimer);
  }, []);

  const titleStyle = useAnimatedStyle(() => ({
    opacity: titleOpacity.value,
    transform: [{ translateY: (1 - titleOpacity.value) * 20 }],
  }));

  const subtitleStyle = useAnimatedStyle(() => ({
    opacity: subtitleOpacity.value,
  }));

  const factStyle = useAnimatedStyle(() => ({
    opacity: factOpacity.value,
    transform: [{ translateY: (1 - factOpacity.value) * 10 }],
  }));

  const buttonStyle = useAnimatedStyle(() => ({
    opacity: buttonOpacity.value,
    transform: [
      { translateY: (1 - buttonOpacity.value) * 20 },
      { scale: buttonScale.value },
    ],
  }));

  const handleButtonPressIn = () => {
    buttonScale.value = withSpring(0.96, { damping: 10, stiffness: 300 });
  };

  const handleButtonPressOut = () => {
    buttonScale.value = withSpring(1, { damping: 10, stiffness: 300 });
  };

  const getDelay = (index: number) => 500 + index * 430;

  return (
    <View style={styles.container}>
      <Animated.View entering={FadeInDown.delay(0).duration(500)} style={styles.logoContainer}>
        <Image
          source={require('@/assets/images/streak.png')}
          style={styles.logo}
          resizeMode="contain"
        />
      </Animated.View>

      <Animated.Text style={[styles.title, titleStyle]}>
        Construye tu hábito diario
      </Animated.Text>

      <Animated.Text style={[styles.subtitle, subtitleStyle]}>
        La consistencia es clave para el cambio duradero
      </Animated.Text>

      <View style={styles.daysRow}>
        {HABIT_DAYS.map((day, index) => (
          <AnimatedDayCircle
            key={day.id}
            label={day.label}
            delay={getDelay(index)}
            onFilled={index === 6 ? undefined : () => setFilledCount((prev) => prev + 1)}
          />
        ))}
      </View>

      <Animated.Text style={styles.progressText}>
        Empieza pequeño y mantén la consistencia
      </Animated.Text>

      <Animated.View style={[styles.factCard, factStyle]}>
        <View style={styles.factIconContainer}>
          <Flame size={20} color={colors.accent} strokeWidth={2} fill={colors.accent} />
        </View>
        <Text style={styles.factText}>
          Las personas con rachas de 7 días tienen 3x más probabilidades de formar hábitos
          duraderos
        </Text>
      </Animated.View>

      {showButton && (
        <Animated.View style={[styles.buttonContainer, buttonStyle]}>
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              onNext();
            }}
            onPressIn={handleButtonPressIn}
            onPressOut={handleButtonPressOut}
            style={primaryButtonStyles}
          >
            <LinearGradient
              colors={PRIMARY_GRADIENT_COLORS}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={primaryButtonGradient}
            >
              <Text style={primaryButtonText}>Continuar</Text>
            </LinearGradient>
          </Pressable>
        </Animated.View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 32,
    paddingTop: 60,
    alignItems: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logo: {
    width: 130,
    height: 130,
    marginBottom: -20,
  },
  title: {
    fontSize: 32,
    fontWeight: '900',
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: 16,
    letterSpacing: -0.5,
    lineHeight: 40,
  },
  subtitle: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 32,
  },
  daysRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 24,
  },
  dayCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: `${colors.textPrimary}1A`,
    position: 'relative',
  },
  dayLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    position: 'absolute',
  },
  checkMark: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.background,
    position: 'absolute',
  },
  progressText: {
    fontSize: 14,
    fontWeight: '400',
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 32,
  },
  factCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${colors.accent}26`,
    borderRadius: 16,
    padding: 16,
    gap: 12,
    marginHorizontal: 20,
  },
  factIconContainer: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  factText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
    color: colors.textPrimary,
    lineHeight: 18,
  },
  buttonContainer: {
    marginTop: 32,
    width: '100%',
    paddingHorizontal: 20,
  },
});

export default HabitDaysSlide;
