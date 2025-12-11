import { colors } from '@/constants/theme';
import React from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface ButtonProps {
  onPress: () => void;
  title: string;
  variant?: 'primary' | 'secondary' | 'danger';
  loading?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
}

export function Button({ onPress, title, variant = 'primary', loading, disabled, icon }: ButtonProps) {
  const getVariantStyle = () => {
    switch (variant) {
      case 'primary': return styles.primary;
      case 'secondary': return styles.secondary;
      case 'danger': return styles.danger;
    }
  };

  return (
    <TouchableOpacity
      style={[styles.button, getVariantStyle(), (disabled || loading) && styles.disabled]}
      onPress={onPress}
      disabled={disabled || loading}
    >
      <View style={styles.content}>
        <View style={styles.leftSection}>
          {icon && <View style={styles.iconContainer}>{icon}</View>}
          {loading ? (
            <ActivityIndicator color={colors.background} size="small" />
          ) : (
            <Text style={styles.text}>{title}</Text>
          )}
        </View>
        <View style={styles.timeContainer}>
          <Text style={styles.timeText}>0 min</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 16,
    minHeight: 64,
    borderWidth: 2,
    borderColor: 'rgba(0, 0, 0, 0.08)',
  },
  primary: {
    backgroundColor: '#FFFFFF',
  },
  secondary: {
    backgroundColor: '#FFFFFF',
  },
  danger: {
    backgroundColor: '#FFFFFF',
  },
  disabled: {
    opacity: 0.5,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(168, 230, 207, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    color: '#1a1a1a',
    fontSize: 16,
    fontWeight: '600',
  },
  timeContainer: {
    backgroundColor: 'rgba(168, 230, 207, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  timeText: {
    color: '#6B7C75',
    fontSize: 13,
    fontWeight: '500',
  },
});