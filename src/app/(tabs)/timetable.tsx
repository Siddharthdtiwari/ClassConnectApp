import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, RefreshControl, TouchableOpacity, Modal, TextInput, Alert } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import client from '../../api/client';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import GlassCard from '../../components/GlassCard';
import PremiumButton from '../../components/PremiumButton';
import GlassInput from '../../components/GlassInput';
import { useTheme } from '../../context/ThemeContext';

export default function TimetableScreen() {
  const { user } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Teacher State
  const [batches, setBatches] = useState<any[]>([]);
  const [selectedBatch, setSelectedBatch] = useState<string | null>(null);

  // Add/Edit Timetable Form
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState('');
  const [examDate, setExamDate] = useState('');
  const [subject, setSubject] = useState('');
  const [examType, setExamType] = useState('');
  const [chapters, setChapters] = useState('');
  const [saving, setSaving] = useState(false);
  const { colors, isDark } = useTheme();

  const fetchTimetable = async () => {
    try {
      const endpoint = user?.role === 'student' ? '/student/timetable' : '/teacher/timetable';
      const response = await client.get(endpoint);
      setData(response.data);

      if (user?.role === 'teacher') {
        const batchRes = await client.get('/teacher/batches');
        setBatches(batchRes.data.batches || []);
        if (batchRes.data.batches?.length > 0 && !selectedBatch) {
          setSelectedBatch(batchRes.data.batches[0]._id);
        }
      }
    } catch (err) {
      console.error('Failed to fetch timetable', err);
    } finally { setLoading(false); setRefreshing(false); }
  };

  useEffect(() => { fetchTimetable(); }, []);

  const handleSaveEntry = async () => {
    if (!examDate || !subject) {
      Alert.alert('Error', 'Date and Subject are required.');
      return;
    }

    setSaving(true);
    try {
      if (isEditing) {
        await client.put(`/teacher/timetable/${editingId}`, {
          examDate, subject, examType, chapters
        });
        Alert.alert('Success', 'Timetable updated successfully!');
      } else {
        await client.post('/teacher/timetable', {
          batchId: selectedBatch,
          examDate, subject, examType, chapters
        });
        Alert.alert('Success', 'Timetable entry added successfully!');
      }
      setShowModal(false);
      setExamDate(''); setSubject(''); setExamType(''); setChapters('');
      setRefreshing(true);
      fetchTimetable();
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.error || 'Failed to save timetable entry');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteEntry = async (id: string) => {
    Alert.alert('Confirm Delete', 'Are you sure you want to delete this exam?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try {
          await client.delete(`/teacher/timetable/${id}`);
          setRefreshing(true);
          fetchTimetable();
        } catch (err) {
          Alert.alert('Error', 'Failed to delete exam');
        }
      }}
    ]);
  };

  const openEditModal = (entry: any) => {
    setIsEditing(true);
    setEditingId(entry._id);
    setExamDate(new Date(entry.examDate).toISOString().split('T')[0]);
    setSubject(entry.subject);
    setExamType(entry.examType || '');
    setChapters(entry.chapters || '');
    setShowModal(true);
  };

  const openAddModal = () => {
    setIsEditing(false);
    setEditingId('');
    setExamDate('');
    setSubject('');
    setExamType('');
    setChapters('');
    setShowModal(true);
  };

  if (loading) return <View style={[styles.center, { backgroundColor: 'transparent' }]}><ActivityIndicator size="large" color={colors.p} /></View>;

  const allEntries = data?.entries || [];
  const entries = user?.role === 'teacher' && selectedBatch
    ? allEntries.filter((e: any) => typeof e.batch === 'object' ? e.batch._id === selectedBatch : e.batch === selectedBatch)
    : allEntries;

  const now = new Date();
  const upcoming = entries.filter((e: any) => new Date(e.examDate) >= now);
  const past = entries.filter((e: any) => new Date(e.examDate) < now);

  return (
    <View style={{ flex: 1, backgroundColor: 'transparent' }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 100 }} refreshControl={<RefreshControl refreshing={refreshing} colors={[colors.p]} onRefresh={() => { setRefreshing(true); fetchTimetable(); }} />}>
        
        {/* Teacher Banner */}
        {user?.role === 'teacher' && (
          <LinearGradient colors={[colors.p, colors.pm]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.teacherBanner}>
            <View style={{ flex: 1 }}>
              <Text style={styles.teacherBannerTitle}>Exam Schedule</Text>
              <Text style={styles.teacherBannerSub}>Manage timetable and syllabus</Text>
            </View>
            <TouchableOpacity onPress={openAddModal} style={[styles.addBtn, { backgroundColor: colors.bgc }]}>
              <Ionicons name="add" size={24} color={colors.pm} />
            </TouchableOpacity>
          </LinearGradient>
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

        {/* Upcoming */}
        {upcoming.length > 0 && (
          <View style={{ marginTop: 16 }}>
            <Text style={[styles.sectionHeader, { color: colors.fg }]}>📅 Upcoming Exams</Text>
            {upcoming.map((entry: any, index: number) => (
              <GlassCard key={index} style={[styles.examCard, { padding: 0 }]}>
                <View style={[styles.dateBox, { backgroundColor: isDark ? colors.bg2 : '#EDE8F5' }]}>
                  <Text style={[styles.dateDay, { color: colors.p }]}>{new Date(entry.examDate).getDate()}</Text>
                  <Text style={[styles.dateMonth, { color: colors.pm }]}>{new Date(entry.examDate).toLocaleString('default', { month: 'short' }).toUpperCase()}</Text>
                </View>
                <View style={styles.examInfo}>
                  <Text style={[styles.examSubject, { color: colors.fg }]}>{entry.subject}</Text>
                  <Text style={[styles.examType, { color: colors.fdd }]}>{entry.examType}</Text>
                  <Text style={[styles.examChapters, { color: colors.pm }]}>📖 {entry.chapters || 'All chapters'}</Text>
                </View>
                {user?.role === 'teacher' && (
                  <View style={{ flexDirection: 'row', gap: 12, paddingRight: 10, alignItems: 'center' }}>
                    <TouchableOpacity onPress={() => openEditModal(entry)}>
                      <Ionicons name="pencil" size={20} color={colors.fdd} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleDeleteEntry(entry._id)}>
                      <Ionicons name="trash" size={20} color={colors.rt} />
                    </TouchableOpacity>
                  </View>
                )}
              </GlassCard>
            ))}
          </View>
        )}

        {/* Past */}
        {past.length > 0 && (
          <View style={{ marginTop: 16 }}>
            <Text style={[styles.sectionHeader, { color: colors.fg }]}>✅ Past Exams</Text>
            {past.map((entry: any, index: number) => (
              <GlassCard key={index} style={[styles.examCard, { padding: 0, opacity: 0.55 }]}>
                <View style={[styles.dateBox, { backgroundColor: isDark ? colors.bg2 : '#EDE8F5' }]}>
                  <Text style={[styles.dateDay, { color: colors.fdd }]}>{new Date(entry.examDate).getDate()}</Text>
                  <Text style={[styles.dateMonth, { color: colors.fdd }]}>{new Date(entry.examDate).toLocaleString('default', { month: 'short' }).toUpperCase()}</Text>
                </View>
                <View style={{ flex: 1, padding: 14, justifyContent: 'center' }}>
                  <Text style={[styles.examSubject, { color: colors.fg }]}>{entry.subject}</Text>
                  <Text style={[styles.examType, { color: colors.fdd }]}>{entry.examType || 'Internal Exam'} • Chapters: {entry.chapters || 'All'}</Text>
                </View>
                {user?.role === 'teacher' && (
                  <View style={{ flexDirection: 'row', gap: 12, paddingRight: 10, alignItems: 'center' }}>
                    <TouchableOpacity onPress={() => openEditModal(entry)}>
                      <Ionicons name="pencil" size={20} color={colors.fdd} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleDeleteEntry(entry._id)}>
                      <Ionicons name="trash" size={20} color={colors.rt} />
                    </TouchableOpacity>
                  </View>
                )}
              </GlassCard>
            ))}
          </View>
        )}

        {entries.length === 0 && (
          <View style={styles.emptyContainer}>
            <Text style={{ fontSize: 48 }}>📅</Text>
            <Text style={[styles.emptyText, { color: colors.fdd }]}>No exams scheduled yet.</Text>
          </View>
        )}
      </ScrollView>

      {/* Add/Edit Exam Modal */}
      {user?.role === 'teacher' && (
        <Modal visible={showModal} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <GlassCard style={styles.modalContent} intensity={isDark ? 50 : 30}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: colors.fg }]}>{isEditing ? 'Edit Exam' : 'Schedule Exam'}</Text>
                <TouchableOpacity onPress={() => setShowModal(false)}>
                  <Ionicons name="close" size={24} color={colors.fdd} />
                </TouchableOpacity>
              </View>

              <Text style={[styles.fieldLabel, { color: colors.fdd }]}>EXAM DATE (YYYY-MM-DD)</Text>
              <GlassInput value={examDate} onChangeText={setExamDate} placeholder="e.g. 2026-05-20" />

              <Text style={[styles.fieldLabel, { color: colors.fdd }]}>SUBJECT</Text>
              <GlassInput value={subject} onChangeText={setSubject} placeholder="e.g. Science" />

              <Text style={[styles.fieldLabel, { color: colors.fdd }]}>EXAM TYPE (Optional)</Text>
              <GlassInput value={examType} onChangeText={setExamType} placeholder="e.g. Unit Test 1" />

              <Text style={[styles.fieldLabel, { color: colors.fdd }]}>CHAPTERS (Optional)</Text>
              <GlassInput value={chapters} onChangeText={setChapters} placeholder="e.g. Ch 1, 2, 3" />

              <PremiumButton
                title={isEditing ? 'SAVE CHANGES' : 'SCHEDULE EXAM'}
                onPress={handleSaveEntry}
                loading={saving}
                style={{ marginTop: 8 }}
              />
            </GlassCard>
          </View>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  sectionHeader: { fontFamily: 'Unbounded_700Bold', fontSize: 16, marginHorizontal: 16, marginBottom: 12 },
  examCard: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 10,
    overflow: 'hidden',
  },
  dateBox: {
    width: 68,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 18,
  },
  dateDay: { fontFamily: 'Unbounded_900Black', fontSize: 22 },
  dateMonth: { fontFamily: 'SpaceMono_700Bold', fontSize: 10, letterSpacing: 1, marginTop: 2 },
  examInfo: { flex: 1, padding: 14, justifyContent: 'center' },
  examSubject: { fontFamily: 'Inter_600SemiBold', fontSize: 15 },
  examType: { fontFamily: 'SpaceMono_400Regular', fontSize: 11, marginTop: 3 },
  examChapters: { fontFamily: 'SpaceMono_400Regular', fontSize: 11, marginTop: 4 },
  emptyContainer: { justifyContent: 'center', alignItems: 'center', paddingTop: 80 },
  emptyText: { fontFamily: 'Inter_400Regular', fontSize: 16, marginTop: 12 },

  // Teacher specific
  teacherBanner: { margin: 16, borderRadius: 20, padding: 24, marginBottom: 16, flexDirection: 'row', alignItems: 'center' },
  teacherBannerTitle: { fontFamily: 'Unbounded_900Black', fontSize: 22, color: '#fff' },
  teacherBannerSub: { fontFamily: 'SpaceMono_400Regular', fontSize: 11, color: 'rgba(255,255,255,0.70)', marginTop: 8, letterSpacing: 1 },
  addBtn: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  batchPill: { borderWidth: 1, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, marginHorizontal: 4 },
  batchPillActive: { },
  batchPillText: { fontFamily: 'SpaceMono_400Regular', fontSize: 12 },
  batchPillTextActive: { color: '#fff' },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.50)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '85%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  modalTitle: { fontFamily: 'Unbounded_700Bold', fontSize: 18 },
  fieldLabel: { fontFamily: 'SpaceMono_700Bold', fontSize: 10, letterSpacing: 2, marginBottom: 8, marginLeft: 2 },
  typeRow: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  typePill: { flex: 1, borderWidth: 1, borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  typePillActive: { },
  typePillText: { fontFamily: 'SpaceMono_400Regular', fontSize: 11 },
});
