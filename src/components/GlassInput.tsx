import React from 'react';
import { TextInput, TextInputProps, View, StyleSheet, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { GlassView, isGlassEffectAPIAvailable } from 'expo-glass-effect';
import { useTheme } from '../context/ThemeContext';

// See GlassCard.tsx for why this is safe to compute once at module scope.
const NATIVE_GLASS_AVAILABLE = Platform.OS === 'ios' && isGlassEffectAPIAvailable();

interface GlassInputProps extends TextInputProps {
  // Add any custom props here if needed
}

export default function GlassInput({ style, ...props }: GlassInputProps) {
  const { colors, isDark } = useTheme();

  if (NATIVE_GLASS_AVAILABLE) {
    // GlassView wraps a native View, not a TextInput directly — so the glass surface is
    // the container, and the input inside it stays visually borderless/transparent,
    // matching how Apple's own Liquid Glass search/text fields are built (a glass pill
    // containing a plain field, not the field itself rendering glass).
    return (
      <GlassView glassEffectStyle="clear" colorScheme={isDark ? 'dark' : 'light'} style={[styles.glassWrap, { borderColor: colors.b }]}>
        <TextInput
          style={[styles.input, { color: colors.fg }, style]}
          placeholderTextColor={colors.fdd}
          {...props}
        />
      </GlassView>
    );
  }

  // ── Web: CSS backdrop-filter (true frosted glass) ─────────────────────
  if (Platform.OS === 'web') {
    return (
      <View
        style={[
          styles.glassWrap,
          {
            borderColor: colors.b,
            backgroundColor: isDark
              ? 'rgba(15, 10, 30, 0.45)'
              : 'rgba(255, 255, 255, 0.38)',
          },
          { backdropFilter: 'blur(24px) saturate(180%)', WebkitBackdropFilter: 'blur(24px) saturate(180%)' } as any,
        ]}
      >
        <LinearGradient
          pointerEvents="none"
          colors={isDark
            ? ['rgba(255,255,255,0.08)', 'rgba(255,255,255,0)']
            : ['rgba(255,255,255,0.5)', 'rgba(255,255,255,0)']}
          style={styles.inputHighlight}
        />
        <TextInput
          style={[styles.input, { color: colors.fg }, style]}
          placeholderTextColor={colors.fdd}
          {...props}
        />
      </View>
    );
  }

  // ── Native (Android / older iOS): BlurView fallback ───────────────────
  return (
    <View style={[styles.glassWrap, { borderColor: colors.b }]}>
      <BlurView
        intensity={20}
        tint={isDark ? 'dark' : 'light'}
        blurMethod={Platform.OS === 'android' ? 'dimezisBlurViewSdk31Plus' : undefined}
        style={StyleSheet.absoluteFill as any}
      />
      <View style={[StyleSheet.absoluteFill as any, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.35)' }]} />
      <LinearGradient
        pointerEvents="none"
        colors={isDark
          ? ['rgba(255,255,255,0.08)', 'rgba(255,255,255,0)']
          : ['rgba(255,255,255,0.5)', 'rgba(255,255,255,0)']}
        style={styles.inputHighlight}
      />
      <TextInput
        style={[styles.input, { color: colors.fg }, style]}
        placeholderTextColor={colors.fdd}
        {...props}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  glassWrap: {
    borderWidth: 1,
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: 16,
  },
  input: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
  },
  inputHighlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '60%',
  },
});
