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
} from 'react-native';
import { Button } from '../../components/ui';
import { Colors, FontSize, FontWeight, Spacing, BorderRadius } from '../../theme/tokens';
import { api } from '../../services/api';

interface JobDetail {
  id: string;
  status: string;
  agreedTotal?: number;
  warrantyDays?: number;
  scheduledDate: string | null;
  scheduledTimeSlot: string | null;
  fixerNotes: string | null;
  completedAt: string | null;
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
  const [job, setJob] = useState<JobDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [startingChat, setStartingChat] = useState(false);

  const fetchJob = async () => {
    try {
      const { data } = await api.get(`/jobs/${jobId}`);
      setJob(data.data || data);
    } catch {} finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJob();
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

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Status & Amount Card */}
      <View style={styles.statusCard}>
        <Text style={styles.statusLabel}>{STATUS_LABELS[job.status] || job.status}</Text>
        <Text style={styles.amount}>₹{amountVal.toLocaleString('en-IN')}</Text>
        {job.warrantyDays ? (
          <Text style={styles.warrantyBadge}>{job.warrantyDays} Days Warranty Active</Text>
        ) : null}
      </View>

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

      {/* Customer Location */}
      <View style={styles.section}>
        <View style={styles.mapHeaderRow}>
          <Text style={styles.sectionTitle}>📍 Customer Location & Address</Text>
          <TouchableOpacity onPress={openNavigation}>
            <Text style={styles.openMapText}>Navigate 🗺️</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.infoText}>{fullAddress}</Text>
      </View>

      {/* Quote Details */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quote Details</Text>
        {job.quote?.notes || job.quote?.diagnosisNotes ? (
          <Text style={styles.subText}>{job.quote?.notes || job.quote?.diagnosisNotes}</Text>
        ) : null}
        <Text style={styles.subText}>Agreed Warranty: {job.warrantyDays || job.quote?.warrantyDays || 0} days</Text>
      </View>

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
                {h.notes ? <Text style={styles.timelineNotes}>{h.notes}</Text> : null}
              </View>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
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

  timelineItem: { flexDirection: 'row', marginBottom: Spacing.md },
  timelineDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.accent, marginTop: 5, marginRight: Spacing.md },
  timelineContent: { flex: 1 },
  timelineStatus: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold, color: Colors.text },
  timelineDate: { fontSize: FontSize.xs, color: Colors.muted, marginTop: 2 },
  timelineNotes: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 2, fontStyle: 'italic' },
});
