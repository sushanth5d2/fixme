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

interface FeedRequest {
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
  addressSnapshot?: {
    houseBuilding?: string;
    street?: string;
    area?: string;
    landmark?: string;
    city?: string;
    state?: string;
    pincode?: string;
    latitude?: number;
    longitude?: number;
  } | null;
  createdAt: string;
}

const PRIORITY_COLORS: Record<string, string> = {
  LOW: Colors.muted,
  MEDIUM: Colors.info,
  HIGH: Colors.warning,
  EMERGENCY: Colors.error,
};

function getTimeAgo(dateStr: string) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function RequestFeedScreen({ navigation }: any) {
  const [requests, setRequests] = useState<FeedRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [unreadNotifsCount, setUnreadNotifsCount] = useState(0);

  const fetchFeed = useCallback(async () => {
    try {
      const [feedRes, notifRes] = await Promise.all([
        api.get('/repair-requests/feed?limit=50').catch(() => null),
        api.get('/notifications/unread-count').catch(() => null),
      ]);

      if (notifRes?.data) {
        setUnreadNotifsCount(notifRes.data?.data?.count ?? notifRes.data?.count ?? 0);
      }

      const raw = feedRes?.data?.data;
      const items: FeedRequest[] = Array.isArray(raw?.data)
        ? raw.data
        : Array.isArray(raw)
        ? raw
        : [];
      setRequests(items);
    } catch (err) {
      console.error('[Fetch Fixer Feed Error]', err);
      setRequests([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchFeed();
    }, [fetchFeed]),
  );

  const filteredRequests = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return requests;

    return requests.filter((r) => {
      const cat = (r.category?.name || '').toLowerCase();
      const brand = (r.brand?.name || '').toLowerCase();
      const model = (r.deviceModel || '').toLowerCase();
      const desc = (r.problemDescription || r.description || r.problemTitle || '').toLowerCase();
      const locArea = (r.area || r.addressSnapshot?.area || '').toLowerCase();
      const locCity = (r.city || r.addressSnapshot?.city || '').toLowerCase();
      const locPin = (r.pincode || r.addressSnapshot?.pincode || '').toLowerCase();
      const urgency = (r.urgency || r.priority || '').toLowerCase();

      return (
        cat.includes(q) ||
        brand.includes(q) ||
        model.includes(q) ||
        desc.includes(q) ||
        locArea.includes(q) ||
        locCity.includes(q) ||
        locPin.includes(q) ||
        urgency.includes(q)
      );
    });
  }, [requests, searchQuery]);

  const renderItem = ({ item }: { item: FeedRequest }) => {
    const priority = item.urgency || item.priority || 'MEDIUM';
    const priorityColor = PRIORITY_COLORS[priority] || Colors.muted;
    const locArea = item.area || item.addressSnapshot?.area;
    const locCity = item.city || item.addressSnapshot?.city;
    const locPin = item.pincode || item.addressSnapshot?.pincode;
    const location = (locArea || locCity)
      ? `${locArea ? locArea + ', ' : ''}${locCity || ''} ${locPin ? '(' + locPin + ')' : ''}`
      : 'Location available';
    const desc = item.problemDescription || item.description || '';

    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.7}
        onPress={() => navigation.navigate('RequestDetail', { requestId: item.id })}
      >
        <View style={styles.cardHeader}>
          <View style={styles.categoryRow}>
            <Text style={styles.category}>{item.category?.name || 'Device Repair'}</Text>
            {item.brand?.name && <Text style={styles.brand}> · {item.brand.name}</Text>}
            {item.deviceModel && <Text style={styles.model}> {item.deviceModel}</Text>}
          </View>
          <View style={[styles.priorityBadge, { backgroundColor: priorityColor + '20' }]}>
            <Text style={[styles.priorityText, { color: priorityColor }]}>{priority}</Text>
          </View>
        </View>

        {desc ? (
          <Text style={styles.desc} numberOfLines={2}>
            {desc}
          </Text>
        ) : null}

        <View style={styles.cardFooter}>
          <Text style={styles.location}>📍 {location}</Text>
          <Text style={styles.time}>{getTimeAgo(item.createdAt)}</Text>
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

  if (loading && requests.length === 0) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.accent} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTitleRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Repair Requests 📋</Text>
            <Text style={styles.subtitle}>Browse open requests available for quotes ({filteredRequests.length} matching)</Text>
          </View>
          <TouchableOpacity
            style={styles.notifBellBtn}
            onPress={() => navigation.navigate('ProfileTab', { screen: 'Notifications' })}
          >
            <Text style={styles.notifBellIcon}>🔔</Text>
            {unreadNotifsCount > 0 && (
              <View style={styles.notifBadge}>
                <Text style={styles.notifBadgeText}>
                  {unreadNotifsCount > 9 ? '9+' : unreadNotifsCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        <View style={styles.searchBar}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search by device, city, area, pincode (e.g. 560001)..."
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
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchFeed(); }} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>📭</Text>
            <Text style={styles.emptyTitle}>
              {searchQuery ? 'No matching requests found' : 'No open requests'}
            </Text>
            <Text style={styles.emptyText}>
              {searchQuery
                ? 'Try searching with different keywords, area, or pincode.'
                : 'New repair requests matching your services will appear here.'}
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
    backgroundColor: Colors.white,
    paddingHorizontal: Spacing.base,
    paddingTop: Spacing.xl + 10,
    paddingBottom: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  title: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.text },
  subtitle: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 2, marginBottom: Spacing.xs },
  headerTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  notifBellBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    marginLeft: Spacing.sm,
  },
  notifBellIcon: {
    fontSize: 20,
  },
  notifBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: '#EF4444',
    borderRadius: 9,
    minWidth: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 2,
  },
  notifBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: FontWeight.bold,
  },

  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    marginTop: Spacing.xs,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  searchIcon: { fontSize: 14, marginRight: 6 },
  searchInput: { flex: 1, fontSize: FontSize.sm, color: Colors.text, padding: 0 },
  clearBtn: { fontSize: 14, color: Colors.muted, paddingHorizontal: 4 },

  list: { padding: Spacing.base, paddingBottom: Spacing.xxxl },
  card: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.xs },
  categoryRow: { flexDirection: 'row', alignItems: 'center' },
  category: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.accent },
  brand: { fontSize: FontSize.sm, color: Colors.textSecondary },
  priorityBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, borderWidth: 1 },
  priorityText: { fontSize: 10, fontWeight: FontWeight.bold },
  model: { fontSize: FontSize.base, fontWeight: FontWeight.bold, color: Colors.text, marginTop: 4 },
  desc: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: 2, lineHeight: 20 },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
    paddingTop: Spacing.xs,
  },
  location: { fontSize: FontSize.xs, color: Colors.textSecondary },
  time: { fontSize: FontSize.xs, color: Colors.muted },
  quoteBtn: {
    backgroundColor: Colors.accent,
    borderRadius: BorderRadius.md,
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  quoteBtnText: { color: Colors.white, fontSize: FontSize.sm, fontWeight: FontWeight.bold },
  empty: { alignItems: 'center', paddingTop: Spacing.xxxl },
  emptyIcon: { fontSize: 48, marginBottom: Spacing.md },
  emptyTitle: { fontSize: FontSize.md, fontWeight: FontWeight.semibold, color: Colors.text, marginBottom: Spacing.xs },
  emptyText: { fontSize: FontSize.xs, color: Colors.muted, textAlign: 'center', paddingHorizontal: Spacing.xl },
});
