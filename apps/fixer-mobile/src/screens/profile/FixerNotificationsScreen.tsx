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

interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  data?: Record<string, any> | null;
  isRead: boolean;
  createdAt: string;
}

export function FixerNotificationsScreen({ navigation }: any) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetch = async () => {
    try {
      const { data } = await api.get('/notifications?limit=50');
      const raw = data?.data;
      const items: Notification[] = Array.isArray(raw?.data)
        ? raw.data
        : Array.isArray(raw)
        ? raw
        : [];
      setNotifications(items);
    } catch (err) {
      console.error('[Fetch Fixer Notifications Error]', err);
      setNotifications([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetch();
  }, []);

  const markAsRead = async (id: string) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
    } catch {}
  };

  const markAllRead = async () => {
    try {
      await api.patch('/notifications/read-all');
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch {}
  };

  const handlePressNotification = (item: Notification) => {
    if (!item.isRead) {
      markAsRead(item.id);
    }

    if (item.data?.jobId && navigation) {
      navigation.navigate('MyJobsTab', {
        screen: 'JobDetail',
        params: { jobId: item.data.jobId },
      });
      return;
    }

    if (item.data?.requestId && navigation) {
      navigation.navigate('FeedTab', {
        screen: 'RequestDetail',
        params: { requestId: item.data.requestId },
      });
      return;
    }

    if (item.data?.conversationId && navigation) {
      navigation.navigate('ChatTab', {
        screen: 'ChatRoom',
        params: {
          conversationId: item.data.conversationId,
          otherUserName: 'Customer',
        },
      });
      return;
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'NEW_MATCHING_REQUEST':
        return '🔧';
      case 'QUOTE_ACCEPTED':
        return '🎉';
      case 'QUOTE_REJECTED':
        return '❌';
      case 'JOB_ASSIGNED':
        return '📋';
      case 'NEW_MESSAGE':
        return '💬';
      case 'REVIEW_RECEIVED':
        return '⭐';
      case 'COMPLAINT_UPDATED':
        return '⚠️';
      case 'VERIFICATION_APPROVED':
        return '🛡️';
      case 'VERIFICATION_REJECTED':
        return '⚠️';
      default:
        return '🔔';
    }
  };

  const notifsList = Array.isArray(notifications) ? notifications : [];

  if (loading && notifsList.length === 0) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.accent} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {notifsList.some((n) => !n.isRead) && (
        <TouchableOpacity style={styles.markAllBtn} onPress={markAllRead}>
          <Text style={styles.markAllText}>Mark all as read</Text>
        </TouchableOpacity>
      )}

      <FlatList
        data={notifsList}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetch(); }} />
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.card, !item.isRead && styles.unread]}
            activeOpacity={0.7}
            onPress={() => handlePressNotification(item)}
          >
            <Text style={styles.icon}>{getIcon(item.type)}</Text>
            <View style={styles.info}>
              <Text style={[styles.title, !item.isRead && styles.titleUnread]}>{item.title}</Text>
              <Text style={styles.body} numberOfLines={2}>{item.body}</Text>
              <Text style={styles.time}>
                {new Date(item.createdAt).toLocaleString('en-IN', {
                  day: 'numeric',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </Text>
            </View>
            {!item.isRead && <View style={styles.dot} />}
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>🔔</Text>
            <Text style={styles.emptyTitle}>No notifications</Text>
            <Text style={styles.emptyText}>You're all caught up!</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { padding: Spacing.base },
  markAllBtn: { padding: Spacing.base, alignItems: 'flex-end' },
  markAllText: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.accent },
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  unread: { backgroundColor: '#EFF6FF', borderColor: '#BFDBFE' },
  icon: { fontSize: 24, marginRight: Spacing.md, marginTop: 2 },
  info: { flex: 1 },
  title: { fontSize: FontSize.sm, fontWeight: FontWeight.medium, color: Colors.text },
  titleUnread: { fontWeight: FontWeight.bold, color: Colors.primary },
  body: { fontSize: FontSize.sm, color: Colors.textSecondary, lineHeight: 18, marginTop: 2 },
  time: { fontSize: FontSize.xs, color: Colors.muted, marginTop: Spacing.xs },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.accent, marginTop: 6 },
  empty: { alignItems: 'center', paddingTop: Spacing.xxxl },
  emptyIcon: { fontSize: 48, marginBottom: Spacing.md },
  emptyTitle: { fontSize: FontSize.md, fontWeight: FontWeight.semibold, color: Colors.text, marginBottom: Spacing.xs },
  emptyText: { fontSize: FontSize.sm, color: Colors.muted },
});
