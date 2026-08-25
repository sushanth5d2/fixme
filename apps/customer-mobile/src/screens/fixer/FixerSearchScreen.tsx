import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Linking,
} from 'react-native';
import { Input } from '../../components/ui';
import { Colors, FontSize, FontWeight, Spacing, BorderRadius } from '../../theme/tokens';
import { api } from '../../services/api';

interface FixerService {
  category: { id: string; name: string };
  brand: { id: string; name: string } | null;
}

interface Fixer {
  id: string;
  companyName: string;
  ownerName: string;
  city: string;
  pincode: string;
  addressLine?: string;
  averageRating: number;
  totalReviews: number;
  completedJobs: number;
  experienceYears: number;
  emergencyService: boolean;
  services: FixerService[];
  verificationStatus: string;
}

export function FixerSearchScreen({ navigation }: any) {
  const [query, setQuery] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [onlyEmergency, setOnlyEmergency] = useState(false);
  const [fixers, setFixers] = useState<Fixer[]>([]);
  const [selectedFixer, setSelectedFixer] = useState<Fixer | null>(null);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');

  const fetchFixers = useCallback(async (searchQuery = '') => {
    setLoading(true);
    try {
      const params: any = { limit: 50 };
      const trimmed = searchQuery.trim();

      if (trimmed) {
        if (/^\d{6}$/.test(trimmed)) {
          params.pincode = trimmed;
        } else {
          params.query = trimmed;
        }
      }

      if (selectedCity) params.city = selectedCity;

      const { data } = await api.get('/fixers/search', { params });
      const raw = data?.data?.data || data?.data || data;
      const list: Fixer[] = Array.isArray(raw) ? raw : (Array.isArray(raw?.data) ? raw.data : []);
      const filtered = onlyEmergency ? list.filter((f: Fixer) => f.emergencyService) : list;
      setFixers(filtered);
      if (filtered.length > 0) {
        setSelectedFixer(filtered[0]);
      } else {
        setSelectedFixer(null);
      }
    } catch (err) {
      console.error('[Search Fixers Error]', err);
      setFixers([]);
      setSelectedFixer(null);
    } finally {
      setLoading(false);
    }
  }, [selectedCity, onlyEmergency]);

  useEffect(() => {
    fetchFixers(query);
  }, [fetchFixers, query]);

  const openDirections = (fixer: Fixer) => {
    const queryStr = [fixer.addressLine, fixer.city, fixer.pincode].filter(Boolean).join(', ');
    Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(queryStr || fixer.city || 'Bengaluru')}`);
  };

  const renderFixerCard = ({ item }: { item: Fixer }) => {
    const initials = (item.companyName || item.ownerName || 'F')
      .split(' ')
      .slice(0, 2)
      .map((w) => w[0])
      .join('')
      .toUpperCase();

    // Deduplicate service category names
    const uniqueCategories = Array.from(
      new Set(
        (item.services || [])
          .map((s) => s.category?.name)
          .filter(Boolean)
      )
    );

    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.8}
        onPress={() => navigation.navigate('FixerProfile', { fixerId: item.id })}
      >
        {/* Top Info Row */}
        <View style={styles.cardTop}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>

          <View style={styles.info}>
            <View style={styles.nameRow}>
              <Text style={styles.name} numberOfLines={1}>
                {item.companyName || item.ownerName}
              </Text>
              <View style={styles.verifiedBadge}>
                <Text style={styles.verifiedText}>✓ Verified</Text>
              </View>
            </View>

            <Text style={styles.ownerText}>
              {item.ownerName ? `${item.ownerName} · ` : ''}📍 {item.city} {item.pincode ? `(${item.pincode})` : ''}
            </Text>

            {/* Rating and Highlights */}
            <View style={styles.metaBadgeRow}>
              <View style={styles.ratingBadge}>
                <Text style={styles.ratingStar}>★</Text>
                <Text style={styles.ratingScore}>
                  {Number(item.averageRating || 5).toFixed(1)}
                </Text>
                <Text style={styles.reviewCount}>({item.totalReviews || 0})</Text>
              </View>

              <View style={styles.highlightBadge}>
                <Text style={styles.highlightText}>{item.completedJobs || 0} Jobs done</Text>
              </View>

              <View style={styles.highlightBadge}>
                <Text style={styles.highlightText}>{item.experienceYears || 1}+ yrs exp</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Specialty Services Tags */}
        {uniqueCategories.length > 0 ? (
          <View style={styles.tagRow}>
            {uniqueCategories.slice(0, 3).map((catName, idx) => (
              <View key={idx} style={styles.tag}>
                <Text style={styles.tagText}>🔧 {catName}</Text>
              </View>
            ))}
          </View>
        ) : null}

        {/* Emergency Service Banner */}
        {item.emergencyService ? (
          <View style={styles.emergencyBanner}>
            <Text style={styles.emergencyBannerText}>⚡ 24/7 Emergency Repair Available</Text>
          </View>
        ) : null}

        {/* Card Footer Actions */}
        <View style={styles.cardFooter}>
          <TouchableOpacity
            style={styles.directionsBtn}
            onPress={() => openDirections(item)}
          >
            <Text style={styles.directionsBtnText}>🗺️ Maps</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.viewProfileBtn}
            onPress={() => navigation.navigate('FixerProfile', { fixerId: item.id })}
          >
            <Text style={styles.viewProfileBtnText}>View Profile & Rates 🔍</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header Controls */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.title}>Find a Fixer 🔧</Text>
            <Text style={styles.subtitle}>Verified repair pros near your location</Text>
          </View>

          {/* Map vs List View Switcher */}
          <View style={styles.toggleRow}>
            <TouchableOpacity
              style={[styles.toggleBtn, viewMode === 'list' && styles.toggleBtnActive]}
              onPress={() => setViewMode('list')}
            >
              <Text style={[styles.toggleBtnText, viewMode === 'list' && styles.toggleBtnTextActive]}>
                📋 List
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.toggleBtn, viewMode === 'map' && styles.toggleBtnActive]}
              onPress={() => setViewMode('map')}
            >
              <Text style={[styles.toggleBtnText, viewMode === 'map' && styles.toggleBtnTextActive]}>
                🗺️ Map
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Search Input Bar */}
        <Input
          placeholder="Search by name, city, area, pincode (e.g. 560001)..."
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={() => fetchFixers(query)}
          returnKeyType="search"
          containerStyle={styles.searchBar}
        />

        {/* Filter Chips Scroll */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsContainer}
        >
          <TouchableOpacity
            style={[styles.filterChip, onlyEmergency && styles.filterChipActive]}
            onPress={() => setOnlyEmergency(!onlyEmergency)}
          >
            <Text style={[styles.filterChipText, onlyEmergency && styles.filterChipTextActive]}>
              ⚡ Emergency Service
            </Text>
          </TouchableOpacity>

          {['Bengaluru', 'Mumbai', 'Delhi', 'Hyderabad', 'Chennai'].map((city) => (
            <TouchableOpacity
              key={city}
              style={[styles.filterChip, selectedCity === city && styles.filterChipActive]}
              onPress={() => setSelectedCity(selectedCity === city ? '' : city)}
            >
              <Text style={[styles.filterChipText, selectedCity === city && styles.filterChipTextActive]}>
                📍 {city}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Main Content */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.accent} />
          <Text style={styles.loadingText}>Searching verified fixers...</Text>
        </View>
      ) : viewMode === 'map' ? (
        /* Map Preview View */
        <View style={styles.mapContainer}>
          <View style={styles.mapCanvas}>
            {/* Street Grid Lines */}
            <View style={styles.mapGridRoad1} />
            <View style={styles.mapGridRoad2} />
            <View style={styles.mapGridRoad3} />
            <View style={styles.mapGridRoad4} />

            {/* Plotted Fixer Pins */}
            {(fixers || []).map((fixer, index) => {
              const isSelected = selectedFixer?.id === fixer.id;
              const leftPos = `${15 + (index * 27) % 65}%` as any;
              const topPos = `${15 + (index * 33) % 55}%` as any;

              return (
                <TouchableOpacity
                  key={fixer.id || index}
                  activeOpacity={0.8}
                  style={[
                    styles.mapPin,
                    { left: leftPos, top: topPos },
                    isSelected && styles.mapPinSelected,
                  ]}
                  onPress={() => setSelectedFixer(fixer)}
                >
                  <Text style={styles.mapPinIcon}>🔧</Text>
                  <Text style={styles.mapPinLabel} numberOfLines={1}>
                    {fixer.companyName || fixer.ownerName}
                  </Text>
                  <View style={styles.pinRatingBadge}>
                    <Text style={styles.pinRatingText}>★ {Number(fixer.averageRating || 5).toFixed(1)}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}

            {(fixers || []).length === 0 && (
              <View style={styles.mapEmptyNotice}>
                <Text style={styles.mapEmptyText}>No fixers found matching your search.</Text>
              </View>
            )}
          </View>

          {/* Floating Selected Fixer Card */}
          {selectedFixer && (
            <View style={styles.floatingCard}>
              <View style={styles.floatingTop}>
                <View style={styles.floatingAvatar}>
                  <Text style={styles.floatingAvatarText}>
                    {(selectedFixer.companyName || selectedFixer.ownerName || 'F')[0].toUpperCase()}
                  </Text>
                </View>
                <View style={styles.floatingInfo}>
                  <View style={styles.nameRow}>
                    <Text style={styles.floatingName} numberOfLines={1}>
                      {selectedFixer.companyName || selectedFixer.ownerName}
                    </Text>
                    <View style={styles.verifiedBadge}>
                      <Text style={styles.verifiedText}>✓ Verified</Text>
                    </View>
                  </View>
                  <Text style={styles.floatingSub}>📍 {selectedFixer.city} · {selectedFixer.completedJobs || 0} jobs</Text>
                  <Text style={styles.floatingRating}>★ {Number(selectedFixer.averageRating || 5).toFixed(1)} ({selectedFixer.totalReviews || 0} reviews)</Text>
                </View>
              </View>

              <View style={styles.floatingActions}>
                <TouchableOpacity
                  style={styles.navActionBtn}
                  onPress={() => openDirections(selectedFixer)}
                >
                  <Text style={styles.navActionBtnText}>🗺️ Directions</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.profileActionBtn}
                  onPress={() => navigation.navigate('FixerProfile', { fixerId: selectedFixer.id })}
                >
                  <Text style={styles.profileActionBtnText}>View Profile 🔍</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      ) : (
        /* List Mode */
        <FlatList
          data={fixers}
          keyExtractor={(item) => item.id}
          renderItem={renderFixerCard}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>🔍</Text>
              <Text style={styles.emptyTitle}>No Fixers Found</Text>
              <Text style={styles.emptyText}>
                Try adjusting your search keywords, city, or remove filters.
              </Text>
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
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  title: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.text },
  subtitle: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 1 },

  searchBar: { marginBottom: Spacing.xs },

  toggleRow: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderRadius: BorderRadius.full,
    padding: 2,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  toggleBtn: {
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  toggleBtnActive: {
    backgroundColor: Colors.accent,
  },
  toggleBtnText: {
    fontSize: 11,
    color: Colors.muted,
    fontWeight: FontWeight.semibold,
  },
  toggleBtnTextActive: {
    color: Colors.white,
    fontWeight: FontWeight.bold,
  },

  chipsContainer: {
    paddingVertical: Spacing.xs,
    gap: Spacing.xs,
  },
  filterChip: {
    backgroundColor: Colors.bg,
    paddingHorizontal: Spacing.md,
    paddingVertical: 5,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    marginRight: Spacing.xs,
  },
  filterChipActive: {
    backgroundColor: Colors.accentSoft,
    borderColor: Colors.accent,
  },
  filterChipText: { fontSize: 11, color: Colors.text, fontWeight: FontWeight.medium },
  filterChipTextActive: { color: Colors.accent, fontWeight: FontWeight.bold },

  list: { padding: Spacing.base, paddingBottom: Spacing.xxxl },

  card: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    padding: Spacing.base,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start' },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: Colors.accentSoft,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.sm + 2,
  },
  avatarText: { fontSize: FontSize.md, fontWeight: FontWeight.bold, color: Colors.accent },
  info: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  name: { fontSize: FontSize.base, fontWeight: FontWeight.bold, color: Colors.text, flex: 1 },
  verifiedBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: Spacing.xs + 2,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: Spacing.xs,
  },
  verifiedText: { color: '#15803D', fontSize: 10, fontWeight: FontWeight.bold },
  ownerText: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 2 },

  metaBadgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: Spacing.xs,
    marginTop: Spacing.xs,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    gap: 2,
  },
  ratingStar: { fontSize: 11, color: '#D97706' },
  ratingScore: { fontSize: 11, fontWeight: FontWeight.bold, color: '#92400E' },
  reviewCount: { fontSize: 10, color: '#B45309' },

  highlightBadge: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  highlightText: { fontSize: 10, color: Colors.text, fontWeight: FontWeight.medium },

  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
    marginTop: Spacing.sm,
  },
  tag: {
    backgroundColor: '#F9FAFB',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  tagText: { fontSize: 11, color: Colors.text, fontWeight: FontWeight.medium },

  emergencyBanner: {
    backgroundColor: '#FEF3C7',
    borderRadius: BorderRadius.md,
    paddingVertical: 4,
    paddingHorizontal: Spacing.sm,
    marginTop: Spacing.sm,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  emergencyBannerText: { fontSize: 11, fontWeight: FontWeight.bold, color: '#B45309' },

  cardFooter: {
    flexDirection: 'row',
    gap: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
    paddingTop: Spacing.sm,
    marginTop: Spacing.sm,
  },
  directionsBtn: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    borderRadius: BorderRadius.md,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  directionsBtnText: { color: Colors.text, fontSize: FontSize.xs, fontWeight: FontWeight.bold },
  viewProfileBtn: {
    flex: 2,
    backgroundColor: Colors.accent,
    borderRadius: BorderRadius.md,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewProfileBtnText: { color: Colors.white, fontSize: FontSize.xs, fontWeight: FontWeight.bold },

  mapContainer: { flex: 1, position: 'relative' },
  mapCanvas: {
    flex: 1,
    backgroundColor: '#E5E7EB',
    position: 'relative',
    overflow: 'hidden',
  },
  mapGridRoad1: { position: 'absolute', top: '25%', left: 0, right: 0, height: 18, backgroundColor: '#FFFFFF', borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#D1D5DB' },
  mapGridRoad2: { position: 'absolute', top: '65%', left: 0, right: 0, height: 24, backgroundColor: '#FFFFFF', borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#D1D5DB' },
  mapGridRoad3: { position: 'absolute', left: '30%', top: 0, bottom: 0, width: 18, backgroundColor: '#FFFFFF', borderLeftWidth: 1, borderRightWidth: 1, borderColor: '#D1D5DB' },
  mapGridRoad4: { position: 'absolute', left: '70%', top: 0, bottom: 0, width: 22, backgroundColor: '#FFFFFF', borderLeftWidth: 1, borderRightWidth: 1, borderColor: '#D1D5DB' },
  mapPin: {
    position: 'absolute',
    backgroundColor: Colors.white,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 5,
    borderRadius: BorderRadius.full,
    borderWidth: 1.5,
    borderColor: Colors.accent,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 4,
  },
  mapPinSelected: {
    borderColor: '#15803D',
    borderWidth: 2.5,
    backgroundColor: '#F0FDF4',
    transform: [{ scale: 1.1 }],
  },
  mapPinIcon: { fontSize: 13 },
  mapPinLabel: { fontSize: 11, fontWeight: FontWeight.bold, color: Colors.text, maxWidth: 85 },
  pinRatingBadge: { backgroundColor: Colors.accentSoft, paddingHorizontal: 4, paddingVertical: 1, borderRadius: 4 },
  pinRatingText: { fontSize: 9, fontWeight: FontWeight.bold, color: Colors.accent },
  mapEmptyNotice: {
    position: 'absolute',
    top: '40%',
    left: '10%',
    right: '10%',
    backgroundColor: 'rgba(255,255,255,0.9)',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
  },
  mapEmptyText: { color: Colors.muted, fontSize: FontSize.sm },

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
  floatingTop: { flexDirection: 'row', marginBottom: Spacing.sm },
  floatingAvatar: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.accentSoft,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.sm,
  },
  floatingAvatarText: { fontSize: FontSize.base, fontWeight: FontWeight.bold, color: Colors.accent },
  floatingInfo: { flex: 1 },
  floatingName: { fontSize: FontSize.base, fontWeight: FontWeight.bold, color: Colors.text, flex: 1 },
  floatingSub: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 1 },
  floatingRating: { fontSize: FontSize.xs, color: '#D97706', marginTop: 2, fontWeight: FontWeight.semibold },
  floatingActions: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.xs },
  navActionBtn: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  navActionBtnText: { color: Colors.text, fontSize: FontSize.xs, fontWeight: FontWeight.bold },
  profileActionBtn: {
    flex: 1.5,
    backgroundColor: Colors.accent,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileActionBtnText: { color: Colors.white, fontSize: FontSize.xs, fontWeight: FontWeight.bold },

  empty: { alignItems: 'center', paddingTop: Spacing.xxxl },
  emptyIcon: { fontSize: 48, marginBottom: Spacing.md },
  emptyTitle: { fontSize: FontSize.md, fontWeight: FontWeight.semibold, color: Colors.text, marginBottom: Spacing.xs },
  emptyText: { fontSize: FontSize.sm, color: Colors.muted, textAlign: 'center', paddingHorizontal: Spacing.xl },
});
