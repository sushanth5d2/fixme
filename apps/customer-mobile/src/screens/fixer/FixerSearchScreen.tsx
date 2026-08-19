import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Input } from '../../components/ui';
import { Colors, FontSize, FontWeight, Spacing, BorderRadius } from '../../theme/tokens';
import { api } from '../../services/api';

interface Fixer {
  id: string;
  companyName: string;
  ownerName: string;
  city: string;
  averageRating: number;
  totalReviews: number;
  completedJobs: number;
  experienceYears: number;
  emergencyService: boolean;
}

export function FixerSearchScreen({ navigation }: any) {
  const [query, setQuery] = useState('');
  const [fixers, setFixers] = useState<Fixer[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const handleSearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setSearched(true);
    try {
      const params = /^\d{6}$/.test(query.trim())
        ? { pincode: query.trim() }
        : { city: query.trim() };
      const { data } = await api.get('/fixers/search', { params: { ...params, limit: 30 } });
      setFixers(data.data || []);
    } catch {} finally {
      setLoading(false);
    }
  };

  const renderStars = (rating: number) => {
    const full = Math.floor(rating);
    const half = rating - full >= 0.5;
    return '★'.repeat(full) + (half ? '½' : '') + '☆'.repeat(5 - full - (half ? 1 : 0));
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
            {item.companyName.charAt(0).toUpperCase()}
          </Text>
        </View>
        <View style={styles.info}>
          <Text style={styles.name} numberOfLines={1}>{item.companyName}</Text>
          <Text style={styles.owner}>{item.ownerName} · {item.city}</Text>
          <View style={styles.ratingRow}>
            <Text style={styles.stars}>{renderStars(Number(item.averageRating))}</Text>
            <Text style={styles.ratingText}>
              {Number(item.averageRating).toFixed(1)} ({item.totalReviews})
            </Text>
          </View>
        </View>
      </View>
      <View style={styles.statsRow}>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{item.completedJobs}</Text>
          <Text style={styles.statLabel}>Jobs</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{item.experienceYears}yr</Text>
          <Text style={styles.statLabel}>Exp.</Text>
        </View>
        {item.emergencyService && (
          <View style={[styles.stat, styles.emergencyBadge]}>
            <Text style={styles.emergencyText}>⚡ Emergency</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Find a Fixer</Text>
        <View style={styles.searchRow}>
          <Input
            placeholder="Enter city or pincode..."
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
            containerStyle={styles.searchInput}
          />
        </View>
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={Colors.accent} /></View>
      ) : (
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
                <Text style={styles.emptyText}>Try a different city or pincode</Text>
              </View>
            ) : (
              <View style={styles.empty}>
                <Text style={styles.emptyIcon}>🔧</Text>
                <Text style={styles.emptyTitle}>Search for fixers</Text>
                <Text style={styles.emptyText}>Enter your city or pincode to find repair professionals near you</Text>
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
  header: {
    backgroundColor: Colors.white, paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xxxl + 10, paddingBottom: Spacing.md,
  },
  title: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: Colors.text, marginBottom: Spacing.md },
  searchRow: { flexDirection: 'row' },
  searchInput: { flex: 1, marginBottom: 0 },
  list: { padding: Spacing.xl, paddingTop: Spacing.md },
  card: {
    backgroundColor: Colors.card, borderRadius: BorderRadius.lg, padding: Spacing.base,
    marginBottom: Spacing.md, borderWidth: 1, borderColor: Colors.borderLight,
  },
  cardTop: { flexDirection: 'row', marginBottom: Spacing.md },
  avatar: {
    width: 48, height: 48, borderRadius: BorderRadius.full, backgroundColor: Colors.accentSoft,
    justifyContent: 'center', alignItems: 'center', marginRight: Spacing.md,
  },
  avatarText: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.accent },
  info: { flex: 1 },
  name: { fontSize: FontSize.base, fontWeight: FontWeight.semibold, color: Colors.text },
  owner: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: 2 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  stars: { fontSize: FontSize.sm, color: Colors.warning, marginRight: Spacing.xs },
  ratingText: { fontSize: FontSize.xs, color: Colors.muted },
  statsRow: { flexDirection: 'row', gap: Spacing.lg },
  stat: { alignItems: 'center' },
  statValue: { fontSize: FontSize.base, fontWeight: FontWeight.bold, color: Colors.text },
  statLabel: { fontSize: FontSize.xs, color: Colors.muted, marginTop: 2 },
  emergencyBadge: {
    backgroundColor: Colors.warningBg, paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs, borderRadius: BorderRadius.full, marginLeft: 'auto',
    justifyContent: 'center',
  },
  emergencyText: { fontSize: FontSize.xs, fontWeight: FontWeight.semibold, color: Colors.warning },
  empty: { alignItems: 'center', paddingTop: Spacing.xxxl },
  emptyIcon: { fontSize: 48, marginBottom: Spacing.md },
  emptyTitle: { fontSize: FontSize.md, fontWeight: FontWeight.semibold, color: Colors.text, marginBottom: Spacing.xs },
  emptyText: { fontSize: FontSize.sm, color: Colors.muted, textAlign: 'center', paddingHorizontal: Spacing.xl },
});
