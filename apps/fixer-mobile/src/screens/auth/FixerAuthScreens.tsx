import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, Alert, TouchableOpacity } from 'react-native';
import { Button, Input, PasswordInput } from '../../components/ui';
import { Colors, FontSize, FontWeight, Spacing, BorderRadius } from '../../theme/tokens';
import { useAuthStore } from '../../stores/auth.store';

export function FixerLoginScreen({ navigation }: any) {
  const [loginType, setLoginType] = useState<'owner' | 'member'>('owner');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const login = useAuthStore((s) => s.login);

  const handleLogin = async () => {
    if (!email.includes('@') || password.length < 6) return;
    setLoading(true);
    try {
      await login(email.trim().toLowerCase(), password);
    } catch (err: any) {
      console.error('[Fixer Login Error]', err?.response?.data || err);
      const msg =
        err?.response?.data?.error?.message ||
        err?.response?.data?.message ||
        err?.message ||
        'Invalid credentials';
      Alert.alert('Login Failed', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={styles.logo}>{loginType === 'owner' ? '🏢' : '🔧'}</Text>
          <Text style={styles.title}>Fix Me Pro</Text>
          <Text style={styles.subtitle}>
            {loginType === 'owner'
              ? 'Sign in as Workshop Owner'
              : 'Sign in as Staff Technician'}
          </Text>
        </View>

        {/* Login Type Selector */}
        <View style={styles.loginTypeRow}>
          <TouchableOpacity
            style={[styles.loginTypeBtn, loginType === 'owner' && styles.loginTypeBtnActive]}
            onPress={() => setLoginType('owner')}
          >
            <Text style={[styles.loginTypeText, loginType === 'owner' && styles.loginTypeTextActive]}>
              🏢 Shop Owner
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.loginTypeBtn, loginType === 'member' && styles.loginTypeBtnActive]}
            onPress={() => setLoginType('member')}
          >
            <Text style={[styles.loginTypeText, loginType === 'member' && styles.loginTypeTextActive]}>
              🔧 Staff Member
            </Text>
          </TouchableOpacity>
        </View>

        <Input
          label={loginType === 'owner' ? 'Owner Email' : 'Staff Login Email'}
          placeholder={loginType === 'owner' ? 'owner@company.com' : 'technician@workshop.com'}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <PasswordInput
          label="Password"
          placeholder="Enter your password"
          value={password}
          onChangeText={setPassword}
        />

        <Button
          title={loginType === 'owner' ? 'Sign In as Owner' : 'Sign In as Staff Member'}
          onPress={handleLogin}
          loading={loading}
          size="lg"
        />

        {loginType === 'owner' ? (
          <View style={styles.footer}>
            <Text style={styles.footerText}>New to Fix Me?</Text>
            <Button
              title="Register New Workshop"
              onPress={() => navigation.navigate('Signup')}
              variant="outline"
              size="md"
            />
          </View>
        ) : (
          <View style={styles.memberHelpBox}>
            <Text style={styles.memberHelpText}>
              💡 Staff credentials are created by your workshop business owner.
            </Text>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

import * as Location from 'expo-location';

export function FixerSignupScreen({ navigation }: any) {
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    companyName: '',
    gstin: '',
    panNumber: '',
    businessRegNo: '',
    experienceYears: '1',
    description: '',
    addressLine: '',
    city: 'Bengaluru',
    state: 'Karnataka',
    pincode: '',
  });
  const [loading, setLoading] = useState(false);
  const [locating, setLocating] = useState(false);
  const signup = useAuthStore((s) => s.signup);

  const update = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const handleDetectLocation = async () => {
    setLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Needed', 'Please allow location permission to auto-detect your workshop address.');
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const [geo] = await Location.reverseGeocodeAsync({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
      if (geo) {
        const line = [geo.name, geo.streetNumber, geo.street].filter(Boolean).join(', ');
        if (line) update('addressLine', line);
        if (geo.city || geo.subregion) update('city', geo.city || geo.subregion || 'Bengaluru');
        if (geo.region) update('state', geo.region || 'Karnataka');
        if (geo.postalCode) update('pincode', geo.postalCode.replace(/\D/g, '').slice(0, 6));
      }
      Alert.alert('Location Detected 📍', 'Workshop address fields populated.');
    } catch {
      Alert.alert('Location Error', 'Could not auto-detect location. Please enter manually.');
    } finally {
      setLocating(false);
    }
  };

  const handleSignup = async () => {
    if (!form.firstName.trim() || !form.email.includes('@') || form.password.length < 8) {
      Alert.alert('Required', 'Please enter your name, valid email, and a password of at least 8 characters.');
      return;
    }
    if (form.phone.replace(/\D/g, '').length < 10) {
      Alert.alert('Required', 'Please enter a valid 10-digit mobile number.');
      return;
    }
    if (!form.companyName.trim()) {
      Alert.alert('Required', 'Please enter your Workshop / Business Name.');
      return;
    }
    if (!form.addressLine.trim() || form.pincode.replace(/\D/g, '').length !== 6) {
      Alert.alert('Required', 'Please enter your workshop address and valid 6-digit pincode.');
      return;
    }

    setLoading(true);
    try {
      await signup({
        ...form,
        phone: form.phone.replace(/\D/g, '').slice(-10),
        pincode: form.pincode.replace(/\D/g, '').slice(0, 6),
        experienceYears: parseInt(form.experienceYears, 10) || 1,
      });
      navigation.navigate('OtpVerify', { phone: form.phone.replace(/\D/g, '').slice(-10) });
    } catch (err: any) {
      console.error('[Fixer Signup Error]', err?.response?.data || err);
      const msg = err?.response?.data?.error?.message || err?.response?.data?.message || err?.message || 'Failed to create fixer account';
      Alert.alert('Signup Failed', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={styles.logo}>🏢</Text>
          <Text style={styles.title}>Register Workshop & KYC</Text>
          <Text style={styles.subtitle}>Create your business account and submit your profile for admin verification</Text>
        </View>

        {/* Section 1: Owner Credentials */}
        <View style={styles.sectionBox}>
          <Text style={styles.sectionTitle}>👤 Owner & Login Credentials</Text>
          <View style={styles.row}>
            <Input label="Owner First Name *" value={form.firstName} onChangeText={(v) => update('firstName', v)} containerStyle={styles.half} placeholder="Ravi" />
            <Input label="Owner Last Name" value={form.lastName} onChangeText={(v) => update('lastName', v)} containerStyle={styles.half} placeholder="Kumar" />
          </View>
          <Input label="Login Email *" value={form.email} onChangeText={(v) => update('email', v)} keyboardType="email-address" autoCapitalize="none" placeholder="owner@company.com" />
          <Input label="Mobile Number *" value={form.phone} onChangeText={(v) => update('phone', v.replace(/\D/g, '').slice(0, 10))} keyboardType="phone-pad" maxLength={10} placeholder="9876543210" />
          <PasswordInput label="Account Password *" value={form.password} onChangeText={(v) => update('password', v)} placeholder="Min. 8 characters" />
        </View>

        {/* Section 2: Business & KYC Identifiers */}
        <View style={styles.sectionBox}>
          <Text style={styles.sectionTitle}>🏢 Business Identity & Tax KYC</Text>
          <Input label="Workshop / Business Name *" value={form.companyName} onChangeText={(v) => update('companyName', v)} placeholder="e.g. Apex Electronics & Mobile Care" />
          <Input label="Years of Experience" value={form.experienceYears} onChangeText={(v) => update('experienceYears', v.replace(/\D/g, ''))} keyboardType="number-pad" placeholder="e.g. 5" />
          <Input label="GSTIN (optional)" value={form.gstin} onChangeText={(v) => update('gstin', v.toUpperCase())} placeholder="22AAAAA0000A1Z5" autoCapitalize="characters" maxLength={15} />
          <Input label="PAN Number (optional)" value={form.panNumber} onChangeText={(v) => update('panNumber', v.toUpperCase())} placeholder="ABCDE1234F" autoCapitalize="characters" maxLength={10} />
          <Input label="Trade License / MSME No. (optional)" value={form.businessRegNo} onChangeText={(v) => update('businessRegNo', v)} placeholder="e.g. UDYAM-KR-03-0012345" />
        </View>

        {/* Section 3: Workshop Location */}
        <View style={styles.sectionBox}>
          <View style={styles.locationHeaderRow}>
            <Text style={styles.sectionTitle}>📍 Workshop Address</Text>
            <TouchableOpacity style={styles.detectBtn} onPress={handleDetectLocation} disabled={locating}>
              <Text style={styles.detectBtnText}>{locating ? 'Locating...' : '📍 Auto-Detect'}</Text>
            </TouchableOpacity>
          </View>
          <Input label="Shop / Building & Street Name *" value={form.addressLine} onChangeText={(v) => update('addressLine', v)} placeholder="Shop 4, Ground Floor, Main Road" />
          <View style={styles.row}>
            <Input label="City *" value={form.city} onChangeText={(v) => update('city', v)} containerStyle={styles.half} placeholder="Bengaluru" />
            <Input label="State *" value={form.state} onChangeText={(v) => update('state', v)} containerStyle={styles.half} placeholder="Karnataka" />
          </View>
          <Input label="Pincode (6 digits) *" value={form.pincode} onChangeText={(v) => update('pincode', v.replace(/\D/g, '').slice(0, 6))} keyboardType="number-pad" maxLength={6} placeholder="560001" />
        </View>

        <Button title="Submit Application & Continue" onPress={handleSignup} loading={loading} size="lg" />
        <Button title="Already registered? Sign In" onPress={() => navigation.goBack()} variant="ghost" size="sm" />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

export function FixerOtpVerifyScreen({ route, navigation }: any) {
  const { phone } = route.params;
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const verifyOtp = useAuthStore((s) => s.verifyOtp);

  const handleVerify = async () => {
    if (!otp.trim() || otp.trim().length < 6) {
      Alert.alert('Required', 'Please enter the 6-digit OTP (use 123456 in test mode).');
      return;
    }

    setLoading(true);
    try {
      await verifyOtp(phone, otp.trim());
    } catch (err: any) {
      console.error('[Fixer OTP Error]', err?.response?.data || err);
      const msg = err?.response?.data?.error?.message || err?.response?.data?.message || err?.message || 'Invalid OTP';
      Alert.alert('Verification Failed', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={styles.logo}>📲</Text>
          <Text style={styles.title}>Verify Mobile Number</Text>
          <Text style={styles.subtitle}>Enter the 6-digit code sent to +91 {phone}</Text>
        </View>

        <Input
          label="6-Digit OTP"
          placeholder="123456"
          value={otp}
          onChangeText={(v) => setOtp(v.replace(/\D/g, '').slice(0, 6))}
          keyboardType="number-pad"
          maxLength={6}
          style={{ fontSize: 24, textAlign: 'center', letterSpacing: 8 }}
        />

        <TouchableOpacity
          style={styles.devBypassBox}
          onPress={() => setOtp('123456')}
        >
          <Text style={styles.devBypassText}>⚡ Testing? Tap here to autofill test OTP (123456)</Text>
        </TouchableOpacity>

        <Button title="Verify & Submit to Admin" onPress={handleVerify} loading={loading} size="lg" />
        <Button title="Change Mobile Number" onPress={() => navigation.goBack()} variant="ghost" size="sm" />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.white },
  container: { flexGrow: 1, paddingHorizontal: Spacing.xl, paddingTop: Spacing.xxxl, paddingBottom: Spacing.xxl, gap: Spacing.xs },
  header: { alignItems: 'center', marginBottom: Spacing.xxl },
  logo: { fontSize: 48, marginBottom: Spacing.md },
  title: { fontSize: FontSize.xxl, fontWeight: FontWeight.bold, color: Colors.text, marginBottom: Spacing.xs, textAlign: 'center' },
  subtitle: { fontSize: FontSize.base, color: Colors.textSecondary, textAlign: 'center', marginBottom: Spacing.lg },
  footer: { marginTop: 'auto', paddingTop: Spacing.xxl, alignItems: 'center', gap: Spacing.md },
  footerText: { fontSize: FontSize.sm, color: Colors.textSecondary },
  row: { flexDirection: 'row', gap: Spacing.md },
  half: { flex: 1 },
  devBypassBox: {
    backgroundColor: Colors.accentSoft,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginVertical: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.accent,
  },
  devBypassText: {
    fontSize: FontSize.xs,
    color: Colors.accent,
    textAlign: 'center',
    fontWeight: FontWeight.semibold,
  },
  loginTypeRow: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderRadius: BorderRadius.lg,
    padding: 4,
    marginBottom: Spacing.md,
  },
  loginTypeBtn: {
    flex: 1,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
    borderRadius: BorderRadius.md,
  },
  loginTypeBtnActive: {
    backgroundColor: Colors.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  loginTypeText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
    color: Colors.muted,
  },
  loginTypeTextActive: {
    color: Colors.text,
    fontWeight: FontWeight.bold,
  },
  memberHelpBox: {
    backgroundColor: '#F3F4F6',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.lg,
  },
  memberHelpText: {
    fontSize: FontSize.xs,
    color: Colors.muted,
    textAlign: 'center',
    lineHeight: 18,
  },
  sectionBox: {
    backgroundColor: '#F9FAFB',
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    gap: Spacing.xs,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  locationHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  detectBtn: {
    backgroundColor: '#F0FDF4',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: '#86EFAC',
  },
  detectBtnText: {
    fontSize: FontSize.xs,
    color: '#16A34A',
    fontWeight: FontWeight.semibold,
  },
});
