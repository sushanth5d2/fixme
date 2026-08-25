import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
  TextInput,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Colors, FontSize, FontWeight, Spacing, BorderRadius } from '../../theme/tokens';
import { api } from '../../services/api';

interface Quote {
  id: string;
  requestId: string;
  amount?: number;
  estimatedTotal?: number;
  status: string;
  diagnosisNotes?: string | null;
  notes?: string | null;
  warrantyDays: number;
  estimatedCompletionDays?: number;
  estimatedDurationHours?: number;
  request: {
    id?: string;
    description?: string;
    problemDescription?: string;
    category?: { name: string };
    deviceModel: string | null;
    area?: string | null;
    city?: string | null;
  };
  createdAt: string;
}

const STATUS_CONFIG: Record<string, { color: string; label: string; bg: string }> = {
  SUBMITTED: { color: Colors.info, label: 'Submitted', bg: '#EFF6FF' },
  VIEWED: { color: Colors.warning, label: 'Viewed by Customer', bg: '#FEF3C7' },
  ACCEPTED: { color: Colors.success, label: '✓ Accepted & Assigned', bg: '#DCFCE7' },
  REJECTED: { color: Colors.error, label: '✕ Not Selected', bg: '#FEE2E2' },
  WITHDRAWN: { color: Colors.muted, label: 'Withdrawn', bg: '#F3F4F6' },
  EXPIRED: { color: Colors.muted, label: 'Expired', bg: '#F3F4F6' },
};

