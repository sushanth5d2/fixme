import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Colors, FontSize, FontWeight, Spacing, BorderRadius } from '../../theme/tokens';
import { api } from '../../services/api';

interface CustomerJob {
  id: string;
  requestId: string;
  status: string;
  agreedTotal: number;
  scheduledAt?: string | null;
  scheduledDate?: string | null;
  scheduledTimeSlot?: string | null;
  fixer?: {
    id: string;
    ownerName: string;
    companyName: string;
    averageRating: number;
  };
  request?: {
    id: string;
    deviceModel?: string | null;
    problemTitle?: string | null;
    problemDescription?: string | null;
    category?: { name: string };
  };
  createdAt: string;
}

const JOB_STATUS_MAP: Record<string, { label: string; color: string }> = {
  ASSIGNED: { label: 'Assigned', color: Colors.info },
  FIXER_ON_THE_WAY: { label: 'Fixer En Route 🚗', color: '#8B5CF6' },
  DEVICE_RECEIVED: { label: 'Device Received 📦', color: '#8B5CF6' },
  DIAGNOSING: { label: 'Diagnosing 🔍', color: '#8B5CF6' },
  REPAIR_IN_PROGRESS: { label: 'Repairing 🔧', color: '#F97316' },
  READY_FOR_DELIVERY: { label: 'Ready for Delivery 🎉', color: Colors.success },
  COMPLETED: { label: 'Completed ✅', color: Colors.success },
  CANCELLED: { label: 'Cancelled ❌', color: Colors.error },
};

export function CustomerJobsListScreen({ navigation }: any) {
  const [jobs, setJobs] = useState<CustomerJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchJobs = useCallback(async () => {
    try {
      const { data } = await api.get('/jobs/mine/customer');
      const raw = data?.data;
      const items: CustomerJob[] = Array.isArray(raw?.data)
        ? raw.data
        : Array.isArray(raw)
        ? raw
        : [];
      setJobs(items);
    } catch (err) {
      console.error('[Fetch Customer Jobs Error]', err);
      setJobs([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchJobs();
    }, [fetchJobs]),
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchJobs();
  };

  const renderItem = ({ item }: { item: CustomerJob }) => {
    const statusCfg = JOB_STATUS_MAP[item.status] || { label: item.status, color: Colors.muted };
    const deviceName = item.request?.deviceModel || item.request?.category?.name || 'Device Repair';
    const fixerName = item.fixer?.companyName || item.fixer?.ownerName || 'Assigned Fixer';

    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.7}
        onPress={() => navigation.navigate('JobDetail', { jobId: item.id })}
      >
        <View style={styles.cardHeader}>
          <Text style={styles.deviceName}>{deviceName}</Text>
          <View style={[styles.badge, { backgroundColor: statusCfg.color + '18' }]}>
            <Text style={[styles.badgeText, { color: statusCfg.color }]}>{statusCfg.label}</Text>
          </View>
        </View>

        <Text style={styles.fixerName}>👨‍🔧 {fixerName}</Text>

        <View style={styles.cardFooter}>
          <Text style={styles.amount}>₹{Number(item.agreedTotal || 0).toLocaleString('en-IN')}</Text>
          <Text style={styles.date}>
            {new Date(item.createdAt).toLocaleDateString('en-IN', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            })}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading && jobs.length === 0) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.accent} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={jobs}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>🔧</Text>
            <Text style={styles.emptyTitle}>No active jobs</Text>
            <Text style={styles.emptyText}>When you accept a quote from a fixer, your repair job will appear here.</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { padding: Spacing.base },
  card: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  deviceName: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.bold,
    color: Colors.text,
    flex: 1,
  },
  badge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
  },
  badgeText: { fontSize: FontSize.xs, fontWeight: FontWeight.bold },
  fixerName: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
    paddingTop: Spacing.xs,
  },
  amount: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.bold,
    color: Colors.accent,
  },
  date: { fontSize: FontSize.xs, color: Colors.muted },
  empty: { alignItems: 'center', paddingTop: Spacing.xxxl, paddingHorizontal: Spacing.xl },
  emptyIcon: { fontSize: 48, marginBottom: Spacing.md },
  emptyTitle: { fontSize: FontSize.md, fontWeight: FontWeight.semibold, color: Colors.text, marginBottom: Spacing.xs },
  emptyText: { fontSize: FontSize.sm, color: Colors.muted, textAlign: 'center', lineHeight: 20 },
});
