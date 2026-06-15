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

export default function ProfileScreen() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Edit State
  const [showEdit, setShowEdit] = useState(false);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editMobile, setEditMobile] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const { colors, isDark } = useTheme();

  const fetchProfile = async () => {
    try {
      if (user?.role === 'student') {
        // Use the dashboard endpoint which always works and contains student info
        const response = await client.get('/student/dashboard');
        const d = response.data;
        setProfile({
          name: d.student?.name,
          studentId: d.student?.studentId,
          email: user?.email || '',
          mobileNo: user?.mobileNo || '',
          batch: d.student?.batch,
          points: d.student?.points || 0,
          monthlyFee: user?.monthlyFee || 0,
          rank: d.student?.rank,
          profilePhoto: d.student?.profilePhoto,
          attendance: d.metrics?.attendancePercentage,
        });
      } else {
        // Teacher — use dashboard endpoint
        const response = await client.get('/teacher/dashboard');
        const d = response.data;
        setProfile({
          name: d.teacher?.name,
          teacherId: d.teacher?.teacherId,
          totalStudents: d.metrics?.totalStudents || 0,
          totalBatches: d.activeBatches?.length || 0,
        });
      }
    } catch (err) {
      console.error('Failed to fetch profile', err);
      // Fallback to auth context data
      setProfile({
        name: user?.name,
        studentId: user?.studentId,
        teacherId: user?.teacherId,
      });
    } finally { setLoading(false); setRefreshing(false); }
  };

  useEffect(() => { fetchProfile(); }, []);

  const openEditModal = () => {
    setEditName(profile?.name || user?.name || '');
    setEditEmail(profile?.email || user?.email || '');
    setEditMobile(profile?.mobileNo || user?.mobileNo || '');
    setEditPassword('');
    setShowEdit(true);
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      const endpoint = user?.role === 'student' ? '/student/profile' : '/teacher/profile';
      await client.put(endpoint, {
        name: editName,
        email: editEmail,
        mobileNo: editMobile,
        password: editPassword || undefined
      });
      Alert.alert('Success', 'Profile updated successfully!');
      setShowEdit(false);
      fetchProfile();
    } catch (err) {
      Alert.alert('Error', 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <View style={[styles.center, { backgroundColor: 'transparent' }]}><ActivityIndicator size="large" color={colors.p} /></View>;

  const isStudent = user?.role === 'student';
  const name = profile?.name || user?.name;

  const studentFields = [
    { icon: 'id-card-outline' as const, label: 'Student ID', value: profile?.studentId || user?.studentId },
    { icon: 'mail-outline' as const, label: 'Email', value: profile?.email || 'Not registered' },
    { icon: 'call-outline' as const, label: 'Mobile', value: profile?.mobileNo || 'Not registered' },
    { icon: 'layers-outline' as const, label: 'Batch', value: profile?.batch?.name || 'Unassigned' },
    { icon: 'cash-outline' as const, label: 'Monthly Fee', value: profile?.monthlyFee ? `₹${Number(profile.monthlyFee).toLocaleString()}` : '—' },
    { icon: 'star-outline' as const, label: 'Points', value: `${Math.trunc(profile?.points || 0)} ⭐` },
    { icon: 'trophy-outline' as const, label: 'Rank', value: profile?.rank ? `#${profile.rank}` : '—' },
    { icon: 'calendar-outline' as const, label: 'Attendance', value: profile?.attendance ? `${profile.attendance}%` : '—' },
  ];

  const teacherFields = [
    { icon: 'id-card-outline' as const, label: 'Teacher ID', value: profile?.teacherId || user?.teacherId },
    { icon: 'people-outline' as const, label: 'Total Students', value: `${profile?.totalStudents || 0}` },
    { icon: 'layers-outline' as const, label: 'Active Batches', value: `${profile?.totalBatches || 0}` },
  ];

  const fields = isStudent ? studentFields : teacherFields;

  return (
    <View style={{ flex: 1, backgroundColor: 'transparent' }}>
    <ScrollView contentContainerStyle={{ paddingBottom: 100 }} refreshControl={<RefreshControl refreshing={refreshing} colors={[colors.p]} onRefresh={() => { setRefreshing(true); fetchProfile(); }} />}>
      {/* Profile Header */}
      <GlassCard style={styles.headerCard}>
        <TouchableOpacity style={[styles.editBtn, { backgroundColor: isDark ? colors.bg2 : '#EDE8F5' }]} onPress={openEditModal}>
          <Ionicons name="pencil" size={18} color={colors.p} />
        </TouchableOpacity>
        
        <View style={[styles.avatar, { backgroundColor: isDark ? colors.bg2 : '#EDE8F5', borderColor: colors.bgc }]}>
          <Text style={[styles.avatarText, { color: colors.p }]}>{name?.charAt(0).toUpperCase()}</Text>
        </View>
        <Text style={[styles.name, { color: colors.fg }]}>{name}</Text>
        <View style={[styles.roleBadge, { backgroundColor: isDark ? colors.bg2 : '#EDE8F5', borderColor: isDark ? colors.b : 'rgba(93,58,155,0.20)' }]}>
          <Text style={[styles.roleText, { color: colors.p }]}>
            {isStudent ? `Batch: ${profile?.batch?.name || 'Unassigned'}` : '🎓 Teacher'}
          </Text>
        </View>
        <Text style={[styles.idText, { color: colors.fdd }]}>ID: {isStudent ? profile?.studentId || user?.studentId : profile?.teacherId || user?.teacherId}</Text>
      </GlassCard>

      {/* Info Rows */}
      <GlassCard style={[styles.glassCard, { margin: 16 }]}>
        {fields.map((field, index) => (
          <View key={index} style={[styles.infoRow, index < fields.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.b }]}>
            <View style={styles.infoLeft}>
              <Ionicons name={field.icon} size={20} color={colors.fdd} />
              <Text style={[styles.infoLabel, { color: colors.fdd }]}>{field.label}</Text>
            </View>
            <Text style={[styles.infoValue, { color: colors.p }]}>{field.value}</Text>
          </View>
        ))}
      </GlassCard>

      {/* Edit Profile Modal */}
      <Modal visible={showEdit} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <GlassCard style={styles.modalContent} intensity={isDark ? 50 : 30}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.fg }]}>Edit Profile</Text>
              <TouchableOpacity onPress={() => setShowEdit(false)}>
                <Ionicons name="close" size={24} color={colors.fdd} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.fieldLabel, { color: colors.fdd }]}>FULL NAME</Text>
            <GlassInput value={editName} onChangeText={setEditName} placeholder="Your name" />

            <Text style={[styles.fieldLabel, { color: colors.fdd }]}>EMAIL ADDRESS</Text>
            <GlassInput value={editEmail} onChangeText={setEditEmail} keyboardType="email-address" autoCapitalize="none" placeholder="Email" />

            <Text style={[styles.fieldLabel, { color: colors.fdd }]}>MOBILE NUMBER</Text>
            <GlassInput value={editMobile} onChangeText={setEditMobile} keyboardType="phone-pad" placeholder="Mobile Number" />

            <Text style={[styles.fieldLabel, { color: colors.fdd }]}>NEW PASSWORD (Optional)</Text>
            <GlassInput value={editPassword} onChangeText={setEditPassword} placeholder="Leave blank to keep current" secureTextEntry />

            <PremiumButton
              title="SAVE CHANGES"
              onPress={handleSaveProfile}
              loading={saving}
              style={{ marginTop: 8 }}
            />
          </GlassCard>
        </View>
      </Modal>
    </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  headerCard: {
    margin: 16,
    padding: 28,
    alignItems: 'center',
    overflow: 'hidden',
    marginTop: 56,
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 3,
  },
  avatarText: { fontFamily: 'Unbounded_900Black', fontSize: 32 },
  name: { fontFamily: 'Unbounded_900Black', fontSize: 20, textAlign: 'center' },
  roleBadge: {
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 20,
    marginTop: 10,
  },
  roleText: { fontFamily: 'SpaceMono_700Bold', fontSize: 10, letterSpacing: 1 },
  idText: { fontFamily: 'SpaceMono_400Regular', fontSize: 12, marginTop: 10 },
  glassCard: { padding: 6 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 16 },
  infoLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  infoLabel: { fontFamily: 'SpaceMono_400Regular', fontSize: 11, textTransform: 'uppercase', letterSpacing: 1 },
  infoValue: { fontFamily: 'Unbounded_700Bold', fontSize: 13, maxWidth: '50%', textAlign: 'right' },
  
  editBtn: { position: 'absolute', top: 16, right: 16, width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  
  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.50)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  modalTitle: { fontFamily: 'Unbounded_700Bold', fontSize: 18 },
  fieldLabel: { fontFamily: 'SpaceMono_700Bold', fontSize: 10, letterSpacing: 2, marginBottom: 8, marginLeft: 2 },
  modalSaveBtn: { borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 8 },
  modalSaveBtnText: { fontFamily: 'Unbounded_700Bold', fontSize: 13, color: '#fff', letterSpacing: 1 },
});
