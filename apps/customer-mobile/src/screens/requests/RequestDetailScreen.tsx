import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Linking,
  Image,
  Modal,
  SafeAreaView,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Button } from '../../components/ui';
import { Colors, FontSize, FontWeight, Spacing, BorderRadius } from '../../theme/tokens';
import { api } from '../../services/api';

interface FixerMember {
  id: string;
  fullName: string;
  phone: string;
  email: string;
  profilePhotoKey?: string | null;
}

interface Quote {
  id: string;
  amount?: number;
  estimatedTotal?: number;
  diagnosisNotes?: string | null;
  notes?: string | null;
  estimatedDurationHours?: number | null;
  warrantyDays: number;
  status: string;
  fixerId?: string;
  fixer: { id?: string; companyName: string; ownerName?: string; averageRating: number; completedJobs: number };
  createdAt: string;
}

interface JobDetail {
  id: string;
  status: string;
  agreedTotal?: number;
  warrantyDays?: number;
  assignedMemberId?: string | null;
  assignedMember?: FixerMember | null;
  revisedTotal?: number | null;
  revisionNotes?: string | null;
  revisionStatus?: string;
}

interface RequestDetail {
  id: string;
  problemTitle?: string;
  problemDescription?: string;
  description?: string;
  status: string;
  priority?: string;
  urgency?: string;
  deviceModel: string | null;
  category: { name: string };
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
  address?: { houseBuilding: string; area: string; city: string; pincode: string } | null;
  media?: Array<{ id: string; storageKey: string }> | null;
  createdAt: string;
  cancelledAt: string | null;
}

