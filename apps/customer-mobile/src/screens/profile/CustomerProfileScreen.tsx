import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Button } from '../../components/ui';
import { Colors, FontSize, FontWeight, Spacing, BorderRadius } from '../../theme/tokens';
import { useAuthStore } from '../../stores/auth.store';

interface MenuItem {
  icon: string;
  label: string;
  onPress: () => void;
  badge?: number;
}

export function CustomerProfileScreen({ navigation }: any) {
  const { user, logout } = useAuthStore();

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: () => logout() },
    ]);
  };

  const menuItems: MenuItem[] = [
    { icon: '👤', label: 'Edit Profile', onPress: () => navigation.navigate('EditProfile') },
    { icon: '📍', label: 'My Addresses', onPress: () => navigation.navigate('Addresses') },
    { icon: '🔧', label: 'My Jobs', onPress: () => navigation.navigate('MyJobs') },
    { icon: '🔔', label: 'Notifications', onPress: () => navigation.navigate('Notifications') },
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Profile Header */}
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {user?.email?.charAt(0).toUpperCase() || '?'}
          </Text>
        </View>
        <Text style={styles.name}>{user?.email?.split('@')[0] || 'Customer'}</Text>
        <Text style={styles.email}>{user?.email}</Text>
        {user?.phone && <Text style={styles.phone}>{user.phone}</Text>}
      </View>

      {/* Menu Items */}
      <View style={styles.menu}>
        {menuItems.map((item, index) => (
          <TouchableOpacity
            key={index}
            style={styles.menuItem}
            activeOpacity={0.7}
            onPress={item.onPress}
          >
            <Text style={styles.menuIcon}>{item.icon}</Text>
            <Text style={styles.menuLabel}>{item.label}</Text>
            {item.badge !== undefined && item.badge > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{item.badge}</Text>
              </View>
            )}
            <Text style={styles.menuArrow}>›</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Logout */}
      <View style={styles.logoutSection}>
        <Button
          title="Sign Out"
          onPress={handleLogout}
          variant="outline"
          size="md"
        />
        <Text style={styles.version}>Fix Me v1.0.0</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  content: { paddingBottom: Spacing.xxxl },
  header: {
    backgroundColor: Colors.white, alignItems: 'center',
    paddingTop: Spacing.xxxl + 20, paddingBottom: Spacing.xl,
  },
  avatar: {
    width: 80, height: 80, borderRadius: 40, backgroundColor: Colors.accentSoft,
    justifyContent: 'center', alignItems: 'center', marginBottom: Spacing.md,
  },
  avatarText: { fontSize: FontSize.xxl, fontWeight: FontWeight.bold, color: Colors.accent },
  name: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.text },
  email: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: 2 },
  phone: { fontSize: FontSize.sm, color: Colors.muted, marginTop: 2 },

  menu: {
    backgroundColor: Colors.card, marginHorizontal: Spacing.xl, marginTop: Spacing.xl,
    borderRadius: BorderRadius.lg, borderWidth: 1, borderColor: Colors.borderLight,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row', alignItems: 'center', padding: Spacing.base,
    borderBottomWidth: 1, borderBottomColor: Colors.borderLight,
  },
  menuIcon: { fontSize: 20, marginRight: Spacing.md },
  menuLabel: { flex: 1, fontSize: FontSize.base, color: Colors.text },
  menuArrow: { fontSize: FontSize.lg, color: Colors.muted },
  badge: {
    backgroundColor: Colors.error, width: 20, height: 20, borderRadius: 10,
    justifyContent: 'center', alignItems: 'center', marginRight: Spacing.sm,
  },
  badgeText: { fontSize: 10, fontWeight: FontWeight.bold, color: Colors.white },

  logoutSection: {
    paddingHorizontal: Spacing.xl, marginTop: Spacing.xxl,
    gap: Spacing.md, alignItems: 'center',
  },
  version: { fontSize: FontSize.xs, color: Colors.muted },
});
