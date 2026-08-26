import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Image,
  Modal,
} from 'react-native';
import { Button } from '../../components/ui';
import { Colors, FontSize, FontWeight, Spacing, BorderRadius } from '../../theme/tokens';
import { api } from '../../services/api';

interface FixerProfile {
  id: string;
  userId?: string;
  companyName: string;
  ownerName: string;
  gstin?: string | null;
  panNumber?: string | null;
  businessRegNo?: string | null;
  verificationStatus: string;
  addressLine?: string;
  city: string;
  state: string;
  pincode?: string;
  description: string | null;
  averageRating: number;
  totalReviews: number;
  completedJobs: number;
  experienceYears: number;
  emergencyService?: boolean;
  workingHoursStart?: string | null;
  workingHoursEnd?: string | null;
  workingDays?: string[];
  profilePhotoKey?: string | null;
  workshopPhotos?: string[];
  services: Array<{
    id: string;
    category: { id?: string; name: string; slug?: string };
    brand: { id?: string; name: string } | null;
  }>;
  serviceAreas?: Array<{
    id: string;
    pincode: string;
    areaName?: string;
    city?: string;
    isActive?: boolean;
  }>;
  documents?: Array<{
    id: string;
    type?: string;
    documentType?: string;
    verificationStatus?: string;
  }>;
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
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      api.get(`/fixers/${fixerId}`),
      api.get(`/reviews/fixer/${fixerId}?limit=15`),
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
  const isVerified = fixer.verificationStatus === 'VERIFIED' || fixer.verificationStatus === 'APPROVED';

  // Group services by category name
  const servicesByCategory = (fixer.services || []).reduce<Record<string, string[]>>((acc, s) => {
    const catName = s.category?.name || 'General Repair';
    if (!acc[catName]) acc[catName] = [];
    if (s.brand?.name && !acc[catName].includes(s.brand.name)) {
      acc[catName].push(s.brand.name);
    }
    return acc;
  }, {});

  const serviceCategories = Object.keys(servicesByCategory);
  const serviceAreasList = Array.isArray(fixer.serviceAreas) ? fixer.serviceAreas : [];

  return (
    <View style={styles.screenWrapper}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          {fixer.profilePhotoKey ? (
            <Image source={{ uri: fixer.profilePhotoKey }} style={styles.avatarImage} resizeMode="cover" />
          ) : (
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {(fixer.companyName || fixer.ownerName || 'F').charAt(0).toUpperCase()}
              </Text>
            </View>
          )}

          <View style={styles.titleRow}>
            <Text style={styles.companyName}>{fixer.companyName || fixer.ownerName}</Text>
            {isVerified && (
              <View style={styles.verifiedBadge} title="Verified Fixer">
                <Text style={styles.verifiedBadgeText}>✓ Verified</Text>
              </View>
            )}
          </View>

          {fixer.ownerName ? (
            <Text style={styles.ownerName}>Proprietor: {fixer.ownerName}</Text>
          ) : null}

          <Text style={styles.location}>
            📍 {[fixer.addressLine, fixer.city, fixer.state, fixer.pincode].filter(Boolean).join(', ')}
          </Text>

          {fixer.emergencyService ? (
            <View style={styles.emergencyTag}>
              <Text style={styles.emergencyText}>⚡ 24/7 Emergency Service Available</Text>
            </View>
          ) : null}

          {/* Key Metrics Stats */}
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
              <Text style={styles.statLabel}>Jobs Done</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.stat}>
              <Text style={styles.statValue}>{fixer.experienceYears || 1} yrs</Text>
              <Text style={styles.statLabel}>Experience</Text>
            </View>
          </View>
        </View>

