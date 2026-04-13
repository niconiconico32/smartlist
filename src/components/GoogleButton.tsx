import React from 'react';
import { Pressable, StyleSheet, View, ViewStyle, StyleProp, ActivityIndicator } from 'react-native';
import { AppText as Text } from '@/src/components/AppText';
import Svg, { Path } from 'react-native-svg';

interface GoogleButtonProps {
  onPress: () => void;
  text?: string;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  theme?: 'light' | 'dark';
}

export function GoogleButton({
  onPress,
  text = 'Continuar con Google',
  disabled = false,
  style,
  theme = 'light',
}: GoogleButtonProps) {
  const isDark = theme === 'dark';
  
  // Official colors based on Google Identity Branding Guidelines M3
  const backgroundColor = isDark ? '#131314' : '#FFFFFF';
  const textColor = isDark ? '#E3E3E3' : '#1F1F1F';
  const borderColor = isDark ? '#8E918F' : '#747775';

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor, borderColor },
        pressed && styles.pressed,
        disabled && styles.disabled,
        style,
      ]}
    >
      <View style={styles.iconContainer}>
        {disabled ? (
            <ActivityIndicator size="small" color={textColor} />
        ) : (
            <Svg width="20" height="20" viewBox="0 0 48 48">
            <Path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
            <Path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
            <Path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
            <Path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
            </Svg>
        )}
      </View>
      <Text style={[styles.text, { color: textColor }]} numberOfLines={1}>
        {text}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingLeft: 16,
    paddingRight: 24,
    height: 48,
    borderRadius: 24, // Pill shape as per M3 guidelines
    borderWidth: 1,
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  disabled: {
    opacity: 0.6,
  },
  iconContainer: {
    marginRight: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontSize: 15,
    fontWeight: '500',
    fontFamily: 'System', // Closest to Roboto Medium natively without custom loading
    letterSpacing: 0.2, // Roboto tracking
  },
});
