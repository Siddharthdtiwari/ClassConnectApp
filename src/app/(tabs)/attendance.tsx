import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, RefreshControl, TouchableOpacity, Alert, Modal, Linking } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import client from '../../api/client';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import GlassCard from '../../components/GlassCard';
import PremiumButton from '../../components/PremiumButton';
import { useTheme } from '../../context/ThemeContext';
import { openSafeUrl } from '../../utils/safeLinking';

// toISOString() converts to UTC first, so "today" near midnight can land on
// the wrong calendar day for IST (UTC+5:30) users. Use local date parts instead,
// matching how the web dashboard computes "today" for the same attendance record.
const localDateKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

export default function AttendanceScreen() {
  const { user } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const router = require('expo-router').useRouter();

  // Teacher State
  const [batches, setBatches] = useState<any[]>([]);
  const [selectedBatch, setSelectedBatch] = useState<string | null>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [attendanceMarks, setAttendanceMarks] = useState<Record<string, 'P' | 'A' | null>>({});
  const [saving, setSaving] = useState(false);
  const [existingAttendance, setExistingAttendance] = useState<Record<string, any>>({});

  // Defaulters & PDF state
  const [showDefaulters, setShowDefaulters] = useState(false);
  const [defaulters, setDefaulters] = useState<any[]>([]);
  const [defaultersMonth, setDefaultersMonth] = useState((new Date().getMonth() + 1).toString());
  const [loadingDefaulters, setLoadingDefaulters] = useState(false);
  const [downloading, setDownloading] = useState(false);

  // Detailed month-grid state (teacher)
  const [showGrid, setShowGrid] = useState(false);
  const [gridMonth, setGridMonth] = useState(new Date().getMonth()); // 0-11
  const { colors, isDark } = useTheme();

  const fetchAttendance = async () => {
    try {
      const endpoint = user?.role === 'student' ? '/student/attendance' : '/teacher/attendance';
      const response = await client.get(endpoint);
      setData(response.data);

      if (user?.role === 'teacher') {
        const batchRes = await client.get('/teacher/batches');
        setBatches(batchRes.data.batches || []);
        setStudents(response.data.students || []);
        setExistingAttendance(response.data.attendance || {});

        if (batchRes.data.batches?.length > 0 && !selectedBatch) {
          setSelectedBatch(batchRes.data.batches[0]._id);
        }
      }
    } catch (err) {
      console.error('Failed to fetch attendance', err);
    } finally { setLoading(false); setRefreshing(false); }
  };

  useEffect(() => { fetchAttendance(); }, []);

  useEffect(() => {
    if (user?.role === 'teacher' && selectedBatch) {
      const today = localDateKey(new Date());
      const todayAttendance = existingAttendance[today] || {};
      const marks: Record<string, 'P' | 'A' | null> = {};
      const batchStudents = students.filter(s => s.batch?._id === selectedBatch || s.batch === selectedBatch);
      batchStudents.forEach(s => {
        marks[s.studentId] = todayAttendance[s.studentId] || null;
      });
      setAttendanceMarks(marks);
    }
  }, [selectedBatch, existingAttendance]);

  const toggleMark = (studentId: string, status: 'P' | 'A') => {
    setAttendanceMarks(prev => ({
      ...prev,
      [studentId]: prev[studentId] === status ? null : status,
    }));
  };

  const markAll = (status: 'P' | 'A') => {
    const batchStudents = students.filter(s => s.batch?._id === selectedBatch || s.batch === selectedBatch);
    const marks: Record<string, 'P' | 'A' | null> = {};
    batchStudents.forEach(s => { marks[s.studentId] = status; });
    setAttendanceMarks(marks);
  };

  const saveAttendance = async () => {
    const records = Object.entries(attendanceMarks)
      .filter(([_, status]) => status !== null)
      .map(([studentId, status]) => ({ studentId, status }));

    if (records.length === 0) {
      Alert.alert('Error', 'Please mark at least one student.');
      return;
    }

    setSaving(true);
    try {
      const today = localDateKey(new Date());
      await client.post('/teacher/attendance', {
        date: today,
        records,
        batchId: selectedBatch,
      });
      Alert.alert('Success', `Attendance saved for ${records.length} students!`);
      fetchAttendance();
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.error || 'Failed to save attendance');
    } finally { setSaving(false); }
  };

  const fetchDefaulters = async () => {
    setLoadingDefaulters(true);
    try {
      const res = await client.get(`/teacher/defaulters/attendance?month=${defaultersMonth}&year=${new Date().getFullYear()}`);
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

  if (user?.role === 'student') {
    const attendanceData = data?.attendanceData || {};
    const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
    const firstDay = new Date(selectedYear, selectedMonth, 1).getDay();

    let presentCount = 0, absentCount = 0;
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      if (attendanceData[dateStr] === 'present') presentCount++;
      if (attendanceData[dateStr] === 'absent') absentCount++;
    }
    const totalMarked = presentCount + absentCount;
    const pct = totalMarked > 0 ? ((presentCount / totalMarked) * 100).toFixed(0) : 0;

    return (
      <View style={{ flex: 1, backgroundColor: 'transparent' }}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 100 }} refreshControl={<RefreshControl refreshing={refreshing} colors={[colors.p]} onRefresh={() => { setRefreshing(true); fetchAttendance(); }} />}>
        <GlassCard style={[styles.glassCard, { margin: 16, marginTop: 16 }]}>
          <View style={styles.monthNav}>
            <TouchableOpacity onPress={() => {
              if (selectedMonth === 0) { setSelectedMonth(11); setSelectedYear(y => y - 1); }
              else setSelectedMonth(m => m - 1);
            }}><Text style={[styles.navArrow, { color: colors.pt }]}>◀</Text></TouchableOpacity>
            <Text style={[styles.monthTitle, { color: colors.fg }]}>{monthNames[selectedMonth]} {selectedYear}</Text>
            <TouchableOpacity onPress={() => {
              if (selectedMonth === 11) { setSelectedMonth(0); setSelectedYear(y => y + 1); }
              else setSelectedMonth(m => m + 1);
            }}><Text style={[styles.navArrow, { color: colors.pt }]}>▶</Text></TouchableOpacity>
          </View>
        </GlassCard>

        <View style={styles.statsRow}>
          <GlassCard style={styles.statBox}><Text style={[styles.statNum, { color: colors.gt }]}>{presentCount}</Text><Text style={[styles.statLabel, { color: colors.fdd }]}>PRESENT</Text></GlassCard>
          <GlassCard style={styles.statBox}><Text style={[styles.statNum, { color: colors.rt }]}>{absentCount}</Text><Text style={[styles.statLabel, { color: colors.fdd }]}>ABSENT</Text></GlassCard>
          <GlassCard style={styles.statBox}><Text style={[styles.statNum, { color: colors.pt }]}>{pct}%</Text><Text style={[styles.statLabel, { color: colors.fdd }]}>OVERALL</Text></GlassCard>
        </View>

        <GlassCard style={[styles.glassCard, { marginHorizontal: 16, marginBottom: 16 }]}>
          <View style={styles.calGrid}>
            {['S','M','T','W','T','F','S'].map((d, i) => (
              <View key={i} style={styles.calHeaderCell}><Text style={[styles.calHeaderText, { color: colors.fdd }]}>{d}</Text></View>
            ))}
            {Array.from({ length: firstDay }).map((_, i) => <View key={`e-${i}`} style={styles.calCell} />)}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dateStr = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const status = attendanceData[dateStr];
              const bgColor = status === 'present' ? 'rgba(5, 150, 105, 0.1)' : status === 'absent' ? 'rgba(220, 38, 38, 0.1)' : status === 'holiday' ? 'rgba(217, 119, 6, 0.1)' : isDark ? colors.bg2 : '#F9FAFB';
              const textColor = status === 'present' ? colors.gt : status === 'absent' ? colors.rt : status === 'holiday' ? '#92400E' : colors.fdd;
              return (
                <View key={day} style={[styles.calCell, { backgroundColor: bgColor }]}>
                  <Text style={[styles.calDayText, { color: textColor }]}>{day}</Text>
                </View>
              );
            })}
          </View>
        </GlassCard>

        <View style={styles.legend}>
          <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: 'rgba(5, 150, 105, 0.5)' }]} /><Text style={[styles.legendText, { color: colors.fdd }]}>Present</Text></View>
          <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: 'rgba(220, 38, 38, 0.5)' }]} /><Text style={[styles.legendText, { color: colors.fdd }]}>Absent</Text></View>
          <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: 'rgba(217, 119, 6, 0.5)' }]} /><Text style={[styles.legendText, { color: colors.fdd }]}>Holiday</Text></View>
        </View>
      </ScrollView>
      </View>
    );
  }

  const batchStudents = students.filter(s => {
    const batchId = typeof s.batch === 'object' ? s.batch?._id : s.batch;
    return batchId === selectedBatch;
  });
  const markedCount = Object.values(attendanceMarks).filter(v => v !== null).length;
  const selectedBatchName = batches.find(b => b._id === selectedBatch)?.name;

  return (
    <View style={{ flex: 1, backgroundColor: 'transparent' }}>
      {/* Teacher Action Bar */}
      <View style={[styles.teacherBar, { backgroundColor: colors.pm }]}>
        <View style={{ flex: 1 }}>
          <Text style={styles.teacherBarTitle}>Attendance Mode</Text>
          <Text style={styles.teacherBarSub}>Batch: {selectedBatchName || 'Loading...'}</Text>
        </View>
        <TouchableOpacity style={styles.modeBtn} onPress={() => router.push('/bulk_attendance')}>
          <Ionicons name="grid" size={18} color="#fff" />
          <Text style={styles.modeBtnText}>BULK ENTRY</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.modeBtn, { marginLeft: 8, backgroundColor: 'rgba(255,255,255,0.1)' }]} onPress={() => setShowGrid(true)}>
          <Ionicons name="calendar-outline" size={18} color="#fff" />
          <Text style={styles.modeBtnText}>FULL GRID</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 120 }} refreshControl={<RefreshControl refreshing={refreshing} colors={[colors.p]} onRefresh={() => { setRefreshing(true); fetchAttendance(); }} />}>
        <LinearGradient colors={[colors.p, colors.pm]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.teacherBanner}>
          <View style={{ flex: 1 }}>
            <Text style={styles.teacherBannerTitle}>Attendance</Text>
            <Text style={styles.teacherBannerDate}>{new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity onPress={() => setShowDefaulters(true)} style={styles.iconBtn}>
              <Ionicons name="warning-outline" size={22} color="#dc2626" />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => downloadPDF(`/teacher/attendance/defaulters/pdf/${new Date().getFullYear()}/${new Date().getMonth() + 1}`, 'AttendanceDefaulters.pdf')} style={styles.iconBtn} disabled={downloading}>
              {downloading ? <ActivityIndicator size="small" color="#5d3a9b" /> : <Ionicons name="document-text-outline" size={22} color="#5d3a9b" />}
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
                {batch.name} ({batch.studentCount || 0})
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={styles.quickActions}>
          <TouchableOpacity style={[styles.quickBtn, { backgroundColor: colors.bgc, borderColor: colors.b }]} onPress={() => markAll('P')}>
            <Ionicons name="checkmark-circle" size={18} color={colors.gt} />
            <Text style={[styles.quickBtnText, { color: colors.gt }]}>ALL PRESENT</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.quickBtn, { backgroundColor: colors.bgc, borderColor: colors.b }]} onPress={() => markAll('A')}>
            <Ionicons name="close-circle" size={18} color={colors.rt} />
            <Text style={[styles.quickBtnText, { color: colors.rt }]}>ALL ABSENT</Text>
          </TouchableOpacity>
        </View>

        {batchStudents.length === 0 ? (
          <Text style={[styles.emptyText, { color: colors.fdd }]}>No students in this batch.</Text>
        ) : (
          batchStudents.map((student, index) => {
            const mark = attendanceMarks[student.studentId];
            return (
              <GlassCard key={index} style={styles.studentCard}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={[styles.studentName, { color: colors.fg }]}>{student.studentName}</Text>
                  <Text style={[styles.studentMeta, { color: colors.fdd }]}>{student.studentId}</Text>
                </View>
                <View style={styles.markButtons}>
                  <TouchableOpacity
                    style={[styles.markBtn, { borderColor: colors.gt, backgroundColor: 'rgba(5,150,105,0.08)' }, mark === 'P' && { backgroundColor: colors.gt }]}
                    onPress={() => toggleMark(student.studentId, 'P')}
                  >
                    <Text style={[styles.markBtnText, { color: colors.fg }, mark === 'P' && { color: '#fff' }]}>P</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.markBtn, { borderColor: colors.rt, backgroundColor: 'rgba(220,38,38,0.08)' }, mark === 'A' && { backgroundColor: colors.rt }]}
                    onPress={() => toggleMark(student.studentId, 'A')}
                  >
                    <Text style={[styles.markBtnText, { color: colors.fg }, mark === 'A' && { color: '#fff' }]}>A</Text>
                  </TouchableOpacity>
                </View>
              </GlassCard>
            );
          })
        )}

        {batchStudents.length > 0 && (
          <View style={{ paddingHorizontal: 16, marginTop: 16 }}>
            <Text style={[styles.markedCountText, { color: colors.fdd }]}>{markedCount}/{batchStudents.length} students marked</Text>
            <PremiumButton
              title="SAVE ATTENDANCE"
              onPress={saveAttendance}
              loading={saving}
              icon={<Ionicons name="save-outline" size={20} color="#fff" />}
            />
          </View>
        )}
      </ScrollView>

      <Modal visible={showDefaulters} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <GlassCard style={[styles.modalContent, { maxHeight: '95%', height: '85%' }]} intensity={isDark ? 50 : 30}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="warning" size={22} color={colors.rt} style={{ marginRight: 8 }} />
                <Text style={[styles.modalTitle, { color: colors.fg }]}>Attendance Defaulters</Text>
              </View>
              <TouchableOpacity onPress={() => setShowDefaulters(false)}>
                <Ionicons name="close" size={24} color={colors.fdd} />
              </TouchableOpacity>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16, flexGrow: 0, minHeight: 45 }}>
              {Array.from({ length: 12 }).map((_, i) => {
                const monthNum = (i + 1).toString();
                const monthName = new Date(2000, i, 1).toLocaleString('default', { month: 'short' });
                return (
                  <TouchableOpacity key={monthNum} onPress={() => setDefaultersMonth(monthNum)}
                    style={[styles.monthPill, { backgroundColor: colors.bgc, borderColor: colors.b }, defaultersMonth === monthNum && { backgroundColor: colors.pm, borderColor: colors.pm }]}>
                    <Text style={[styles.monthPillText, { color: colors.fdd }, defaultersMonth === monthNum && { color: '#fff' }]}>{monthName}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <View style={{ flex: 1, backgroundColor: isDark ? colors.bg2 : '#ffffff', borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: colors.b }}>
              {loadingDefaulters ? (
                <View style={[styles.center, { backgroundColor: 'transparent' }]}><ActivityIndicator color={colors.p} /></View>
              ) : defaulters.length === 0 ? (
                <View style={[styles.center, { backgroundColor: 'transparent' }]}><Text style={{ color: colors.fdd }}>No defaulters found for this month.</Text></View>
              ) : (
                <ScrollView>
                  {defaulters.map((student: any, index: number) => (
                    <View key={index} style={{ flexDirection: 'row', padding: 16, borderBottomWidth: 1, borderBottomColor: colors.bd }}>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.studentName, { color: colors.fg }]}>{student.studentName}</Text>
                        <Text style={[styles.studentId, { color: colors.fdd }]}>{student.studentId} • {student.mobileNo}</Text>
                      </View>
                      <View style={{ justifyContent: 'center' }}>
                        <Text style={[styles.percentText, { color: colors.rt, fontFamily: 'Unbounded_700Bold' }]}>Low</Text>
                      </View>
                    </View>
                  ))}
                </ScrollView>
              )}
            </View>

            <PremiumButton
              title="DOWNLOAD DEFAULTERS PDF"
              onPress={() => downloadPDF(`/teacher/attendance/defaulters/pdf/${new Date().getFullYear()}/${defaultersMonth}`, `AttendanceDefaulters_${defaultersMonth}.pdf`)}
              loading={downloading}
              style={{ marginTop: 16 }}
            />
          </GlassCard>
        </View>
      </Modal>

      {/* Detailed Month Grid */}
      <Modal visible={showGrid} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <GlassCard style={[styles.modalContent, { maxHeight: '95%', height: '90%' }]} intensity={isDark ? 50 : 30}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="calendar" size={22} color={colors.p} style={{ marginRight: 8 }} />
                <Text style={[styles.modalTitle, { color: colors.fg }]}>Detailed Attendance</Text>
              </View>
              <TouchableOpacity onPress={() => setShowGrid(false)}>
                <Ionicons name="close" size={24} color={colors.fdd} />
              </TouchableOpacity>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12, flexGrow: 0, minHeight: 45 }}>
              {Array.from({ length: 12 }).map((_, i) => {
                const monthName = new Date(2000, i, 1).toLocaleString('default', { month: 'short' });
                return (
                  <TouchableOpacity key={i} onPress={() => setGridMonth(i)}
                    style={[styles.monthPill, { backgroundColor: colors.bgc, borderColor: colors.b }, gridMonth === i && { backgroundColor: colors.pm, borderColor: colors.pm }]}>
                    <Text style={[styles.monthPillText, { color: colors.fdd }, gridMonth === i && { color: '#fff' }]}>{monthName}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {(() => {
              // Parse the "YYYY-MM-DD" key directly instead of via `new Date(d)` — that
              // parses as UTC midnight, and .getMonth()/.getDate() read back in local time,
              // which shifts day-1 dates into the wrong month in timezones behind UTC.
              const gridDates = Object.keys(existingAttendance)
                .filter((d) => Number(d.slice(5, 7)) - 1 === gridMonth)
                .sort();
              if (gridDates.length === 0) {
                return <View style={[styles.center, { backgroundColor: 'transparent' }]}><Text style={{ color: colors.fdd }}>No attendance records for this month.</Text></View>;
              }
              return (
                <ScrollView horizontal style={{ flex: 1 }}>
                  <ScrollView>
                    <View>
                      {/* Header row */}
                      <View style={{ flexDirection: 'row' }}>
                        <View style={[styles.gridNameCell, { borderColor: colors.b }]}>
                          <Text style={[styles.gridHeaderText, { color: colors.fdd }]}>STUDENT</Text>
                        </View>
                        {gridDates.map((d) => (
                          <View key={d} style={[styles.gridCell, { borderColor: colors.b }]}>
                            <Text style={[styles.gridHeaderText, { color: colors.fdd }]}>{Number(d.slice(8, 10))}</Text>
                          </View>
                        ))}
                        <View style={[styles.gridCell, { borderColor: colors.b, width: 52 }]}>
                          <Text style={[styles.gridHeaderText, { color: colors.fdd }]}>%</Text>
                        </View>
                      </View>
                      {/* Student rows */}
                      {batchStudents.map((student) => {
                        let present = 0, counted = 0;
                        const cells = gridDates.map((d) => {
                          const status = existingAttendance[d]?.[student.studentId] || '-';
                          if (status === 'P') { present++; counted++; }
                          if (status === 'A') counted++;
                          return { d, status };
                        });
                        const pct = counted > 0 ? Math.round((present / counted) * 100) : null;
                        return (
                          <View key={student.studentId} style={{ flexDirection: 'row' }}>
                            <View style={[styles.gridNameCell, { borderColor: colors.b }]}>
                              <Text style={[styles.gridNameText, { color: colors.fg }]} numberOfLines={1}>{student.studentName}</Text>
                            </View>
                            {cells.map(({ d, status }) => (
                              <View key={d} style={[styles.gridCell, { borderColor: colors.b },
                                status === 'P' && { backgroundColor: 'rgba(5,150,105,0.18)' },
                                status === 'A' && { backgroundColor: 'rgba(220,38,38,0.18)' },
                                status === 'H' && { backgroundColor: 'rgba(217,119,6,0.18)' },
                              ]}>
                                <Text style={[styles.gridCellText, {
                                  color: status === 'P' ? colors.gt : status === 'A' ? colors.rt : status === 'H' ? '#d97706' : colors.fdd
                                }]}>{status}</Text>
                              </View>
                            ))}
                            <View style={[styles.gridCell, { borderColor: colors.b, width: 52 }]}>
                              <Text style={[styles.gridCellText, { color: pct !== null && pct < 75 ? colors.rt : colors.gt }]}>
                                {pct === null ? '—' : `${pct}%`}
                              </Text>
                            </View>
                          </View>
                        );
                      })}
                    </View>
                  </ScrollView>
                </ScrollView>
              );
            })()}
          </GlassCard>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  glassCard: { padding: 0 },
  monthNav: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
  navArrow: { fontSize: 18, padding: 8 },
  monthTitle: { fontFamily: 'Unbounded_700Bold', fontSize: 16 },
  statsRow: { flexDirection: 'row', paddingHorizontal: 16, marginVertical: 16, gap: 10 },
  statBox: { flex: 1, padding: 14, alignItems: 'center' },
  statNum: { fontFamily: 'Unbounded_900Black', fontSize: 22 },
  statLabel: { fontFamily: 'SpaceMono_400Regular', fontSize: 9, marginTop: 4, letterSpacing: 2 },
  calGrid: { flexDirection: 'row', flexWrap: 'wrap', padding: 8 },
  calHeaderCell: { width: '14.28%', alignItems: 'center', paddingVertical: 8 },
  calHeaderText: { fontFamily: 'SpaceMono_700Bold', fontSize: 11 },
  calCell: { width: '14.28%', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 8, marginVertical: 2 },
  calDayText: { fontFamily: 'Inter_600SemiBold', fontSize: 14 },
  // Detailed grid
  gridNameCell: { width: 120, paddingVertical: 10, paddingHorizontal: 8, borderWidth: 0.5, justifyContent: 'center' },
  gridCell: { width: 38, paddingVertical: 10, borderWidth: 0.5, alignItems: 'center', justifyContent: 'center' },
  gridHeaderText: { fontFamily: 'SpaceMono_700Bold', fontSize: 9, letterSpacing: 0.5 },
  gridNameText: { fontFamily: 'Inter_600SemiBold', fontSize: 11 },
  gridCellText: { fontFamily: 'SpaceMono_700Bold', fontSize: 10 },

  legend: { flexDirection: 'row', justifyContent: 'center', gap: 16, marginBottom: 24 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 12, height: 12, borderRadius: 6 },
  legendText: { fontFamily: 'Inter_500Medium', fontSize: 12 },

  teacherBar: { flexDirection: 'row', padding: 16, paddingTop: 60, alignItems: 'center' },
  teacherBarTitle: { fontFamily: 'Unbounded_700Bold', fontSize: 16, color: '#fff' },
  teacherBarSub: { fontFamily: 'SpaceMono_400Regular', fontSize: 11, color: 'rgba(255,255,255,0.70)', marginTop: 2 },
  modeBtn: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, alignItems: 'center', gap: 6 },
  modeBtnText: { fontFamily: 'SpaceMono_700Bold', fontSize: 10, color: '#fff', letterSpacing: 1 },
  teacherBanner: { margin: 16, borderRadius: 20, padding: 24, marginBottom: 16, flexDirection: 'row', alignItems: 'center' },
  teacherBannerTitle: { fontFamily: 'Unbounded_900Black', fontSize: 22, color: '#fff' },
  teacherBannerDate: { fontFamily: 'SpaceMono_400Regular', fontSize: 11, color: 'rgba(255,255,255,0.70)', marginTop: 8, letterSpacing: 1 },
  iconBtn: { padding: 8 },
  batchPill: { borderWidth: 1, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, marginHorizontal: 4 },
  batchPillText: { fontFamily: 'SpaceMono_400Regular', fontSize: 12 },
  quickActions: { flexDirection: 'row', paddingHorizontal: 16, marginBottom: 12, gap: 10 },
  quickBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1, borderRadius: 12, paddingVertical: 12 },
  quickBtnText: { fontFamily: 'SpaceMono_700Bold', fontSize: 10, letterSpacing: 1 },
  studentCard: { flexDirection: 'row', marginHorizontal: 16, marginBottom: 8, padding: 14, borderRadius: 14, alignItems: 'center' },
  studentName: { fontFamily: 'Inter_600SemiBold', fontSize: 15 },
  studentMeta: { fontFamily: 'SpaceMono_400Regular', fontSize: 11, marginTop: 2 },
  markButtons: { flexDirection: 'row', gap: 8 },
  markBtn: { width: 42, height: 42, borderRadius: 12, justifyContent: 'center', alignItems: 'center', borderWidth: 2 },
  markBtnText: { fontFamily: 'Unbounded_700Bold', fontSize: 14 },
  markedCountText: { fontFamily: 'SpaceMono_400Regular', fontSize: 11, textAlign: 'center', marginBottom: 8 },
  emptyText: { textAlign: 'center', marginTop: 40, fontFamily: 'Inter_400Regular', fontStyle: 'italic' },
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.60)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  modalTitle: { fontFamily: 'Unbounded_700Bold', fontSize: 18 },
  monthPill: { borderWidth: 1, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, marginHorizontal: 4 },
  monthPillText: { fontFamily: 'SpaceMono_400Regular', fontSize: 12 },
  percentText: { fontFamily: 'Unbounded_700Bold', fontSize: 14 },
  studentId: { fontFamily: 'SpaceMono_400Regular', fontSize: 11, marginTop: 4 },
});
