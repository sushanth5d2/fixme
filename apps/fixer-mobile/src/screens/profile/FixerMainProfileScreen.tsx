import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Modal,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Button, Input } from '../../components/ui';
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
  fullName?: string;
  phone?: string;
  email?: string;
  profilePhotoKey?: string | null;
  workshopPhotos?: string[];
  fixer?: any;
}

export function FixerMainProfileScreen({ navigation }: any) {
  const { user, logout } = useAuthStore();
  const isMember = user?.role === 'FIXER_MEMBER';
  const [profile, setProfile] = useState<FixerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Change Password for Staff
  const [passwordModalVisible, setPasswordModalVisible] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  // Photo Preview Modal
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);

  const fetchProfile = useCallback(async () => {
    try {
      if (isMember) {
        const { data } = await api.get('/fixers/me/member-profile');
        const p = data?.data || data;
        if (p) setProfile(p);
      } else {
        const { data } = await api.get('/fixers/me');
        const p = data?.data?.profile || data?.data;
        if (p) setProfile(p);
      }
    } catch (err) {
      console.error('[Fetch Fixer Profile Error]', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isMember]);

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

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || newPassword.length < 6) {
      Alert.alert('Invalid Password', 'Please enter your current password and a new password (min 6 characters).');
      return;
    }
    setSavingPassword(true);
    try {
      await api.post('/auth/password/change', { currentPassword, newPassword });
      Alert.alert('Password Changed! 🎉', 'Your login password has been updated.');
      setPasswordModalVisible(false);
      setCurrentPassword('');
      setNewPassword('');
    } catch (err: any) {
      console.error('[Change Password Error]', err?.response?.data || err);
      const msg = err?.response?.data?.error?.message || err?.response?.data?.message || err?.message || 'Current password is incorrect';
      Alert.alert('Password Change Failed', msg);
    } finally {
      setSavingPassword(false);
    }
  };

  const isVerified = profile?.verificationStatus === 'VERIFIED';

  if (loading && !profile) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.accent} />
      </View>
    );
  }

  const ownerMenuItems = [
    {
      icon: '🏢',
      title: 'Business Profile & KYC',
      subtitle: 'Edit workshop name, address, GSTIN & PAN',
      onPress: () => navigation.navigate('EditProfile'),
    },
    {
      icon: '👥',
      title: 'Manage Staff & Technicians',
      subtitle: 'Add, view or remove team members',
      onPress: () => navigation.navigate('ManageMembers'),
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
      icon: '🔔',
      title: 'Notifications',
      subtitle: 'View recent job, quote, and dispute alerts',
      onPress: () => navigation.navigate('Notifications'),
    },
    {
      icon: '🔑',
      title: 'Change Password',
      subtitle: 'Update your workshop login password',
      onPress: () => setPasswordModalVisible(true),
    },
  ];

  const memberMenuItems = [
    {
      icon: '🔔',
      title: 'Notifications',
      subtitle: 'View your job assignments and updates',
      onPress: () => navigation.navigate('Notifications'),
    },
    {
      icon: '🔑',
      title: 'Change Password',
      subtitle: 'Update your staff login password',
      onPress: () => setPasswordModalVisible(true),
    },
  ];

  const menuItems = isMember ? memberMenuItems : ownerMenuItems;

  const displayName = isMember
    ? profile?.fullName || (user as any)?.fullName || 'Technician'
    : profile?.companyName || 'Technician Business';

  const subName = isMember
    ? `Workshop: ${profile?.fixer?.companyName || 'Fix Me Service'}`
    : `Proprietor: ${profile?.ownerName || 'Verified Fixer'}`;

  const photoUri = profile?.profilePhotoKey || (user as any)?.profilePhotoKey;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchProfile(); }} />}
    >
      {/* Profile Header */}
      <View style={styles.header}>
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => {
            if (photoUri) setSelectedPhoto(photoUri);
          }}
          style={styles.avatarWrapper}
        >
          {photoUri ? (
            <View style={styles.avatarContainer}>
              <Image source={{ uri: photoUri }} style={styles.avatarImage} resizeMode="cover" />
              <View style={styles.zoomBadge}>
                <Text style={styles.zoomText}>🔍 View</Text>
              </View>
            </View>
          ) : (
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {displayName.charAt(0).toUpperCase() || '🔧'}
              </Text>
            </View>
          )}
        </TouchableOpacity>

        <Text style={styles.companyName}>{displayName}</Text>
        <Text style={styles.ownerName}>{subName}</Text>

        <View style={styles.badgeRow}>
          <View style={[styles.statusBadge, { backgroundColor: isMember ? '#EDE9FE' : isVerified ? '#DCFCE7' : '#FEF3C7' }]}>
            <Text style={[styles.statusBadgeText, { color: isMember ? '#7C3AED' : isVerified ? '#16A34A' : '#D97706' }]}>
              {isMember ? '🔧 STAFF TECHNICIAN' : isVerified ? '✅ VERIFIED PRO' : '⏳ PENDING REVIEW'}
            </Text>
          </View>

          {profile?.emergencyService ? (
            <View style={styles.emergencyBadge}>
              <Text style={styles.emergencyBadgeText}>⚡ 24/7 Emergency</Text>
            </View>
          ) : null}
        </View>

        <Text style={styles.contactText}>
          📧 {profile?.email || user?.email || ''} · 📱 {profile?.phone || (user as any)?.phone || profile?.pincode || ''}
        </Text>
      </View>

      {/* Stats Row for Owner */}
      {!isMember && (
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
      )}

      {/* Location Banner */}
      {!isMember && (
        <View style={styles.locationCard}>
          <Text style={styles.locationTitle}>📍 Primary Workshop Location</Text>
          <Text style={styles.locationAddress}>
            {profile?.addressLine || 'Shop 1, Main Road'}, {profile?.city || 'Bengaluru'}, {profile?.state || 'Karnataka'} - {profile?.pincode || '560001'}
          </Text>
        </View>
      )}

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

      {/* Change Password Modal */}
      <Modal
        visible={passwordModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setPasswordModalVisible(false)}
      >
        <View style={styles.backdrop}>
          <View style={styles.popupCard}>
            <Text style={styles.popupTitle}>🔑 Change Password</Text>
            <Text style={styles.popupSubtitle}>Enter your current and new password:</Text>

            <Input
              label="Current Password"
              value={currentPassword}
              onChangeText={setCurrentPassword}
              secureTextEntry
            />

            <Input
              label="New Password"
              value={newPassword}
              onChangeText={setNewPassword}
              placeholder="Minimum 6 characters"
              secureTextEntry
            />

            <View style={styles.popupActions}>
              <TouchableOpacity
                style={styles.popupCancelBtn}
                onPress={() => setPasswordModalVisible(false)}
              >
                <Text style={styles.popupCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.popupSaveBtn}
                onPress={handleChangePassword}
                disabled={savingPassword}
              >
                {savingPassword ? (
                  <ActivityIndicator size="small" color={Colors.white} />
                ) : (
                  <Text style={styles.popupSaveText}>Update Password</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Fullscreen Photo Lightbox Modal */}
      <Modal
        visible={!!selectedPhoto}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setSelectedPhoto(null)}
      >
        <View style={styles.photoModalBackdrop}>
          <TouchableOpacity
            style={styles.closePhotoBtn}
            onPress={() => setSelectedPhoto(null)}
          >
            <Text style={styles.closePhotoText}>✕ Close</Text>
          </TouchableOpacity>
          {selectedPhoto ? (
            <Image
              source={{ uri: selectedPhoto }}
              style={styles.fullscreenPhoto}
              resizeMode="contain"
            />
          ) : null}
        </View>
      </Modal>
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
  avatarWrapper: {
    marginBottom: Spacing.sm,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatarImage: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: '#E5E7EB',
    borderWidth: 3,
    borderColor: Colors.accent,
  },
  zoomBadge: {
    position: 'absolute',
    bottom: -2,
    right: -4,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: BorderRadius.full,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: Colors.white,
  },
  zoomText: { color: Colors.white, fontSize: 10, fontWeight: FontWeight.bold },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.white,
    justifyContent: 'center',
    alignItems: 'center',
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
  popupSubtitle: { fontSize: FontSize.xs, color: Colors.muted, marginBottom: Spacing.xs },
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

  photoModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.92)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullscreenPhoto: { width: '92%', height: '82%' },
  closePhotoBtn: {
    position: 'absolute',
    top: 50,
    right: 20,
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    zIndex: 10,
  },
  closePhotoText: { color: Colors.white, fontSize: FontSize.sm, fontWeight: FontWeight.bold },
});
