import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Linking,
  Alert,
  TextInput,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Colors, FontSize, FontWeight, Spacing, BorderRadius } from '../../theme/tokens';
import { useAuthStore } from '../../stores/auth.store';
import { api } from '../../services/api';

interface Job {
  id: string;
  status: string;
  agreedTotal?: number;
  warrantyDays?: number;
  scheduledDate: string | null;
  scheduledTimeSlot: string | null;
  fixerNotes?: string | null;
  request: {
    id?: string;
    description?: string;
    problemDescription?: string;
    problemTitle?: string;
    deviceModel: string | null;
    category?: { name: string };
    brand?: { name: string } | null;
    houseBuilding?: string;
    street?: string;
    area?: string;
    city?: string;
    pincode?: string;
    latitude?: number;
    longitude?: number;
  };
  customer: { firstName?: string; lastName?: string; userId?: string };
  quote?: {
    id?: string;
    amount?: number;
    estimatedTotal?: number;
    warrantyDays?: number;
  };
  createdAt: string;
}

const STATUS_CONFIG: Record<string, { color: string; label: string; icon: string; bg: string }> = {
  ASSIGNED: { color: Colors.info, label: 'Assigned', icon: '📋', bg: '#EFF6FF' },
  FIXER_ON_THE_WAY: { color: '#8B5CF6', label: 'On the Way', icon: '🚗', bg: '#F3E8FF' },
  DEVICE_RECEIVED: { color: '#8B5CF6', label: 'Device Received', icon: '📦', bg: '#F3E8FF' },
  DIAGNOSING: { color: '#D97706', label: 'Diagnosing', icon: '🔍', bg: '#FEF3C7' },
  REPAIR_IN_PROGRESS: { color: '#EA580C', label: 'Repairing', icon: '🔧', bg: '#FFEDD5' },
  READY_FOR_DELIVERY: { color: Colors.success, label: 'Ready for Delivery', icon: '✅', bg: '#DCFCE7' },
  COMPLETED: { color: Colors.success, label: 'Completed', icon: '🎉', bg: '#DCFCE7' },
  CANCELLED: { color: Colors.error, label: 'Cancelled', icon: '❌', bg: '#FEE2E2' },
  DISPUTED: { color: Colors.error, label: 'Disputed', icon: '⚠️', bg: '#FEE2E2' },
};

