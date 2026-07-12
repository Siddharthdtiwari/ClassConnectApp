import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, RefreshControl, TouchableOpacity } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import client from '../../api/client';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import GlassCard from '../../components/GlassCard';
import { useTheme } from '../../context/ThemeContext';
import { useRouter } from 'expo-router';

export default function DashboardScreen() {
  const { user } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { colors, isDark, theme, setTheme } = useTheme();
  const router = useRouter();

  const toggleTheme = () => {
    if (theme === 'light') setTheme('dark');
    else if (theme === 'dark') setTheme('system');
    else setTheme('light');
  };

  const fetchDashboard = async () => {
    try {
      const endpoint = user?.role === 'student' ? '/student/dashboard' : '/teacher/dashboard';
      const response = await client.get(endpoint);
      setData(response.data);
    } catch (error) {
      console.error('Failed to fetch dashboard data', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchDashboard(); }, []);

  const onRefresh = () => { setRefreshing(true); fetchDashboard(); };

  if (loading) {
    return <View style={[styles.center, { backgroundColor: 'transparent' }]}><ActivityIndicator size="large" color={colors.p} /></View>;
  }

  if (user?.role === 'student') {
    const student = data?.student;
    const metrics = data?.metrics;
    const recentScores = data?.recentScores || [];

    // Performance trend from recent scores
    const perfBars = recentScores.slice(0, 6).reverse().map((s: any) => ({
      name: s.testName || 'Test',
      pct: s.percentage || 0,
    }));

    const quickActions = [
      { icon: 'trophy-outline' as const, label: 'Rankings', route: '/(tabs)/leaderboard' },
      { icon: 'book-outline' as const, label: 'Materials', route: '/(tabs)/content' },
      { icon: 'document-text-outline' as const, label: 'Tests', route: '/(tabs)/tests' },
      { icon: 'calendar-outline' as const, label: 'Timetable', route: '/(tabs)/timetable' },
      { icon: 'clipboard-outline' as const, label: 'Attendance', route: '/(tabs)/attendance' },
      { icon: 'person-outline' as const, label: 'Profile', route: '/(tabs)/profile' },
    ];

    return (
      <View style={{ flex: 1, backgroundColor: 'transparent' }}>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: 100 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.p]} />}
        >
          {/* Premium Banner */}
          <LinearGradient
            colors={[colors.p, colors.pm]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.banner}
          >
          <View style={styles.bannerDecor1} />
          <View style={styles.bannerDecor2} />
          <View style={{ position: 'relative', zIndex: 10, flexDirection: 'row', alignItems: 'center' }}>
            <View style={{ flex: 1 }}>
              <Text style={styles.bannerGreeting}>Welcome Back,</Text>
              <Text style={styles.bannerName}>{student?.name}!</Text>
              <Text style={styles.bannerSub}>Your central hub for success.</Text>
            </View>
          </View>
        </LinearGradient>

          {/* Profile Card */}
          <View style={{ paddingHorizontal: 16, marginTop: -20 }}>
            <GlassCard style={styles.profileCard}>
              <View style={[styles.profileAvatar, { backgroundColor: isDark ? colors.bg2 : '#EDE8F5', borderColor: colors.p }]}>
                <Text style={[styles.profileAvatarText, { color: colors.p }]}>
                  {student?.name?.charAt(0)?.toUpperCase() || '?'}
                </Text>
              </View>
              <View style={{ flex: 1, marginLeft: 16 }}>
                <Text style={[styles.profileName, { color: colors.fg }]}>{student?.name}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 8 }}>
                  <View style={[styles.profileBadge, { backgroundColor: isDark ? 'rgba(124,58,237,0.15)' : 'rgba(124,58,237,0.08)', borderColor: isDark ? 'rgba(124,58,237,0.30)' : 'rgba(124,58,237,0.15)' }]}>
                    <Text style={[styles.profileBadgeText, { color: colors.pt }]}>
                      {student?.batch?.name || 'Unassigned'}
                    </Text>
                  </View>
                </View>
                <Text style={[styles.profileMeta, { color: colors.fdd }]}>ID: {student?.studentId}</Text>
              </View>
            </GlassCard>
          </View>

          {/* Metrics Row */}
          <View style={styles.metricsRow}>
            <GlassCard style={styles.statBox}>
              <Text style={[styles.statLabel, { color: colors.fdd }]}>ATTENDANCE</Text>
              <Text style={[styles.statValue, { color: colors.pt }]}>{metrics?.attendancePercentage || 0}%</Text>
              <Text style={[styles.statDetail, { color: colors.fdd }]}>{metrics?.presentDays || 0}P / {metrics?.absentDays || 0}A</Text>
            </GlassCard>
            <GlassCard style={[styles.statBox, { borderColor: isDark ? 'rgba(189,224,69,0.30)' : 'rgba(110,142,0,0.30)', backgroundColor: isDark ? 'rgba(189,224,69,0.10)' : 'rgba(110,142,0,0.10)' }]}>
              <Text style={[styles.statLabel, { color: colors.fdd }]}>POINTS</Text>
              <Text style={[styles.statValue, { color: colors.lt }]}>{Math.trunc(student?.points || 0)} ⭐</Text>
              <Text style={[styles.statDetail, { color: colors.fdd }]}>Rank #{student?.rank || '-'}</Text>
            </GlassCard>
            <GlassCard style={styles.statBox}>
              <Text style={[styles.statLabel, { color: colors.fdd }]}>MONTHLY FEE</Text>
              <Text style={[styles.statValue, { color: colors.pt, fontSize: 18 }]}>₹{(student?.batch?.monthlyFee || 0).toLocaleString()}</Text>
            </GlassCard>
          </View>

          {/* Performance Trend */}
          {perfBars.length > 0 && (
            <View style={styles.section}>
              <GlassCard style={{ padding: 20 }}>
                <Text style={[styles.sectionTitle, { color: colors.fg }]}>Performance Trend</Text>
                <View style={[styles.divider, { backgroundColor: colors.bd }]} />
                {perfBars.map((bar: any, i: number) => {
                  const barColor = bar.pct >= 80 ? '#10b981' : bar.pct >= 50 ? '#f59e0b' : '#ef4444';
                  return (
                    <View key={i} style={{ marginBottom: 12 }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                        <Text style={[styles.trendLabel, { color: colors.fd }]} numberOfLines={1}>{bar.name}</Text>
                        <Text style={[styles.trendPct, { color: barColor }]}>{bar.pct.toFixed(1)}%</Text>
                      </View>
                      <View style={[styles.trendTrack, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }]}>
                        <View style={[styles.trendBar, { width: `${Math.min(bar.pct, 100)}%`, backgroundColor: barColor }]} />
                      </View>
                    </View>
                  );
                })}
              </GlassCard>
            </View>
          )}

          {/* Quick Actions */}
          <View style={styles.section}>
            <GlassCard style={{ padding: 20 }}>
              <Text style={[styles.sectionTitle, { color: colors.fg }]}>Quick Actions</Text>
              <View style={[styles.divider, { backgroundColor: colors.bd }]} />
              <View style={styles.actionsGrid}>
                {quickActions.map((action, i) => (
                  <TouchableOpacity
                    key={i}
                    style={[styles.actionTile, { backgroundColor: isDark ? colors.bg2 : 'rgba(124,58,237,0.04)', borderColor: colors.b }]}
                    onPress={() => { try { router.push(action.route as any); } catch(e) {} }}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.actionIconWrap, { backgroundColor: isDark ? 'rgba(124,58,237,0.15)' : 'rgba(124,58,237,0.08)' }]}>
                      <Ionicons name={action.icon} size={22} color={colors.pt} />
                    </View>
                    <Text style={[styles.actionLabel, { color: colors.fg }]}>{action.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </GlassCard>
          </View>

          {/* Recent Tests */}
          <View style={styles.section}>
            <GlassCard style={{ padding: 20 }}>
              <Text style={[styles.sectionTitle, { color: colors.fg }]}>Recent Test Results</Text>
              <View style={[styles.divider, { backgroundColor: colors.bd }]} />
            {recentScores.length > 0 ? (
              recentScores.map((score: any, index: number) => {
                const pct = score.percentage || 0;
                const gradeColor = pct >= 80 ? '#10b981' : pct >= 50 ? '#f59e0b' : '#ef4444';
                const grade = pct >= 90 ? 'A+' : pct >= 80 ? 'A' : pct >= 70 ? 'B+' : pct >= 60 ? 'B' : pct >= 50 ? 'C' : 'D';
                return (
                  <View key={index} style={[styles.listRow, { borderBottomColor: colors.bd }]}>
                    <View style={[styles.gradeBadge, { backgroundColor: gradeColor + '18', borderColor: gradeColor + '40' }]}>
                      <Text style={[styles.gradeText, { color: gradeColor }]}>{grade}</Text>
                    </View>
                    <View style={{ flex: 1, minWidth: 0, marginLeft: 12 }}>
                      <Text style={[styles.listTitle, { color: colors.pt }]}>{score.testName || 'Test'}</Text>
                      <Text style={[styles.listMeta, { color: colors.fdd }]}>
                        {new Date(score.testId?.testDate || score.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={[styles.listScore, { color: gradeColor }]}>
                        {score.score}/{score.testId?.totalMarks || '?'}
                      </Text>
                      <Text style={[styles.listPercent, { color: colors.fdd }]}>{pct}%</Text>
                    </View>
                  </View>
                );
              })
            ) : (
              <Text style={[styles.emptyText, { color: colors.fdd }]}>No test results recorded yet.</Text>
            )}
            </GlassCard>
          </View>

        {/* Recent Fees */}
        <View style={styles.section}>
          <GlassCard style={{ padding: 20 }}>
            <Text style={[styles.sectionTitle, { color: colors.fg }]}>Fee Payments</Text>
            <View style={[styles.divider, { backgroundColor: colors.bd }]} />
            {data?.recentFees?.length > 0 ? (
              data.recentFees.map((fee: any, index: number) => (
                <View key={index} style={[styles.listRow, { borderBottomColor: colors.bd }]}>
                  <View style={[styles.gradeBadge, { backgroundColor: isDark ? 'rgba(189,224,69,0.12)' : 'rgba(110,142,0,0.08)', borderColor: isDark ? 'rgba(189,224,69,0.30)' : 'rgba(110,142,0,0.20)' }]}>
                    <Ionicons name="checkmark-circle" size={18} color={colors.lt} />
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={[styles.listTitle, { color: colors.pt }]}>Fee for {fee.month}, {fee.year}</Text>
                    <Text style={[styles.listMeta, { color: colors.fdd }]}>{fee.method} | {new Date(fee.datePaid).toLocaleDateString()}</Text>
                  </View>
                  <Text style={[styles.listScore, { color: colors.lt }]}>₹{fee.amount?.toLocaleString()}</Text>
                </View>
              ))
            ) : (
              <Text style={[styles.emptyText, { color: colors.fdd }]}>No recent fee payments recorded.</Text>
            )}
          </GlassCard>
        </View>
        </ScrollView>

        {/* Floating Theme Toggle */}
        <TouchableOpacity style={[styles.themeToggle, { backgroundColor: colors.bgc, borderColor: colors.b }]} onPress={toggleTheme}>
          <Ionicons name={theme === 'dark' ? 'moon' : theme === 'light' ? 'sunny' : 'contrast'} size={20} color={colors.fg} />
        </TouchableOpacity>
      </View>
    );
  }

  // ─── Teacher Dashboard ───
  return (
    <View style={{ flex: 1, backgroundColor: 'transparent' }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.p]} />}
      >
        <LinearGradient
          colors={[colors.p, colors.pm]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.banner}
        >
        <View style={styles.bannerDecor1} />
        <View style={styles.bannerDecor2} />
        <View style={{ position: 'relative', zIndex: 10 }}>
          <Text style={styles.bannerGreeting}>Welcome Back,</Text>
          <Text style={styles.bannerName}>{data?.teacher?.name}!</Text>
          <Text style={styles.bannerSub}>Teacher Dashboard</Text>
        </View>
      </LinearGradient>

      <View style={styles.metricsRow}>
        <GlassCard style={styles.statBox}>
          <Text style={[styles.statLabel, { color: colors.fdd }]}>STUDENTS</Text>
          <Text style={[styles.statValue, { color: colors.pt }]}>{data?.metrics?.totalStudents || 0}</Text>
        </GlassCard>
        <GlassCard style={styles.statBox}>
          <Text style={[styles.statLabel, { color: colors.fdd }]}>BATCHES</Text>
          <Text style={[styles.statValue, { color: colors.pt }]}>{data?.metrics?.totalBatches || 0}</Text>
        </GlassCard>
      </View>

      <View style={styles.section}>
        <GlassCard style={{ padding: 20 }}>
          <Text style={[styles.sectionTitle, { color: colors.fg }]}>Your Batches</Text>
          <View style={[styles.divider, { backgroundColor: colors.bd }]} />
          {data?.activeBatches?.length > 0 ? (
            data.activeBatches.map((batch: any, index: number) => (
              <View key={index} style={[styles.listRow, { borderBottomColor: colors.bd }]}>
                <View>
                  <Text style={[styles.listTitle, { color: colors.pt }]}>{batch.name}</Text>
                  <Text style={[styles.listMeta, { color: colors.fdd }]}>{batch.subject}</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.fdd} />
              </View>
            ))
          ) : (
            <Text style={[styles.emptyText, { color: colors.fdd }]}>No active batches.</Text>
          )}
        </GlassCard>
      </View>
      </ScrollView>

      {/* Floating Theme Toggle */}
      <TouchableOpacity style={[styles.themeToggle, { backgroundColor: colors.bgc, borderColor: colors.b }]} onPress={toggleTheme}>
        <Ionicons name={theme === 'dark' ? 'moon' : theme === 'light' ? 'sunny' : 'contrast'} size={20} color={colors.fg} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F5F1FC' },
  container: { flex: 1, backgroundColor: '#F5F1FC' },
  banner: {
    margin: 16,
    borderRadius: 20,
    padding: 28,
    paddingTop: 56,
    paddingBottom: 40,
    overflow: 'hidden',
    position: 'relative',
  },
  bannerDecor1: { position: 'absolute', top: -64, right: -64, width: 256, height: 256, borderRadius: 128, backgroundColor: 'rgba(255,255,255,0.10)' },
  bannerDecor2: { position: 'absolute', bottom: -80, right: 128, width: 192, height: 192, borderRadius: 96, backgroundColor: 'rgba(255,255,255,0.05)' },
  bannerGreeting: { fontFamily: 'Inter_500Medium', fontSize: 14, color: 'rgba(255,255,255,0.80)' },
  bannerName: { fontFamily: 'Unbounded_900Black', fontSize: 26, color: '#ffffff', marginTop: 4 },
  bannerSub: { fontFamily: 'SpaceMono_400Regular', fontSize: 11, color: 'rgba(255,255,255,0.70)', marginTop: 12, letterSpacing: 2, textTransform: 'uppercase' },

  // Profile Card
  profileCard: { flexDirection: 'row', alignItems: 'center', padding: 24, elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12 },
  profileAvatar: { width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center', borderWidth: 2 },
  profileAvatarText: { fontFamily: 'Unbounded_900Black', fontSize: 22 },
  profileName: { fontFamily: 'Unbounded_700Bold', fontSize: 17, lineHeight: 22 },
  profileBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, borderWidth: 1 },
  profileBadgeText: { fontFamily: 'SpaceMono_700Bold', fontSize: 10, letterSpacing: 1, textTransform: 'uppercase' },
  profileMeta: { fontFamily: 'SpaceMono_400Regular', fontSize: 11, marginTop: 8 },

  metricsRow: { flexDirection: 'row', paddingHorizontal: 16, marginTop: 16, marginBottom: 8, gap: 12 },
  statBox: { flex: 1, padding: 18, alignItems: 'center' },
  statLabel: { fontFamily: 'SpaceMono_400Regular', fontSize: 9, letterSpacing: 1.5 },
  statValue: { fontFamily: 'Unbounded_900Black', fontSize: 22, marginTop: 8 },
  statDetail: { fontFamily: 'SpaceMono_400Regular', fontSize: 9, marginTop: 6, letterSpacing: 1 },

  // Performance Trend
  trendLabel: { fontFamily: 'Inter_500Medium', fontSize: 12, flex: 1, marginRight: 8 },
  trendPct: { fontFamily: 'SpaceMono_700Bold', fontSize: 11 },
  trendTrack: { height: 6, borderRadius: 3, overflow: 'hidden' },
  trendBar: { height: 6, borderRadius: 3 },

  // Quick Actions
  actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  actionTile: { width: '30%', flexGrow: 1, alignItems: 'center', paddingVertical: 18, borderRadius: 16, borderWidth: 1 },
  actionIconWrap: { width: 46, height: 46, borderRadius: 15, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  actionLabel: { fontFamily: 'Inter_600SemiBold', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5 },

  // Grade Badge
  gradeBadge: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center', borderWidth: 1 },
  gradeText: { fontFamily: 'Unbounded_700Bold', fontSize: 13 },

  section: { paddingHorizontal: 16, marginTop: 16 },
  sectionTitle: { fontFamily: 'Unbounded_700Bold', fontSize: 15, marginBottom: 4 },
  divider: { height: 1, marginVertical: 12 },
  listRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  listTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 14 },
  listMeta: { fontFamily: 'SpaceMono_400Regular', fontSize: 10, marginTop: 4 },
  listScore: { fontFamily: 'Unbounded_700Bold', fontSize: 13 },
  listPercent: { fontFamily: 'SpaceMono_400Regular', fontSize: 10, marginTop: 2 },
  emptyText: { fontFamily: 'Inter_400Regular', fontStyle: 'italic', paddingVertical: 8 },
  themeToggle: {
    position: 'absolute',
    bottom: 120,
    right: 24,
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
  },
});
