import React from 'react';
import { Platform, StyleSheet, Text, TextProps } from 'react-native';

export function AppText({ style, maxFontSizeMultiplier = 1.15, ...props }: TextProps) {
  return (
    <Text
      maxFontSizeMultiplier={maxFontSizeMultiplier}
      style={[
        Platform.OS === 'android' && styles.androidFixes,
        style,
      ]}
      {...props}
    />
  );
}

const styles = StyleSheet.create({
  androidFixes: {
    includeFontPadding: false,
    textAlignVertical: 'center',
    paddingRight: 3,
    paddingBottom: 2,
  },
});
