import { colors } from '@/constants/theme';
import { Mic, Square } from 'lucide-react-native';
import React from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

interface InputProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
  onVoicePress?: () => void;
  isRecording?: boolean;
}

export function Input({ value, onChangeText, placeholder, autoFocus, onVoicePress, isRecording }: InputProps) {
  return (
    <View style={styles.container}>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textTertiary}
        autoFocus={autoFocus}
      />
      {onVoicePress && (
        <Pressable 
          style={[styles.voiceButton, isRecording && styles.voiceButtonActive]}
          onPress={onVoicePress}
        >
          {isRecording ? (
            <Square size={20} color="#FFFFFF" fill="#FFFFFF" />
          ) : (
            <Mic size={20} color={colors.textSecondary} />
          )}
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    position: 'relative',
  },
  input: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    fontSize: 16,
    minHeight: 48,
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  voiceButton: {
    position: 'absolute',
    right: 12,
    top: 14,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.surfaceElevated,
  },
  voiceButtonActive: {
    backgroundColor: '#EF4444',
  },
});