        {/* KYC & Business Verification Credentials */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Business KYC & Credentials</Text>
          <View style={styles.cardBox}>
            <View style={styles.kycRow}>
              <View style={styles.kycIconBox}><Text style={styles.kycIcon}>🛡️</Text></View>
              <View style={styles.kycInfo}>
                <Text style={styles.kycLabel}>Account Verification</Text>
                <Text style={styles.kycValue}>
                  {isVerified ? 'Government Verified Partner' : 'Verification Under Review'}
                </Text>
              </View>
              <Text style={isVerified ? styles.kycStatusGreen : styles.kycStatusYellow}>
                {isVerified ? '● Verified' : '○ Review'}
              </Text>
            </View>

            {fixer.gstin ? (
              <View style={[styles.kycRow, styles.borderTop]}>
                <View style={styles.kycIconBox}><Text style={styles.kycIcon}>🏢</Text></View>
                <View style={styles.kycInfo}>
                  <Text style={styles.kycLabel}>GSTIN (Tax Registered)</Text>
                  <Text style={styles.kycValue}>{fixer.gstin}</Text>
                </View>
                <Text style={styles.kycStatusGreen}>● Verified</Text>
              </View>
            ) : null}

            {fixer.panNumber ? (
              <View style={[styles.kycRow, styles.borderTop]}>
                <View style={styles.kycIconBox}><Text style={styles.kycIcon}>💳</Text></View>
                <View style={styles.kycInfo}>
                  <Text style={styles.kycLabel}>Business PAN</Text>
                  <Text style={styles.kycValue}>{fixer.panNumber}</Text>
                </View>
                <Text style={styles.kycStatusGreen}>● Verified</Text>
              </View>
            ) : null}

            {fixer.businessRegNo ? (
              <View style={[styles.kycRow, styles.borderTop]}>
                <View style={styles.kycIconBox}><Text style={styles.kycIcon}>📑</Text></View>
                <View style={styles.kycInfo}>
                  <Text style={styles.kycLabel}>Trade / Reg License</Text>
                  <Text style={styles.kycValue}>{fixer.businessRegNo}</Text>
                </View>
                <Text style={styles.kycStatusGreen}>● Verified</Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* Working Hours & Availability */}
        {(fixer.workingHoursStart || (fixer.workingDays && fixer.workingDays.length > 0)) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Working Hours & Days</Text>
            <View style={styles.cardBox}>
              {fixer.workingHoursStart ? (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>⏰ Working Hours:</Text>
                  <Text style={styles.infoValue}>
                    {fixer.workingHoursStart} - {fixer.workingHoursEnd || 'Evening'}
                  </Text>
                </View>
              ) : null}

              {fixer.workingDays && fixer.workingDays.length > 0 ? (
                <View style={[styles.infoRow, fixer.workingHoursStart ? styles.borderTop : null]}>
                  <Text style={styles.infoLabel}>📅 Working Days:</Text>
                  <Text style={styles.infoValue}>{fixer.workingDays.join(', ')}</Text>
                </View>
              ) : null}
            </View>
          </View>
        )}

        {/* Workshop / Shop Photos */}
        {Array.isArray(fixer.workshopPhotos) && fixer.workshopPhotos.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Workshop & Facility Photos ({fixer.workshopPhotos.length})</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photoScroll}>
              {fixer.workshopPhotos.map((pUri, pIdx) => (
                <TouchableOpacity
                  key={pIdx}
                  activeOpacity={0.8}
                  style={styles.photoCard}
                  onPress={() => setSelectedPhoto(pUri)}
                >
                  <Image source={{ uri: pUri }} style={styles.workshopPhotoThumb} resizeMode="cover" />
                  <View style={styles.zoomBadge}>
                    <Text style={styles.zoomText}>🔍 Zoom</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* About / Description */}
        {fixer.description ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>About Workshop</Text>
            <View style={styles.cardBox}>
              <Text style={styles.descriptionText}>{fixer.description}</Text>
            </View>
          </View>
        ) : null}

        {/* Services & Skills Offered */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Skills & Services Offered ({fixer.services?.length || 0})
          </Text>
          {serviceCategories.length === 0 ? (
            <View style={styles.cardBox}>
              <Text style={styles.emptyText}>All general electronics and home appliances repair.</Text>
            </View>
          ) : (
            <View style={styles.servicesContainer}>
              {serviceCategories.map((catName, cIdx) => {
                const brands = servicesByCategory[catName];
                return (
                  <View key={cIdx} style={styles.serviceCategoryCard}>
                    <View style={styles.serviceCatHeader}>
                      <Text style={styles.serviceCatTitle}>🔧 {catName}</Text>
                      <Text style={styles.serviceCatCount}>
                        {brands.length > 0 ? `${brands.length} Brands` : 'All Brands'}
                      </Text>
                    </View>

                    {brands.length > 0 ? (
                      <View style={styles.brandsGrid}>
                        {brands.map((bName, bIdx) => (
                          <View key={bIdx} style={styles.brandChip}>
                            <Text style={styles.brandChipText}>{bName}</Text>
                          </View>
                        ))}
                      </View>
                    ) : (
                      <Text style={styles.allBrandsText}>Repairs and service for all models and brands</Text>
                    )}
                  </View>
                );
              })}
            </View>
          )}
        </View>

        {/* Service Areas & Pincodes Covered */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Service Areas & Pincodes ({serviceAreasList.length > 0 ? serviceAreasList.length : 'Citywide'})
          </Text>
          <View style={styles.cardBox}>
            {serviceAreasList.length === 0 ? (
              <View style={styles.areaRow}>
                <Text style={styles.areaIcon}>📍</Text>
                <Text style={styles.areaText}>
                  Provides doorstep repair and pickup across {fixer.city || 'all local areas'}.
                </Text>
              </View>
            ) : (
              <View style={styles.areaChipsGrid}>
                {serviceAreasList.map((area, idx) => (
                  <View key={area.id || idx} style={styles.areaChip}>
                    <Text style={styles.areaChipText}>
                      📍 {area.pincode}{area.areaName ? ` · ${area.areaName}` : ''}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        </View>

        {/* Customer Reviews */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Customer Reviews & Ratings ({reviewList.length})</Text>
          </View>

          {reviewList.length === 0 ? (
            <View style={styles.cardBox}>
              <Text style={styles.noReviews}>No customer reviews yet. Be the first to review after a service!</Text>
            </View>
          ) : (
            reviewList.map((review, idx) => {
              const ratingScore = Math.min(Math.max(Math.round(Number(review.overallRating ?? review.rating ?? 5)), 1), 5);
              const commentText = review.reviewText || review.comment || '';
              const authorName = (review as any).customerName || review.customer?.firstName || 'Verified Customer';

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

        {/* Photo Preview Modal */}
        <Modal
          visible={!!selectedPhoto}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setSelectedPhoto(null)}
        >
          <View style={styles.modalBackdrop}>
            <TouchableOpacity
              style={styles.closeModalBtn}
              onPress={() => setSelectedPhoto(null)}
            >
              <Text style={styles.closeModalText}>✕ Close</Text>
            </TouchableOpacity>
            {selectedPhoto ? (
              <Image
                source={{ uri: selectedPhoto }}
                style={styles.fullscreenImage}
                resizeMode="contain"
              />
            ) : null}
          </View>
        </Modal>
      </ScrollView>

      {/* Fixed Bottom Action Bar */}
      <View style={styles.bottomBar}>
        <Button
          title="Request Repair / Get Quote"
          variant="primary"
          size="lg"
          fullWidth
          onPress={() =>
            navigation.navigate('CreateRequest', {
              fixerId: fixer.id,
              fixerName: fixer.companyName || fixer.ownerName,
            })
          }
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screenWrapper: { flex: 1, backgroundColor: Colors.bg },
  container: { flex: 1 },
  content: { paddingBottom: 100 },
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
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: Colors.accentSoft,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  avatarImage: {
    width: 76,
    height: 76,
    borderRadius: 38,
    marginBottom: Spacing.sm,
    backgroundColor: '#E5E7EB',
    borderWidth: 2,
    borderColor: Colors.accent,
  },
  avatarText: { fontSize: FontSize.xxl, fontWeight: FontWeight.bold, color: Colors.accent },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  companyName: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: Colors.text, textAlign: 'center' },
  verifiedBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: '#86EFAC',
  },
  verifiedBadgeText: { fontSize: 10, fontWeight: FontWeight.bold, color: '#15803D' },
  ownerName: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: 2 },
  location: { fontSize: FontSize.xs, color: Colors.muted, marginTop: Spacing.xs, textAlign: 'center' },
  emergencyTag: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: Spacing.md,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    marginTop: Spacing.sm,
    borderWidth: 1,
    borderColor: '#FCD34D',
  },
  emergencyText: { fontSize: 11, fontWeight: FontWeight.bold, color: '#B45309' },

  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.lg,
    backgroundColor: '#F8FAFC',
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    width: '100%',
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  stat: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: FontSize.base, fontWeight: FontWeight.bold, color: Colors.text },
  statLabel: { fontSize: 10, color: Colors.muted, marginTop: 2 },
  divider: { width: 1, height: 28, backgroundColor: Colors.border },

  section: { paddingHorizontal: Spacing.base, paddingTop: Spacing.lg },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.xs },
  sectionTitle: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, color: Colors.muted, textTransform: 'uppercase', marginBottom: Spacing.xs, letterSpacing: 0.5 },

  cardBox: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  kycRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.xs,
  },
  borderTop: {
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    marginTop: Spacing.xs,
    paddingTop: Spacing.sm,
  },
  kycIconBox: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.sm,
  },
  kycIcon: { fontSize: 16 },
  kycInfo: { flex: 1 },
  kycLabel: { fontSize: 11, color: Colors.muted },
  kycValue: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold, color: Colors.text, marginTop: 1 },
  kycStatusGreen: { fontSize: 11, fontWeight: FontWeight.bold, color: '#16A34A' },
  kycStatusYellow: { fontSize: 11, fontWeight: FontWeight.bold, color: '#D97706' },

  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: Spacing.xs },
  infoLabel: { fontSize: FontSize.xs, color: Colors.muted },
  infoValue: { fontSize: FontSize.xs, fontWeight: FontWeight.semibold, color: Colors.text },

  descriptionText: { fontSize: FontSize.sm, color: Colors.textSecondary, lineHeight: 20 },
  emptyText: { fontSize: FontSize.xs, color: Colors.muted, fontStyle: 'italic' },

  servicesContainer: { gap: Spacing.sm },
  serviceCategoryCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  serviceCatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  serviceCatTitle: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.text },
  serviceCatCount: { fontSize: 11, color: Colors.muted },
  brandsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs, marginTop: Spacing.xs },
  brandChip: {
    backgroundColor: Colors.accentSoft,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: BorderRadius.sm,
  },
  brandChipText: { fontSize: 11, color: Colors.accent, fontWeight: FontWeight.medium },
  allBrandsText: { fontSize: FontSize.xs, color: Colors.muted, fontStyle: 'italic', marginTop: 2 },

  areaRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  areaIcon: { fontSize: 16 },
  areaText: { fontSize: FontSize.xs, color: Colors.textSecondary },
  areaChipsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs },
  areaChip: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  areaChipText: { fontSize: FontSize.xs, color: Colors.text, fontWeight: FontWeight.medium },

  photoScroll: { flexDirection: 'row', marginTop: Spacing.xs },
  photoCard: { position: 'relative', marginRight: Spacing.sm },
  workshopPhotoThumb: {
    width: 110,
    height: 90,
    borderRadius: BorderRadius.md,
    backgroundColor: '#E5E7EB',
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  zoomBadge: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: BorderRadius.full,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  zoomText: { fontSize: 10, color: Colors.white },

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
  noReviews: { fontSize: FontSize.xs, color: Colors.muted, fontStyle: 'italic', textAlign: 'center' },

  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.white,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 8,
  },

  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.92)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullscreenImage: { width: '92%', height: '82%' },
  closeModalBtn: {
    position: 'absolute',
    top: 50,
    right: 20,
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    zIndex: 10,
  },
  closeModalText: { color: Colors.white, fontSize: FontSize.sm, fontWeight: FontWeight.bold },
});
