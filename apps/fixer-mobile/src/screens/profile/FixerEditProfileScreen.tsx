import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Switch,
  ActivityIndicator,
} from 'react-native';
import { Button, Input } from '../../components/ui';
import { Colors, FontSize, FontWeight, Spacing, BorderRadius } from '../../theme/tokens';
import { api } from '../../services/api';

export function FixerEditProfileScreen({ navigation }: any) {
  const [form, setForm] = useState({
    companyName: '',
    ownerName: '',
    experienceYears: '1',
    description: '',
    addressLine: '',
    city: '',
    state: '',
    pincode: '',
    emergencyService: false,
    workingHoursStart: '09:00',
    workingHoursEnd: '19:00',
  });
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const { data } = await api.get('/fixers/me');
        const p = data?.data?.profile || data?.data || {};
        setForm({
          companyName: p.companyName || '',
          ownerName: p.ownerName || '',
          experienceYears: String(p.experienceYears || '1'),
          description: p.description || '',
          addressLine: p.addressLine || '',
          city: p.city || '',
          state: p.state || '',
          pincode: p.pincode || '',
          emergencyService: !!p.emergencyService,
          workingHoursStart: p.workingHoursStart || '09:00',
          workingHoursEnd: p.workingHoursEnd || '19:00',
        });
      } catch (err) {
        console.error('[Load Fixer Profile Error]', err);
      } finally {
        setInitialLoading(false);
      }
    };
    loadProfile();
  }, []);

  const update = (k: string, v: any) => setForm((p) => ({ ...p, [k]: v }));

  const handleSave = async () => {
    if (!form.companyName.trim() || !form.ownerName.trim()) {
      Alert.alert('Required', 'Please enter your business name and owner name.');
      return;
    }

    setLoading(true);
    try {
      await api.patch('/fixers/me', {
        companyName: form.companyName.trim(),
        ownerName: form.ownerName.trim(),
        experienceYears: parseInt(form.experienceYears, 10) || 1,
        description: form.description.trim() || undefined,
        addressLine: form.addressLine.trim() || undefined,
        city: form.city.trim() || undefined,
        state: form.state.trim() || undefined,
        pincode: form.pincode.replace(/\D/g, '').slice(0, 6) || undefined,
        emergencyService: form.emergencyService,
        workingHoursStart: form.workingHoursStart,
        workingHoursEnd: form.workingHoursEnd,
      });

      Alert.alert('Success', 'Business profile updated successfully!', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (err: any) {
      console.error('[Update Fixer Profile Error]', err?.response?.data || err);
      const msg = err?.response?.data?.error?.message || err?.response?.data?.message || 'Failed to update profile';
      Alert.alert('Error', msg);
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.accent} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Business Information</Text>

          <Input
            label="Company / Workshop Name *"
            value={form.companyName}
            onChangeText={(v) => update('companyName', v)}
            placeholder="e.g. Metro Electronics Repair"
          />

          <Input
            label="Owner / Proprietor Name *"
            value={form.ownerName}
            onChangeText={(v) => update('ownerName', v)}
            placeholder="e.g. Rajesh Sharma"
          />

          <Input
            label="Years of Experience"
            value={form.experienceYears}
            onChangeText={(v) => update('experienceYears', v.replace(/\D/g, ''))}
            keyboardType="number-pad"
            placeholder="e.g. 5"
          />

          <Input
            label="About Your Repair Services"
            value={form.description}
            onChangeText={(v) => update('description', v)}
            placeholder="Expert in chip-level board repair, screen replacement..."
            multiline
            numberOfLines={3}
            style={{ height: 80, textAlignVertical: 'top' }}
          />
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Workshop Address</Text>

          <Input
            label="Shop / Building & Street"
            value={form.addressLine}
            onChangeText={(v) => update('addressLine', v)}
            placeholder="Shop 4, 1st Cross, Main Road"
          />

          <View style={styles.row}>
            <Input
              label="City"
              value={form.city}
              onChangeText={(v) => update('city', v)}
              containerStyle={styles.half}
              placeholder="Bengaluru"
            />
            <Input
              label="Pincode"
              value={form.pincode}
              onChangeText={(v) => update('pincode', v.replace(/\D/g, '').slice(0, 6))}
              containerStyle={styles.half}
              keyboardType="number-pad"
              maxLength={6}
              placeholder="560001"
            />
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Availability & Emergency</Text>

          <View style={styles.switchRow}>
            <View style={styles.switchInfo}>
              <Text style={styles.switchLabel}>24/7 Emergency Service</Text>
              <Text style={styles.switchSub}>Allow customers to contact you for urgent repairs</Text>
            </View>
            <Switch
              value={form.emergencyService}
              onValueChange={(v) => update('emergencyService', v)}
              trackColor={{ false: '#D1D5DB', true: Colors.accentSoft }}
              thumbColor={form.emergencyService ? Colors.accent : '#9CA3AF'}
            />
          </View>

          <View style={styles.row}>
            <Input
              label="Start Time"
              value={form.workingHoursStart}
              onChangeText={(v) => update('workingHoursStart', v)}
              containerStyle={styles.half}
              placeholder="09:00"
            />
            <Input
              label="End Time"
              value={form.workingHoursEnd}
              onChangeText={(v) => update('workingHoursEnd', v)}
              containerStyle={styles.half}
              placeholder="19:00"
            />
          </View>
        </View>

        <View style={styles.btnSection}>
          <Button
            title="Save Profile"
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
  container: { padding: Spacing.base, paddingBottom: Spacing.xxxl },
  card: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    gap: Spacing.sm,
  },
  cardTitle: { fontSize: FontSize.base, fontWeight: FontWeight.bold, color: Colors.text, marginBottom: Spacing.xs },
  row: { flexDirection: 'row', gap: Spacing.md },
  half: { flex: 1 },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.xs,
  },
  switchInfo: { flex: 1, paddingRight: Spacing.md },
  switchLabel: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold, color: Colors.text },
  switchSub: { fontSize: FontSize.xs, color: Colors.muted, marginTop: 2 },
  btnSection: { marginTop: Spacing.sm },
});
