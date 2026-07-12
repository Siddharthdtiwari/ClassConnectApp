import React from 'react';
import { View, ViewProps, StyleSheet, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { GlassView, isGlassEffectAPIAvailable } from 'expo-glass-effect';
import { useTheme } from '../context/ThemeContext';

// A static runtime capability (real Liquid Glass hardware/OS support), not something
// that changes mid-session — safe to compute once. isGlassEffectAPIAvailable() is the
// crash-safe check (some iOS 26 betas exposed the type without the working API), and
// it already returns false on every non-iOS platform, but Platform.OS is kept explicit
// for clarity and to fully short-circuit on Android/web without touching the native module.
const NATIVE_GLASS_AVAILABLE = Platform.OS === 'ios' && isGlassEffectAPIAvailable();

interface GlassCardProps extends ViewProps {
  intensity?: number;
}

export default function GlassCard({ children, style, intensity = 20, ...props }: GlassCardProps) {
  const { colors, isDark } = useTheme();

  if (NATIVE_GLASS_AVAILABLE) {
    return (
      <GlassView
        glassEffectStyle="regular"
        colorScheme={isDark ? 'dark' : 'light'}
        style={[styles.container, { borderColor: colors.b }, style]}
        {...(props as any)}
      >
        <View style={{ zIndex: 1, position: 'relative' }}>
          {children}
        </View>
      </GlassView>
    );
  }

  // ── Web: CSS backdrop-filter blur (true frosted glass, no BlurView needed) ─
  if (Platform.OS === 'web') {
    return (
      <View
        style={[
          styles.container,
          {
            borderColor: colors.b,
            backgroundColor: isDark
              ? 'rgba(15, 10, 30, 0.45)'
              : 'rgba(255, 255, 255, 0.38)',
            shadowColor: isDark ? '#7c3aed' : '#000000',
          },
          // CSS-only props — React Native Web passes these straight to the DOM.
          // Cast as any because ViewStyle doesn't include CSS-specific properties.
          { backdropFilter: 'blur(24px) saturate(180%)', WebkitBackdropFilter: 'blur(24px) saturate(180%)' } as any,
          style,
        ]}
        {...props}
      >
        {/* Top specular light band — makes it read as glass, not just a blurry box */}
        <LinearGradient
          pointerEvents="none"
          colors={
            isDark
              ? ['rgba(255,255,255,0.10)', 'rgba(255,255,255,0.02)', 'rgba(255,255,255,0)']
              : ['rgba(255,255,255,0.70)', 'rgba(255,255,255,0.15)', 'rgba(255,255,255,0)']
          }
          locations={[0, 0.4, 1]}
          style={styles.specularHighlight}
        />
        <View style={{ zIndex: 1, position: 'relative' }}>
          {children}
        </View>
      </View>
    );
  }

  // ── Native (Android / older iOS): BlurView + specular highlight ───────────
  return (
    <View
      style={[
        styles.container,
        {
          borderColor: colors.b,
          shadowColor: isDark ? '#ffffff' : '#000000',
        },
        style,
      ]}
      {...props}
    >
      <BlurView
        intensity={intensity}
        tint={isDark ? 'dark' : 'light'}
        // expo-blur's Android blur defaults to blurMethod:'none' — a flat tinted
        // view with NO actual blur at all. dimezisBlurViewSdk31Plus turns on real
        // native blur on Android 12+; older devices fall back to the flat tint.
        blurMethod={Platform.OS === 'android' ? 'dimezisBlurViewSdk31Plus' : undefined}
        style={StyleSheet.absoluteFill as any}
      />
      {/* Ultra-sheer surface tint on top of the blur */}
      <View
        style={[
          StyleSheet.absoluteFill as any,
          {
            backgroundColor: isDark
              ? 'rgba(255,255,255,0.03)'
              : 'rgba(255,255,255,0.25)',
          },
        ]}
      />
      {/*
        Real Liquid Glass reads as glass mainly because of specular light catching
        its top edge, not just the blur. A soft highlight band along the top is
        what makes this look like glass rather than just a blurry box.
      */}
      <LinearGradient
        pointerEvents="none"
        colors={isDark
          ? ['rgba(255,255,255,0.10)', 'rgba(255,255,255,0.02)', 'rgba(255,255,255,0)']
          : ['rgba(255,255,255,0.55)', 'rgba(255,255,255,0.12)', 'rgba(255,255,255,0)']}
        locations={[0, 0.4, 1]}
        style={styles.specularHighlight}
      />

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
  specularHighlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '45%',
  },
});
