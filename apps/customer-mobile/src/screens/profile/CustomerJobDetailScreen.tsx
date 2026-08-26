import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { Button } from '../../components/ui';
import { Colors, FontSize, FontWeight, Spacing, BorderRadius } from '../../theme/tokens';
import { api } from '../../services/api';

interface JobDetail {
  id: string;
  status: string;
  scheduledDate: string | null;
  completedAt: string | null;
  request: {
    id?: string;
    description: string;
    deviceModel: string | null;
    category: { name: string };
    brand: { name: string } | null;
  };
  fixer: { id?: string; companyName: string; ownerName: string; averageRating: number };
  quote: { amount: number; warrantyDays: number };
  statusHistory: Array<{ toStatus: string; createdAt: string }>;
  createdAt: string;
}

interface ExistingReview {
  id: string;
  overallRating: number;
  rating?: number;
  reviewText?: string | null;
  comment?: string | null;
  createdAt: string;
}

interface ExistingDispute {
  id: string;
  reason: string;
  description: string;
  status: string;
  adminNotes?: string | null;
  resolution?: string | null;
  createdAt: string;
}

const CUSTOMER_DISPUTE_REASONS = [
  { id: 'POOR_SERVICE', label: 'Poor Service Quality / Issue Unresolved' },
  { id: 'OVERCHARGING', label: 'Overcharging / Price Mismatch' },
  { id: 'DEVICE_DAMAGE', label: 'Device Damaged During Repair' },
  { id: 'WARRANTY_ISSUE', label: 'Warranty Claim Refused' },
  { id: 'FIXER_DID_NOT_ARRIVE', label: 'Fixer Did Not Arrive' },
  { id: 'UNPROFESSIONAL_BEHAVIOR', label: 'Unprofessional Behavior' },
  { id: 'SUSPECTED_FRAUD', label: 'Suspected Fraud / Fake Parts' },
];

const STATUS_LABELS: Record<string, { label: string; icon: string }> = {
  ASSIGNED: { label: 'Fixer Assigned', icon: '📋' },
  FIXER_ON_THE_WAY: { label: 'Fixer On the Way', icon: '🚗' },
  DEVICE_RECEIVED: { label: 'Device Received', icon: '📦' },
  DIAGNOSING: { label: 'Diagnosing Issue', icon: '🔍' },
  REPAIR_IN_PROGRESS: { label: 'Repair In Progress', icon: '🔧' },
  READY_FOR_DELIVERY: { label: 'Ready for Delivery', icon: '✅' },
  COMPLETED: { label: 'Completed', icon: '🎉' },
  CANCELLED: { label: 'Cancelled', icon: '❌' },
  DISPUTED: { label: 'Disputed', icon: '⚠️' },
};

