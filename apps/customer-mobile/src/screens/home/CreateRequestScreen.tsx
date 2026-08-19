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
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Button, Input } from '../../components/ui';
import { Colors, FontSize, FontWeight, Spacing, BorderRadius } from '../../theme/tokens';
import { api } from '../../services/api';
import { HomeStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<HomeStackParamList, 'CreateRequest'>;

interface Address {
  id: string;
  houseBuilding: string;
  street: string;
  area: string;
  city: string;
  pincode: string;
  isDefault: boolean;
}

export function CreateRequestScreen({ route, navigation }: Props) {
  const { categoryId, categoryName } = route.params;
  const [description, setDescription] = useState('');
  const [deviceModel, setDeviceModel] = useState('');
  const [preferredDate, setPreferredDate] = useState('');
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddress, setSelectedAddress] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get('/customers/me/addresses').then((res) => {
      const addrs = res.data.data || res.data;
      setAddresses(addrs);
      const defaultAddr = addrs.find((a: Address) => a.isDefault);
      if (defaultAddr) setSelectedAddress(defaultAddr.id);
    }).catch(() => {});
  }, []);

  const handleSubmit = async () => {
    if (description.length < 10) {
      Alert.alert('Error', 'Please describe the problem in at least 10 characters.');
      return;
    }

    setLoading(true);
    try {
      await api.post('/repair-requests', {
        categoryId,
        description,
        deviceModel: deviceModel || undefined,
        addressId: selectedAddress || undefined,
        preferredDate: preferredDate || undefined,
      });
      Alert.alert('Success', 'Your repair request has been submitted! Fixers will send you quotes soon.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message || 'Failed to create request');
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
        <View style={styles.categoryBadge}>
          <Text style={styles.categoryText}>🔧 {categoryName || 'Device'}</Text>
        </View>

        <Input
          label="Device Model (optional)"
          placeholder="e.g., Samsung Galaxy S23, LG 55-inch TV"
          value={deviceModel}
          onChangeText={setDeviceModel}
        />

        <View style={styles.field}>
          <Text style={styles.label}>Describe the Problem *</Text>
          <Input
            placeholder="What's wrong with your device? Please be as detailed as possible..."
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={5}
            containerStyle={styles.textArea}
            style={styles.textAreaInput}
          />
          <Text style={styles.charCount}>{description.length}/2000</Text>
        </View>

        <Input
          label="Preferred Date (optional)"
          placeholder="YYYY-MM-DD"
          value={preferredDate}
          onChangeText={setPreferredDate}
          hint="When would you like the fixer to visit?"
        />

        {/* Address Selection */}
        {addresses.length > 0 && (
          <View style={styles.field}>
            <Text style={styles.label}>Service Address</Text>
            {addresses.map((addr) => (
              <Button
                key={addr.id}
                title={`${addr.houseBuilding}, ${addr.area}, ${addr.city} - ${addr.pincode}`}
                onPress={() => setSelectedAddress(addr.id)}
                variant={selectedAddress === addr.id ? 'primary' : 'outline'}
                size="sm"
                style={styles.addressBtn}
              />
            ))}
          </View>
        )}

        <View style={styles.submitArea}>
          <Button
            title="Submit Request"
            onPress={handleSubmit}
            loading={loading}
            disabled={description.length < 10}
            size="lg"
          />
          <Text style={styles.freeNote}>
            ✓ Free to submit — No payment until you accept a quote
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1, backgroundColor: Colors.white },
  content: {
    padding: Spacing.xl,
    paddingBottom: Spacing.xxxl,
  },
  categoryBadge: {
    backgroundColor: Colors.accentSoft,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    alignSelf: 'flex-start',
    marginBottom: Spacing.lg,
  },
  categoryText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.accent,
  },
  field: { marginBottom: Spacing.base },
  label: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  textArea: { marginBottom: 0 },
  textAreaInput: { height: 120, textAlignVertical: 'top' },
  charCount: {
    fontSize: FontSize.xs,
    color: Colors.muted,
    textAlign: 'right',
    marginTop: Spacing.xs,
  },
  addressBtn: { marginBottom: Spacing.sm },
  submitArea: {
    marginTop: Spacing.xl,
    gap: Spacing.md,
  },
  freeNote: {
    fontSize: FontSize.xs,
    color: Colors.success,
    textAlign: 'center',
    fontWeight: FontWeight.medium,
  },
});
