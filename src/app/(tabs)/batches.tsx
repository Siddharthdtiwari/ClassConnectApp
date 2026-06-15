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

export default function BatchesScreen() {
  const { user } = useAuth();
  const [batches, setBatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Add/Edit Batch Form
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const { colors, isDark } = useTheme();

  const fetchBatches = async () => {
    try {
      const response = await client.get('/teacher/batches');
      setBatches(response.data.batches || []);
    } catch (err) {
      console.error('Failed to fetch batches', err);
    } finally { setLoading(false); setRefreshing(false); }
  };

  useEffect(() => { fetchBatches(); }, []);

  const handleSaveBatch = async () => {
    if (!name) {
      Alert.alert('Error', 'Batch Name is required.');
      return;
    }

    setSaving(true);
    try {
      if (isEditing) {
        await client.put(`/teacher/batches/${editingId}`, { name, description, isActive });
        Alert.alert('Success', 'Batch updated successfully!');
      } else {
        await client.post('/teacher/batches', { name, description });
        Alert.alert('Success', 'Batch created successfully!');
      }
      setShowModal(false);
      setName('');
      setDescription('');
      setIsActive(true);
      setRefreshing(true);
      fetchBatches();
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.error || 'Failed to save batch');
    } finally {
      setSaving(false);
    }
  };

  const openEditModal = (batch: any) => {
    setIsEditing(true);
    setEditingId(batch._id);
    setName(batch.name);
    setDescription(batch.description || '');
    setIsActive(batch.isActive !== false);
    setShowModal(true);
  };

  const openAddModal = () => {
    setIsEditing(false);
    setEditingId('');
    setName('');
    setDescription('');
    setIsActive(true);
    setShowModal(true);
  };

  if (loading) return <View style={[styles.center, { backgroundColor: 'transparent' }]}><ActivityIndicator size="large" color={colors.p} /></View>;

  return (
    <View style={{ flex: 1, backgroundColor: 'transparent' }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 100 }} refreshControl={<RefreshControl refreshing={refreshing} colors={[colors.p]} onRefresh={() => { setRefreshing(true); fetchBatches(); }} />}>
        
        {/* Header Banner */}
        <LinearGradient colors={[colors.p, colors.pm]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.banner}>
          <View style={{ flex: 1 }}>
            <Text style={styles.bannerTitle}>Manage Batches</Text>
            <Text style={styles.bannerSub}>Create and view all batches</Text>
          </View>
          <TouchableOpacity onPress={openAddModal} style={[styles.addBtn, { backgroundColor: colors.bgc }]}>
            <Ionicons name="add" size={24} color={colors.pm} />
          </TouchableOpacity>
        </LinearGradient>

        <Text style={[styles.sectionHeader, { color: colors.fg }]}>Active Batches ({batches.length})</Text>

        {batches.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={{ fontSize: 48 }}>🏫</Text>
            <Text style={[styles.emptyText, { color: colors.fdd }]}>No batches found.</Text>
          </View>
        ) : (
          batches.map((batch: any, index: number) => (
            <TouchableOpacity key={index} activeOpacity={0.7} onPress={() => openEditModal(batch)}>
              <GlassCard style={[styles.card, batch.isActive === false && { opacity: 0.6 }]}>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text style={[styles.batchName, { color: colors.fg }]}>{batch.name}</Text>
                    {batch.isActive === false && (
                      <View style={styles.inactivePill}><Text style={styles.inactiveText}>INACTIVE</Text></View>
                    )}
                  </View>
                  {batch.description ? <Text style={[styles.batchDesc, { color: colors.fdd }]}>{batch.description}</Text> : null}
                </View>
                <View style={[styles.studentCountBox, { backgroundColor: isDark ? colors.bg2 : '#EDE8F5' }]}>
                  <Ionicons name="people-outline" size={16} color={colors.p} />
                  <Text style={[styles.studentCount, { color: colors.p }]}>{batch.studentCount || 0}</Text>
                </View>
                <Ionicons name="pencil" size={18} color={colors.fdd} style={{ marginLeft: 12 }} />
              </GlassCard>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      {/* Add Batch Modal */}
      <Modal visible={showModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <GlassCard style={styles.modalContent} intensity={isDark ? 50 : 30}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.fg }]}>{isEditing ? 'Edit Batch' : 'Create New Batch'}</Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <Ionicons name="close" size={24} color={colors.fdd} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.fieldLabel, { color: colors.fdd }]}>BATCH NAME</Text>
            <GlassInput value={name} onChangeText={setName} placeholder="e.g. Class 10 Science" />

            <Text style={[styles.fieldLabel, { color: colors.fdd }]}>DESCRIPTION (Optional)</Text>
            <GlassInput value={description} onChangeText={setDescription} placeholder="Morning Batch..." />

            {isEditing && (
              <TouchableOpacity 
                style={[styles.statusToggle, !isActive && styles.statusToggleInactive]} 
                onPress={() => setIsActive(!isActive)}
              >
                <Ionicons name={isActive ? "checkmark-circle" : "close-circle"} size={20} color={isActive ? "#10b981" : "#dc2626"} />
                <Text style={[styles.statusText, !isActive && { color: '#dc2626' }]}>
                  {isActive ? 'Batch is Active' : 'Batch is Inactive'}
                </Text>
              </TouchableOpacity>
            )}

            <PremiumButton
              title={isEditing ? 'SAVE CHANGES' : 'CREATE BATCH'}
              onPress={handleSaveBatch}
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
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  banner: { margin: 16, borderRadius: 20, padding: 24, marginBottom: 16, flexDirection: 'row', alignItems: 'center' },
  bannerTitle: { fontFamily: 'Unbounded_900Black', fontSize: 22, color: '#fff' },
  bannerSub: { fontFamily: 'SpaceMono_400Regular', fontSize: 11, color: 'rgba(255,255,255,0.70)', marginTop: 8, letterSpacing: 1 },
  addBtn: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  sectionHeader: { fontFamily: 'Unbounded_700Bold', fontSize: 16, marginHorizontal: 16, marginBottom: 12, marginTop: 8 },
  emptyContainer: { justifyContent: 'center', alignItems: 'center', paddingTop: 80 },
  emptyText: { fontFamily: 'Inter_400Regular', fontSize: 16, marginTop: 12 },
  card: { flexDirection: 'row', marginHorizontal: 16, marginBottom: 10, padding: 16, borderRadius: 16, alignItems: 'center' },
  batchName: { fontFamily: 'Inter_600SemiBold', fontSize: 16 },
  batchDesc: { fontFamily: 'SpaceMono_400Regular', fontSize: 11, marginTop: 4 },
  inactivePill: { backgroundColor: 'rgba(220,38,38,0.1)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginLeft: 8 },
  inactiveText: { fontFamily: 'SpaceMono_700Bold', fontSize: 9, color: '#dc2626' },
  studentCountBox: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, gap: 6 },
  studentCount: { fontFamily: 'Unbounded_700Bold', fontSize: 14 },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.50)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  modalTitle: { fontFamily: 'Unbounded_700Bold', fontSize: 18 },
  fieldLabel: { fontFamily: 'SpaceMono_700Bold', fontSize: 10, letterSpacing: 2, marginBottom: 8, marginLeft: 2 },
  statusToggle: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(16,185,129,0.1)', padding: 12, borderRadius: 10, marginBottom: 16, borderWidth: 1, borderColor: 'rgba(16,185,129,0.3)' },
  statusToggleInactive: { backgroundColor: 'rgba(220,38,38,0.1)', borderColor: 'rgba(220,38,38,0.3)' },
  statusText: { fontFamily: 'Inter_600SemiBold', fontSize: 14, color: '#10b981', marginLeft: 8 },
});