export function MyQuotesScreen({ navigation }: any) {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [startingChat, setStartingChat] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchQuotes = useCallback(async () => {
    try {
      const { data } = await api.get('/quotes/mine?limit=50');
      const raw = data?.data?.data || data?.data || data;
      const items: Quote[] = Array.isArray(raw) ? raw : (Array.isArray(raw?.data) ? raw.data : []);
      setQuotes(items);
    } catch (err) {
      console.error('[Fetch My Quotes Error]', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchQuotes();
    }, [fetchQuotes]),
  );

  const filteredQuotes = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return quotes;

    return quotes.filter((item) => {
      const cat = (item.request?.category?.name || '').toLowerCase();
      const model = (item.request?.deviceModel || '').toLowerCase();
      const desc = (item.request?.problemDescription || item.request?.description || '').toLowerCase();
      const area = (item.request?.area || '').toLowerCase();
      const city = (item.request?.city || '').toLowerCase();
      const status = (item.status || '').toLowerCase();
      const notes = (item.diagnosisNotes || item.notes || '').toLowerCase();

      return (
        cat.includes(q) ||
        model.includes(q) ||
        desc.includes(q) ||
        area.includes(q) ||
        city.includes(q) ||
        status.includes(q) ||
        notes.includes(q)
      );
    });
  }, [quotes, searchQuery]);

  const handleStartChat = async (targetRequestId: string) => {
    setStartingChat(targetRequestId);
    try {
      const { data } = await api.post('/chat/conversations', {
        requestId: targetRequestId,
      });
      const conv = data?.data || data;
      if (conv?.id) {
        navigation.navigate('ChatRoom', {
          conversationId: conv.id,
          otherUserName: 'Customer',
        });
      }
    } catch (err: any) {
      const msg = err?.response?.data?.error?.message || err?.response?.data?.message || 'Failed to open chat';
      Alert.alert('Error', msg);
    } finally {
      setStartingChat(null);
    }
  };

  if (loading && quotes.length === 0) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.accent} />
      </View>
    );
  }

  const renderItem = ({ item }: { item: Quote }) => {
    const statusCfg = STATUS_CONFIG[item.status] || { color: Colors.muted, label: item.status, bg: '#F3F4F6' };
    const price = Number(item.estimatedTotal ?? item.amount ?? 0);
    const targetRequestId = item.requestId || item.request?.id;

    return (
      <View style={styles.card}>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => {
            if (targetRequestId) {
              navigation.navigate('RequestDetail', { requestId: targetRequestId });
            }
          }}
        >
          {/* Header Row */}
          <View style={styles.cardHeader}>
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryText}>{item.request?.category?.name || 'Repair Request'}</Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: statusCfg.bg }]}>
              <Text style={[styles.statusText, { color: statusCfg.color }]}>{statusCfg.label}</Text>
            </View>
          </View>

          {/* Device Model & Problem */}
          {item.request?.deviceModel ? (
            <Text style={styles.deviceModel}>{item.request.deviceModel}</Text>
          ) : null}

          <Text style={styles.problemDesc} numberOfLines={2}>
            {item.request?.problemDescription || item.request?.description || 'Repair Job'}
          </Text>

          {item.request?.area || item.request?.city ? (
            <Text style={styles.locationText}>
              📍 {[item.request.area, item.request.city].filter(Boolean).join(', ')}
            </Text>
          ) : null}

          {/* Pricing & Warranty Row */}
          <View style={styles.quoteDetailsRow}>
            <View style={styles.priceCol}>
              <Text style={styles.priceLabel}>Quoted Amount</Text>
              <Text style={styles.priceValue}>₹{price.toLocaleString('en-IN')}</Text>
            </View>
            <View style={styles.metaCol}>
              <Text style={styles.metaText}>🛡️ {item.warrantyDays}d Warranty</Text>
              {item.estimatedCompletionDays ? (
                <Text style={styles.metaTextSub}>⏱️ ~{item.estimatedCompletionDays} days</Text>
              ) : null}
            </View>
          </View>

          {/* Diagnosis / Notes if present */}
          {item.diagnosisNotes || item.notes ? (
            <View style={styles.notesBox}>
              <Text style={styles.notesText} numberOfLines={2}>
                📝 {item.diagnosisNotes || item.notes}
              </Text>
            </View>
          ) : null}
        </TouchableOpacity>

        {/* Action Buttons Row */}
        <View style={styles.actionRow}>
          {targetRequestId ? (
            <TouchableOpacity
              style={styles.viewReqBtn}
              onPress={() => navigation.navigate('RequestDetail', { requestId: targetRequestId })}
            >
              <Text style={styles.viewReqText}>View Request 📄</Text>
            </TouchableOpacity>
          ) : null}

          {item.status === 'SUBMITTED' || item.status === 'VIEWED' ? (
            <TouchableOpacity
              style={styles.editBtn}
              onPress={() =>
                navigation.navigate('SubmitQuote', {
                  requestId: targetRequestId,
                  existingQuote: item,
                })
              }
            >
              <Text style={styles.editBtnText}>Edit Quote ✏️</Text>
            </TouchableOpacity>
          ) : null}

          {targetRequestId ? (
            <TouchableOpacity
              style={styles.chatBtn}
              onPress={() => handleStartChat(targetRequestId)}
              disabled={startingChat === targetRequestId}
            >
              {startingChat === targetRequestId ? (
                <ActivityIndicator size="small" color={Colors.accent} />
              ) : (
                <Text style={styles.chatBtnText}>💬 Chat</Text>
              )}
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>My Submitted Quotes 💰</Text>
        <Text style={styles.subtitle}>{filteredQuotes.length} quotes matching</Text>

        {/* Search Bar */}
        <View style={styles.searchBar}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search by device, area, notes, status..."
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
        data={filteredQuotes}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              fetchQuotes();
            }}
          />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>📝</Text>
            <Text style={styles.emptyTitle}>
              {searchQuery ? 'No matching quotes found' : 'No quotes submitted yet'}
            </Text>
            <Text style={styles.emptyText}>
              {searchQuery
                ? 'Try searching with another device keyword or status.'
                : 'Browse the repair request feed and submit competitive quotes to customers.'}
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
  categoryBadge: {
    backgroundColor: Colors.accentSoft,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
  },
  categoryText: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, color: Colors.accent },
  statusBadge: { paddingHorizontal: Spacing.sm, paddingVertical: 3, borderRadius: BorderRadius.full },
  statusText: { fontSize: 11, fontWeight: FontWeight.bold },
  deviceModel: { fontSize: FontSize.base, fontWeight: FontWeight.bold, color: Colors.text, marginTop: 4 },
  problemDesc: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 2, lineHeight: 18 },
  locationText: { fontSize: 11, color: Colors.text, fontWeight: FontWeight.medium, marginTop: 4 },
  quoteDetailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
    paddingTop: Spacing.xs,
    marginTop: Spacing.sm,
  },
  priceCol: {},
  priceLabel: { fontSize: 10, color: Colors.muted, fontWeight: FontWeight.medium },
  priceValue: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.accent },
  metaCol: { alignItems: 'flex-end' },
  metaText: { fontSize: 11, fontWeight: FontWeight.semibold, color: '#15803D' },
  metaTextSub: { fontSize: 10, color: Colors.muted, marginTop: 1 },
  notesBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: BorderRadius.md,
    padding: Spacing.xs,
    marginTop: Spacing.xs,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  notesText: { fontSize: 11, color: Colors.textSecondary, fontStyle: 'italic' },
  actionRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
    marginTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
    paddingTop: Spacing.xs,
  },
  viewReqBtn: {
    flex: 1.2,
    backgroundColor: '#F3F4F6',
    borderRadius: BorderRadius.md,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewReqText: { color: Colors.text, fontSize: FontSize.xs, fontWeight: FontWeight.bold },
  editBtn: {
    flex: 1.2,
    backgroundColor: Colors.accentSoft,
    borderRadius: BorderRadius.md,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.accent,
  },
  editBtnText: { color: Colors.accent, fontSize: FontSize.xs, fontWeight: FontWeight.bold },
  chatBtn: {
    flex: 0.9,
    backgroundColor: '#EFF6FF',
    borderRadius: BorderRadius.md,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#93C5FD',
  },
  chatBtnText: { color: '#1D4ED8', fontSize: FontSize.xs, fontWeight: FontWeight.bold },
  empty: { alignItems: 'center', paddingTop: Spacing.xxxl },
  emptyIcon: { fontSize: 48, marginBottom: Spacing.md },
  emptyTitle: { fontSize: FontSize.md, fontWeight: FontWeight.semibold, color: Colors.text },
  emptyText: { fontSize: FontSize.xs, color: Colors.muted, textAlign: 'center', marginTop: 4, paddingHorizontal: Spacing.xl },
});
