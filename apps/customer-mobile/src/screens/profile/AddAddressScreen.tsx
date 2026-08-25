import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Button, Input } from '../../components/ui';
import { Colors, FontSize, FontWeight, Spacing } from '../../theme/tokens';
import { api } from '../../services/api';

export function AddAddressScreen({ route, navigation }: any) {
  const addressId = route?.params?.addressId;
  const isEditing = Boolean(addressId);

  const [form, setForm] = useState({
    label: '',
    houseBuilding: '',
    street: '',
    area: '',
    landmark: '',
    city: '',
    state: '',
    pincode: '',
  });
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(isEditing);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isEditing) {
      api
        .get('/customers/me/addresses')
        .then(({ data }) => {
          const raw = data?.data || data || [];
          const list = Array.isArray(raw) ? raw : (Array.isArray(raw?.data) ? raw.data : []);
          const target = list.find((a: any) => a.id === addressId);
          if (target) {
            setForm({
              label: target.label || '',
              houseBuilding: target.houseBuilding || '',
              street: target.street || '',
              area: target.area || '',
              landmark: target.landmark || '',
              city: target.city || '',
              state: target.state || '',
              pincode: target.pincode || '',
            });
          }
        })
        .catch(() => {})
        .finally(() => setFetching(false));
    }
  }, [addressId, isEditing]);

  const update = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.houseBuilding.trim()) e.houseBuilding = 'Required';
    if (!form.area.trim()) e.area = 'Required';
    if (!form.city.trim()) e.city = 'Required';
    if (!form.state.trim()) e.state = 'Required';
    if (!/^\d{6}$/.test(form.pincode)) e.pincode = 'Enter a valid 6-digit pincode';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      if (isEditing) {
        await api.patch(`/customers/me/addresses/${addressId}`, {
          ...form,
          label: form.label || undefined,
          street: form.street || undefined,
          landmark: form.landmark || undefined,
        });
        Alert.alert('Success', 'Address updated!', [{ text: 'OK', onPress: () => navigation.goBack() }]);
      } else {
        await api.post('/customers/me/addresses', {
          ...form,
          label: form.label || undefined,
          street: form.street || undefined,
          landmark: form.landmark || undefined,
        });
        Alert.alert('Success', 'Address added!', [{ text: 'OK', onPress: () => navigation.goBack() }]);
      }
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message || 'Failed to save address');
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.accent} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Input
          label="Label (optional)"
          placeholder="Home, Office, etc."
          value={form.label}
          onChangeText={(v) => update('label', v)}
        />
        <Input
          label="House / Building *"
          placeholder="Flat 302, Royal Towers"
          value={form.houseBuilding}
          onChangeText={(v) => update('houseBuilding', v)}
          error={errors.houseBuilding}
        />
        <Input
          label="Street (optional)"
          placeholder="MG Road"
          value={form.street}
          onChangeText={(v) => update('street', v)}
        />
        <Input
          label="Area / Locality *"
          placeholder="Koramangala"
          value={form.area}
          onChangeText={(v) => update('area', v)}
          error={errors.area}
        />
        <Input
          label="Landmark (optional)"
          placeholder="Near Bangalore Central Mall"
          value={form.landmark}
          onChangeText={(v) => update('landmark', v)}
        />

        <View style={styles.row}>
          <Input
            label="City *"
            placeholder="Bengaluru"
            value={form.city}
            onChangeText={(v) => update('city', v)}
            error={errors.city}
            containerStyle={styles.half}
          />
          <Input
            label="State *"
            placeholder="Karnataka"
            value={form.state}
            onChangeText={(v) => update('state', v)}
            error={errors.state}
            containerStyle={styles.half}
          />
        </View>

        <Input
          label="Pincode *"
          placeholder="560034"
          value={form.pincode}
          onChangeText={(v) => update('pincode', v.replace(/\D/g, '').slice(0, 6))}
          error={errors.pincode}
          keyboardType="numeric"
          maxLength={6}
        />

        <Button
          title={isEditing ? 'Update Address' : 'Save Address'}
          onPress={handleSave}
          loading={loading}
          size="lg"
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  container: { flex: 1, backgroundColor: Colors.white },
  content: { padding: Spacing.xl, paddingBottom: Spacing.xxxl },
  row: { flexDirection: 'row', gap: Spacing.md },
  half: { flex: 1 },
});
