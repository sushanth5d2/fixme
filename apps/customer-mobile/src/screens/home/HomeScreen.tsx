import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  Image,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { Colors, FontSize, FontWeight, Spacing, BorderRadius } from '../../theme/tokens';
import { api } from '../../services/api';
import { HomeStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<HomeStackParamList, 'Home'>;

const CATEGORY_ICONS: Record<string, string> = {
  phone: '📱',
  'mobile-phone': '📱',
  laptop: '💻',
  'desktop-pc': '🖥️',
  tv: '📺',
  television: '📺',
  ac: '❄️',
  'air-conditioner': '❄️',
  'washing-machine': '🫧',
  refrigerator: '🧊',
  microwave: '🍳',
  'water-purifier': '💧',
  plumbing: '🚰',
  mechanical: '🚗',
  electrical: '⚡',
  printer: '🖨️',
  camera: '📷',
  tablet: '📲',
  other: '🔧',
};

interface RecentRequest {
  id: string;
  description: string;
  status: string;
  category?: { name: string };
  brand?: { name: string };
  createdAt: string;
}

interface Category {
  id: string;
  name: string;
  slug: string;
  iconKey?: string | null;
  isActive?: boolean;
}

interface MyRequest {
  id: string;
  problemTitle?: string;
  problemDescription?: string;
  description?: string;
  status: string;
  category?: { name: string };
  brand?: { name: string } | null;
  createdAt: string;
}

const FALLBACK_CATEGORIES: Category[] = [
  { id: 'phone', name: 'Mobile Phone', slug: 'phone' },
  { id: 'laptop', name: 'Laptop / PC', slug: 'laptop' },
  { id: 'tv', name: 'Television (TV)', slug: 'tv' },
  { id: 'ac', name: 'Air Conditioner', slug: 'ac' },
  { id: 'washing-machine', name: 'Washing Machine', slug: 'washing-machine' },
  { id: 'refrigerator', name: 'Refrigerator', slug: 'refrigerator' },
  { id: 'microwave', name: 'Microwave & Oven', slug: 'microwave' },
  { id: 'water-purifier', name: 'Water Purifier', slug: 'water-purifier' },
  { id: 'plumbing', name: 'Plumbing Services', slug: 'plumbing' },
  { id: 'mechanical', name: 'Mechanical & Auto', slug: 'mechanical' },
  { id: 'electrical', name: 'Electrical & Wiring', slug: 'electrical' },
  { id: 'printer', name: 'Printer & Scanner', slug: 'printer' },
  { id: 'other', name: 'Other Electronics', slug: 'other' },
];

export function HomeScreen({ navigation }: Props) {
  const [categories, setCategories] = useState<Category[]>(FALLBACK_CATEGORIES);
  const [recentRequests, setRecentRequests] = useState<MyRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchData = useCallback(async () => {
    try {
      const [catRes, reqRes] = await Promise.all([
        api.get('/categories').catch(() => null),
        api.get('/repair-requests/mine?limit=3').catch(() => null),
      ]);
      const rawCats = catRes?.data?.data || (Array.isArray(catRes?.data) ? catRes.data : []);
      if (rawCats.length > 0) {
        // Deduplicate and filter active only
        const seen = new Set<string>();
        const uniqueCats: Category[] = [];
        for (const cat of rawCats) {
          if (cat.isActive === false) continue;
          const key = cat.slug.toLowerCase().replace(/[^a-z]/g, '');
          const nameKey = cat.name.toLowerCase().replace(/[^a-z]/g, '').slice(0, 5);
          if (!seen.has(key) && !seen.has(nameKey)) {
            seen.add(key);
            seen.add(nameKey);
            uniqueCats.push(cat);
          }
        }
        setCategories(uniqueCats);
      }
      if (reqRes?.data?.data) {
        const rawReqs = reqRes.data.data;
        const reqList: RecentRequest[] = Array.isArray(rawReqs?.data)
          ? rawReqs.data
          : Array.isArray(rawReqs)
          ? rawReqs
          : [];
        setRecentRequests(reqList);
      }
    } catch {}
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [fetchData]),
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
    setRefreshing(false);
  };

  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) return categories;
    const q = searchQuery.toLowerCase().trim();
    return categories.filter(
      (cat) =>
        cat.name.toLowerCase().includes(q) ||
        cat.slug.toLowerCase().includes(q)
    );
  }, [categories, searchQuery]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'OPEN': return Colors.info;
      case 'QUOTED': return Colors.warning;
      case 'CUSTOMER_ACCEPTED':
      case 'ASSIGNED': return Colors.accent;
      case 'COMPLETED': return Colors.success;
      case 'CANCELLED': return Colors.error;
      default: return Colors.muted;
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.accent} />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.greeting}>Hello! 👋</Text>
        <Text style={styles.headerTitle}>What needs fixing?</Text>

        {/* Search Bar for Device Types */}
        <View style={styles.searchBar}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            placeholder="Search device type, appliance, electronics..."
            placeholderTextColor="rgba(255,255,255,0.6)"
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={styles.searchInput}
            clearButtonMode="while-editing"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearSearchBtn}>
              <Text style={styles.clearSearchText}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Device Categories */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            {searchQuery ? `Matching Types (${filteredCategories.length})` : 'Select Device Type'}
          </Text>
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Text style={styles.seeAll}>Show All</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        {filteredCategories.length === 0 ? (
          <View style={styles.noCategoriesBox}>
            <Text style={styles.noCategoriesIcon}>🔍</Text>
            <Text style={styles.noCategoriesTitle}>No device type found</Text>
            <Text style={styles.noCategoriesSubtitle}>No categories match "{searchQuery}"</Text>
            <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearFilterBtn}>
              <Text style={styles.clearFilterText}>Clear Search</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.categoryGrid}>
            {filteredCategories.map((cat) => (
              <TouchableOpacity
                key={cat.id}
                style={styles.categoryCard}
                activeOpacity={0.7}
                onPress={() =>
                  navigation.navigate('CreateRequest', {
                    categoryId: cat.id,
                    categoryName: cat.name,
                  })
                }
              >
                {cat.iconKey && (cat.iconKey.startsWith('http') || cat.iconKey.startsWith('data:')) ? (
                  <Image source={{ uri: cat.iconKey }} style={styles.categoryLogoImage} />
                ) : (
                  <Text style={styles.categoryIcon}>
                    {CATEGORY_ICONS[cat.slug] || '🔧'}
                  </Text>
                )}
                <Text style={styles.categoryName} numberOfLines={1}>
                  {cat.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      {/* Recent Requests */}
      {recentRequests.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Requests</Text>
            <TouchableOpacity onPress={() => navigation.getParent()?.navigate('RequestsTab')}>
              <Text style={styles.seeAll}>See All →</Text>
            </TouchableOpacity>
          </View>

          {recentRequests.map((req) => (
            <TouchableOpacity
              key={req.id}
              style={styles.requestCard}
              activeOpacity={0.7}
              onPress={() => navigation.navigate('RequestDetail', { requestId: req.id })}
            >
              <View style={styles.requestTop}>
                <Text style={styles.requestCategory}>{req.category?.name}</Text>
                <View
                  style={[styles.statusBadge, { backgroundColor: getStatusColor(req.status) + '18' }]}
                >
                  <Text style={[styles.statusText, { color: getStatusColor(req.status) }]}>
                    {req.status.replace(/_/g, ' ')}
                  </Text>
                </View>
              </View>
              <Text style={styles.requestDesc} numberOfLines={2}>
                {req.description}
              </Text>
              <Text style={styles.requestDate}>
                {new Date(req.createdAt).toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  content: { paddingBottom: Spacing.xxl },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  header: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xxxl + 20,
    paddingBottom: Spacing.xl,
    borderBottomLeftRadius: BorderRadius.xl,
    borderBottomRightRadius: BorderRadius.xl,
  },
  greeting: {
    fontSize: FontSize.base,
    color: Colors.muted,
    marginBottom: Spacing.xs,
  },
  headerTitle: {
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.bold,
    color: Colors.white,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    marginTop: Spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  searchIcon: {
    fontSize: 16,
    marginRight: Spacing.xs,
  },
  searchInput: {
    flex: 1,
    fontSize: FontSize.sm,
    color: Colors.white,
    padding: 0,
  },
  clearSearchBtn: {
    padding: 4,
  },
  clearSearchText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 12,
    fontWeight: FontWeight.bold,
  },

  noCategoriesBox: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.borderLight,
    marginTop: Spacing.xs,
  },
  noCategoriesIcon: { fontSize: 32, marginBottom: Spacing.xs },
  noCategoriesTitle: { fontSize: FontSize.base, fontWeight: FontWeight.bold, color: Colors.text },
  noCategoriesSubtitle: { fontSize: FontSize.xs, color: Colors.muted, marginTop: 2, marginBottom: Spacing.md },
  clearFilterBtn: {
    backgroundColor: Colors.accentSoft,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  clearFilterText: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, color: Colors.accent },

  section: {
    paddingHorizontal: Spacing.xl,
    marginTop: Spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
    marginBottom: Spacing.md,
  },
  seeAll: {
    fontSize: FontSize.sm,
    color: Colors.accent,
    fontWeight: FontWeight.medium,
    marginBottom: Spacing.md,
  },

  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  categoryCard: {
    width: '30%',
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.borderLight,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 2,
  },
  categoryIcon: { fontSize: 32, marginBottom: Spacing.sm },
  categoryLogoImage: { width: 32, height: 32, resizeMode: 'contain', marginBottom: Spacing.sm },
  categoryName: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
    color: Colors.text,
    textAlign: 'center',
  },

  requestCard: {
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  requestTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  requestCategory: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
  },
  statusBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  statusText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
  },
  requestDesc: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    lineHeight: 20,
    marginBottom: Spacing.xs,
  },
  requestDate: {
    fontSize: FontSize.xs,
    color: Colors.muted,
  },
});
