import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Linking,
  Image,
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
  problemTitle?: string;
  problemDescription?: string;
  description?: string;
  status: string;
  priority?: string;
  urgency?: string;
  deviceModel: string | null;
  category: { name: string };
  brand: { name: string } | null;
  houseBuilding?: string | null;
  street?: string | null;
  area?: string | null;
  landmark?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  address?: { houseBuilding: string; area: string; city: string; pincode: string } | null;
  media?: Array<{ id: string; storageKey: string }> | null;
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
      api.get(`/quotes/request/${requestId}`).catch(() => ({ data: { data: [] } })),
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

  const openMap = () => {
    if (!request) return;
    if (request.latitude && request.longitude) {
      Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${request.latitude},${request.longitude}`);
    } else {
      const query = [request.houseBuilding, request.street, request.area, request.landmark, request.city, request.pincode]
        .filter(Boolean)
        .join(', ');
      Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query || 'Bengaluru')}`);
    }
  };

  if (loading || !request) {
    return <View style={styles.center}><ActivityIndicator size="large" color={Colors.accent} /></View>;
  }

  const canCancel = ['OPEN', 'QUOTED'].includes(request.status);
  const desc = request.problemDescription || request.description || '';
  const fullAddress = [
    request.houseBuilding,
    request.street,
    request.area,
    request.landmark ? `(Near ${request.landmark})` : '',
    request.city,
    request.pincode ? `- ${request.pincode}` : '',
  ].filter(Boolean).join(', ') || (request.address ? `${request.address.houseBuilding}, ${request.address.area}, ${request.address.city} - ${request.address.pincode}` : 'Address not specified');

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
        <Text style={styles.description}>{desc}</Text>
      </View>

      {/* Media Photos if attached */}
      {Array.isArray(request.media) && request.media.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Attached Photos</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photoStrip}>
            {request.media.map((m) => (
              <Image key={m.id} source={{ uri: m.storageKey }} style={styles.photoThumb} />
            ))}
          </ScrollView>
        </View>
      )}

      {/* Location & Map Card */}
      <View style={styles.mapCard}>
        <View style={styles.mapHeaderRow}>
          <Text style={styles.mapCardTitle}>📍 Service Location & Map</Text>
          <TouchableOpacity style={styles.openMapBtn} onPress={openMap}>
            <Text style={styles.openMapBtnText}>Open in Google Maps 🗺️</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.addressText}>{fullAddress}</Text>

        {request.latitude && request.longitude ? (
          <View style={styles.mapBox}>
            <Text style={styles.mapPinIcon}>📌</Text>
            <Text style={styles.mapCoordinates}>
              GPS: {Number(request.latitude).toFixed(4)}, {Number(request.longitude).toFixed(4)}
            </Text>
            <Text style={styles.tapToView}>Tap "Open in Google Maps" for live navigation</Text>
          </View>
        ) : null}
      </View>

      {/* Quotes */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          Quotes from Fixers ({quotes.length})
        </Text>
        {quotes.length === 0 ? (
          <View style={styles.noQuotes}>
            <Text style={styles.noQuotesText}>Waiting for verified fixers to send quotes...</Text>
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

  photoStrip: { flexDirection: 'row', marginTop: Spacing.xs },
  photoThumb: { width: 80, height: 80, borderRadius: BorderRadius.md, marginRight: Spacing.sm, borderWidth: 1, borderColor: Colors.border },

  mapCard: {
    backgroundColor: Colors.card, borderRadius: BorderRadius.xl, padding: Spacing.lg,
    marginBottom: Spacing.lg, borderWidth: 1, borderColor: Colors.borderLight,
    shadowColor: Colors.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 6, elevation: 2,
  },
  mapHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm },
  mapCardTitle: { fontSize: FontSize.base, fontWeight: FontWeight.bold, color: Colors.text },
  openMapBtn: { backgroundColor: Colors.accentSoft, paddingHorizontal: Spacing.sm, paddingVertical: Spacing.xs, borderRadius: BorderRadius.md },
  openMapBtnText: { fontSize: FontSize.xs, fontWeight: FontWeight.semibold, color: Colors.accent },
  addressText: { fontSize: FontSize.sm, color: Colors.textSecondary, lineHeight: 20, marginBottom: Spacing.sm },

  mapBox: {
    backgroundColor: Colors.bg, borderRadius: BorderRadius.lg, padding: Spacing.base,
    alignItems: 'center', borderWidth: 1, borderColor: Colors.border, borderStyle: 'dashed',
  },
  mapPinIcon: { fontSize: 28, marginBottom: Spacing.xs },
  mapCoordinates: { fontSize: FontSize.xs, fontWeight: FontWeight.semibold, color: Colors.text },
  tapToView: { fontSize: 11, color: Colors.muted, marginTop: 2 },

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