export function RequestDetailScreen({ route, navigation }: any) {
  const { requestId } = route.params;
  const [request, setRequest] = useState<RequestDetail | null>(null);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [job, setJob] = useState<JobDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState<string | null>(null);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [respondingRevision, setRespondingRevision] = useState(false);
  const [technicianModalVisible, setTechnicianModalVisible] = useState(false);

  const fetchDetail = useCallback(async () => {
    try {
      const [reqRes, quotesRes, jobsRes] = await Promise.all([
        api.get(`/repair-requests/mine/${requestId}`),
        api.get(`/quotes/request/${requestId}`).catch(() => ({ data: { data: [] } })),
        api.get('/jobs/mine/customer').catch(() => ({ data: { data: [] } })),
      ]);
      const rawReq = reqRes?.data?.data || reqRes?.data;
      setRequest(rawReq);

      const rawQuotes = quotesRes?.data?.data?.data || quotesRes?.data?.data || quotesRes?.data || [];
      setQuotes(Array.isArray(rawQuotes) ? rawQuotes : []);

      const rawJobs = jobsRes?.data?.data?.data || jobsRes?.data?.data || jobsRes?.data || [];
      const jobsList = Array.isArray(rawJobs) ? rawJobs : [];
      const matchingJob = jobsList.find((j: any) => j?.requestId === requestId || j?.request?.id === requestId);
      if (matchingJob) {
        setJob(matchingJob);
      }
    } catch (err) {
      console.error('[Fetch Request Detail Error]', err);
    } finally {
      setLoading(false);
    }
  }, [requestId]);

  useFocusEffect(
    useCallback(() => {
      fetchDetail();
    }, [fetchDetail]),
  );

  const handleAcceptQuote = (quoteId: string, fixerName: string, amount: number) => {
    Alert.alert(
      'Accept Quote',
      `Accept quote from ${fixerName} for ₹${amount.toLocaleString('en-IN')}?\n\nThis will assign the fixer to your repair job.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Accept',
          onPress: async () => {
            setAccepting(quoteId);
            try {
              await api.patch(`/quotes/${quoteId}/accept`, {});
              Alert.alert('Quote Accepted!', 'The fixer has been assigned to your job.');
              fetchDetail();
            } catch (err: any) {
              Alert.alert('Error', err?.response?.data?.message || 'Failed to accept quote');
            } finally {
              setAccepting(null);
            }
          },
        },
      ],
    );
  };

  const handleRespondRevision = (accept: boolean) => {
    if (!job) return;
    Alert.alert(
      accept ? 'Approve Quote Revision' : 'Decline Quote Revision',
      accept
        ? `Approve the revised quote of ₹${Number(job.revisedTotal || 0).toLocaleString('en-IN')}?`
        : 'Decline the revised quote proposal?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: accept ? 'Approve' : 'Decline',
          style: accept ? 'default' : 'destructive',
          onPress: async () => {
            setRespondingRevision(true);
            try {
              await api.patch(`/jobs/${job.id}/respond-revision`, { accept });
              Alert.alert(
                accept ? 'Revision Approved! ✅' : 'Revision Declined ✕',
                accept
                  ? `Updated total: ₹${Number(job.revisedTotal || 0).toLocaleString('en-IN')}`
                  : 'The fixer has been notified.',
              );
              fetchDetail();
            } catch (err: any) {
              Alert.alert('Error', err?.response?.data?.message || 'Failed to respond to revision');
            } finally {
              setRespondingRevision(false);
            }
          },
        },
      ],
    );
  };

  const handleCancel = () => {
    Alert.alert('Cancel Request', 'Are you sure you want to cancel this request?', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Cancel Request',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.patch(`/repair-requests/mine/${requestId}/cancel`, { reason: 'Customer cancelled' });
            navigation.goBack();
          } catch (err: any) {
            Alert.alert('Error', err?.response?.data?.message || 'Cannot cancel');
          }
        },
      },
    ]);
  };

  const openMap = () => {
    if (!request) return;
    if (request.latitude && request.longitude) {
      Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${request.latitude},${request.longitude}`);
    } else {
      const query = [request.houseBuilding, request.street, request.area, request.landmark, request.city, request.pincode]
        .filter(Boolean)
        .join(', ');
      Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query || 'Bengaluru')}`);
    }
  };

  if (loading || !request) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.accent} />
      </View>
    );
  }

  const isCancelled = request.status === 'CANCELLED';
  const fullAddress = [
    request.houseBuilding,
    request.street,
    request.area,
    request.landmark ? `(Near ${request.landmark})` : '',
    request.city,
    request.pincode ? `- ${request.pincode}` : '',
  ].filter(Boolean).join(', ') || 'Address on file';

  const mediaList = (request.media && Array.isArray(request.media)) ? request.media : [];

  return (
    <View style={styles.flex}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* Device & Status Header Card */}
        <View style={styles.card}>
          <View style={styles.headerRow}>
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryText}>{request.category?.name || 'Device'}</Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: isCancelled ? '#FEF2F2' : '#F0FDF4' }]}>
              <Text style={[styles.statusText, { color: isCancelled ? '#DC2626' : '#16A34A' }]}>
                {request.status.replace(/_/g, ' ')}
              </Text>
            </View>
          </View>

          <Text style={styles.deviceModel}>{request.deviceModel || 'General Device'}</Text>
          {request.brand?.name ? <Text style={styles.brandText}>{request.brand.name}</Text> : null}

          <Text style={styles.sectionHeading}>Problem Description</Text>
          <Text style={styles.descText}>
            {request.problemDescription || request.description || request.problemTitle || 'No description provided'}
          </Text>

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

        {/* Quote Revision Alert Card */}
        {job?.revisionStatus === 'PENDING' && (
          <View style={styles.revisionCard}>
            <View style={styles.revisionHeader}>
              <Text style={styles.revisionTitle}>⚠️ Quote Revision Requested</Text>
              <Text style={styles.revisionBadge}>ACTION REQUIRED</Text>
            </View>
            <Text style={styles.revisionSubtitle}>
              The workshop technician requested an update to the repair quote:
            </Text>
            <View style={styles.revisionPriceRow}>
              <Text style={styles.revisionOldPrice}>Current: ₹{Number(job.agreedTotal || 0).toLocaleString('en-IN')}</Text>
              <Text style={styles.revisionNewPrice}>New Total: ₹{Number(job.revisedTotal || 0).toLocaleString('en-IN')}</Text>
            </View>
            {job.revisionNotes ? (
              <Text style={styles.revisionReason}>Reason: "{job.revisionNotes}"</Text>
            ) : null}

            <View style={styles.revisionBtnRow}>
              <TouchableOpacity
                style={styles.declineBtn}
                onPress={() => handleRespondRevision(false)}
                disabled={respondingRevision}
              >
                <Text style={styles.declineBtnText}>✕ Decline</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.approveBtn}
                onPress={() => handleRespondRevision(true)}
                disabled={respondingRevision}
              >
                {respondingRevision ? (
                  <ActivityIndicator size="small" color={Colors.white} />
                ) : (
                  <Text style={styles.approveBtnText}>✅ Approve (₹{Number(job.revisedTotal || 0).toLocaleString('en-IN')})</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Assigned Technician Card */}
        {job?.assignedMember && (
          <View style={styles.technicianCard}>
            <View style={styles.techCardHeader}>
              <Text style={styles.techCardTitle}>👤 Assigned Workshop Technician</Text>
              <TouchableOpacity onPress={() => setTechnicianModalVisible(true)}>
                <Text style={styles.viewTechProfile}>View Details ›</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.technicianRow}>
              <View style={styles.technicianAvatar}>
                <Text style={styles.technicianAvatarText}>
                  {job.assignedMember.fullName.charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={styles.technicianInfo}>
                <Text style={styles.technicianName}>{job.assignedMember.fullName}</Text>
                <Text style={styles.technicianRole}>Workshop Technician</Text>
              </View>

              <TouchableOpacity
                style={styles.callTechBtn}
                onPress={() => Linking.openURL(`tel:${job.assignedMember?.phone}`)}
              >
                <Text style={styles.callTechText}>📞 Call</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Photos Strip */}
        {mediaList.length > 0 && (
          <View style={styles.photosSection}>
            <Text style={styles.sectionHeading}>Uploaded Photos ({mediaList.length})</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photoList}>
              {mediaList.map((m, idx) => (
                <TouchableOpacity
                  key={m.id || idx}
                  style={styles.photoThumbContainer}
                  activeOpacity={0.8}
                  onPress={() => setSelectedPhoto(m.storageKey)}
                >
                  <Image source={{ uri: m.storageKey }} style={styles.photoThumb} resizeMode="cover" />
                  <View style={styles.photoZoomBadge}>
                    <Text style={styles.photoZoomIcon}>🔍</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Location & Map Card */}
        <View style={styles.mapCard}>
          <View style={styles.mapHeaderRow}>
            <Text style={styles.mapCardTitle}>📍 Service Location & Map</Text>
            <TouchableOpacity style={styles.openMapBtn} onPress={openMap}>
              <Text style={styles.openMapBtnText}>Open Maps 🗺️</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.addressText}>{fullAddress}</Text>
        </View>

        {/* Quotes Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quotes from Fixers ({quotes.length})</Text>
          {quotes.length === 0 ? (
            <View style={styles.noQuotes}>
              <Text style={styles.noQuotesText}>Waiting for verified fixers to send quotes...</Text>
            </View>
          ) : (
            quotes.map((q) => {
              const amountVal = Number(q.estimatedTotal ?? q.amount ?? 0);
              const notesText = q.notes || q.diagnosisNotes;
              const fixerId = q.fixer?.id || q.fixerId;

              return (
                <View key={q.id} style={styles.quoteCard}>
                  <TouchableOpacity
                    activeOpacity={0.7}
                    style={styles.quoteFixerHeader}
                    onPress={() => {
                      if (fixerId) {
                        navigation.navigate('FixerProfile', { fixerId });
                      }
                    }}
                  >
                    <View style={styles.fixerInfo}>
                      <View style={styles.fixerNameRow}>
                        <Text style={styles.fixerName}>{q.fixer?.companyName || q.fixer?.ownerName || 'Verified Fixer'}</Text>
                        <Text style={styles.viewProfileTag}>View Profile 🔍</Text>
                      </View>
                      <View style={styles.fixerStats}>
                        <Text style={styles.fixerStat}>★ {Number(q.fixer?.averageRating || 0).toFixed(1)}</Text>
                        <Text style={styles.fixerStat}>{q.fixer?.completedJobs || 0} jobs</Text>
                        {q.warrantyDays > 0 && <Text style={styles.fixerStat}>{q.warrantyDays}d warranty</Text>}
                      </View>
                    </View>
                    <Text style={styles.quoteAmount}>₹{amountVal.toLocaleString('en-IN')}</Text>
                  </TouchableOpacity>

                  {notesText ? <Text style={styles.diagnosis}>{notesText}</Text> : null}

                  <View style={styles.quoteActions}>
                    <TouchableOpacity
                      style={styles.chatFixerBtn}
                      onPress={async () => {
                        try {
                          const { data } = await api.post('/chat/conversations', { requestId: request.id });
                          const conv = data?.data || data;
                          if (conv?.id) {
                            navigation.navigate('ChatRoom', {
                              conversationId: conv.id,
                              otherUserName: q.fixer?.companyName || 'Fixer',
                            });
                          }
                        } catch (err: any) {
                          Alert.alert('Error', err?.response?.data?.message || 'Failed to open chat');
                        }
                      }}
                    >
                      <Text style={styles.chatFixerBtnText}>💬 Chat</Text>
                    </TouchableOpacity>

                    {q.status === 'SUBMITTED' || q.status === 'VIEWED' ? (
                      <TouchableOpacity
                        style={styles.acceptBtn}
                        onPress={() => handleAcceptQuote(q.id, q.fixer?.companyName || 'Fixer', amountVal)}
                        disabled={accepting === q.id}
                      >
                        {accepting === q.id ? (
                          <ActivityIndicator size="small" color={Colors.white} />
                        ) : (
                          <Text style={styles.acceptBtnText}>Accept Quote ✓</Text>
                        )}
                      </TouchableOpacity>
                    ) : q.status === 'ACCEPTED' ? (
                      <View style={styles.acceptedBadge}>
                        <Text style={styles.acceptedText}>✓ Accepted</Text>
                      </View>
                    ) : (
                      <View style={styles.declinedBadge}>
                        <Text style={styles.declinedText}>{q.status}</Text>
                      </View>
                    )}
                  </View>
                </View>
              );
            })
          )}
        </View>

        {/* Cancel Request Option */}
        {!isCancelled && ['OPEN', 'QUOTED'].includes(request.status) && (
          <TouchableOpacity style={styles.cancelRequestBtn} onPress={handleCancel}>
            <Text style={styles.cancelRequestText}>✕ Cancel This Request</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* Full-Screen Photo Modal */}
      <Modal visible={!!selectedPhoto} transparent={false} animationType="fade" onRequestClose={() => setSelectedPhoto(null)}>
        <SafeAreaView style={styles.photoModalSafeArea}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Attached Photo</Text>
            <TouchableOpacity onPress={() => setSelectedPhoto(null)}>
              <Text style={styles.modalCloseText}>✕ Close</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.modalImageContainer}>
            {selectedPhoto ? (
              <Image source={{ uri: selectedPhoto }} style={styles.modalImage} resizeMode="contain" />
            ) : null}
          </View>
        </SafeAreaView>
      </Modal>

      {/* Technician Profile Details Modal */}
      <Modal
        visible={technicianModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setTechnicianModalVisible(false)}
      >
        <View style={styles.backdrop}>
          <View style={styles.popupCard}>
            <View style={styles.techProfileHeader}>
              <View style={styles.largeAvatar}>
                <Text style={styles.largeAvatarText}>
                  {job?.assignedMember?.fullName?.charAt(0).toUpperCase() || '🔧'}
                </Text>
              </View>
              <Text style={styles.techProfileName}>{job?.assignedMember?.fullName}</Text>
              <Text style={styles.techProfileRole}>Assigned Workshop Technician</Text>
            </View>

            <View style={styles.techContactBox}>
              <Text style={styles.techContactLine}>📱 Phone: {job?.assignedMember?.phone}</Text>
              <Text style={styles.techContactLine}>📧 Email: {job?.assignedMember?.email}</Text>
            </View>

            <View style={styles.popupActions}>
              <TouchableOpacity
                style={styles.callNowBtn}
                onPress={() => {
                  setTechnicianModalVisible(false);
                  Linking.openURL(`tel:${job?.assignedMember?.phone}`);
                }}
              >
                <Text style={styles.callNowText}>📞 Call Technician</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.closePopupBtn}
                onPress={() => setTechnicianModalVisible(false)}
              >
                <Text style={styles.closePopupText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.bg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  container: { flex: 1 },
  content: { padding: Spacing.base, paddingBottom: Spacing.xxxl, gap: Spacing.md },

  card: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm },
  categoryBadge: { backgroundColor: Colors.accentSoft, paddingHorizontal: Spacing.sm, paddingVertical: 4, borderRadius: BorderRadius.full },
  categoryText: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, color: Colors.accent },
  statusBadge: { paddingHorizontal: Spacing.sm, paddingVertical: 4, borderRadius: BorderRadius.full },
  statusText: { fontSize: FontSize.xs, fontWeight: FontWeight.bold },
  deviceModel: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.text, marginBottom: 2 },
  brandText: { fontSize: FontSize.sm, color: Colors.textSecondary, marginBottom: Spacing.sm },
  sectionHeading: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, color: Colors.muted, textTransform: 'uppercase', marginTop: Spacing.sm, marginBottom: 4 },
  descText: { fontSize: FontSize.base, color: Colors.text, lineHeight: 22, marginBottom: Spacing.sm },
  postedDate: { fontSize: FontSize.xs, color: Colors.muted, borderTopWidth: 1, borderTopColor: Colors.borderLight, paddingTop: Spacing.xs, marginTop: Spacing.xs },

  revisionCard: {
    backgroundColor: '#FEF3C7',
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    borderWidth: 1.5,
    borderColor: '#F59E0B',
  },
  revisionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  revisionTitle: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: '#92400E' },
  revisionBadge: { backgroundColor: '#FDE68A', paddingHorizontal: Spacing.sm, paddingVertical: 2, borderRadius: BorderRadius.full, fontSize: 10, fontWeight: FontWeight.bold, color: '#B45309' },
  revisionSubtitle: { fontSize: FontSize.xs, color: '#78350F', marginBottom: Spacing.sm },
  revisionPriceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.xs },
  revisionOldPrice: { fontSize: FontSize.xs, color: '#92400E', textDecorationLine: 'line-through' },
  revisionNewPrice: { fontSize: FontSize.base, fontWeight: FontWeight.bold, color: '#B45309' },
  revisionReason: { fontSize: FontSize.xs, color: '#78350F', fontStyle: 'italic', marginBottom: Spacing.md },
  revisionBtnRow: { flexDirection: 'row', gap: Spacing.sm },
  declineBtn: { flex: 1, backgroundColor: '#FEE2E2', borderRadius: BorderRadius.md, paddingVertical: Spacing.sm, alignItems: 'center', borderWidth: 1, borderColor: '#FECACA' },
  declineBtnText: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, color: '#DC2626' },
  approveBtn: { flex: 2, backgroundColor: '#16A34A', borderRadius: BorderRadius.md, paddingVertical: Spacing.sm, alignItems: 'center' },
  approveBtnText: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, color: Colors.white },

  technicianCard: {
    backgroundColor: '#EFF6FF',
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  techCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm },
  techCardTitle: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, color: '#1E40AF', textTransform: 'uppercase' },
  viewTechProfile: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, color: '#2563EB' },
  technicianRow: { flexDirection: 'row', alignItems: 'center' },
  technicianAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#DBEAFE',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
    borderWidth: 1,
    borderColor: '#93C5FD',
  },
  technicianAvatarText: { fontSize: FontSize.base, fontWeight: FontWeight.bold, color: '#1D4ED8' },
  technicianInfo: { flex: 1 },
  technicianName: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.text },
  technicianRole: { fontSize: FontSize.xs, color: Colors.muted, marginTop: 2 },
  callTechBtn: {
    backgroundColor: '#2563EB',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  callTechText: { color: Colors.white, fontSize: FontSize.xs, fontWeight: FontWeight.bold },

  photosSection: { backgroundColor: Colors.white, borderRadius: BorderRadius.lg, padding: Spacing.base, borderWidth: 1, borderColor: Colors.borderLight },
  photoList: { marginTop: Spacing.xs },
  photoThumbContainer: { position: 'relative', marginRight: Spacing.sm },
  photoThumb: { width: 90, height: 90, borderRadius: BorderRadius.md, backgroundColor: '#E5E7EB' },
  photoZoomBadge: { position: 'absolute', bottom: 4, right: 4, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 10, width: 20, height: 20, justifyContent: 'center', alignItems: 'center' },
  photoZoomIcon: { fontSize: 10 },

  mapCard: { backgroundColor: Colors.white, borderRadius: BorderRadius.lg, padding: Spacing.base, borderWidth: 1, borderColor: Colors.borderLight },
  mapHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.xs },
  mapCardTitle: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, color: Colors.muted, textTransform: 'uppercase' },
  openMapBtn: { backgroundColor: Colors.accentSoft, paddingHorizontal: Spacing.sm, paddingVertical: 4, borderRadius: BorderRadius.sm },
  openMapBtnText: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, color: Colors.accent },
  addressText: { fontSize: FontSize.sm, color: Colors.text, marginTop: 4, lineHeight: 20 },

  section: { gap: Spacing.sm },
  sectionTitle: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.text },
  noQuotes: { backgroundColor: Colors.white, borderRadius: BorderRadius.lg, padding: Spacing.xl, alignItems: 'center', borderWidth: 1, borderColor: Colors.borderLight },
  noQuotesText: { fontSize: FontSize.sm, color: Colors.muted },

  quoteCard: { backgroundColor: Colors.white, borderRadius: BorderRadius.lg, padding: Spacing.base, borderWidth: 1, borderColor: Colors.borderLight },
  quoteFixerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: Spacing.sm },
  fixerInfo: { flex: 1 },
  fixerNameRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  fixerName: { fontSize: FontSize.base, fontWeight: FontWeight.bold, color: Colors.text },
  viewProfileTag: { fontSize: FontSize.xs, color: Colors.accent, fontWeight: FontWeight.semibold },
  fixerStats: { flexDirection: 'row', gap: Spacing.md, marginTop: 2 },
  fixerStat: { fontSize: FontSize.xs, color: Colors.muted },
  quoteAmount: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.accent },
  diagnosis: { fontSize: FontSize.xs, color: Colors.textSecondary, marginBottom: Spacing.sm, lineHeight: 18 },
  quoteActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: Spacing.sm },
  chatFixerBtn: { backgroundColor: Colors.accentSoft, borderRadius: BorderRadius.md, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, justifyContent: 'center' },
  chatFixerBtnText: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, color: Colors.accent },
  acceptBtn: { backgroundColor: Colors.accent, borderRadius: BorderRadius.md, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, justifyContent: 'center' },
  acceptBtnText: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, color: Colors.white },
  acceptedBadge: { backgroundColor: '#DCFCE7', borderRadius: BorderRadius.md, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, justifyContent: 'center' },
  acceptedText: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, color: '#16A34A' },
  declinedBadge: { backgroundColor: '#F3F4F6', borderRadius: BorderRadius.md, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, justifyContent: 'center' },
  declinedText: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, color: Colors.muted },

  cancelRequestBtn: { backgroundColor: '#FEF2F2', borderRadius: BorderRadius.md, paddingVertical: Spacing.md, alignItems: 'center', borderWidth: 1, borderColor: '#FECACA', marginTop: Spacing.sm },
  cancelRequestText: { color: '#DC2626', fontSize: FontSize.sm, fontWeight: FontWeight.bold },

  photoModalSafeArea: { flex: 1, backgroundColor: '#000' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.base, paddingVertical: Spacing.md, backgroundColor: 'rgba(0,0,0,0.8)' },
  modalTitle: { fontSize: FontSize.base, fontWeight: FontWeight.bold, color: Colors.white },
  modalCloseText: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: '#EF4444' },
  modalImageContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  modalImage: { width: '100%', height: '100%' },

  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: Spacing.base },
  popupCard: { backgroundColor: Colors.white, borderRadius: BorderRadius.lg, padding: Spacing.lg, width: '100%', maxWidth: 400, gap: Spacing.md },
  techProfileHeader: { alignItems: 'center', gap: Spacing.xs },
  largeAvatar: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#DBEAFE', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#3B82F6' },
  largeAvatarText: { fontSize: 28, fontWeight: FontWeight.bold, color: '#1D4ED8' },
  techProfileName: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.text },
  techProfileRole: { fontSize: FontSize.xs, color: Colors.muted },
  techContactBox: { backgroundColor: '#F8FAFC', borderRadius: BorderRadius.md, padding: Spacing.md, gap: Spacing.xs },
  techContactLine: { fontSize: FontSize.xs, color: Colors.text },
  popupActions: { gap: Spacing.sm },
  callNowBtn: { backgroundColor: '#2563EB', borderRadius: BorderRadius.md, paddingVertical: Spacing.sm + 2, alignItems: 'center' },
  callNowText: { color: Colors.white, fontSize: FontSize.sm, fontWeight: FontWeight.bold },
  closePopupBtn: { alignItems: 'center', paddingVertical: Spacing.sm },
  closePopupText: { fontSize: FontSize.sm, color: Colors.muted, fontWeight: FontWeight.semibold },
});
