import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Button } from '../../components/ui';
import { Colors, FontSize, FontWeight, Spacing, BorderRadius } from '../../theme/tokens';
import { api } from '../../services/api';

interface Job {
  id: string;
  status: string;
  scheduledDate: string | null;
  request: { description: string; category: { name: string } };
  customer: { firstName?: string };
  quote: { amount: number };
  createdAt: string;
}

const STATUS_CONFIG: Record<string, { color: string; label: string; icon: string }> = {
  ASSIGNED: { color: Colors.info, label: 'Assigned', icon: '📋' },
  FIXER_ON_THE_WAY: { color: '#8B5CF6', label: 'On the Way', icon: '🚗' },
  DEVICE_RECEIVED: { color: '#8B5CF6', label: 'Device Received', icon: '📦' },
  DIAGNOSING: { color: Colors.warning, label: 'Diagnosing', icon: '🔍' },
  REPAIR_IN_PROGRESS: { color: '#F97316', label: 'Repairing', icon: '🔧' },
  READY_FOR_DELIVERY: { color: Colors.success, label: 'Ready', icon: '✅' },
  COMPLETED: { color: Colors.success, label: 'Completed', icon: '🎉' },
  CANCELLED: { color: Colors.error, label: 'Cancelled', icon: '❌' },
};

export function MyJobsScreen({ navigation }: any) {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchJobs = useCallback(async () => {
    try {
      const { data } = await api.get('/jobs/mine/fixer?limit=30');
      const raw = data?.data;
      const items: Job[] = Array.isArray(raw?.data)
        ? raw.data
        : Array.isArray(raw)
        ? raw
        : [];
      setJobs(items);
    } catch {} finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { fetchJobs(); }, []));

  const renderItem = ({ item }: { item: Job }) => {
    const status = STATUS_CONFIG[item.status] || { color: Colors.muted, label: item.status, icon: '•' };
    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.7}
        onPress={() => navigation.navigate('JobDetail', { jobId: item.id })}
      >
        <View style={styles.cardHeader}>
          <Text style={styles.statusIcon}>{status.icon}</Text>
          <View style={styles.headerInfo}>
            <Text style={styles.category}>{item.request?.category?.name}</Text>
            <View style={[styles.badge, { backgroundColor: status.color + '18' }]}>
              <Text style={[styles.badgeText, { color: status.color }]}>{status.label}</Text>
            </View>
          </View>
        </View>

        <Text style={styles.desc} numberOfLines={2}>{item.request?.description}</Text>

        <View style={styles.cardFooter}>
          <Text style={styles.amount}>₹{Number(item.quote?.amount).toLocaleString('en-IN')}</Text>
          {item.scheduledDate && <Text style={styles.schedule}>📅 {item.scheduledDate}</Text>}
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={Colors.accent} /></View>;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>My Jobs</Text>
        <Text style={styles.count}>{jobs.length} jobs</Text>
      </View>
      <FlatList
        data={jobs}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchJobs(); }} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>🔧</Text>
            <Text style={styles.emptyTitle}>No jobs yet</Text>
            <Text style={styles.emptyText}>Jobs will appear here when a customer accepts your quote</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: Colors.white, paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xxxl + 10, paddingBottom: Spacing.base,
  },
  title: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: Colors.text },
  count: { fontSize: FontSize.sm, color: Colors.muted },
  list: { padding: Spacing.base, paddingTop: Spacing.md },
  card: {
    backgroundColor: Colors.card, borderRadius: BorderRadius.lg, padding: Spacing.base,
    marginBottom: Spacing.md, borderWidth: 1, borderColor: Colors.borderLight,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.sm },
  statusIcon: { fontSize: 24, marginRight: Spacing.md },
  headerInfo: { flex: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  category: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold, color: Colors.text },
  badge: { paddingHorizontal: Spacing.sm, paddingVertical: 2, borderRadius: BorderRadius.full },
  badgeText: { fontSize: FontSize.xs, fontWeight: FontWeight.semibold },
  desc: { fontSize: FontSize.sm, color: Colors.textSecondary, lineHeight: 20, marginBottom: Spacing.md },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  amount: { fontSize: FontSize.base, fontWeight: FontWeight.bold, color: Colors.text },
  schedule: { fontSize: FontSize.xs, color: Colors.muted },
  empty: { alignItems: 'center', paddingTop: Spacing.xxxl },
  emptyIcon: { fontSize: 48, marginBottom: Spacing.md },
  emptyTitle: { fontSize: FontSize.md, fontWeight: FontWeight.semibold, color: Colors.text, marginBottom: Spacing.xs },
  emptyText: { fontSize: FontSize.sm, color: Colors.muted, textAlign: 'center', paddingHorizontal: Spacing.xl },
});
