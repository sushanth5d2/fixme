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
import { Button, Input } from '../../components/ui';
import { Colors, FontSize, FontWeight, Spacing, BorderRadius } from '../../theme/tokens';
import { api } from '../../services/api';

export function SubmitQuoteScreen({ route, navigation }: any) {
  const { requestId, categoryName } = route.params;
  const [amount, setAmount] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [duration, setDuration] = useState('');
  const [warranty, setWarranty] = useState('30');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum < 1) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    setLoading(true);
    try {
      await api.post('/quotes', {
        requestId,
        amount: amountNum,
        diagnosisNotes: diagnosis || undefined,
        estimatedDurationHours: duration ? parseFloat(duration) : undefined,
        warrantyDays: parseInt(warranty) || 0,
      });
      Alert.alert('Quote Sent!', 'The customer will be notified of your quote.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message || 'Failed to submit quote');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.badge}>
          <Text style={styles.badgeText}>🔧 {categoryName}</Text>
        </View>

        <Input
          label="Quote Amount (₹) *"
          placeholder="e.g., 2500"
          value={amount}
          onChangeText={setAmount}
          keyboardType="numeric"
        />

        <Input
          label="Diagnosis Notes"
          placeholder="Describe the issue and what needs to be done..."
          value={diagnosis}
          onChangeText={setDiagnosis}
          multiline
          numberOfLines={4}
          style={{ height: 100, textAlignVertical: 'top' }}
        />

        <View style={styles.row}>
          <Input
            label="Est. Duration (hours)"
            placeholder="e.g., 2.5"
            value={duration}
            onChangeText={setDuration}
            keyboardType="numeric"
            containerStyle={styles.halfInput}
          />
          <Input
            label="Warranty (days)"
            placeholder="e.g., 30"
            value={warranty}
            onChangeText={setWarranty}
            keyboardType="numeric"
            containerStyle={styles.halfInput}
          />
        </View>

        <View style={styles.summary}>
          <Text style={styles.summaryTitle}>Quote Summary</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Amount</Text>
            <Text style={styles.summaryValue}>₹{amount || '0'}</Text>
          </View>
          {duration && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Est. Time</Text>
              <Text style={styles.summaryValue}>{duration} hours</Text>
            </View>
          )}
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Warranty</Text>
            <Text style={styles.summaryValue}>{warranty || '0'} days</Text>
          </View>
        </View>

        <Button
          title="Submit Quote"
          onPress={handleSubmit}
          loading={loading}
          disabled={!amount}
          size="lg"
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1, backgroundColor: Colors.white },
  content: { padding: Spacing.xl, paddingBottom: Spacing.xxxl },
  badge: {
    backgroundColor: Colors.accentSoft, paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm, borderRadius: BorderRadius.full,
    alignSelf: 'flex-start', marginBottom: Spacing.lg,
  },
  badgeText: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold, color: Colors.accent },
  row: { flexDirection: 'row', gap: Spacing.md },
  halfInput: { flex: 1 },
  summary: {
    backgroundColor: Colors.bg, borderRadius: BorderRadius.lg, padding: Spacing.base,
    marginBottom: Spacing.xl, borderWidth: 1, borderColor: Colors.borderLight,
  },
  summaryTitle: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold, color: Colors.text, marginBottom: Spacing.md },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: Spacing.sm },
  summaryLabel: { fontSize: FontSize.sm, color: Colors.textSecondary },
  summaryValue: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold, color: Colors.text },
});
