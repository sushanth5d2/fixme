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
  Image,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { Button, Input } from '../../components/ui';
import { Colors, FontSize, FontWeight, Spacing, BorderRadius } from '../../theme/tokens';
import { api } from '../../services/api';
import { HomeStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<HomeStackParamList, 'CreateRequest'>;

const URGENCY_OPTIONS = [
  { label: 'Normal', value: 'LOW', color: Colors.info },
  { label: 'Urgent', value: 'MEDIUM', color: Colors.warning },
  { label: 'Emergency', value: 'HIGH', color: Colors.error },
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

  // Photos (Optional)
  const [photos, setPhotos] = useState<string[]>([]);

  // Contact & Address (Optional)
  const [contactNumber, setContactNumber] = useState('');
  const [houseBuilding, setHouseBuilding] = useState('');
  const [street, setStreet] = useState('');
  const [area, setArea] = useState('');
  const [landmark, setLandmark] = useState('');
  const [city, setCity] = useState('Bengaluru');
  const [pincode, setPincode] = useState('');
  const [state, setState] = useState('Karnataka');
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [locating, setLocating] = useState(false);

  // Schedule (Optional)
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

  // Photo Picker
  const handlePickPhoto = async () => {
    if (photos.length >= 5) {
      Alert.alert('Limit Reached', 'You can attach up to 5 photos.');
      return;
    }
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Needed', 'Please allow gallery access to attach photos.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: false,
      quality: 0.7,
      base64: true,
    });
    if (!result.canceled && result.assets?.[0]?.uri) {
      const uri = result.assets[0].uri;
      setPhotos((prev) => [...prev, uri]);
    }
  };

  const handleTakePhoto = async () => {
    if (photos.length >= 5) {
      Alert.alert('Limit Reached', 'You can attach up to 5 photos.');
      return;
    }
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Needed', 'Please allow camera access to take photos.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      quality: 0.7,
      base64: true,
    });
    if (!result.canceled && result.assets?.[0]?.uri) {
      const uri = result.assets[0].uri;
      setPhotos((prev) => [...prev, uri]);
    }
  };

  const handleRemovePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  // GPS Auto-detection
  const handleDetectLocation = async () => {
    setLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Please grant location access to auto-detect your area.');
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setLatitude(loc.coords.latitude);
      setLongitude(loc.coords.longitude);

      const geocode = await Location.reverseGeocodeAsync({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      });

      if (geocode && geocode.length > 0) {
        const place = geocode[0];
        if (place.district || place.subregion || place.name) {
          setArea(place.district || place.subregion || place.name || area);
        }
        if (place.city) setCity(place.city);
        if (place.region) setState(place.region);
        if (place.postalCode) setPincode(place.postalCode);
        if (place.street) setStreet(place.street);
      }
      Alert.alert('Location Detected 📍', 'Address and location coordinates updated.');
    } catch {
      Alert.alert('Location Error', 'Could not detect location. Please enter address manually.');
    } finally {
      setLocating(false);
    }
  };

  const handleSubmit = async () => {
    if (!description.trim() || description.trim().length < 10) {
      Alert.alert('Required Field', 'Please describe the problem with your device in at least 10 characters.');
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
        houseBuilding: houseBuilding.trim() || undefined,
        street: street.trim() || undefined,
        area: area.trim() || undefined,
        landmark: landmark.trim() || undefined,
        city: city.trim() || 'Bengaluru',
        pincode: pincode.trim() || undefined,
        state: state.trim() || 'Karnataka',
        latitude: latitude ?? undefined,
        longitude: longitude ?? undefined,
        photos: photos.length > 0 ? photos : undefined,
        preferredDate: preferredDate.trim() || undefined,
        preferredTimeSlot,
      });

      Alert.alert(
        'Request Posted! 🎉',
        'Your repair request is live! Fixers in your area can now send you quotes.',
        [
          {
            text: 'View Requests',
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
      Alert.alert('Error', msg);
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
        {/* Category Banner */}
        <View style={styles.categoryHeader}>
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryText}>🔧 {categoryName || 'Device Repair'}</Text>
          </View>
          <Text style={styles.headerSubtitle}>
            Describe the problem below to get repair quotes from verified technicians.
          </Text>
        </View>

        {/* Section 1: Problem Details (Required) */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>1. Problem Details <Text style={styles.requiredStar}>*</Text></Text>

          <View style={styles.field}>
            <Text style={styles.label}>Describe the Problem *</Text>
            <Input
              placeholder="What is wrong with the device? (e.g., screen cracked, not turning on, water damage, cooling issue)..."
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={4}
              containerStyle={styles.textArea}
              style={styles.textAreaInput}
            />
            <Text style={styles.charCount}>{description.length} / 2000</Text>
          </View>

          <View style={styles.row}>
            <Input
              label="Brand (Optional)"
              placeholder="e.g. Samsung, Apple, LG"
              value={brandName}
              onChangeText={setBrandName}
              containerStyle={styles.halfInput}
            />
            <Input
              label="Model (Optional)"
              placeholder="e.g. Galaxy S23, OLED 55"
              value={deviceModel}
              onChangeText={setDeviceModel}
              containerStyle={styles.halfInput}
            />
          </View>

          {/* Urgency */}
          <Text style={styles.label}>Repair Urgency (Optional)</Text>
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

        {/* Section 2: Upload Photos (Optional) */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>2. Photos of the Issue (Optional)</Text>
          <Text style={styles.cardSubtitle}>
            Adding clear photos helps fixers provide accurate price quotes.
          </Text>

          <View style={styles.photoActions}>
            <TouchableOpacity style={styles.photoBtn} onPress={handlePickPhoto}>
              <Text style={styles.photoBtnIcon}>🖼️</Text>
              <Text style={styles.photoBtnText}>Gallery</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.photoBtn} onPress={handleTakePhoto}>
              <Text style={styles.photoBtnIcon}>📷</Text>
              <Text style={styles.photoBtnText}>Take Photo</Text>
            </TouchableOpacity>
          </View>

          {photos.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photoStrip}>
              {photos.map((uri, i) => (
                <View key={i} style={styles.photoThumbContainer}>
                  <Image source={{ uri }} style={styles.photoThumb} />
                  <TouchableOpacity
                    style={styles.photoRemoveBtn}
                    onPress={() => handleRemovePhoto(i)}
                  >
                    <Text style={styles.photoRemoveText}>✕</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
          )}
        </View>

        {/* Section 3: Service Location & Address (Optional) */}
        <View style={styles.card}>
          <View style={styles.locationHeaderRow}>
            <Text style={styles.cardTitle}>3. Location & Contact (Optional)</Text>
            <TouchableOpacity
              style={styles.gpsBtn}
              onPress={handleDetectLocation}
              disabled={locating}
            >
              {locating ? (
                <ActivityIndicator size="small" color={Colors.accent} />
              ) : (
                <Text style={styles.gpsBtnText}>📍 Auto-Detect</Text>
              )}
            </TouchableOpacity>
          </View>

          <Input
            label="Contact Number (Optional)"
            placeholder="9876543210"
            value={contactNumber}
            onChangeText={(v) => setContactNumber(v.replace(/\D/g, '').slice(0, 10))}
            keyboardType="phone-pad"
            maxLength={10}
            leftIcon={<Text style={styles.prefix}>+91</Text>}
          />

          <View style={styles.row}>
            <Input
              label="Flat / House / Building"
              placeholder="Flat 402"
              value={houseBuilding}
              onChangeText={setHouseBuilding}
              containerStyle={styles.halfInput}
            />
            <Input
              label="Street / Road"
              placeholder="12th Main Road"
              value={street}
              onChangeText={setStreet}
              containerStyle={styles.halfInput}
            />
          </View>

          <View style={styles.row}>
            <Input
              label="Area / Locality"
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
              label="Pincode"
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

          {/* Visual Location Map Preview */}
          <View style={styles.mapPreviewCard}>
            <View style={styles.mapPreviewHeader}>
              <Text style={styles.mapPreviewTitle}>🗺️ Location Map View</Text>
              <TouchableOpacity
                style={styles.mapLaunchBtn}
                onPress={() => {
                  if (latitude && longitude) {
                    Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`);
                  } else {
                    const q = [houseBuilding, street, area, landmark, city, pincode].filter(Boolean).join(', ');
                    Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q || 'Bengaluru')}`);
                  }
                }}
              >
                <Text style={styles.mapLaunchBtnText}>Open in Google Maps ↗</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.mapVisualContainer}>
              <View style={styles.mapTileBackground}>
                <View style={styles.mapRoadH} />
                <View style={styles.mapRoadV} />
                <View style={styles.mapPinBadge}>
                  <Text style={styles.mapPinIcon}>📍</Text>
                  <Text style={styles.mapPinText} numberOfLines={1}>
                    {area || city || 'Service Area Pinpoint'}
                  </Text>
                </View>
              </View>

              {latitude && longitude ? (
                <Text style={styles.gpsCoordText}>
                  📍 GPS Pin: {Number(latitude).toFixed(4)}° N, {Number(longitude).toFixed(4)}° E
                </Text>
              ) : (
                <Text style={styles.gpsCoordText}>
                  📍 {area || city ? `${area ? area + ', ' : ''}${city || ''} (${pincode || ''})` : 'Location pinpoint will show on technician navigation'}
                </Text>
              )}
            </View>
          </View>
        </View>

        {/* Section 4: Schedule (Optional) */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>4. Preferred Time (Optional)</Text>

          <Input
            label="Preferred Date"
            placeholder="YYYY-MM-DD (e.g. 2026-08-25)"
            value={preferredDate}
            onChangeText={setPreferredDate}
          />

          <Text style={styles.label}>Time Slot</Text>
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

        {/* Submit Button */}
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
    marginBottom: Spacing.xs,
  },
  cardSubtitle: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    marginBottom: Spacing.md,
  },
  requiredStar: {
    color: Colors.error,
  },

  locationHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  gpsBtn: {
    backgroundColor: Colors.accentSoft,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  gpsBtnText: {
    fontSize: FontSize.xs,
    color: Colors.accent,
    fontWeight: FontWeight.semibold,
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
  textAreaInput: { height: 95, textAlignVertical: 'top' },
  charCount: {
    fontSize: FontSize.xs,
    color: Colors.muted,
    textAlign: 'right',
    marginTop: Spacing.xs,
  },

  // Photo Styles
  photoActions: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  photoBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderStyle: 'dashed',
    backgroundColor: Colors.bg,
    gap: Spacing.xs,
  },
  photoBtnIcon: { fontSize: 20 },
  photoBtnText: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    fontWeight: FontWeight.medium,
  },
  photoStrip: {
    flexDirection: 'row',
    marginTop: Spacing.xs,
  },
  photoThumbContainer: {
    position: 'relative',
    marginRight: Spacing.md,
  },
  photoThumb: {
    width: 72,
    height: 72,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  photoRemoveBtn: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: Colors.error,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoRemoveText: {
    color: Colors.white,
    fontSize: 11,
    fontWeight: FontWeight.bold,
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

  // Map Preview Styles
  mapPreviewCard: {
    marginTop: Spacing.md,
    backgroundColor: Colors.bg,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  mapPreviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  mapPreviewTitle: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  mapLaunchBtn: {
    backgroundColor: Colors.accentSoft,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: BorderRadius.sm,
  },
  mapLaunchBtnText: {
    fontSize: 11,
    fontWeight: FontWeight.semibold,
    color: Colors.accent,
  },
  mapVisualContainer: {
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  mapTileBackground: {
    height: 100,
    backgroundColor: '#E8ECEF',
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapRoadH: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 14,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#D0D7DE',
  },
  mapRoadV: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 14,
    backgroundColor: '#FFFFFF',
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: '#D0D7DE',
  },
  mapPinBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    paddingHorizontal: Spacing.md,
    paddingVertical: 5,
    borderRadius: BorderRadius.full,
    borderWidth: 1.5,
    borderColor: Colors.accent,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
    gap: 4,
    maxWidth: '85%',
  },
  mapPinIcon: { fontSize: 16 },
  mapPinText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  gpsCoordText: {
    backgroundColor: Colors.white,
    paddingVertical: 6,
    paddingHorizontal: Spacing.sm,
    fontSize: 11,
    color: Colors.textSecondary,
    textAlign: 'center',
    fontWeight: FontWeight.medium,
  },
});
