import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, ActivityIndicator, Alert,
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
    description: string;
    deviceModel: string | null;
    category: { name: string };
    brand: { name: string } | null;
  };
  fixer: { companyName: string; ownerName: string; averageRating: number };
  quote: { amount: number; warrantyDays: number };
  statusHistory: Array<{ toStatus: string; createdAt: string }>;
  createdAt: string;
}

const STATUS_LABELS: Record<string, { label: string; icon: string }> = {
  ASSIGNED: { label: 'Fixer Assigned', icon: '📋' },
  FIXER_ON_THE_WAY: { label: 'Fixer On the Way', icon: '🚗' },
  DEVICE_RECEIVED: { label: 'Device Received', icon: '📦' },
  DIAGNOSING: { label: 'Diagnosing Issue', icon: '🔍' },
  REPAIR_IN_PROGRESS: { label: 'Repair In Progress', icon: '🔧' },
  READY_FOR_DELIVERY: { label: 'Ready for Delivery', icon: '✅' },
  COMPLETED: { label: 'Completed', icon: '🎉' },
  CANCELLED: { label: 'Cancelled', icon: '❌' },
};

export function CustomerJobDetailScreen({ route, navigation }: any) {
  const { jobId } = route.params;
  const [job, setJob] = useState<JobDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/jobs/${jobId}`).then(({ data }) => {
      setJob(data.data || data);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [jobId]);

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
  const canReview = job.status === 'COMPLETED';

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
            <Text style={styles.fixerAvatarText}>{job.fixer.companyName.charAt(0)}</Text>
          </View>
          <View>
            <Text style={styles.fixerName}>{job.fixer.companyName}</Text>
            <Text style={styles.fixerSub}>{job.fixer.ownerName} · ★ {Number(job.fixer.averageRating).toFixed(1)}</Text>
          </View>
        </View>
      </View>

      {/* Device */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Device</Text>
        <Text style={styles.infoText}>{job.request.category.name}{job.request.brand ? ` · ${job.request.brand.name}` : ''}</Text>
        {job.request.deviceModel && <Text style={styles.subText}>{job.request.deviceModel}</Text>}
      </View>

      {/* Problem */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Problem</Text>
        <Text style={styles.desc}>{job.request.description}</Text>
      </View>

      {/* Payment */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Payment</Text>
        <View style={styles.payRow}>
          <Text style={styles.payLabel}>Quote Amount</Text>
          <Text style={styles.payAmount}>₹{Number(job.quote.amount).toLocaleString('en-IN')}</Text>
        </View>
        <View style={styles.payRow}>
          <Text style={styles.payLabel}>Warranty</Text>
          <Text style={styles.payValue}>{job.quote.warrantyDays} days</Text>
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
        {canReview && (
          <Button title="⭐ Write a Review" onPress={() => Alert.alert('Coming Soon', 'Review screen coming soon!')} size="lg" />
        )}
        {canCancel && (
          <Button title="Cancel Job" onPress={handleCancel} variant="danger" size="md" />
        )}
      </View>
    </ScrollView>
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
});
