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
  Dimensions,
} from 'react-native';
import { Input, Button } from '../../components/ui';
import { Colors, FontSize, FontWeight, Spacing, BorderRadius } from '../../theme/tokens';
import { api } from '../../services/api';

const { width } = Dimensions.get('window');

interface Fixer {
  id: string;
  companyName: string;
  ownerName: string;
  city: string;
  addressLine?: string | null;
  pincode?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  averageRating: number;
  totalReviews: number;
  completedJobs: number;
  experienceYears: number;
  emergencyService: boolean;
  services?: Array<{ category?: { name: string } }>;
  serviceAreas?: Array<{ areaName: string; city: string; pincode: string }>;
}

export function FixerSearchScreen({ navigation }: any) {
  const [query, setQuery] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [onlyEmergency, setOnlyEmergency] = useState(false);
  const [fixers, setFixers] = useState<Fixer[]>([]);
  const [selectedFixer, setSelectedFixer] = useState<Fixer | null>(null);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const [searched, setSearched] = useState(false);

  const fetchFixers = useCallback(async (searchQuery = '') => {
    setLoading(true);
    setSearched(true);
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
      if (selectedCategory) params.categoryId = selectedCategory;

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
  }, [selectedCity, selectedCategory, onlyEmergency]);

  useEffect(() => {
    fetchFixers(query);
  }, [fetchFixers, selectedCity, selectedCategory, onlyEmergency]);

  const renderStars = (rating: number) => {
    const full = Math.floor(rating || 0);
    const half = (rating || 0) - full >= 0.5;
    return '★'.repeat(full) + (half ? '½' : '') + '☆'.repeat(Math.max(0, 5 - full - (half ? 1 : 0)));
  };

  const renderItem = ({ item }: { item: Fixer }) => (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.7}
      onPress={() => navigation.navigate('FixerProfile', { fixerId: item.id })}
    >
      <View style={styles.cardTop}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {(item.companyName || item.ownerName || 'F').charAt(0).toUpperCase()}
          </Text>
        </View>
        <View style={styles.info}>
          <View style={styles.nameRow}>
            <Text style={styles.name} numberOfLines={1}>{item.companyName || item.ownerName}</Text>
            <View style={styles.verifiedBadge}>
              <Text style={styles.verifiedText}>✓ Verified</Text>
            </View>
          </View>
          <Text style={styles.owner}>
            {item.ownerName} · 📍 {item.city || 'City'} {item.pincode ? `(${item.pincode})` : ''}
          </Text>
          <View style={styles.ratingRow}>
            <Text style={styles.stars}>{renderStars(Number(item.averageRating))}</Text>
            <Text style={styles.ratingText}>
              {Number(item.averageRating || 0).toFixed(1)} ({item.totalReviews || 0} reviews)
            </Text>
          </View>
        </View>
      </View>

      {item.services && item.services.length > 0 && (
        <View style={styles.tagRow}>
          {item.services.slice(0, 3).map((s, idx) => (
            <View key={idx} style={styles.tag}>
              <Text style={styles.tagText}>{s.category?.name || 'Repair'}</Text>
            </View>
          ))}
        </View>
      )}

      <View style={styles.cardFooter}>
        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{item.completedJobs || 0}</Text>
            <Text style={styles.statLabel}>Jobs</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{item.experienceYears || 1}yr</Text>
            <Text style={styles.statLabel}>Exp.</Text>
          </View>
        </View>

        {item.emergencyService ? (
          <View style={styles.emergencyBadge}>
            <Text style={styles.emergencyText}>⚡ Emergency Service</Text>
          </View>
        ) : null}

        <Button
          title="View Profile 🔍"
          onPress={() => navigation.navigate('FixerProfile', { fixerId: item.id })}
          size="sm"
          variant="outline"
        />
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Search Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Find a Fixer 🔧</Text>
        <Text style={styles.subtitle}>Search repair professionals by name, city, location, or pincode</Text>

        <View style={styles.searchRow}>
          <Input
            placeholder="Search by name, city, area, pincode (e.g. 560001)..."
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={() => fetchFixers(query)}
            returnKeyType="search"
            containerStyle={styles.searchInput}
          />
        </View>

        {/* Filters & View Toggle */}
        <View style={styles.filterBar}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsContainer}>
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

          {/* Map / List View Switcher */}
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
      </View>

      {/* Main Content Area */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.accent} />
          <Text style={styles.loadingText}>Finding nearby fixers...</Text>
        </View>
      ) : viewMode === 'map' ? (
        /* Map Preview Mode */
        <View style={styles.mapContainer}>
          {/* Interactive Map Visual Grid */}
          <View style={styles.mapCanvas}>
            {/* Street Grid background lines */}
            <View style={styles.mapGridRoad1} />
            <View style={styles.mapGridRoad2} />
            <View style={styles.mapGridRoad3} />
            <View style={styles.mapGridRoad4} />

            {/* Render Fixer Location Pins */}
            {(fixers || []).map((fixer, index) => {
              const isSelected = selectedFixer?.id === fixer.id;
              // Deterministic spread of pins across the canvas based on index/id
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

            {fixers.length === 0 && (
              <View style={styles.mapEmptyNotice}>
                <Text style={styles.mapEmptyText}>No fixers found in this area on map</Text>
              </View>
            )}
          </View>

          {/* Floating Selected Fixer Card */}
          {selectedFixer && (
            <View style={styles.floatingCard}>
              <View style={styles.floatingTop}>
                <View style={styles.floatingAvatar}>
                  <Text style={styles.floatingAvatarText}>
                    {(selectedFixer.companyName || selectedFixer.ownerName).charAt(0).toUpperCase()}
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
                  <Text style={styles.floatingSub}>
                    {selectedFixer.ownerName} · 📍 {selectedFixer.city || 'City'} {selectedFixer.pincode ? `(${selectedFixer.pincode})` : ''}
                  </Text>
                  <Text style={styles.floatingRating}>
                    {renderStars(Number(selectedFixer.averageRating))} {Number(selectedFixer.averageRating || 0).toFixed(1)} ({selectedFixer.totalReviews || 0} reviews)
                  </Text>
                </View>
              </View>

              <View style={styles.floatingActions}>
                <TouchableOpacity
                  style={styles.navActionBtn}
                  onPress={() => {
                    const addr = [selectedFixer.addressLine, selectedFixer.city, selectedFixer.pincode].filter(Boolean).join(', ');
                    Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addr || selectedFixer.city)}`);
                  }}
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
        /* List View Mode */
        <FlatList
          data={fixers}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            searched ? (
              <View style={styles.empty}>
                <Text style={styles.emptyIcon}>🔍</Text>
                <Text style={styles.emptyTitle}>No fixers found</Text>
                <Text style={styles.emptyText}>Try searching with a different pincode, city, or name</Text>
              </View>
            ) : (
              <View style={styles.empty}>
                <Text style={styles.emptyIcon}>🔧</Text>
                <Text style={styles.emptyTitle}>Search for fixers</Text>
                <Text style={styles.emptyText}>Enter your city, area, or pincode to find verified repair pros</Text>
              </View>
            )
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
    paddingBottom: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  title: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: Colors.text },
  subtitle: { fontSize: FontSize.xs, color: Colors.textSecondary, marginBottom: Spacing.sm, marginTop: 2 },
  searchRow: { marginBottom: Spacing.xs },
  searchInput: { marginBottom: 0 },
  filterBar: { marginTop: Spacing.xs },
  chipsContainer: { paddingVertical: Spacing.xs, gap: Spacing.xs },
  filterChip: {
    backgroundColor: Colors.bg,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    marginRight: Spacing.xs,
  },
  filterChipActive: {
    backgroundColor: Colors.accentSoft,
    borderColor: Colors.accent,
  },
  filterChipText: { fontSize: FontSize.xs, color: Colors.text, fontWeight: FontWeight.medium },
  filterChipTextActive: { color: Colors.accent, fontWeight: FontWeight.bold },
  toggleRow: {
    flexDirection: 'row',
    backgroundColor: Colors.bg,
    borderRadius: BorderRadius.full,
    padding: 3,
    marginTop: Spacing.xs,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  toggleBtn: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  toggleBtnActive: {
    backgroundColor: Colors.accent,
  },
  toggleBtnText: {
    fontSize: FontSize.xs,
    color: Colors.muted,
    fontWeight: FontWeight.semibold,
  },
  toggleBtnTextActive: {
    color: Colors.white,
    fontWeight: FontWeight.bold,
  },
  list: { padding: Spacing.base, paddingBottom: Spacing.xxxl },
  card: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  cardTop: { flexDirection: 'row', marginBottom: Spacing.sm },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.accentSoft,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  avatarText: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.accent },
  info: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  name: { fontSize: FontSize.base, fontWeight: FontWeight.bold, color: Colors.text, flex: 1 },
  verifiedBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: Spacing.xs,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: Spacing.xs,
  },
  verifiedText: { color: '#15803D', fontSize: 10, fontWeight: FontWeight.bold },
  owner: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 2 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  stars: { fontSize: FontSize.xs, color: Colors.warning, marginRight: Spacing.xs },
  ratingText: { fontSize: FontSize.xs, color: Colors.muted },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs, marginBottom: Spacing.sm },
  tag: { backgroundColor: '#F3F4F6', paddingHorizontal: Spacing.sm, paddingVertical: 3, borderRadius: 4 },
  tagText: { fontSize: 11, color: Colors.textSecondary, fontWeight: FontWeight.medium },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
    paddingTop: Spacing.sm,
    marginTop: Spacing.xs,
  },
  statsRow: { flexDirection: 'row', gap: Spacing.md },
  stat: { alignItems: 'center' },
  statValue: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.text },
  statLabel: { fontSize: 10, color: Colors.muted },
  emergencyBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
  },
  emergencyText: { fontSize: 10, fontWeight: FontWeight.bold, color: '#B45309' },
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
  floatingRating: { fontSize: FontSize.xs, color: Colors.warning, marginTop: 2, fontWeight: FontWeight.semibold },
  floatingActions: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.xs },
  navActionBtn: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navActionBtnText: { color: Colors.text, fontSize: FontSize.xs, fontWeight: FontWeight.bold },
  profileActionBtn: {
    flex: 1.4,
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
