import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { Button } from '../../components/ui';
import { Colors, FontSize, FontWeight, Spacing, BorderRadius } from '../../theme/tokens';
import { api } from '../../services/api';

interface FixerProfile {
  id: string;
  userId?: string;
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
  rating?: number;
  overallRating?: number;
  comment?: string | null;
  reviewText?: string | null;
  createdAt: string;
  customer?: { firstName?: string; lastName?: string };
}

export function FixerProfileScreen({ route, navigation }: any) {
  const { fixerId } = route.params;
  const [fixer, setFixer] = useState<FixerProfile | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get(`/fixers/${fixerId}`),
      api.get(`/reviews/fixer/${fixerId}?limit=10`),
    ])
      .then(([fixerRes, reviewsRes]) => {
        const fData = fixerRes?.data?.data || fixerRes?.data;
        setFixer(fData);

        const rRaw = reviewsRes?.data?.data || reviewsRes?.data || [];
        const rList: Review[] = Array.isArray(rRaw) ? rRaw : (Array.isArray(rRaw?.data) ? rRaw.data : []);
        setReviews(rList);
      })
      .catch((err) => {
        console.error('[Fetch Fixer Profile Error]', err);
        setReviews([]);
      })
      .finally(() => setLoading(false));
  }, [fixerId]);

  if (loading || !fixer) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.accent} />
      </View>
    );
  }

  const reviewList = Array.isArray(reviews) ? reviews : [];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Profile Header */}
      <View style={styles.profileHeader}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {(fixer.companyName || fixer.ownerName || 'F').charAt(0).toUpperCase()}
          </Text>
        </View>
        <Text style={styles.companyName}>{fixer.companyName || fixer.ownerName}</Text>
        {fixer.ownerName ? <Text style={styles.ownerName}>{fixer.ownerName}</Text> : null}
        <Text style={styles.location}>📍 {fixer.city}, {fixer.state}</Text>

        {fixer.emergencyService ? (
          <View style={styles.emergencyTag}>
            <Text style={styles.emergencyText}>⚡ 24/7 Emergency Service Available</Text>
          </View>
        ) : null}

        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={styles.statValue}>
              {Number(fixer.averageRating || 5).toFixed(1)} ★
            </Text>
            <Text style={styles.statLabel}>Rating</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.stat}>
            <Text style={styles.statValue}>{fixer.totalReviews || 0}</Text>
            <Text style={styles.statLabel}>Reviews</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.stat}>
            <Text style={styles.statValue}>{fixer.completedJobs || 0}</Text>
            <Text style={styles.statLabel}>Jobs</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.stat}>
            <Text style={styles.statValue}>{fixer.experienceYears || 1}yr</Text>
            <Text style={styles.statLabel}>Exp.</Text>
          </View>
        </View>
      </View>

      {/* Description */}
      {fixer.description ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>
          <Text style={styles.description}>{fixer.description}</Text>
        </View>
      ) : null}

      {/* Services */}
      {fixer.services?.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Services Offered</Text>
          <View style={styles.chipGrid}>
            {fixer.services.map((s, idx) => (
              <View key={s.id || idx} style={styles.chip}>
                <Text style={styles.chipText}>
                  🔧 {s.category?.name || 'Device'}{s.brand ? ` · ${s.brand.name}` : ''}
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Customer Reviews */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Customer Reviews ({reviewList.length})</Text>
        </View>

        {reviewList.length === 0 ? (
          <View style={styles.emptyReviews}>
            <Text style={styles.noReviews}>No customer reviews yet. Be the first to review after a service!</Text>
          </View>
        ) : (
          reviewList.map((review, idx) => {
            const ratingScore = Math.min(Math.max(Math.round(Number(review.overallRating ?? review.rating ?? 5)), 1), 5);
            const commentText = review.reviewText || review.comment || '';
            const authorName = review.customer?.firstName || 'Customer';

            return (
              <View key={review.id || idx} style={styles.reviewCard}>
                <View style={styles.reviewHeader}>
                  <Text style={styles.reviewStars}>
                    {'★'.repeat(ratingScore)}{'☆'.repeat(5 - ratingScore)}
                  </Text>
                  <Text style={styles.reviewDate}>
                    {review.createdAt
                      ? new Date(review.createdAt).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })
                      : ''}
                  </Text>
                </View>
                {commentText ? <Text style={styles.reviewComment}>{commentText}</Text> : null}
                <Text style={styles.reviewAuthor}>— {authorName}</Text>
              </View>
            );
          })
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
    backgroundColor: Colors.white,
    alignItems: 'center',
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.lg,
    paddingHorizontal: Spacing.xl,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.accentSoft,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  avatarText: { fontSize: FontSize.xxl, fontWeight: FontWeight.bold, color: Colors.accent },
  companyName: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.text },
  ownerName: { fontSize: FontSize.base, color: Colors.textSecondary, marginTop: 2 },
  location: { fontSize: FontSize.sm, color: Colors.muted, marginTop: Spacing.xs },
  emergencyTag: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: Spacing.md,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
    marginTop: Spacing.xs,
  },
  emergencyText: { fontSize: 11, fontWeight: FontWeight.bold, color: '#B45309' },

  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.lg,
    backgroundColor: Colors.bg,
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    width: '100%',
  },
  stat: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: FontSize.md, fontWeight: FontWeight.bold, color: Colors.text },
  statLabel: { fontSize: FontSize.xs, color: Colors.muted, marginTop: 2 },
  divider: { width: 1, height: 30, backgroundColor: Colors.border },

  section: { paddingHorizontal: Spacing.base, paddingTop: Spacing.lg },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm },
  sectionTitle: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.muted, textTransform: 'uppercase' },
  description: { fontSize: FontSize.base, color: Colors.textSecondary, lineHeight: 22 },

  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs },
  chip: {
    backgroundColor: Colors.accentSoft,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.md,
  },
  chipText: { fontSize: FontSize.xs, color: Colors.accent, fontWeight: FontWeight.semibold },

  emptyReviews: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  noReviews: { fontSize: FontSize.xs, color: Colors.muted, fontStyle: 'italic', textAlign: 'center' },
  reviewCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  reviewHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: Spacing.xs },
  reviewStars: { fontSize: FontSize.sm, color: '#D97706' },
  reviewDate: { fontSize: FontSize.xs, color: Colors.muted },
  reviewComment: { fontSize: FontSize.sm, color: Colors.textSecondary, lineHeight: 20, marginBottom: Spacing.xs },
  reviewAuthor: { fontSize: FontSize.xs, color: Colors.muted, fontStyle: 'italic' },
});
