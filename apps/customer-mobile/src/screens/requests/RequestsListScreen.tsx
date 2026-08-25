import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Colors, FontSize, FontWeight, Spacing, BorderRadius } from '../../theme/tokens';
import { api } from '../../services/api';

interface RepairRequest {
  id: string;
  problemTitle?: string;
  problemDescription?: string;
  description?: string;
  status: string;
  priority?: string;
  urgency?: string;
  deviceModel: string | null;
  category: { name: string };
  brand: { name: string } | null;
  area?: string | null;
  city?: string | null;
  pincode?: string | null;
  media?: Array<{ id: string; storageKey: string }>;
  createdAt: string;
}

const STATUS_CONFIG: Record<string, { color: string; label: string }> = {
  OPEN: { color: Colors.info, label: 'Open' },
  QUOTED: { color: Colors.warning, label: 'Quotes Received' },
  CUSTOMER_ACCEPTED: { color: Colors.accent, label: 'Accepted' },
  ASSIGNED: { color: Colors.accent, label: 'Fixer Assigned' },
  FIXER_ON_THE_WAY: { color: '#8B5CF6', label: 'Fixer On the Way 🚗' },
  DEVICE_RECEIVED: { color: '#8B5CF6', label: 'Device Received 📦' },
  DIAGNOSING: { color: '#D97706', label: 'Diagnosing 🔍' },
  REPAIR_IN_PROGRESS: { color: '#EA580C', label: 'Repair in Progress 🔧' },
  READY_FOR_DELIVERY: { color: Colors.success, label: 'Ready for Delivery ✅' },
  COMPLETED: { color: Colors.success, label: 'Completed 🎉' },
  CANCELLED: { color: Colors.error, label: 'Cancelled ❌' },
  REVIEWED: { color: Colors.success, label: 'Reviewed ★' },
};

export function RequestsListScreen({ navigation }: any) {
  const [requests, setRequests] = useState<RepairRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [totalCount, setTotalCount] = useState(0);

  const fetchRequests = useCallback(async (refresh = false) => {
    try {
      const { data } = await api.get('/repair-requests/mine?limit=100');
      const raw = data?.data;
      const items: RepairRequest[] = Array.isArray(raw?.data)
        ? raw.data
        : Array.isArray(raw)
        ? raw
        : [];
      const total = typeof raw?.total === 'number' ? raw.total : items.length;
      setTotalCount(total);
      setRequests(items);
    } catch (err) {
      console.error('[Fetch Requests Error]', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchRequests(true);
    }, [fetchRequests]),
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchRequests(true);
  };

  const filteredRequests = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return requests;

    return requests.filter((r) => {
      const cat = (r.category?.name || '').toLowerCase();
      const brand = (r.brand?.name || '').toLowerCase();
      const model = (r.deviceModel || '').toLowerCase();
      const desc = (r.problemDescription || r.description || r.problemTitle || '').toLowerCase();
      const area = (r.area || '').toLowerCase();
      const city = (r.city || '').toLowerCase();
      const pincode = (r.pincode || '').toLowerCase();
      const statusLabel = (STATUS_CONFIG[r.status]?.label || r.status || '').toLowerCase();

      return (
        cat.includes(q) ||
        brand.includes(q) ||
        model.includes(q) ||
        desc.includes(q) ||
        area.includes(q) ||
        city.includes(q) ||
        pincode.includes(q) ||
        statusLabel.includes(q)
      );
    });
  }, [requests, searchQuery]);

  const renderItem = ({ item }: { item: RepairRequest }) => {
    const status = STATUS_CONFIG[item.status] || { color: Colors.muted, label: item.status };
    const desc = item.problemDescription || item.description || '';
    const location = item.area || item.city ? `${item.area ? item.area + ', ' : ''}${item.city || ''}` : '';

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
          <Text style={styles.category}>{item.category?.name || 'Device Repair'}</Text>
          <View style={[styles.badge, { backgroundColor: status.color + '18' }]}>
            <Text style={[styles.badgeText, { color: status.color }]}>{status.label}</Text>
          </View>
        </View>

        {item.deviceModel ? (
          <Text style={styles.model}>{item.deviceModel}</Text>
        ) : null}

        <Text style={styles.desc} numberOfLines={2}>{desc}</Text>

        <View style={styles.cardFooter}>
          {location ? (
            <Text style={styles.location}>📍 {location}</Text>
          ) : (
            <View />
          )}
          <Text style={styles.date}>
            {new Date(item.createdAt).toLocaleDateString('en-IN', {
              day: 'numeric', month: 'short', year: 'numeric',
            })}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading && requests.length === 0) {
    return <View style={styles.center}><ActivityIndicator size="large" color={Colors.accent} /></View>;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTitleRow}>
          <Text style={styles.title}>My Requests 📋</Text>
          <Text style={styles.count}>{filteredRequests.length} matching</Text>
        </View>

        {/* Search Bar */}
        <View style={styles.searchBar}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search requests by device, problem, status..."
            placeholderTextColor={Colors.muted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            clearButtonMode="while-editing"
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Text style={styles.clearBtn}>✕</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      <FlatList
        data={filteredRequests}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>📋</Text>
            <Text style={styles.emptyTitle}>
              {searchQuery ? 'No matching requests' : 'No requests yet'}
            </Text>
            <Text style={styles.emptyText}>
              {searchQuery
                ? 'Try searching with another device keyword or status.'
                : 'Tap the Home tab to post your first repair request.'}
            </Text>
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
    paddingHorizontal: Spacing.base,
    paddingTop: Spacing.xl + 10,
    paddingBottom: Spacing.sm,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  headerTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  title: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.text },
  count: { fontSize: FontSize.xs, color: Colors.muted, fontWeight: FontWeight.medium },

  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    marginTop: 2,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  searchIcon: { fontSize: 14, marginRight: 6 },
  searchInput: { flex: 1, fontSize: FontSize.sm, color: Colors.text, padding: 0 },
  clearBtn: { fontSize: 14, color: Colors.muted, paddingHorizontal: 4 },

  list: { padding: Spacing.base, paddingTop: Spacing.md, paddingBottom: Spacing.xxxl },
  card: {
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 1,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.xs },
  category: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold, color: Colors.text },
  badge: { paddingHorizontal: Spacing.sm, paddingVertical: 2, borderRadius: BorderRadius.full },
  badgeText: { fontSize: FontSize.xs, fontWeight: FontWeight.semibold },
  model: { fontSize: FontSize.sm, color: Colors.accent, fontWeight: FontWeight.medium, marginBottom: Spacing.xs },
  desc: { fontSize: FontSize.sm, color: Colors.textSecondary, lineHeight: 20, marginBottom: Spacing.sm },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  location: { fontSize: FontSize.xs, color: Colors.muted },
  date: { fontSize: FontSize.xs, color: Colors.muted },
  empty: { alignItems: 'center', paddingTop: Spacing.xxxl },
  emptyIcon: { fontSize: 48, marginBottom: Spacing.md },
  emptyTitle: { fontSize: FontSize.md, fontWeight: FontWeight.semibold, color: Colors.text, marginBottom: Spacing.xs },
  emptyText: { fontSize: FontSize.sm, color: Colors.muted, textAlign: 'center', marginTop: 4, paddingHorizontal: Spacing.xl },
});
