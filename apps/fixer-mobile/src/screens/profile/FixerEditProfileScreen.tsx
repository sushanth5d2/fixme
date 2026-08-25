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
  TouchableOpacity,
} from 'react-native';
import * as Location from 'expo-location';
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
    latitude: null as number | null,
    longitude: null as number | null,
    emergencyService: false,
    workingHoursStart: '09:00',
    workingHoursEnd: '19:00',
  });
  const [loading, setLoading] = useState(false);
  const [locating, setLocating] = useState(false);
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
          city: p.city || 'Bengaluru',
          state: p.state || 'Karnataka',
          pincode: p.pincode || '',
          latitude: p.latitude ?? null,
          longitude: p.longitude ?? null,
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

  const handleDetectLocation = async () => {
    setLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Please grant location access to auto-detect your workshop area.');
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const lat = loc.coords.latitude;
      const lng = loc.coords.longitude;
      update('latitude', lat);
      update('longitude', lng);

      const geocode = await Location.reverseGeocodeAsync({
        latitude: lat,
        longitude: lng,
      });

      if (geocode && geocode.length > 0) {
        const place = geocode[0];
        const streetPart = [place.name, place.street, place.district || place.subregion]
          .filter(Boolean)
          .join(', ');
        if (streetPart) update('addressLine', streetPart);
        if (place.city) update('city', place.city);
        if (place.region) update('state', place.region);
        if (place.postalCode) update('pincode', place.postalCode);
      }
      Alert.alert('Location Detected 📍', 'Workshop address and GPS coordinates have been auto-filled.');
    } catch {
      Alert.alert('Location Error', 'Could not auto-detect location. Please enter workshop address manually.');
    } finally {
      setLocating(false);
    }
  };

  const handleSave = async () => {
    if (!form.companyName.trim() || !form.ownerName.trim()) {
      Alert.alert('Required', 'Please enter your business name and owner name.');
      return;
    }

    const cleanPin = form.pincode ? form.pincode.replace(/\D/g, '').slice(0, 6) : '';
    if (cleanPin && cleanPin.length !== 6) {
      Alert.alert('Invalid Pincode', 'Please enter a valid 6-digit postal pincode.');
      return;
    }

    setLoading(true);
    try {
      const payload: any = {
        companyName: form.companyName.trim(),
        ownerName: form.ownerName.trim(),
        experienceYears: parseInt(form.experienceYears, 10) || 1,
        emergencyService: !!form.emergencyService,
      };

      if (form.description?.trim()) payload.description = form.description.trim();
      if (form.addressLine?.trim()) payload.addressLine = form.addressLine.trim();
      if (form.city?.trim()) payload.city = form.city.trim();
      if (form.state?.trim()) payload.state = form.state.trim();
      if (cleanPin.length === 6) payload.pincode = cleanPin;
      if (typeof form.latitude === 'number' && !isNaN(form.latitude)) payload.latitude = form.latitude;
      if (typeof form.longitude === 'number' && !isNaN(form.longitude)) payload.longitude = form.longitude;

      await api.patch('/fixers/me', payload);

      Alert.alert('Success 🎉', 'Business profile and workshop address updated successfully!', [
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
        {/* Business Information */}
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

        {/* Workshop Address & Location */}
        <View style={styles.card}>
          <View style={styles.addressHeaderRow}>
            <Text style={styles.cardTitle}>Workshop Address</Text>
            <TouchableOpacity
              style={styles.detectLocationBtn}
              onPress={handleDetectLocation}
              disabled={locating}
            >
              {locating ? (
                <ActivityIndicator size="small" color={Colors.accent} />
              ) : (
                <Text style={styles.detectLocationText}>📍 Auto-Detect GPS</Text>
              )}
            </TouchableOpacity>
          </View>

          <Input
            label="Shop / Building & Street Name"
            value={form.addressLine}
            onChangeText={(v) => update('addressLine', v)}
            placeholder="Shop 4, 1st Cross, Main Road"
          />

          <View style={styles.row}>
            <Input
              label="City / District"
              value={form.city}
              onChangeText={(v) => update('city', v)}
              containerStyle={styles.half}
              placeholder="Bengaluru"
            />
            <Input
              label="State"
              value={form.state}
              onChangeText={(v) => update('state', v)}
              containerStyle={styles.half}
              placeholder="Karnataka"
            />
          </View>

          <Input
            label="Pincode (6 digits)"
            value={form.pincode}
            onChangeText={(v) => update('pincode', v.replace(/\D/g, '').slice(0, 6))}
            keyboardType="number-pad"
            maxLength={6}
            placeholder="560001"
          />

          {form.latitude && form.longitude ? (
            <View style={styles.gpsBadge}>
              <Text style={styles.gpsText}>
                📍 Coordinates: {Number(form.latitude).toFixed(4)}, {Number(form.longitude).toFixed(4)}
              </Text>
            </View>
          ) : null}
        </View>

        {/* Availability & Emergency */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Availability & Working Hours</Text>

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
  addressHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  detectLocationBtn: {
    backgroundColor: Colors.accentSoft,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.accent,
  },
  detectLocationText: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, color: Colors.accent },
  gpsBadge: {
    backgroundColor: '#F1F5F9',
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    marginTop: Spacing.xs,
  },
  gpsText: { fontSize: FontSize.xs, color: Colors.muted, fontWeight: FontWeight.medium },
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
