import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, Alert, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import client from '../../api/client';
import { LinearGradient } from 'expo-linear-gradient';
import GlassCard from '../../components/GlassCard';
import { useTheme } from '../../context/ThemeContext';

export default function BulkFeesScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState<any>(null);
  
  // local matrix state: studentId -> month -> { amount, method, datePaid }
  const [feeMatrix, setFeeMatrix] = useState<Record<string, Record<string, any>>>({});
  const [hasChanges, setHasChanges] = useState(false);
  const [globalMethod, setGlobalMethod] = useState('UPI');
  const [globalDate, setGlobalDate] = useState(new Date().toISOString().split('T')[0]);
  const { colors, isDark } = useTheme();

  const fetchBulkFees = async () => {
    try {
      setLoading(true);
      const res = await client.get(`/teacher/bulk_fees`);
      setData(res.data);
      setFeeMatrix(res.data.feeMap || {});
      setHasChanges(false);
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'Failed to fetch bulk fees');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBulkFees();
  }, []);

  const updateCell = (studentId: string, month: string, field: string, value: string) => {
    setFeeMatrix(prev => {
      const newMatrix = { ...prev };
      if (!newMatrix[studentId]) newMatrix[studentId] = {};
      if (!newMatrix[studentId][month]) newMatrix[studentId][month] = {};
      
      newMatrix[studentId][month][field] = value;
      
      // Auto-fill method and date if amount is typed and they are empty
      if (field === 'amount' && value) {
        if (!newMatrix[studentId][month].method) newMatrix[studentId][month].method = globalMethod;
        if (!newMatrix[studentId][month].datePaid) newMatrix[studentId][month].datePaid = globalDate;
      }
      
      return newMatrix;
    });
    setHasChanges(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const updates: any[] = [];
      
      data.students.forEach((student: any) => {
        data.months.forEach((month: string) => {
          const original = data.feeMap[student.studentId]?.[month];
          const current = feeMatrix[student.studentId]?.[month];
          
          if (!current) return;
          
          const isNextYear = ["January", "February", "March", "April"].includes(month);
          const cellYear = isNextYear ? data.selectedYear + 1 : data.selectedYear;

          // Check if deleted
          if (original && (!current.amount || current.amount === '')) {
            updates.push({
              studentId: student.studentId,
              month,
              year: cellYear,
              deleteAction: true
            });
            return;
          }
          
          // Check if added/modified
          if (current.amount && (!original || original.amount !== Number(current.amount) || original.method !== current.method || new Date(original.datePaid).toISOString().split('T')[0] !== current.datePaid)) {
            updates.push({
              studentId: student.studentId,
              studentName: student.studentName,
              month,
              year: cellYear,
              amount: Number(current.amount),
              method: current.method,
              datePaid: current.datePaid,
              deleteAction: false
            });
          }
        });
      });

      if (updates.length > 0) {
        await client.post('/teacher/bulk_save', { updates });
        Alert.alert('Success', 'Bulk fees saved!');
        fetchBulkFees();
      } else {
        Alert.alert('Info', 'No changes to save.');
        setHasChanges(false);
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to save bulk fees');
    } finally {
      setSaving(false);
    }
  };

  if (loading && !data) {
    return <View style={[styles.center, { backgroundColor: 'transparent' }]}><ActivityIndicator size="large" color={colors.p} /></View>;
  }

  return (
    <View style={{ flex: 1, backgroundColor: 'transparent' }}>
      <View style={[styles.header, { backgroundColor: isDark ? colors.bg2 : '#fff', borderBottomColor: colors.b }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.fg} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: colors.fg }]}>Bulk Fees</Text>
          <Text style={[styles.subtitle, { color: colors.fdd }]}>Matrix Payments Ledger</Text>
        </View>
        <TouchableOpacity 
          onPress={handleSave} 
          disabled={!hasChanges || saving}
          style={[styles.saveBtn, { backgroundColor: colors.pm }, (!hasChanges || saving) && { opacity: 0.5 }]}
        >
          {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.saveBtnText}>Commit ✓</Text>}
        </TouchableOpacity>
      </View>

      <View style={[styles.controlsBar, { borderBottomColor: colors.b }]}>
        <GlassCard style={[styles.controlBox, { padding: 12 }]} intensity={isDark ? 30 : 10}>
          <Text style={[styles.controlLabel, { color: colors.fdd }]}>DEFAULT METHOD</Text>
          <View style={{ flexDirection: 'row', gap: 6, marginTop: 4 }}>
            {['Cash', 'UPI', 'Razorpay'].map(m => (
              <TouchableOpacity key={m} onPress={() => setGlobalMethod(m)} style={[styles.pill, { backgroundColor: colors.bgc }, globalMethod === m && { backgroundColor: colors.pm }]}>
                <Text style={[styles.pillText, { color: colors.p }, globalMethod === m && { color: '#fff' }]}>{m}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </GlassCard>
        <GlassCard style={[styles.controlBox, { padding: 12 }]} intensity={isDark ? 30 : 10}>
          <Text style={[styles.controlLabel, { color: colors.fdd }]}>DEFAULT DATE</Text>
          <TextInput style={[styles.dateInput, { color: colors.fg, borderBottomColor: colors.b }]} value={globalDate} onChangeText={setGlobalDate} placeholder="YYYY-MM-DD" placeholderTextColor={colors.fdd} />
        </GlassCard>
      </View>

      <ScrollView horizontal bounces={false} contentContainerStyle={{ padding: 16 }}>
        <ScrollView bounces={false}>
          <GlassCard style={[styles.table, { padding: 0 }]} intensity={isDark ? 40 : 20}>
            {/* Header Row */}
            <View style={[styles.headerRow, { backgroundColor: colors.pm, borderBottomColor: colors.pm }]}>
              <View style={[styles.cell, styles.stickyCol, styles.headerCell, { width: 160, backgroundColor: 'transparent', borderRightColor: colors.b }]}>
                <Text style={[styles.headerText, { color: '#fff' }]}>Student Roster</Text>
              </View>
              {data?.months.map((month: string) => (
                <View key={month} style={[styles.cell, styles.headerCell, { width: 140, borderRightColor: colors.b }]}>
                  <Text style={[styles.headerText, { color: '#fff' }]}>{month}</Text>
                </View>
              ))}
            </View>

            {/* Data Rows */}
            {data?.students.map((student: any) => (
              <View key={student.studentId} style={[styles.row, { borderBottomColor: colors.b }]}>
                <View style={[styles.cell, styles.stickyCol, { width: 160, paddingHorizontal: 12, backgroundColor: 'transparent', borderRightColor: colors.b }]}>
                  <Text style={[styles.studentName, { color: colors.fg }]} numberOfLines={1}>{student.studentName}</Text>
                  <Text style={[styles.studentId, { color: colors.p, backgroundColor: colors.bgc }]}>{student.studentId}</Text>
                </View>
                {data?.months.map((month: string) => {
                  const cellData = feeMatrix[student.studentId]?.[month] || {};
                  const isPaid = !!cellData.amount;
                  
                  return (
                    <View key={month} style={[styles.cell, { width: 140, backgroundColor: isPaid ? (isDark ? 'rgba(52,211,153,0.1)' : 'rgba(52,211,153,0.05)') : 'transparent', borderRightColor: colors.b }]}>
                      <View style={styles.inputWrapper}>
                        <Text style={[styles.rupee, isPaid ? { color: colors.gt } : { color: colors.fdd }]}>₹</Text>
                        <TextInput
                          style={[styles.amountInput, { borderBottomColor: colors.b, color: colors.fg }, isPaid && { color: colors.gt }]}
                          value={cellData.amount ? String(cellData.amount) : ''}
                          onChangeText={(val) => updateCell(student.studentId, month, 'amount', val)}
                          keyboardType="number-pad"
                          placeholder={String(student.monthlyFee)}
                          placeholderTextColor={colors.fdd}
                        />
                      </View>
                      <View style={styles.metaRow}>
                        <TextInput
                          style={[styles.methodInput, { color: colors.fdd }]}
                          value={cellData.method || ''}
                          onChangeText={(val) => updateCell(student.studentId, month, 'method', val)}
                          placeholder="Method"
                          placeholderTextColor={colors.fdd}
                        />
                        <TextInput
                          style={[styles.dateCellInput, { color: colors.fdd }]}
                          value={cellData.datePaid ? new Date(cellData.datePaid).toISOString().split('T')[0] : ''}
                          onChangeText={(val) => updateCell(student.studentId, month, 'datePaid', val)}
                          placeholder="Date"
                          placeholderTextColor={colors.fdd}
                        />
                      </View>
                    </View>
                  );
                })}
              </View>
            ))}
          </GlassCard>
        </ScrollView>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', paddingTop: 60, paddingHorizontal: 16, paddingBottom: 16, borderBottomWidth: 1 },
  backBtn: { marginRight: 16 },
  title: { fontFamily: 'Unbounded_700Bold', fontSize: 18 },
  subtitle: { fontFamily: 'SpaceMono_400Regular', fontSize: 11 },
  saveBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  saveBtnText: { fontFamily: 'Unbounded_700Bold', fontSize: 12, color: '#fff' },

  controlsBar: { flexDirection: 'row', padding: 16, gap: 12, borderBottomWidth: 1 },
  controlBox: { flex: 1 },
  controlLabel: { fontFamily: 'SpaceMono_700Bold', fontSize: 9, letterSpacing: 1 },
  pill: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  pillText: { fontFamily: 'Inter_600SemiBold', fontSize: 10 },
  dateInput: { fontFamily: 'Inter_600SemiBold', fontSize: 12, marginTop: 4, borderBottomWidth: 1, paddingBottom: 2 },

  table: { overflow: 'hidden' },
  row: { flexDirection: 'row', borderBottomWidth: 1 },
  headerRow: { flexDirection: 'row', borderBottomWidth: 2 },
  cell: { paddingVertical: 8, paddingHorizontal: 6, borderRightWidth: 1, justifyContent: 'center' },
  headerCell: { alignItems: 'center' },
  stickyCol: { zIndex: 10 },
  
  headerText: { fontFamily: 'SpaceMono_700Bold', fontSize: 11 },
  studentName: { fontFamily: 'Inter_600SemiBold', fontSize: 12, marginBottom: 2 },
  studentId: { fontFamily: 'SpaceMono_400Regular', fontSize: 9, alignSelf: 'flex-start', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 },

  inputWrapper: { flexDirection: 'row', alignItems: 'center' },
  rupee: { fontFamily: 'Inter_700Bold', fontSize: 12, position: 'absolute', left: 4 },
  amountInput: { flex: 1, fontFamily: 'Inter_600SemiBold', fontSize: 13, paddingLeft: 16, paddingVertical: 2, borderBottomWidth: 1 },
  metaRow: { flexDirection: 'row', gap: 4, marginTop: 4 },
  methodInput: { flex: 1, fontFamily: 'SpaceMono_400Regular', fontSize: 9, padding: 0 },
  dateCellInput: { flex: 1.5, fontFamily: 'SpaceMono_400Regular', fontSize: 9, padding: 0 },
});
