import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { Button, Input } from '../../components/ui';
import { Colors, FontSize, FontWeight, Spacing, BorderRadius } from '../../theme/tokens';
import { useAuthStore } from '../../stores/auth.store';
import { api } from '../../services/api';

export function EditProfileScreen({ navigation }: any) {
  const { user, setUser } = useAuthStore();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const { data } = await api.get('/customers/me');
        const cust = data?.data?.customer || data?.data || {};
        const u = data?.data?.user || user || {};
        setFirstName(cust.firstName || '');
        setLastName(cust.lastName || '');
        setEmail(u.email || user?.email || '');
        setPhone(u.mobile || user?.phone || '');
      } catch {
        setEmail(user?.email || '');
        setPhone(user?.phone || '');
      } finally {
        setInitialLoading(false);
      }
    };
    loadProfile();
  }, []);

  const handleSave = async () => {
    if (!firstName.trim()) {
      Alert.alert('Required', 'Please enter your first name.');
      return;
    }

    setLoading(true);
    try {
      await api.patch('/customers/me', {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
      });

      if (user) {
        setUser({
          ...user,
          phone: phone || user.phone,
        });
      }

      Alert.alert('Success', 'Profile updated successfully!', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (err: any) {
      console.error('[Update Profile Error]', err?.response?.data || err);
      const msg = err?.response?.data?.error?.message || err?.response?.data?.message || 'Failed to update profile';
      Alert.alert('Error', msg);
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return (
      <View style={styles.center}>
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.avatarSection}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {firstName.charAt(0).toUpperCase() || email.charAt(0).toUpperCase() || '👤'}
            </Text>
          </View>
          <Text style={styles.avatarSub}>{email}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Personal Information</Text>

          <View style={styles.row}>
            <Input
              label="First Name *"
              value={firstName}
              onChangeText={setFirstName}
              containerStyle={styles.half}
              placeholder="First name"
            />
            <Input
              label="Last Name"
              value={lastName}
              onChangeText={setLastName}
              containerStyle={styles.half}
              placeholder="Last name"
            />
          </View>

          <Input
            label="Email Address"
            value={email}
            editable={false}
            containerStyle={styles.disabledInput}
          />

          <Input
            label="Mobile Number"
            value={phone}
            editable={false}
            containerStyle={styles.disabledInput}
          />
        </View>

        <View style={styles.buttonSection}>
          <Button
            title="Save Changes"
            onPress={handleSave}
            loading={loading}
            size="lg"
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.bg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { fontSize: FontSize.sm, color: Colors.muted },
  container: { padding: Spacing.xl, paddingBottom: Spacing.xxxl },
  avatarSection: { alignItems: 'center', marginBottom: Spacing.xl },
  avatar: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: Colors.accentSoft,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.sm,
    borderWidth: 2,
    borderColor: Colors.accent,
  },
  avatarText: { fontSize: FontSize.xxl, fontWeight: FontWeight.bold, color: Colors.accent },
  avatarSub: { fontSize: FontSize.sm, color: Colors.textSecondary },
  card: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    gap: Spacing.sm,
  },
  cardTitle: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.bold,
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  row: { flexDirection: 'row', gap: Spacing.md },
  half: { flex: 1 },
  disabledInput: { opacity: 0.7 },
  buttonSection: { marginTop: Spacing.xl },
});
