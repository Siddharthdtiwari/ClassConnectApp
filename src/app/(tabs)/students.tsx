import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, RefreshControl, TouchableOpacity, Modal, TextInput, Alert, Image, Linking } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import client from '../../api/client';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as DocumentPicker from 'expo-document-picker';
import GlassCard from '../../components/GlassCard';
import GlassInput from '../../components/GlassInput';
import PremiumButton from '../../components/PremiumButton';
import { useTheme } from '../../context/ThemeContext';
import { openSafeUrl } from '../../utils/safeLinking';

export default function StudentsScreen() {
  const { user } = useAuth();
  const [data, setData] = useState<any>(null);
  const [batches, setBatches] = useState<any[]>([]);
  const [selectedBatch, setSelectedBatch] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Student Profile Dashboard
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<any>(null);
  const [loadingProfile, setLoadingProfile] = useState(false);

  // Add/Edit Student Form
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState('');
  const [studentId, setStudentId] = useState('');
  const [studentName, setStudentName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mobileNo, setMobileNo] = useState('');
  const [monthlyFee, setMonthlyFee] = useState('');
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const { colors, isDark } = useTheme();

  const fetchStudents = async () => {
    try {
      const [studentsRes, batchesRes] = await Promise.all([
        client.get('/teacher/students'),
        client.get('/teacher/batches')
      ]);
      setData(studentsRes.data.students || []);
      setBatches(batchesRes.data.batches || []);
      
      if (batchesRes.data.batches?.length > 0 && !selectedBatch) {
        setSelectedBatch(batchesRes.data.batches[0]._id);
      }
    } catch (err) {
      console.error('Failed to fetch students', err);
    } finally { setLoading(false); setRefreshing(false); }
  };

  useEffect(() => { fetchStudents(); }, []);

  const handleSaveStudent = async () => {
    if (!studentId || !studentName || !mobileNo || (!isEditing && !password)) {
      Alert.alert('Error', 'ID, Name, Mobile, and Password are required.');
      return;
    }
    if (!selectedBatch) {
      Alert.alert('Error', 'Please select a batch first.');
      return;
    }

    setSaving(true);
    try {
      if (isEditing) {
        await client.put(`/teacher/students/${editingId}`, {
          studentName,
          mobileNo,
          monthlyFee: Number(monthlyFee) || 0
        });
        Alert.alert('Success', 'Student updated successfully!');
      } else {
        await client.post('/teacher/students', {
          batchId: selectedBatch,
          studentId,
          studentName,
          email,
          password,
          mobileNo,
          monthlyFee: Number(monthlyFee) || 0
        });
        Alert.alert('Success', 'Student added successfully!');
      }
      
      setShowModal(false);
      setStudentId(''); setStudentName(''); setEmail(''); setPassword(''); setMobileNo(''); setMonthlyFee('');
      setRefreshing(true);
      fetchStudents();
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.error || 'Failed to save student');
    } finally {
      setSaving(false);
    }
  };

  const handleBulkImport = () => {
    Alert.alert(
      'Web Feature Only', 
      'Bulk Excel uploads are available on the web dashboard. Redirecting to web...',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Open Web', onPress: () => openSafeUrl('https://tuitionhub.vercel.app/login') }
      ]
    );
  };

  const openEditModal = (student: any) => {
    setIsEditing(true);
    setEditingId(student._id);
    setStudentId(student.studentId);
    setStudentName(student.studentName);
    setEmail(student.email || '');
    setMobileNo(student.mobileNo || '');
    setMonthlyFee(student.monthlyFee ? student.monthlyFee.toString() : '');
    setShowModal(true);
  };

  const openAddModal = () => {
    setIsEditing(false);
    setEditingId('');
    setStudentId('');
    setStudentName('');
    setEmail('');
    setPassword('');
    setMobileNo('');
    setMonthlyFee('');
    setShowModal(true);
  };

  const downloadDirectoryPDF = () => {
    Alert.alert(
      'Web Feature Only',
      'Heavy PDF downloads are optimized for the web dashboard. Redirecting to web...',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Open Web', onPress: () => openSafeUrl('https://tuitionhub.vercel.app/login') }
      ]
    );
  };

  const handleDeleteStudent = async (studentIdStr: string) => {
    Alert.alert('Confirm Delete', 'Are you sure you want to permanently delete this student?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try {
          await client.delete(`/teacher/students/${studentIdStr}`);
          Alert.alert('Success', 'Student deleted successfully');
          setShowProfileModal(false);
          setRefreshing(true);
          fetchStudents();
        } catch (err: any) {
          Alert.alert('Error', err.response?.data?.error || 'Failed to delete student');
        }
      }}
    ]);
  };

  const openProfileModal = async (student: any) => {
    setShowProfileModal(true);
    setLoadingProfile(true);
    setSelectedProfile(null);
    try {
      const res = await client.get(`/teacher/student_profile/${student._id}`);
      setSelectedProfile(res.data);
    } catch (err) {
      Alert.alert('Error', 'Failed to load student profile');
      setShowProfileModal(false);
    } finally {
      setLoadingProfile(false);
    }
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#7c3aed" /></View>;

  const students = data ? data.filter((s: any) => typeof s.batch === 'object' ? s.batch._id === selectedBatch : s.batch === selectedBatch) : [];

  return (
    <View style={{ flex: 1, backgroundColor: 'transparent' }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 100 }} refreshControl={<RefreshControl refreshing={refreshing} colors={[colors.p]} onRefresh={() => { setRefreshing(true); fetchStudents(); }} />}>
        
        {/* Header Banner */}
        <LinearGradient colors={[colors.p, colors.pm]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.banner}>
          <View style={{ flex: 1 }}>
            <Text style={styles.bannerTitle}>Manage Students</Text>
            <Text style={styles.bannerSub}>Register & view students</Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity onPress={downloadDirectoryPDF} style={styles.addBtn} disabled={downloading}>
              {downloading ? <ActivityIndicator size="small" color={colors.pm} /> : <Ionicons name="document-text" size={20} color={colors.pm} />}
            </TouchableOpacity>
            <TouchableOpacity onPress={handleBulkImport} style={styles.addBtn} disabled={importing}>
              {importing ? <ActivityIndicator size="small" color={colors.pm} /> : <Ionicons name="document-attach" size={20} color={colors.pm} />}
            </TouchableOpacity>
            <TouchableOpacity onPress={openAddModal} style={styles.addBtn}>
              <Ionicons name="add" size={24} color={colors.pm} />
            </TouchableOpacity>
          </View>
        </LinearGradient>

        {/* Batch Selector */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ paddingHorizontal: 12, marginBottom: 16 }}>
          {batches.map((batch) => (
            <TouchableOpacity
              key={batch._id}
              onPress={() => setSelectedBatch(batch._id)}
              style={[styles.batchPill, { backgroundColor: colors.bgc, borderColor: colors.b }, selectedBatch === batch._id && { backgroundColor: colors.pm, borderColor: colors.pm }]}
            >
              <Text style={[styles.batchPillText, { color: colors.fdd }, selectedBatch === batch._id && { color: '#fff' }]}>
                {batch.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <Text style={[styles.sectionHeader, { color: colors.fg }]}>Enrolled Students ({students.length})</Text>

        {students.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={{ fontSize: 48 }}>👩‍🎓</Text>
            <Text style={[styles.emptyText, { color: colors.fdd }]}>No students in this batch.</Text>
          </View>
        ) : (
          students.map((student: any, index: number) => (
            <TouchableOpacity key={index} activeOpacity={0.7} onPress={() => openProfileModal(student)}>
              <GlassCard style={styles.card}>
                <Image 
                  source={{ uri: student.profilePhoto || `https://ui-avatars.com/api/?name=${encodeURIComponent(student.studentName)}&background=EDE8F5&color=5d3a9b` }} 
                  style={styles.avatar} 
                />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.studentName, { color: colors.fg }]}>{student.studentName}</Text>
                  <Text style={[styles.studentId, { color: colors.fdd }]}>{student.studentId} • {student.mobileNo}</Text>
                </View>
                <Ionicons name="pencil" size={18} color={colors.fdd} />
              </GlassCard>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      {/* Student Profile Dashboard Modal */}
      <Modal visible={showProfileModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <GlassCard style={[styles.modalContent, { maxHeight: '95%', height: '90%', padding: 0 }]} intensity={isDark ? 50 : 30}>
            <View style={[styles.modalHeader, { padding: 24, paddingBottom: 16, marginBottom: 0, borderBottomWidth: 1, borderBottomColor: colors.b }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="person" size={22} color={colors.p} style={{ marginRight: 8 }} />
                <Text style={[styles.modalTitle, { color: colors.fg }]}>Student Profile</Text>
              </View>
              <TouchableOpacity onPress={() => setShowProfileModal(false)}>
                <Ionicons name="close" size={24} color={colors.fdd} />
              </TouchableOpacity>
            </View>

            {loadingProfile ? (
              <View style={[styles.center, { backgroundColor: 'transparent' }]}><ActivityIndicator size="large" color={colors.p} /></View>
            ) : selectedProfile ? (
              <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
                {/* Header Card */}
                <GlassCard style={styles.profileHeaderCard}>
                  <Image source={{ uri: selectedProfile.student.profilePhoto || `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedProfile.student.studentName)}&background=EDE8F5&color=5d3a9b` }} style={styles.profileAvatar} />
                  <Text style={[styles.profileName, { color: colors.fg }]}>{selectedProfile.student.studentName}</Text>
                  <Text style={[styles.profileId, { color: colors.fdd }]}>{selectedProfile.student.studentId} • {selectedProfile.student.batch?.name}</Text>
                  
                  <View style={styles.actionRow}>
                    <TouchableOpacity onPress={() => { setShowProfileModal(false); openEditModal(selectedProfile.student); }} style={[styles.actionBtn, { borderColor: colors.b, backgroundColor: isDark ? colors.bg2 : '#ffffff' }]}>
                      <Ionicons name="pencil" size={16} color={colors.p} />
                      <Text style={[styles.actionBtnText, { color: colors.p }]}>EDIT</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => openSafeUrl(`https://tuitionhub.vercel.app/login`)} style={[styles.actionBtn, { borderColor: colors.b, backgroundColor: isDark ? colors.bg2 : '#ffffff' }]}>
                      <Ionicons name="document-text" size={16} color={colors.p} />
                      <Text style={[styles.actionBtnText, { color: colors.p }]}>REPORT</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => openSafeUrl(`https://tuitionhub.vercel.app/login`)} style={[styles.actionBtn, { borderColor: colors.b, backgroundColor: isDark ? colors.bg2 : '#ffffff' }]}>
                      <Ionicons name="receipt" size={16} color={colors.p} />
                      <Text style={[styles.actionBtnText, { color: colors.p }]}>FEES</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleDeleteStudent(selectedProfile.student._id)} style={[styles.actionBtn, { borderColor: 'rgba(220,38,38,0.2)', backgroundColor: isDark ? colors.bg2 : '#ffffff' }]}>
                      <Ionicons name="trash" size={16} color={colors.rt} />
                      <Text style={[styles.actionBtnText, { color: colors.rt }]}>DELETE</Text>
                    </TouchableOpacity>
                  </View>
                </GlassCard>

                {/* Stats Grid */}
                <View style={styles.statsGrid}>
                  <GlassCard style={styles.statBox}>
                    <Text style={[styles.statLabel, { color: colors.fdd }]}>ATTENDANCE</Text>
                    <Text style={[styles.statValue, { color: colors.fg }]}>{selectedProfile.attendancePercentage}%</Text>
                  </GlassCard>
                  <GlassCard style={styles.statBox}>
                    <Text style={[styles.statLabel, { color: colors.fdd }]}>POINTS</Text>
                    <Text style={[styles.statValue, { color: colors.lt }]}>{Math.trunc(selectedProfile.student.points || 0)}</Text>
                  </GlassCard>
                  <GlassCard style={styles.statBox}>
                    <Text style={[styles.statLabel, { color: colors.fdd }]}>RANK</Text>
                    <Text style={[styles.statValue, { color: colors.fg }]}>#{selectedProfile.studentRank}</Text>
                  </GlassCard>
                </View>

                {/* Recent Scores */}
                <Text style={[styles.sectionHeader, { color: colors.fg }]}>Recent Test Scores</Text>
                {selectedProfile.recentScores.length === 0 ? (
                  <Text style={[styles.emptyTextMini, { color: colors.fdd }]}>No test scores recorded.</Text>
                ) : (
                  selectedProfile.recentScores.slice(0, 5).map((score: any, idx: number) => (
                    <GlassCard key={idx} style={styles.logCard}>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.logTitle, { color: colors.pt }]}>{score.testName}</Text>
                        <Text style={[styles.logSub, { color: colors.fdd }]}>{score.subject}</Text>
                      </View>
                      <View style={{ alignItems: 'flex-end' }}>
                        <Text style={[styles.logValue, { color: score.percentage > 70 ? colors.lt : colors.pt }]}>{score.percentage}%</Text>
                        <Text style={[styles.logSub, { color: colors.fdd }]}>{score.score} marks</Text>
                      </View>
                    </GlassCard>
                  ))
                )}

                {/* Recent Fees */}
                <Text style={[styles.sectionHeader, { color: colors.fg, marginTop: 24 }]}>Recent Fee Payments</Text>
                {selectedProfile.recentFees.length === 0 ? (
                  <Text style={[styles.emptyTextMini, { color: colors.fdd }]}>No fee payments recorded.</Text>
                ) : (
                  selectedProfile.recentFees.slice(0, 5).map((fee: any, idx: number) => (
                    <GlassCard key={idx} style={styles.logCard}>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.logTitle, { color: colors.pt }]}>Fee for {fee.month}</Text>
                        <Text style={[styles.logSub, { color: colors.fdd }]}>{fee.method} • {new Date(fee.datePaid).toLocaleDateString()}</Text>
                      </View>
                      <Text style={[styles.logValue, { color: colors.lt }]}>₹{fee.amount}</Text>
                    </GlassCard>
                  ))
                )}
              </ScrollView>
            ) : null}
          </GlassCard>
        </View>
      </Modal>

      {/* Add Student Modal */}
      <Modal visible={showModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'flex-end' }} keyboardShouldPersistTaps="handled">
            <GlassCard style={styles.modalContent} intensity={isDark ? 40 : 20}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: colors.fg }]}>{isEditing ? 'Edit Student' : 'Register Student'}</Text>
                <TouchableOpacity onPress={() => setShowModal(false)}>
                  <Ionicons name="close" size={24} color={colors.fdd} />
                </TouchableOpacity>
              </View>

              <Text style={[styles.fieldLabel, { color: colors.fdd }]}>FULL NAME</Text>
              <GlassInput value={studentName} onChangeText={setStudentName} placeholder="e.g. John Doe" />

              <Text style={[styles.fieldLabel, { color: colors.fdd }]}>STUDENT ID (Roll No)</Text>
              <GlassInput style={[isEditing && { backgroundColor: isDark ? 'transparent' : 'rgba(12,12,12,0.05)' }]} value={studentId} onChangeText={setStudentId} editable={!isEditing} placeholder="e.g. STU1001" />

              <Text style={[styles.fieldLabel, { color: colors.fdd }]}>MOBILE NUMBER</Text>
              <GlassInput value={mobileNo} onChangeText={setMobileNo} keyboardType="phone-pad" placeholder="e.g. 9876543210" />

              {!isEditing && (
                <>
                  <Text style={[styles.fieldLabel, { color: colors.fdd }]}>PASSWORD</Text>
                  <GlassInput value={password} onChangeText={setPassword} placeholder="Setup a default password" secureTextEntry />
                </>
              )}

              <Text style={[styles.fieldLabel, { color: colors.fdd }]}>MONTHLY FEE (₹)</Text>
              <GlassInput value={monthlyFee} onChangeText={setMonthlyFee} keyboardType="numeric" placeholder="e.g. 1500" />

              <PremiumButton
                title={isEditing ? 'SAVE CHANGES' : 'REGISTER STUDENT'}
                onPress={handleSaveStudent}
                loading={saving}
                style={{ marginTop: 8 }}
              />
            </GlassCard>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  banner: { margin: 16, borderRadius: 20, padding: 24, marginBottom: 16, flexDirection: 'row', alignItems: 'center' },
  bannerTitle: { fontFamily: 'Unbounded_900Black', fontSize: 22, color: '#fff' },
  bannerSub: { fontFamily: 'SpaceMono_400Regular', fontSize: 11, color: 'rgba(255,255,255,0.70)', marginTop: 8, letterSpacing: 1 },
  addBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center' },
  batchPill: { borderWidth: 1, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, marginHorizontal: 4 },
  batchPillText: { fontFamily: 'SpaceMono_400Regular', fontSize: 12 },
  sectionHeader: { fontFamily: 'Unbounded_700Bold', fontSize: 16, marginLeft: 16, marginBottom: 12, marginTop: 8 },
  emptyContainer: { justifyContent: 'center', alignItems: 'center', paddingTop: 60, paddingHorizontal: 40 },
  emptyText: { fontFamily: 'Inter_400Regular', fontSize: 16, marginTop: 12, textAlign: 'center' },
  card: { flexDirection: 'row', marginHorizontal: 16, marginBottom: 10, padding: 16, borderRadius: 16, alignItems: 'center' },
  avatar: { width: 44, height: 44, borderRadius: 22, marginRight: 14, backgroundColor: '#EDE8F5' },
  studentName: { fontFamily: 'Inter_600SemiBold', fontSize: 15 },
  studentId: { fontFamily: 'SpaceMono_400Regular', fontSize: 11, marginTop: 4 },

  // Modals
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.60)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  modalTitle: { fontFamily: 'Unbounded_700Bold', fontSize: 18 },
  
  // Profile specific
  profileHeaderCard: { alignItems: 'center', padding: 24, borderRadius: 20, marginBottom: 16 },
  profileAvatar: { width: 80, height: 80, borderRadius: 40, marginBottom: 16, borderWidth: 3, borderColor: '#fff' },
  profileName: { fontFamily: 'Unbounded_700Bold', fontSize: 20, marginBottom: 4 },
  profileId: { fontFamily: 'SpaceMono_400Regular', fontSize: 12, letterSpacing: 1 },
  actionRow: { flexDirection: 'row', gap: 10, marginTop: 20 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, paddingVertical: 8, paddingHorizontal: 14, borderRadius: 20 },
  actionBtnText: { fontFamily: 'Unbounded_700Bold', fontSize: 10 },
  
  statsGrid: { flexDirection: 'row', gap: 10, marginBottom: 24 },
  statBox: { flex: 1, padding: 16, alignItems: 'center' },
  statLabel: { fontFamily: 'SpaceMono_400Regular', fontSize: 9, letterSpacing: 1, marginBottom: 6 },
  statValue: { fontFamily: 'Unbounded_900Black', fontSize: 20 },
  
  emptyTextMini: { fontFamily: 'Inter_400Regular', fontSize: 13, fontStyle: 'italic', marginBottom: 16 },
  logCard: { flexDirection: 'row', padding: 16, borderRadius: 16, marginBottom: 10, alignItems: 'center' },
  logTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 14 },
  logSub: { fontFamily: 'SpaceMono_400Regular', fontSize: 10, marginTop: 4 },
  logValue: { fontFamily: 'Unbounded_700Bold', fontSize: 16 },
  
  fieldLabel: { fontFamily: 'SpaceMono_700Bold', fontSize: 10, letterSpacing: 2, marginBottom: 8, marginLeft: 2 },
});
