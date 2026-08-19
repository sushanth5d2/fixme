import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Button } from '../../components/ui';
import { Colors, FontSize, FontWeight, Spacing, BorderRadius } from '../../theme/tokens';
import { api } from '../../services/api';

interface Address {
  id: string;
  label: string | null;
  houseBuilding: string;
  street: string | null;
  area: string;
  landmark: string | null;
  city: string;
  state: string;
  pincode: string;
  isDefault: boolean;
}

export function AddressListScreen({ navigation }: any) {
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetch = async () => {
    try {
      const { data } = await api.get('/customers/me/addresses');
      setAddresses(data.data || data || []);
    } catch {} finally { setLoading(false); setRefreshing(false); }
  };

  useEffect(() => { fetch(); }, []);

  const handleSetDefault = async (id: string) => {
    try {
      await api.patch(`/customers/me/addresses/${id}/default`);
      fetch();
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message || 'Failed');
    }
  };

  const handleDelete = (id: string) => {
    Alert.alert('Delete Address', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          try { await api.delete(`/customers/me/addresses/${id}`); fetch(); }
          catch (err: any) { Alert.alert('Error', err?.response?.data?.message || 'Failed'); }
        },
      },
    ]);
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={Colors.accent} /></View>;

  return (
    <View style={styles.container}>
      <FlatList
        data={addresses}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetch(); }} />}
        ListHeaderComponent={
          <Button title="+ Add New Address" onPress={() => navigation.navigate('AddAddress')} variant="outline" size="md" style={{ marginBottom: Spacing.md }} />
        }
        renderItem={({ item }) => (
          <View style={[styles.card, item.isDefault && styles.cardDefault]}>
            {item.isDefault && (
              <View style={styles.defaultBadge}><Text style={styles.defaultText}>Default</Text></View>
            )}
            {item.label && <Text style={styles.label}>{item.label}</Text>}
            <Text style={styles.addressLine}>{item.houseBuilding}</Text>
            {item.street && <Text style={styles.addressLine}>{item.street}</Text>}
            <Text style={styles.addressLine}>{item.area}</Text>
            {item.landmark && <Text style={styles.landmark}>Landmark: {item.landmark}</Text>}
            <Text style={styles.cityLine}>{item.city}, {item.state} - {item.pincode}</Text>

            <View style={styles.actions}>
              {!item.isDefault && (
                <TouchableOpacity onPress={() => handleSetDefault(item.id)} style={styles.actionBtn}>
                  <Text style={styles.actionText}>Set Default</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity onPress={() => navigation.navigate('EditAddress', { addressId: item.id })} style={styles.actionBtn}>
                <Text style={styles.actionText}>Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => handleDelete(item.id)} style={styles.actionBtn}>
                <Text style={[styles.actionText, { color: Colors.error }]}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>📍</Text>
            <Text style={styles.emptyTitle}>No addresses yet</Text>
            <Text style={styles.emptyText}>Add your first address to get started</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { padding: Spacing.xl },
  card: {
    backgroundColor: Colors.card, borderRadius: BorderRadius.lg, padding: Spacing.base,
    marginBottom: Spacing.md, borderWidth: 1, borderColor: Colors.borderLight,
  },
  cardDefault: { borderColor: Colors.accent, borderWidth: 1.5 },
  defaultBadge: { backgroundColor: Colors.accentSoft, paddingHorizontal: Spacing.sm, paddingVertical: 2, borderRadius: BorderRadius.full, alignSelf: 'flex-start', marginBottom: Spacing.sm },
  defaultText: { fontSize: FontSize.xs, fontWeight: FontWeight.semibold, color: Colors.accent },
  label: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold, color: Colors.text, marginBottom: Spacing.xs },
  addressLine: { fontSize: FontSize.sm, color: Colors.textSecondary, lineHeight: 20 },
  landmark: { fontSize: FontSize.xs, color: Colors.muted, marginTop: 2 },
  cityLine: { fontSize: FontSize.sm, fontWeight: FontWeight.medium, color: Colors.text, marginTop: Spacing.xs },
  actions: { flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.md, borderTopWidth: 1, borderTopColor: Colors.borderLight, paddingTop: Spacing.sm },
  actionBtn: { paddingVertical: Spacing.xs },
  actionText: { fontSize: FontSize.sm, fontWeight: FontWeight.medium, color: Colors.accent },
  empty: { alignItems: 'center', paddingTop: Spacing.xxxl },
  emptyIcon: { fontSize: 48, marginBottom: Spacing.md },
  emptyTitle: { fontSize: FontSize.md, fontWeight: FontWeight.semibold, color: Colors.text, marginBottom: Spacing.xs },
  emptyText: { fontSize: FontSize.sm, color: Colors.muted },
});
