import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, Alert, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import client from '../../api/client';
import { LinearGradient } from 'expo-linear-gradient';
import GlassCard from '../../components/GlassCard';
import { useTheme } from '../../context/ThemeContext';

export default function BulkAttendanceScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState<any>(null);
  
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  
  // local matrix state: dateStr -> studentId -> status (P, A, H, '')
  const [attendanceMatrix, setAttendanceMatrix] = useState<Record<string, Record<string, string>>>({});
  const [hasChanges, setHasChanges] = useState(false);
  const { colors, isDark } = useTheme();

  const fetchBulkAttendance = async () => {
    try {
      setLoading(true);
      const res = await client.get(`/teacher/bulk_attendance?month=${selectedMonth}&year=${selectedYear}`);
      setData(res.data);
      setAttendanceMatrix(res.data.attendanceMap || {});
      setHasChanges(false);
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'Failed to fetch bulk attendance');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBulkAttendance();
  }, [selectedMonth, selectedYear]);

  const cycleStatus = (dateStr: string, studentId: string) => {
    setAttendanceMatrix(prev => {
      const newMatrix = { ...prev };
      if (!newMatrix[dateStr]) newMatrix[dateStr] = {};
      
      const current = newMatrix[dateStr][studentId] || '';
      let next = 'P';
      if (current === 'P') next = 'A';
      else if (current === 'A') next = 'H';
      else if (current === 'H') next = '';
      
      newMatrix[dateStr] = { ...newMatrix[dateStr], [studentId]: next };
      return newMatrix;
    });
    setHasChanges(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload: any = {};
      
      // Convert matrix to payload format expected by backend:
      // dateStr: [{studentId, batch, status}]
      
      data.daysArray.forEach((dateStr: string) => {
        data.students.forEach((student: any) => {
          const status = attendanceMatrix[dateStr]?.[student.studentId];
          if (status) {
            if (!payload[dateStr]) payload[dateStr] = [];
            payload[dateStr].push({
              studentId: student.studentId,
              batch: student.batch,
              status
            });
          }
        });
      });

      await client.post('/teacher/bulk_save_attendance', { attendanceData: payload });
      Alert.alert('Success', 'Bulk attendance saved!');
      setHasChanges(false);
    } catch (err) {
      Alert.alert('Error', 'Failed to save bulk attendance');
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
          <Text style={[styles.title, { color: colors.fg }]}>Bulk Attendance</Text>
          <Text style={[styles.subtitle, { color: colors.fdd }]}>Matrix Spreadsheet Entry</Text>
        </View>
        <TouchableOpacity 
          onPress={handleSave} 
          disabled={!hasChanges || saving}
          style={[styles.saveBtn, { backgroundColor: colors.pm }, (!hasChanges || saving) && { opacity: 0.5 }]}
        >
          {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.saveBtnText}>Save</Text>}
        </TouchableOpacity>
      </View>

      {/* Matrix */}
      <ScrollView horizontal bounces={false} contentContainerStyle={{ padding: 16 }}>
        <ScrollView bounces={false}>
          <GlassCard style={[styles.table, { padding: 0 }]} intensity={isDark ? 40 : 20}>
            {/* Header Row */}
            <View style={[styles.headerRow, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(124,58,237,0.05)', borderBottomColor: colors.pm }]}>
              <View style={[styles.cell, styles.stickyCol, styles.headerCell, { width: 150, backgroundColor: 'transparent', borderRightColor: colors.b }]}>
                <Text style={[styles.headerText, { color: colors.p }]}>Student</Text>
              </View>
              {data?.daysArray.map((date: string) => {
                const dayNum = date.split('-')[2];
                return (
                  <View key={date} style={[styles.cell, styles.headerCell, { width: 40, borderRightColor: colors.b }]}>
                    <Text style={[styles.headerText, { color: colors.p }]}>{dayNum}</Text>
                  </View>
                );
              })}
            </View>

            {/* Data Rows */}
            {data?.students.map((student: any) => (
              <View key={student.studentId} style={[styles.row, { borderBottomColor: colors.b }]}>
                <View style={[styles.cell, styles.stickyCol, { width: 150, backgroundColor: 'transparent', borderRightColor: colors.b }]}>
                  <Text style={[styles.studentName, { color: colors.fg }]} numberOfLines={1}>{student.studentName}</Text>
                  <Text style={[styles.studentId, { color: colors.fdd }]}>{student.studentId}</Text>
                </View>
                {data?.daysArray.map((date: string) => {
                  const status = attendanceMatrix[date]?.[student.studentId] || '';
                  
                  let cellStyle = styles.statusEmpty;
                  let textStyle = styles.textEmpty;
                  
                  if (status === 'P') { cellStyle = styles.statusP; textStyle = styles.textP; }
                  else if (status === 'A') { cellStyle = styles.statusA; textStyle = styles.textA; }
                  else if (status === 'H') { cellStyle = styles.statusH; textStyle = styles.textH; }

                  return (
                    <TouchableOpacity 
                      key={date} 
                      style={[styles.cell, { width: 40, alignItems: 'center', borderRightColor: colors.b }, cellStyle, !status && { backgroundColor: 'transparent' }]}
                      onPress={() => cycleStatus(date, student.studentId)}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.statusText, textStyle, !status && { color: colors.fdd }]}>{status || '-'}</Text>
                    </TouchableOpacity>
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

  table: { overflow: 'hidden' },
  row: { flexDirection: 'row', borderBottomWidth: 1 },
  headerRow: { flexDirection: 'row', borderBottomWidth: 2 },
  cell: { paddingVertical: 12, paddingHorizontal: 8, borderRightWidth: 1, justifyContent: 'center' },
  headerCell: { alignItems: 'center' },
  stickyCol: { zIndex: 10 },
  
  headerText: { fontFamily: 'SpaceMono_700Bold', fontSize: 10 },
  studentName: { fontFamily: 'Inter_600SemiBold', fontSize: 12 },
  studentId: { fontFamily: 'SpaceMono_400Regular', fontSize: 9 },

  statusText: { fontFamily: 'Unbounded_700Bold', fontSize: 12 },
  statusEmpty: { },
  textEmpty: { },
  statusP: { backgroundColor: 'rgba(52,211,153,0.1)' },
  textP: { color: '#10b981' },
  statusA: { backgroundColor: 'rgba(248,113,113,0.1)' },
  textA: { color: '#ef4444' },
  statusH: { backgroundColor: 'rgba(99,102,241,0.1)' },
  textH: { color: '#6366f1' },
});
