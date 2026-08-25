import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Button } from '../../components/ui';
import { Colors, FontSize, FontWeight, Spacing, BorderRadius } from '../../theme/tokens';
import { useAuthStore } from '../../stores/auth.store';
import { api } from '../../services/api';

interface FixerData {
  id: string;
  ownerName: string;
  companyName: string;
  gstin?: string | null;
  description?: string | null;
  experienceYears: number;
  emergencyService: boolean;
  verificationStatus: string;
  averageRating: number;
  totalReviews: number;
  completedJobs: number;
  addressLine?: string;
  city?: string;
  state?: string;
  pincode?: string;
}

export function FixerMainProfileScreen({ navigation }: any) {
  const { user, logout } = useAuthStore();
  const [profile, setProfile] = useState<FixerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchProfile = useCallback(async () => {
    try {
      const { data } = await api.get('/fixers/me');
      const p = data?.data?.profile || data?.data;
      if (p) setProfile(p);
    } catch (err) {
      console.error('[Fetch Fixer Profile Error]', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchProfile();
    }, [fetchProfile]),
  );

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: () => logout() },
    ]);
  };

  const isVerified = profile?.verificationStatus === 'VERIFIED';

  if (loading && !profile) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.accent} />
      </View>
    );
  }

  const menuItems = [
    {
      icon: '🏢',
      title: 'Edit Business Profile',
      subtitle: 'Company name, owner name, experience & bio',
      onPress: () => navigation.navigate('EditProfile'),
    },
    {
      icon: '🛠️',
      title: 'Manage Services & Skills',
      subtitle: 'Device repair categories and specializations',
      onPress: () => navigation.navigate('ManageServices'),
    },
    {
      icon: '🗺️',
      title: 'Service Areas & Pincodes',
      subtitle: 'Operating locations and coverage distance',
      onPress: () => navigation.navigate('ManageAreas'),
    },
    {
      icon: '📋',
      title: 'Business Registration & KYC',
      subtitle: 'GSTIN, PAN number and verification documents',
      onPress: () => navigation.navigate('Registration'),
    },
  ];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchProfile(); }} />}
    >
      {/* Profile Header */}
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {profile?.companyName?.charAt(0).toUpperCase() || profile?.ownerName?.charAt(0).toUpperCase() || '🔧'}
          </Text>
        </View>

        <Text style={styles.companyName}>{profile?.companyName || 'Technician Business'}</Text>
        <Text style={styles.ownerName}>Proprietor: {profile?.ownerName || 'Verified Fixer'}</Text>

        <View style={styles.badgeRow}>
          <View style={[styles.statusBadge, { backgroundColor: isVerified ? '#DCFCE7' : '#FEF3C7' }]}>
            <Text style={[styles.statusBadgeText, { color: isVerified ? '#16A34A' : '#D97706' }]}>
              {isVerified ? '✅ VERIFIED PRO' : '⏳ PENDING REVIEW'}
            </Text>
          </View>

          {profile?.emergencyService ? (
            <View style={styles.emergencyBadge}>
              <Text style={styles.emergencyBadgeText}>⚡ 24/7 Emergency</Text>
            </View>
          ) : null}
        </View>

        <Text style={styles.contactText}>📧 {user?.email || ''} · 📱 {user?.phone || profile?.pincode || ''}</Text>
      </View>

      {/* Stats Row */}
      <View style={styles.statsCard}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>⭐ {Number(profile?.averageRating || 5.0).toFixed(1)}</Text>
          <Text style={styles.statLabel}>{profile?.totalReviews || 0} Reviews</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>🔧 {profile?.completedJobs || 0}</Text>
          <Text style={styles.statLabel}>Completed Jobs</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>📅 {profile?.experienceYears || 1}+ yrs</Text>
          <Text style={styles.statLabel}>Experience</Text>
        </View>
      </View>

      {/* Location Banner */}
      <View style={styles.locationCard}>
        <Text style={styles.locationTitle}>📍 Primary Workshop Location</Text>
        <Text style={styles.locationAddress}>
          {profile?.addressLine || 'Shop 1, Main Road'}, {profile?.city || 'Bengaluru'}, {profile?.state || 'Karnataka'} - {profile?.pincode || '560001'}
        </Text>
      </View>

      {/* Navigation Menu */}
      <View style={styles.menuContainer}>
        {menuItems.map((item, idx) => (
          <TouchableOpacity
            key={idx}
            style={styles.menuItem}
            activeOpacity={0.7}
            onPress={item.onPress}
          >
            <Text style={styles.menuIcon}>{item.icon}</Text>
            <View style={styles.menuInfo}>
              <Text style={styles.menuTitle}>{item.title}</Text>
              <Text style={styles.menuSubtitle}>{item.subtitle}</Text>
            </View>
            <Text style={styles.menuArrow}>›</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Sign Out Button */}
      <View style={styles.logoutSection}>
        <Button
          title="Sign Out of Fix Me Pro"
          onPress={handleLogout}
          variant="outline"
          size="md"
        />
        <Text style={styles.versionText}>Fix Me Pro Technician App v1.0.0</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { paddingBottom: Spacing.xxxl },
  header: {
    backgroundColor: Colors.primary,
    alignItems: 'center',
    paddingTop: Spacing.xxxl + 20,
    paddingBottom: Spacing.xl,
    paddingHorizontal: Spacing.xl,
    borderBottomLeftRadius: BorderRadius.xl,
    borderBottomRightRadius: BorderRadius.xl,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.sm,
    borderWidth: 3,
    borderColor: Colors.accent,
  },
  avatarText: { fontSize: 32, fontWeight: FontWeight.bold, color: Colors.accent },
  companyName: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: Colors.white, textAlign: 'center' },
  ownerName: { fontSize: FontSize.sm, color: '#D0D7DE', marginTop: 2, textAlign: 'center' },
  badgeRow: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.sm },
  statusBadge: { paddingHorizontal: Spacing.sm, paddingVertical: 4, borderRadius: BorderRadius.full },
  statusBadgeText: { fontSize: 11, fontWeight: FontWeight.bold },
  emergencyBadge: {
    backgroundColor: '#FEF08A',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  emergencyBadgeText: { fontSize: 11, fontWeight: FontWeight.bold, color: '#854D0E' },
  contactText: { fontSize: FontSize.xs, color: '#CBD5E1', marginTop: Spacing.sm },

  statsCard: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    marginHorizontal: Spacing.base,
    marginTop: -Spacing.lg,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: FontSize.base, fontWeight: FontWeight.bold, color: Colors.text },
  statLabel: { fontSize: FontSize.xs, color: Colors.muted, marginTop: 2 },
  statDivider: { width: 1, backgroundColor: Colors.borderLight, height: '70%', alignSelf: 'center' },

  locationCard: {
    backgroundColor: Colors.white,
    marginHorizontal: Spacing.base,
    marginTop: Spacing.md,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  locationTitle: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, color: Colors.text, marginBottom: 2 },
  locationAddress: { fontSize: FontSize.xs, color: Colors.textSecondary, lineHeight: 18 },

  menuContainer: {
    backgroundColor: Colors.white,
    marginHorizontal: Spacing.base,
    marginTop: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.base,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  menuIcon: { fontSize: 24, marginRight: Spacing.md },
  menuInfo: { flex: 1 },
  menuTitle: { fontSize: FontSize.base, fontWeight: FontWeight.semibold, color: Colors.text },
  menuSubtitle: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 2 },
  menuArrow: { fontSize: FontSize.lg, color: Colors.muted },

  logoutSection: {
    paddingHorizontal: Spacing.xl,
    marginTop: Spacing.xl,
    gap: Spacing.sm,
    alignItems: 'center',
  },
  versionText: { fontSize: FontSize.xs, color: Colors.muted },
});