export function CustomerJobDetailScreen({ route, navigation }: any) {
  const { jobId } = route.params;
  const [job, setJob] = useState<JobDetail | null>(null);
  const [loading, setLoading] = useState(true);

  // Review & Rating State
  const [existingReview, setExistingReview] = useState<ExistingReview | null>(null);
  const [ratingInput, setRatingInput] = useState(5);
  const [commentInput, setCommentInput] = useState('');
  const [isEditingReview, setIsEditingReview] = useState(false);
  const [submittingReview, setSubmittingReview] = useState(false);

  // Dispute State
  const [disputeModalVisible, setDisputeModalVisible] = useState(false);
  const [existingDispute, setExistingDispute] = useState<ExistingDispute | null>(null);
  const [disputeReason, setDisputeReason] = useState<string>('POOR_SERVICE');
  const [disputeDesc, setDisputeDesc] = useState('');
  const [submittingDispute, setSubmittingDispute] = useState(false);

  const fetchJobData = async () => {
    try {
      const [jobRes, revRes, compRes] = await Promise.all([
        api.get(`/jobs/${jobId}`),
        api.get(`/reviews/job/${jobId}`).catch(() => null),
        api.get(`/complaints/job/${jobId}`).catch(() => null),
      ]);
      const jData = jobRes?.data?.data || jobRes?.data;
      setJob(jData);

      const rData = revRes?.data?.data || revRes?.data;
      if (rData && rData.id) {
        setExistingReview(rData);
        setRatingInput(rData.overallRating || rData.rating || 5);
        setCommentInput(rData.reviewText || rData.comment || '');
      }

      const cData = compRes?.data?.data || compRes?.data;
      if (cData && cData.id) {
        setExistingDispute(cData);
      }
    } catch {}
    finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobData();
  }, [jobId]);

  const handleSubmitDispute = async () => {
    if (!disputeDesc.trim()) {
      Alert.alert('Details Required', 'Please describe the problem or reason for this dispute.');
      return;
    }
    setSubmittingDispute(true);
    try {
      const { data } = await api.post('/complaints', {
        jobId,
        reason: disputeReason,
        description: disputeDesc.trim(),
      });
      const saved = data?.data || data;
      setExistingDispute(saved);
      setDisputeModalVisible(false);
      Alert.alert(
        'Dispute Submitted ⚠️',
        'Your dispute has been logged and escalated to the Admin Team for moderation. Our team will review and resolve this case.',
      );
      fetchJobData();
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message || 'Failed to submit dispute');
    } finally {
      setSubmittingDispute(false);
    }
  };

  const handleSubmitReview = async () => {
    if (ratingInput < 1) {
      Alert.alert('Rating Required', 'Please select a star rating between 1 and 5.');
      return;
    }
    setSubmittingReview(true);
    try {
      const { data } = await api.post(`/reviews/job/${jobId}`, {
        rating: ratingInput,
        comment: commentInput.trim() || undefined,
      });
      const savedReview = data?.data || data;
      setExistingReview(savedReview);
      setIsEditingReview(false);
      Alert.alert(
        isEditingReview ? 'Review Updated! 🎉' : 'Thank You! ⭐',
        'Your rating and feedback have been submitted and are now visible on the fixer\'s public profile.',
      );
      fetchJobData();
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message || 'Failed to submit review');
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleCancel = () => {
    Alert.alert('Cancel Job', 'Are you sure you want to cancel this job?', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Cancel Job', style: 'destructive',
        onPress: async () => {
          try {
            await api.patch(`/jobs/${jobId}/cancel`, { reason: 'Cancelled by customer' });
            navigation.goBack();
          } catch (err: any) { Alert.alert('Error', err?.response?.data?.message || 'Cannot cancel'); }
        },
      },
    ]);
  };

  if (loading || !job) return <View style={styles.center}><ActivityIndicator size="large" color={Colors.accent} /></View>;

  const statusInfo = STATUS_LABELS[job.status] || { label: job.status, icon: '•' };
  const canCancel = ['ASSIGNED', 'FIXER_ON_THE_WAY'].includes(job.status);
  const isCompleted = job.status === 'COMPLETED';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Status */}
      <View style={styles.statusCard}>
        <Text style={styles.statusIcon}>{statusInfo.icon}</Text>
        <Text style={styles.statusLabel}>{statusInfo.label}</Text>
      </View>

      {/* Fixer */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Your Fixer</Text>
        <View style={styles.fixerRow}>
          <View style={styles.fixerAvatar}>
            <Text style={styles.fixerAvatarText}>{job.fixer?.companyName?.charAt(0) || 'F'}</Text>
          </View>
          <View>
            <Text style={styles.fixerName}>{job.fixer?.companyName}</Text>
            <Text style={styles.fixerSub}>{job.fixer?.ownerName} · ★ {Number(job.fixer?.averageRating || 5.0).toFixed(1)}</Text>
          </View>
        </View>
      </View>

      {/* Rating & Feedback Section (Visible on Completed Jobs) */}
      {isCompleted && (
        <View style={styles.reviewSectionCard}>
          <View style={styles.reviewCardHeader}>
            <Text style={styles.reviewCardTitle}>
              {existingReview && !isEditingReview ? '⭐ Your Rating & Feedback' : '⭐ Rate & Review Fixer'}
            </Text>
            {existingReview && !isEditingReview && (
              <TouchableOpacity
                style={styles.editReviewBtn}
                onPress={() => {
                  setRatingInput(existingReview.overallRating || existingReview.rating || 5);
                  setCommentInput(existingReview.reviewText || existingReview.comment || '');
                  setIsEditingReview(true);
                }}
              >
                <Text style={styles.editReviewBtnText}>✏️ Edit Review</Text>
              </TouchableOpacity>
            )}
          </View>

          {existingReview && !isEditingReview ? (
            <View style={styles.existingReviewBox}>
              <View style={styles.starsRowDisplay}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <Text key={star} style={styles.starIconDisplay}>
                    {star <= (existingReview.overallRating || existingReview.rating || 5) ? '★' : '☆'}
                  </Text>
                ))}
                <Text style={styles.ratingNumber}>
                  {Number(existingReview.overallRating || existingReview.rating || 5).toFixed(1)} / 5.0
                </Text>
              </View>
              {existingReview.reviewText || existingReview.comment ? (
                <Text style={styles.existingCommentText}>
                  "{existingReview.reviewText || existingReview.comment}"
                </Text>
              ) : null}
              <Text style={styles.reviewTimestamp}>
                Submitted on {new Date(existingReview.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
              </Text>
            </View>
          ) : (
            <View style={styles.reviewFormBox}>
              <Text style={styles.rateSubtitle}>
                How was your repair experience with {job.fixer?.companyName || 'the fixer'}?
              </Text>

              {/* Star Selector */}
              <View style={styles.starSelectorRow}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <TouchableOpacity
                    key={star}
                    activeOpacity={0.7}
                    onPress={() => setRatingInput(star)}
                    style={styles.starTouch}
                  >
                    <Text style={[styles.starIconSelect, star <= ratingInput && styles.starIconSelectActive]}>
                      ★
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TextInput
                style={styles.feedbackInput}
                placeholder="Write your feedback... e.g. Prompt service, excellent repair quality, reasonable cost."
                placeholderTextColor={Colors.muted}
                value={commentInput}
                onChangeText={setCommentInput}
                multiline
                numberOfLines={3}
              />

              <View style={styles.reviewActionsRow}>
                {isEditingReview && (
                  <TouchableOpacity
                    style={styles.cancelEditBtn}
                    onPress={() => setIsEditingReview(false)}
                    disabled={submittingReview}
                  >
                    <Text style={styles.cancelEditText}>Cancel</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={styles.submitReviewBtn}
                  onPress={handleSubmitReview}
                  disabled={submittingReview}
                >
                  {submittingReview ? (
                    <ActivityIndicator size="small" color={Colors.white} />
                  ) : (
                    <Text style={styles.submitReviewText}>
                      {isEditingReview ? 'Update Rating & Feedback' : 'Submit Rating & Feedback'}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      )}

      {/* Dispute Status Banner */}
      {(existingDispute || job.status === 'DISPUTED') && (
        <View style={styles.disputeActiveBanner}>
          <View style={styles.disputeBannerHeader}>
            <Text style={styles.disputeBannerTitle}>⚠️ Dispute Logged</Text>
            <View style={styles.disputeStatusTag}>
              <Text style={styles.disputeStatusTagText}>{existingDispute?.status || 'UNDER_REVIEW'}</Text>
            </View>
          </View>
          <Text style={styles.disputeReasonText}>
            Reason: {existingDispute?.reason?.replace(/_/g, ' ') || 'Service Issue'}
          </Text>
          {existingDispute?.description ? (
            <Text style={styles.disputeDescText}>"{existingDispute.description}"</Text>
          ) : null}
          {existingDispute?.adminNotes ? (
            <View style={styles.adminNoteBox}>
              <Text style={styles.adminNoteTitle}>Admin Note:</Text>
              <Text style={styles.adminNoteText}>{existingDispute.adminNotes}</Text>
            </View>
          ) : (
            <Text style={styles.disputeSubtext}>
              Our administrative team is moderating this dispute and coordinating with both parties for resolution.
            </Text>
          )}
        </View>
      )}

      {/* Device */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Device</Text>
        <Text style={styles.infoText}>{job.request?.category?.name}{job.request?.brand ? ` · ${job.request.brand.name}` : ''}</Text>
        {job.request?.deviceModel && <Text style={styles.subText}>{job.request.deviceModel}</Text>}
      </View>

      {/* Problem */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Problem</Text>
        <Text style={styles.desc}>{job.request?.description}</Text>
      </View>

      {/* Payment */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Payment</Text>
        <View style={styles.payRow}>
          <Text style={styles.payLabel}>Quote Amount</Text>
          <Text style={styles.payAmount}>₹{Number(job.quote?.amount || 0).toLocaleString('en-IN')}</Text>
        </View>
        <View style={styles.payRow}>
          <Text style={styles.payLabel}>Warranty</Text>
          <Text style={styles.payValue}>{job.quote?.warrantyDays || 0} days</Text>
        </View>
      </View>

      {/* Timeline */}
      {job.statusHistory?.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Timeline</Text>
          {job.statusHistory.map((h, i) => {
            const info = STATUS_LABELS[h.toStatus] || { label: h.toStatus, icon: '•' };
            return (
              <View key={i} style={styles.timelineItem}>
                <View style={[styles.dot, i === 0 && styles.dotActive]} />
                <View style={styles.timelineContent}>
                  <Text style={styles.timelineLabel}>{info.icon} {info.label}</Text>
                  <Text style={styles.timelineDate}>
                    {new Date(h.createdAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>
      )}

      {/* Actions */}
      <View style={styles.actions}>
        {!existingDispute && job.status !== 'DISPUTED' && (
          <TouchableOpacity
            style={styles.raiseDisputeBtn}
            onPress={() => setDisputeModalVisible(true)}
          >
            <Text style={styles.raiseDisputeText}>⚠️ Raise Dispute / Report Issue</Text>
          </TouchableOpacity>
        )}

        {canCancel && (
          <Button title="Cancel Job" onPress={handleCancel} variant="danger" size="md" />
        )}
      </View>
    </ScrollView>

    {/* Raise Dispute Modal */}
    <Modal
      visible={disputeModalVisible}
      transparent={true}
      animationType="fade"
      onRequestClose={() => setDisputeModalVisible(false)}
    >
      <View style={styles.backdrop}>
        <View style={styles.disputeModalCard}>
          <Text style={styles.disputeModalTitle}>⚠️ Report Issue / Raise Dispute</Text>
          <Text style={styles.disputeModalSubtitle}>
            Please select the primary issue and explain the problem. Our admin team will investigate and intervene.
          </Text>

          <Text style={styles.disputeLabel}>Select Dispute Reason:</Text>
          <ScrollView style={styles.reasonsList} nestedScrollEnabled>
            {CUSTOMER_DISPUTE_REASONS.map((r) => (
              <TouchableOpacity
                key={r.id}
                style={[styles.reasonOption, disputeReason === r.id && styles.reasonOptionActive]}
                onPress={() => setDisputeReason(r.id)}
              >
                <Text style={[styles.reasonOptionText, disputeReason === r.id && styles.reasonOptionTextActive]}>
                  {disputeReason === r.id ? '● ' : '○ '}{r.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <Text style={[styles.disputeLabel, { marginTop: Spacing.sm }]}>Explain the Problem in Detail:</Text>
          <TextInput
            style={styles.disputeTextInput}
            placeholder="Describe what happened (e.g. fixer did not fix the problem, requested extra cash, damaged component)..."
            placeholderTextColor={Colors.muted}
            value={disputeDesc}
            onChangeText={setDisputeDesc}
            multiline
            numberOfLines={4}
          />

          <View style={styles.popupActions}>
            <TouchableOpacity
              style={styles.cancelPopupBtn}
              onPress={() => setDisputeModalVisible(false)}
              disabled={submittingDispute}
            >
              <Text style={styles.cancelPopupText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.submitDisputeBtn}
              onPress={handleSubmitDispute}
              disabled={submittingDispute}
            >
              {submittingDispute ? (
                <ActivityIndicator size="small" color={Colors.white} />
              ) : (
                <Text style={styles.submitDisputeText}>Submit Dispute ⚠️</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  content: { padding: Spacing.xl, paddingBottom: Spacing.xxxl },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  statusCard: {
    backgroundColor: Colors.primary, borderRadius: BorderRadius.lg, padding: Spacing.xl,
    alignItems: 'center', marginBottom: Spacing.lg,
  },
  statusIcon: { fontSize: 36, marginBottom: Spacing.sm },
  statusLabel: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.white },
  section: {
    backgroundColor: Colors.card, borderRadius: BorderRadius.lg, padding: Spacing.base,
    marginBottom: Spacing.md, borderWidth: 1, borderColor: Colors.borderLight,
  },
  sectionTitle: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold, color: Colors.text, marginBottom: Spacing.sm },
  fixerRow: { flexDirection: 'row', alignItems: 'center' },
  fixerAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.accentSoft, justifyContent: 'center', alignItems: 'center', marginRight: Spacing.md },
  fixerAvatarText: { fontSize: FontSize.md, fontWeight: FontWeight.bold, color: Colors.accent },
  fixerName: { fontSize: FontSize.base, fontWeight: FontWeight.semibold, color: Colors.text },
  fixerSub: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: 2 },
  infoText: { fontSize: FontSize.base, color: Colors.text },
  subText: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: 2 },
  desc: { fontSize: FontSize.base, color: Colors.textSecondary, lineHeight: 22 },
  payRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: Spacing.sm },
  payLabel: { fontSize: FontSize.sm, color: Colors.textSecondary },
  payAmount: { fontSize: FontSize.md, fontWeight: FontWeight.bold, color: Colors.accent },
  payValue: { fontSize: FontSize.sm, fontWeight: FontWeight.medium, color: Colors.text },
  timelineItem: { flexDirection: 'row', marginBottom: Spacing.md },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.border, marginTop: 5, marginRight: Spacing.md },
  dotActive: { backgroundColor: Colors.accent },
  timelineContent: { flex: 1 },
  timelineLabel: { fontSize: FontSize.sm, fontWeight: FontWeight.medium, color: Colors.text },
  timelineDate: { fontSize: FontSize.xs, color: Colors.muted, marginTop: 2 },
  actions: { gap: Spacing.md, marginTop: Spacing.md },

  // Rating & Review Styles
  reviewSectionCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    borderWidth: 1,
    borderColor: '#FDE68A',
    marginBottom: Spacing.md,
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  reviewCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  reviewCardTitle: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  editReviewBtn: {
    backgroundColor: Colors.accentSoft,
    paddingHorizontal: Spacing.md,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  editReviewBtnText: {
    color: Colors.accent,
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
  },
  existingReviewBox: {
    backgroundColor: '#FFFBEB',
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: '#FEF3C7',
    gap: Spacing.xs,
  },
  starsRowDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  starIconDisplay: {
    fontSize: 20,
    color: '#F59E0B',
  },
  ratingNumber: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    color: '#B45309',
    marginLeft: Spacing.xs,
  },
  existingCommentText: {
    fontSize: FontSize.sm,
    color: Colors.text,
    fontStyle: 'italic',
    lineHeight: 20,
    marginTop: 2,
  },
  reviewTimestamp: {
    fontSize: FontSize.xs,
    color: Colors.muted,
    marginTop: Spacing.xs,
  },

  reviewFormBox: {
    gap: Spacing.sm,
  },
  rateSubtitle: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  starSelectorRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.xs,
  },
  starTouch: {
    padding: Spacing.xs,
  },
  starIconSelect: {
    fontSize: 34,
    color: '#D1D5DB',
  },
  starIconSelectActive: {
    color: '#F59E0B',
  },
  feedbackInput: {
    backgroundColor: '#F9FAFB',
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    padding: Spacing.md,
    fontSize: FontSize.sm,
    color: Colors.text,
    textAlignVertical: 'top',
    minHeight: 70,
  },
  reviewActionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  cancelEditBtn: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    justifyContent: 'center',
  },
  cancelEditText: {
    color: Colors.muted,
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
  },
  submitReviewBtn: {
    backgroundColor: '#F59E0B',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm + 2,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitReviewText: {
    color: Colors.white,
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
  },

  // Dispute Banner & Modal Styles
  disputeActiveBanner: {
    backgroundColor: '#FEF2F2',
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    borderWidth: 1.5,
    borderColor: '#FCA5A5',
    marginBottom: Spacing.md,
    gap: Spacing.xs,
  },
  disputeBannerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  disputeBannerTitle: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.bold,
    color: '#DC2626',
  },
  disputeStatusTag: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  disputeStatusTagText: {
    fontSize: 10,
    fontWeight: FontWeight.bold,
    color: '#B91C1C',
  },
  disputeReasonText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    color: '#991B1B',
  },
  disputeDescText: {
    fontSize: FontSize.xs,
    color: Colors.text,
    fontStyle: 'italic',
    lineHeight: 18,
  },
  disputeSubtext: {
    fontSize: FontSize.xs,
    color: Colors.muted,
    lineHeight: 16,
    marginTop: 2,
  },
  adminNoteBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    borderWidth: 1,
    borderColor: '#FECACA',
    marginTop: 4,
  },
  adminNoteTitle: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    color: '#DC2626',
  },
  adminNoteText: {
    fontSize: FontSize.xs,
    color: Colors.text,
    marginTop: 2,
  },

  raiseDisputeBtn: {
    backgroundColor: '#FFF1F2',
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FECDD3',
  },
  raiseDisputeText: {
    color: '#E11D48',
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
  },

  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.base,
  },
  disputeModalCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    width: '100%',
    maxWidth: 450,
    gap: Spacing.xs,
  },
  disputeModalTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: '#DC2626',
  },
  disputeModalSubtitle: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
    lineHeight: 16,
  },
  disputeLabel: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  reasonsList: {
    maxHeight: 160,
    backgroundColor: '#F9FAFB',
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    padding: Spacing.xs,
  },
  reasonOption: {
    paddingVertical: Spacing.xs + 2,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.sm,
  },
  reasonOptionActive: {
    backgroundColor: '#FEE2E2',
  },
  reasonOptionText: {
    fontSize: FontSize.xs,
    color: Colors.text,
  },
  reasonOptionTextActive: {
    fontWeight: FontWeight.bold,
    color: '#DC2626',
  },
  disputeTextInput: {
    backgroundColor: '#F9FAFB',
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    padding: Spacing.md,
    fontSize: FontSize.sm,
    color: Colors.text,
    textAlignVertical: 'top',
    minHeight: 80,
  },
  popupActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  cancelPopupBtn: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    justifyContent: 'center',
  },
  cancelPopupText: {
    fontSize: FontSize.sm,
    color: Colors.muted,
    fontWeight: FontWeight.semibold,
  },
  submitDisputeBtn: {
    backgroundColor: '#DC2626',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm + 2,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitDisputeText: {
    color: Colors.white,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
  },
});
