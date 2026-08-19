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

interface FeedRequest {
  id: string;
  description: string;
  status: string;
  priority: string;
  deviceModel: string | null;
  category: { name: string };
  brand: { name: string } | null;
  addressSnapshot: { city?: string; pincode?: string; area?: string } | null;
  createdAt: string;
}

const PRIORITY_COLORS: Record<string, string> = {
  LOW: Colors.muted,
  MEDIUM: Colors.info,
  HIGH: Colors.warning,
  EMERGENCY: Colors.error,
};

export function RequestFeedScreen({ navigation }: any) {
  const [requests, setRequests] = useState<FeedRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchFeed = useCallback(async () => {
    try {
      const { data } = await api.get('/repair-requests/feed?limit=30');
      setRequests(data.data || []);
    } catch {} finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchFeed(); }, []);

  const renderItem = ({ item }: { item: FeedRequest }) => {
    const priorityColor = PRIORITY_COLORS[item.priority] || Colors.muted;
    const location = item.addressSnapshot
      ? `${item.addressSnapshot.area || item.addressSnapshot.city || ''}, ${item.addressSnapshot.pincode || ''}`
      : 'Location not specified';

    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.7}
        onPress={() => navigation.navigate('RequestDetail', { requestId: item.id })}
      >
        <View style={styles.cardHeader}>
          <View style={styles.categoryRow}>
            <Text style={styles.category}>{item.category?.name}</Text>
            {item.brand && <Text style={styles.brand}> · {item.brand.name}</Text>}
          </View>
          <View style={[styles.priorityDot, { backgroundColor: priorityColor }]} />
        </View>

        {item.deviceModel && <Text style={styles.model}>{item.deviceModel}</Text>}
        <Text style={styles.desc} numberOfLines={3}>{item.description}</Text>

        <View style={styles.cardFooter}>
          <Text style={styles.location}>📍 {location}</Text>
          <Text style={styles.time}>
            {getTimeAgo(item.createdAt)}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.quoteBtn}
          onPress={() => navigation.navigate('SubmitQuote', {
            requestId: item.id,
            categoryName: item.category?.name,
          })}
        >
          <Text style={styles.quoteBtnText}>Send Quote →</Text>
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color={Colors.accent} /></View>;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Repair Requests</Text>
        <Text style={styles.subtitle}>Open requests in your area</Text>
      </View>
      <FlatList
        data={requests}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchFeed(); }} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>📭</Text>
            <Text style={styles.emptyTitle}>No open requests</Text>
            <Text style={styles.emptyText}>New repair requests matching your services will appear here</Text>
          </View>
        }
      />
    </View>
  );
}

function getTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    backgroundColor: Colors.primary, paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xxxl + 20, paddingBottom: Spacing.xl,
    borderBottomLeftRadius: BorderRadius.xl, borderBottomRightRadius: BorderRadius.xl,
  },
  title: { fontSize: FontSize.xxl, fontWeight: FontWeight.bold, color: Colors.white },
  subtitle: { fontSize: FontSize.sm, color: Colors.muted, marginTop: Spacing.xs },
  list: { padding: Spacing.base, paddingTop: Spacing.md },
  card: {
    backgroundColor: Colors.card, borderRadius: BorderRadius.lg, padding: Spacing.base,
    marginBottom: Spacing.md, borderWidth: 1, borderColor: Colors.borderLight,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm },
  categoryRow: { flexDirection: 'row', alignItems: 'center' },
  category: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold, color: Colors.text },
  brand: { fontSize: FontSize.sm, color: Colors.textSecondary },
  priorityDot: { width: 8, height: 8, borderRadius: 4 },
  model: { fontSize: FontSize.sm, color: Colors.accent, fontWeight: FontWeight.medium, marginBottom: Spacing.xs },
  desc: { fontSize: FontSize.sm, color: Colors.textSecondary, lineHeight: 20, marginBottom: Spacing.md },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: Spacing.md },
  location: { fontSize: FontSize.xs, color: Colors.muted },
  time: { fontSize: FontSize.xs, color: Colors.muted },
  quoteBtn: {
    backgroundColor: Colors.accentSoft, borderRadius: BorderRadius.md,
    paddingVertical: Spacing.sm, alignItems: 'center',
  },
  quoteBtnText: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold, color: Colors.accent },
  empty: { alignItems: 'center', paddingTop: Spacing.xxxl },
  emptyIcon: { fontSize: 48, marginBottom: Spacing.md },
  emptyTitle: { fontSize: FontSize.md, fontWeight: FontWeight.semibold, color: Colors.text, marginBottom: Spacing.xs },
  emptyText: { fontSize: FontSize.sm, color: Colors.muted, textAlign: 'center', paddingHorizontal: Spacing.xl },
});
