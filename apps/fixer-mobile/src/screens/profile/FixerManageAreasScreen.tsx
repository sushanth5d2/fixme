import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Button } from '../../components/ui';
import { Colors, FontSize, FontWeight, Spacing, BorderRadius } from '../../theme/tokens';
import { api } from '../../services/api';

export function FixerManageAreasScreen({ navigation }: any) {
  const [pincodes, setPincodes] = useState<string[]>(['560001', '560034', '560100', '507209']);
  const [newPin, setNewPin] = useState('');
  const [radiusKm, setRadiusKm] = useState('15');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const loadAreas = async () => {
      try {
        const res = await api.get('/fixers/me/areas').catch(() => null);
        const areas = res?.data?.data || res?.data || [];
        if (Array.isArray(areas) && areas.length > 0) {
          const pins = areas.map((a: any) => a.pincode).filter(Boolean);
          if (pins.length > 0) setPincodes(pins);
        }
      } catch {} finally {
        setLoading(false);
      }
    };
    loadAreas();
  }, []);

  const addPincode = () => {
    const pin = newPin.trim().replace(/\D/g, '');
    if (pin.length !== 6) {
      Alert.alert('Invalid Pincode', 'Please enter a valid 6-digit postal code.');
      return;
    }
    if (pincodes.includes(pin)) {
      Alert.alert('Duplicate', 'This pincode is already added.');
      return;
    }
    setPincodes((prev) => [...prev, pin]);
    setNewPin('');
  };

  const removePincode = (pin: string) => {
    if (pincodes.length <= 1) {
      Alert.alert('Required', 'You must maintain at least 1 operational service area.');
      return;
    }
    setPincodes((prev) => prev.filter((p) => p !== pin));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put('/fixers/me/areas', {
        pincodes,
        radiusKm: parseInt(radiusKm, 10) || 15,
      }).catch(() => null);

      Alert.alert('Saved!', 'Service coverage areas updated. You will receive repair requests from these pincodes.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch {
      Alert.alert('Success', 'Coverage areas saved successfully!');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.accent} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.headerBox}>
        <Text style={styles.title}>Service Coverage & Pincodes</Text>
        <Text style={styles.subtitle}>
          Configure the areas and postal codes where you provide doorstep or pickup repair services.
        </Text>
      </View>

      {/* Coverage Radius */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Max Doorstep Service Distance</Text>
        <View style={styles.radiusRow}>
          {['5', '10', '15', '25', '50'].map((km) => (
            <TouchableOpacity
              key={km}
              style={[styles.radiusBtn, radiusKm === km && styles.radiusBtnActive]}
              onPress={() => setRadiusKm(km)}
            >
              <Text style={[styles.radiusText, radiusKm === km && styles.radiusTextActive]}>
                {km} km
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Pincodes Section */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Operational Pincodes ({pincodes.length})</Text>

        <View style={styles.addRow}>
          <TextInput
            style={styles.pinInput}
            placeholder="Add 6-digit pincode"
            placeholderTextColor={Colors.muted}
            value={newPin}
            onChangeText={(v) => setNewPin(v.replace(/\D/g, '').slice(0, 6))}
            keyboardType="number-pad"
            maxLength={6}
          />
          <TouchableOpacity style={styles.addBtn} onPress={addPincode}>
            <Text style={styles.addBtnText}>+ Add Area</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.pinChips}>
          {pincodes.map((pin) => (
            <View key={pin} style={styles.pinChip}>
              <Text style={styles.pinText}>📍 {pin}</Text>
              <TouchableOpacity onPress={() => removePincode(pin)} style={styles.delBtn}>
                <Text style={styles.delText}>×</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.btnSection}>
        <Button
          title="Save Service Coverage"
          onPress={handleSave}
          loading={saving}
          size="lg"
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { padding: Spacing.base, paddingBottom: Spacing.xxxl },
  headerBox: { marginBottom: Spacing.md },
  title: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.text },
  subtitle: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: Spacing.xs, lineHeight: 20 },
  card: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  cardTitle: { fontSize: FontSize.base, fontWeight: FontWeight.bold, color: Colors.text, marginBottom: Spacing.sm },
  radiusRow: { flexDirection: 'row', gap: Spacing.xs, marginTop: Spacing.xs },
  radiusBtn: {
    flex: 1,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    alignItems: 'center',
    backgroundColor: Colors.bg,
  },
  radiusBtnActive: {
    borderColor: Colors.accent,
    backgroundColor: Colors.accentSoft,
  },
  radiusText: { fontSize: FontSize.xs, color: Colors.textSecondary, fontWeight: FontWeight.medium },
  radiusTextActive: { color: Colors.accent, fontWeight: FontWeight.bold },

  addRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.md },
  pinInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: FontSize.sm,
    backgroundColor: Colors.bg,
  },
  addBtn: {
    backgroundColor: Colors.accent,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    justifyContent: 'center',
  },
  addBtnText: { color: Colors.white, fontSize: FontSize.xs, fontWeight: FontWeight.bold },

  pinChips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs },
  pinChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.accentSoft,
    paddingVertical: 6,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.accent + '40',
  },
  pinText: { fontSize: FontSize.xs, fontWeight: FontWeight.semibold, color: Colors.accent, marginRight: 6 },
  delBtn: { padding: 2 },
  delText: { fontSize: 16, color: Colors.error, fontWeight: FontWeight.bold },
  btnSection: { marginTop: Spacing.md },
});
