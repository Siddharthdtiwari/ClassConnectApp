import React from 'react';
import { TextInput, TextInputProps, StyleSheet } from 'react-native';
import { useTheme } from '../context/ThemeContext';

interface GlassInputProps extends TextInputProps {
  // Add any custom props here if needed
}

export default function GlassInput({ style, ...props }: GlassInputProps) {
  const { colors, isDark } = useTheme();

  return (
    <TextInput
      style={[
        styles.input,
        {
          backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#ffffff',
          borderColor: colors.b,
          color: colors.fg,
        },
        style,
      ]}
      placeholderTextColor={colors.fdd}
      {...props}
    />
  );
}

const styles = StyleSheet.create({
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
    marginBottom: 16,
  },
});
