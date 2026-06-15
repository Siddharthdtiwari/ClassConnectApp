import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, RefreshControl, TouchableOpacity } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import client from '../../api/client';
import { LinearGradient } from 'expo-linear-gradient';
import GlassCard from '../../components/GlassCard';
import { useTheme } from '../../context/ThemeContext';

export default function LeaderboardScreen() {
  const { user } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [view, setView] = useState<'global' | 'batch'>('global');
  const { colors, isDark } = useTheme();

  const fetchLeaderboard = async () => {
    try {
      const response = await client.get('/student/leaderboard');
      setData(response.data);
    } catch (err) {
      console.error('Failed to fetch leaderboard', err);
    } finally { setLoading(false); setRefreshing(false); }
  };

  useEffect(() => { fetchLeaderboard(); }, []);

  if (loading) return <View style={[styles.center, { backgroundColor: 'transparent' }]}><ActivityIndicator size="large" color={colors.p} /></View>;

  const leaderboard = view === 'global' ? (data?.globalLeaderboard || []) : (data?.batchLeaderboard || []);
  const medals = ['🥇', '🥈', '🥉'];

  return (
    <View style={{ flex: 1, backgroundColor: 'transparent' }}>
    <ScrollView contentContainerStyle={{ paddingBottom: 100, paddingTop: 56 }} refreshControl={<RefreshControl refreshing={refreshing} colors={[colors.p]} onRefresh={() => { setRefreshing(true); fetchLeaderboard(); }} />}>
      {/* Toggle */}
      <View style={[styles.toggleRow, { backgroundColor: isDark ? colors.bg2 : '#EDE8F5' }]}>
        <TouchableOpacity
          style={[styles.toggleBtn, view === 'global' && [styles.toggleActive, { backgroundColor: isDark ? colors.bg2 : '#ffffff' }]]}
          onPress={() => setView('global')}
        >
          <Text style={[styles.toggleText, { color: colors.fdd }, view === 'global' && [styles.toggleTextActive, { color: colors.p }]]}>🌐 OVERALL{data?.viewingYear ? ` (${data.viewingYear})` : ''}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toggleBtn, view === 'batch' && [styles.toggleActive, { backgroundColor: isDark ? colors.bg2 : '#ffffff' }]]}
          onPress={() => setView('batch')}
        >
          <Text style={[styles.toggleText, { color: colors.fdd }, view === 'batch' && [styles.toggleTextActive, { color: colors.p }]]}>📦 MY BATCH</Text>
        </TouchableOpacity>
      </View>

      {/* Top 3 Podium */}
      {leaderboard.length >= 3 && (
        <View style={styles.podium}>
          {[1, 0, 2].map((idx) => {
            const s = leaderboard[idx];
            const isCenter = idx === 0;
            const podiumBorderColor = idx === 0 ? '#f59e0b' : idx === 1 ? '#a8a29e' : '#a16207';
            return (
              <View key={idx} style={[styles.podiumItem, isCenter && styles.podiumCenter]}>
                <Text style={styles.podiumMedal}>{medals[idx]}</Text>
                <View style={[styles.podiumAvatar, { backgroundColor: isDark ? colors.bg2 : '#EDE8F5', borderColor: podiumBorderColor }, isCenter && [styles.podiumAvatarCenter, { borderColor: podiumBorderColor }]]}>
                  <Text style={[styles.podiumAvatarText, { color: colors.p }, isCenter && { fontSize: 22 }]}>
                    {typeof s.avatar === 'string' && s.avatar.length <= 3 ? s.avatar : s.name?.charAt(0)}
                  </Text>
                </View>
                <Text style={[styles.podiumName, { color: colors.fg }]} numberOfLines={1}>{s.name}</Text>
                <Text style={[styles.podiumId, { color: colors.fdd }]}>{s.studentId}</Text>
                <Text style={[styles.podiumScore, { color: podiumBorderColor }]}>{Math.trunc(s.score)} pts</Text>
              </View>
            );
          })}
        </View>
      )}

      {/* Remaining Rankings */}
      <GlassCard style={[styles.glassCard, { margin: 16 }]}>
        {leaderboard.slice(3).map((entry: any, index: number) => {
          const isMe = entry.studentId === user?.studentId;
          return (
            <View key={index} style={[styles.leaderRow, { borderBottomColor: colors.b }, isMe && [styles.leaderRowHighlight, { backgroundColor: isDark ? colors.bg2 : '#EDE8F5', borderColor: isDark ? colors.pm : 'rgba(93,58,155,0.30)' }]]}>
              <Text style={[styles.rankText, { color: isMe ? colors.p : colors.fdd }]}>#{entry.rank}</Text>
              <View style={[styles.leaderAvatar, { backgroundColor: isDark ? colors.bg2 : '#EDE8F5', borderColor: isMe ? colors.p : colors.b }]}>
                <Text style={[styles.leaderAvatarText, { color: colors.p }]}>
                  {typeof entry.avatar === 'string' && entry.avatar.length <= 3 ? entry.avatar : entry.name?.charAt(0)}
                </Text>
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={[styles.leaderName, { color: colors.fg }]} numberOfLines={1}>{entry.name}</Text>
                  {isMe && (
                    <View style={[styles.youBadge, { backgroundColor: colors.lt }]}>
                      <Text style={styles.youBadgeText}>YOU</Text>
                    </View>
                  )}
                </View>
                <Text style={[styles.leaderIdText, { color: colors.fdd }]}>{entry.studentId}</Text>
              </View>
              <Text style={[styles.leaderScore, { color: isMe ? colors.lt : colors.p }]}>{Math.trunc(entry.score)} pts</Text>
            </View>
          );
        })}
        {leaderboard.length === 0 && (
          <Text style={[styles.emptyText, { color: colors.fdd }]}>No leaderboard data available yet.</Text>
        )}
      </GlassCard>
    </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  toggleRow: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    padding: 4,
  },
  toggleBtn: { flex: 1, paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
  toggleActive: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
  toggleText: { fontFamily: 'SpaceMono_700Bold', fontSize: 11, letterSpacing: 1 },
  toggleTextActive: { },
  podium: { flexDirection: 'row', justifyContent: 'center', alignItems: 'flex-end', paddingVertical: 20, paddingHorizontal: 16 },
  podiumItem: { alignItems: 'center', width: '30%' },
  podiumCenter: { marginBottom: 20 },
  podiumMedal: { fontSize: 28, marginBottom: 8 },
  podiumAvatar: { width: 52, height: 52, borderRadius: 26, justifyContent: 'center', alignItems: 'center', borderWidth: 2 },
  podiumAvatarCenter: { width: 68, height: 68, borderRadius: 34, borderWidth: 3 },
  podiumAvatarText: { fontFamily: 'Unbounded_700Bold', fontSize: 16 },
  podiumName: { fontFamily: 'Inter_600SemiBold', fontSize: 12, marginTop: 8, textAlign: 'center' },
  podiumId: { fontFamily: 'SpaceMono_400Regular', fontSize: 9, marginTop: 2, letterSpacing: 1, textTransform: 'uppercase' },
  podiumScore: { fontFamily: 'Unbounded_700Bold', fontSize: 13, marginTop: 4 },
  glassCard: { padding: 8 },
  leaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderRadius: 10,
  },
  leaderRowHighlight: { borderWidth: 1 },
  rankText: { fontFamily: 'SpaceMono_700Bold', fontSize: 13, width: 36 },
  leaderAvatar: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', marginRight: 12, borderWidth: 1 },
  leaderAvatarText: { fontFamily: 'Inter_600SemiBold', fontSize: 13 },
  leaderName: { fontFamily: 'Inter_600SemiBold', fontSize: 14 },
  leaderIdText: { fontFamily: 'SpaceMono_400Regular', fontSize: 9, marginTop: 2, letterSpacing: 1, textTransform: 'uppercase' },
  leaderScore: { fontFamily: 'Unbounded_700Bold', fontSize: 13 },
  youBadge: { paddingHorizontal: 6, paddingVertical: 1, borderRadius: 6 },
  youBadgeText: { fontFamily: 'SpaceMono_700Bold', fontSize: 8, color: '#ffffff', letterSpacing: 1 },
  emptyText: { fontFamily: 'Inter_400Regular', fontStyle: 'italic', padding: 16, textAlign: 'center' },
});
