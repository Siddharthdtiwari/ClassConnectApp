import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import GlassCard from '../../components/GlassCard';
import { useTheme } from '../../context/ThemeContext';

export default function MoreScreen() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const isTeacher = user?.role === 'teacher';
  const { colors, isDark } = useTheme();

  const studentMenuItems = [
    { icon: 'person-outline' as const, title: 'My Profile', subtitle: 'View and edit your profile', route: '/(tabs)/profile' },
    { icon: 'trophy-outline' as const, title: 'Leaderboard', subtitle: 'See rankings and points', route: '/(tabs)/leaderboard' },
    { icon: 'clipboard-outline' as const, title: 'Attendance', subtitle: 'View your attendance history', route: '/(tabs)/attendance' },
    { icon: 'calendar-outline' as const, title: 'Exam Timetable', subtitle: 'View upcoming exams', route: '/(tabs)/timetable' },
    { icon: 'book-outline' as const, title: 'Study Materials', subtitle: 'Access notes and resources', route: '/(tabs)/content' },
    { icon: 'bulb-outline' as const, title: 'Free Solutions', subtitle: 'Access premium generated solutions', route: '/(tabs)/solutions' },
    { icon: 'library-outline' as const, title: 'Syllabus Tracker', subtitle: 'Track chapter progress', route: '/(tabs)/syllabus' },
  ];

  const teacherMenuItems = [
    { icon: 'person-outline' as const, title: 'My Profile', subtitle: 'View your teacher profile', route: '/(tabs)/profile' },
    { icon: 'calendar-outline' as const, title: 'Exam Timetable', subtitle: 'Set exam schedules', route: '/(tabs)/timetable' },
    { icon: 'book-outline' as const, title: 'Study Materials', subtitle: 'Upload and manage resources', route: '/(tabs)/content' },
    { icon: 'bulb-outline' as const, title: 'Free Solutions', subtitle: 'Access premium generated solutions', route: '/(tabs)/solutions' },
    { icon: 'business-outline' as const, title: 'Manage Batches', subtitle: 'Create and view all batches', route: '/(tabs)/batches' },
    { icon: 'people-outline' as const, title: 'Manage Students', subtitle: 'Register and view students', route: '/(tabs)/students' },
    { icon: 'school-outline' as const, title: 'Manage Teachers', subtitle: 'Add new co-teachers', route: '/(tabs)/teachers' },
    { icon: 'library-outline' as const, title: 'Syllabus Tracker', subtitle: 'Update chapter progress', route: '/(tabs)/syllabus' },
    { icon: 'stats-chart-outline' as const, title: 'Reports & Analytics', subtitle: 'Revenue and audit logs', route: '/(tabs)/reports' },
  ];

  const menuItems = isTeacher ? teacherMenuItems : studentMenuItems;

  return (
    <View style={{ flex: 1, backgroundColor: 'transparent' }}>
    <ScrollView contentContainerStyle={{ paddingBottom: 100, paddingTop: 56 }}>
      {/* User Card */}
      <GlassCard style={styles.userCard}>
        <View style={[styles.avatar, { backgroundColor: isDark ? colors.bg2 : '#EDE8F5', borderColor: colors.b }]}>
          <Text style={[styles.avatarText, { color: colors.p }]}>{user?.name?.charAt(0).toUpperCase()}</Text>
        </View>
        <View style={{ marginLeft: 16, flex: 1 }}>
          <Text style={[styles.userName, { color: colors.fg }]}>{user?.name}</Text>
          <Text style={[styles.userRole, { color: colors.fdd }]}>{isTeacher ? '🎓 Teacher' : '📖 Student'}</Text>
        </View>
      </GlassCard>

      {/* Menu Items */}
      <GlassCard style={styles.menuCard}>
        {menuItems.map((item, index) => (
          <TouchableOpacity
            key={index}
            style={[styles.menuItem, index < menuItems.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.b }]}
            onPress={() => { try { router.push(item.route as any); } catch (e) {} }}
          >
            <Ionicons name={item.icon} size={22} color={colors.pm} style={{ marginRight: 14 }} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.menuTitle, { color: colors.fg }]}>{item.title}</Text>
              <Text style={[styles.menuSubtitle, { color: colors.fdd }]}>{item.subtitle}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.fdd} />
          </TouchableOpacity>
        ))}
      </GlassCard>

      {/* Logout */}
      <TouchableOpacity style={[styles.logoutButton, { backgroundColor: isDark ? colors.bg2 : 'rgba(255,255,255,0.80)' }]} onPress={logout}>
        <Ionicons name="log-out-outline" size={20} color={colors.rt} />
        <Text style={[styles.logoutText, { color: colors.rt }]}>LOG OUT</Text>
      </TouchableOpacity>

      <Text style={[styles.versionText, { color: colors.fdd }]}>ClassConnect v1.0.0</Text>
    </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    marginHorizontal: 16,
    marginBottom: 16,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  avatarText: { fontFamily: 'Unbounded_900Black', fontSize: 22 },
  userName: { fontFamily: 'Unbounded_700Bold', fontSize: 16 },
  userRole: { fontFamily: 'SpaceMono_400Regular', fontSize: 12, marginTop: 4 },
  menuCard: {
    marginHorizontal: 16,
    overflow: 'hidden',
    padding: 0,
  },
  menuItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, paddingHorizontal: 20 },
  menuTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 15 },
  menuSubtitle: { fontFamily: 'SpaceMono_400Regular', fontSize: 11, marginTop: 2 },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(220,38,38,0.20)',
    marginHorizontal: 16,
    marginTop: 20,
    padding: 16,
    borderRadius: 14,
    gap: 8,
  },
  logoutText: { fontFamily: 'SpaceMono_700Bold', fontSize: 12, letterSpacing: 1 },
  versionText: { textAlign: 'center', fontFamily: 'SpaceMono_400Regular', fontSize: 11, marginTop: 20, marginBottom: 40 },
});
