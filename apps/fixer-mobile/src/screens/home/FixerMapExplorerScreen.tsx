import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Linking,
  Alert,
  FlatList,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Input } from '../../components/ui';
import { InteractiveMapView, MapMarker } from '../../components/ui/InteractiveMapView';
import { Colors, FontSize, FontWeight, Spacing, BorderRadius } from '../../theme/tokens';
import { api } from '../../services/api';

interface RepairRequest {
  id: string;
  problemTitle?: string;
  problemDescription?: string;
  description?: string;
  status: string;
  urgency?: string;
  priority?: string;
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
  createdAt: string;
}

const URGENCY_STYLES: Record<string, { label: string; bg: string; color: string; border: string }> = {
  EMERGENCY: { label: '⚡ Emergency', bg: '#FEE2E2', color: '#DC2626', border: '#EF4444' },
  HIGH: { label: '🔥 High', bg: '#FEF3C7', color: '#D97706', border: '#F59E0B' },
  MEDIUM: { label: 'Medium', bg: '#EFF6FF', color: '#2563EB', border: '#3B82F6' },
  LOW: { label: 'Normal', bg: '#F3F4F6', color: '#4B5563', border: '#9CA3AF' },
};

const CATEGORY_ICONS: Record<string, string> = {
  smartphone: '📱',
  mobile: '📱',
  laptop: '💻',
  computer: '🖥️',
  tablet: '📱',
  television: '📺',
  tv: '📺',
  ac: '❄️',
  refrigerator: '🧊',
  'washing machine': '🧺',
  audio: '🎧',
  camera: '📷',
  default: '🔧',
};