export function MyJobsScreen({ navigation }: any) {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [startingChat, setStartingChat] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const { user } = useAuthStore();
  const isMember = user?.role === 'FIXER_MEMBER';

  const fetchJobs = useCallback(async () => {
    try {
      const endpoint = isMember ? '/jobs/mine/member?limit=50' : '/jobs/mine/fixer?limit=50';
      const { data } = await api.get(endpoint);
      const raw = data?.data?.data || data?.data || data;
      const items: Job[] = Array.isArray(raw) ? raw : (Array.isArray(raw?.data) ? raw.data : []);
      setJobs(items);
    } catch (err) {
      console.error('[Fetch My Jobs Error]', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isMember]);

  useFocusEffect(
    useCallback(() => {
      fetchJobs();
    }, [fetchJobs]),
  );

  const filteredJobs = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return jobs;

    return jobs.filter((j) => {
      const custName = `${j.customer?.firstName || ''} ${j.customer?.lastName || ''}`.toLowerCase();
      const cat = (j.request?.category?.name || '').toLowerCase();
      const brand = (j.request?.brand?.name || '').toLowerCase();
      const model = (j.request?.deviceModel || '').toLowerCase();
      const desc = (j.request?.problemDescription || j.request?.description || j.request?.problemTitle || '').toLowerCase();
      const area = (j.request?.area || '').toLowerCase();
      const city = (j.request?.city || '').toLowerCase();
      const pincode = (j.request?.pincode || '').toLowerCase();
      const status = (j.status || '').toLowerCase();

      return (
        custName.includes(q) ||
        cat.includes(q) ||
        brand.includes(q) ||
        model.includes(q) ||
        desc.includes(q) ||
        area.includes(q) ||
        city.includes(q) ||
        pincode.includes(q) ||
        status.includes(q)
      );
    });
  }, [jobs, searchQuery]);

  const handleStartChat = async (job: Job) => {
    setStartingChat(job.id);
    try {
      const { data } = await api.post('/chat/conversations', {
        jobId: job.id,
        requestId: job.request?.id,
      });
      const conv = data?.data || data;
      if (conv?.id) {
        navigation.navigate('ChatRoom', {
          conversationId: conv.id,
          otherUserName: job.customer?.firstName ? `${job.customer.firstName}` : 'Customer',
        });
      }
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message || 'Failed to open chat');
    } finally {
      setStartingChat(null);
    }
  };

  const openNavigation = (job: Job) => {
    const req = job.request;
    if (req?.latitude && req?.longitude) {
      Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${req.latitude},${req.longitude}`);
    } else {
      const query = [req?.houseBuilding, req?.street, req?.area, req?.city, req?.pincode].filter(Boolean).join(', ');
      Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query || 'Bengaluru')}`);
    }
  };

  if (loading && jobs.length === 0) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.accent} />
      </View>
    );
  }

  const renderItem = ({ item }: { item: Job }) => {
    const status = STATUS_CONFIG[item.status] || { color: Colors.muted, label: item.status, icon: '•', bg: '#F3F4F6' };
    const amountVal = Number(item.agreedTotal ?? item.quote?.estimatedTotal ?? item.quote?.amount ?? 0);
    const descText = item.request?.problemDescription || item.request?.description || item.request?.problemTitle || 'Repair Job';
    const addressStr = [item.request?.area, item.request?.city].filter(Boolean).join(', ');
    const customerName = item.customer?.firstName ? `${item.customer.firstName} ${item.customer?.lastName || ''}`.trim() : 'Customer';

    return (
      <View style={styles.card}>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => navigation.navigate('JobDetail', { jobId: item.id })}
        >
          <View style={styles.cardHeader}>
            <View style={styles.categoryRow}>
              <Text style={styles.categoryBadge}>{item.request?.category?.name || 'Device'}</Text>
              {item.request?.brand?.name ? <Text style={styles.brandTag}>· {item.request.brand.name}</Text> : null}
            </View>
            <View style={[styles.badge, { backgroundColor: status.bg }]}>
              <Text style={[styles.badgeText, { color: status.color }]}>
                {status.icon} {status.label}
              </Text>
            </View>
          </View>

          {item.request?.deviceModel ? (
            <Text style={styles.model}>{item.request.deviceModel}</Text>
          ) : null}

          <Text style={styles.desc} numberOfLines={2}>
            {descText}
          </Text>

          <View style={styles.customerRow}>
            <Text style={styles.customerLabel}>👤 Customer: </Text>
            <Text style={styles.customerName}>{customerName}</Text>
          </View>

          {addressStr ? (
            <Text style={styles.locationText}>📍 {addressStr}</Text>
          ) : null}

          <View style={styles.cardFooter}>
            <View>
              <Text style={styles.amountLabel}>Agreed Amount</Text>
              <Text style={styles.amount}>₹{amountVal.toLocaleString('en-IN')}</Text>
            </View>
            <View style={styles.metaCol}>
              <Text style={styles.warranty}>{item.warrantyDays || item.quote?.warrantyDays || 0}d warranty</Text>
              <Text style={styles.date}>
                {new Date(item.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
              </Text>
            </View>
          </View>
        </TouchableOpacity>

        {/* Action Row */}
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={styles.chatBtn}
            onPress={() => handleStartChat(item)}
            disabled={startingChat === item.id}
          >
            {startingChat === item.id ? (
              <ActivityIndicator size="small" color={Colors.accent} />
            ) : (
              <Text style={styles.chatBtnText}>💬 Chat</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.navBtn}
            onPress={() => openNavigation(item)}
          >
            <Text style={styles.navBtnText}>🗺️ Maps</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.detailBtn}
            onPress={() => navigation.navigate('JobDetail', { jobId: item.id })}
          >
            <Text style={styles.detailBtnText}>Manage Job 🔧</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>My Assigned Jobs 🔧</Text>
        <Text style={styles.subtitle}>{filteredJobs.length} active jobs matching</Text>

        {/* Search Bar */}
        <View style={styles.searchBar}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search by customer, device, area, status..."
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
        data={filteredJobs}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              fetchJobs();
            }}
          />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>🔧</Text>
            <Text style={styles.emptyTitle}>
              {searchQuery ? 'No matching jobs found' : 'No active jobs assigned yet'}
            </Text>
            <Text style={styles.emptyText}>
              {searchQuery
                ? 'Try searching with another customer name, area, or device model.'
                : 'When a customer accepts your submitted quote, the job will immediately appear here.'}
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
  subtitle: { fontSize: FontSize.xs, color: Colors.muted, fontWeight: FontWeight.medium, marginTop: 2, marginBottom: Spacing.xs },

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
  categoryRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  categoryBadge: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, color: Colors.accent, backgroundColor: Colors.accentSoft, paddingHorizontal: Spacing.sm, paddingVertical: 2, borderRadius: BorderRadius.full },
  brandTag: { fontSize: FontSize.xs, color: Colors.textSecondary, fontWeight: FontWeight.medium },
  badge: { paddingHorizontal: Spacing.sm, paddingVertical: 3, borderRadius: BorderRadius.full },
  badgeText: { fontSize: 11, fontWeight: FontWeight.bold },
  model: { fontSize: FontSize.base, fontWeight: FontWeight.bold, color: Colors.text, marginTop: 4 },
  desc: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 2, lineHeight: 18 },
  customerRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  customerLabel: { fontSize: 11, color: Colors.muted },
  customerName: { fontSize: 11, fontWeight: FontWeight.bold, color: Colors.text },
  locationText: { fontSize: 11, color: Colors.text, fontWeight: FontWeight.medium, marginTop: 2 },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
    paddingTop: Spacing.xs,
    marginTop: Spacing.sm,
  },
  amountLabel: { fontSize: 10, color: Colors.muted, fontWeight: FontWeight.medium },
  amount: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.accent },
  metaCol: { alignItems: 'flex-end' },
  warranty: { fontSize: 11, fontWeight: FontWeight.semibold, color: '#15803D' },
  date: { fontSize: 10, color: Colors.muted, marginTop: 1 },
  actionRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
    marginTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
    paddingTop: Spacing.xs,
  },
  chatBtn: {
    flex: 1,
    backgroundColor: Colors.accentSoft,
    borderRadius: BorderRadius.md,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.accent,
  },
  chatBtnText: { color: Colors.accent, fontSize: FontSize.xs, fontWeight: FontWeight.bold },
  navBtn: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    borderRadius: BorderRadius.md,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navBtnText: { color: Colors.text, fontSize: FontSize.xs, fontWeight: FontWeight.bold },
  detailBtn: {
    flex: 1.4,
    backgroundColor: Colors.accent,
    borderRadius: BorderRadius.md,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailBtnText: { color: Colors.white, fontSize: FontSize.xs, fontWeight: FontWeight.bold },
  empty: { alignItems: 'center', paddingTop: Spacing.xxxl },
  emptyIcon: { fontSize: 48, marginBottom: Spacing.md },
  emptyTitle: { fontSize: FontSize.md, fontWeight: FontWeight.semibold, color: Colors.text },
  emptyText: { fontSize: FontSize.xs, color: Colors.muted, textAlign: 'center', marginTop: 4, paddingHorizontal: Spacing.xl },
});
