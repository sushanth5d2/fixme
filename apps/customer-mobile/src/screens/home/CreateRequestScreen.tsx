import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Button, Input } from '../../components/ui';
import { Colors, FontSize, FontWeight, Spacing, BorderRadius } from '../../theme/tokens';
import { api } from '../../services/api';
import { HomeStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<HomeStackParamList, 'CreateRequest'>;

const URGENCY_OPTIONS = [
  { label: 'Normal', value: 'LOW', color: Colors.info },
  { label: 'Urgent', value: 'MEDIUM', color: Colors.warning },
  { label: 'Emergency (Same Day)', value: 'HIGH', color: Colors.error },
];

const TIME_SLOTS = [
  { label: 'Morning (9 AM - 12 PM)', value: 'MORNING' },
  { label: 'Afternoon (12 PM - 4 PM)', value: 'AFTERNOON' },
  { label: 'Evening (4 PM - 8 PM)', value: 'EVENING' },
];

export function CreateRequestScreen({ route, navigation }: Props) {
  const { categoryId, categoryName } = route.params;

  // Device & Problem
  const [deviceModel, setDeviceModel] = useState('');
  const [brandName, setBrandName] = useState('');
  const [description, setDescription] = useState('');
  const [urgency, setUrgency] = useState('MEDIUM');

  // Contact & Address
  const [contactNumber, setContactNumber] = useState('');
  const [houseBuilding, setHouseBuilding] = useState('');
  const [street, setStreet] = useState('');
  const [area, setArea] = useState('');
  const [landmark, setLandmark] = useState('');
  const [city, setCity] = useState('Bengaluru');
  const [pincode, setPincode] = useState('');
  const [state, setState] = useState('Karnataka');

  // Schedule
  const [preferredDate, setPreferredDate] = useState('');
  const [preferredTimeSlot, setPreferredTimeSlot] = useState('MORNING');

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Pre-fill customer address and phone if available
    api.get('/customers/me').then((res) => {
      const cust = res.data.data || res.data;
      if (cust?.user?.mobile) {
        setContactNumber(cust.user.mobile);
      }
    }).catch(() => {});

    api.get('/customers/me/addresses').then((res) => {
      const addrs = res.data.data || res.data;
      if (Array.isArray(addrs) && addrs.length > 0) {
        const def = addrs.find((a: any) => a.isDefault) || addrs[0];
        if (def) {
          setHouseBuilding(def.houseBuilding || '');
          setStreet(def.street || '');
          setArea(def.area || '');
          setLandmark(def.landmark || '');
          setCity(def.city || 'Bengaluru');
          setPincode(def.pincode || '');
          setState(def.state || 'Karnataka');
        }
      }
    }).catch(() => {});
  }, []);

  const handleSubmit = async () => {
    if (!description.trim() || description.trim().length < 10) {
      Alert.alert('Required', 'Please describe the device problem in at least 10 characters.');
      return;
    }

    if (!pincode.trim() || pincode.trim().length !== 6) {
      Alert.alert('Required', 'Please enter a valid 6-digit pincode for the service location.');
      return;
    }

    if (!houseBuilding.trim() && !street.trim() && !area.trim()) {
      Alert.alert('Required', 'Please provide your address/area so the fixer can visit.');
      return;
    }

    setLoading(true);
    try {
      await api.post('/repair-requests', {
        categoryId,
        deviceModel: `${brandName ? brandName + ' ' : ''}${deviceModel}`.trim() || undefined,
        description: description.trim(),
        priority: urgency,
        contactNumber: contactNumber.replace(/\D/g, '').slice(-10) || undefined,
        houseBuilding: houseBuilding.trim(),
        street: street.trim(),
        area: area.trim(),
        landmark: landmark.trim(),
        city: city.trim() || 'Bengaluru',
        pincode: pincode.trim(),
        state: state.trim() || 'Karnataka',
        preferredDate: preferredDate.trim() || undefined,
        preferredTimeSlot,
      });

      Alert.alert(
        'Request Posted Successfully! 🎉',
        'Verified fixers in your area are being notified and will submit repair quotes shortly.',
        [
          {
            text: 'View My Requests',
            onPress: () => {
              navigation.goBack();
              navigation.getParent()?.navigate('RequestsTab');
            },
          },
        ],
      );
    } catch (err: any) {
      console.error('[Create Request Error]', err?.response?.data || err);
      const msg =
        err?.response?.data?.error?.message ||
        err?.response?.data?.message ||
        err?.message ||
        'Failed to post repair request';
      Alert.alert('Submission Failed', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {/* Category Header */}
        <View style={styles.categoryHeader}>
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryText}>🔧 {categoryName || 'Device Repair'}</Text>
          </View>
          <Text style={styles.headerSubtitle}>
            Fill in the device problem details and service location to receive instant quotes from verified fixers.
          </Text>
        </View>

        {/* Section 1: Device Information */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>1. Device Details</Text>

          <View style={styles.row}>
            <Input
              label="Brand / Manufacturer"
              placeholder="e.g., Samsung, Apple, LG"
              value={brandName}
              onChangeText={setBrandName}
              containerStyle={styles.halfInput}
            />
            <Input
              label="Model / Variant"
              placeholder="e.g., Galaxy S23, OLED 55"
              value={deviceModel}
              onChangeText={setDeviceModel}
              containerStyle={styles.halfInput}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Describe the Problem *</Text>
            <Input
              placeholder="Explain the problem in detail (e.g. screen broken, water damage, not powering on, cooling not working, strange noise)..."
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={4}
              containerStyle={styles.textArea}
              style={styles.textAreaInput}
            />
            <Text style={styles.charCount}>{description.length} / 2000</Text>
          </View>

          {/* Urgency */}
          <Text style={styles.label}>Repair Urgency</Text>
          <View style={styles.chipRow}>
            {URGENCY_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.value}
                style={[
                  styles.chip,
                  urgency === opt.value && { borderColor: opt.color, backgroundColor: opt.color + '15' },
                ]}
                onPress={() => setUrgency(opt.value)}
              >
                <Text
                  style={[
                    styles.chipText,
                    urgency === opt.value && { color: opt.color, fontWeight: FontWeight.bold },
                  ]}
                >
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Section 2: Service Address & Contact */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>2. Service Address & Location</Text>

          <Input
            label="Contact Mobile Number"
            placeholder="9876543210"
            value={contactNumber}
            onChangeText={(v) => setContactNumber(v.replace(/\D/g, '').slice(0, 10))}
            keyboardType="phone-pad"
            maxLength={10}
            leftIcon={<Text style={styles.prefix}>+91</Text>}
          />

          <View style={styles.row}>
            <Input
              label="House / Flat / Building *"
              placeholder="Flat 402, Sunshine Apts"
              value={houseBuilding}
              onChangeText={setHouseBuilding}
              containerStyle={styles.halfInput}
            />
            <Input
              label="Street / Road *"
              placeholder="12th Main Road"
              value={street}
              onChangeText={setStreet}
              containerStyle={styles.halfInput}
            />
          </View>

          <View style={styles.row}>
            <Input
              label="Area / Locality *"
              placeholder="Indiranagar"
              value={area}
              onChangeText={setArea}
              containerStyle={styles.halfInput}
            />
            <Input
              label="Landmark"
              placeholder="Near Metro Station"
              value={landmark}
              onChangeText={setLandmark}
              containerStyle={styles.halfInput}
            />
          </View>

          <View style={styles.row}>
            <Input
              label="Pincode *"
              placeholder="560038"
              value={pincode}
              onChangeText={(v) => setPincode(v.replace(/\D/g, '').slice(0, 6))}
              keyboardType="number-pad"
              maxLength={6}
              containerStyle={styles.halfInput}
            />
            <Input
              label="City"
              placeholder="Bengaluru"
              value={city}
              onChangeText={setCity}
              containerStyle={styles.halfInput}
            />
          </View>
        </View>

        {/* Section 3: Preferred Schedule */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>3. Preferred Appointment</Text>

          <Input
            label="Preferred Date (optional)"
            placeholder="YYYY-MM-DD (e.g. 2026-08-25)"
            value={preferredDate}
            onChangeText={setPreferredDate}
          />

          <Text style={styles.label}>Preferred Time Slot</Text>
          <View style={styles.chipRow}>
            {TIME_SLOTS.map((slot) => (
              <TouchableOpacity
                key={slot.value}
                style={[
                  styles.slotChip,
                  preferredTimeSlot === slot.value && styles.slotChipActive,
                ]}
                onPress={() => setPreferredTimeSlot(slot.value)}
              >
                <Text
                  style={[
                    styles.slotChipText,
                    preferredTimeSlot === slot.value && styles.slotChipTextActive,
                  ]}
                >
                  {slot.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Submit */}
        <View style={styles.submitSection}>
          <Button
            title="Post Repair Request"
            onPress={handleSubmit}
            loading={loading}
            size="lg"
          />
          <Text style={styles.freeGuarantee}>
            🛡️ 100% Free to post • No advance payment required • Compare quotes from verified fixers
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.bg },
  container: { flex: 1 },
  content: { padding: Spacing.lg, paddingBottom: Spacing.xxxl },

  categoryHeader: {
    marginBottom: Spacing.base,
  },
  categoryBadge: {
    backgroundColor: Colors.accentSoft,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    alignSelf: 'flex-start',
    marginBottom: Spacing.xs,
  },
  categoryText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: Colors.accent,
  },
  headerSubtitle: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    lineHeight: 20,
  },

  card: {
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    marginBottom: Spacing.base,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 6,
    elevation: 2,
  },
  cardTitle: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.bold,
    color: Colors.text,
    marginBottom: Spacing.md,
  },

  row: { flexDirection: 'row', gap: Spacing.md },
  halfInput: { flex: 1 },
  field: { marginBottom: Spacing.base },
  label: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  prefix: {
    fontSize: FontSize.base,
    color: Colors.textSecondary,
    fontWeight: FontWeight.medium,
  },
  textArea: { marginBottom: 0 },
  textAreaInput: { height: 100, textAlignVertical: 'top' },
  charCount: {
    fontSize: FontSize.xs,
    color: Colors.muted,
    textAlign: 'right',
    marginTop: Spacing.xs,
  },

  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  chip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.bg,
  },
  chipText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.medium,
    color: Colors.textSecondary,
  },

  slotChip: {
    width: '100%',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.bg,
    marginBottom: Spacing.xs,
  },
  slotChipActive: {
    borderColor: Colors.accent,
    backgroundColor: Colors.accentSoft,
  },
  slotChipText: {
    fontSize: FontSize.sm,
    color: Colors.text,
  },
  slotChipTextActive: {
    color: Colors.accent,
    fontWeight: FontWeight.semibold,
  },

  submitSection: {
    marginTop: Spacing.md,
    gap: Spacing.sm,
  },
  freeGuarantee: {
    fontSize: FontSize.xs,
    color: Colors.success,
    textAlign: 'center',
    fontWeight: FontWeight.medium,
    lineHeight: 18,
  },
});
