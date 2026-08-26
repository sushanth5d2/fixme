import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Button } from '../../components/ui';
import { Colors, FontSize, FontWeight, Spacing, BorderRadius } from '../../theme/tokens';
import { useAuthStore } from '../../stores/auth.store';

export function FixerUnderReviewScreen({ navigation }: any) {
  const { fixerProfile, refreshProfile, logout, user } = useAuthStore();
  const [checking, setChecking] = useState(false);

  const handleCheckStatus = async () => {
    setChecking(true);
    try {
      await refreshProfile();
      const current = useAuthStore.getState().fixerProfile;
      if (current?.verificationStatus === 'VERIFIED') {
        Alert.alert('🎉 Account Verified!', 'Your workshop account is approved. Welcome to Fix Me Pro!');
      } else if (current?.verificationStatus === 'REJECTED') {
        Alert.alert('Application Status', 'Your application requires revision or was rejected. Please edit your business profile and re-submit.');
      } else {
        Alert.alert('Under Review ⏳', 'Your application is still being reviewed by our admin verification team. Please check back shortly!');
      }
    } catch {
      Alert.alert('Error', 'Could not refresh status. Please try again.');
    } finally {
      setChecking(false);
    }
  };

  const isRejected = fixerProfile?.verificationStatus === 'REJECTED';

  return (
    <ScrollView style={styles.flex} contentContainerStyle={styles.container}>
      {/* Icon & Banner */}
      <View style={styles.iconContainer}>
        <Text style={styles.icon}>{isRejected ? '⚠️' : '⏳'}</Text>
      </View>

      <Text style={styles.title}>
        {isRejected ? 'Application Needs Revision' : 'Application Under Review'}
      </Text>

      <Text style={styles.subtitle}>
        {isRejected
          ? 'Our verification team could not approve your account with the current details. Please update your business profile & KYC and re-submit.'
          : 'Thank you for registering with Fix Me Pro! Your business profile & KYC details have been submitted to our admin verification team.'}
      </Text>

      {/* Review Status Card */}
      <View style={[styles.statusCard, isRejected ? styles.statusCardRejected : styles.statusCardPending]}>
        <View style={styles.statusRow}>
          <Text style={styles.statusBadge}>
            {isRejected ? '❌ REJECTED / NEEDS REVISION' : '⏳ ADMIN VERIFICATION PENDING'}
          </Text>
        </View>
        <Text style={styles.statusNote}>
          {isRejected
            ? 'Please review your GSTIN, PAN, and address details below, make necessary edits, and re-submit.'
            : 'Admin verification typically takes 2–4 hours. Once verified, you will immediately receive incoming customer repair requests and map leads.'}
        </Text>
      </View>

      {/* Submitted Details Summary Card */}
      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>📋 Submitted Business Details</Text>

        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Company Name:</Text>
          <Text style={styles.summaryValue}>{fixerProfile?.companyName || '—'}</Text>
        </View>

        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Owner / Contact:</Text>
          <Text style={styles.summaryValue}>{fixerProfile?.ownerName || (user as any)?.firstName || '—'}</Text>
        </View>

        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>GSTIN:</Text>
          <Text style={styles.summaryValue}>{fixerProfile?.gstin || 'Not Provided'}</Text>
        </View>

        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>PAN Number:</Text>
          <Text style={styles.summaryValue}>{fixerProfile?.panNumber || 'Not Provided'}</Text>
        </View>

        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Workshop Location:</Text>
          <Text style={styles.summaryValue}>
            {[fixerProfile?.city, fixerProfile?.state, fixerProfile?.pincode].filter(Boolean).join(', ') || '—'}
          </Text>
        </View>
      </View>

      {/* Action Buttons */}
      <View style={styles.actions}>
        <Button
          title="🔄 Check Verification Status"
          onPress={handleCheckStatus}
          loading={checking}
          size="lg"
        />

        <TouchableOpacity
          style={styles.editBtn}
          onPress={() => navigation.navigate('EditProfile')}
        >
          <Text style={styles.editBtnText}>✏️ Edit Business Profile & KYC</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.logoutBtn}
          onPress={logout}
        >
          <Text style={styles.logoutBtnText}>Sign Out</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.bg },
  container: {
    padding: Spacing.xl,
    paddingTop: Spacing.xxxl,
    paddingBottom: Spacing.xxxl,
    alignItems: 'center',
  },

  iconContainer: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#FEF3C7',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  icon: { fontSize: 44 },

  title: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.text,
    textAlign: 'center',
    marginBottom: Spacing.xs,
  },
  subtitle: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: Spacing.lg,
    paddingHorizontal: Spacing.md,
  },

  statusCard: {
    width: '100%',
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    marginBottom: Spacing.lg,
    borderWidth: 1,
  },
  statusCardPending: { backgroundColor: '#FFFBEB', borderColor: '#FDE68A' },
  statusCardRejected: { backgroundColor: '#FEF2F2', borderColor: '#FECACA' },
  statusRow: { marginBottom: Spacing.xs },
  statusBadge: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, color: '#92400E' },
  statusNote: { fontSize: FontSize.xs, color: Colors.text, lineHeight: 18 },

  summaryCard: {
    width: '100%',
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    marginBottom: Spacing.xl,
  },
  summaryTitle: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.text, marginBottom: 2 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 2 },
  summaryLabel: { fontSize: FontSize.xs, color: Colors.muted },
  summaryValue: { fontSize: FontSize.xs, fontWeight: FontWeight.semibold, color: Colors.text, maxWidth: '60%', textAlign: 'right' },

  actions: { width: '100%', gap: Spacing.md },
  editBtn: {
    backgroundColor: '#EEF2FF',
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  editBtnText: { color: Colors.accent, fontSize: FontSize.sm, fontWeight: FontWeight.bold },
  logoutBtn: {
    paddingVertical: Spacing.sm,
    alignItems: 'center',
  },
  logoutBtnText: { color: Colors.muted, fontSize: FontSize.sm, fontWeight: FontWeight.semibold },
});

