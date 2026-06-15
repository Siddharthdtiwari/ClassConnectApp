import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, RefreshControl, TouchableOpacity, Alert } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import client from '../../api/client';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import GlassCard from '../../components/GlassCard';
import { useTheme } from '../../context/ThemeContext';

export default function SyllabusScreen() {
  const { user } = useAuth();
  const [data, setData] = useState<any[]>([]);
  const [batches, setBatches] = useState<any[]>([]);
  const [selectedBatch, setSelectedBatch] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { colors, isDark } = useTheme();

  const fetchSyllabus = async () => {
    try {
      const endpoint = user?.role === 'student' ? '/student/syllabus' : '/teacher/syllabus';
      const response = await client.get(endpoint);
      setData(response.data.records || response.data.syllabus || []);

      if (user?.role === 'teacher') {
        const batchRes = await client.get('/teacher/batches');
        setBatches(batchRes.data.batches || []);
        if (batchRes.data.batches?.length > 0 && !selectedBatch) {
          setSelectedBatch(batchRes.data.batches[0]._id);
        }
      }
    } catch (err) {
      console.error('Failed to fetch syllabus', err);
    } finally { setLoading(false); setRefreshing(false); }
  };

  useEffect(() => { fetchSyllabus(); }, []);

  const toggleChapterStatus = async (subject: string, chapterNo: number, currentStatus: string) => {
    if (user?.role !== 'teacher') return;
    
    // Cycle status: Not Started -> In Progress -> Completed -> Not Started
    let nextStatus = 'Not Started';
    if (currentStatus === 'Not Started') nextStatus = 'In Progress';
    else if (currentStatus === 'In Progress') nextStatus = 'Completed';

    try {
      await client.post('/teacher/syllabus/update', {
        batchId: selectedBatch,
        subject,
        chapterNo,
        status: nextStatus
      });
      fetchSyllabus();
    } catch (err) {
      Alert.alert('Error', 'Failed to update syllabus status');
    }
  };

  if (loading) return <View style={[styles.center, { backgroundColor: 'transparent' }]}><ActivityIndicator size="large" color={colors.p} /></View>;

  const filteredRecords = user?.role === 'teacher' && selectedBatch
    ? data.filter((s: any) => typeof s.batch === 'object' ? s.batch._id === selectedBatch : s.batch === selectedBatch)
    : data;

  const getStatusColor = (status: string) => {
    if (status === 'Completed') return '#10b981'; // Green
    if (status === 'In Progress') return '#f59e0b'; // Orange
    return 'rgba(12,12,12,0.15)'; // Gray
  };

  return (
    <View style={{ flex: 1, backgroundColor: 'transparent' }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 100 }} refreshControl={<RefreshControl refreshing={refreshing} colors={[colors.p]} onRefresh={() => { setRefreshing(true); fetchSyllabus(); }} />}>
        
        {user?.role === 'teacher' ? (
          <LinearGradient colors={[colors.p, colors.pm]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.banner}>
            <View style={{ flex: 1 }}>
              <Text style={styles.bannerTitle}>Syllabus Tracker</Text>
              <Text style={styles.bannerSub}>Tap chapters to update status</Text>
            </View>
            <View style={[styles.iconBox, { backgroundColor: colors.bgc }]}>
              <Ionicons name="book" size={24} color={colors.pm} />
            </View>
          </LinearGradient>
        ) : (
          <GlassCard style={[styles.glassCard, { margin: 16, marginTop: 16 }]}>
            <Text style={[styles.sectionTitle, { color: colors.fg }]}>📚 Syllabus Tracker</Text>
            <Text style={[styles.metaText, { color: colors.fdd }]}>Track your progress</Text>
          </GlassCard>
        )}

        {/* Batch Selector for Teacher */}
        {user?.role === 'teacher' && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ paddingHorizontal: 12, marginBottom: 16 }}>
            {batches.map((batch) => (
              <TouchableOpacity
                key={batch._id}
                onPress={() => setSelectedBatch(batch._id)}
                style={[styles.batchPill, { backgroundColor: isDark ? colors.bg2 : 'rgba(255,255,255,0.8)', borderColor: colors.b }, selectedBatch === batch._id && [styles.batchPillActive, { backgroundColor: colors.pm, borderColor: colors.pm }]]}
              >
                <Text style={[styles.batchPillText, { color: colors.fdd }, selectedBatch === batch._id && styles.batchPillTextActive]}>
                  {batch.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {filteredRecords.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={{ fontSize: 48 }}>📖</Text>
            <Text style={[styles.emptyText, { color: colors.fdd }]}>No syllabus data found.</Text>
          </View>
        ) : (
          filteredRecords.map((record: any, index: number) => {
            const totalChapters = record.totalChapters || 10;
            const statuses = record.chapterStatuses || {};
            
            let completed = 0;
            const chapterViews = [];
            for (let i = 1; i <= totalChapters; i++) {
              const status = statuses[i.toString()] || 'Not Started';
              if (status === 'Completed') completed++;
              
              chapterViews.push(
                <TouchableOpacity 
                  key={i} 
                  style={[styles.chapterRow, { borderBottomColor: colors.b }]}
                  disabled={user?.role !== 'teacher'}
                  onPress={() => toggleChapterStatus(record.subject, i, status)}
                >
                  <Text style={[styles.chapterNum, { color: colors.fg }]}>Ch {i}</Text>
                  <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
                    <View style={[styles.statusDot, { backgroundColor: getStatusColor(status) }]} />
                    <Text style={[styles.chapterStatus, { color: colors.fdd }]}>{status}</Text>
                  </View>
                  {user?.role === 'teacher' && (
                    <Ionicons name="swap-horizontal" size={16} color={colors.fdd} />
                  )}
                </TouchableOpacity>
              );
            }

            const progress = Math.round((completed / totalChapters) * 100);

            return (
              <GlassCard key={index} style={styles.card}>
                <View style={styles.subjectHeader}>
                  <View>
                    <Text style={[styles.subjectTitle, { color: colors.fg }]}>{record.subject}</Text>
                    <Text style={[styles.subjectProgress, { color: colors.fdd }]}>{completed}/{totalChapters} Chapters</Text>
                  </View>
                  <View style={[styles.progressBadge, { backgroundColor: isDark ? colors.bg2 : '#EDE8F5' }]}>
                    <Text style={[styles.progressText, { color: colors.p }]}>{progress}%</Text>
                  </View>
                </View>

                {/* Progress Bar */}
                <View style={[styles.progressBarBg, { backgroundColor: isDark ? colors.bg2 : 'rgba(12,12,12,0.05)' }]}>
                  <View style={[styles.progressBarFill, { backgroundColor: colors.pm, width: `${progress}%` }]} />
                </View>

                <View style={[styles.chapterList, { borderTopColor: colors.b }]}>
                  {chapterViews}
                </View>
              </GlassCard>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  glassCard: { padding: 20 },
  sectionTitle: { fontFamily: 'Unbounded_700Bold', fontSize: 16 },
  metaText: { fontFamily: 'SpaceMono_400Regular', fontSize: 12, marginTop: 4 },
  banner: { margin: 16, borderRadius: 20, padding: 24, marginBottom: 16, flexDirection: 'row', alignItems: 'center' },
  bannerTitle: { fontFamily: 'Unbounded_900Black', fontSize: 22, color: '#fff' },
  bannerSub: { fontFamily: 'SpaceMono_400Regular', fontSize: 11, color: 'rgba(255,255,255,0.70)', marginTop: 8, letterSpacing: 1 },
  iconBox: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  batchPill: { borderWidth: 1, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, marginHorizontal: 4 },
  batchPillActive: { },
  batchPillText: { fontFamily: 'SpaceMono_400Regular', fontSize: 12 },
  batchPillTextActive: { color: '#fff' },
  emptyContainer: { justifyContent: 'center', alignItems: 'center', paddingTop: 80 },
  emptyText: { fontFamily: 'Inter_400Regular', fontSize: 16, marginTop: 12 },
  
  card: { marginHorizontal: 16, marginBottom: 16, padding: 20 },
  subjectHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  subjectTitle: { fontFamily: 'Unbounded_700Bold', fontSize: 16 },
  subjectProgress: { fontFamily: 'SpaceMono_400Regular', fontSize: 11, marginTop: 4 },
  progressBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
  progressText: { fontFamily: 'Unbounded_700Bold', fontSize: 12 },
  progressBarBg: { height: 6, borderRadius: 3, marginBottom: 16, overflow: 'hidden' },
  progressBarFill: { height: '100%', borderRadius: 3 },
  
  chapterList: { borderTopWidth: 1, paddingTop: 8 },
  chapterRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1 },
  chapterNum: { fontFamily: 'SpaceMono_700Bold', fontSize: 12, width: 50 },
  statusDot: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
  chapterStatus: { fontFamily: 'Inter_400Regular', fontSize: 13 },
});
