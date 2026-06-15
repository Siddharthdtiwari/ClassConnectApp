import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, RefreshControl, TouchableOpacity, Modal, TextInput, Alert, Image } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import client from '../../api/client';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import GlassCard from '../../components/GlassCard';
import GlassInput from '../../components/GlassInput';
import PremiumButton from '../../components/PremiumButton';
import { useTheme } from '../../context/ThemeContext';

export default function TeachersScreen() {
  const [teachers, setTeachers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Add Teacher Form
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState('');
  const [saving, setSaving] = useState(false);
  const { colors, isDark } = useTheme();

  const fetchTeachers = async () => {
    try {
      const res = await client.get('/teacher/teachers');
      setTeachers(res.data.teachers || []);
    } catch (err) {
      console.error('Failed to fetch teachers', err);
    } finally { setLoading(false); setRefreshing(false); }
  };

  useEffect(() => { fetchTeachers(); }, []);

  const handleSaveTeacher = async () => {
    if (!name || !email) {
      Alert.alert('Error', 'Name and Email are required.');
      return;
    }
    if (!isEditing && !password) {
      Alert.alert('Error', 'Password is required for new teachers.');
      return;
    }

    setSaving(true);
    try {
      if (isEditing) {
        await client.put(`/teacher/teachers/${editingId}`, { name, email, password });
        Alert.alert('Success', 'Teacher updated successfully!');
      } else {
        await client.post('/teacher/teachers', { name, email, password });
        Alert.alert('Success', 'Teacher added successfully!');
      }
      setShowModal(false);
      setName(''); setEmail(''); setPassword('');
      fetchTeachers();
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.error || 'Failed to save teacher');
    } finally {
      setSaving(false);
    }
  };

  const openAddModal = () => {
    setIsEditing(false);
    setEditingId('');
    setName('');
    setEmail('');
    setPassword('');
    setShowModal(true);
  };

  const openEditModal = (t: any) => {
    setIsEditing(true);
    setEditingId(t._id);
    setName(t.name || t.studentName || '');
    setEmail(t.email || '');
    setPassword('');
    setShowModal(true);
  };

  const handleDeleteTeacher = async (id: string) => {
    Alert.alert('Confirm Delete', 'Are you sure you want to remove this teacher?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try {
          await client.delete(`/teacher/teachers/${id}`);
          setRefreshing(true);
          fetchTeachers();
        } catch (err: any) {
          Alert.alert('Error', err.response?.data?.error || 'Failed to delete teacher');
        }
      }}
    ]);
  };

  return (
    <View style={{ flex: 1, backgroundColor: 'transparent' }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
        
        {/* Header Banner */}
        <LinearGradient colors={[colors.p, colors.pm]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.banner}>
          <View style={{ flex: 1 }}>
            <Text style={styles.bannerTitle}>Manage Teachers</Text>
            <Text style={styles.bannerSub}>Add or edit co-teachers</Text>
          </View>
          <TouchableOpacity onPress={openAddModal} style={styles.addBtn}>
            <Ionicons name="add" size={24} color={colors.pm} />
          </TouchableOpacity>
        </LinearGradient>

        {teachers.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={{ fontSize: 48 }}>👩‍🏫</Text>
            <Text style={[styles.emptyText, { color: colors.fdd }]}>Tap the + button to register a new teacher.</Text>
          </View>
        ) : (
          teachers.map((t: any, index: number) => (
            <GlassCard key={index} style={styles.teacherRow}>
              <View style={[styles.avatar, { backgroundColor: colors.bg2 }]}>
                <Text style={[styles.avatarText, { color: colors.pt }]}>{(t.name || t.studentName || 'T').charAt(0).toUpperCase()}</Text>
              </View>
              <View style={{ flex: 1, paddingLeft: 12 }}>
                <Text style={[styles.teacherName, { color: colors.fg }]}>{t.name || t.studentName}</Text>
                <Text style={[styles.teacherEmail, { color: colors.fdd }]}>{t.email}</Text>
              </View>
              <TouchableOpacity onPress={() => openEditModal(t)} style={{ padding: 10 }}>
                <Ionicons name="pencil" size={20} color={colors.fdd} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => handleDeleteTeacher(t._id)} style={{ padding: 10 }}>
                <Ionicons name="trash" size={20} color={colors.rt} />
              </TouchableOpacity>
            </GlassCard>
          ))
        )}
      </ScrollView>

      {/* Add Teacher Modal */}
      <Modal visible={showModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <GlassCard style={styles.modalContent} intensity={isDark ? 40 : 20}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.fg }]}>{isEditing ? 'Edit Teacher' : 'Register Teacher'}</Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <Ionicons name="close" size={24} color={colors.fdd} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.fieldLabel, { color: colors.fdd }]}>FULL NAME</Text>
            <GlassInput value={name} onChangeText={setName} placeholder="e.g. Jane Smith" />

            <Text style={[styles.fieldLabel, { color: colors.fdd }]}>EMAIL ADDRESS</Text>
            <GlassInput value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" placeholder="teacher@example.com" />

            <Text style={[styles.fieldLabel, { color: colors.fdd }]}>{isEditing ? 'NEW PASSWORD (OPTIONAL)' : 'PASSWORD'}</Text>
            <GlassInput value={password} onChangeText={setPassword} placeholder="Setup a login password" secureTextEntry />

            <PremiumButton
              title={isEditing ? 'SAVE CHANGES' : 'REGISTER TEACHER'}
              onPress={handleSaveTeacher}
              loading={saving}
              style={{ marginTop: 8 }}
            />
          </GlassCard>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: { margin: 16, borderRadius: 20, padding: 24, marginBottom: 16, flexDirection: 'row', alignItems: 'center' },
  bannerTitle: { fontFamily: 'Unbounded_900Black', fontSize: 22, color: '#fff' },
  bannerSub: { fontFamily: 'SpaceMono_400Regular', fontSize: 11, color: 'rgba(255,255,255,0.70)', marginTop: 8, letterSpacing: 1 },
  addBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center' },
  emptyContainer: { justifyContent: 'center', alignItems: 'center', paddingTop: 80, paddingHorizontal: 40 },
  emptyText: { fontFamily: 'Inter_400Regular', fontSize: 16, marginTop: 12, textAlign: 'center' },
  
  teacherRow: { flexDirection: 'row', marginHorizontal: 16, marginBottom: 10, padding: 16, borderRadius: 16, alignItems: 'center' },
  avatar: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontFamily: 'Unbounded_900Black', fontSize: 18 },
  teacherName: { fontFamily: 'Inter_600SemiBold', fontSize: 15 },
  teacherEmail: { fontFamily: 'SpaceMono_400Regular', fontSize: 11, marginTop: 4 },
  
  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.50)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  modalTitle: { fontFamily: 'Unbounded_700Bold', fontSize: 18 },
  fieldLabel: { fontFamily: 'SpaceMono_700Bold', fontSize: 10, letterSpacing: 2, marginBottom: 8, marginLeft: 2 },
});
