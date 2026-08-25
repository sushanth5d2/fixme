import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Button, Input } from '../../components/ui';
import { Colors, FontSize, FontWeight, Spacing, BorderRadius } from '../../theme/tokens';
import { api } from '../../services/api';

export function SubmitQuoteScreen({ route, navigation }: any) {
  const { requestId, categoryName, existingQuote: paramQuote } = route.params;
  const [amount, setAmount] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [duration, setDuration] = useState('');
  const [warranty, setWarranty] = useState('30');
  const [loading, setLoading] = useState(false);
  const [fetchingQuote, setFetchingQuote] = useState(true);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    const loadExistingQuote = async () => {
      try {
        if (paramQuote) {
          populateQuote(paramQuote);
          return;
        }
        const { data } = await api.get(`/quotes/request/${requestId}/mine`);
        const q = data?.data || data;
        if (q && q.id) {
          populateQuote(q);
        }
      } catch (err) {
        // No existing quote or error
      } finally {
        setFetchingQuote(false);
      }
    };

    loadExistingQuote();
  }, [requestId, paramQuote]);

  const populateQuote = (q: any) => {
    setIsEditing(true);
    if (q.estimatedTotal || q.amount) setAmount(String(q.estimatedTotal || q.amount));
    if (q.notes || q.diagnosisNotes) setDiagnosis(q.notes || q.diagnosisNotes);
    if (q.estimatedDurationHours) {
      setDuration(String(q.estimatedDurationHours));
    } else if (q.estimatedCompletionDays) {
      setDuration(String(q.estimatedCompletionDays * 24));
    }
    if (q.warrantyDays !== undefined && q.warrantyDays !== null) {
      setWarranty(String(q.warrantyDays));
    }
  };

  const handleSubmit = async () => {
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum < 1) {
      Alert.alert('Error', 'Please enter a valid quote amount');
      return;
    }

    setLoading(true);
    try {
      await api.post('/quotes', {
        requestId,
        amount: amountNum,
        diagnosisNotes: diagnosis || undefined,
        estimatedDurationHours: duration ? parseFloat(duration) : undefined,
        warrantyDays: parseInt(warranty, 10) || 0,
      });

      Alert.alert(
        isEditing ? 'Quote Updated! ✏️' : 'Quote Sent! 🎉',
        isEditing
          ? 'Your updated quote has been saved and sent to the customer.'
          : 'The customer will be notified of your repair quote.',
        [{ text: 'OK', onPress: () => navigation.goBack() }],
      );
    } catch (err: any) {
      console.error('[Submit Quote Error]', err?.response?.data || err);
      const msg = err?.response?.data?.error?.message || err?.response?.data?.message || 'Failed to submit quote';
      Alert.alert('Error', msg);
    } finally {
      setLoading(false);
    }
  };

  if (fetchingQuote) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.accent} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {isEditing && (
          <View style={styles.editNotice}>
            <Text style={styles.editNoticeText}>✏️ Editing your previously submitted quote</Text>
          </View>
        )}

        <View style={styles.badge}>
          <Text style={styles.badgeText}>🔧 {categoryName || 'Device Repair'}</Text>
        </View>

        <Input
          label="Quote Amount (₹) *"
          placeholder="e.g., 2500"
          value={amount}
          onChangeText={setAmount}
          keyboardType="numeric"
        />

        <Input
          label="Diagnosis & Service Notes"
          placeholder="Describe the problem findings and spare parts needed..."
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
            <Text style={styles.summaryLabel}>Total Estimate</Text>
            <Text style={styles.summaryValue}>₹{amount || '0'}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Repair Warranty</Text>
            <Text style={styles.summaryValue}>{warranty || '0'} days</Text>
          </View>
        </View>

        <Button
          title={isEditing ? 'Update Quote ✏️' : 'Send Quote to Customer 💼'}
          onPress={handleSubmit}
          loading={loading}
          size="lg"
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.bg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  container: { flex: 1 },
  content: { padding: Spacing.base, paddingBottom: Spacing.xxxl },
  editNotice: {
    backgroundColor: '#FEF3C7',
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  editNoticeText: { color: '#92400E', fontSize: FontSize.xs, fontWeight: FontWeight.bold, textAlign: 'center' },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.accentSoft,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    marginBottom: Spacing.base,
  },
  badgeText: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold, color: Colors.accent },
  row: { flexDirection: 'row', gap: Spacing.md },
  halfInput: { flex: 1 },
  summary: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    marginTop: Spacing.md,
    marginBottom: Spacing.xl,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  summaryTitle: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold, color: Colors.text, marginBottom: Spacing.sm },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: Spacing.xs },
  summaryLabel: { fontSize: FontSize.sm, color: Colors.textSecondary },
  summaryValue: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.accent },
});
