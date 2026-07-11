import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, RefreshControl, TouchableOpacity, Alert, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import GlassCard from '../../components/GlassCard';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { openSafeUrl } from '../../utils/safeLinking';

export default function SolutionsScreen() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [classFilter, setClassFilter] = useState<string | null>(null);
  const [subjectFilter, setSubjectFilter] = useState<string | null>(null);
  const { colors, isDark } = useTheme();
  const { user } = useAuth();
  
  // Use the env variable or fallback to production URL
  const CLASSCONNECT_API_URL = process.env.EXPO_PUBLIC_CLASSCONNECT_API_URL || 'https://classconnects.vercel.app/api';

  const fetchSolutions = async () => {
    try {
      const response = await fetch(`${CLASSCONNECT_API_URL}/solutions`);
      const result = await response.json();
      if (result.success) {
        setData(result.data);
      } else {
        setData([]);
      }
    } catch (err) {
      console.error('Failed to fetch solutions', err);
      Alert.alert('Error', 'Could not load solutions from ClassConnect');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchSolutions(); }, []);

  const openSolution = (sol: any) => {
    if (sol.formatType === 'PDF' || sol.formatType === 'DriveLink') {
      const url = sol.formatType === 'PDF' ? sol.pdfUrl : sol.driveLink;
      if (url) {
        openSafeUrl(url);
      }
    } else if (sol.formatType === 'HTML') {
      const baseUrl = CLASSCONNECT_API_URL.replace('/api', '');
      // Canonical SPA route; /view_solution?id= is the server's legacy redirect for old records without a slug.
      const url = sol.slug
        ? `${baseUrl}/solutions/${encodeURIComponent(sol.slug)}`
        : `${baseUrl}/view_solution?id=${encodeURIComponent(sol._id)}`;
      openSafeUrl(url);
    }
  };

  if (loading) return <View style={[styles.center, { backgroundColor: 'transparent' }]}><ActivityIndicator size="large" color={colors.p} /></View>;

  // Filter, then group into playlists the way the web Solutions Hub does.
  const classes = [...new Set(data.map((s: any) => s.classLevel).filter(Boolean))].sort();
  const subjects = [...new Set(data.map((s: any) => s.subject).filter(Boolean))].sort();

  const query = search.trim().toLowerCase();
  const filtered = data.filter((sol: any) => {
    if (classFilter && sol.classLevel !== classFilter) return false;
    if (subjectFilter && sol.subject !== subjectFilter) return false;
    if (!query) return true;
    return [sol.title, sol.subject, sol.chapter, sol.playlist, sol.classLevel, sol.board]
      .filter(Boolean)
      .some((f: string) => String(f).toLowerCase().includes(query));
  });

  const playlists: Record<string, any[]> = {};
  filtered.forEach((sol: any) => {
    const key = sol.playlist || 'Other Solutions';
    if (!playlists[key]) playlists[key] = [];
    playlists[key].push(sol);
  });
  Object.values(playlists).forEach((list) =>
    list.sort((a, b) => (Number(a.chapterNumber) || 0) - (Number(b.chapterNumber) || 0))
  );

  const renderCard = (sol: any) => (
    <GlassCard key={sol._id} style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.cardTitle, { color: colors.fg }]}>{sol.title}</Text>
          <Text style={[styles.cardSub, { color: colors.fdd }]}>
            {sol.board || 'Any Board'} • {sol.classLevel || 'Any Class'} • {sol.subject}
          </Text>
        </View>
      </View>
      {sol.chapter && <Text style={[styles.chapterText, { color: colors.fdd }]}>Chapter: {sol.chapter}</Text>}

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 15 }}>
        <View style={styles.formatBadge}>
          <Text style={styles.formatText}>{sol.formatType}</Text>
        </View>
        <TouchableOpacity onPress={() => openSolution(sol)} style={[styles.btn, { backgroundColor: '#822CFA' }]}>
          <Text style={styles.btnText}>View Solution</Text>
        </TouchableOpacity>
      </View>
    </GlassCard>
  );

  return (
    <View style={{ flex: 1, backgroundColor: 'transparent' }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 100 }} refreshControl={<RefreshControl refreshing={refreshing} colors={[colors.p]} onRefresh={() => { setRefreshing(true); fetchSolutions(); }} />}>

        <LinearGradient colors={['#822CFA', '#6618D7']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.banner}>
          <View style={{ flex: 1 }}>
            <Text style={styles.bannerTitle}>Free Solutions</Text>
            <Text style={styles.bannerSub}>Premium AI & PDF resources</Text>
          </View>
          <View style={styles.iconCircle}>
            <Ionicons name="bulb-outline" size={28} color="#fff" />
          </View>
        </LinearGradient>

        {/* Search */}
        <View style={[styles.searchBox, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.85)', borderColor: colors.b }]}>
          <Ionicons name="search" size={18} color={colors.fdd} />
          <TextInput
            style={[styles.searchInput, { color: colors.fg }]}
            value={search}
            onChangeText={setSearch}
            placeholder="Search chapter, subject, class..."
            placeholderTextColor={colors.fdd}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={18} color={colors.fdd} />
            </TouchableOpacity>
          )}
        </View>

        {/* Class filter */}
        {classes.length > 1 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
            <TouchableOpacity onPress={() => setClassFilter(null)}
              style={[styles.filterPill, { borderColor: colors.b }, !classFilter && styles.filterPillActive]}>
              <Text style={[styles.filterPillText, { color: colors.fdd }, !classFilter && { color: '#fff' }]}>All Classes</Text>
            </TouchableOpacity>
            {classes.map((c: string) => (
              <TouchableOpacity key={c} onPress={() => setClassFilter(classFilter === c ? null : c)}
                style={[styles.filterPill, { borderColor: colors.b }, classFilter === c && styles.filterPillActive]}>
                <Text style={[styles.filterPillText, { color: colors.fdd }, classFilter === c && { color: '#fff' }]}>Class {c}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {/* Subject filter */}
        {subjects.length > 1 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
            <TouchableOpacity onPress={() => setSubjectFilter(null)}
              style={[styles.filterPill, { borderColor: colors.b }, !subjectFilter && styles.filterPillActive]}>
              <Text style={[styles.filterPillText, { color: colors.fdd }, !subjectFilter && { color: '#fff' }]}>All Subjects</Text>
            </TouchableOpacity>
            {subjects.map((s: string) => (
              <TouchableOpacity key={s} onPress={() => setSubjectFilter(subjectFilter === s ? null : s)}
                style={[styles.filterPill, { borderColor: colors.b }, subjectFilter === s && styles.filterPillActive]}>
                <Text style={[styles.filterPillText, { color: colors.fdd }, subjectFilter === s && { color: '#fff' }]}>{s}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        <View style={styles.container}>
          {filtered.length === 0 ? (
            <View style={{ alignItems: 'center', marginTop: 40, opacity: 0.5 }}>
              <Ionicons name="folder-open-outline" size={40} color={colors.fg} style={{ marginBottom: 10 }} />
              <Text style={{ fontFamily: 'SpaceMono_400Regular', color: colors.fg, fontSize: 13 }}>
                {data.length === 0 ? 'No solutions available.' : 'No solutions match your search.'}
              </Text>
            </View>
          ) : (
            Object.entries(playlists).map(([playlist, sols]) => (
              <View key={playlist}>
                <View style={styles.playlistHeader}>
                  <Ionicons name="albums-outline" size={16} color="#822CFA" />
                  <Text style={[styles.playlistTitle, { color: colors.fg }]}>{playlist}</Text>
                  <Text style={[styles.playlistCount, { color: colors.fdd }]}>{sols.length}</Text>
                </View>
                {sols.map(renderCard)}
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  banner: { flexDirection: 'row', alignItems: 'center', padding: 20, paddingTop: 60, borderBottomLeftRadius: 30, borderBottomRightRadius: 30, marginBottom: 20 },
  bannerTitle: { fontFamily: 'Unbounded_700Bold', fontSize: 24, color: '#fff' },
  bannerSub: { fontFamily: 'SpaceMono_400Regular', fontSize: 13, color: 'rgba(255,255,255,0.8)', marginTop: 4 },
  iconCircle: { width: 50, height: 50, borderRadius: 25, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  container: { paddingHorizontal: 16 },
  searchBox: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10, marginHorizontal: 16, marginBottom: 12 },
  searchInput: { flex: 1, fontFamily: 'Inter_400Regular', fontSize: 14, padding: 0 },
  filterRow: { paddingHorizontal: 12, marginBottom: 10, flexGrow: 0 },
  filterPill: { borderWidth: 1, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, marginHorizontal: 4 },
  filterPillActive: { backgroundColor: '#822CFA', borderColor: '#822CFA' },
  filterPillText: { fontFamily: 'SpaceMono_400Regular', fontSize: 12 },
  playlistHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10, marginBottom: 10, paddingHorizontal: 4 },
  playlistTitle: { fontFamily: 'Unbounded_700Bold', fontSize: 14, flex: 1 },
  playlistCount: { fontFamily: 'SpaceMono_700Bold', fontSize: 11 },
  card: { padding: 16, marginBottom: 12 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardTitle: { fontFamily: 'Inter_700Bold', fontSize: 16, marginBottom: 4 },
  cardSub: { fontFamily: 'SpaceMono_400Regular', fontSize: 12 },
  chapterText: { fontFamily: 'SpaceMono_400Regular', fontSize: 11, marginTop: 8 },
  formatBadge: { backgroundColor: 'rgba(130, 44, 250, 0.1)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, borderWidth: 1, borderColor: 'rgba(130, 44, 250, 0.3)' },
  formatText: { fontFamily: 'SpaceMono_700Bold', fontSize: 10, color: '#822CFA' },
  btn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  btnText: { fontFamily: 'SpaceMono_700Bold', fontSize: 12, color: '#fff' }
});
