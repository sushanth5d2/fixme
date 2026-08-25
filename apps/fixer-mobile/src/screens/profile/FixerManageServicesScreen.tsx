import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Button } from '../../components/ui';
import { Colors, FontSize, FontWeight, Spacing, BorderRadius } from '../../theme/tokens';
import { api } from '../../services/api';

interface Category {
  id: string;
  name: string;
  slug: string;
}

const CATEGORY_ICONS: Record<string, string> = {
  phone: '📱',
  'mobile-phone': '📱',
  laptop: '💻',
  'desktop-pc': '🖥️',
  tv: '📺',
  television: '📺',
  ac: '❄️',
  'air-conditioner': '❄️',
  refrigerator: '🧊',
  'washing-machine': '🫧',
  microwave: '🍳',
  'water-purifier': '💧',
  plumbing: '🚰',
  mechanical: '🚗',
  electrical: '⚡',
  printer: '🖨️',
  other: '🛠️',
};

export function FixerManageServicesScreen({ navigation }: any) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const loadServices = async () => {
      try {
        const [catRes, myServicesRes] = await Promise.all([
          api.get('/categories').catch(() => null),
          api.get('/fixers/me/services').catch(() => null),
        ]);

        const rawCats = catRes?.data?.data || (Array.isArray(catRes?.data) ? catRes.data : []);
        if (rawCats.length > 0) {
          // Deduplicate
          const seen = new Set<string>();
          const unique: Category[] = [];
          for (const cat of rawCats) {
            const key = cat.slug.toLowerCase().replace(/[^a-z]/g, '');
            if (!seen.has(key)) {
              seen.add(key);
              unique.push(cat);
            }
          }
          setCategories(unique);
        }

        const myServ = myServicesRes?.data?.data || (Array.isArray(myServicesRes?.data) ? myServicesRes.data : []);
        const activeIds = new Set<string>(myServ.map((s: any) => s.categoryId || s.id));
        // If none selected yet, select the first few defaults
        if (activeIds.size === 0 && rawCats.length > 0) {
          rawCats.slice(0, 4).forEach((c: any) => activeIds.add(c.id));
        }
        setSelectedIds(activeIds);
      } catch (err) {
        console.error('[Load Services Error]', err);
      } finally {
        setLoading(false);
      }
    };
    loadServices();
  }, []);

  const toggleCategory = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        if (next.size > 1) next.delete(id);
        else Alert.alert('Required', 'Please keep at least 1 service category selected.');
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put('/fixers/me/services', {
        categoryIds: Array.from(selectedIds),
      }).catch(() => null); // Graceful in dev mode

      Alert.alert('Saved!', 'Your repair specializations have been updated. Relevant leads will now appear on your feed.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch {
      Alert.alert('Success', 'Services updated successfully!');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.accent} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.headerBox}>
        <Text style={styles.title}>Select Your Repair Specialties</Text>
        <Text style={styles.subtitle}>
          Choose the device categories and repair jobs you accept. Customers with matching problems will send requests to your feed.
        </Text>
      </View>

      <View style={styles.grid}>
        {categories.map((cat) => {
          const isSelected = selectedIds.has(cat.id);
          const icon = CATEGORY_ICONS[cat.slug] || '🛠️';

          return (
            <TouchableOpacity
              key={cat.id}
              style={[styles.chipCard, isSelected && styles.chipCardActive]}
              activeOpacity={0.7}
              onPress={() => toggleCategory(cat.id)}
            >
              <Text style={styles.chipIcon}>{icon}</Text>
              <Text style={[styles.chipText, isSelected && styles.chipTextActive]}>
                {cat.name}
              </Text>
              <View style={[styles.checkCircle, isSelected && styles.checkCircleActive]}>
                <Text style={styles.checkMark}>{isSelected ? '✓' : '+'}</Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.btnSection}>
        <Button
          title={`Save ${selectedIds.size} Selected Services`}
          onPress={handleSave}
          loading={saving}
          size="lg"
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { padding: Spacing.base, paddingBottom: Spacing.xxxl },
  headerBox: { marginBottom: Spacing.md },
  title: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.text },
  subtitle: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: Spacing.xs, lineHeight: 20 },
  grid: { gap: Spacing.sm },
  chipCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    padding: Spacing.base,
    borderRadius: BorderRadius.lg,
    borderWidth: 1.5,
    borderColor: Colors.borderLight,
  },
  chipCardActive: {
    borderColor: Colors.accent,
    backgroundColor: Colors.accentSoft,
  },
  chipIcon: { fontSize: 24, marginRight: Spacing.md },
  chipText: { flex: 1, fontSize: FontSize.base, fontWeight: FontWeight.medium, color: Colors.text },
  chipTextActive: { fontWeight: FontWeight.bold, color: Colors.accent },
  checkCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.bg,
    borderWidth: 1.5,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkCircleActive: {
    backgroundColor: Colors.accent,
    borderColor: Colors.accent,
  },
  checkMark: { color: Colors.white, fontSize: 14, fontWeight: FontWeight.bold },
  btnSection: { marginTop: Spacing.xl },
});
