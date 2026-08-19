import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Colors, FontSize, FontWeight, Spacing, BorderRadius } from '../../theme/tokens';
import { api } from '../../services/api';

interface Conversation {
  id: string;
  lastMessageAt: string | null;
  isActive: boolean;
  members: Array<{ user: { id: string; email: string } }>;
}

export function ConversationListScreen({ navigation }: any) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetch = async () => {
    try {
      const { data } = await api.get('/chat/conversations');
      setConversations(data.data || data || []);
    } catch {} finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetch(); }, []);

  const renderItem = ({ item }: { item: Conversation }) => {
    const otherMember = item.members?.find((m) => true); // Simplified
    const otherName = otherMember?.user?.email?.split('@')[0] || 'Fixer';

    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.7}
        onPress={() => navigation.navigate('ChatRoom', {
          conversationId: item.id,
          otherUserName: otherName,
        })}
      >
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{otherName.charAt(0).toUpperCase()}</Text>
        </View>
        <View style={styles.info}>
          <Text style={styles.name}>{otherName}</Text>
          <Text style={styles.time}>
            {item.lastMessageAt
              ? new Date(item.lastMessageAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
              : 'No messages yet'}
          </Text>
        </View>
        {!item.isActive && (
          <View style={styles.closedBadge}>
            <Text style={styles.closedText}>Closed</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={Colors.accent} /></View>;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Messages</Text>
      </View>
      <FlatList
        data={conversations}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetch(); }} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>💬</Text>
            <Text style={styles.emptyTitle}>No conversations yet</Text>
            <Text style={styles.emptyText}>Conversations are created when a fixer is assigned to your repair job</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    backgroundColor: Colors.white, paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xxxl + 10, paddingBottom: Spacing.base,
  },
  title: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: Colors.text },
  list: { padding: Spacing.base },
  card: {
    backgroundColor: Colors.card, borderRadius: BorderRadius.lg, padding: Spacing.base,
    marginBottom: Spacing.sm, flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderColor: Colors.borderLight,
  },
  avatar: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.accentSoft,
    justifyContent: 'center', alignItems: 'center', marginRight: Spacing.md,
  },
  avatarText: { fontSize: FontSize.md, fontWeight: FontWeight.bold, color: Colors.accent },
  info: { flex: 1 },
  name: { fontSize: FontSize.base, fontWeight: FontWeight.semibold, color: Colors.text },
  time: { fontSize: FontSize.xs, color: Colors.muted, marginTop: 2 },
  closedBadge: { backgroundColor: Colors.errorBg, paddingHorizontal: Spacing.sm, paddingVertical: 2, borderRadius: BorderRadius.full },
  closedText: { fontSize: FontSize.xs, color: Colors.error, fontWeight: FontWeight.medium },
  empty: { alignItems: 'center', paddingTop: Spacing.xxxl },
  emptyIcon: { fontSize: 48, marginBottom: Spacing.md },
  emptyTitle: { fontSize: FontSize.md, fontWeight: FontWeight.semibold, color: Colors.text, marginBottom: Spacing.xs },
  emptyText: { fontSize: FontSize.sm, color: Colors.muted, textAlign: 'center', paddingHorizontal: Spacing.xl },
});
