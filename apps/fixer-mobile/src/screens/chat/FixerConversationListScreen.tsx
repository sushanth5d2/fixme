import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Colors, FontSize, FontWeight, Spacing, BorderRadius } from '../../theme/tokens';
import { api } from '../../services/api';
import { useAuthStore } from '../../stores/auth.store';

interface Conversation {
  id: string;
  lastMessageAt: string | null;
  isActive: boolean;
  members: Array<{ user: { id: string; email: string } }>;
}

export function FixerConversationListScreen({ navigation }: any) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const user = useAuthStore((s) => s.user);

  const fetchConversations = useCallback(async () => {
    try {
      const { data } = await api.get('/chat/conversations');
      const raw = data?.data;
      const items: Conversation[] = Array.isArray(raw?.data)
        ? raw.data
        : Array.isArray(raw)
        ? raw
        : [];
      setConversations(items);
    } catch (err) {
      console.error('[Fetch Fixer Conversations Error]', err);
      setConversations([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchConversations();
    }, [fetchConversations]),
  );

  const renderItem = ({ item }: { item: Conversation }) => {
    // Find the other member (the customer)
    const otherMember = item.members?.find((m) => m.user?.id !== user?.id) || item.members?.[0];
    const otherName = otherMember?.user?.email?.split('@')[0] || 'Customer';

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
              ? new Date(item.lastMessageAt).toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit',
                })
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

  if (loading && conversations.length === 0) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.accent} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Messages</Text>
        <Text style={styles.subtitle}>Direct customer chat for assigned repairs</Text>
      </View>
      <FlatList
        data={conversations}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchConversations(); }} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>💬</Text>
            <Text style={styles.emptyTitle}>No messages yet</Text>
            <Text style={styles.emptyText}>Conversations appear here when customers accept your repair quotes.</Text>
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
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xxxl + 20,
    paddingBottom: Spacing.xl,
    borderBottomLeftRadius: BorderRadius.xl,
    borderBottomRightRadius: BorderRadius.xl,
  },
  title: { fontSize: FontSize.xxl, fontWeight: FontWeight.bold, color: Colors.white },
  subtitle: { fontSize: FontSize.sm, color: Colors.muted, marginTop: Spacing.xs },
  list: { padding: Spacing.base, paddingTop: Spacing.md },
  card: {
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    marginBottom: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: Colors.accentSoft,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  avatarText: { fontSize: FontSize.md, fontWeight: FontWeight.bold, color: Colors.accent },
  info: { flex: 1 },
  name: { fontSize: FontSize.base, fontWeight: FontWeight.semibold, color: Colors.text },
  time: { fontSize: FontSize.xs, color: Colors.muted, marginTop: 2 },
  closedBadge: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  closedText: { fontSize: FontSize.xs, color: Colors.error, fontWeight: FontWeight.medium },
  empty: { alignItems: 'center', paddingTop: Spacing.xxxl, paddingHorizontal: Spacing.xl },
  emptyIcon: { fontSize: 48, marginBottom: Spacing.md },
  emptyTitle: { fontSize: FontSize.md, fontWeight: FontWeight.semibold, color: Colors.text, marginBottom: Spacing.xs },
  emptyText: { fontSize: FontSize.sm, color: Colors.muted, textAlign: 'center', lineHeight: 20 },
});
