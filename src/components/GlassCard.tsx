import React from 'react';
import { View, ViewProps, StyleSheet, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { useTheme } from '../context/ThemeContext';

interface GlassCardProps extends ViewProps {
  intensity?: number;
}

export default function GlassCard({ children, style, intensity = 20, ...props }: GlassCardProps) {
  const { colors, isDark } = useTheme();

  return (
    <View
      style={[
        styles.container,
        {
          borderColor: colors.b,
          backgroundColor: Platform.OS === 'web' ? colors.bgc : 'transparent',
          shadowColor: isDark ? '#ffffff' : '#000000',
        },
        style,
      ]}
      {...props}
    >
      {Platform.OS !== 'web' && (
        <BlurView
          intensity={intensity}
          tint={isDark ? 'dark' : 'light'}
          style={StyleSheet.absoluteFill as any}
        />
      )}
      {/* 
        On native, we use BlurView for the background and layer an ultra-sheer background on top of it.
        On Web, backdrop-filter is automatically handled via CSS or we just use rgba. 
      */}
      <View style={[StyleSheet.absoluteFill as any, { backgroundColor: Platform.OS !== 'web' ? colors.bgc : 'transparent' }]} />
      
      <View style={{ zIndex: 1, position: 'relative' }}>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 30,
    elevation: 2, // For Android
  },
});
