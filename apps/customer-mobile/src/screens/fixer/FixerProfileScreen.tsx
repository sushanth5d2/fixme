import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { Button } from '../../components/ui';
import { Colors, FontSize, FontWeight, Spacing, BorderRadius } from '../../theme/tokens';
import { api } from '../../services/api';

interface FixerProfile {
  id: string;
  companyName: string;
  ownerName: string;
  city: string;
  state: string;
  description: string | null;
  averageRating: number;
  totalReviews: number;
  completedJobs: number;
  experienceYears: number;
  emergencyService: boolean;
  services: Array<{ id: string; category: { name: string }; brand: { name: string } | null }>;
}

interface Review {
  id: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  customer: { firstName: string };
}

export function FixerProfileScreen({ route, navigation }: any) {
  const { fixerId } = route.params;
  const [fixer, setFixer] = useState<FixerProfile | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get(`/fixers/${fixerId}`),
      api.get(`/reviews/fixer/${fixerId}?limit=5`),
    ]).then(([fixerRes, reviewsRes]) => {
      setFixer(fixerRes.data.data || fixerRes.data);
      setReviews(reviewsRes.data.data || []);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [fixerId]);

  if (loading || !fixer) {
    return <View style={styles.center}><ActivityIndicator size="large" color={Colors.accent} /></View>;
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Profile Header */}
      <View style={styles.profileHeader}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{fixer.companyName.charAt(0)}</Text>
        </View>
        <Text style={styles.companyName}>{fixer.companyName}</Text>
        <Text style={styles.ownerName}>{fixer.ownerName}</Text>
        <Text style={styles.location}>📍 {fixer.city}, {fixer.state}</Text>

        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={styles.statValue}>
              {Number(fixer.averageRating).toFixed(1)} ★
            </Text>
            <Text style={styles.statLabel}>Rating</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.stat}>
            <Text style={styles.statValue}>{fixer.totalReviews}</Text>
            <Text style={styles.statLabel}>Reviews</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.stat}>
            <Text style={styles.statValue}>{fixer.completedJobs}</Text>
            <Text style={styles.statLabel}>Jobs</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.stat}>
            <Text style={styles.statValue}>{fixer.experienceYears}yr</Text>
            <Text style={styles.statLabel}>Exp.</Text>
          </View>
        </View>
      </View>

      {/* Description */}
      {fixer.description && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>
          <Text style={styles.description}>{fixer.description}</Text>
        </View>
      )}

      {/* Services */}
      {fixer.services?.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Services</Text>
          <View style={styles.chipGrid}>
            {fixer.services.map((s) => (
              <View key={s.id} style={styles.chip}>
                <Text style={styles.chipText}>
                  {s.category.name}{s.brand ? ` · ${s.brand.name}` : ''}
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Reviews */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Reviews</Text>
          {fixer.totalReviews > 5 && (
            <Button
              title={`See All (${fixer.totalReviews})`}
              onPress={() => navigation.navigate('FixerReviews', { fixerId, fixerName: fixer.companyName })}
              variant="ghost"
              size="sm"
              fullWidth={false}
            />
          )}
        </View>

        {reviews.length === 0 ? (
          <Text style={styles.noReviews}>No reviews yet</Text>
        ) : (
          reviews.map((review) => (
            <View key={review.id} style={styles.reviewCard}>
              <View style={styles.reviewHeader}>
                <Text style={styles.reviewStars}>
                  {'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}
                </Text>
                <Text style={styles.reviewDate}>
                  {new Date(review.createdAt).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}
                </Text>
              </View>
              {review.comment && <Text style={styles.reviewComment}>{review.comment}</Text>}
              <Text style={styles.reviewAuthor}>— {review.customer.firstName}</Text>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  content: { paddingBottom: Spacing.xxxl },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  profileHeader: {
    backgroundColor: Colors.white, alignItems: 'center',
    paddingTop: Spacing.xl, paddingBottom: Spacing.lg, paddingHorizontal: Spacing.xl,
  },
  avatar: {
    width: 72, height: 72, borderRadius: 36, backgroundColor: Colors.accentSoft,
    justifyContent: 'center', alignItems: 'center', marginBottom: Spacing.md,
  },
  avatarText: { fontSize: FontSize.xxl, fontWeight: FontWeight.bold, color: Colors.accent },
  companyName: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.text },
  ownerName: { fontSize: FontSize.base, color: Colors.textSecondary, marginTop: 2 },
  location: { fontSize: FontSize.sm, color: Colors.muted, marginTop: Spacing.xs },
  statsRow: {
    flexDirection: 'row', alignItems: 'center', marginTop: Spacing.lg,
    backgroundColor: Colors.bg, borderRadius: BorderRadius.lg, padding: Spacing.base, width: '100%',
  },
  stat: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: FontSize.md, fontWeight: FontWeight.bold, color: Colors.text },
  statLabel: { fontSize: FontSize.xs, color: Colors.muted, marginTop: 2 },
  divider: { width: 1, height: 30, backgroundColor: Colors.border },

  section: { paddingHorizontal: Spacing.xl, paddingTop: Spacing.lg },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { fontSize: FontSize.md, fontWeight: FontWeight.semibold, color: Colors.text, marginBottom: Spacing.md },
  description: { fontSize: FontSize.base, color: Colors.textSecondary, lineHeight: 22 },

  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  chip: {
    backgroundColor: Colors.accentSoft, paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  chipText: { fontSize: FontSize.sm, color: Colors.accent, fontWeight: FontWeight.medium },

  noReviews: { fontSize: FontSize.sm, color: Colors.muted, fontStyle: 'italic' },
  reviewCard: {
    backgroundColor: Colors.card, borderRadius: BorderRadius.md, padding: Spacing.base,
    marginBottom: Spacing.md, borderWidth: 1, borderColor: Colors.borderLight,
  },
  reviewHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: Spacing.xs },
  reviewStars: { fontSize: FontSize.sm, color: Colors.warning },
  reviewDate: { fontSize: FontSize.xs, color: Colors.muted },
  reviewComment: { fontSize: FontSize.sm, color: Colors.textSecondary, lineHeight: 20, marginBottom: Spacing.xs },
  reviewAuthor: { fontSize: FontSize.xs, color: Colors.muted, fontStyle: 'italic' },
});
