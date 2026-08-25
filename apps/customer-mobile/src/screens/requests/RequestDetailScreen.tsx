import React, { useState, useCallback } from 'react';
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
  Modal,
  SafeAreaView,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
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
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);

  const fetchDetail = useCallback(async () => {
    try {
      const [reqRes, quotesRes] = await Promise.all([
        api.get(`/repair-requests/mine/${requestId}`),
        api.get(`/quotes/request/${requestId}`).catch(() => ({ data: { data: [] } })),
      ]);
      setRequest(reqRes.data.data || reqRes.data);
      setQuotes(quotesRes.data.data || quotesRes.data || []);
    } catch (err) {
      console.error('[Fetch Request Detail Error]', err);
    } finally {
      setLoading(false);
    }
  }, [requestId]);

  useFocusEffect(
    useCallback(() => {
      fetchDetail();
    }, [fetchDetail]),
  );

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
              fetchDetail();
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
    <View style={styles.flex}>
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
            <Text style={styles.sectionTitle}>📸 Attached Photos ({request.media.length})</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photoStrip}>
              {request.media.map((m, idx) => (
                <TouchableOpacity
                  key={m.id || idx}
                  activeOpacity={0.8}
                  onPress={() => setSelectedPhoto(m.storageKey)}
                  style={styles.photoThumbWrapper}
                >
                  <Image
                    source={{ uri: m.storageKey }}
                    style={styles.photoThumb}
                    resizeMode="cover"
                  />
                  <View style={styles.zoomBadge}>
                    <Text style={styles.zoomText}>🔍 View</Text>
                  </View>
                </TouchableOpacity>
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
            quotes.map((q) => {
              const amountVal = Number(q.estimatedTotal ?? q.amount ?? 0);
              const notesText = q.notes || q.diagnosisNotes;
              const fixerId = q.fixer?.id || q.fixerId;

              return (
                <View key={q.id} style={styles.quoteCard}>
                  <TouchableOpacity
                    activeOpacity={0.7}
                    style={styles.quoteFixerHeader}
                    onPress={() => {
                      if (fixerId) {
                        navigation.navigate('FixerProfile', { fixerId });
                      }
                    }}
                  >
                    <View style={styles.fixerInfo}>
                      <View style={styles.fixerNameRow}>
                        <Text style={styles.fixerName}>{q.fixer?.companyName || q.fixer?.ownerName || 'Verified Fixer'}</Text>
                        <Text style={styles.viewProfileTag}>View Profile 🔍</Text>
                      </View>
                      <View style={styles.fixerStats}>
                        <Text style={styles.fixerStat}>★ {Number(q.fixer?.averageRating || 0).toFixed(1)}</Text>
                        <Text style={styles.fixerStat}>{q.fixer?.completedJobs || 0} jobs</Text>
                        {q.warrantyDays > 0 && <Text style={styles.fixerStat}>{q.warrantyDays}d warranty</Text>}
                        {q.estimatedDurationHours && <Text style={styles.fixerStat}>{q.estimatedDurationHours}h est.</Text>}
                      </View>
                    </View>
                    <Text style={styles.quoteAmount}>₹{amountVal.toLocaleString('en-IN')}</Text>
                  </TouchableOpacity>

                  {notesText ? <Text style={styles.diagnosis}>{notesText}</Text> : null}

                  <View style={styles.quoteActions}>
                    <TouchableOpacity
                      style={styles.chatFixerBtn}
                      onPress={async () => {
                        try {
                          const { data } = await api.post('/chat/conversations', { requestId: request.id });
                          const conv = data?.data || data;
                          if (conv?.id) {
                            navigation.navigate('ChatRoom', {
                              conversationId: conv.id,
                              otherUserName: q.fixer?.companyName || 'Fixer',
                            });
                          }
                        } catch (err: any) {
                          Alert.alert('Error', err?.response?.data?.message || 'Failed to open chat');
                        }
                      }}
                    >
                      <Text style={styles.chatFixerBtnText}>💬 Chat</Text>
                    </TouchableOpacity>

                    {q.status === 'SUBMITTED' || q.status === 'VIEWED' ? (
                      <TouchableOpacity
                        style={styles.acceptBtn}
                        onPress={() => handleAcceptQuote(q.id, q.fixer?.companyName || 'Fixer', amountVal)}
                        disabled={accepting === q.id}
                      >
                        {accepting === q.id ? (
                          <ActivityIndicator size="small" color={Colors.white} />
                        ) : (
                          <Text style={styles.acceptBtnText}>Accept Quote ✓</Text>
                        )}
                      </TouchableOpacity>
                    ) : (
                      <View style={[styles.quoteBadge, { backgroundColor: q.status === 'ACCEPTED' ? Colors.success + '20' : Colors.muted + '20' }]}>
                        <Text style={[styles.quoteBadgeText, { color: q.status === 'ACCEPTED' ? Colors.success : Colors.muted }]}>
                          {q.status === 'ACCEPTED' ? '✓ Accepted' : q.status}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              );
            })
          )}
        </View>

        {/* Cancel Button */}
        {canCancel && (
          <Button
            title="Cancel Request"
            variant="outline"
            onPress={handleCancel}
            style={styles.cancelBtn}
          />
        )}
      </ScrollView>

      {/* Full Screen Photo Viewer Modal */}
      <Modal
        visible={!!selectedPhoto}
        transparent={false}
        animationType="fade"
        onRequestClose={() => setSelectedPhoto(null)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Photo Preview</Text>
            <TouchableOpacity
              style={styles.modalCloseBtn}
              onPress={() => setSelectedPhoto(null)}
            >
              <Text style={styles.modalCloseText}>✕ Close</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.modalImageContainer}>
            {selectedPhoto ? (
              <Image
                source={{ uri: selectedPhoto }}
                style={styles.modalImage}
                resizeMode="contain"
              />
            ) : null}
          </View>
        </SafeAreaView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.bg },
  container: { flex: 1 },
  content: { padding: Spacing.base, paddingBottom: Spacing.xxxl },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  statusHeader: {
    backgroundColor: Colors.white, borderRadius: BorderRadius.lg, padding: Spacing.base,
    marginBottom: Spacing.md, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    borderWidth: 1, borderColor: Colors.borderLight,
  },
  statusLabel: { fontSize: FontSize.md, fontWeight: FontWeight.bold, color: Colors.accent },
  date: { fontSize: FontSize.xs, color: Colors.muted },

  section: {
    backgroundColor: Colors.white, borderRadius: BorderRadius.lg, padding: Spacing.base,
    marginBottom: Spacing.md, borderWidth: 1, borderColor: Colors.borderLight,
  },
  sectionTitle: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.text, marginBottom: Spacing.xs },
  category: { fontSize: FontSize.base, fontWeight: FontWeight.semibold, color: Colors.text },
  model: { fontSize: FontSize.sm, color: Colors.muted, marginTop: 2 },
  description: { fontSize: FontSize.sm, color: Colors.textSecondary, lineHeight: 20 },

  photoStrip: { marginTop: Spacing.xs },
  photoThumbWrapper: {
    width: 100,
    height: 100,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
    marginRight: Spacing.sm,
    backgroundColor: '#F1F5F9',
    position: 'relative',
  },
  photoThumb: { width: '100%', height: '100%' },
  zoomBadge: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
  },
  zoomText: { color: '#FFFFFF', fontSize: 10, fontWeight: FontWeight.bold },

  mapCard: {
    backgroundColor: Colors.white, borderRadius: BorderRadius.lg, padding: Spacing.base,
    marginBottom: Spacing.md, borderWidth: 1, borderColor: Colors.borderLight,
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
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  quoteFixerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.xs,
    paddingBottom: Spacing.xs,
  },
  fixerInfo: { flex: 1, marginRight: Spacing.sm },
  fixerNameRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, marginBottom: 2 },
  fixerName: { fontSize: FontSize.base, fontWeight: FontWeight.bold, color: Colors.text },
  viewProfileTag: { fontSize: 11, fontWeight: FontWeight.semibold, color: Colors.accent },
  quoteAmount: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.accent },
  fixerStats: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs, marginVertical: Spacing.xs },
  fixerStat: { fontSize: FontSize.xs, color: Colors.muted, backgroundColor: Colors.bg, paddingHorizontal: Spacing.sm, paddingVertical: 2, borderRadius: BorderRadius.full },
  diagnosis: { fontSize: FontSize.sm, color: Colors.textSecondary, lineHeight: 20, marginBottom: Spacing.sm },
  quoteActions: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.xs },
  chatFixerBtn: {
    flex: 1,
    backgroundColor: Colors.accentSoft,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.accent,
  },
  chatFixerBtnText: { color: Colors.accent, fontSize: FontSize.xs, fontWeight: FontWeight.bold },
  acceptBtn: {
    flex: 1.5,
    backgroundColor: Colors.accent,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  acceptBtnText: { color: Colors.white, fontSize: FontSize.xs, fontWeight: FontWeight.bold },
  quoteBadge: { flex: 1, paddingVertical: Spacing.xs, borderRadius: BorderRadius.md, alignItems: 'center' },
  quoteBadgeText: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold },
  cancelBtn: { marginTop: Spacing.sm },

  modalContainer: { flex: 1, backgroundColor: '#000000' },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.base,
    borderBottomWidth: 1,
    borderBottomColor: '#222222',
  },
  modalTitle: { color: '#FFFFFF', fontSize: FontSize.base, fontWeight: FontWeight.bold },
  modalCloseBtn: { padding: Spacing.xs },
  modalCloseText: { color: '#EF4444', fontSize: FontSize.sm, fontWeight: FontWeight.bold },
  modalImageContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  modalImage: { width: '100%', height: '100%' },
});
