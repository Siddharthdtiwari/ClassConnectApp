import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, RefreshControl, TouchableOpacity, Modal, TextInput, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import client from '../../api/client';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as DocumentPicker from 'expo-document-picker';
import { WebView } from 'react-native-webview';
import GlassCard from '../../components/GlassCard';
import PremiumButton from '../../components/PremiumButton';
import GlassInput from '../../components/GlassInput';
import { useTheme } from '../../context/ThemeContext';
import { openSafeUrl } from '../../utils/safeLinking';

export default function TestsScreen() {
  const { user } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Add/Edit Test Form
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState('');
  const [subject, setSubject] = useState('');
  const [testDate, setTestDate] = useState('');
  const [totalMarks, setTotalMarks] = useState('');
  const [testFile, setTestFile] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  // AI Paper Generation
  const [showAiModal, setShowAiModal] = useState(false);
  const [aiTopic, setAiTopic] = useState('');
  const [aiDifficulty, setAiDifficulty] = useState('Medium');
  const [aiContext, setAiContext] = useState('');
  const [aiMarks, setAiMarks] = useState('20');
  const [generating, setGenerating] = useState(false);
  const [showPaperViewer, setShowPaperViewer] = useState(false);
  const [generatedPaper, setGeneratedPaper] = useState('');

  // Teacher State
  const [showScoreModal, setShowScoreModal] = useState(false);
  const [batches, setBatches] = useState<any[]>([]);
  const [selectedBatch, setSelectedBatch] = useState<string | null>(null);
  const [selectedTest, setSelectedTest] = useState<any>(null);
  const [scoreData, setScoreData] = useState<{ students: any[], scores: any[], test: any } | null>(null);
  const [studentScores, setStudentScores] = useState<Record<string, string>>({});
  const [activeSubject, setActiveSubject] = useState<string>('overall');
  const { colors, isDark } = useTheme();

  const fetchData = async () => {
    try {
      const endpoint = user?.role === 'student' ? '/student/scores' : '/teacher/tests';
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
      console.error('Failed to fetch test data', err);
    } finally { setLoading(false); setRefreshing(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const handleSaveTest = async () => {
    if (!subject || !testDate || !totalMarks) {
      Alert.alert('Error', 'Subject, Date, and Total Marks are required.');
      return;
    }

    setSaving(true);
    try {
      let formData = new FormData();
      formData.append('batchId', selectedBatch || '');
      formData.append('subject', subject);
      formData.append('testDate', testDate);
      formData.append('totalMarks', totalMarks);
      if (testFile) {
        formData.append('questionPaperFile', {
          uri: testFile.uri,
          name: testFile.name,
          type: testFile.mimeType || 'application/pdf',
        } as any);
      }

      if (isEditing) {
        await client.put(`/teacher/tests/${editingId}`, {
          subject, testDate, totalMarks: Number(totalMarks)
        });
        Alert.alert('Success', 'Test updated successfully!');
      } else {
        await client.post('/teacher/tests', formData, { 
          headers: { 'Content-Type': 'multipart/form-data' } 
        });
        Alert.alert('Success', 'Test created successfully!');
      }
      setShowModal(false);
      setSubject(''); setTestDate(''); setTotalMarks(''); setTestFile(null);
      setRefreshing(true);
      fetchData();
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.error || 'Failed to save test');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTest = async (testId: string) => {
    Alert.alert('Confirm Delete', 'Are you sure you want to delete this test?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try {
          await client.delete(`/teacher/tests/${testId}`);
          setRefreshing(true);
          fetchData();
        } catch (err) {
          Alert.alert('Error', 'Failed to delete test');
        }
      }}
    ]);
  };

  const handleAiGenerate = async () => {
    if (!subject || !aiContext.trim()) {
      Alert.alert('Error', 'Subject and textbook context are required — paste the chapter text or questions the paper should be based on.');
      return;
    }
    setGenerating(true);
    try {
      const batchName = batches.find(b => b._id === selectedBatch)?.name || '';
      const res = await client.post('/teacher/ai/generate_paper', {
        contextText: aiContext,
        subject,
        topic: aiTopic,
        totalMarks: aiMarks,
        batchName,
        testDate: new Date().toLocaleDateString('en-IN'),
        instructions: `Difficulty level: ${aiDifficulty}`,
      });
      setGeneratedPaper(res.data.html || '');
      setShowAiModal(false);
      setShowPaperViewer(true);
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to generate paper');
    } finally {
      setGenerating(false);
    }
  };

  const openEditModal = (test: any) => {
    setIsEditing(true);
    setEditingId(test._id);
    setSubject(test.subject);
    setTestDate(new Date(test.testDate).toISOString().split('T')[0]);
    setTotalMarks(test.totalMarks.toString());
    setShowModal(true);
  };

  const openAddModal = () => {
    setIsEditing(false);
    setEditingId('');
    setSubject('');
    setTestDate('');
    setTotalMarks('');
    setTestFile(null);
    setShowModal(true);
  };

  const openScoreModal = async (test: any) => {
    setSelectedTest(test);
    setShowScoreModal(true);
    setScoreData(null);
    setStudentScores({});
    
    try {
      const batchId = typeof test.batch === 'object' ? test.batch._id : test.batch;
      const res = await client.get(`/teacher/scores/${batchId}/${test._id}`);
      setScoreData(res.data);
      
      const initialScores: Record<string, string> = {};
      res.data.scores.forEach((s: any) => {
        initialScores[s.studentId] = String(s.marksObtained);
      });
      setStudentScores(initialScores);
    } catch (err) {
      console.error('Failed to load scores', err);
      Alert.alert('Error', 'Failed to load student list');
      setShowScoreModal(false);
    }
  };

  const saveScores = async () => {
    if (!selectedTest) return;
    
    const scoresArray = Object.entries(studentScores)
      .filter(([_, marks]) => marks !== '')
      .map(([studentId, marks]) => ({ studentId, marksObtained: Number(marks) }));

    setSaving(true);
    try {
      await client.post(`/teacher/scores/${selectedTest._id}`, { scores: scoresArray });
      Alert.alert('Success', 'Scores updated successfully!');
      setShowScoreModal(false);
      setRefreshing(true);
      fetchData();
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.error || 'Failed to save scores');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <View style={[styles.center, { backgroundColor: 'transparent' }]}><ActivityIndicator size="large" color={colors.p} /></View>;

  if (user?.role === 'student') {
    const scoresBySubject = data?.scoresBySubject || {};
    const subjects = Object.keys(scoresBySubject);

    // Get tests for active subject
    let activeTests: any[] = [];
    if (activeSubject === 'overall') {
      subjects.forEach((sub) => {
        (scoresBySubject[sub] || []).forEach((t: any) => {
          activeTests.push({ ...t, subject: sub });
        });
      });
    } else {
      activeTests = (scoresBySubject[activeSubject] || []).map((t: any) => ({ ...t, subject: activeSubject }));
    }

    // Summary stats
    const totalTests = activeTests.length;
    const avgPercent = totalTests > 0
      ? activeTests.reduce((sum: number, t: any) => sum + ((Number(t.score) / (Number(t.total) || 100)) * 100), 0) / totalTests
      : 0;
    const subjectsCount = activeSubject === 'overall' ? subjects.length : 1;

    const getGrade = (pct: number) => {
      if (pct >= 90) return { label: 'A+', color: '#10b981' };
      if (pct >= 80) return { label: 'A', color: '#10b981' };
      if (pct >= 70) return { label: 'B+', color: '#3b82f6' };
      if (pct >= 60) return { label: 'B', color: '#3b82f6' };
      if (pct >= 50) return { label: 'C', color: '#f59e0b' };
      return { label: 'D', color: '#ef4444' };
    };

    const getBarColor = (pct: number) => pct >= 80 ? '#10b981' : pct >= 50 ? '#f59e0b' : '#ef4444';

    return (
      <View style={{ flex: 1, backgroundColor: 'transparent' }}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 100, paddingTop: 56 }} refreshControl={<RefreshControl refreshing={refreshing} colors={[colors.p]} onRefresh={() => { setRefreshing(true); fetchData(); }} />}>

        {/* Subject Filter Pills */}
        <View style={{ paddingHorizontal: 16, marginBottom: 16 }}>
          <Text style={[styles.filterLabel, { color: colors.fdd, borderBottomColor: colors.bd }]}>FILTER BY SUBJECT</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 10 }}>
            <TouchableOpacity
              onPress={() => setActiveSubject('overall')}
              style={[styles.filterPill, { borderColor: colors.b, backgroundColor: colors.bgc },
                activeSubject === 'overall' && { backgroundColor: colors.p, borderColor: colors.p }]}
            >
              <Text style={[styles.filterPillText, { color: colors.fdd },
                activeSubject === 'overall' && { color: '#ffffff' }]}>OVERALL</Text>
            </TouchableOpacity>
            {subjects.map((sub) => (
              <TouchableOpacity
                key={sub}
                onPress={() => setActiveSubject(sub)}
                style={[styles.filterPill, { borderColor: colors.b, backgroundColor: colors.bgc },
                  activeSubject === sub && { backgroundColor: colors.p, borderColor: colors.p }]}
              >
                <Text style={[styles.filterPillText, { color: colors.fdd },
                  activeSubject === sub && { color: '#ffffff' }]}>{sub.toUpperCase()}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Summary Stats */}
        <View style={{ flexDirection: 'row', paddingHorizontal: 16, marginBottom: 16, gap: 10 }}>
          <GlassCard style={[styles.summaryBox, { borderColor: 'rgba(124,58,237,0.20)' }]}>
            <Text style={[styles.summaryLabel, { color: colors.pt }]}>TESTS TAKEN</Text>
            <Text style={[styles.summaryValue, { color: colors.fg }]}>{totalTests}</Text>
          </GlassCard>
          <GlassCard style={[styles.summaryBox, { borderColor: 'rgba(16,185,129,0.20)' }]}>
            <Text style={[styles.summaryLabel, { color: '#10b981' }]}>AVG SCORE</Text>
            <Text style={[styles.summaryValue, { color: getBarColor(avgPercent) }]}>{avgPercent.toFixed(1)}%</Text>
          </GlassCard>
          <GlassCard style={[styles.summaryBox, { borderColor: 'rgba(59,130,246,0.20)' }]}>
            <Text style={[styles.summaryLabel, { color: '#3b82f6' }]}>SUBJECTS</Text>
            <Text style={[styles.summaryValue, { color: colors.fg }]}>{subjectsCount}</Text>
          </GlassCard>
        </View>

        {/* Test Cards */}
        {activeTests.length === 0 ? (
          <GlassCard style={{ margin: 16, padding: 40, alignItems: 'center' }}>
            <Ionicons name="document-text-outline" size={48} color={colors.fdd} style={{ opacity: 0.4 }} />
            <Text style={[styles.testName, { color: colors.fg, marginTop: 12 }]}>No Scores Yet</Text>
            <Text style={[styles.testTopic, { color: colors.fdd, textAlign: 'center', marginTop: 4 }]}>
              No test scores available for {activeSubject === 'overall' ? 'any subject' : activeSubject} yet.
            </Text>
          </GlassCard>
        ) : (
          <View style={{ paddingHorizontal: 16 }}>
            <Text style={[styles.sectionHeader, { color: colors.pt, borderBottomColor: colors.bd }]}>
              {activeSubject === 'overall' ? 'All Test Results' : `${activeSubject} — Test Results`}
            </Text>
            {activeTests.map((score: any, idx: number) => {
              const total = Number(score.total) || 100;
              const sc = Number(score.score) || 0;
              const pct = (sc / total) * 100;
              const grade = getGrade(pct);
              const barColor = getBarColor(pct);

              return (
                <GlassCard key={idx} style={styles.scoreCard}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    {/* Grade Badge */}
                    <View style={[styles.gradeBadge, { backgroundColor: grade.color + '18', borderColor: grade.color + '40' }]}>
                      <Text style={[styles.gradeText, { color: grade.color }]}>{grade.label}</Text>
                    </View>
                    {/* Test Info */}
                    <View style={{ flex: 1, marginLeft: 12, minWidth: 0 }}>
                      <Text style={[styles.testName, { color: colors.fg }]} numberOfLines={1}>{score.testName}</Text>
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6, marginTop: 4 }}>
                        <View style={[styles.subjectTag, { backgroundColor: isDark ? 'rgba(124,58,237,0.15)' : 'rgba(124,58,237,0.08)', borderColor: isDark ? 'rgba(124,58,237,0.30)' : 'rgba(124,58,237,0.15)' }]}>
                          <Text style={[styles.subjectTagText, { color: colors.pt }]}>{score.subject}</Text>
                        </View>
                        {score.topic && score.topic !== 'No topic' && (
                          <Text style={[styles.topicText, { color: colors.fd }]}>TOPIC: <Text style={{ fontFamily: 'Inter_600SemiBold', color: colors.fg }}>{score.topic}</Text></Text>
                        )}
                      </View>
                    </View>
                    {/* Score */}
                    <View style={{ alignItems: 'flex-end', marginLeft: 8 }}>
                      <Text style={[styles.scoreValue, { color: colors.fg }]}>{sc}<Text style={[styles.scoreTotal, { color: colors.fdd }]}>/ {total}</Text></Text>
                      <Text style={[styles.scorePct, { color: barColor }]}>{pct.toFixed(1)}%</Text>
                    </View>
                  </View>
                  {/* Progress Bar */}
                  <View style={[styles.progressTrack, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)', marginTop: 12 }]}>
                    <View style={[styles.progressBar, { width: `${Math.min(pct, 100)}%`, backgroundColor: barColor }]} />
                  </View>
                </GlassCard>
              );
            })}
          </View>
        )}
      </ScrollView>
      </View>
    );
  }

  const allTests = data?.tests || [];
  const tests = selectedBatch
    ? allTests.filter((t: any) => (typeof t.batch === 'object' ? t.batch._id === selectedBatch : t.batch === selectedBatch))
    : allTests;

  return (
    <View style={{ flex: 1, backgroundColor: 'transparent' }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 100 }} refreshControl={<RefreshControl refreshing={refreshing} colors={[colors.p]} onRefresh={() => { setRefreshing(true); fetchData(); }} />}>
        <LinearGradient colors={[colors.p, colors.pm]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.teacherBanner}>
          <View style={{ flex: 1 }}>
            <Text style={styles.teacherBannerTitle}>Test Management</Text>
            <Text style={styles.teacherBannerSub}>Create tests & enter scores</Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity onPress={() => setShowAiModal(true)} style={[styles.addBtn, { backgroundColor: colors.bgc }]}>
              <Ionicons name="hardware-chip-outline" size={20} color={colors.pm} />
            </TouchableOpacity>
            <TouchableOpacity onPress={openAddModal} style={[styles.addBtn, { backgroundColor: colors.bgc }]}>
              <Ionicons name="add" size={24} color={colors.pm} />
            </TouchableOpacity>
          </View>
        </LinearGradient>

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

        {tests.length === 0 ? (
          <Text style={[styles.emptyText, { color: colors.fdd }]}>No tests found for this batch.</Text>
        ) : (
          tests.map((test: any, index: number) => (
            <GlassCard key={index} style={[styles.scoreCard, { marginHorizontal: 16 }]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.testName, { color: colors.fg }]}>{test.subject}</Text>
                <Text style={[styles.testTopic, { color: colors.fdd }]}>{new Date(test.testDate).toLocaleDateString()}</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View style={[styles.marksBadge, { backgroundColor: isDark ? 'rgba(124,58,237,0.1)' : '#EDE8F5' }]}>
                  <Text style={[styles.marksText, { color: colors.p }]}>{test.totalMarks}m</Text>
                </View>
                <TouchableOpacity onPress={() => openScoreModal(test)} style={[styles.enterScoreBtn, { backgroundColor: colors.pm }]}>
                  <Text style={styles.enterScoreBtnText}>SCORES</Text>
                </TouchableOpacity>
                {test.fileUrl && (
                  <TouchableOpacity onPress={() => openSafeUrl(test.fileUrl)}>
                    <Ionicons name="document-text" size={20} color={colors.p} />
                  </TouchableOpacity>
                )}
                <TouchableOpacity onPress={() => openEditModal(test)}>
                  <Ionicons name="pencil" size={20} color={colors.fdd} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleDeleteTest(test._id)}>
                  <Ionicons name="trash" size={20} color={colors.rt} />
                </TouchableOpacity>
              </View>
            </GlassCard>
          ))
        )}
      </ScrollView>

      <Modal visible={showModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'flex-end' }} keyboardShouldPersistTaps="handled">
            <GlassCard style={styles.modalContent} intensity={isDark ? 50 : 30}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: colors.fg }]}>{isEditing ? 'Edit Test' : 'Create New Test'}</Text>
                <TouchableOpacity onPress={() => setShowModal(false)}>
                  <Ionicons name="close" size={24} color={colors.fdd} />
                </TouchableOpacity>
              </View>

              <Text style={[styles.fieldLabel, { color: colors.fdd }]}>SUBJECT</Text>
              <GlassInput value={subject} onChangeText={setSubject} placeholder="e.g. Mathematics" />

              <Text style={[styles.fieldLabel, { color: colors.fdd }]}>TEST DATE (YYYY-MM-DD)</Text>
              <GlassInput value={testDate} onChangeText={setTestDate} placeholder="e.g. 2026-10-15" />

              <Text style={[styles.fieldLabel, { color: colors.fdd }]}>TOTAL MARKS</Text>
              <GlassInput value={totalMarks} onChangeText={setTotalMarks} keyboardType="number-pad" placeholder="e.g. 50" />

              {!isEditing && (
                <TouchableOpacity onPress={async () => {
                  try {
                    const res = await DocumentPicker.getDocumentAsync({ type: 'application/pdf' });
                    if (!res.canceled) setTestFile(res.assets[0]);
                  } catch (err) {}
                }} style={[styles.uploadBtn, { backgroundColor: isDark ? 'rgba(124,58,237,0.1)' : 'rgba(124,58,237,0.05)', borderColor: isDark ? 'rgba(124,58,237,0.2)' : 'rgba(124,58,237,0.15)' }]}>
                  <Ionicons name="document-text" size={20} color={colors.p} />
                  <Text style={[styles.uploadBtnText, { color: colors.p }]}>{testFile ? testFile.name : 'Upload Test Paper (PDF)'}</Text>
                </TouchableOpacity>
              )}

              <PremiumButton
                title={isEditing ? 'SAVE CHANGES' : 'CREATE TEST'}
                onPress={handleSaveTest}
                loading={saving}
                style={{ marginTop: 8 }}
              />
            </GlassCard>
          </ScrollView>
        </View>
      </Modal>

      {/* AI Generate Modal */}
      <Modal visible={showAiModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'flex-end' }} keyboardShouldPersistTaps="handled">
            <GlassCard style={styles.modalContent} intensity={isDark ? 50 : 30}>
              <View style={styles.modalHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Ionicons name="hardware-chip" size={20} color={colors.p} style={{ marginRight: 8 }} />
                  <Text style={[styles.modalTitle, { color: colors.fg }]}>AI Generate Paper</Text>
                </View>
                <TouchableOpacity onPress={() => setShowAiModal(false)}>
                  <Ionicons name="close" size={24} color={colors.fdd} />
                </TouchableOpacity>
              </View>

              <Text style={[styles.fieldLabel, { color: colors.fdd }]}>SUBJECT</Text>
              <GlassInput value={subject} onChangeText={setSubject} placeholder="e.g. Science" />

              <Text style={[styles.fieldLabel, { color: colors.fdd }]}>TOPIC / CHAPTERS</Text>
              <GlassInput value={aiTopic} onChangeText={setAiTopic} placeholder="e.g. Thermodynamics, Light" />

              <Text style={[styles.fieldLabel, { color: colors.fdd }]}>TOTAL MARKS</Text>
              <GlassInput value={aiMarks} onChangeText={setAiMarks} keyboardType="number-pad" placeholder="e.g. 20" />

              <Text style={[styles.fieldLabel, { color: colors.fdd }]}>TEXTBOOK CONTEXT (paste chapter text / questions)</Text>
              <GlassInput
                value={aiContext}
                onChangeText={setAiContext}
                placeholder="Paste the textbook excerpt or question bank the AI should draw from..."
                multiline
                numberOfLines={5}
                style={{ minHeight: 110, textAlignVertical: 'top' }}
              />

              <Text style={[styles.fieldLabel, { color: colors.fdd }]}>DIFFICULTY</Text>
              <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
                {['Easy', 'Medium', 'Hard'].map(d => (
                  <TouchableOpacity key={d} style={[styles.diffPill, { backgroundColor: colors.bgc, borderColor: colors.b }, aiDifficulty === d && { backgroundColor: colors.pm, borderColor: colors.pm }]} onPress={() => setAiDifficulty(d)}>
                    <Text style={[styles.diffPillText, { color: colors.fdd }, aiDifficulty === d && { color: '#fff' }]}>{d}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <PremiumButton
                title="GENERATE WITH AI"
                onPress={handleAiGenerate}
                loading={generating}
              />
            </GlassCard>
          </ScrollView>
        </View>
      </Modal>

      {/* Scores Modal */}
      <Modal visible={showScoreModal} transparent animationType="slide">
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.modalOverlay}>
            <GlassCard style={[styles.modalContent, { maxHeight: '90%' }]} intensity={isDark ? 50 : 30}>
              <View style={styles.modalHeader}>
                <View>
                  <Text style={[styles.modalTitle, { color: colors.fg }]}>Enter Scores</Text>
                  <Text style={[styles.testTopic, { color: colors.fdd }]}>{selectedTest?.subject} • {selectedTest?.totalMarks} marks</Text>
                </View>
                <TouchableOpacity onPress={() => setShowScoreModal(false)}>
                  <Ionicons name="close" size={24} color={colors.fdd} />
                </TouchableOpacity>
              </View>

              {!scoreData ? (
                <View style={{ padding: 40, alignItems: 'center' }}><ActivityIndicator size="large" color={colors.p} /></View>
              ) : scoreData.students.length === 0 ? (
                <Text style={[styles.emptyText, { color: colors.fdd }]}>No students found.</Text>
              ) : (
                <ScrollView style={{ marginBottom: 16 }}>
                  {scoreData.students.map((student: any) => (
                    <View key={student.studentId} style={[styles.scoreInputRow, { borderBottomColor: colors.bd }]}>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.studentName, { color: colors.fg }]}>{student.studentName}</Text>
                        <Text style={[styles.testTopic, { color: colors.fdd }]}>{student.studentId}</Text>
                      </View>
                      <TextInput
                        style={[styles.scoreInput, { backgroundColor: colors.bgc, borderColor: colors.b, color: colors.pm }]}
                        value={studentScores[student.studentId] || ''}
                        onChangeText={(val) => setStudentScores(prev => ({ ...prev, [student.studentId]: val }))}
                        keyboardType="number-pad"
                        placeholder="--"
                        placeholderTextColor={colors.fdd}
                      />
                      <Text style={[styles.maxMarksText, { color: colors.fdd }]}>/ {selectedTest?.totalMarks}</Text>
                    </View>
                  ))}
                </ScrollView>
              )}

              <PremiumButton
                title="SAVE SCORES"
                onPress={saveScores}
                loading={saving}
              />
            </GlassCard>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* AI Paper Viewer Modal */}
      <Modal visible={showPaperViewer} animationType="slide" presentationStyle="pageSheet">
        <View style={[styles.viewerContainer, { backgroundColor: isDark ? colors.bg2 : '#F5F1FC' }]}>
          <View style={[styles.viewerHeader, { backgroundColor: colors.bg2, borderBottomColor: colors.bd }]}>
            <Text style={[styles.viewerTitle, { color: colors.fg }]}>AI Generated Paper</Text>
            <TouchableOpacity onPress={() => setShowPaperViewer(false)} style={styles.closeBtn}>
              <Ionicons name="close" size={24} color={colors.fg} />
            </TouchableOpacity>
          </View>
          {Platform.OS === 'web' ? (
            <ScrollView style={styles.viewerScroll}>
              <View style={[styles.paperContentBox, { backgroundColor: colors.bg2, borderColor: colors.b }]}>
                <Text style={[styles.viewerText, { color: colors.fg }]}>{generatedPaper.replace(/<[^>]+>/g, '')}</Text>
              </View>
            </ScrollView>
          ) : (
            <WebView
              originWhitelist={['*']}
              source={{ html: `<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"></head><body style="margin:16px;background:#fff">${generatedPaper}</body></html>` }}
              style={{ flex: 1 }}
            />
          )}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyContainer: { justifyContent: 'center', alignItems: 'center', paddingTop: 80 },
  emptyText: { fontFamily: 'Inter_400Regular', fontStyle: 'italic', fontSize: 16, textAlign: 'center', marginTop: 20 },
  subjectHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  subjectTitle: { fontFamily: 'Unbounded_700Bold', fontSize: 16 },
  testCount: { fontFamily: 'SpaceMono_700Bold', fontSize: 10, letterSpacing: 1 },
  scoreCard: { padding: 16, borderRadius: 14, marginBottom: 10 },
  testName: { fontFamily: 'Inter_600SemiBold', fontSize: 14 },
  testTopic: { fontFamily: 'SpaceMono_400Regular', fontSize: 10, marginTop: 3 },
  scoreValue: { fontFamily: 'Unbounded_700Bold', fontSize: 16 },
  scoreTotal: { fontFamily: 'SpaceMono_400Regular', fontSize: 11 },
  scorePct: { fontFamily: 'SpaceMono_700Bold', fontSize: 11, marginTop: 2 },

  // Filter Pills
  filterLabel: { fontFamily: 'SpaceMono_700Bold', fontSize: 10, letterSpacing: 2, borderBottomWidth: 1, paddingBottom: 8 },
  filterPill: { borderWidth: 1, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, marginRight: 8 },
  filterPillText: { fontFamily: 'SpaceMono_700Bold', fontSize: 10, letterSpacing: 1 },

  // Summary Boxes
  summaryBox: { flex: 1, padding: 14, alignItems: 'center', borderWidth: 1 },
  summaryLabel: { fontFamily: 'SpaceMono_700Bold', fontSize: 9, letterSpacing: 2 },
  summaryValue: { fontFamily: 'Unbounded_900Black', fontSize: 22, marginTop: 6 },

  // Grade Badge
  gradeBadge: { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center', borderWidth: 1 },
  gradeText: { fontFamily: 'Unbounded_700Bold', fontSize: 14 },

  // Subject Tag
  subjectTag: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, borderWidth: 1 },
  subjectTagText: { fontFamily: 'SpaceMono_700Bold', fontSize: 9, letterSpacing: 1, textTransform: 'uppercase' },
  topicText: { fontFamily: 'SpaceMono_400Regular', fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5 },

  // Progress Bar
  progressTrack: { height: 6, borderRadius: 3, overflow: 'hidden' },
  progressBar: { height: 6, borderRadius: 3 },

  // Section Header
  sectionHeader: { fontFamily: 'Unbounded_700Bold', fontSize: 16, marginBottom: 14, borderBottomWidth: 1, paddingBottom: 10 },
  // Teacher View
  teacherBanner: { margin: 16, borderRadius: 20, padding: 24, marginBottom: 16, flexDirection: 'row', alignItems: 'center' },
  teacherBannerTitle: { fontFamily: 'Unbounded_900Black', fontSize: 22, color: '#fff' },
  teacherBannerSub: { fontFamily: 'SpaceMono_400Regular', fontSize: 11, color: 'rgba(255,255,255,0.70)', marginTop: 8, letterSpacing: 1 },
  addBtn: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  batchPill: { borderWidth: 1, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, marginHorizontal: 4 },
  batchPillText: { fontFamily: 'SpaceMono_400Regular', fontSize: 12 },
  marksBadge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 },
  marksText: { fontFamily: 'Unbounded_700Bold', fontSize: 11 },
  enterScoreBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
  enterScoreBtnText: { fontFamily: 'SpaceMono_700Bold', fontSize: 10, color: '#fff', letterSpacing: 1 },

  // Modals
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.50)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  modalTitle: { fontFamily: 'Unbounded_700Bold', fontSize: 18 },
  fieldLabel: { fontFamily: 'SpaceMono_700Bold', fontSize: 10, letterSpacing: 2, marginBottom: 8, marginLeft: 2 },
  uploadBtn: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 10, marginBottom: 16, borderWidth: 1 },
  uploadBtnText: { fontFamily: 'Inter_600SemiBold', fontSize: 14, marginLeft: 8 },
  scoreInputRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1 },
  studentName: { fontFamily: 'Inter_600SemiBold', fontSize: 14 },
  scoreInput: { width: 60, height: 40, borderWidth: 1, borderRadius: 8, textAlign: 'center', fontFamily: 'Unbounded_700Bold', fontSize: 14 },
  maxMarksText: { fontFamily: 'SpaceMono_400Regular', fontSize: 12, marginLeft: 8, width: 40 },

  diffPill: { borderWidth: 1, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10 },
  diffPillText: { fontFamily: 'SpaceMono_400Regular', fontSize: 12 },

  viewerContainer: { flex: 1 },
  viewerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, paddingTop: 60, borderBottomWidth: 1 },
  viewerTitle: { fontFamily: 'Unbounded_700Bold', fontSize: 16 },
  closeBtn: { padding: 4 },
  viewerScroll: { flex: 1, padding: 16 },
  paperContentBox: { padding: 20, borderRadius: 12, borderWidth: 1 },
  viewerText: { fontFamily: 'SpaceMono_400Regular', fontSize: 13, lineHeight: 22 },
});
