import React, { useState } from 'react';
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
import { Button, Input, PasswordInput } from '../../components/ui';
import { Colors, FontSize, FontWeight, Spacing } from '../../theme/tokens';
import { useAuthStore } from '../../stores/auth.store';
import { AuthStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<AuthStackParamList, 'Signup'>;

export function SignupScreen({ navigation }: Props) {
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const signup = useAuthStore((s) => s.signup);

  const update = (key: string, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.firstName.trim()) e.firstName = 'First name is required';
    if (!form.lastName.trim()) e.lastName = 'Last name is required';
    if (!form.email.includes('@')) e.email = 'Enter a valid email';
    if (!/^[6-9]\d{9}$/.test(form.phone)) e.phone = 'Enter a valid 10-digit Indian mobile number';
    if (form.password.length < 8) e.password = 'Password must be at least 8 characters';
    if (form.password !== form.confirmPassword) e.confirmPassword = 'Passwords do not match';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSignup = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      await signup({
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim().toLowerCase(),
        phone: `+91${form.phone}`,
        password: form.password,
      });
      navigation.replace('OtpVerify', { phone: `+91${form.phone}` });
    } catch (err: any) {
      console.error('[Signup Error]', JSON.stringify({
        message: err?.message,
        status: err?.response?.status,
        data: err?.response?.data,
        code: err?.code,
      }, null, 2));
      Alert.alert(
        'Signup Failed',
        err?.response?.data?.message || err?.message || 'Something went wrong',
      );
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
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Join Fix Me to get your devices repaired</Text>
        </View>

        <View style={styles.form}>
          <View style={styles.row}>
            <Input
              label="First Name"
              placeholder="Ravi"
              value={form.firstName}
              onChangeText={(v) => update('firstName', v)}
              error={errors.firstName}
              containerStyle={styles.halfInput}
            />
            <Input
              label="Last Name"
              placeholder="Kumar"
              value={form.lastName}
              onChangeText={(v) => update('lastName', v)}
              error={errors.lastName}
              containerStyle={styles.halfInput}
            />
          </View>

          <Input
            label="Email"
            placeholder="you@example.com"
            value={form.email}
            onChangeText={(v) => update('email', v)}
            error={errors.email}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <Input
            label="Mobile Number"
            placeholder="9876543210"
            value={form.phone}
            onChangeText={(v) => update('phone', v.replace(/\D/g, '').slice(0, 10))}
            error={errors.phone}
            keyboardType="phone-pad"
            maxLength={10}
            leftIcon={<Text style={styles.prefix}>+91</Text>}
          />

          <PasswordInput
            label="Password"
            placeholder="Min. 8 characters"
            value={form.password}
            onChangeText={(v) => update('password', v)}
            error={errors.password}
          />

          <PasswordInput
            label="Confirm Password"
            placeholder="Re-enter password"
            value={form.confirmPassword}
            onChangeText={(v) => update('confirmPassword', v)}
            error={errors.confirmPassword}
          />

          <Button
            title="Create Account"
            onPress={handleSignup}
            loading={loading}
            size="lg"
          />
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Already have an account?</Text>
          <Button
            title="Sign In"
            onPress={() => navigation.goBack()}
            variant="ghost"
            size="sm"
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.white },
  container: {
    flexGrow: 1,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xxl,
    paddingBottom: Spacing.xxl,
  },
  header: { marginBottom: Spacing.xl },
  title: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  subtitle: { fontSize: FontSize.base, color: Colors.textSecondary },
  form: { gap: Spacing.xs },
  row: { flexDirection: 'row', gap: Spacing.md },
  halfInput: { flex: 1 },
  prefix: {
    fontSize: FontSize.base,
    color: Colors.textSecondary,
    fontWeight: FontWeight.medium,
  },
  footer: {
    marginTop: Spacing.xl,
    alignItems: 'center',
    gap: Spacing.xs,
  },
  footerText: { fontSize: FontSize.sm, color: Colors.textSecondary },
});
