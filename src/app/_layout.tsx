import { Slot, useRouter, useSegments } from 'expo-router';
import { useEffect } from 'react';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { ThemeProvider, useTheme } from '../context/ThemeContext';
import BackgroundDecor from '../components/BackgroundDecor';
import { ActivityIndicator, View } from 'react-native';
import { enableScreens } from 'react-native-screens';
import { useFonts, Unbounded_300Light, Unbounded_400Regular, Unbounded_700Bold, Unbounded_900Black } from '@expo-google-fonts/unbounded';
import { SpaceMono_400Regular, SpaceMono_700Bold } from '@expo-google-fonts/space-mono';
import { Inter_300Light, Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import * as SplashScreen from 'expo-splash-screen';

SplashScreen.preventAutoHideAsync();

// Without this, expo-router's tab navigator falls back to a plain absolutely-positioned
// View with only z-index to hide inactive tabs — which never fully occludes anything once
// the active screen's own cards are translucent (real glass effect), letting whatever tab
// was visited previously bleed through. enableScreens() switches to react-native-screens'
// real Screen component, which sets display:'none' on inactive tabs on every platform —
// an unambiguous fix, not another z-index workaround.
enableScreens(true);

const RootLayoutNav = () => {
  const { user, isLoading } = useAuth();
  const { colors } = useTheme();
  const segments = useSegments();
  const router = useRouter();

  const [fontsLoaded] = useFonts({
    Unbounded_300Light,
    Unbounded_400Regular,
    Unbounded_700Bold,
    Unbounded_900Black,
    SpaceMono_400Regular,
    SpaceMono_700Bold,
    Inter_300Light,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  useEffect(() => {
    if (isLoading || !fontsLoaded) return;

    const inAuthGroup = (segments[0] as string) === '(auth)';
    const inTabsGroup = (segments[0] as string) === '(tabs)';

    if (!user && !inAuthGroup) {
      router.replace('/');
    } else if (user && !inTabsGroup) {
      router.replace('/(tabs)/dashboard');
    }
  }, [user, isLoading, fontsLoaded, segments]);

  if (isLoading || !fontsLoaded) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bg }}>
        <ActivityIndicator size="large" color="#7C3AED" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <BackgroundDecor />
      <Slot />
    </View>
  );
};

export default function RootLayout() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <RootLayoutNav />
      </AuthProvider>
    </ThemeProvider>
  );
}
