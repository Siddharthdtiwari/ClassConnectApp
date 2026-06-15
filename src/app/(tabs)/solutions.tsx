import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, RefreshControl, TouchableOpacity, Alert } from 'react-native';
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
      openSafeUrl(`${baseUrl}/view_solution.html?id=${encodeURIComponent(sol._id)}`);
    }
  };

  if (loading) return <View style={[styles.center, { backgroundColor: 'transparent' }]}><ActivityIndicator size="large" color={colors.p} /></View>;

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

        <View style={styles.container}>
          {data.length === 0 ? (
            <View style={{ alignItems: 'center', marginTop: 40, opacity: 0.5 }}>
              <Ionicons name="folder-open-outline" size={40} color={colors.fg} style={{ marginBottom: 10 }} />
              <Text style={{ fontFamily: 'SpaceMono_400Regular', color: colors.fg, fontSize: 13 }}>No solutions available.</Text>
            </View>
          ) : (
            data.map((sol: any) => (
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
