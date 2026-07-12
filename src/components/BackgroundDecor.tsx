import React, { useEffect } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming, withSequence, Easing } from 'react-native-reanimated';
import { useTheme } from '../context/ThemeContext';

const { width, height } = Dimensions.get('window');

export default function BackgroundDecor() {
  const { isDark } = useTheme();

  const orb1X = useSharedValue(0);
  const orb1Y = useSharedValue(0);
  
  const orb2X = useSharedValue(0);
  const orb2Y = useSharedValue(0);

  useEffect(() => {
    orb1X.value = withRepeat(
      withSequence(
        withTiming(40, { duration: 10000, easing: Easing.inOut(Easing.ease) }),
        withTiming(-30, { duration: 10000, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 10000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
    orb1Y.value = withRepeat(
      withSequence(
        withTiming(-50, { duration: 10000, easing: Easing.inOut(Easing.ease) }),
        withTiming(30, { duration: 10000, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 10000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );

    orb2X.value = withRepeat(
      withSequence(
        withTiming(-40, { duration: 9000, easing: Easing.inOut(Easing.ease) }),
        withTiming(30, { duration: 9000, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 9000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
    orb2Y.value = withRepeat(
      withSequence(
        withTiming(50, { duration: 9000, easing: Easing.inOut(Easing.ease) }),
        withTiming(-30, { duration: 9000, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 9000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  }, []);

  const orb1Style = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: orb1X.value },
        { translateY: orb1Y.value },
      ],
    };
  });

  const orb2Style = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: orb2X.value },
        { translateY: orb2Y.value },
      ],
    };
  });

  return (
    // No z-index trick: relies on being mounted before <Slot /> in _layout.tsx so it
    // paints first (behind screen content) in normal DOM/paint order. A negative
    // zIndex here previously pushed this behind the page's own white canvas on web,
    // instead of just behind its sibling — which is what caused the dark-mode background
    // to never actually render (RootLayoutNav's own backgroundColor now covers that).
    <View style={[StyleSheet.absoluteFill as any, { overflow: 'hidden' }]} pointerEvents="none">
      {/* Orb 1 */}
      <Animated.View
        style={[
          styles.orb,
          {
            top: -height * 0.2,
            left: -width * 0.3,
            width: width * 1.5,
            height: width * 1.5,
            backgroundColor: isDark ? 'rgba(124,58,237,0.11)' : 'rgba(93,58,155,0.07)',
          },
          orb1Style,
        ]}
      />
      {/* Orb 2 */}
      <Animated.View
        style={[
          styles.orb,
          {
            bottom: -height * 0.1,
            right: -width * 0.3,
            width: width * 1.2,
            height: width * 1.2,
            backgroundColor: isDark ? 'rgba(93,58,155,0.09)' : 'rgba(93,58,155,0.05)',
          },
          orb2Style,
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  orb: {
    position: 'absolute',
    borderRadius: 9999,
    // Note: react-native on web supports filter blur via StyleSheet
    // On native, this might just render as a solid color circle with opacity.
    // To truly blur on native, we would need @react-native-community/blur or Skia, 
    // but opacity circles look okay as an alternative for background glows.
    filter: 'blur(90px)' as any, // works on Web
    opacity: 0.8,
  },
});
