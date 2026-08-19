import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Button } from '../../components/ui';
import { Colors, FontSize, FontWeight, Spacing, BorderRadius } from '../../theme/tokens';
import { api } from '../../services/api';

interface Quote {
  id: string;
  amount: number;
  diagnosisNotes: string | null;
  estimatedDurationHours: number | null;
  warrantyDays: number;
  status: string;
  fixer: { companyName: string; averageRating: number; completedJobs: number };
  createdAt: string;
}

interface RequestDetail {
  id: string;
  description: string;
  status: string;
  priority: string;
  deviceModel: string | null;
  category: { name: string };
  brand: { name: string } | null;
  address: { houseBuilding: string; area: string; city: string; pincode: string } | null;
  createdAt: string;
  cancelledAt: string | null;
}

export function RequestDetailScreen({ route, navigation }: any) {
  const { requestId } = route.params;
  const [request, setRequest] = useState<RequestDetail | null>(null);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      api.get(`/repair-requests/mine/${requestId}`),
      api.get(`/quotes/request/${requestId}`),
    ]).then(([reqRes, quotesRes]) => {
      setRequest(reqRes.data.data || reqRes.data);
      setQuotes(quotesRes.data.data || quotesRes.data || []);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [requestId]);

  const handleAcceptQuote = (quoteId: string, fixerName: string, amount: number) => {
    Alert.alert(
      'Accept Quote',
      `Accept quote from ${fixerName} for ₹${amount.toLocaleString('en-IN')}?\n\nThis will assign the fixer to your repair job.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Accept',
          onPress: async () => {
            setAccepting(quoteId);
            try {
              await api.patch(`/quotes/${quoteId}/accept`, {});
              Alert.alert('Quote Accepted!', 'The fixer has been assigned to your job.');
              // Refresh
              const [reqRes, quotesRes] = await Promise.all([
                api.get(`/repair-requests/mine/${requestId}`),
                api.get(`/quotes/request/${requestId}`),
              ]);
              setRequest(reqRes.data.data || reqRes.data);
              setQuotes(quotesRes.data.data || quotesRes.data || []);
            } catch (err: any) {
              Alert.alert('Error', err?.response?.data?.message || 'Failed to accept quote');
            } finally {
              setAccepting(null);
            }
          },
        },
      ],
    );
  };

  const handleCancel = () => {
    Alert.alert('Cancel Request', 'Are you sure you want to cancel this request?', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Cancel Request',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.patch(`/repair-requests/mine/${requestId}/cancel`, { reason: 'Customer cancelled' });
            navigation.goBack();
          } catch (err: any) {
            Alert.alert('Error', err?.response?.data?.message || 'Cannot cancel');
          }
        },
      },
    ]);
  };

  if (loading || !request) {
    return <View style={styles.center}><ActivityIndicator size="large" color={Colors.accent} /></View>;
  }

  const canCancel = ['OPEN', 'QUOTED'].includes(request.status);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Status Header */}
      <View style={styles.statusHeader}>
        <Text style={styles.statusLabel}>{request.status.replace(/_/g, ' ')}</Text>
        <Text style={styles.date}>
          Created {new Date(request.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
        </Text>
      </View>

      {/* Device Info */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Device</Text>
        <Text style={styles.category}>{request.category?.name}{request.brand ? ` · ${request.brand.name}` : ''}</Text>
        {request.deviceModel && <Text style={styles.model}>{request.deviceModel}</Text>}
      </View>

      {/* Description */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Problem Description</Text>
        <Text style={styles.description}>{request.description}</Text>
      </View>

      {/* Address */}
      {request.address && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Service Address</Text>
          <Text style={styles.address}>
            📍 {request.address.houseBuilding}, {request.address.area}, {request.address.city} - {request.address.pincode}
          </Text>
        </View>
      )}

      {/* Quotes */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          Quotes ({quotes.length})
        </Text>
        {quotes.length === 0 ? (
          <View style={styles.noQuotes}>
            <Text style={styles.noQuotesText}>Waiting for fixers to send quotes...</Text>
          </View>
        ) : (
          quotes.map((q) => (
            <View key={q.id} style={styles.quoteCard}>
              <View style={styles.quoteHeader}>
                <Text style={styles.fixerName}>{q.fixer.companyName}</Text>
                <Text style={styles.quoteAmount}>₹{Number(q.amount).toLocaleString('en-IN')}</Text>
              </View>
              <View style={styles.fixerStats}>
                <Text style={styles.fixerStat}>★ {Number(q.fixer.averageRating).toFixed(1)}</Text>
                <Text style={styles.fixerStat}>{q.fixer.completedJobs} jobs</Text>
                {q.warrantyDays > 0 && <Text style={styles.fixerStat}>{q.warrantyDays}d warranty</Text>}
                {q.estimatedDurationHours && <Text style={styles.fixerStat}>{q.estimatedDurationHours}h est.</Text>}
              </View>
              {q.diagnosisNotes && <Text style={styles.diagnosis}>{q.diagnosisNotes}</Text>}
              
              {q.status === 'SUBMITTED' || q.status === 'VIEWED' ? (
                <Button
                  title="Accept Quote"
                  onPress={() => handleAcceptQuote(q.id, q.fixer.companyName, Number(q.amount))}
                  loading={accepting === q.id}
                  size="sm"
                />
              ) : (
                <View style={[styles.quoteBadge, { backgroundColor: q.status === 'ACCEPTED' ? Colors.successBg : Colors.errorBg }]}>
                  <Text style={[styles.quoteBadgeText, { color: q.status === 'ACCEPTED' ? Colors.success : Colors.error }]}>
                    {q.status}
                  </Text>
                </View>
              )}
            </View>
          ))
        )}
      </View>

      {/* Cancel Button */}
      {canCancel && (
        <Button title="Cancel Request" onPress={handleCancel} variant="danger" size="md" />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  content: { padding: Spacing.xl, paddingBottom: Spacing.xxxl },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  statusHeader: {
    backgroundColor: Colors.card, borderRadius: BorderRadius.lg, padding: Spacing.base,
    marginBottom: Spacing.lg, borderWidth: 1, borderColor: Colors.borderLight, alignItems: 'center',
  },
  statusLabel: { fontSize: FontSize.md, fontWeight: FontWeight.bold, color: Colors.accent },
  date: { fontSize: FontSize.xs, color: Colors.muted, marginTop: Spacing.xs },

  section: { marginBottom: Spacing.lg },
  sectionTitle: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold, color: Colors.text, marginBottom: Spacing.sm },
  category: { fontSize: FontSize.base, fontWeight: FontWeight.semibold, color: Colors.accent },
  model: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: 2 },
  description: { fontSize: FontSize.base, color: Colors.textSecondary, lineHeight: 22 },
  address: { fontSize: FontSize.sm, color: Colors.textSecondary, lineHeight: 20 },

  noQuotes: { backgroundColor: Colors.card, borderRadius: BorderRadius.md, padding: Spacing.xl, alignItems: 'center', borderWidth: 1, borderColor: Colors.borderLight },
  noQuotesText: { fontSize: FontSize.sm, color: Colors.muted, fontStyle: 'italic' },

  quoteCard: {
    backgroundColor: Colors.card, borderRadius: BorderRadius.lg, padding: Spacing.base,
    marginBottom: Spacing.md, borderWidth: 1, borderColor: Colors.borderLight,
  },
  quoteHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm },
  fixerName: { fontSize: FontSize.base, fontWeight: FontWeight.semibold, color: Colors.text },
  quoteAmount: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.accent },
  fixerStats: { flexDirection: 'row', gap: Spacing.md, marginBottom: Spacing.sm },
  fixerStat: { fontSize: FontSize.xs, color: Colors.muted, backgroundColor: Colors.bg, paddingHorizontal: Spacing.sm, paddingVertical: 2, borderRadius: BorderRadius.full },
  diagnosis: { fontSize: FontSize.sm, color: Colors.textSecondary, lineHeight: 20, marginBottom: Spacing.md },
  quoteBadge: { paddingVertical: Spacing.xs, borderRadius: BorderRadius.md, alignItems: 'center' },
  quoteBadgeText: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold },
});
