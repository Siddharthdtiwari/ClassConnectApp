import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, RefreshControl, TouchableOpacity } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import client from '../../api/client';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import GlassCard from '../../components/GlassCard';
import { useTheme } from '../../context/ThemeContext';

export default function ReportsScreen() {
  const { user } = useAuth();
  const [revenue, setRevenue] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('Audit');
  const [auditLogs, setAuditLogs] = useState([]);
  const [commLogs, setCommLogs] = useState([]);
  const [consolidated, setConsolidated] = useState<Record<string, any>>({});
  const [scoresBatch, setScoresBatch] = useState<string | null>(null);
  const { colors, isDark } = useTheme();

  const fetchReports = async () => {
    try {
      const [revRes, auditRes, commRes, scoresRes] = await Promise.all([
        client.get('/teacher/reports/revenue'),
        client.get('/teacher/reports/audit'),
        client.get('/teacher/reports/communications'),
        client.get('/teacher/scores/consolidated')
      ]);
      setRevenue(revRes.data);
      setAuditLogs(auditRes.data.logs || []);
      setCommLogs(commRes.data.logs || []);
      const consolidatedData = scoresRes.data && typeof scoresRes.data === 'object' ? scoresRes.data : {};
      setConsolidated(consolidatedData);
      const batchNames = Object.keys(consolidatedData);
      if (batchNames.length > 0) setScoresBatch((prev) => prev && consolidatedData[prev] ? prev : batchNames[0]);
    } catch (err) {
      console.error('Failed to fetch reports', err);
    } finally { setLoading(false); setRefreshing(false); }
  };

  useEffect(() => { fetchReports(); }, []);

  if (loading) return <View style={[styles.center, { backgroundColor: 'transparent' }]}><ActivityIndicator size="large" color={colors.p} /></View>;

  return (
    <View style={{ flex: 1, backgroundColor: 'transparent' }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 100 }} refreshControl={<RefreshControl refreshing={refreshing} colors={[colors.p]} onRefresh={() => { setRefreshing(true); fetchReports(); }} />}>
        
        <LinearGradient colors={[colors.p, colors.pm]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.banner}>
          <Text style={styles.bannerTitle}>System Reports</Text>
          <Text style={styles.bannerSub}>Monitor activity and logs</Text>
        </LinearGradient>

        <View style={[styles.tabContainer, { backgroundColor: isDark ? colors.bg2 : 'rgba(255,255,255,0.5)' }]}>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'Revenue' && [styles.activeTab, { backgroundColor: isDark ? colors.bg2 : '#fff' }]]} 
            onPress={() => setActiveTab('Revenue')}
          >
            <Text style={[styles.tabText, { color: colors.fdd }, activeTab === 'Revenue' && [styles.activeTabText, { color: colors.p }]]}>Revenue</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'Audit' && [styles.activeTab, { backgroundColor: isDark ? colors.bg2 : '#fff' }]]} 
            onPress={() => setActiveTab('Audit')}
          >
            <Text style={[styles.tabText, { color: colors.fdd }, activeTab === 'Audit' && [styles.activeTabText, { color: colors.p }]]}>Audit Logs</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'Communications' && [styles.activeTab, { backgroundColor: isDark ? colors.bg2 : '#fff' }]]}
            onPress={() => setActiveTab('Communications')}
          >
            <Text style={[styles.tabText, { color: colors.fdd }, activeTab === 'Communications' && [styles.activeTabText, { color: colors.p }]]}>Comms</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'Scores' && [styles.activeTab, { backgroundColor: isDark ? colors.bg2 : '#fff' }]]}
            onPress={() => setActiveTab('Scores')}
          >
            <Text style={[styles.tabText, { color: colors.fdd }, activeTab === 'Scores' && [styles.activeTabText, { color: colors.p }]]}>Scores</Text>
          </TouchableOpacity>
        </View>

        {activeTab === 'Revenue' ? (
          <View>
            <GlassCard style={styles.revenueCard}>
              <Text style={[styles.cardTitle, { color: colors.fg }]}>Total Revenue</Text>
              <Text style={[styles.revenueAmount, { color: colors.gt }]}>₹{revenue?.totalRevenue || 0}</Text>
              <Text style={[styles.metaText, { color: colors.fdd }]}>From {revenue?.paymentCount || 0} successful payments</Text>
              
              <View style={styles.divider} />
              
              <Text style={[styles.cardTitle, { color: colors.fg }]}>Payment Methods</Text>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
                <View style={[styles.methodBox, { backgroundColor: isDark ? colors.bg2 : '#F5F1FC' }]}>
                  <Text style={[styles.methodTitle, { color: colors.fdd }]}>UPI</Text>
                  <Text style={[styles.methodValue, { color: colors.p }]}>{revenue?.methodStats?.UPI || 0}</Text>
                </View>
                <View style={[styles.methodBox, { backgroundColor: isDark ? colors.bg2 : '#F5F1FC' }]}>
                  <Text style={[styles.methodTitle, { color: colors.fdd }]}>Cash</Text>
                  <Text style={[styles.methodValue, { color: colors.p }]}>{revenue?.methodStats?.Cash || 0}</Text>
                </View>
                <View style={[styles.methodBox, { backgroundColor: isDark ? colors.bg2 : '#F5F1FC' }]}>
                  <Text style={[styles.methodTitle, { color: colors.fdd }]}>Razorpay</Text>
                  <Text style={[styles.methodValue, { color: colors.p }]}>{revenue?.methodStats?.Razorpay || 0}</Text>
                </View>
              </View>
            </GlassCard>

            <GlassCard style={styles.revenueCard}>
              <Text style={[styles.cardTitle, { color: colors.fg }]}>Monthly Breakdown</Text>
              {revenue?.monthlyRevenue && Object.entries(revenue.monthlyRevenue).map(([month, amt]: any) => {
                if (amt === 0) return null;
                return (
                  <View key={month} style={[styles.monthRow, { borderBottomColor: colors.b }]}>
                    <Text style={[styles.monthName, { color: colors.fg }]}>{month}</Text>
                    <Text style={[styles.monthAmt, { color: colors.gt }]}>₹{amt}</Text>
                  </View>
                );
              })}
            </GlassCard>
          </View>
        ) : activeTab === 'Audit' ? (
          auditLogs.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={{ fontSize: 40 }}>📝</Text>
              <Text style={[styles.emptyText, { color: colors.fdd }]}>No audit logs found.</Text>
            </View>
          ) : (
            auditLogs.map((log: any, index: number) => (
              <GlassCard key={index} style={styles.card}>
                <View style={[styles.iconBox, { backgroundColor: isDark ? colors.bg2 : '#F5F1FC' }]}>
                  <Ionicons name="document-text" size={20} color={colors.p} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.actionText, { color: colors.fg }]}>{log.action} {log.entityType}</Text>
                  <Text style={[styles.detailsText, { color: colors.fdd }]}>{log.details}</Text>
                  <Text style={[styles.dateText, { color: colors.fdd }]}>{new Date(log.createdAt).toLocaleString()}</Text>
                </View>
              </GlassCard>
            ))
          )
        ) : activeTab === 'Scores' ? (
          Object.keys(consolidated).length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={{ fontSize: 40 }}>📊</Text>
              <Text style={[styles.emptyText, { color: colors.fdd }]}>No scores recorded yet.</Text>
            </View>
          ) : (
            <View>
              {/* Batch pills */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ paddingHorizontal: 12, marginBottom: 16 }}>
                {Object.keys(consolidated).map((name) => (
                  <TouchableOpacity key={name} onPress={() => setScoresBatch(name)}
                    style={[styles.batchPill, { backgroundColor: isDark ? colors.bg2 : 'rgba(255,255,255,0.8)', borderColor: colors.b }, scoresBatch === name && { backgroundColor: colors.pm, borderColor: colors.pm }]}>
                    <Text style={[styles.batchPillText, { color: colors.fdd }, scoresBatch === name && { color: '#fff' }]}>{name}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {scoresBatch && consolidated[scoresBatch] && (
                <GlassCard style={[styles.revenueCard, { padding: 12 }]}>
                  <ScrollView horizontal>
                    <View>
                      {/* Header row: test names */}
                      <View style={{ flexDirection: 'row' }}>
                        <View style={[styles.scoreNameCell, { borderColor: colors.b }]}>
                          <Text style={[styles.scoreHeaderText, { color: colors.fdd }]}>STUDENT</Text>
                        </View>
                        {consolidated[scoresBatch].tests.map((t: any) => (
                          <View key={t._id} style={[styles.scoreCell, { borderColor: colors.b }]}>
                            <Text style={[styles.scoreHeaderText, { color: colors.fdd }]} numberOfLines={2}>
                              {t.testName || t.subject}
                            </Text>
                          </View>
                        ))}
                      </View>
                      {/* Student rows */}
                      {consolidated[scoresBatch].students.map((s: any) => (
                        <View key={s.studentId} style={{ flexDirection: 'row' }}>
                          <View style={[styles.scoreNameCell, { borderColor: colors.b }]}>
                            <Text style={[styles.scoreNameText, { color: colors.fg }]} numberOfLines={1}>{s.studentName}</Text>
                          </View>
                          {consolidated[scoresBatch].tests.map((t: any) => {
                            const pct = s.scores?.[t._id];
                            return (
                              <View key={t._id} style={[styles.scoreCell, { borderColor: colors.b }]}>
                                <Text style={[styles.scoreCellText, {
                                  color: pct === undefined ? colors.fdd : pct >= 70 ? colors.gt : pct >= 40 ? '#d97706' : colors.rt
                                }]}>
                                  {pct === undefined ? '—' : `${Math.round(pct)}%`}
                                </Text>
                              </View>
                            );
                          })}
                        </View>
                      ))}
                    </View>
                  </ScrollView>
                </GlassCard>
              )}
            </View>
          )
        ) : (
          commLogs.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={{ fontSize: 40 }}>💬</Text>
              <Text style={[styles.emptyText, { color: colors.fdd }]}>No communication logs found.</Text>
            </View>
          ) : (
            commLogs.map((log: any, index: number) => (
              <GlassCard key={index} style={styles.card}>
                <View style={[styles.iconBox, { backgroundColor: isDark ? colors.bg2 : '#F5F1FC' }]}>
                  <Ionicons name={log.type === 'SMS' ? 'chatbubble' : 'mail'} size={20} color={colors.gt} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.actionText, { color: colors.fg }]}>{log.type} to {log.recipient}</Text>
                  <Text style={[styles.detailsText, { color: colors.fdd }]}>{log.message}</Text>
                  <Text style={[styles.dateText, { color: colors.fdd }]}>{new Date(log.dateSent).toLocaleString()}</Text>
                </View>
              </GlassCard>
            ))
          )
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  banner: { margin: 16, borderRadius: 20, padding: 24, marginBottom: 16 },
  bannerTitle: { fontFamily: 'Unbounded_900Black', fontSize: 22, color: '#fff' },
  bannerSub: { fontFamily: 'SpaceMono_400Regular', fontSize: 11, color: 'rgba(255,255,255,0.70)', marginTop: 8, letterSpacing: 1 },
  iconBox: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  
  tabContainer: { flexDirection: 'row', marginHorizontal: 16, marginBottom: 16, borderRadius: 12, padding: 4 },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8 },
  activeTab: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  tabText: { fontFamily: 'Inter_600SemiBold', fontSize: 11 },
  activeTabText: { },
  
  revenueCard: { marginHorizontal: 16, marginBottom: 16, padding: 20 },
  cardTitle: { fontFamily: 'Unbounded_700Bold', fontSize: 15, marginBottom: 12 },
  revenueAmount: { fontFamily: 'Unbounded_900Black', fontSize: 32 },
  metaText: { fontFamily: 'SpaceMono_400Regular', fontSize: 11, marginTop: 4 },
  divider: { height: 1, backgroundColor: 'rgba(12,12,12,0.06)', marginVertical: 16 },
  
  methodBox: { flex: 1, padding: 12, borderRadius: 12, alignItems: 'center', marginHorizontal: 4 },
  methodTitle: { fontFamily: 'SpaceMono_400Regular', fontSize: 11 },
  methodValue: { fontFamily: 'Unbounded_700Bold', fontSize: 16, marginTop: 4 },

  monthRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1 },
  monthName: { fontFamily: 'Inter_400Regular', fontSize: 14 },
  monthAmt: { fontFamily: 'SpaceMono_700Bold', fontSize: 14 },

  card: { marginHorizontal: 16, marginBottom: 10, padding: 16, borderRadius: 16, flexDirection: 'row', alignItems: 'center' },
  actionText: { fontFamily: 'SpaceMono_700Bold', fontSize: 12 },
  detailsText: { fontFamily: 'Inter_400Regular', fontSize: 13, marginTop: 4 },
  dateText: { fontFamily: 'SpaceMono_400Regular', fontSize: 10, marginTop: 8 },
  
  emptyContainer: { justifyContent: 'center', alignItems: 'center', paddingTop: 60 },
  emptyText: { fontFamily: 'Inter_400Regular', fontSize: 15, marginTop: 12 },

  // Consolidated scores
  batchPill: { borderWidth: 1, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, marginHorizontal: 4 },
  batchPillText: { fontFamily: 'SpaceMono_400Regular', fontSize: 12 },
  scoreNameCell: { width: 120, paddingVertical: 10, paddingHorizontal: 8, borderWidth: 0.5, justifyContent: 'center' },
  scoreCell: { width: 76, paddingVertical: 10, paddingHorizontal: 4, borderWidth: 0.5, alignItems: 'center', justifyContent: 'center' },
  scoreHeaderText: { fontFamily: 'SpaceMono_700Bold', fontSize: 9, letterSpacing: 0.5, textAlign: 'center' },
  scoreNameText: { fontFamily: 'Inter_600SemiBold', fontSize: 11 },
  scoreCellText: { fontFamily: 'SpaceMono_700Bold', fontSize: 11 },
});
