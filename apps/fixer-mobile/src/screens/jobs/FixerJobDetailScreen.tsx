import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  Linking,
  TouchableOpacity,
  Modal,
  SafeAreaView,
  Image,
} from 'react-native';
import { Button, Input } from '../../components/ui';
import { InteractiveMapView } from '../../components/ui/InteractiveMapView';
import { Colors, FontSize, FontWeight, Spacing, BorderRadius } from '../../theme/tokens';
import { useAuthStore } from '../../stores/auth.store';
import { api } from '../../services/api';

interface FixerMember {
  id: string;
  fullName: string;
  phone: string;
  email: string;
}

interface JobDetail {
  id: string;
  status: string;
  agreedTotal?: number;
  warrantyDays?: number;
  scheduledDate: string | null;
  scheduledTimeSlot: string | null;
  fixerNotes: string | null;
  completedAt: string | null;
  assignedMemberId?: string | null;
  assignedMember?: FixerMember | null;
  revisedTotal?: number | null;
  revisionNotes?: string | null;
  revisionStatus?: string;
  request: {
    id?: string;
    description?: string;
    problemDescription?: string;
    problemTitle?: string;
    deviceModel: string | null;
    category?: { name: string };
    brand?: { name: string } | null;
    houseBuilding?: string;
    street?: string;
    area?: string;
    landmark?: string;
    city?: string;
    state?: string;
    pincode?: string;
    latitude?: number;
    longitude?: number;
    media?: Array<{ id: string; storageKey: string }> | null;
    photos?: string[] | null;
    addressSnapshot?: { houseBuilding?: string; area?: string; city?: string; pincode?: string } | null;
  };
  customer: { firstName?: string; lastName?: string; userId?: string };
  quote?: { amount?: number; estimatedTotal?: number; diagnosisNotes?: string | null; notes?: string | null; warrantyDays?: number };
  statusHistory: Array<{ fromStatus: string | null; toStatus: string; notes: string | null; createdAt: string }>;
  createdAt: string;
}

const STATUS_FLOW: Record<string, { next: string; label: string; icon: string }> = {
  ASSIGNED: { next: 'FIXER_ON_THE_WAY', label: 'Start — On My Way', icon: '🚗' },
  FIXER_ON_THE_WAY: { next: 'DEVICE_RECEIVED', label: 'Device Received', icon: '📦' },
  DEVICE_RECEIVED: { next: 'DIAGNOSING', label: 'Start Diagnosing', icon: '🔍' },
  DIAGNOSING: { next: 'REPAIR_IN_PROGRESS', label: 'Start Repair', icon: '🔧' },
  REPAIR_IN_PROGRESS: { next: 'READY_FOR_DELIVERY', label: 'Mark Ready', icon: '✅' },
  READY_FOR_DELIVERY: { next: 'COMPLETED', label: 'Complete Job', icon: '🎉' },
};

const STATUS_LABELS: Record<string, string> = {
  ASSIGNED: 'Assigned',
  FIXER_ON_THE_WAY: 'On the Way',
  DEVICE_RECEIVED: 'Device Received',
  DIAGNOSING: 'Diagnosing',
  REPAIR_IN_PROGRESS: 'Repairing',
  READY_FOR_DELIVERY: 'Ready for Delivery',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
  DISPUTED: 'Disputed',
};

