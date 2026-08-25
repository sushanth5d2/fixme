import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
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

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.accent} />
      </View>
    );
  }

  const renderQuoteItem = ({ item }: { item: Quote }) => {
    const status = STATUS_CONFIG[item.status] || { color: Colors.muted, label: item.status, bg: '#F3F4F6' };
    const amountVal = Number(item.estimatedTotal ?? item.amount ?? 0);
    const targetRequestId = item.requestId || item.request?.id;
    const canEdit = item.status === 'SUBMITTED' || item.status === 'VIEWED';
    const notesText = item.notes || item.diagnosisNotes;

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
          <View style={styles.cardHeader}>
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryText}>{item.request?.category?.name || 'Device Repair'}</Text>
            </View>
            <View style={[styles.badge, { backgroundColor: status.bg }]}>
              <Text style={[styles.badgeText, { color: status.color }]}>{status.label}</Text>
            </View>
          </View>

          {item.request?.deviceModel ? (
            <Text style={styles.model}>{item.request.deviceModel}</Text>
          ) : null}

          <Text style={styles.desc} numberOfLines={2}>
            {item.request?.problemDescription || item.request?.description || 'No description provided'}
          </Text>

          {item.request?.city || item.request?.area ? (
            <Text style={styles.locationText}>
              📍 {[item.request.area, item.request.city].filter(Boolean).join(', ')}
            </Text>
          ) : null}

          {notesText ? (
            <View style={styles.notesBox}>
              <Text style={styles.notesTitle}>Your Diagnosis / Note:</Text>
              <Text style={styles.notesText} numberOfLines={2}>{notesText}</Text>
            </View>
          ) : null}

          <View style={styles.cardFooter}>
            <View>
              <Text style={styles.amountLabel}>Proposed Estimate</Text>
              <Text style={styles.amount}>₹{amountVal.toLocaleString('en-IN')}</Text>
            </View>
            <View style={styles.metaCol}>
              <Text style={styles.warranty}>{item.warrantyDays || 0}d warranty</Text>
              <Text style={styles.date}>
                {new Date(item.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
              </Text>
            </View>
          </View>
        </TouchableOpacity>

        {/* Action Buttons */}
        <View style={styles.actionRow}>
          {targetRequestId && (
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
          )}

          {canEdit && targetRequestId && (
            <TouchableOpacity
              style={styles.editBtn}
              onPress={() => navigation.navigate('SubmitQuote', {
                requestId: targetRequestId,
                categoryName: item.request?.category?.name,
                existingQuote: item,
              })}
            >
              <Text style={styles.editBtnText}>Edit Quote ✏️</Text>
            </TouchableOpacity>
          )}

          {targetRequestId && (
            <TouchableOpacity
              style={styles.detailBtn}
              onPress={() => navigation.navigate('RequestDetail', { requestId: targetRequestId })}
            >
              <Text style={styles.detailBtnText}>Details 📄</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>My Submitted Quotes 💼</Text>
        <Text style={styles.count}>{quotes.length} total quotes</Text>
      </View>

      <FlatList
        data={quotes}
        keyExtractor={(item) => item.id}
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
        renderItem={renderQuoteItem}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>💰</Text>
            <Text style={styles.emptyTitle}>No quotes submitted yet</Text>
            <Text style={styles.emptyText}>Go to the Feed or Map tab to submit quotes on open customer repair requests.</Text>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  title: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.text },
  count: { fontSize: FontSize.xs, color: Colors.muted, fontWeight: FontWeight.medium },
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
  categoryBadge: { backgroundColor: Colors.accentSoft, paddingHorizontal: Spacing.sm, paddingVertical: 3, borderRadius: BorderRadius.full },
  categoryText: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, color: Colors.accent },
  badge: { paddingHorizontal: Spacing.sm, paddingVertical: 3, borderRadius: BorderRadius.full },
  badgeText: { fontSize: 11, fontWeight: FontWeight.bold },
  model: { fontSize: FontSize.base, fontWeight: FontWeight.bold, color: Colors.text, marginTop: 2 },
  desc: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 2, lineHeight: 18 },
  locationText: { fontSize: 11, color: Colors.text, fontWeight: FontWeight.medium, marginTop: 4 },
  notesBox: {
    backgroundColor: '#F9FAFB',
    borderRadius: BorderRadius.md,
    padding: Spacing.xs + 2,
    marginTop: Spacing.xs,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  notesTitle: { fontSize: 10, fontWeight: FontWeight.bold, color: Colors.muted },
  notesText: { fontSize: 11, color: Colors.text, marginTop: 1 },
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
    paddingVertical: 7,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.accent,
  },
  chatBtnText: { color: Colors.accent, fontSize: FontSize.xs, fontWeight: FontWeight.bold },
  editBtn: {
    flex: 1.3,
    backgroundColor: '#059669',
    borderRadius: BorderRadius.md,
    paddingVertical: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editBtnText: { color: Colors.white, fontSize: FontSize.xs, fontWeight: FontWeight.bold },
  detailBtn: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    borderRadius: BorderRadius.md,
    paddingVertical: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailBtnText: { color: Colors.text, fontSize: FontSize.xs, fontWeight: FontWeight.bold },
  empty: { alignItems: 'center', paddingTop: Spacing.xxxl },
  emptyIcon: { fontSize: 48, marginBottom: Spacing.md },
  emptyTitle: { fontSize: FontSize.md, fontWeight: FontWeight.semibold, color: Colors.text },
  emptyText: { fontSize: FontSize.xs, color: Colors.muted, textAlign: 'center', marginTop: 4, paddingHorizontal: Spacing.xl },
});
