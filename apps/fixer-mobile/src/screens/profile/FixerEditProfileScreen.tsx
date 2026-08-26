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
    gstin: '',
    panNumber: '',
    businessRegNo: '',
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
  const [verificationStatus, setVerificationStatus] = useState<string>('REGISTERED');
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
          gstin: p.gstin || '',
          panNumber: p.panNumber || '',
          businessRegNo: p.businessRegNo || '',
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
        if (p.verificationStatus) {
          setVerificationStatus(p.verificationStatus);
        }
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
        workingHoursStart: form.workingHoursStart || '09:00',
        workingHoursEnd: form.workingHoursEnd || '19:00',
        profilePhotoKey: logoPhoto || undefined,
        workshopPhotos: shopPhotos,
      };

      if (form.description?.trim()) payload.description = form.description.trim();
      if (form.gstin?.trim()) payload.gstin = form.gstin.trim().toUpperCase();
      if (form.panNumber?.trim()) payload.panNumber = form.panNumber.trim().toUpperCase();
      if (form.businessRegNo?.trim()) payload.businessRegNo = form.businessRegNo.trim();
      if (form.addressLine?.trim()) payload.addressLine = form.addressLine.trim();
      if (form.city?.trim()) payload.city = form.city.trim();
      if (form.state?.trim()) payload.state = form.state.trim();
      if (cleanPin.length === 6) payload.pincode = cleanPin;
      if (typeof form.latitude === 'number' && !isNaN(form.latitude)) payload.latitude = form.latitude;
      if (typeof form.longitude === 'number' && !isNaN(form.longitude)) payload.longitude = form.longitude;

      await api.patch('/fixers/me', payload);

      Alert.alert('Success 🎉', 'Business profile, registration, and KYC updated successfully!', [
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

  const isVerified = verificationStatus === 'VERIFIED';
  const isPending = verificationStatus === 'UNDER_REVIEW' || verificationStatus === 'DOCUMENT_SUBMITTED';

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        
        {/* Verification Status Banner */}
        <View style={[styles.statusCard, isVerified ? styles.statusCardVerified : isPending ? styles.statusCardPending : styles.statusCardRegistered]}>
          <View style={styles.statusHeaderRow}>
            <Text style={styles.statusBadgeIcon}>{isVerified ? '✅' : isPending ? '⏳' : '📝'}</Text>
            <View style={styles.statusTextContainer}>
              <Text style={styles.statusTitle}>
                {isVerified ? 'Verified Pro Workshop' : isPending ? 'KYC Under Review' : 'Profile Registered'}
              </Text>
              <Text style={styles.statusSubtitle}>
                {isVerified
                  ? 'Your business and KYC are verified. You have full priority access to customer requests.'
                  : isPending
                  ? 'Your registration details are currently being reviewed by our verification team.'
                  : 'Keep your business details and registration IDs updated to maintain fast customer trust.'}
              </Text>
            </View>
          </View>
        </View>

        {/* Section 1: Business Identity & Branding */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>🏢 Business Identity & Branding</Text>

          {/* Logo Upload */}
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
              <Text style={styles.fieldHint}>Helps customers recognize your workshop logo</Text>
            </View>
          </View>

          <Input
            label="Company / Workshop Name *"
            value={form.companyName}
            onChangeText={(v) => update('companyName', v)}
            placeholder="e.g. Apex Electronics & Mobile Care"
          />

          <Input
            label="Owner / Proprietor Name *"
            value={form.ownerName}
            onChangeText={(v) => update('ownerName', v)}
            placeholder="e.g. Ravi Kumar"
          />

          <Input
            label="Years of Experience"
            value={form.experienceYears}
            onChangeText={(v) => update('experienceYears', v.replace(/\D/g, ''))}
            keyboardType="number-pad"
            placeholder="e.g. 5"
          />

          <Input
            label="About Your Business / Bio"
            value={form.description}
            onChangeText={(v) => update('description', v)}
            placeholder="Expert in motherboard IC level repair, display replacement, laptop service..."
            multiline
            numberOfLines={3}
            style={{ height: 80, textAlignVertical: 'top' }}
          />
        </View>

        {/* Section 2: Business Registration & Tax KYC Identifiers */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>🆔 Business Registration & Tax KYC</Text>
          <Text style={styles.cardSubtitle}>
            Unique government registration and tax identification numbers for workshop credibility.
          </Text>

          <Input
            label="GSTIN (optional)"
            value={form.gstin}
            onChangeText={(v) => update('gstin', v.toUpperCase())}
            placeholder="22AAAAA0000A1Z5"
            autoCapitalize="characters"
            maxLength={15}
            hint="15-character GST Identification Number"
          />

          <Input
            label="PAN Number (optional)"
            value={form.panNumber}
            onChangeText={(v) => update('panNumber', v.toUpperCase())}
            placeholder="ABCDE1234F"
            autoCapitalize="characters"
            maxLength={10}
            hint="10-character Business / Proprietor PAN"
          />

          <Input
            label="Trade License / MSME / Udyam No. (optional)"
            value={form.businessRegNo}
            onChangeText={(v) => update('businessRegNo', v)}
            placeholder="e.g. UDYAM-KR-03-0012345"
            hint="Shop Act / Trade License / MSME registration"
          />
        </View>

        {/* Section 3: Workshop Address & Pinpoint GPS */}
        <View style={styles.card}>
          <View style={styles.addressHeaderRow}>
            <Text style={styles.cardTitle}>📍 Workshop Address & Location</Text>
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
            label="Shop / Building & Street Name *"
            value={form.addressLine}
            onChangeText={(v) => update('addressLine', v)}
            placeholder="Shop 4, Ground Floor, Main Road"
          />

          <View style={styles.row}>
            <Input
              label="City / District *"
              value={form.city}
              onChangeText={(v) => update('city', v)}
              containerStyle={styles.half}
              placeholder="Bengaluru"
            />
            <Input
              label="State *"
              value={form.state}
              onChangeText={(v) => update('state', v)}
              containerStyle={styles.half}
              placeholder="Karnataka"
            />
          </View>

          <Input
            label="Pincode (6 digits) *"
            value={form.pincode}
            onChangeText={(v) => update('pincode', v.replace(/\D/g, '').slice(0, 6))}
            keyboardType="number-pad"
            maxLength={6}
            placeholder="560001"
          />

          {form.latitude && form.longitude ? (
            <View style={styles.gpsBadge}>
              <Text style={styles.gpsText}>
                🎯 Exact Workshop Pin: {Number(form.latitude).toFixed(4)}° N, {Number(form.longitude).toFixed(4)}° E
              </Text>
            </View>
          ) : null}
        </View>

        {/* Section 4: Workshop & Storefront Photos (up to 6) */}
        <View style={styles.card}>
          <View style={styles.addressHeaderRow}>
            <Text style={styles.cardTitle}>📸 Workshop & Storefront Photos</Text>
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

        {/* Section 5: Operations & Service Preferences */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>⏰ Operating Hours & Availability</Text>

          <View style={styles.row}>
            <Input
              label="Opening Time"
              value={form.workingHoursStart}
              onChangeText={(v) => update('workingHoursStart', v)}
              containerStyle={styles.half}
              placeholder="09:00"
              hint="24-hr format (e.g. 09:00)"
            />
            <Input
              label="Closing Time"
              value={form.workingHoursEnd}
              onChangeText={(v) => update('workingHoursEnd', v)}
              containerStyle={styles.half}
              placeholder="19:00"
              hint="24-hr format (e.g. 19:00)"
            />
          </View>

          <View style={styles.switchRow}>
            <View style={styles.switchLabelContainer}>
              <Text style={styles.switchLabel}>24/7 Emergency Repairs ⚡</Text>
              <Text style={styles.switchSublabel}>Accept urgent on-demand repair requests</Text>
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
          title="Save Business Profile & KYC"
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

  statusCard: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    borderWidth: 1,
  },
  statusCardVerified: { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' },
  statusCardPending: { backgroundColor: '#FFFBEB', borderColor: '#FDE68A' },
  statusCardRegistered: { backgroundColor: '#EFF6FF', borderColor: '#BFDBFE' },
  statusHeaderRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm },
  statusBadgeIcon: { fontSize: 24 },
  statusTextContainer: { flex: 1 },
  statusTitle: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.text },
  statusSubtitle: { fontSize: FontSize.xs, color: Colors.muted, marginTop: 2, lineHeight: 16 },

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
  cardSubtitle: { fontSize: FontSize.xs, color: Colors.muted, marginBottom: Spacing.xs, lineHeight: 16 },
  fieldHint: { fontSize: FontSize.xs, color: Colors.muted, marginTop: 2 },

  logoRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginTop: Spacing.xs, marginBottom: Spacing.xs },
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
    borderColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoPlaceholderIcon: { fontSize: 28 },
  logoActionBtns: { flex: 1, gap: 2 },
  pickLogoBtn: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.md,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  pickLogoBtnText: { color: Colors.accent, fontSize: FontSize.xs, fontWeight: FontWeight.bold },

  addressHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  detectLocationBtn: {
    backgroundColor: '#F0FDF4',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: '#86EFAC',
  },
  detectLocationText: { fontSize: FontSize.xs, color: '#16A34A', fontWeight: FontWeight.semibold },

  row: { flexDirection: 'row', gap: Spacing.sm },
  half: { flex: 1 },

  gpsBadge: {
    backgroundColor: '#F8FAFC',
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: Spacing.xs,
  },
  gpsText: { fontSize: FontSize.xs, color: Colors.muted, fontWeight: FontWeight.medium },

  photoCount: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, color: Colors.accent },
  photoSectionSubtitle: { fontSize: FontSize.xs, color: Colors.muted, marginBottom: Spacing.xs, lineHeight: 16 },
  photosScroll: { flexDirection: 'row', marginTop: Spacing.xs },
  shopThumbContainer: { position: 'relative', marginRight: Spacing.sm },
  shopThumb: { width: 80, height: 80, borderRadius: BorderRadius.md },
  removeShopThumbBtn: {
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
  removeShopThumbText: { color: Colors.white, fontSize: 10, fontWeight: FontWeight.bold },
  addPhotoActions: { flexDirection: 'row', gap: Spacing.xs },
  addShopPhotoBtn: {
    width: 80,
    height: 80,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  addShopPhotoCameraBtn: {
    width: 80,
    height: 80,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  addShopPhotoIcon: { fontSize: 20, marginBottom: 2 },
  addShopPhotoText: { fontSize: 10, color: Colors.muted, fontWeight: FontWeight.medium },

  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.xs,
    marginTop: Spacing.xs,
  },
  switchLabelContainer: { flex: 1, marginRight: Spacing.sm },
  switchLabel: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold, color: Colors.text },
  switchSublabel: { fontSize: FontSize.xs, color: Colors.muted, marginTop: 2 },

  saveBtn: { marginTop: Spacing.sm, marginBottom: Spacing.xl },
});
