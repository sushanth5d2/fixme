import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Colors, FontSize, FontWeight, Spacing, BorderRadius } from '../../theme/tokens';
import { api } from '../../services/api';

interface Quote {
  id: string;
  amount: number;
  status: string;
  diagnosisNotes: string | null;
  warrantyDays: number;
  request: { description: string; category: { name: string }; deviceModel: string | null };
  createdAt: string;
}

const STATUS_CONFIG: Record<string, { color: string; label: string }> = {
  SUBMITTED: { color: Colors.info, label: 'Submitted' },
  VIEWED: { color: Colors.warning, label: 'Viewed' },
  ACCEPTED: { color: Colors.success, label: 'Accepted' },
  REJECTED: { color: Colors.error, label: 'Rejected' },
  WITHDRAWN: { color: Colors.muted, label: 'Withdrawn' },
  EXPIRED: { color: Colors.muted, label: 'Expired' },
};

export function MyQuotesScreen() {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetch = useCallback(async () => {
    try {
      const { data } = await api.get('/quotes/mine?limit=30');
      const raw = data?.data;
      const items: Quote[] = Array.isArray(raw?.data)
        ? raw.data
        : Array.isArray(raw)
        ? raw
        : [];
      setQuotes(items);
    } catch {} finally { setLoading(false); setRefreshing(false); }
  }, []);

  useFocusEffect(useCallback(() => { fetch(); }, []));

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={Colors.accent} /></View>;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>My Quotes</Text>
        <Text style={styles.count}>{quotes.length} total</Text>
      </View>

      <FlatList
        data={quotes}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetch(); }} />}
        renderItem={({ item }) => {
          const status = STATUS_CONFIG[item.status] || { color: Colors.muted, label: item.status };
          return (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.category}>{item.request?.category?.name}</Text>
                <View style={[styles.badge, { backgroundColor: status.color + '18' }]}>
                  <Text style={[styles.badgeText, { color: status.color }]}>{status.label}</Text>
                </View>
              </View>
              {item.request?.deviceModel && <Text style={styles.model}>{item.request.deviceModel}</Text>}
              <Text style={styles.desc} numberOfLines={2}>{item.request?.description}</Text>

              <View style={styles.cardFooter}>
                <Text style={styles.amount}>₹{Number(item.amount).toLocaleString('en-IN')}</Text>
                <Text style={styles.warranty}>{item.warrantyDays}d warranty</Text>
                <Text style={styles.date}>
                  {new Date(item.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                </Text>
              </View>
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>💰</Text>
            <Text style={styles.emptyTitle}>No quotes yet</Text>
            <Text style={styles.emptyText}>Go to the Feed tab to submit quotes on repair requests</Text>
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
    backgroundColor: Colors.white, paddingHorizontal: Spacing.xl, paddingTop: Spacing.xxxl + 10, paddingBottom: Spacing.base,
  },
  title: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: Colors.text },
  count: { fontSize: FontSize.sm, color: Colors.muted },
  list: { padding: Spacing.base, paddingTop: Spacing.md },
  card: {
    backgroundColor: Colors.card, borderRadius: BorderRadius.lg, padding: Spacing.base,
    marginBottom: Spacing.md, borderWidth: 1, borderColor: Colors.borderLight,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm },
  category: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold, color: Colors.text },
  badge: { paddingHorizontal: Spacing.sm, paddingVertical: 2, borderRadius: BorderRadius.full },
  badgeText: { fontSize: FontSize.xs, fontWeight: FontWeight.semibold },
  model: { fontSize: FontSize.sm, color: Colors.accent, fontWeight: FontWeight.medium, marginBottom: Spacing.xs },
  desc: { fontSize: FontSize.sm, color: Colors.textSecondary, lineHeight: 20, marginBottom: Spacing.md },
  cardFooter: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  amount: { fontSize: FontSize.base, fontWeight: FontWeight.bold, color: Colors.text },
  warranty: { fontSize: FontSize.xs, color: Colors.muted, backgroundColor: Colors.bg, paddingHorizontal: Spacing.sm, paddingVertical: 2, borderRadius: BorderRadius.full },
  date: { fontSize: FontSize.xs, color: Colors.muted, marginLeft: 'auto' },
  empty: { alignItems: 'center', paddingTop: Spacing.xxxl },
  emptyIcon: { fontSize: 48, marginBottom: Spacing.md },
  emptyTitle: { fontSize: FontSize.md, fontWeight: FontWeight.semibold, color: Colors.text, marginBottom: Spacing.xs },
  emptyText: { fontSize: FontSize.sm, color: Colors.muted, textAlign: 'center', paddingHorizontal: Spacing.xl },
});
