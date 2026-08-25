import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { Button, Input } from '../../components/ui';
import { Colors, FontSize, FontWeight, Spacing, BorderRadius } from '../../theme/tokens';
import { api } from '../../services/api';

interface FixerMember {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  profilePhotoKey?: string | null;
  isActive: boolean;
  createdAt: string;
}

export function FixerManageMembersScreen({ navigation }: any) {
  const [members, setMembers] = useState<FixerMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Add Member Modal
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [savingMember, setSavingMember] = useState(false);
  const [newMember, setNewMember] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    photo: '' as string,
  });

  // Password Reset Modal
  const [resetModalVisible, setResetModalVisible] = useState(false);
  const [selectedMember, setSelectedMember] = useState<FixerMember | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [resetting, setResetting] = useState(false);

  const fetchMembers = useCallback(async () => {
    try {
      const { data } = await api.get('/fixers/me/members');
      setMembers(data?.data || data || []);
    } catch (err) {
      console.error('[Fetch Members Error]', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchMembers();
    }, [fetchMembers]),
  );

  const handlePickMemberPhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Please grant photo gallery permission to attach a technician photo.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
      base64: true,
    });
    if (!result.canceled && result.assets?.[0]) {
      const asset = result.assets[0];
      const photoUri = asset.base64
        ? `data:image/jpeg;base64,${asset.base64}`
        : asset.uri;
      setNewMember((prev) => ({ ...prev, photo: photoUri }));
    }
  };

  const handleTakeMemberPhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Please grant camera permission to take a technician photo.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
      base64: true,
    });
    if (!result.canceled && result.assets?.[0]) {
      const asset = result.assets[0];
      const photoUri = asset.base64
        ? `data:image/jpeg;base64,${asset.base64}`
        : asset.uri;
      setNewMember((prev) => ({ ...prev, photo: photoUri }));
    }
  };

  const handleAddMember = async () => {
    if (!newMember.fullName.trim() || !newMember.email.trim() || !newMember.phone.trim() || !newMember.password) {
      Alert.alert('Required Fields', 'Please fill in full name, email, phone number, and initial password.');
      return;
    }
    if (newMember.password.length < 6) {
      Alert.alert('Password Too Short', 'Password must be at least 6 characters.');
      return;
    }

    setSavingMember(true);
    try {
      await api.post('/fixers/me/members', {
        fullName: newMember.fullName.trim(),
        email: newMember.email.trim().toLowerCase(),
        phone: newMember.phone.trim(),
        password: newMember.password,
        profilePhotoKey: newMember.photo || undefined,
      });
      Alert.alert('Technician Added! 🎉', `${newMember.fullName} can now log in using the Staff Login with this email and password.`);
      setAddModalVisible(false);
      setNewMember({ fullName: '', email: '', phone: '', password: '', photo: '' });
      fetchMembers();
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message || 'Failed to add technician');
    } finally {
      setSavingMember(false);
    }
  };

  const handleDeleteMember = (member: FixerMember) => {
    Alert.alert(
      'Remove Technician',
      `Are you sure you want to remove ${member.fullName} from your workshop team? This will delete their staff login.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/fixers/me/members/${member.id}`);
              Alert.alert('Removed', 'Technician removed from team.');
              fetchMembers();
            } catch (err: any) {
              Alert.alert('Error', err?.response?.data?.message || 'Failed to remove member');
            }
          },
        },
      ],
    );
  };

  const handleResetPassword = async () => {
    if (!selectedMember || !newPassword || newPassword.length < 6) {
      Alert.alert('Invalid Password', 'Please enter a password with at least 6 characters.');
      return;
    }

    setResetting(true);
    try {
      await api.patch(`/fixers/me/members/${selectedMember.id}/password`, {
        password: newPassword,
      });
      Alert.alert('Password Updated', `Password for ${selectedMember.fullName} has been updated.`);
      setResetModalVisible(false);
      setSelectedMember(null);
      setNewPassword('');
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message || 'Failed to reset password');
    } finally {
      setResetting(false);
    }
  };

  const renderMember = ({ item }: { item: FixerMember }) => (
    <View style={styles.memberCard}>
      <View style={styles.memberHeaderRow}>
        {item.profilePhotoKey ? (
          <Image source={{ uri: item.profilePhotoKey }} style={styles.avatarImage} resizeMode="cover" />
        ) : (
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{item.fullName.charAt(0).toUpperCase()}</Text>
          </View>
        )}
        <View style={styles.memberInfo}>
          <Text style={styles.memberName}>{item.fullName}</Text>
          <Text style={styles.memberContact}>📧 {item.email}</Text>
          <Text style={styles.memberContact}>📱 {item.phone}</Text>
        </View>
        <View style={styles.activeBadge}>
          <Text style={styles.activeBadgeText}>ACTIVE</Text>
        </View>
      </View>

      <View style={styles.memberActionsRow}>
        <TouchableOpacity
          style={styles.resetPassBtn}
          onPress={() => {
            setSelectedMember(item);
            setNewPassword('');
            setResetModalVisible(true);
          }}
        >
          <Text style={styles.resetPassBtnText}>🔑 Reset Password</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.deleteBtn}
          onPress={() => handleDeleteMember(item)}
        >
          <Text style={styles.deleteBtnText}>✕ Remove</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.flex}>
      {/* Top Banner */}
      <View style={styles.topBanner}>
        <View>
          <Text style={styles.bannerTitle}>Workshop Team ({members.length})</Text>
          <Text style={styles.bannerSubtitle}>Manage staff technicians & job assignment access</Text>
        </View>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => setAddModalVisible(true)}
        >
          <Text style={styles.addBtnText}>+ Add Member</Text>
        </TouchableOpacity>
      </View>

      {loading && members.length === 0 ? (
        <View style={styles.center}><ActivityIndicator size="large" color={Colors.accent} /></View>
      ) : (
        <FlatList
          data={members}
          keyExtractor={(item) => item.id}
          renderItem={renderMember}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchMembers(); }} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>👥</Text>
              <Text style={styles.emptyTitle}>No staff members added yet</Text>
              <Text style={styles.emptySubtitle}>
                Add your workshop technicians here. You can assign customer repair jobs to them, and they can log in via Staff Login to manage repairs.
              </Text>
              <TouchableOpacity
                style={styles.emptyActionBtn}
                onPress={() => setAddModalVisible(true)}
              >
                <Text style={styles.emptyActionText}>+ Add First Technician</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}

      {/* Add Member Modal */}
      <Modal
        visible={addModalVisible}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setAddModalVisible(false)}
      >
        <SafeAreaView style={styles.modalSafeArea}>
          <KeyboardAvoidingView
            style={styles.flex}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Workshop Technician</Text>
              <TouchableOpacity onPress={() => setAddModalVisible(false)}>
                <Text style={styles.modalCloseText}>✕ Cancel</Text>
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.modalContent} keyboardShouldPersistTaps="handled">
              <Text style={styles.modalSubtitle}>
                Create staff credentials for your technician. They will use this email and password to log in.
              </Text>

              {/* Photo Upload Section (Optional) */}
              <View style={styles.photoPickerSection}>
                <Text style={styles.photoSectionLabel}>Technician Photo (Optional)</Text>
                <View style={styles.photoPickerRow}>
                  {newMember.photo ? (
                    <View style={styles.previewContainer}>
                      <Image source={{ uri: newMember.photo }} style={styles.photoPreview} />
                      <TouchableOpacity
                        style={styles.removePhotoBtn}
                        onPress={() => setNewMember((p) => ({ ...p, photo: '' }))}
                      >
                        <Text style={styles.removePhotoText}>✕</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <View style={styles.photoPlaceholder}>
                      <Text style={styles.placeholderIcon}>👤</Text>
                    </View>
                  )}

                  <View style={styles.photoActionButtons}>
                    <TouchableOpacity style={styles.uploadPhotoBtn} onPress={handlePickMemberPhoto}>
                      <Text style={styles.uploadPhotoText}>📁 Choose from Gallery</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.uploadCameraBtn} onPress={handleTakeMemberPhoto}>
                      <Text style={styles.uploadCameraText}>📸 Take Photo</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>

              <Input
                label="Technician Full Name *"
                value={newMember.fullName}
                onChangeText={(v) => setNewMember((p) => ({ ...p, fullName: v }))}
                placeholder="e.g. Ramesh Kumar"
              />

              <Input
                label="Email Address (Login Username) *"
                value={newMember.email}
                onChangeText={(v) => setNewMember((p) => ({ ...p, email: v }))}
                placeholder="ramesh@workshop.com"
                keyboardType="email-address"
                autoCapitalize="none"
              />

              <Input
                label="Phone Number *"
                value={newMember.phone}
                onChangeText={(v) => setNewMember((p) => ({ ...p, phone: v }))}
                placeholder="9876543210"
                keyboardType="phone-pad"
              />

              <Input
                label="Initial Login Password *"
                value={newMember.password}
                onChangeText={(v) => setNewMember((p) => ({ ...p, password: v }))}
                placeholder="Minimum 6 characters"
                secureTextEntry
              />

              <View style={styles.modalBtnSection}>
                <Button
                  title="Create Technician Account"
                  onPress={handleAddMember}
                  loading={savingMember}
                  size="lg"
                />
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>

      {/* Reset Password Modal */}
      <Modal
        visible={resetModalVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setResetModalVisible(false)}
      >
        <View style={styles.backdrop}>
          <View style={styles.popupCard}>
            <Text style={styles.popupTitle}>🔑 Reset Staff Password</Text>
            <Text style={styles.popupSubtitle}>
              Set a new login password for {selectedMember?.fullName}:
            </Text>

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
                onPress={() => setResetModalVisible(false)}
              >
                <Text style={styles.popupCancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.popupSaveBtn}
                onPress={handleResetPassword}
                disabled={resetting}
              >
                {resetting ? (
                  <ActivityIndicator size="small" color={Colors.white} />
                ) : (
                  <Text style={styles.popupSaveText}>Save Password</Text>
                )}
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
  topBanner: {
    backgroundColor: Colors.white,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  bannerTitle: { fontSize: FontSize.base, fontWeight: FontWeight.bold, color: Colors.text },
  bannerSubtitle: { fontSize: FontSize.xs, color: Colors.muted, marginTop: 2 },
  addBtn: {
    backgroundColor: Colors.accent,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  addBtnText: { color: Colors.white, fontSize: FontSize.xs, fontWeight: FontWeight.bold },

  list: { padding: Spacing.base, paddingBottom: Spacing.xxxl },
  memberCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  memberHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.accentSoft,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.accent,
  },
  avatarImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: Spacing.md,
    backgroundColor: '#E5E7EB',
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  avatarText: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.accent },
  memberInfo: { flex: 1 },
  memberName: { fontSize: FontSize.base, fontWeight: FontWeight.bold, color: Colors.text },
  memberContact: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 2 },
  activeBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
  },
  activeBadgeText: { fontSize: 10, fontWeight: FontWeight.bold, color: '#16A34A' },

  memberActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
    paddingTop: Spacing.sm,
    gap: Spacing.sm,
  },
  resetPassBtn: {
    flex: 1.2,
    backgroundColor: '#F3F4F6',
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  resetPassBtnText: { fontSize: FontSize.xs, fontWeight: FontWeight.semibold, color: Colors.text },
  deleteBtn: {
    flex: 0.8,
    backgroundColor: '#FEF2F2',
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  deleteBtnText: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, color: '#DC2626' },

  empty: { alignItems: 'center', paddingTop: Spacing.xxl, paddingHorizontal: Spacing.xl },
  emptyIcon: { fontSize: 52, marginBottom: Spacing.md },
  emptyTitle: { fontSize: FontSize.md, fontWeight: FontWeight.bold, color: Colors.text },
  emptySubtitle: { fontSize: FontSize.xs, color: Colors.muted, textAlign: 'center', marginTop: 4, lineHeight: 18 },
  emptyActionBtn: {
    marginTop: Spacing.lg,
    backgroundColor: Colors.accent,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm + 2,
    borderRadius: BorderRadius.md,
  },
  emptyActionText: { color: Colors.white, fontSize: FontSize.sm, fontWeight: FontWeight.bold },

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

  photoPickerSection: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    marginBottom: Spacing.xs,
  },
  photoSectionLabel: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  photoPickerRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  previewContainer: { position: 'relative' },
  photoPreview: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#E5E7EB',
    borderWidth: 2,
    borderColor: Colors.accent,
  },
  removePhotoBtn: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#DC2626',
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removePhotoText: { color: Colors.white, fontSize: 10, fontWeight: FontWeight.bold },
  photoPlaceholder: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderIcon: { fontSize: 24, color: Colors.muted },
  photoActionButtons: { flex: 1, gap: 6 },
  uploadPhotoBtn: {
    backgroundColor: Colors.accentSoft,
    paddingVertical: 6,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.sm,
    alignItems: 'center',
  },
  uploadPhotoText: { color: Colors.accent, fontSize: FontSize.xs, fontWeight: FontWeight.bold },
  uploadCameraBtn: {
    backgroundColor: '#F3F4F6',
    paddingVertical: 6,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.sm,
    alignItems: 'center',
  },
  uploadCameraText: { color: Colors.text, fontSize: FontSize.xs, fontWeight: FontWeight.semibold },

  modalBtnSection: { marginTop: Spacing.md },

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
});
