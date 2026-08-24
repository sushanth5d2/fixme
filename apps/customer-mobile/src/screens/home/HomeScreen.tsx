import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Colors, FontSize, FontWeight, Spacing, BorderRadius } from '../../theme/tokens';
import { api } from '../../services/api';
import { HomeStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<HomeStackParamList, 'Home'>;

const CATEGORY_ICONS: Record<string, string> = {
  phone: '📱',
  laptop: '💻',
  tv: '📺',
  ac: '❄️',
  'washing-machine': '🫧',
  refrigerator: '🧊',
  microwave: '🍳',
  printer: '🖨️',
  camera: '📷',
  tablet: '📲',
};

interface Category {
  id: string;
  name: string;
  slug: string;
}

interface MyRequest {
  id: string;
  description: string;
  status: string;
  category: { name: string };
  createdAt: string;
}

const FALLBACK_CATEGORIES: Category[] = [
  { id: 'phone', name: 'Mobile / Smartphone', slug: 'phone' },
  { id: 'laptop', name: 'Laptop / PC', slug: 'laptop' },
  { id: 'tv', name: 'Television (TV)', slug: 'tv' },
  { id: 'ac', name: 'Air Conditioner (AC)', slug: 'ac' },
  { id: 'washing-machine', name: 'Washing Machine', slug: 'washing-machine' },
  { id: 'refrigerator', name: 'Refrigerator', slug: 'refrigerator' },
  { id: 'microwave', name: 'Microwave & Oven', slug: 'microwave' },
  { id: 'printer', name: 'Printer & Scanner', slug: 'printer' },
];

export function HomeScreen({ navigation }: Props) {
  const [categories, setCategories] = useState<Category[]>(FALLBACK_CATEGORIES);
  const [recentRequests, setRecentRequests] = useState<MyRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    try {
      const [catRes, reqRes] = await Promise.all([
        api.get('/categories').catch(() => null),
        api.get('/repair-requests/mine?limit=3').catch(() => null),
      ]);
      if (catRes?.data?.data?.length) {
        setCategories(catRes.data.data);
      } else if (Array.isArray(catRes?.data) && catRes.data.length) {
        setCategories(catRes.data);
      }
      if (reqRes?.data?.data) {
        setRecentRequests(reqRes.data.data);
      }
    } catch {
      // Retain fallback categories
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

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
      </View>

      {/* Device Categories */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Select Device Type</Text>
        <View style={styles.categoryGrid}>
          {categories.map((cat) => (
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
              <Text style={styles.categoryIcon}>
                {CATEGORY_ICONS[cat.slug] || '🔧'}
              </Text>
              <Text style={styles.categoryName} numberOfLines={1}>
                {cat.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
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