export function FixerJobDetailScreen({ route, navigation }: any) {
  const { jobId } = route.params;
  const { user } = useAuthStore();
  const isOwner = user?.role !== 'FIXER_MEMBER';

  const [job, setJob] = useState<JobDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [startingChat, setStartingChat] = useState(false);

  // Assign Member
  const [members, setMembers] = useState<FixerMember[]>([]);
  const [assignModalVisible, setAssignModalVisible] = useState(false);
  const [assigning, setAssigning] = useState(false);

  // Quote Revision
  const [revisionModalVisible, setRevisionModalVisible] = useState(false);
  const [revisedAmount, setRevisedAmount] = useState('');
  const [revisionReason, setRevisionReason] = useState('');
  const [submittingRevision, setSubmittingRevision] = useState(false);

  // Photo Viewer Modal
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);

  const fetchJob = async () => {
    try {
      const { data } = await api.get(`/jobs/${jobId}`);
      setJob(data.data || data);
    } catch {} finally {
      setLoading(false);
    }
  };

  const fetchMembers = async () => {
    if (!isOwner) return;
    try {
      const { data } = await api.get('/fixers/me/members');
      setMembers(data?.data || data || []);
    } catch {}
  };

  useEffect(() => {
    fetchJob();
    fetchMembers();
  }, [jobId]);

  const handleStatusUpdate = () => {
    if (!job) return;
    const transition = STATUS_FLOW[job.status];
    if (!transition) return;

    Alert.alert(
      `${transition.icon} ${transition.label}`,
      `Update job status to "${STATUS_LABELS[transition.next]}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            setUpdating(true);
            try {
              await api.patch(`/jobs/${jobId}/status`, { status: transition.next });
              await fetchJob();
            } catch (err: any) {
              Alert.alert('Error', err?.response?.data?.message || 'Failed to update status');
            } finally {
              setUpdating(false);
            }
          },
        },
      ],
    );
  };

  const handleAssignMember = async (memberId: string | null) => {
    setAssigning(true);
    try {
      await api.patch(`/jobs/${jobId}/assign-member`, { memberId });
      Alert.alert('Success', memberId ? 'Technician assigned to job.' : 'Technician assignment cleared.');
      setAssignModalVisible(false);
      await fetchJob();
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message || 'Failed to assign technician');
    } finally {
      setAssigning(false);
    }
  };

  const handleRequestRevision = async () => {
    const amountNum = parseFloat(revisedAmount);
    if (isNaN(amountNum) || amountNum <= 0 || !revisionReason.trim()) {
      Alert.alert('Invalid Input', 'Please enter a valid revised price and reason for the customer.');
      return;
    }

    setSubmittingRevision(true);
    try {
      await api.post(`/jobs/${jobId}/request-revision`, {
        revisedTotal: amountNum,
        notes: revisionReason.trim(),
      });
      Alert.alert('Revision Request Sent! 📨', 'The customer has been notified and can approve or decline the revised quote.');
      setRevisionModalVisible(false);
      setRevisedAmount('');
      setRevisionReason('');
      await fetchJob();
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message || 'Failed to submit revision request');
    } finally {
      setSubmittingRevision(false);
    }
  };

  const handleCancelJob = () => {
    if (!job) return;
    Alert.alert(
      'Cancel & Release Job',
      "Are you sure you want to cancel this job? This will release your assignment and reset the customer's request back to open so other fixers can quote.",
      [
        { text: 'Keep Job', style: 'cancel' },
        {
          text: 'Cancel Job',
          style: 'destructive',
          onPress: async () => {
            setUpdating(true);
            try {
              await api.patch(`/jobs/${jobId}/cancel`, { reason: 'Fixer cancelled assignment' });
              Alert.alert('Job Cancelled', 'The job has been released and the customer request reset.');
              navigation.goBack();
            } catch (err: any) {
              Alert.alert('Error', err?.response?.data?.message || 'Failed to cancel job');
            } finally {
              setUpdating(false);
            }
          },
        },
      ],
    );
  };

  const handleStartChat = async () => {
    if (!job) return;
    setStartingChat(true);
    try {
      const { data } = await api.post('/chat/conversations', {
        jobId: job.id,
        requestId: job.request?.id,
      });
      const conv = data?.data || data;
      if (conv?.id) {
        navigation.navigate('ChatRoom', {
          conversationId: conv.id,
          otherUserName: job.customer?.firstName ? `${job.customer.firstName} (Customer)` : 'Customer',
        });
      }
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message || 'Failed to start chat');
    } finally {
      setStartingChat(false);
    }
  };

  const openNavigation = () => {
    if (!job?.request) return;
    const req = job.request;
    if (req.latitude && req.longitude) {
      Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${req.latitude},${req.longitude}`);
    } else {
      const query = [req.houseBuilding, req.street, req.area, req.landmark, req.city, req.pincode]
        .filter(Boolean)
        .join(', ');
      Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query || 'Bengaluru')}`);
    }
  };

  if (loading || !job) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.accent} />
      </View>
    );
  }

  const transition = STATUS_FLOW[job.status];
  const amountVal = Number(job.agreedTotal ?? job.quote?.estimatedTotal ?? job.quote?.amount ?? 0);
  const problemText = job.request?.problemDescription || job.request?.description || job.request?.problemTitle || 'Repair Job';
  const fullAddress = [
    job.request?.houseBuilding,
    job.request?.street,
    job.request?.area,
    job.request?.landmark ? `(Near ${job.request.landmark})` : '',
    job.request?.city,
    job.request?.pincode ? `- ${job.request.pincode}` : '',
  ].filter(Boolean).join(', ') || 'Customer address on file';

  const canCancel = ['ASSIGNED', 'FIXER_ON_THE_WAY'].includes(job.status);
  const canAssignMember = isOwner && job.status === 'ASSIGNED';
  const canRequestRevision = !['COMPLETED', 'CANCELLED'].includes(job.status);

  return (
    <View style={styles.flex}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* Status & Amount Card */}
        <View style={styles.statusCard}>
          <Text style={styles.statusLabel}>{STATUS_LABELS[job.status] || job.status}</Text>
          <Text style={styles.amount}>₹{amountVal.toLocaleString('en-IN')}</Text>
          {job.warrantyDays ? (
            <Text style={styles.warrantyBadge}>{job.warrantyDays} Days Warranty Active</Text>
          ) : null}
        </View>

        {/* Revision Status Alert */}
        {job.revisionStatus === 'PENDING' && (
          <View style={styles.revisionPendingBanner}>
            <Text style={styles.revisionPendingTitle}>⏳ Quote Revision Pending Approval</Text>
            <Text style={styles.revisionPendingText}>
              Requested: ₹{Number(job.revisedTotal || 0).toLocaleString('en-IN')} — Reason: {job.revisionNotes}
            </Text>
          </View>
        )}

        {job.revisionStatus === 'APPROVED' && (
          <View style={styles.revisionApprovedBanner}>
            <Text style={styles.revisionApprovedText}>✅ Revised quote of ₹{amountVal.toLocaleString('en-IN')} approved by customer.</Text>
          </View>
        )}

        {/* Action Buttons Row */}
        <View style={styles.topActionsRow}>
          <TouchableOpacity
            style={styles.chatActionBtn}
            onPress={handleStartChat}
            disabled={startingChat}
          >
            {startingChat ? (
              <ActivityIndicator size="small" color={Colors.accent} />
            ) : (
              <Text style={styles.chatActionText}>💬 Chat with Customer</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.navigateActionBtn}
            onPress={openNavigation}
          >
            <Text style={styles.navigateActionText}>🗺️ Open Maps</Text>
          </TouchableOpacity>
        </View>

        {/* Next Workflow Action */}
        {transition && (
          <Button
            title={`${transition.icon} ${transition.label}`}
            onPress={handleStatusUpdate}
            loading={updating}
            size="lg"
          />
        )}

        {/* Assigned Technician Card */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>👤 Assigned Technician</Text>
            {canAssignMember && (
              <TouchableOpacity onPress={() => setAssignModalVisible(true)}>
                <Text style={styles.changeActionText}>
                  {job.assignedMember ? 'Change ✏️' : '+ Assign Staff'}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {job.assignedMember ? (
            <View style={styles.technicianRow}>
              <View style={styles.technicianAvatar}>
                <Text style={styles.technicianAvatarText}>
                  {job.assignedMember.fullName.charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={styles.technicianInfo}>
                <Text style={styles.technicianName}>{job.assignedMember.fullName}</Text>
                <Text style={styles.technicianPhone}>📱 {job.assignedMember.phone} · 📧 {job.assignedMember.email}</Text>
              </View>
            </View>
          ) : (
            <Text style={styles.unassignedText}>
              {canAssignMember
                ? 'No staff member assigned yet. Tap "+ Assign Staff" to delegate to a technician.'
                : 'Primary workshop technician handling this job.'}
            </Text>
          )}
        </View>

        {/* Device Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Device</Text>
          <Text style={styles.infoText}>
            {job.request?.category?.name}{job.request?.brand ? ` · ${job.request.brand.name}` : ''}
          </Text>
          {job.request?.deviceModel ? <Text style={styles.subText}>{job.request.deviceModel}</Text> : null}
        </View>

        {/* Problem Description */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Problem Reported</Text>
          <Text style={styles.description}>{problemText}</Text>
        </View>

        {/* Customer Uploaded Photos */}
        {((job.request?.media && job.request.media.length > 0) || (job.request?.photos && job.request.photos.length > 0)) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              📸 Customer Uploaded Photos ({((job.request.media || []).length || (job.request.photos || []).length)})
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.photoScroll}>
              {(job.request.media || []).map((item, idx) => (
                <TouchableOpacity
                  key={item.id || idx}
                  activeOpacity={0.85}
                  style={styles.photoThumbCard}
                  onPress={() => setSelectedPhoto(item.storageKey)}
                >
                  <Image
                    source={{ uri: item.storageKey }}
                    style={styles.photoThumb}
                    resizeMode="cover"
                  />
                  <View style={styles.photoZoomBadge}>
                    <Text style={styles.photoZoomText}>🔍 View</Text>
                  </View>
                </TouchableOpacity>
              ))}

              {(!job.request.media || job.request.media.length === 0) && (job.request.photos || []).map((uriStr, idx) => (
                <TouchableOpacity
                  key={idx}
                  activeOpacity={0.85}
                  style={styles.photoThumbCard}
                  onPress={() => setSelectedPhoto(uriStr)}
                >
                  <Image
                    source={{ uri: uriStr }}
                    style={styles.photoThumb}
                    resizeMode="cover"
                  />
                  <View style={styles.photoZoomBadge}>
                    <Text style={styles.photoZoomText}>🔍 View</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Customer Location */}
        <View style={styles.section}>
          <View style={styles.mapHeaderRow}>
            <Text style={styles.sectionTitle}>📍 Customer Location & Address</Text>
            <TouchableOpacity onPress={openNavigation}>
              <Text style={styles.openMapText}>Navigate 🗺️</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.infoText}>{fullAddress}</Text>

          {job.request?.latitude && job.request?.longitude ? (
            <View style={styles.inlineMapContainer}>
              <InteractiveMapView
                markers={[
                  {
                    id: job.id,
                    latitude: job.request.latitude,
                    longitude: job.request.longitude,
                    title: job.request.area || 'Customer',
                    icon: '📍',
                    badge: 'Customer',
                  },
                ]}
                centerLat={job.request.latitude}
                centerLng={job.request.longitude}
                initialZoom={15}
                style={styles.inlineMap}
                showNavigationButton={true}
              />
            </View>
          ) : null}
        </View>

        {/* Quote Details & Revision Button */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Quote Details</Text>
            {canRequestRevision && job.revisionStatus !== 'PENDING' && (
              <TouchableOpacity onPress={() => setRevisionModalVisible(true)}>
                <Text style={styles.revisionActionText}>📝 Request Price Revision</Text>
              </TouchableOpacity>
            )}
          </View>
          {job.quote?.notes || job.quote?.diagnosisNotes ? (
            <Text style={styles.subText}>{job.quote?.notes || job.quote?.diagnosisNotes}</Text>
          ) : null}
          <Text style={styles.subText}>Agreed Warranty: {job.warrantyDays || job.quote?.warrantyDays || 0} days</Text>
        </View>

        {/* Cancel Action */}
        {canCancel && (
          <TouchableOpacity
            style={styles.cancelJobBtn}
            onPress={handleCancelJob}
            disabled={updating}
          >
            <Text style={styles.cancelJobText}>✕ Cancel & Release Job</Text>
          </TouchableOpacity>
        )}

        {/* Status Timeline */}
        {job.statusHistory?.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Status Timeline</Text>
            {job.statusHistory.map((h, i) => (
              <View key={i} style={styles.timelineItem}>
                <View style={styles.timelineDot} />
                <View style={styles.timelineContent}>
                  <Text style={styles.timelineStatus}>
                    {STATUS_LABELS[h.toStatus] || h.toStatus}
                  </Text>
                  <Text style={styles.timelineDate}>
                    {new Date(h.createdAt).toLocaleString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </Text>
                  {h.notes ? <Text style={styles.timelineNotes}>Note: {h.notes}</Text> : null}
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Assign Member Modal */}
      <Modal
        visible={assignModalVisible}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setAssignModalVisible(false)}
      >
        <SafeAreaView style={styles.modalSafeArea}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Assign Workshop Technician</Text>
            <TouchableOpacity onPress={() => setAssignModalVisible(false)}>
              <Text style={styles.modalCloseText}>✕ Close</Text>
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.modalContent}>
            <Text style={styles.modalSubtitle}>
              Select a team member to assign to this repair job. They will see this job in their assigned jobs list.
            </Text>

            {/* Clear assignment option */}
            {job.assignedMemberId && (
              <TouchableOpacity
                style={styles.clearAssignBtn}
                onPress={() => handleAssignMember(null)}
                disabled={assigning}
              >
                <Text style={styles.clearAssignText}>✕ Clear Assigned Technician</Text>
              </TouchableOpacity>
            )}

            {members.length === 0 ? (
              <View style={styles.noMembersBox}>
                <Text style={styles.noMembersText}>No staff members added yet.</Text>
                <TouchableOpacity
                  onPress={() => {
                    setAssignModalVisible(false);
                    navigation.navigate('ProfileTab', { screen: 'ManageMembers' });
                  }}
                >
                  <Text style={styles.addMemberLink}>+ Add staff members in Profile</Text>
                </TouchableOpacity>
              </View>
            ) : (
              members.map((m) => {
                const isSelected = job.assignedMemberId === m.id;
                return (
                  <TouchableOpacity
                    key={m.id}
                    style={[styles.memberSelectCard, isSelected && styles.memberSelectCardSelected]}
                    onPress={() => handleAssignMember(m.id)}
                    disabled={assigning}
                  >
                    <View style={styles.technicianAvatar}>
                      <Text style={styles.technicianAvatarText}>
                        {m.fullName.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View style={styles.memberInfo}>
                      <Text style={styles.technicianName}>{m.fullName}</Text>
                      <Text style={styles.technicianPhone}>📱 {m.phone}</Text>
                    </View>
                    {isSelected ? (
                      <Text style={styles.selectedCheck}>✓ Assigned</Text>
                    ) : (
                      <Text style={styles.selectBtnText}>Assign →</Text>
                    )}
                  </TouchableOpacity>
                );
              })
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Quote Revision Request Modal */}
      <Modal
        visible={revisionModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setRevisionModalVisible(false)}
      >
        <View style={styles.backdrop}>
          <View style={styles.popupCard}>
            <Text style={styles.popupTitle}>📝 Request Quote Revision</Text>
            <Text style={styles.popupSubtitle}>
              If new parts or additional diagnostics require a revised total, send a revision request to the customer.
            </Text>

            <Input
              label="New Total Price (₹) *"
              value={revisedAmount}
              onChangeText={setRevisedAmount}
              placeholder="e.g. 3500"
              keyboardType="number-pad"
            />

            <Input
              label="Reason for Revision *"
              value={revisionReason}
              onChangeText={setRevisionReason}
              placeholder="e.g. Additional IC replacement required"
              multiline
              numberOfLines={2}
            />

            <View style={styles.popupActions}>
              <TouchableOpacity
                style={styles.popupCancelBtn}
                onPress={() => setRevisionModalVisible(false)}
              >
                <Text style={styles.popupCancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.popupSaveBtn}
                onPress={handleRequestRevision}
                disabled={submittingRevision}
              >
                {submittingRevision ? (
                  <ActivityIndicator size="small" color={Colors.white} />
                ) : (
                  <Text style={styles.popupSaveText}>Send to Customer</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Full-Screen Customer Photo Zoom Modal */}
      <Modal
        visible={!!selectedPhoto}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setSelectedPhoto(null)}
      >
        <SafeAreaView style={styles.photoModalSafeArea}>
          <View style={styles.photoModalHeader}>
            <Text style={styles.photoModalTitle}>📸 Customer Uploaded Photo</Text>
            <TouchableOpacity onPress={() => setSelectedPhoto(null)} style={styles.photoModalCloseBtn}>
              <Text style={styles.photoModalCloseText}>✕ Close</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.photoModalContent}>
            {selectedPhoto && (
              <Image
                source={{ uri: selectedPhoto }}
                style={styles.fullPhoto}
                resizeMode="contain"
              />
            )}
          </View>
        </SafeAreaView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.bg },
  container: { flex: 1, backgroundColor: Colors.bg },
  content: { padding: Spacing.base, paddingBottom: Spacing.xxxl, gap: Spacing.md },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  statusCard: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    alignItems: 'center',
  },
  statusLabel: { fontSize: FontSize.md, fontWeight: FontWeight.bold, color: Colors.white },
  amount: { fontSize: FontSize.xxl, fontWeight: FontWeight.bold, color: Colors.accentLight, marginTop: Spacing.xs },
  warrantyBadge: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
    color: '#86EFAC',
    marginTop: Spacing.xs,
  },

  revisionPendingBanner: {
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
  },
  revisionPendingTitle: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, color: '#92400E', marginBottom: 2 },
  revisionPendingText: { fontSize: FontSize.xs, color: '#78350F', lineHeight: 16 },

  revisionApprovedBanner: {
    backgroundColor: '#DCFCE7',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
  },
  revisionApprovedText: { fontSize: FontSize.xs, fontWeight: FontWeight.semibold, color: '#166534', textAlign: 'center' },

  topActionsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  chatActionBtn: {
    flex: 1.5,
    backgroundColor: Colors.accentSoft,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.accent,
  },
  chatActionText: { color: Colors.accent, fontSize: FontSize.xs, fontWeight: FontWeight.bold },
  navigateActionBtn: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  navigateActionText: { color: Colors.text, fontSize: FontSize.xs, fontWeight: FontWeight.bold },

  section: {
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  changeActionText: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, color: Colors.accent },
  revisionActionText: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, color: '#D97706' },
  mapHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  openMapText: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, color: Colors.accent },
  sectionTitle: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, color: Colors.muted, marginBottom: Spacing.xs, textTransform: 'uppercase' },
  infoText: { fontSize: FontSize.base, color: Colors.text, fontWeight: FontWeight.semibold },
  subText: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: 4 },
  description: { fontSize: FontSize.base, color: Colors.textSecondary, lineHeight: 22 },

  technicianRow: { flexDirection: 'row', alignItems: 'center', marginTop: Spacing.xs },
  technicianAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.accentSoft,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.accent,
  },
  technicianAvatarText: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.accent },
  technicianInfo: { flex: 1 },
  technicianName: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.text },
  technicianPhone: { fontSize: FontSize.xs, color: Colors.muted, marginTop: 2 },
  unassignedText: { fontSize: FontSize.xs, color: Colors.muted, fontStyle: 'italic', marginTop: 4 },

  timelineItem: { flexDirection: 'row', marginBottom: Spacing.md },
  timelineDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.accent, marginTop: 5, marginRight: Spacing.md },
  timelineContent: { flex: 1 },
  timelineStatus: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold, color: Colors.text },
  timelineDate: { fontSize: FontSize.xs, color: Colors.muted, marginTop: 2 },
  timelineNotes: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 2, fontStyle: 'italic' },
  cancelJobBtn: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.sm + 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelJobText: {
    color: '#DC2626',
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
  },

  modalSafeArea: { flex: 1, backgroundColor: Colors.bg },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  modalTitle: { fontSize: FontSize.base, fontWeight: FontWeight.bold, color: Colors.text },
  modalCloseText: { fontSize: FontSize.sm, color: Colors.muted, fontWeight: FontWeight.semibold },
  modalContent: { padding: Spacing.base, gap: Spacing.sm },
  modalSubtitle: { fontSize: FontSize.xs, color: Colors.muted, marginBottom: Spacing.sm, lineHeight: 18 },

  memberSelectCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.borderLight,
    marginBottom: Spacing.sm,
  },
  memberSelectCardSelected: { borderColor: Colors.accent, backgroundColor: Colors.accentSoft + '30' },
  memberInfo: { flex: 1 },
  selectBtnText: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, color: Colors.accent },
  selectedCheck: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, color: Colors.success },

  clearAssignBtn: {
    backgroundColor: '#FEF2F2',
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  clearAssignText: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, color: '#DC2626' },
  noMembersBox: { alignItems: 'center', padding: Spacing.xl },
  noMembersText: { fontSize: FontSize.sm, color: Colors.muted, marginBottom: Spacing.sm },
  addMemberLink: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.accent },

  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: Spacing.base },
  popupCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    width: '100%',
    maxWidth: 400,
    gap: Spacing.sm,
  },
  popupTitle: { fontSize: FontSize.base, fontWeight: FontWeight.bold, color: Colors.text },
  popupSubtitle: { fontSize: FontSize.xs, color: Colors.muted, marginBottom: Spacing.xs, lineHeight: 16 },
  popupActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: Spacing.sm, marginTop: Spacing.sm },
  popupCancelBtn: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm },
  popupCancelText: { fontSize: FontSize.sm, color: Colors.muted, fontWeight: FontWeight.semibold },
  popupSaveBtn: {
    backgroundColor: Colors.accent,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  popupSaveText: { color: Colors.white, fontSize: FontSize.sm, fontWeight: FontWeight.bold },

  inlineMapContainer: {
    height: 180,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    marginTop: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  inlineMap: {
    flex: 1,
    width: '100%',
    height: '100%',
  },

  photoScroll: { gap: Spacing.sm, paddingVertical: Spacing.xs },
  photoThumbCard: {
    width: 100,
    height: 100,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
    backgroundColor: '#F1F5F9',
    position: 'relative',
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  photoThumb: { width: '100%', height: '100%' },
  photoZoomBadge: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  photoZoomText: { color: '#FFFFFF', fontSize: 9, fontWeight: FontWeight.bold },

  photoModalSafeArea: { flex: 1, backgroundColor: '#000000' },
  photoModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    backgroundColor: 'rgba(15, 23, 42, 0.9)',
  },
  photoModalTitle: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: '#FFFFFF' },
  photoModalCloseBtn: { paddingHorizontal: Spacing.sm, paddingVertical: 4 },
  photoModalCloseText: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: '#EF4444' },
  photoModalContent: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  fullPhoto: { width: '100%', height: '100%' },
});
