import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  TextInput,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Colors, FontSize, FontWeight, Spacing, BorderRadius } from '../../theme/tokens';
import { api } from '../../services/api';
import { useAuthStore } from '../../stores/auth.store';

interface Conversation {
  id: string;
  lastMessageAt: string | null;
  lastMessagePreview?: string | null;
  isActive: boolean;
  members: Array<{ user: { id: string; email: string } }>;
}

export function ConversationListScreen({ navigation }: any) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
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
      console.error('[Fetch Customer Conversations Error]', err);
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

  const filteredConversations = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return conversations;

    return conversations.filter((conv) => {
      const otherMember = conv.members?.find((m) => m.user?.id !== user?.id) || conv.members?.[0];
      const otherName = (otherMember?.user?.email?.split('@')[0] || 'Fixer').toLowerCase();
      const email = (otherMember?.user?.email || '').toLowerCase();
      const preview = (conv.lastMessagePreview || '').toLowerCase();

      return otherName.includes(q) || email.includes(q) || preview.includes(q);
    });
  }, [conversations, searchQuery, user?.id]);

  const renderItem = ({ item }: { item: Conversation }) => {
    // Find the other member (the fixer)
    const otherMember = item.members?.find((m) => m.user?.id !== user?.id) || item.members?.[0];
    const otherName = otherMember?.user?.email?.split('@')[0] || 'Fixer Specialist';

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
          <View style={styles.nameRow}>
            <Text style={styles.name}>{otherName}</Text>
            <Text style={styles.time}>
              {item.lastMessageAt
                ? new Date(item.lastMessageAt).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                  })
                : ''}
            </Text>
          </View>
          <Text style={styles.previewText} numberOfLines={1}>
            {item.lastMessagePreview || 'Tap to chat with fixer'}
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
        <Text style={styles.title}>Messages 💬</Text>
        <Text style={styles.subtitle}>Direct chat with your repair specialists ({filteredConversations.length} matching)</Text>

        {/* Search Bar */}
        <View style={styles.searchBar}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search messages by fixer name or text..."
            placeholderTextColor={Colors.muted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            clearButtonMode="while-editing"
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Text style={styles.clearBtn}>✕</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      <FlatList
        data={filteredConversations}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchConversations(); }} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>💬</Text>
            <Text style={styles.emptyTitle}>
              {searchQuery ? 'No matching conversations' : 'No conversations yet'}
            </Text>
            <Text style={styles.emptyText}>
              {searchQuery
                ? 'Try searching with another keyword.'
                : 'Conversations are created when you start a chat from your request, or when a fixer is assigned.'}
            </Text>
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
    backgroundColor: Colors.white,
    paddingHorizontal: Spacing.base,
    paddingTop: Spacing.xl + 10,
    paddingBottom: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  title: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.text },
  subtitle: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 2, marginBottom: Spacing.xs },

  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    marginTop: Spacing.xs,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  searchIcon: { fontSize: 14, marginRight: 6 },
  searchInput: { flex: 1, fontSize: FontSize.sm, color: Colors.text, padding: 0 },
  clearBtn: { fontSize: 14, color: Colors.muted, paddingHorizontal: 4 },

  list: { padding: Spacing.base, paddingTop: Spacing.md },
  card: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    marginBottom: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.accentSoft,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  avatarText: { fontSize: FontSize.md, fontWeight: FontWeight.bold, color: Colors.accent },
  info: { flex: 1 },
  nameRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  name: { fontSize: FontSize.base, fontWeight: FontWeight.semibold, color: Colors.text },
  time: { fontSize: FontSize.xs, color: Colors.muted },
  previewText: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 3 },
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
  emptyText: { fontSize: FontSize.xs, color: Colors.muted, textAlign: 'center', lineHeight: 20 },
});