export function FixerMapExplorerScreen({ navigation }: any) {
  const [requests, setRequests] = useState<RepairRequest[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<RepairRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [startingChat, setStartingChat] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUrgency, setSelectedUrgency] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [categories, setCategories] = useState<any[]>([]);
  const [viewMode, setViewMode] = useState<'map' | 'list'>('map');
  const [zoomLevel, setZoomLevel] = useState<number>(1.0);

  const handleZoomIn = () => {
    setZoomLevel((z) => Math.min(Number((z + 0.25).toFixed(2)), 2.2));
  };

  const handleZoomOut = () => {
    setZoomLevel((z) => Math.max(Number((z - 0.25).toFixed(2)), 0.6));
  };

  const handleResetZoom = () => {
    setZoomLevel(1.0);
  };

  const fetchCategories = async () => {
    try {
      const { data } = await api.get('/categories');
      const cats = data?.data?.data || data?.data || data;
      setCategories(Array.isArray(cats) ? cats : []);
    } catch {}
  };

  const fetchFeed = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = { limit: 50 };
      if (selectedCategory) params.categoryId = selectedCategory;

      const { data } = await api.get('/repair-requests/feed', { params });
      const raw = data?.data?.data || data?.data || data;
      let list: RepairRequest[] = Array.isArray(raw) ? raw : (Array.isArray(raw?.data) ? raw.data : []);

      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        list = list.filter((r) => {
          const fullAddr = `${r.houseBuilding || ''} ${r.street || ''} ${r.area || ''} ${r.city || ''} ${r.pincode || ''}`.toLowerCase();
          const desc = `${r.problemTitle || ''} ${r.problemDescription || ''} ${r.deviceModel || ''}`.toLowerCase();
          return fullAddr.includes(q) || desc.includes(q);
        });
      }

      if (selectedUrgency) {
        list = list.filter((r) => (r.urgency || r.priority) === selectedUrgency);
      }

      setRequests(list);
      if (list.length > 0) {
        setSelectedRequest(list[0]);
      } else {
        setSelectedRequest(null);
      }
    } catch (err) {
      console.error('[Fetch Map Feed Error]', err);
      setRequests([]);
      setSelectedRequest(null);
    } finally {
      setLoading(false);
    }
  }, [selectedCategory, selectedUrgency, searchQuery]);

  useEffect(() => {
    fetchCategories();
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchFeed();
    }, [fetchFeed]),
  );

  const handleStartChat = async (request: RepairRequest) => {
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
      const msg = err?.response?.data?.error?.message || err?.response?.data?.message || 'Unable to open chat';
      Alert.alert('Chat Error', msg);
    } finally {
      setStartingChat(false);
    }
  };

  const getCategoryIcon = (catName: string = '') => {
    const key = Object.keys(CATEGORY_ICONS).find((k) => catName.toLowerCase().includes(k));
    return key ? CATEGORY_ICONS[key] : CATEGORY_ICONS.default;
  };

  const mapMarkers: MapMarker[] = React.useMemo(() => {
    return requests.map((req, index) => {
      const urgencyKey = req.urgency || req.priority || 'MEDIUM';
      const urgency = URGENCY_STYLES[urgencyKey] || URGENCY_STYLES.MEDIUM;

      // Realistic GPS fallback centered on city if coordinates not set
      const baseLat = 12.9716;
      const baseLng = 77.5946;
      const lat = req.latitude || (baseLat + (((index * 3) % 7) - 3) * 0.015);
      const lng = req.longitude || (baseLng + (((index * 4) % 7) - 3) * 0.015);

      return {
        id: req.id,
        latitude: lat,
        longitude: lng,
        title: req.area || req.city || 'Customer',
        icon: getCategoryIcon(req.category?.name),
        badge: urgency.label,
        badgeBg: urgency.bg,
        badgeColor: urgency.color,
        urgency: urgencyKey,
        data: req,
      };
    });
  }, [requests]);

  const renderRequestItem = ({ item }: { item: RepairRequest }) => {
    const urgencyKey = item.urgency || item.priority || 'MEDIUM';
    const urgency = URGENCY_STYLES[urgencyKey] || URGENCY_STYLES.MEDIUM;
    const fullAddress = [item.area, item.city, item.pincode].filter(Boolean).join(', ') || 'Customer Area';

    return (
      <View style={styles.listCard}>
        <View style={styles.listCardHeader}>
          <View style={styles.catBadge}>
            <Text style={styles.catBadgeIcon}>{getCategoryIcon(item.category?.name)}</Text>
            <Text style={styles.catBadgeText}>{item.category?.name || 'Device'}</Text>
          </View>
          <View style={[styles.urgencyBadge, { backgroundColor: urgency.bg }]}>
            <Text style={[styles.urgencyText, { color: urgency.color }]}>{urgency.label}</Text>
          </View>
        </View>

        <Text style={styles.listDeviceModel}>{item.deviceModel || 'Customer Repair Request'}</Text>
        <Text style={styles.listDesc} numberOfLines={2}>
          {item.problemDescription || item.description || 'No description provided'}
        </Text>
        <Text style={styles.listLocation}>📍 {fullAddress}</Text>

        <View style={styles.listActions}>
          <TouchableOpacity
            style={styles.chatActionBtn}
            onPress={() => handleStartChat(item)}
            disabled={startingChat}
          >
            <Text style={styles.chatActionText}>💬 Chat</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quoteActionBtn}
            onPress={() => navigation.navigate('SubmitQuote', {
              requestId: item.id,
              categoryName: item.category?.name,
            })}
          >
            <Text style={styles.quoteActionText}>Quote 💼</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.detailActionBtn}
            onPress={() => navigation.navigate('RequestDetail', { requestId: item.id })}
          >
            <Text style={styles.detailActionText}>Details 📄</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header & Filter Controls */}
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <View>
            <Text style={styles.title}>Customer Requests Map 🗺️</Text>
            <Text style={styles.subtitle}>
              {requests.length} open repair requests available in your region
            </Text>
          </View>

          {/* Map vs List Toggle */}
          <View style={styles.viewToggle}>
            <TouchableOpacity
              style={[styles.toggleBtn, viewMode === 'map' && styles.toggleBtnActive]}
              onPress={() => setViewMode('map')}
            >
              <Text style={[styles.toggleBtnText, viewMode === 'map' && styles.toggleBtnTextActive]}>
                🗺️ Map
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.toggleBtn, viewMode === 'list' && styles.toggleBtnActive]}
              onPress={() => setViewMode('list')}
            >
              <Text style={[styles.toggleBtnText, viewMode === 'list' && styles.toggleBtnTextActive]}>
                📋 List
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Search Input for Location / Pincode / Title */}
        <Input
          placeholder="Filter by city, area, pincode (e.g. 560001)..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          onSubmitEditing={fetchFeed}
          returnKeyType="search"
          containerStyle={styles.searchBar}
        />

        {/* Quick Filter Chips for Urgency and Categories */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
          <TouchableOpacity
            style={[styles.chip, !selectedUrgency && !selectedCategory && styles.chipActive]}
            onPress={() => {
              setSelectedUrgency('');
              setSelectedCategory('');
            }}
          >
            <Text style={[styles.chipText, !selectedUrgency && !selectedCategory && styles.chipTextActive]}>
              All ({requests.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.chip, selectedUrgency === 'EMERGENCY' && styles.chipEmergencyActive]}
            onPress={() => setSelectedUrgency(selectedUrgency === 'EMERGENCY' ? '' : 'EMERGENCY')}
          >
            <Text style={[styles.chipText, selectedUrgency === 'EMERGENCY' && styles.chipTextEmergencyActive]}>
              ⚡ Emergency Only
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.chip, selectedUrgency === 'HIGH' && styles.chipActive]}
            onPress={() => setSelectedUrgency(selectedUrgency === 'HIGH' ? '' : 'HIGH')}
          >
            <Text style={[styles.chipText, selectedUrgency === 'HIGH' && styles.chipTextActive]}>
              🔥 High Urgency
            </Text>
          </TouchableOpacity>

          {(categories || []).map((c) => (
            <TouchableOpacity
              key={c.id}
              style={[styles.chip, selectedCategory === c.id && styles.chipActive]}
              onPress={() => setSelectedCategory(selectedCategory === c.id ? '' : c.id)}
            >
              <Text style={[styles.chipText, selectedCategory === c.id && styles.chipTextActive]}>
                {getCategoryIcon(c.name)} {c.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Main Content View */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.accent} />
          <Text style={styles.loadingText}>Loading requests on map...</Text>
        </View>
      ) : viewMode === 'map' ? (
        /* Visual Interactive Map Canvas */
        <View style={styles.mapContainer}>
          <InteractiveMapView
            markers={mapMarkers}
            selectedMarkerId={selectedRequest?.id}
            onMarkerPress={(marker) => setSelectedRequest(marker.data)}
            style={styles.flexMap}
            showNavigationButton={false}
          />

          {/* Floating Selected Request Detail Card */}
          {selectedRequest && (
            <View style={styles.floatingCard}>
              <View style={styles.cardHeaderRow}>
                <View style={styles.catBadge}>
                  <Text style={styles.catBadgeIcon}>{getCategoryIcon(selectedRequest.category?.name)}</Text>
                  <Text style={styles.catBadgeText}>{selectedRequest.category?.name || 'Device'}</Text>
                </View>
                <View style={[
                  styles.urgencyBadge,
                  { backgroundColor: (URGENCY_STYLES[selectedRequest.urgency || selectedRequest.priority || 'MEDIUM'] || URGENCY_STYLES.MEDIUM).bg },
                ]}>
                  <Text style={[
                    styles.urgencyText,
                    { color: (URGENCY_STYLES[selectedRequest.urgency || selectedRequest.priority || 'MEDIUM'] || URGENCY_STYLES.MEDIUM).color },
                  ]}>
                    {(URGENCY_STYLES[selectedRequest.urgency || selectedRequest.priority || 'MEDIUM'] || URGENCY_STYLES.MEDIUM).label}
                  </Text>
                </View>
              </View>

              <Text style={styles.floatingDeviceModel}>
                {selectedRequest.deviceModel || 'Customer Repair'}
              </Text>
              <Text style={styles.floatingDesc} numberOfLines={2}>
                {selectedRequest.problemDescription || selectedRequest.description || 'No description provided'}
              </Text>

              <Text style={styles.floatingAddress}>
                📍 {[selectedRequest.area, selectedRequest.city, selectedRequest.pincode].filter(Boolean).join(', ') || 'Customer Locality'}
              </Text>

              {/* Action Buttons: Chat, Quote, Details, Directions */}
              <View style={styles.actionRow}>
                <TouchableOpacity
                  style={styles.chatBtn}
                  onPress={() => handleStartChat(selectedRequest)}
                  disabled={startingChat}
                >
                  <Text style={styles.chatBtnText}>💬 Chat</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.quoteBtn}
                  onPress={() => navigation.navigate('SubmitQuote', {
                    requestId: selectedRequest.id,
                    categoryName: selectedRequest.category?.name,
                  })}
                >
                  <Text style={styles.quoteBtnText}>Quote 💼</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.navBtn}
                  onPress={() => {
                    const fullAddr = [
                      selectedRequest.houseBuilding,
                      selectedRequest.street,
                      selectedRequest.area,
                      selectedRequest.city,
                      selectedRequest.pincode,
                    ].filter(Boolean).join(', ');

                    if (selectedRequest.latitude && selectedRequest.longitude) {
                      Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${selectedRequest.latitude},${selectedRequest.longitude}`);
                    } else {
                      Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fullAddr || selectedRequest.city || 'India')}`);
                    }
                  }}
                >
                  <Text style={styles.navBtnText}>🗺️ Maps</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.detailsBtn}
                  onPress={() => navigation.navigate('RequestDetail', { requestId: selectedRequest.id })}
                >
                  <Text style={styles.detailsBtnText}>View 📄</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      ) : (
        /* List Mode */
        <FlatList
          data={requests}
          keyExtractor={(item) => item.id}
          renderItem={renderRequestItem}
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={
            <View style={styles.emptyList}>
              <Text style={styles.emptyIcon}>📋</Text>
              <Text style={styles.emptyTitle}>No matching repair requests</Text>
              <Text style={styles.emptySub}>Try adjusting your urgency or location filters</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: Spacing.sm, color: Colors.muted, fontSize: FontSize.sm },
  header: {
    backgroundColor: Colors.white,
    paddingHorizontal: Spacing.base,
    paddingTop: Spacing.xl + 10,
    paddingBottom: Spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.xs },
  title: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.text },
  subtitle: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 1 },
  viewToggle: {
    flexDirection: 'row',
    backgroundColor: Colors.bg,
    borderRadius: BorderRadius.full,
    padding: 2,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  toggleBtn: { paddingHorizontal: Spacing.sm, paddingVertical: 4, borderRadius: BorderRadius.full },
  toggleBtnActive: { backgroundColor: Colors.accent },
  toggleBtnText: { fontSize: FontSize.xs, color: Colors.muted, fontWeight: FontWeight.semibold },
  toggleBtnTextActive: { color: Colors.white, fontWeight: FontWeight.bold },
  searchBar: { marginBottom: Spacing.xs },
  chipRow: { gap: Spacing.xs, paddingBottom: Spacing.xs },
  chip: {
    backgroundColor: Colors.bg,
    paddingHorizontal: Spacing.md,
    paddingVertical: 5,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  chipActive: { backgroundColor: Colors.accentSoft, borderColor: Colors.accent },
  chipEmergencyActive: { backgroundColor: '#FEE2E2', borderColor: '#EF4444' },
  chipText: { fontSize: FontSize.xs, color: Colors.text, fontWeight: FontWeight.medium },
  chipTextActive: { color: Colors.accent, fontWeight: FontWeight.bold },
  chipTextEmergencyActive: { color: '#DC2626', fontWeight: FontWeight.bold },
  mapContainer: { flex: 1, position: 'relative', overflow: 'hidden' },
  flexMap: { flex: 1, width: '100%', height: '100%' },
  mapScrollContent: { flexGrow: 1, minHeight: '100%' },
  mapCanvas: {
    flex: 1,
    minHeight: 450,
    backgroundColor: '#E5E7EB',
    position: 'relative',
    overflow: 'hidden',
  },
  zoomControlsHud: {
    position: 'absolute',
    top: Spacing.md,
    right: Spacing.md,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: BorderRadius.lg,
    padding: 4,
    alignItems: 'center',
    gap: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 6,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    zIndex: 10,
  },
  zoomBtn: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.md,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  zoomBtnText: { fontSize: 18, fontWeight: FontWeight.bold, color: Colors.text },
  zoomLevelBadge: { paddingHorizontal: 4, paddingVertical: 2 },
  zoomLevelText: { fontSize: 9, fontWeight: FontWeight.bold, color: Colors.accent },
  resetZoomBtn: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.accentSoft,
    justifyContent: 'center',
    alignItems: 'center',
  },
  resetZoomText: { fontSize: 14 },
  roadH1: { position: 'absolute', top: '30%', left: 0, right: 0, height: 20, backgroundColor: '#FFFFFF', borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#D1D5DB' },
  roadH2: { position: 'absolute', top: '70%', left: 0, right: 0, height: 26, backgroundColor: '#FFFFFF', borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#D1D5DB' },
  roadV1: { position: 'absolute', left: '25%', top: 0, bottom: 0, width: 20, backgroundColor: '#FFFFFF', borderLeftWidth: 1, borderRightWidth: 1, borderColor: '#D1D5DB' },
  roadV2: { position: 'absolute', left: '65%', top: 0, bottom: 0, width: 22, backgroundColor: '#FFFFFF', borderLeftWidth: 1, borderRightWidth: 1, borderColor: '#D1D5DB' },
  mapMarker: {
    position: 'absolute',
    backgroundColor: Colors.white,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    borderWidth: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 4,
  },
  mapMarkerSelected: {
    backgroundColor: '#EFF6FF',
    transform: [{ scale: 1.12 }],
    borderWidth: 2.5,
    zIndex: 10,
  },
  markerIcon: { fontSize: 13 },
  markerInfo: { maxWidth: 85 },
  markerTitle: { fontSize: 10, fontWeight: FontWeight.bold, color: Colors.text },
  markerUrgency: { fontSize: 8, fontWeight: FontWeight.bold },
  emptyMapNotice: {
    position: 'absolute',
    top: '35%',
    left: '10%',
    right: '10%',
    backgroundColor: 'rgba(255,255,255,0.92)',
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
  },
  emptyMapTitle: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.text },
  emptyMapSub: { fontSize: FontSize.xs, color: Colors.muted, textAlign: 'center', marginTop: 4 },
  floatingCard: {
    position: 'absolute',
    bottom: Spacing.md,
    left: Spacing.md,
    right: Spacing.md,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    padding: Spacing.base,
    borderWidth: 1.5,
    borderColor: Colors.accent,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 8,
  },
  cardHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.xs },
  catBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.accentSoft, paddingHorizontal: Spacing.sm, paddingVertical: 2, borderRadius: BorderRadius.full, gap: 4 },
  catBadgeIcon: { fontSize: 11 },
  catBadgeText: { fontSize: 10, fontWeight: FontWeight.bold, color: Colors.accent },
  urgencyBadge: { paddingHorizontal: Spacing.sm, paddingVertical: 2, borderRadius: BorderRadius.full },
  urgencyText: { fontSize: 10, fontWeight: FontWeight.bold },
  floatingDeviceModel: { fontSize: FontSize.base, fontWeight: FontWeight.bold, color: Colors.text, marginTop: 2 },
  floatingDesc: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 2, lineHeight: 16 },
  floatingAddress: { fontSize: FontSize.xs, color: Colors.text, fontWeight: FontWeight.medium, marginTop: 4 },
  actionRow: { flexDirection: 'row', gap: Spacing.xs, marginTop: Spacing.sm },
  chatBtn: {
    flex: 1,
    backgroundColor: Colors.accentSoft,
    borderWidth: 1,
    borderColor: Colors.accent,
    borderRadius: BorderRadius.md,
    paddingVertical: 7,
    alignItems: 'center',
  },
  chatBtnText: { color: Colors.accent, fontSize: FontSize.xs, fontWeight: FontWeight.bold },
  quoteBtn: {
    flex: 1.2,
    backgroundColor: Colors.accent,
    borderRadius: BorderRadius.md,
    paddingVertical: 7,
    alignItems: 'center',
  },
  quoteBtnText: { color: Colors.white, fontSize: FontSize.xs, fontWeight: FontWeight.bold },
  navBtn: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    borderRadius: BorderRadius.md,
    paddingVertical: 7,
    alignItems: 'center',
  },
  navBtnText: { color: Colors.text, fontSize: FontSize.xs, fontWeight: FontWeight.bold },
  detailsBtn: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    borderRadius: BorderRadius.md,
    paddingVertical: 7,
    alignItems: 'center',
  },
  detailsBtnText: { color: Colors.text, fontSize: FontSize.xs, fontWeight: FontWeight.bold },
  listContainer: { padding: Spacing.base, paddingBottom: Spacing.xxxl },
  listCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  listCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.xs },
  listDeviceModel: { fontSize: FontSize.base, fontWeight: FontWeight.bold, color: Colors.text },
  listDesc: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 2, lineHeight: 18 },
  listLocation: { fontSize: FontSize.xs, color: Colors.text, marginTop: 4, fontWeight: FontWeight.medium },
  listActions: { flexDirection: 'row', gap: Spacing.xs, marginTop: Spacing.sm, borderTopWidth: 1, borderTopColor: Colors.borderLight, paddingTop: Spacing.xs },
  chatActionBtn: {
    flex: 1,
    backgroundColor: Colors.accentSoft,
    borderRadius: BorderRadius.sm,
    paddingVertical: 6,
    alignItems: 'center',
  },
  chatActionText: { color: Colors.accent, fontSize: FontSize.xs, fontWeight: FontWeight.bold },
  quoteActionBtn: {
    flex: 1.2,
    backgroundColor: Colors.accent,
    borderRadius: BorderRadius.sm,
    paddingVertical: 6,
    alignItems: 'center',
  },
  quoteActionText: { color: Colors.white, fontSize: FontSize.xs, fontWeight: FontWeight.bold },
  detailActionBtn: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    borderRadius: BorderRadius.sm,
    paddingVertical: 6,
    alignItems: 'center',
  },
  detailActionText: { color: Colors.text, fontSize: FontSize.xs, fontWeight: FontWeight.bold },
  emptyList: { alignItems: 'center', paddingTop: Spacing.xxxl },
  emptyIcon: { fontSize: 48, marginBottom: Spacing.md },
  emptyTitle: { fontSize: FontSize.md, fontWeight: FontWeight.semibold, color: Colors.text },
  emptySub: { fontSize: FontSize.xs, color: Colors.muted, textAlign: 'center', marginTop: 4 },
});
