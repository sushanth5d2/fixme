import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { Button, Input } from '../../components/ui';
import { Colors, FontSize, FontWeight, Spacing, BorderRadius } from '../../theme/tokens';
import { api } from '../../services/api';

export function FixerRegistrationScreen({ navigation }: any) {
  const [form, setForm] = useState({
    companyName: '', ownerName: '', gstin: '', panNumber: '',
    description: '', city: '', state: '', address: '',
    experienceYears: '', emergencyService: false,
  });
  const [loading, setLoading] = useState(false);

  const update = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const handleSubmit = async () => {
    if (!form.companyName || !form.ownerName || !form.city) {
      Alert.alert('Error', 'Please fill all required fields');
      return;
    }
    setLoading(true);
    try {
      await api.post('/fixers/register', {
        companyName: form.companyName,
        ownerName: form.ownerName,
        gstin: form.gstin || undefined,
        panNumber: form.panNumber || undefined,
        description: form.description || undefined,
        city: form.city,
        state: form.state,
        address: form.address || undefined,
        experienceYears: form.experienceYears ? parseInt(form.experienceYears) : undefined,
      });
      Alert.alert(
        '🎉 Registration Submitted!',
        'Your profile is under review. You\'ll be notified once verified.',
        [{ text: 'OK', onPress: () => navigation.goBack() }],
      );
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message || 'Registration failed');
    } finally { setLoading(false); }
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={styles.title}>Business Registration</Text>
          <Text style={styles.subtitle}>Complete your profile to start receiving repair requests</Text>
        </View>

        {/* Business Info */}
        <Text style={styles.sectionTitle}>Business Details</Text>
        <Input label="Company / Business Name *" placeholder="Ravi Electronics Repair" value={form.companyName} onChangeText={(v) => update('companyName', v)} />
        <Input label="Owner / Proprietor Name *" placeholder="Ravi Kumar" value={form.ownerName} onChangeText={(v) => update('ownerName', v)} />
        <Input label="GSTIN (optional)" placeholder="22AAAAA0000A1Z5" value={form.gstin} onChangeText={(v) => update('gstin', v.toUpperCase())} autoCapitalize="characters" hint="15-character GST Identification Number" />
        <Input label="PAN Number (optional)" placeholder="ABCDE1234F" value={form.panNumber} onChangeText={(v) => update('panNumber', v.toUpperCase())} autoCapitalize="characters" maxLength={10} />

        <Text style={styles.sectionTitle}>About Your Business</Text>
        <Input label="Description" placeholder="Tell customers about your repair expertise..." value={form.description} onChangeText={(v) => update('description', v)} multiline numberOfLines={4} style={{ height: 100, textAlignVertical: 'top' }} />
        <Input label="Years of Experience" placeholder="e.g., 5" value={form.experienceYears} onChangeText={(v) => update('experienceYears', v.replace(/\D/g, ''))} keyboardType="numeric" />

        <Text style={styles.sectionTitle}>Location</Text>
        <Input label="City *" placeholder="Bengaluru" value={form.city} onChangeText={(v) => update('city', v)} />
        <Input label="State *" placeholder="Karnataka" value={form.state} onChangeText={(v) => update('state', v)} />
        <Input label="Business Address" placeholder="Shop 12, Electronic City Phase 1" value={form.address} onChangeText={(v) => update('address', v)} />

        <View style={styles.note}>
          <Text style={styles.noteIcon}>📋</Text>
          <Text style={styles.noteText}>After registration, our team will verify your details. You can start receiving requests once verified.</Text>
        </View>

        <Button title="Submit Registration" onPress={handleSubmit} loading={loading} size="lg" />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1, backgroundColor: Colors.white },
  content: { padding: Spacing.xl, paddingBottom: Spacing.xxxl },
  header: { marginBottom: Spacing.xl },
  title: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: Colors.text },
  subtitle: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: Spacing.xs },
  sectionTitle: { fontSize: FontSize.md, fontWeight: FontWeight.semibold, color: Colors.text, marginTop: Spacing.lg, marginBottom: Spacing.md },
  note: {
    flexDirection: 'row', backgroundColor: Colors.infoBg, borderRadius: BorderRadius.lg,
    padding: Spacing.base, marginBottom: Spacing.xl, alignItems: 'flex-start',
  },
  noteIcon: { fontSize: 20, marginRight: Spacing.md },
  noteText: { flex: 1, fontSize: FontSize.sm, color: Colors.text, lineHeight: 20 },
});
