import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, RefreshControl, TouchableOpacity, Linking, Modal, TextInput, Alert } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import client from '../../api/client';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as DocumentPicker from 'expo-document-picker';
import GlassCard from '../../components/GlassCard';
import PremiumButton from '../../components/PremiumButton';
import GlassInput from '../../components/GlassInput';
import { useTheme } from '../../context/ThemeContext';
import { openSafeUrl } from '../../utils/safeLinking';

export default function ContentScreen() {
  const { user } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Teacher State
  const [showModal, setShowModal] = useState(false);
  const [batches, setBatches] = useState<any[]>([]);
  const [selectedBatch, setSelectedBatch] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Form State
  const [subject, setSubject] = useState('');
  const [materialType, setMaterialType] = useState('Note');
  const [description, setDescription] = useState('');
  const [link, setLink] = useState('');
  const [materialFile, setMaterialFile] = useState<any>(null);
  const { colors, isDark } = useTheme();

  const fetchContent = async () => {
    try {
      const endpoint = user?.role === 'student' ? '/student/content' : '/teacher/materials';
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
      console.error('Failed to fetch content', err);
    } finally { setLoading(false); setRefreshing(false); }
  };

  useEffect(() => { fetchContent(); }, []);

  const handleAddMaterial = async () => {
    if (!subject || (!link && !materialFile)) {
      Alert.alert('Error', 'Subject and either a Link or a File are required.');
      return;
    }

    setSaving(true);
    try {
      let formData = new FormData();
      formData.append('batchId', selectedBatch || '');
      formData.append('subject', subject);
      formData.append('materialType', materialType);
      formData.append('description', description);
      if (link) formData.append('link', link);
      
      if (materialFile) {
        formData.append('file', {
          uri: materialFile.uri,
          name: materialFile.name,
          type: materialFile.mimeType || 'application/octet-stream',
        } as any);
      }

      await client.post('/teacher/materials', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      Alert.alert('Success', 'Study material shared successfully!');
      setShowModal(false);
      
      // Reset form
      setSubject('');
      setDescription('');
      setLink('');
      setMaterialFile(null);
      
      setRefreshing(true);
      fetchContent();
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.error || 'Failed to add study material');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteMaterial = async (id: string) => {
    Alert.alert('Confirm Delete', 'Are you sure you want to delete this material?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try {
          await client.delete(`/teacher/materials/${id}`);
          setRefreshing(true);
          fetchContent();
        } catch (err) {
          Alert.alert('Error', 'Failed to delete material');
        }
      }}
    ]);
  };

  if (loading) return <View style={[styles.center, { backgroundColor: 'transparent' }]}><ActivityIndicator size="large" color={colors.p} /></View>;

  const allMaterials = data?.materials || [];
  const materials = user?.role === 'teacher' && selectedBatch
    ? allMaterials.filter((m: any) => typeof m.batch === 'object' ? m.batch._id === selectedBatch : m.batch === selectedBatch)
    : allMaterials;

  const getFileIcon = (filename: string): string => {
    if (!filename) return 'link-outline';
    const ext = filename.split('.').pop()?.toLowerCase();
    if (ext === 'pdf') return 'document-text-outline';
    if (['doc', 'docx'].includes(ext || '')) return 'document-outline';
    if (['ppt', 'pptx'].includes(ext || '')) return 'easel-outline';
    if (['jpg', 'jpeg', 'png', 'gif'].includes(ext || '')) return 'image-outline';
    if (['mp4', 'avi', 'mov'].includes(ext || '')) return 'videocam-outline';
    return 'link-outline';
  };

  const getFileColor = (filename: string): string => {
    if (!filename) return '#5d3a9b';
    const ext = filename.split('.').pop()?.toLowerCase();
    if (ext === 'pdf') return '#dc2626';
    if (['doc', 'docx'].includes(ext || '')) return '#2563eb';
    if (['ppt', 'pptx'].includes(ext || '')) return '#ea580c';
    if (['jpg', 'jpeg', 'png', 'gif'].includes(ext || '')) return '#059669';
    return '#5d3a9b';
  };

  return (
    <View style={{ flex: 1, backgroundColor: 'transparent' }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 100 }} refreshControl={<RefreshControl refreshing={refreshing} colors={[colors.p]} onRefresh={() => { setRefreshing(true); fetchContent(); }} />}>
        
        {/* Teacher Banner */}
        {user?.role === 'teacher' ? (
          <LinearGradient colors={[colors.p, colors.pm]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.teacherBanner}>
            <View style={{ flex: 1 }}>
              <Text style={styles.teacherBannerTitle}>Study Materials</Text>
              <Text style={styles.teacherBannerSub}>Share resources & links</Text>
            </View>
            <TouchableOpacity onPress={() => setShowModal(true)} style={[styles.addBtn, { backgroundColor: colors.bgc }]}>
              <Ionicons name="add" size={24} color={colors.pm} />
            </TouchableOpacity>
          </LinearGradient>
        ) : (
          <GlassCard style={[styles.glassCard, { margin: 16, marginTop: 16 }]}>
            <Text style={[styles.sectionTitle, { color: colors.fg }]}>📚 Study Materials</Text>
            <Text style={[styles.metaText, { color: colors.fdd }]}>{materials.length} resources available</Text>
          </GlassCard>
        )}

        {/* Batch Selector for Teacher */}
        {user?.role === 'teacher' && (
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
        )}

        {materials.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={{ fontSize: 48 }}>📚</Text>
            <Text style={[styles.emptyText, { color: colors.fdd }]}>No study materials available yet.</Text>
          </View>
        ) : (
          materials.map((material: any, index: number) => (
            <TouchableOpacity key={index} activeOpacity={0.7}
              style={styles.materialCard}
              onPress={() => {
                if (material.fileUrl || material.filePath) {
                  openSafeUrl(material.fileUrl || material.filePath);
                } else if (material.link) {
                  openSafeUrl(material.link);
                }
              }}
            >
              <GlassCard style={styles.materialCard}>
                <View style={[styles.fileIconBox, { backgroundColor: `${getFileColor(material.fileName || material.filePath)}15` }]}>
                  <Ionicons name={getFileIcon(material.fileName || material.filePath) as any} size={24} color={getFileColor(material.fileName || material.filePath)} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.materialTitle, { color: colors.fg }]} numberOfLines={2}>{material.subject || material.title || 'Untitled'}</Text>
                  <Text style={[styles.materialMeta, { color: colors.fdd }]}>{material.materialType || 'General'} • {material.description || 'No description'}</Text>
                  <Text style={[styles.materialDate, { color: colors.fdd }]}>{new Date(material.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</Text>
                </View>
                {user?.role === 'teacher' ? (
                  <TouchableOpacity onPress={() => handleDeleteMaterial(material._id)} style={{ padding: 10 }}>
                    <Ionicons name="trash" size={20} color={colors.rt} />
                  </TouchableOpacity>
                ) : (
                  <Ionicons name="open-outline" size={20} color={colors.fdd} />
                )}
              </GlassCard>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      {user?.role === 'teacher' && (
        <Modal visible={showModal} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <GlassCard style={styles.modalContent} intensity={isDark ? 50 : 30}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: colors.fg }]}>Share Resource</Text>
                <TouchableOpacity onPress={() => setShowModal(false)}>
                  <Ionicons name="close" size={24} color={colors.fdd} />
                </TouchableOpacity>
              </View>

              <Text style={[styles.fieldLabel, { color: colors.fdd }]}>SUBJECT / TOPIC</Text>
              <GlassInput value={subject} onChangeText={setSubject} placeholder="e.g. Physics Notes Ch-3" />

              <Text style={[styles.fieldLabel, { color: colors.fdd }]}>MATERIAL TYPE</Text>
              <View style={styles.typeRow}>
                {['Note', 'Assignment', 'Video', 'Other'].map(t => (
                  <TouchableOpacity key={t} onPress={() => setMaterialType(t)}
                    style={[styles.typePill, { backgroundColor: colors.bgc, borderColor: colors.b }, materialType === t && { backgroundColor: colors.pm, borderColor: colors.pm }]}>
                    <Text style={[styles.typePillText, { color: colors.fdd }, materialType === t && { color: '#fff' }]}>{t}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={[styles.fieldLabel, { color: colors.fdd }]}>RESOURCE LINK OR FILE UPLOAD</Text>
              
              <TouchableOpacity onPress={async () => {
                try {
                  const res = await DocumentPicker.getDocumentAsync({});
                  if (!res.canceled) setMaterialFile(res.assets[0]);
                } catch (err) {}
              }} style={[styles.uploadBtn, { backgroundColor: isDark ? 'rgba(124,58,237,0.1)' : 'rgba(124,58,237,0.05)', borderColor: isDark ? 'rgba(124,58,237,0.2)' : 'rgba(124,58,237,0.15)' }]}>
                <Ionicons name="document-text" size={20} color={colors.p} />
                <Text style={[styles.uploadBtnText, { color: colors.p }]}>{materialFile ? materialFile.name : 'Upload File (PDF/Doc/Image)'}</Text>
              </TouchableOpacity>
              
              <Text style={[styles.fieldLabel, { alignSelf: 'center', marginVertical: 8, color: colors.fdd }]}>OR PASTE LINK</Text>
              <GlassInput value={link} onChangeText={setLink} placeholder="https://..." autoCapitalize="none" />

              <Text style={[styles.fieldLabel, { color: colors.fdd }]}>DESCRIPTION (Optional)</Text>
              <GlassInput value={description} onChangeText={setDescription} placeholder="Brief details about this resource" />

              <PremiumButton
                title="SHARE WITH CLASS"
                onPress={handleAddMaterial}
                loading={saving}
                style={{ marginTop: 16 }}
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
  glassCard: { padding: 20 },
  sectionTitle: { fontFamily: 'Unbounded_700Bold', fontSize: 16 },
  metaText: { fontFamily: 'SpaceMono_400Regular', fontSize: 12, marginTop: 4 },
  emptyContainer: { justifyContent: 'center', alignItems: 'center', paddingTop: 80 },
  emptyText: { fontFamily: 'Inter_400Regular', fontSize: 16, marginTop: 12 },
  materialCard: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 10,
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  fileIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  materialTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 14 },
  materialMeta: { fontFamily: 'SpaceMono_400Regular', fontSize: 10, marginTop: 4 },
  materialDate: { fontFamily: 'SpaceMono_400Regular', fontSize: 10, marginTop: 2 },

  // Teacher specific
  teacherBanner: { margin: 16, borderRadius: 20, padding: 24, marginBottom: 16, flexDirection: 'row', alignItems: 'center' },
  teacherBannerTitle: { fontFamily: 'Unbounded_900Black', fontSize: 22, color: '#fff' },
  teacherBannerSub: { fontFamily: 'SpaceMono_400Regular', fontSize: 11, color: 'rgba(255,255,255,0.70)', marginTop: 8, letterSpacing: 1 },
  addBtn: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  batchPill: { borderWidth: 1, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, marginHorizontal: 4 },
  batchPillText: { fontFamily: 'SpaceMono_400Regular', fontSize: 12 },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.50)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  modalTitle: { fontFamily: 'Unbounded_700Bold', fontSize: 18 },
  fieldLabel: { fontFamily: 'SpaceMono_700Bold', fontSize: 10, letterSpacing: 2, marginBottom: 8, marginLeft: 2 },
  typeRow: { flexDirection: 'row', gap: 8, marginBottom: 20, flexWrap: 'wrap' },
  typePill: { borderWidth: 1, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 14, alignItems: 'center' },
  typePillText: { fontFamily: 'SpaceMono_400Regular', fontSize: 11 },
  uploadBtn: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 10, marginBottom: 8, borderWidth: 1 },
  uploadBtnText: { fontFamily: 'Inter_600SemiBold', fontSize: 14, marginLeft: 8 },
});
