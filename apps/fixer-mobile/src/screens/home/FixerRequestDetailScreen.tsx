import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  Image,
  Modal,
  SafeAreaView,
  StatusBar,
  Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Button } from '../../components/ui';
import { InteractiveMapView } from '../../components/ui/InteractiveMapView';
import { Colors, FontSize, FontWeight, Spacing, BorderRadius } from '../../theme/tokens';
import { api } from '../../services/api';

interface RequestDetail {
  id: string;
  problemTitle?: string;
  problemDescription?: string;
  description?: string;
  status: string;
  priority?: string;
  urgency?: string;
  deviceModel: string | null;
  category: { name: string; slug?: string };
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
  preferredDate?: string | null;
  preferredTime?: string | null;
  media?: Array<{ id: string; storageKey: string }> | null;
  createdAt: string;
}

const URGENCY_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  LOW: { label: 'Normal Priority', color: Colors.info, bg: '#EFF6FF' },
  MEDIUM: { label: 'Medium Priority', color: Colors.info, bg: '#EFF6FF' },
  HIGH: { label: 'High Priority', color: Colors.warning, bg: '#FEF3C7' },
  EMERGENCY: { label: '⚡ Emergency Repair', color: Colors.error, bg: '#FEE2E2' },
};

export function FixerRequestDetailScreen({ route, navigation }: any) {
  const { requestId } = route.params;
  const [request, setRequest] = useState<RequestDetail | null>(null);
  const [myQuote, setMyQuote] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [startingChat, setStartingChat] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);

  const fetchDetail = useCallback(async () => {
    try {
      const [reqRes, quoteRes] = await Promise.all([
        api.get(`/repair-requests/feed/${requestId}`).catch(() => null),
        api.get(`/quotes/request/${requestId}/mine`).catch(() => null),
      ]);

      const r = reqRes?.data?.data || reqRes?.data;
      if (r) setRequest(r);

      const q = quoteRes?.data?.data || quoteRes?.data;
      if (q && q.id && q.status !== 'WITHDRAWN') {
        setMyQuote(q);
      } else {
        setMyQuote(null);
      }
    } catch (err) {
      console.error('[Fetch Fixer Request Detail Error]', err);
    } finally {
      setLoading(false);
    }
  }, [requestId]);

  useFocusEffect(
    useCallback(() => {
      fetchDetail();
    }, [fetchDetail]),
  );

  const handleStartChat = async () => {
    if (!request) return;
    setStartingChat(true);
    try {
      const { data } = await api.post('/chat/conversations', {
        requestId: request.id,
      });
      const conv = data?.data || data;
      if (conv?.id) {
        navigation.navigate('ChatRoom', {
          conversationId: conv.id,
          otherUserName: 'Customer',
        });
      }
    } catch (err: any) {
      console.error('[Start Chat Error]', err?.response?.data || err);
      const msg = err?.response?.data?.error?.message || err?.response?.data?.message || 'Unable to open chat conversation';
      Alert.alert('Chat Error', msg);
    } finally {
      setStartingChat(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.accent} />
      </View>
    );
  }

  if (!request) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyTitle}>Request Not Found</Text>
        <Text style={styles.emptySubtitle}>This repair request is no longer available or was assigned to another fixer.</Text>
        <Button title="Back to Feed" onPress={() => navigation.goBack()} variant="outline" size="sm" />
      </View>
    );
  }

  const urgencyKey = request.urgency || request.priority || 'MEDIUM';
  const urgency = URGENCY_CONFIG[urgencyKey] || URGENCY_CONFIG.MEDIUM;
  const fullAddress = [
    request.houseBuilding,
    request.street,
    request.area,
    request.landmark,
    request.city,
    request.state,
    request.pincode,
  ].filter(Boolean).join(', ') || 'Customer Locality';

  const desc = request.problemDescription || request.description || 'No description provided';

  return (
    <View style={styles.flex}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* Device & Urgency Header */}
        <View style={styles.card}>
          <View style={styles.headerRow}>
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryText}>{request.category?.name || 'Device Repair'}</Text>
            </View>
            <View style={[styles.urgencyBadge, { backgroundColor: urgency.bg }]}>
              <Text style={[styles.urgencyText, { color: urgency.color }]}>{urgency.label}</Text>
            </View>
          </View>

          {request.deviceModel ? (
            <Text style={styles.deviceModel}>{request.deviceModel}</Text>
          ) : null}

          {request.brand?.name ? (
            <Text style={styles.brandText}>Brand: {request.brand.name}</Text>
          ) : null}

          <Text style={styles.sectionHeading}>Problem Description</Text>
          <Text style={styles.descText}>{desc}</Text>

          <Text style={styles.postedDate}>
            Posted on {new Date(request.createdAt).toLocaleDateString('en-IN', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Text>
        </View>

        {/* Existing Quote Banner if Submitted */}
        {myQuote && (
          <View style={styles.myQuoteCard}>
            <View style={styles.myQuoteHeader}>
              <Text style={styles.myQuoteTitle}>✅ Your Submitted Quote</Text>
              <View style={styles.myQuoteBadge}>
                <Text style={styles.myQuoteBadgeText}>{myQuote.status}</Text>
              </View>
            </View>
            <Text style={styles.myQuoteAmount}>
              ₹{Number(myQuote.estimatedTotal || myQuote.amount || 0).toLocaleString('en-IN')}
            </Text>
            {myQuote.notes ? (
              <Text style={styles.myQuoteNotes}>Notes: {myQuote.notes}</Text>
            ) : null}
            <Text style={styles.myQuoteSub}>
              Warranty: {myQuote.warrantyDays || 0} days · Tap below to edit
            </Text>
          </View>
        )}

        {/* Customer Preferred Time */}
        {(request.preferredDate || request.preferredTime) && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>⏰ Preferred Schedule</Text>
            {request.preferredDate && (
              <Text style={styles.scheduleText}>Date: {request.preferredDate}</Text>
            )}
            {request.preferredTime && (
              <Text style={styles.scheduleText}>Time: {request.preferredTime}</Text>
            )}
          </View>
        )}

        {/* Attached Photos */}
        {request.media && request.media.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>📸 Customer Photos (Tap to view)</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photoRow}>
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

        {/* Service Location & Map Card */}
        <View style={styles.card}>
          <View style={styles.mapCardHeader}>
            <Text style={styles.cardTitle}>📍 Service Location & Map</Text>
            <TouchableOpacity
              style={styles.navBtn}
              onPress={() => {
                if (request.latitude && request.longitude) {
                  Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${request.latitude},${request.longitude}`);
                } else {
                  Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fullAddress)}`);
                }
              }}
            >
              <Text style={styles.navBtnText}>Navigate 🗺️</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.addressText}>{fullAddress}</Text>

          {request.latitude && request.longitude ? (
            <View style={styles.inlineMapContainer}>
              <InteractiveMapView
                markers={[
                  {
                    id: request.id,
                    latitude: request.latitude,
                    longitude: request.longitude,
                    title: request.area || request.city || 'Customer Location',
                    icon: '📍',
                    badge: 'Customer Location',
                  },
                ]}
                centerLat={request.latitude}
                centerLng={request.longitude}
                initialZoom={15}
                style={styles.inlineMap}
                showNavigationButton={true}
              />
            </View>
          ) : null}

          {request.latitude && request.longitude ? (
            <Text style={styles.gpsText}>
              GPS Coordinates: {Number(request.latitude).toFixed(4)}° N, {Number(request.longitude).toFixed(4)}° E
            </Text>
          ) : null}
        </View>
      </ScrollView>

      {/* Fullscreen Photo Lightbox Modal */}
      <Modal
        visible={!!selectedPhoto}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setSelectedPhoto(null)}
      >
        <SafeAreaView style={styles.modalBackdrop}>
          <StatusBar barStyle="light-content" backgroundColor="#000" />
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

      {/* Dual Floating Bottom Actions: Chat with Customer & Send / Edit Quote */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={styles.chatActionBtn}
          activeOpacity={0.8}
          onPress={handleStartChat}
          disabled={startingChat}
        >
          {startingChat ? (
            <ActivityIndicator size="small" color={Colors.accent} />
          ) : (
            <Text style={styles.chatActionText}>💬 Chat</Text>
          )}
        </TouchableOpacity>

        {myQuote?.status === 'ACCEPTED' ? (
          <TouchableOpacity
            style={[styles.quoteActionBtn, { backgroundColor: Colors.primary }]}
            activeOpacity={0.8}
            onPress={() => {
              // Navigate to jobs
              navigation.navigate('MyJobsTab');
            }}
          >
            <Text style={styles.quoteActionText}>Manage Job 🔧</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.quoteActionBtn, myQuote && styles.quoteActionBtnEdit]}
            activeOpacity={0.8}
            onPress={() => navigation.navigate('SubmitQuote', {
              requestId: request.id,
              categoryName: request.category?.name,
              existingQuote: myQuote,
            })}
          >
            <Text style={styles.quoteActionText}>
              {myQuote ? 'Edit Quote ✏️' : 'Send Quote 💼'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.bg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: Spacing.xl },
  emptyTitle: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.text, marginBottom: Spacing.xs },
  emptySubtitle: { fontSize: FontSize.sm, color: Colors.muted, textAlign: 'center', marginBottom: Spacing.lg },
  container: { flex: 1 },
  content: { padding: Spacing.base, paddingBottom: 110 },
  card: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm },
  categoryBadge: { backgroundColor: Colors.accentSoft, paddingHorizontal: Spacing.sm, paddingVertical: 4, borderRadius: BorderRadius.full },
  categoryText: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, color: Colors.accent },
  urgencyBadge: { paddingHorizontal: Spacing.sm, paddingVertical: 4, borderRadius: BorderRadius.full },
  urgencyText: { fontSize: FontSize.xs, fontWeight: FontWeight.bold },
  deviceModel: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.text, marginBottom: 2 },
  brandText: { fontSize: FontSize.sm, color: Colors.textSecondary, marginBottom: Spacing.sm },
  sectionHeading: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, color: Colors.muted, textTransform: 'uppercase', marginTop: Spacing.sm, marginBottom: 4 },
  descText: { fontSize: FontSize.base, color: Colors.text, lineHeight: 22, marginBottom: Spacing.sm },
  postedDate: { fontSize: FontSize.xs, color: Colors.muted, borderTopWidth: 1, borderTopColor: Colors.borderLight, paddingTop: Spacing.xs, marginTop: Spacing.xs },
  myQuoteCard: {
    backgroundColor: '#F0FDF4',
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    marginBottom: Spacing.md,
    borderWidth: 1.5,
    borderColor: '#86EFAC',
  },
  myQuoteHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.xs },
  myQuoteTitle: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: '#166534' },
  myQuoteBadge: { backgroundColor: '#DCFCE7', paddingHorizontal: Spacing.sm, paddingVertical: 2, borderRadius: BorderRadius.full },
  myQuoteBadgeText: { fontSize: 10, fontWeight: FontWeight.bold, color: '#15803D' },
  myQuoteAmount: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: '#166534', marginVertical: 2 },
  myQuoteNotes: { fontSize: FontSize.xs, color: '#15803D', marginTop: 2 },
  myQuoteSub: { fontSize: 11, color: '#166534', opacity: 0.8, marginTop: 4 },
  cardTitle: { fontSize: FontSize.base, fontWeight: FontWeight.bold, color: Colors.text, marginBottom: Spacing.xs },
  scheduleText: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: 2 },
  photoRow: { marginTop: Spacing.xs },
  photoThumbWrapper: { marginRight: Spacing.sm, position: 'relative' },
  photoThumb: { width: 100, height: 100, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: Colors.borderLight },
  zoomBadge: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    backgroundColor: 'rgba(0,0,0,0.65)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  zoomText: { color: Colors.white, fontSize: 10, fontWeight: FontWeight.bold },
  mapCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm },
  navBtn: { backgroundColor: Colors.accent, paddingHorizontal: Spacing.md, paddingVertical: 5, borderRadius: BorderRadius.sm },
  navBtnText: { color: Colors.white, fontSize: 12, fontWeight: FontWeight.bold },
  inlineMapContainer: {
    height: 190,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
    marginTop: Spacing.sm,
    marginBottom: Spacing.xs,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  inlineMap: {
    width: '100%',
    height: '100%',
  },
  addressText: { fontSize: FontSize.sm, color: Colors.text, marginTop: Spacing.xs, lineHeight: 20 },
  gpsText: { fontSize: 11, color: Colors.muted, marginTop: 2, fontWeight: FontWeight.medium },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.white,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
    flexDirection: 'row',
    gap: Spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  chatActionBtn: {
    flex: 1,
    backgroundColor: Colors.accentSoft,
    borderWidth: 1.5,
    borderColor: Colors.accent,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatActionText: {
    color: Colors.accent,
    fontSize: FontSize.base,
    fontWeight: FontWeight.bold,
  },
  quoteActionBtn: {
    flex: 1.6,
    backgroundColor: Colors.accent,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quoteActionBtnEdit: {
    backgroundColor: '#059669', // Emerald green for edit mode
  },
  quoteActionText: {
    color: Colors.white,
    fontSize: FontSize.base,
    fontWeight: FontWeight.bold,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
  },
  modalTitle: { color: Colors.white, fontSize: FontSize.base, fontWeight: FontWeight.semibold },
  modalCloseBtn: {
    backgroundColor: '#374151',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  modalCloseText: { color: Colors.white, fontSize: FontSize.xs, fontWeight: FontWeight.bold },
  modalImageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.base,
  },
  modalImage: {
    width: '100%',
    height: '100%',
  },
});
