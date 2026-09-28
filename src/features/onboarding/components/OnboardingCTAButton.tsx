import {
    PRIMARY_GRADIENT_COLORS,
    primaryButtonGradient,
    primaryButtonStyles,
    primaryButtonText,
} from "@/constants/buttons";
import { colors } from "@/constants/theme";
import { AppText as Text } from "@/src/components/AppText";
import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import {
    ActivityIndicator,
    Pressable,
    StyleSheet,
    type StyleProp,
    type TextStyle,
    type ViewStyle,
} from "react-native";
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withSpring,
} from "react-native-reanimated";

// ============================================
// ONBOARDING CTA BUTTON
// Botón compartido para avanzar de slide en el
// onboarding. Cambiar el estilo AQUÍ afecta a
// todos los CTAs del flujo.
// ============================================

interface OnboardingCTAButtonProps {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  gradientStyle?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}

export default function OnboardingCTAButton({
  title,
  onPress,
  disabled = false,
  loading = false,
  icon,
  style,
  gradientStyle,
  textStyle,
}: OnboardingCTAButtonProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={animatedStyle}>
      <Pressable
        onPress={onPress}
        onPressIn={() => {
          scale.value = withSpring(0.96, { damping: 10, stiffness: 300 });
        }}
        onPressOut={() => {
          scale.value = withSpring(1, { damping: 10, stiffness: 300 });
        }}
        disabled={disabled || loading}
        style={[styles.button, (disabled || loading) && styles.disabled, style]}
      >
        <LinearGradient
          colors={PRIMARY_GRADIENT_COLORS}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.gradient, gradientStyle]}
        >
          {loading ? (
            <ActivityIndicator size="small" color={colors.background} />
          ) : (
            <>
              {icon}
              <Text style={[styles.text, textStyle]}>{title}</Text>
            </>
          )}
        </LinearGradient>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  button: {
    ...primaryButtonStyles,
  },
  disabled: {
    opacity: 0.5,
  },
  gradient: {
    ...primaryButtonGradient,
    gap: 8,
  },
  text: {
    ...primaryButtonText,
  },
});
