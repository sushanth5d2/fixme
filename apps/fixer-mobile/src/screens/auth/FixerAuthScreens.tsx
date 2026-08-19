import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { Button, Input, PasswordInput } from '../../components/ui';
import { Colors, FontSize, FontWeight, Spacing } from '../../theme/tokens';
import { useAuthStore } from '../../stores/auth.store';

export function FixerLoginScreen({ navigation }: any) {
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
      Alert.alert('Login Failed', err?.response?.data?.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={styles.logo}>🔧</Text>
          <Text style={styles.title}>Fix Me Pro</Text>
          <Text style={styles.subtitle}>Sign in to your fixer account</Text>
        </View>

        <Input label="Email" placeholder="you@company.com" value={email} onChangeText={setEmail}
          keyboardType="email-address" autoCapitalize="none" />
        <PasswordInput label="Password" placeholder="Enter your password" value={password} onChangeText={setPassword} />

        <Button title="Sign In" onPress={handleLogin} loading={loading} size="lg" />

        <View style={styles.footer}>
          <Text style={styles.footerText}>New to Fix Me?</Text>
          <Button title="Register as Fixer" onPress={() => navigation.navigate('Signup')} variant="outline" size="md" />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

export function FixerSignupScreen({ navigation }: any) {
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', phone: '', password: '' });
  const [loading, setLoading] = useState(false);
  const signup = useAuthStore((s) => s.signup);

  const update = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const handleSignup = async () => {
    if (!form.firstName || !form.email.includes('@') || form.password.length < 8) {
      Alert.alert('Error', 'Please fill all fields correctly');
      return;
    }
    setLoading(true);
    try {
      await signup({ ...form, phone: `+91${form.phone}` });
    } catch (err: any) {
      Alert.alert('Signup Failed', err?.response?.data?.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Register as Fixer</Text>
        <Text style={styles.subtitle}>Create your professional repair account</Text>

        <View style={styles.row}>
          <Input label="First Name" value={form.firstName} onChangeText={(v) => update('firstName', v)} containerStyle={styles.half} placeholder="Ravi" />
          <Input label="Last Name" value={form.lastName} onChangeText={(v) => update('lastName', v)} containerStyle={styles.half} placeholder="Kumar" />
        </View>
        <Input label="Email" value={form.email} onChangeText={(v) => update('email', v)} keyboardType="email-address" autoCapitalize="none" placeholder="you@company.com" />
        <Input label="Mobile" value={form.phone} onChangeText={(v) => update('phone', v.replace(/\D/g, '').slice(0, 10))} keyboardType="phone-pad" maxLength={10} placeholder="9876543210" />
        <PasswordInput label="Password" value={form.password} onChangeText={(v) => update('password', v)} placeholder="Min. 8 characters" />

        <Button title="Create Account" onPress={handleSignup} loading={loading} size="lg" />
        <Button title="Already have an account? Sign In" onPress={() => navigation.goBack()} variant="ghost" size="sm" />
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
});
