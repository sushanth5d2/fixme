import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Button } from '../../components/ui';
import { Colors, FontSize, FontWeight, Spacing, BorderRadius } from '../../theme/tokens';
import { api } from '../../services/api';

interface JobDetail {
  id: string;
  status: string;
  scheduledDate: string | null;
  scheduledTimeSlot: string | null;
  fixerNotes: string | null;
  completedAt: string | null;
  request: {
    description: string;
    deviceModel: string | null;
    category: { name: string };
    brand: { name: string } | null;
    addressSnapshot: { houseBuilding?: string; area?: string; city?: string; pincode?: string } | null;
  };
  customer: { firstName?: string; userId: string };
  quote: { amount: number; diagnosisNotes: string | null; warrantyDays: number };
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
  ASSIGNED: 'Assigned', FIXER_ON_THE_WAY: 'On the Way', DEVICE_RECEIVED: 'Device Received',
  DIAGNOSING: 'Diagnosing', REPAIR_IN_PROGRESS: 'Repairing', READY_FOR_DELIVERY: 'Ready for Delivery',
  COMPLETED: 'Completed', CANCELLED: 'Cancelled', DISPUTED: 'Disputed',
};

export function FixerJobDetailScreen({ route, navigation }: any) {
  const { jobId } = route.params;
  const [job, setJob] = useState<JobDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  const fetchJob = async () => {
    try {
      const { data } = await api.get(`/jobs/${jobId}`);
      setJob(data.data || data);
    } catch {} finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchJob(); }, [jobId]);

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

  if (loading || !job) {
    return <View style={styles.center}><ActivityIndicator size="large" color={Colors.accent} /></View>;
  }

  const transition = STATUS_FLOW[job.status];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Status Card */}
      <View style={styles.statusCard}>
        <Text style={styles.statusLabel}>{STATUS_LABELS[job.status] || job.status}</Text>
        <Text style={styles.amount}>₹{Number(job.quote.amount).toLocaleString('en-IN')}</Text>
      </View>

      {/* Next Action */}
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
        <Text style={styles.infoText}>{job.request.category.name}{job.request.brand ? ` · ${job.request.brand.name}` : ''}</Text>
        {job.request.deviceModel && <Text style={styles.subText}>{job.request.deviceModel}</Text>}
      </View>

      {/* Problem */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Problem</Text>
        <Text style={styles.description}>{job.request.description}</Text>
      </View>

      {/* Address — shown only after assignment */}
      {job.request.addressSnapshot && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Service Address</Text>
          <Text style={styles.infoText}>
            📍 {job.request.addressSnapshot.houseBuilding || ''}, {job.request.addressSnapshot.area || ''}, {job.request.addressSnapshot.city} - {job.request.addressSnapshot.pincode}
          </Text>
        </View>
      )}

      {/* Quote Details */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quote Details</Text>
        {job.quote.diagnosisNotes && <Text style={styles.subText}>{job.quote.diagnosisNotes}</Text>}
        <Text style={styles.subText}>Warranty: {job.quote.warrantyDays} days</Text>
      </View>

      {/* Status Timeline */}
      {job.statusHistory?.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Timeline</Text>
          {job.statusHistory.map((h, i) => (
            <View key={i} style={styles.timelineItem}>
              <View style={styles.timelineDot} />
              <View style={styles.timelineContent}>
                <Text style={styles.timelineStatus}>
                  {STATUS_LABELS[h.toStatus] || h.toStatus}
                </Text>
                <Text style={styles.timelineDate}>
                  {new Date(h.createdAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </Text>
                {h.notes && <Text style={styles.timelineNotes}>{h.notes}</Text>}
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
  content: { padding: Spacing.xl, paddingBottom: Spacing.xxxl, gap: Spacing.lg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  statusCard: {
    backgroundColor: Colors.primary, borderRadius: BorderRadius.lg, padding: Spacing.xl,
    alignItems: 'center',
  },
  statusLabel: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.white },
  amount: { fontSize: FontSize.xxl, fontWeight: FontWeight.bold, color: Colors.accentLight, marginTop: Spacing.sm },

  section: {
    backgroundColor: Colors.card, borderRadius: BorderRadius.lg, padding: Spacing.base,
    borderWidth: 1, borderColor: Colors.borderLight,
  },
  sectionTitle: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold, color: Colors.text, marginBottom: Spacing.sm },
  infoText: { fontSize: FontSize.base, color: Colors.text },
  subText: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: 4 },
  description: { fontSize: FontSize.base, color: Colors.textSecondary, lineHeight: 22 },

  timelineItem: { flexDirection: 'row', marginBottom: Spacing.md },
  timelineDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.accent, marginTop: 5, marginRight: Spacing.md },
  timelineContent: { flex: 1 },
  timelineStatus: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold, color: Colors.text },
  timelineDate: { fontSize: FontSize.xs, color: Colors.muted, marginTop: 2 },
  timelineNotes: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 2, fontStyle: 'italic' },
});
