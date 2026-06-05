import React from 'react';
import { TouchableOpacity, Text, StyleSheet, TouchableOpacityProps, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../context/ThemeContext';

interface PremiumButtonProps extends TouchableOpacityProps {
  title: string;
  loading?: boolean;
  icon?: React.ReactNode;
}

export default function PremiumButton({ title, loading, icon, style, disabled, ...props }: PremiumButtonProps) {
  const { colors } = useTheme();

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      disabled={disabled || loading}
      style={[{ opacity: disabled ? 0.6 : 1 }, style]}
      {...props}
    >
      <LinearGradient
        colors={[colors.p, colors.pm]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.gradient, { shadowColor: colors.pg }]}
      >
        {loading ? (
          <ActivityIndicator color="#ffffff" />
        ) : (
          <>
            {icon && icon}
            <Text style={styles.text}>{title}</Text>
          </>
        )}
      </LinearGradient>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
    // Add shadow
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 4,
  },
  text: {
    fontFamily: 'Unbounded_700Bold',
    fontSize: 12,
    color: '#ffffff',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
});
