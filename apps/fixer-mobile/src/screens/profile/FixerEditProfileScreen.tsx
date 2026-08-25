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
  Image,
} from 'react-native';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
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
  const [logoPhoto, setLogoPhoto] = useState<string>('');
  const [shopPhotos, setShopPhotos] = useState<string[]>([]);
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
        if (p.profilePhotoKey) {
          setLogoPhoto(p.profilePhotoKey);
        }
        if (Array.isArray(p.workshopPhotos)) {
          setShopPhotos(p.workshopPhotos);
        }
      } catch (err) {
        console.error('[Load Fixer Profile Error]', err);
      } finally {
        setInitialLoading(false);
      }
    };
    loadProfile();
  }, []);

  const update = (k: string, v: any) => setForm((p) => ({ ...p, [k]: v }));

  const handlePickLogo = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Please allow gallery access to upload your business logo.');
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
      const uri = asset.base64 ? `data:image/jpeg;base64,${asset.base64}` : asset.uri;
      setLogoPhoto(uri);
    }
  };

  const handlePickShopPhoto = async () => {
    if (shopPhotos.length >= 6) {
      Alert.alert('Limit Reached', 'You can upload up to 6 workshop photos.');
      return;
    }
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Please allow gallery access to upload workshop photos.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: false,
      quality: 0.5,
      base64: true,
    });
    if (!result.canceled && result.assets?.[0]) {
      const asset = result.assets[0];
      const uri = asset.base64 ? `data:image/jpeg;base64,${asset.base64}` : asset.uri;
      setShopPhotos((prev) => [...prev, uri]);
    }
  };

  const handleTakeShopPhoto = async () => {
    if (shopPhotos.length >= 6) {
      Alert.alert('Limit Reached', 'You can upload up to 6 workshop photos.');
      return;
    }
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Please allow camera access to take workshop photos.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      quality: 0.5,
      base64: true,
    });
    if (!result.canceled && result.assets?.[0]) {
      const asset = result.assets[0];
      const uri = asset.base64 ? `data:image/jpeg;base64,${asset.base64}` : asset.uri;
      setShopPhotos((prev) => [...prev, uri]);
    }
  };

  const handleRemoveShopPhoto = (index: number) => {
    setShopPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const handleDetectLocation = async () => {
    setLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Needed',
          'Please allow location access to auto-detect your workshop address, or enter it manually below.',
        );
        return;
      }

      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const { latitude, longitude } = loc.coords;
      update('latitude', latitude);
      update('longitude', longitude);

      const [geo] = await Location.reverseGeocodeAsync({ latitude, longitude });
      if (geo) {
        const line = [geo.name, geo.streetNumber, geo.street].filter(Boolean).join(', ');
        if (line) update('addressLine', line);
        if (geo.city || geo.subregion) update('city', geo.city || geo.subregion || 'Bengaluru');
        if (geo.region) update('state', geo.region || 'Karnataka');
        if (geo.postalCode) update('pincode', geo.postalCode.replace(/\D/g, '').slice(0, 6));
      }

      Alert.alert('Location Detected 📍', 'Your workshop coordinates and address have been populated.');
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
        profilePhotoKey: logoPhoto || undefined,
        workshopPhotos: shopPhotos,
      };

      if (form.description?.trim()) payload.description = form.description.trim();
      if (form.addressLine?.trim()) payload.addressLine = form.addressLine.trim();
      if (form.city?.trim()) payload.city = form.city.trim();
      if (form.state?.trim()) payload.state = form.state.trim();
      if (cleanPin.length === 6) payload.pincode = cleanPin;
      if (typeof form.latitude === 'number' && !isNaN(form.latitude)) payload.latitude = form.latitude;
      if (typeof form.longitude === 'number' && !isNaN(form.longitude)) payload.longitude = form.longitude;

      await api.patch('/fixers/me', payload);

      Alert.alert('Success 🎉', 'Business profile, workshop photos, and address updated successfully!', [
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
        {/* Business Logo / Profile Photo (Optional) */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Shop Logo / Profile Photo (Optional)</Text>
          <View style={styles.logoRow}>
            {logoPhoto ? (
              <View style={styles.logoPreviewContainer}>
                <Image source={{ uri: logoPhoto }} style={styles.logoPreview} />
                <TouchableOpacity
                  style={styles.removeLogoBtn}
                  onPress={() => setLogoPhoto('')}
                >
                  <Text style={styles.removeLogoText}>✕</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.logoPlaceholder}>
                <Text style={styles.logoPlaceholderIcon}>🏢</Text>
              </View>
            )}

            <View style={styles.logoActionBtns}>
              <TouchableOpacity style={styles.pickLogoBtn} onPress={handlePickLogo}>
                <Text style={styles.pickLogoBtnText}>📷 Select Logo / Photo</Text>
              </TouchableOpacity>
              <Text style={styles.fieldHint}>Helps customers identify your shop</Text>
            </View>
          </View>
        </View>

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

        {/* Workshop / Shop Photos (Optional) */}
        <View style={styles.card}>
          <View style={styles.addressHeaderRow}>
            <Text style={styles.cardTitle}>Workshop / Shop Photos (Optional)</Text>
            <Text style={styles.photoCount}>{shopPhotos.length}/6</Text>
          </View>
          <Text style={styles.photoSectionSubtitle}>
            Upload photos of your storefront, repair workbench, tools, or staff to build customer trust.
          </Text>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photosScroll}>
            {shopPhotos.map((photoUri, index) => (
              <View key={index} style={styles.shopThumbContainer}>
                <Image source={{ uri: photoUri }} style={styles.shopThumb} resizeMode="cover" />
                <TouchableOpacity
                  style={styles.removeShopThumbBtn}
                  onPress={() => handleRemoveShopPhoto(index)}
                >
                  <Text style={styles.removeShopThumbText}>✕</Text>
                </TouchableOpacity>
              </View>
            ))}

            {shopPhotos.length < 6 && (
              <View style={styles.addPhotoActions}>
                <TouchableOpacity style={styles.addShopPhotoBtn} onPress={handlePickShopPhoto}>
                  <Text style={styles.addShopPhotoIcon}>📁</Text>
                  <Text style={styles.addShopPhotoText}>Gallery</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.addShopPhotoCameraBtn} onPress={handleTakeShopPhoto}>
                  <Text style={styles.addShopPhotoIcon}>📸</Text>
                  <Text style={styles.addShopPhotoText}>Camera</Text>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
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
                📍 Workshop GPS Pinned: {form.latitude.toFixed(4)}, {form.longitude.toFixed(4)}
              </Text>
            </View>
          ) : null}
        </View>

        {/* Service Options */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Service Preferences</Text>
          <View style={styles.switchRow}>
            <View style={styles.switchLabelContainer}>
              <Text style={styles.switchLabel}>Emergency / Instant Service ⚡</Text>
              <Text style={styles.switchSublabel}>Available for urgent doorstep repair visits</Text>
            </View>
            <Switch
              value={form.emergencyService}
              onValueChange={(v) => update('emergencyService', v)}
              trackColor={{ false: Colors.border, true: Colors.accent }}
              thumbColor={Colors.white}
            />
          </View>
        </View>

        <Button
          title="Save Business Profile"
          onPress={handleSave}
          loading={loading}
          size="lg"
          style={styles.saveBtn}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.bg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  container: { padding: Spacing.base, paddingBottom: Spacing.xxxl, gap: Spacing.md },
  card: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  cardTitle: { fontSize: FontSize.base, fontWeight: FontWeight.bold, color: Colors.text },
  fieldHint: { fontSize: FontSize.xs, color: Colors.muted, marginTop: 2 },

  logoRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginTop: Spacing.xs },
  logoPreviewContainer: { position: 'relative' },
  logoPreview: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#E5E7EB',
    borderWidth: 2,
    borderColor: Colors.accent,
  },
  removeLogoBtn: {
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
  removeLogoText: { color: Colors.white, fontSize: 10, fontWeight: FontWeight.bold },
  logoPlaceholder: {
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
  logoPlaceholderIcon: { fontSize: 26 },
  logoActionBtns: { flex: 1 },
  pickLogoBtn: {
    backgroundColor: Colors.accentSoft,
    paddingVertical: 8,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    alignSelf: 'flex-start',
  },
  pickLogoBtnText: { color: Colors.accent, fontSize: FontSize.xs, fontWeight: FontWeight.bold },

  photoCount: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, color: Colors.accent },
  photoSectionSubtitle: { fontSize: FontSize.xs, color: Colors.muted, lineHeight: 18 },
  photosScroll: { flexDirection: 'row', marginTop: Spacing.xs },
  shopThumbContainer: { position: 'relative', marginRight: Spacing.sm },
  shopThumb: {
    width: 80,
    height: 80,
    borderRadius: BorderRadius.md,
    backgroundColor: '#E5E7EB',
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  removeShopThumbBtn: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: '#DC2626',
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeShopThumbText: { color: Colors.white, fontSize: 10, fontWeight: FontWeight.bold },
  addPhotoActions: { flexDirection: 'row', gap: Spacing.xs },
  addShopPhotoBtn: {
    width: 72,
    height: 80,
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    borderColor: Colors.accent,
    borderStyle: 'dashed',
    backgroundColor: Colors.accentSoft,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addShopPhotoCameraBtn: {
    width: 72,
    height: 80,
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    borderColor: '#D1D5DB',
    borderStyle: 'dashed',
    backgroundColor: '#F9FAFB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addShopPhotoIcon: { fontSize: 20, marginBottom: 2 },
  addShopPhotoText: { fontSize: 10, fontWeight: FontWeight.bold, color: Colors.text },

  addressHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detectLocationBtn: {
    backgroundColor: Colors.accentSoft,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
  },
  detectLocationText: { fontSize: FontSize.xs, color: Colors.accent, fontWeight: FontWeight.semibold },

  row: { flexDirection: 'row', gap: Spacing.sm },
  half: { flex: 1 },

  gpsBadge: {
    backgroundColor: '#EFF6FF',
    padding: Spacing.sm,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    marginTop: Spacing.xs,
  },
  gpsText: { fontSize: FontSize.xs, color: '#1D4ED8', fontWeight: FontWeight.medium },

  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.xs,
  },
  switchLabelContainer: { flex: 1, marginRight: Spacing.md },
  switchLabel: { fontSize: FontSize.sm, fontWeight: FontWeight.medium, color: Colors.text },
  switchSublabel: { fontSize: FontSize.xs, color: Colors.muted, marginTop: 2 },

  saveBtn: { marginTop: Spacing.sm },
});
