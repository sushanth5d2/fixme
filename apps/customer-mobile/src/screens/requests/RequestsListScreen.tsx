import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { Colors, FontSize, FontWeight, Spacing, BorderRadius } from '../../theme/tokens';
import { api } from '../../services/api';

interface RepairRequest {
  id: string;
  description: string;
  status: string;
  priority: string;
  deviceModel: string | null;
  category: { name: string };
  brand: { name: string } | null;
  createdAt: string;
}

const STATUS_CONFIG: Record<string, { color: string; label: string }> = {
  OPEN: { color: Colors.info, label: 'Open' },
  QUOTED: { color: Colors.warning, label: 'Quotes Received' },
  CUSTOMER_ACCEPTED: { color: Colors.accent, label: 'Accepted' },
  ASSIGNED: { color: Colors.accent, label: 'Assigned' },
  FIXER_ON_THE_WAY: { color: '#8B5CF6', label: 'Fixer En Route' },
  DEVICE_RECEIVED: { color: '#8B5CF6', label: 'Device Received' },
  DIAGNOSING: { color: '#8B5CF6', label: 'Diagnosing' },
  REPAIR_IN_PROGRESS: { color: '#F97316', label: 'Repairing' },
  READY_FOR_DELIVERY: { color: Colors.success, label: 'Ready' },
  COMPLETED: { color: Colors.success, label: 'Completed' },
  CANCELLED: { color: Colors.error, label: 'Cancelled' },
  REVIEWED: { color: Colors.success, label: 'Reviewed' },
};

export function RequestsListScreen({ navigation }: any) {
  const [requests, setRequests] = useState<RepairRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const fetchRequests = useCallback(async (p = 1, refresh = false) => {
    try {
      const { data } = await api.get(`/repair-requests/mine?page=${p}&limit=15`);
      const items = data.data || [];
      if (refresh) {
        setRequests(items);
      } else {
        setRequests((prev) => [...prev, ...items]);
      }
      setHasMore(items.length === 15);
      setPage(p);
    } catch {} finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchRequests(1, true); }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchRequests(1, true);
  };

  const onEndReached = () => {
    if (hasMore && !loading) fetchRequests(page + 1);
  };

  const renderItem = ({ item }: { item: RepairRequest }) => {
    const status = STATUS_CONFIG[item.status] || { color: Colors.muted, label: item.status };
    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.7}
        onPress={() => navigation.navigate('HomeTab', {
          screen: 'RequestDetail',
          params: { requestId: item.id },
        })}
      >
        <View style={styles.cardHeader}>
          <Text style={styles.category}>{item.category?.name}</Text>
          <View style={[styles.badge, { backgroundColor: status.color + '18' }]}>
            <Text style={[styles.badgeText, { color: status.color }]}>{status.label}</Text>
          </View>
        </View>
        {item.deviceModel && (
          <Text style={styles.model}>{item.deviceModel}</Text>
        )}
        <Text style={styles.desc} numberOfLines={2}>{item.description}</Text>
        <Text style={styles.date}>
          {new Date(item.createdAt).toLocaleDateString('en-IN', {
            day: 'numeric', month: 'short', year: 'numeric',
          })}
        </Text>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color={Colors.accent} /></View>;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>My Requests</Text>
        <Text style={styles.count}>{requests.length} total</Text>
      </View>
      <FlatList
        data={requests}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        onEndReached={onEndReached}
        onEndReachedThreshold={0.3}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>📋</Text>
            <Text style={styles.emptyTitle}>No requests yet</Text>
            <Text style={styles.emptyText}>Tap the Home tab to create your first repair request</Text>
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
    paddingHorizontal: Spacing.xl, paddingTop: Spacing.xxxl + 10, paddingBottom: Spacing.base,
    backgroundColor: Colors.white,
  },
  title: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: Colors.text },
  count: { fontSize: FontSize.sm, color: Colors.muted },
  list: { padding: Spacing.xl, paddingTop: Spacing.md },
  card: {
    backgroundColor: Colors.card, borderRadius: BorderRadius.lg, padding: Spacing.base,
    marginBottom: Spacing.md, borderWidth: 1, borderColor: Colors.borderLight,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm },
  category: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold, color: Colors.text },
  badge: { paddingHorizontal: Spacing.sm, paddingVertical: 2, borderRadius: BorderRadius.full },
  badgeText: { fontSize: FontSize.xs, fontWeight: FontWeight.semibold },
  model: { fontSize: FontSize.sm, color: Colors.textSecondary, marginBottom: Spacing.xs },
  desc: { fontSize: FontSize.sm, color: Colors.textSecondary, lineHeight: 20, marginBottom: Spacing.sm },
  date: { fontSize: FontSize.xs, color: Colors.muted },
  empty: { alignItems: 'center', paddingTop: Spacing.xxxl },
  emptyIcon: { fontSize: 48, marginBottom: Spacing.md },
  emptyTitle: { fontSize: FontSize.md, fontWeight: FontWeight.semibold, color: Colors.text, marginBottom: Spacing.xs },
  emptyText: { fontSize: FontSize.sm, color: Colors.muted, textAlign: 'center' },
});
