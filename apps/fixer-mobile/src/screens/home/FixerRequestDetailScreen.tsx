import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  Image,
} from 'react-native';
import { Button } from '../../components/ui';
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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDetail = async () => {
      try {
        const { data } = await api.get(`/repair-requests/feed/${requestId}`);
        const r = data?.data || data;
        if (r) setRequest(r);
      } catch (err) {
        console.error('[Fetch Fixer Request Detail Error]', err);
      } finally {
        setLoading(false);
      }
    };
    fetchDetail();
  }, [requestId]);

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
            <Text style={styles.cardTitle}>📸 Customer Photos ({request.media.length})</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photoRow}>
              {request.media.map((m, idx) => (
                <Image
                  key={m.id || idx}
                  source={{ uri: m.storageKey }}
                  style={styles.photoThumb}
                />
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

          {/* Visual Map Area */}
          <View style={styles.mapVisual}>
            <View style={styles.mapRoadH} />
            <View style={styles.mapRoadV} />
            <View style={styles.mapPinBadge}>
              <Text style={styles.mapPinIcon}>📍</Text>
              <Text style={styles.mapPinText} numberOfLines={1}>
                {request.area || request.city || 'Customer Area'}
              </Text>
            </View>
          </View>

          <Text style={styles.addressText}>{fullAddress}</Text>

          {request.latitude && request.longitude ? (
            <Text style={styles.gpsText}>
              GPS Coordinates: {Number(request.latitude).toFixed(4)}° N, {Number(request.longitude).toFixed(4)}° E
            </Text>
          ) : null}
        </View>
      </ScrollView>

      {/* Bottom Floating Quote Button */}
      <View style={styles.bottomBar}>
        <Button
          title="Send Quote to Customer 💼"
          onPress={() => navigation.navigate('SubmitQuote', {
            requestId: request.id,
            categoryName: request.category?.name,
          })}
          size="lg"
        />
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
  content: { padding: Spacing.base, paddingBottom: 100 },
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
  cardTitle: { fontSize: FontSize.base, fontWeight: FontWeight.bold, color: Colors.text, marginBottom: Spacing.xs },
  scheduleText: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: 2 },
  photoRow: { marginTop: Spacing.xs },
  photoThumb: { width: 90, height: 90, borderRadius: BorderRadius.md, marginRight: Spacing.sm, borderWidth: 1, borderColor: Colors.borderLight },
  mapCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm },
  navBtn: { backgroundColor: Colors.accent, paddingHorizontal: Spacing.md, paddingVertical: 5, borderRadius: BorderRadius.sm },
  navBtnText: { color: Colors.white, fontSize: 12, fontWeight: FontWeight.bold },
  mapVisual: {
    height: 110,
    backgroundColor: '#E8ECEF',
    borderRadius: BorderRadius.md,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: Spacing.xs,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  mapRoadH: { position: 'absolute', left: 0, right: 0, height: 16, backgroundColor: '#FFFFFF', borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#D0D7DE' },
  mapRoadV: { position: 'absolute', top: 0, bottom: 0, width: 16, backgroundColor: '#FFFFFF', borderLeftWidth: 1, borderRightWidth: 1, borderColor: '#D0D7DE' },
  mapPinBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    paddingHorizontal: Spacing.md,
    paddingVertical: 5,
    borderRadius: BorderRadius.full,
    borderWidth: 1.5,
    borderColor: Colors.accent,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
    gap: 4,
  },
  mapPinIcon: { fontSize: 16 },
  mapPinText: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, color: Colors.text },
  addressText: { fontSize: FontSize.sm, color: Colors.text, marginTop: Spacing.xs, lineHeight: 20 },
  gpsText: { fontSize: 11, color: Colors.muted, marginTop: 2, fontWeight: FontWeight.medium },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.white,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
});
