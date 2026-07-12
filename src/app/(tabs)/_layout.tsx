import { Tabs } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { GlassView, isGlassEffectAPIAvailable } from 'expo-glass-effect';
import { useTheme } from '../../context/ThemeContext';

// See components/GlassCard.tsx for why this is safe to compute once at module scope.
const NATIVE_GLASS_AVAILABLE = Platform.OS === 'ios' && isGlassEffectAPIAvailable();

export default function TabsLayout() {
  const { user } = useAuth();
  const { colors, isDark } = useTheme();
  const isStudent = user?.role === 'student';

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        // React Navigation's tab navigator wraps every screen in its own scene
        // container with its own default (light gray) background, independent of
        // this app's ThemeContext — that opaque layer sat in front of the shared
        // BackgroundDecor/dark background for every single tab, hiding it completely.
        // Must stay OPAQUE though (not 'transparent'): the navigator hides inactive
        // tabs by giving them a negative zIndex, which doesn't reliably push a screen
        // behind its sibling on web — each screen's own opaque background is what
        // actually masks the other (inactive) screens stacked underneath it. Making
        // this transparent let every tab's content render visibly on top of each other
        // at once. Using colors.bg here fixes the theme color without losing that mask.
        sceneStyle: { backgroundColor: colors.bg },
        tabBarStyle: {
          // Real Liquid Glass draws its own edge via refraction, not a flat hairline —
          // a 1px border on top of it looks like a seam. Keep the border for the
          // BlurView fallback, where it still helps define the tab bar's edge.
          backgroundColor: NATIVE_GLASS_AVAILABLE ? 'transparent' : (isDark ? 'rgba(5, 5, 10, 0.7)' : 'rgba(255, 255, 255, 0.8)'),
          borderTopWidth: NATIVE_GLASS_AVAILABLE ? 0 : 1,
          borderTopColor: colors.b,
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: Platform.OS === 'ios' ? 88 : 64,
          paddingBottom: Platform.OS === 'ios' ? 28 : 8,
          paddingTop: 8,
          elevation: 0,
        },
        tabBarBackground: () => (
          NATIVE_GLASS_AVAILABLE
            ? <GlassView glassEffectStyle="regular" colorScheme={isDark ? 'dark' : 'light'} style={{ flex: 1 }} />
            : (
              <BlurView
                tint={isDark ? 'dark' : 'light'}
                intensity={30}
                // See GlassCard.tsx — Android's blur is a flat tint unless this is set explicitly.
                blurMethod={Platform.OS === 'android' ? 'dimezisBlurViewSdk31Plus' : undefined}
                style={{ flex: 1 }}
              />
            )
        ),
        tabBarActiveTintColor: colors.pt,
        tabBarInactiveTintColor: colors.fdd,
        tabBarLabelStyle: {
          fontFamily: 'SpaceMono_400Regular',
          fontSize: 10,
        },
      }}
    >
      {/* ─── Shared Tab ─── */}
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => <Ionicons name="home-outline" size={size} color={color} />,
        }}
      />

      {/* ─── Student Tabs (hidden for teacher) ─── */}
      <Tabs.Screen
        name="tests"
        options={{
          title: 'Scores',
          tabBarIcon: ({ color, size }) => <Ionicons name="document-text-outline" size={size} color={color} />,
          href: isStudent ? '/(tabs)/tests' : null,
        }}
      />
      <Tabs.Screen
        name="leaderboard"
        options={{
          title: 'Rankings',
          tabBarIcon: ({ color, size }) => <Ionicons name="trophy-outline" size={size} color={color} />,
          href: isStudent ? '/(tabs)/leaderboard' : null,
        }}
      />

      {/* ─── Teacher Tabs (hidden for student) ─── */}
      <Tabs.Screen
        name="attendance"
        options={{
          title: 'Attendance',
          tabBarIcon: ({ color, size }) => <Ionicons name="calendar-outline" size={size} color={color} />,
          href: isStudent ? null : '/(tabs)/attendance',
        }}
      />

      {/* ─── Shared Tabs ─── */}
      <Tabs.Screen
        name="fees"
        options={{
          title: 'Fees',
          tabBarIcon: ({ color, size }) => <Ionicons name="wallet-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: 'More',
          tabBarIcon: ({ color, size }) => <Ionicons name="menu-outline" size={size} color={color} />,
        }}
      />

      {/* Hidden screens accessible from More */}
      <Tabs.Screen name="timetable" options={{ href: null, title: 'Timetable' }} />
      <Tabs.Screen name="content" options={{ href: null, title: 'Study Materials' }} />
      <Tabs.Screen name="solutions" options={{ href: null, title: 'Free Solutions' }} />
      <Tabs.Screen name="profile" options={{ href: null, title: 'Profile' }} />
      <Tabs.Screen name="batches" options={{ href: null, title: 'Manage Batches' }} />
      <Tabs.Screen name="students" options={{ href: null, title: 'Manage Students' }} />
      <Tabs.Screen name="teachers" options={{ href: null, title: 'Manage Teachers' }} />
      <Tabs.Screen name="syllabus" options={{ href: null, title: 'Syllabus Tracker' }} />
      <Tabs.Screen name="reports" options={{ href: null, title: 'Reports' }} />
      <Tabs.Screen name="bulk_attendance" options={{ href: null, title: 'Bulk Attendance' }} />
      <Tabs.Screen name="bulk_fees" options={{ href: null, title: 'Bulk Fees' }} />
    </Tabs>
  );
}
