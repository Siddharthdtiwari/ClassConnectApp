import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, RefreshControl, TouchableOpacity, TextInput, Alert, Modal, Linking } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import client from '../../api/client';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import GlassCard from '../../components/GlassCard';
import PremiumButton from '../../components/PremiumButton';
import GlassInput from '../../components/GlassInput';
import { useTheme } from '../../context/ThemeContext';
import { openSafeUrl } from '../../utils/safeLinking';
const router = require('expo-router').useRouter();

export default function FeesScreen() {
  const { user } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Teacher state
  const [showModal, setShowModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [feeMonth, setFeeMonth] = useState('');
  const [feeYear, setFeeYear] = useState(String(new Date().getFullYear()));
  const [feeAmount, setFeeAmount] = useState('');
  const [feeMethod, setFeeMethod] = useState('Cash');
  const [saving, setSaving] = useState(false);
  const [batches, setBatches] = useState<any[]>([]);
  const [selectedBatch, setSelectedBatch] = useState<string | null>(null);

  // Defaulters & PDF state
  const [showDefaulters, setShowDefaulters] = useState(false);
  const [defaulters, setDefaulters] = useState<any[]>([]);
  const [defaultersMonth, setDefaultersMonth] = useState('January');
  const [loadingDefaulters, setLoadingDefaulters] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const { colors, isDark } = useTheme();

  const months = ['May','June','July','August','September','October','November','December','January','February','March','April'];

  const fetchFees = async () => {
    try {
      const endpoint = user?.role === 'student' ? '/student/fees' : '/teacher/fees';
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
      console.error('Failed to fetch fees', err);
    } finally { setLoading(false); setRefreshing(false); }
  };

  useEffect(() => { fetchFees(); }, []);

  const openPaymentModal = (student: any) => {
    setSelectedStudent(student);
    setFeeAmount(String(student.totalDue > 0 ? Math.round(student.totalDue / (student.totalDue / (data?.report?.[0]?.totalDue / data?.report?.length || 1000))) : ''));
    setFeeMonth('');
    setFeeYear(String(new Date().getFullYear()));
    setFeeMethod('Cash');
    setShowModal(true);
  };

  const recordPayment = async () => {
    if (!feeMonth || !feeAmount || !feeYear) {
      Alert.alert('Error', 'Please fill in all fields.');
      return;
    }

    setSaving(true);
    try {
      await client.post('/teacher/fees', {
        studentId: selectedStudent._id,
        batchId: selectedBatch,
        amount: Number(feeAmount),
        month: feeMonth,
        year: Number(feeYear),
        method: feeMethod,
        datePaid: new Date().toISOString(),
      });
      Alert.alert('Success', `Fee recorded for ${selectedStudent.studentName}!`);
      setShowModal(false);
      setRefreshing(true);
      fetchFees();
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.error || 'Failed to record fee.');
    } finally { setSaving(false); }
  };

  const fetchDefaulters = async () => {
    setLoadingDefaulters(true);
    try {
      const res = await client.get(`/teacher/defaulters/fees?month=${defaultersMonth}&year=${new Date().getFullYear()}`);
      setDefaulters(res.data.defaulters || []);
    } catch (err) {
      Alert.alert('Error', 'Failed to fetch defaulters');
    } finally {
      setLoadingDefaulters(false);
    }
  };

  useEffect(() => {
    if (showDefaulters) fetchDefaulters();
  }, [defaultersMonth, showDefaulters]);

  const downloadPDF = (endpoint: string, filename: string) => {
    Alert.alert(
      'Web Feature Only',
      'Heavy PDF downloads are optimized for the web dashboard. Redirecting to web...',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Open Web', onPress: () => openSafeUrl('https://tuitionhub.vercel.app/login') }
      ]
    );
  };

  if (loading) return <View style={[styles.center, { backgroundColor: 'transparent' }]}><ActivityIndicator size="large" color={colors.p} /></View>;

  // ─── STUDENT VIEW ───
  if (user?.role === 'student') {
    const feesByMonth = data?.feesByMonth || [];
    const totalDue = data?.totalDue || 0;

    return (
      <View style={{ flex: 1, backgroundColor: 'transparent' }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 100 }} refreshControl={<RefreshControl refreshing={refreshing} colors={[colors.p]} onRefresh={() => { setRefreshing(true); fetchFees(); }} />}>
        {totalDue > 0 ? (
          <GlassCard style={[styles.dueCard, { backgroundColor: colors.rt }]}>
            <Text style={styles.dueLabel}>TOTAL DUE</Text>
            <Text style={styles.dueAmount}>₹{totalDue.toLocaleString()}</Text>
          </GlassCard>
        ) : (
          <GlassCard style={styles.clearCard}>
            <Text style={{ fontSize: 32 }}>✅</Text>
            <Text style={[styles.clearText, { color: colors.gt }]}>All fees are clear!</Text>
          </GlassCard>
        )}

        <GlassCard style={[styles.glassCard, { margin: 16, marginTop: 0 }]}>
          <Text style={[styles.sectionTitle, { color: colors.fg }]}>Fee Payments</Text>
          <View style={styles.divider} />
          {feesByMonth.map((fee: any, index: number) => (
            <View key={index} style={styles.feeRow}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.feeMonth, { color: colors.fg }]}>{fee.month} {fee.year}</Text>
                {fee.datePaid && <Text style={[styles.feeMeta, { color: colors.fdd }]}>Paid: {new Date(fee.datePaid).toLocaleDateString()}</Text>}
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={[styles.feeAmount, { color: colors.pm }]}>₹{fee.amount?.toLocaleString()}</Text>
                <View style={[styles.statusPill, {
                  backgroundColor: fee.status === 'Paid' ? 'rgba(5, 150, 105, 0.15)' : fee.status === 'Due' ? 'rgba(220, 38, 38, 0.15)' : (isDark ? 'rgba(255,255,255,0.05)' : '#EDE8F5')
                }]}>
                  <Text style={[styles.statusPillText, {
                    color: fee.status === 'Paid' ? colors.gt : fee.status === 'Due' ? colors.rt : colors.fdd
                  }]}>{fee.status}</Text>
                </View>
              </View>
            </View>
          ))}
        </GlassCard>
      </ScrollView>
      </View>
    );
  }

  // ─── TEACHER VIEW — INTERACTIVE FEE COLLECTION ───
  const report = data?.report || [];
  const filteredReport = selectedBatch
  const selectedBatchName = batches.find(b => b._id === selectedBatch)?.name;

  return (
    <View style={{ flex: 1, backgroundColor: 'transparent' }}>
      <View style={[styles.teacherBar, { backgroundColor: colors.pm }]}>
        <View style={{ flex: 1 }}>
          <Text style={styles.teacherBarTitle}>Fees Mode</Text>
          <Text style={styles.teacherBarSub}>Batch: {selectedBatchName || 'Loading...'}</Text>
        </View>
        <TouchableOpacity style={styles.modeBtn} onPress={() => router.push('/bulk_fees')}>
          <Ionicons name="grid" size={18} color="#fff" />
          <Text style={styles.modeBtnText}>BULK ENTRY</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 120 }} refreshControl={<RefreshControl refreshing={refreshing} colors={[colors.p]} onRefresh={() => { setRefreshing(true); fetchFees(); }} />}>
        <LinearGradient colors={[colors.p, colors.pm]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.teacherBanner}>
          <View style={{ flex: 1 }}>
            <Text style={styles.teacherBannerTitle}>Fee Collection</Text>
            <Text style={styles.teacherBannerSub}>{report.length} students • Tap + to record</Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity onPress={() => setShowDefaulters(true)} style={styles.iconBtn}>
              <Ionicons name="warning-outline" size={22} color="#dc2626" />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => downloadPDF('/teacher/fees/sheet/pdf', 'FeeSheet.pdf')} style={[styles.iconBtn, { backgroundColor: colors.bgc }]} disabled={downloading}>
              {downloading ? <ActivityIndicator size="small" color={colors.pm} /> : <Ionicons name="document-text-outline" size={22} color={colors.pm} />}
            </TouchableOpacity>
          </View>
        </LinearGradient>

        {report.map((student: any, index: number) => (
          <GlassCard key={index} style={styles.teacherRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.teacherName, { color: colors.fg }]}>{student.studentName}</Text>
              <Text style={[styles.teacherMeta, { color: colors.fdd }]}>{student.studentId} • {student.standard}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={[styles.paidText, { color: colors.gt }]}>Paid: ₹{student.totalPaid}</Text>
              <Text style={[styles.balanceText, { color: student.balance > 0 ? colors.rt : colors.gt }]}>
                {student.balance > 0 ? `Due: ₹${student.balance}` : 'Clear ✓'}
              </Text>
            </View>
            {student.balance > 0 && (
              <TouchableOpacity style={styles.addPayBtn} onPress={() => openPaymentModal(student)}>
                <Ionicons name="add-circle" size={28} color={colors.pm} />
              </TouchableOpacity>
            )}
          </GlassCard>
        ))}
      </ScrollView>

      {/* Payment Modal */}
      <Modal visible={showModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <GlassCard style={styles.modalContent} intensity={isDark ? 50 : 30}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.fg }]}>Record Payment</Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <Ionicons name="close" size={24} color={colors.fdd} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.modalStudentName, { color: colors.pm }]}>{selectedStudent?.studentName}</Text>
            <Text style={[styles.modalStudentId, { color: colors.fdd }]}>{selectedStudent?.studentId}</Text>

            <Text style={[styles.fieldLabel, { color: colors.fdd }]}>MONTH</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
              {months.map(m => (
                <TouchableOpacity key={m} onPress={() => setFeeMonth(m)}
                  style={[styles.monthPill, { backgroundColor: colors.bgc, borderColor: colors.b }, feeMonth === m && { backgroundColor: colors.pm, borderColor: colors.pm }]}>
                  <Text style={[styles.monthPillText, { color: colors.fdd }, feeMonth === m && { color: '#fff' }]}>{m.slice(0, 3)}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={[styles.fieldLabel, { color: colors.fdd }]}>YEAR</Text>
            <GlassInput value={feeYear} onChangeText={setFeeYear} keyboardType="number-pad" />

            <Text style={[styles.fieldLabel, { color: colors.fdd }]}>AMOUNT (₹)</Text>
            <GlassInput value={feeAmount} onChangeText={setFeeAmount} keyboardType="number-pad" placeholder="Enter amount" />

            <Text style={[styles.fieldLabel, { color: colors.fdd }]}>PAYMENT METHOD</Text>
            <View style={styles.methodRow}>
              {['Cash', 'UPI', 'Razorpay'].map(m => (
                <TouchableOpacity key={m} onPress={() => setFeeMethod(m)}
                  style={[styles.methodPill, { backgroundColor: colors.bgc, borderColor: colors.b }, feeMethod === m && { backgroundColor: colors.pm, borderColor: colors.pm }]}>
                  <Text style={[styles.methodPillText, { color: colors.fdd }, feeMethod === m && { color: '#fff' }]}>{m}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <PremiumButton
              title="RECORD PAYMENT"
              onPress={recordPayment}
              loading={saving}
              style={{ marginTop: 8 }}
            />
          </GlassCard>
        </View>
      </Modal>

      {/* Defaulters Modal */}
      <Modal visible={showDefaulters} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <GlassCard style={[styles.modalContent, { maxHeight: '95%', height: '85%' }]} intensity={isDark ? 50 : 30}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="warning" size={22} color={colors.rt} style={{ marginRight: 8 }} />
                <Text style={[styles.modalTitle, { color: colors.fg }]}>Fee Defaulters</Text>
              </View>
              <TouchableOpacity onPress={() => setShowDefaulters(false)}>
                <Ionicons name="close" size={24} color={colors.fdd} />
              </TouchableOpacity>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16, flexGrow: 0, minHeight: 45 }}>
              {months.map(m => (
                <TouchableOpacity key={m} onPress={() => setDefaultersMonth(m)}
                  style={[styles.monthPill, { backgroundColor: colors.bgc, borderColor: colors.b }, defaultersMonth === m && { backgroundColor: colors.pm, borderColor: colors.pm }]}>
                  <Text style={[styles.monthPillText, { color: colors.fdd }, defaultersMonth === m && { color: '#fff' }]}>{m.slice(0, 3)}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <View style={{ flex: 1, backgroundColor: isDark ? colors.bg2 : '#ffffff', borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: colors.b }}>
              {loadingDefaulters ? (
                <View style={[styles.center, { backgroundColor: 'transparent' }]}><ActivityIndicator color={colors.p} /></View>
              ) : defaulters.length === 0 ? (
                <View style={[styles.center, { backgroundColor: 'transparent' }]}><Text style={{ color: colors.fdd }}>No defaulters found for {defaultersMonth}.</Text></View>
              ) : (
                <ScrollView>
                  {defaulters.map((student: any, index: number) => (
                    <View key={index} style={[styles.feeRow, { borderBottomColor: colors.b }]}>
                      <View style={{ flex: 1, padding: 16 }}>
                        <Text style={[styles.teacherName, { color: colors.fg }]}>{student.studentName}</Text>
                        <Text style={[styles.teacherMeta, { color: colors.fdd }]}>{student.studentId} • {student.mobileNo}</Text>
                      </View>
                      <View style={{ paddingRight: 16 }}>
                        <Text style={[styles.balanceText, { color: colors.rt }]}>Unpaid</Text>
                      </View>
                    </View>
                  ))}
                </ScrollView>
              )}
            </View>

            <TouchableOpacity onPress={() => downloadPDF('/teacher/fees/defaulters/pdf', 'FeeDefaulters.pdf')} disabled={downloading} activeOpacity={0.85}>
              <LinearGradient colors={[colors.rt, '#b91c1c']} style={[styles.modalSaveBtn, { marginTop: 16 }]}>
                {downloading ? <ActivityIndicator color="#fff" /> : (
                  <Text style={styles.modalSaveBtnText}>DOWNLOAD DEFAULTERS PDF</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </GlassCard>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  glassCard: { padding: 20 },
  sectionTitle: { fontFamily: 'Unbounded_700Bold', fontSize: 16 },
  divider: { height: 1, backgroundColor: 'rgba(12,12,12,0.07)', marginVertical: 12 },
  dueCard: { margin: 16, padding: 24, borderRadius: 20, alignItems: 'center' },
  dueLabel: { fontFamily: 'SpaceMono_700Bold', fontSize: 10, color: '#FCA5A5', letterSpacing: 2 },
  dueAmount: { fontFamily: 'Unbounded_900Black', fontSize: 32, color: '#fff', marginTop: 8 },
  clearCard: { borderWidth: 1, borderColor: 'rgba(5,150,105,0.30)', margin: 16, padding: 24, borderRadius: 20, alignItems: 'center' },
  clearText: { fontFamily: 'Unbounded_700Bold', fontSize: 14, marginTop: 12 },
  feeRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: 'rgba(12,12,12,0.05)' },
  feeMonth: { fontFamily: 'Inter_600SemiBold', fontSize: 14 },
  feeMeta: { fontFamily: 'SpaceMono_400Regular', fontSize: 10, marginTop: 3 },
  feeAmount: { fontFamily: 'Unbounded_700Bold', fontSize: 14 },
  statusPill: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 12, marginTop: 4 },
  statusPillText: { fontFamily: 'SpaceMono_700Bold', fontSize: 10, letterSpacing: 1 },
  legendDot: { width: 12, height: 12, borderRadius: 6 },
  legendText: { fontFamily: 'Inter_500Medium', fontSize: 12 },

  // Teacher UI
  teacherBar: { flexDirection: 'row', padding: 16, paddingTop: 60, alignItems: 'center' },
  teacherBarTitle: { fontFamily: 'Unbounded_700Bold', fontSize: 16, color: '#fff' },
  teacherBarSub: { fontFamily: 'SpaceMono_400Regular', fontSize: 11, color: 'rgba(255,255,255,0.70)', marginTop: 2 },
  modeBtn: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, alignItems: 'center', gap: 6 },
  modeBtnText: { fontFamily: 'SpaceMono_700Bold', fontSize: 10, color: '#fff', letterSpacing: 1 },
  teacherBanner: { margin: 16, borderRadius: 20, padding: 24, marginBottom: 16, flexDirection: 'row', alignItems: 'center' },
  teacherBannerTitle: { fontFamily: 'Unbounded_900Black', fontSize: 22, color: '#fff' },
  teacherBannerSub: { fontFamily: 'SpaceMono_400Regular', fontSize: 11, color: 'rgba(255,255,255,0.70)', marginTop: 8, letterSpacing: 1 },
  iconBtn: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  teacherRow: { flexDirection: 'row', marginHorizontal: 16, marginBottom: 8, padding: 14, borderRadius: 14, alignItems: 'center' },
  teacherName: { fontFamily: 'Inter_600SemiBold', fontSize: 15 },
  teacherMeta: { fontFamily: 'SpaceMono_400Regular', fontSize: 11, marginTop: 2 },
  paidText: { fontFamily: 'SpaceMono_400Regular', fontSize: 12 },
  balanceText: { fontFamily: 'SpaceMono_700Bold', fontSize: 12, marginTop: 2 },
  addPayBtn: { marginLeft: 10 },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.50)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '85%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontFamily: 'Unbounded_700Bold', fontSize: 18 },
  modalStudentName: { fontFamily: 'Inter_600SemiBold', fontSize: 16 },
  modalStudentId: { fontFamily: 'SpaceMono_400Regular', fontSize: 12, marginTop: 2, marginBottom: 20 },
  fieldLabel: { fontFamily: 'SpaceMono_700Bold', fontSize: 10, letterSpacing: 2, marginBottom: 8, marginLeft: 2 },
  monthPill: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8, marginRight: 6 },
  monthPillText: { fontFamily: 'SpaceMono_400Regular', fontSize: 12 },
  methodRow: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  methodPill: { flex: 1, borderWidth: 1, borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  methodPillText: { fontFamily: 'SpaceMono_400Regular', fontSize: 12 },
  modalSaveBtn: { borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
  modalSaveBtnText: { fontFamily: 'Unbounded_700Bold', fontSize: 13, color: '#fff', letterSpacing: 1 },
});
