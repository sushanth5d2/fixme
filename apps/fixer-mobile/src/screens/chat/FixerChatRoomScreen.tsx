import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Colors, FontSize, FontWeight, Spacing, BorderRadius } from '../../theme/tokens';
import { api } from '../../services/api';
import { useAuthStore } from '../../stores/auth.store';

interface Message {
  id: string;
  content: string;
  senderId: string;
  sender?: { id: string; email?: string; role?: string };
  isSystemMessage?: boolean;
  createdAt: string;
}

export function FixerChatRoomScreen({ route, navigation }: any) {
  const { conversationId, otherUserName } = route.params || {};
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const user = useAuthStore((s) => s.user);

  const fetchMessages = useCallback(async () => {
    try {
      const { data } = await api.get(`/chat/conversations/${conversationId}/messages?limit=100`);
      const raw = data?.data;
      const items: Message[] = Array.isArray(raw?.data)
        ? raw.data
        : Array.isArray(raw)
        ? raw
        : [];
      // API returns messages descending by createdAt; reverse for bottom-up chat display
      setMessages(items.slice().reverse());
    } catch (err) {
      console.error('[Fetch Fixer Messages Error]', err);
    } finally {
      setLoading(false);
    }
  }, [conversationId]);

  useFocusEffect(
    useCallback(() => {
      fetchMessages();
      const interval = setInterval(fetchMessages, 2000);
      return () => clearInterval(interval);
    }, [fetchMessages]),
  );

  const handleSend = async () => {
    const content = text.trim();
    if (!content || sending) return;

    setSending(true);
    setText('');

    const myUserId = (user as any)?.userId || user?.id || '';

    // Optimistic message
    const optimisticMsg: Message = {
      id: `temp-${Date.now()}`,
      content,
      senderId: myUserId,
      sender: { id: myUserId, email: user?.email, role: 'FIXER' },
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimisticMsg]);
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 50);

    try {
      const { data } = await api.post('/chat/messages', {
        conversationId,
        content,
      });
      const newMsg = data?.data || data;
      setMessages((prev) =>
        prev.map((m) => (m.id === optimisticMsg.id ? newMsg : m)),
      );
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    } catch (err) {
      console.error('[Send Fixer Message Error]', err);
      setMessages((prev) => prev.filter((m) => m.id !== optimisticMsg.id));
      setText(content);
    } finally {
      setSending(false);
    }
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const myUserId = (user as any)?.userId || user?.id;

    // Bulletproof isMe check:
    // 1. If sender role is FIXER, fixer is viewing this app -> isMe is TRUE
    // 2. If senderId matches user's ID -> isMe is TRUE
    // 3. If sender role is CUSTOMER -> isMe is FALSE
    let isMe = false;
    if (item.sender?.role === 'FIXER') {
      isMe = true;
    } else if (item.sender?.role === 'CUSTOMER') {
      isMe = false;
    } else if (myUserId && (item.senderId === myUserId || item.sender?.id === myUserId)) {
      isMe = true;
    }

    const isSystem = item.isSystemMessage;

    if (isSystem) {
      return (
        <View style={styles.systemMsgContainer}>
          <View style={styles.systemBadge}>
            <Text style={styles.systemText}>{item.content}</Text>
          </View>
        </View>
      );
    }

    const timeStr = item.createdAt
      ? new Date(item.createdAt).toLocaleTimeString('en-IN', {
          hour: '2-digit',
          minute: '2-digit',
        })
      : '';

    const partnerDisplayName = otherUserName || (item.sender?.email ? item.sender.email.split('@')[0] : 'Customer');

    return (
      <View style={[styles.msgRow, isMe ? styles.msgRowMe : styles.msgRowOther]}>
        <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleOther]}>
          {!isMe && (
            <Text style={styles.senderLabel}>{partnerDisplayName}</Text>
          )}

          <Text style={[styles.msgText, isMe ? styles.msgTextMe : styles.msgTextOther]}>
            {item.content}
          </Text>

          <View style={styles.timeRow}>
            <Text style={[styles.msgTime, isMe ? styles.msgTimeMe : styles.msgTimeOther]}>
              {timeStr}
            </Text>
            {isMe && <Text style={styles.checkmark}> ✓</Text>}
          </View>
        </View>
      </View>
    );
  };

  if (loading && messages.length === 0) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.accent} />
        <Text style={styles.loadingText}>Loading chat...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {/* Chat Top Banner */}
        <View style={styles.chatHeaderBanner}>
          <View style={styles.headerInfo}>
            <Text style={styles.headerPartnerName}>
              {otherUserName || 'Customer'}
            </Text>
            <View style={styles.statusDotRow}>
              <View style={styles.greenDot} />
              <Text style={styles.statusDotText}>Live Chat with Customer</Text>
            </View>
          </View>
        </View>

        {/* Message Thread List */}
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          contentContainerStyle={styles.messageList}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
          ListEmptyComponent={
            <View style={styles.emptyChat}>
              <Text style={styles.emptyIcon}>💬</Text>
              <Text style={styles.emptyTitle}>No messages yet</Text>
              <Text style={styles.emptySubtitle}>
                Send a greeting and quote updates to your customer!
              </Text>
            </View>
          }
        />

        {/* Input Bar */}
        <View style={styles.inputBar}>
          <TextInput
            style={styles.input}
            placeholder="Type a message to customer..."
            placeholderTextColor={Colors.muted}
            value={text}
            onChangeText={setText}
            multiline
            maxLength={5000}
          />
          <TouchableOpacity
            style={[
              styles.sendBtn,
              (!text.trim() || sending) && styles.sendBtnDisabled,
            ]}
            onPress={handleSend}
            disabled={!text.trim() || sending}
            activeOpacity={0.8}
          >
            {sending ? (
              <ActivityIndicator size="small" color={Colors.white} />
            ) : (
              <Text style={styles.sendText}>Send ➤</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.white },
  container: { flex: 1, backgroundColor: '#F1F5F9' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.bg },
  loadingText: { marginTop: Spacing.sm, color: Colors.muted, fontSize: FontSize.sm },

  chatHeaderBanner: {
    backgroundColor: Colors.white,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  headerInfo: { justifyContent: 'center' },
  headerPartnerName: { fontSize: FontSize.base, fontWeight: FontWeight.bold, color: Colors.text },
  statusDotRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  greenDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#22C55E' },
  statusDotText: { fontSize: 11, color: '#16A34A', fontWeight: FontWeight.medium },

  messageList: { padding: Spacing.base, paddingBottom: Spacing.md },

  msgRow: {
    marginBottom: Spacing.sm,
    width: '100%',
    flexDirection: 'row',
  },
  msgRowMe: {
    justifyContent: 'flex-end',
  },
  msgRowOther: {
    justifyContent: 'flex-start',
  },

  bubble: {
    maxWidth: '78%',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  bubbleMe: {
    backgroundColor: Colors.accent,
    borderBottomRightRadius: 2,
    marginLeft: 45,
  },
  bubbleOther: {
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 2,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginRight: 45,
  },

  senderLabel: {
    fontSize: 11,
    fontWeight: FontWeight.bold,
    color: '#8B5CF6',
    marginBottom: 3,
  },
  msgText: { fontSize: FontSize.base, lineHeight: 21 },
  msgTextMe: { color: '#FFFFFF', fontWeight: FontWeight.normal },
  msgTextOther: { color: '#0F172A', fontWeight: FontWeight.normal },

  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end',
    marginTop: 4,
  },
  msgTime: { fontSize: 10 },
  msgTimeMe: { color: 'rgba(255,255,255,0.8)' },
  msgTimeOther: { color: Colors.muted },
  checkmark: { fontSize: 10, color: '#FFFFFF', fontWeight: FontWeight.bold },

  systemMsgContainer: { alignItems: 'center', marginVertical: Spacing.sm },
  systemBadge: {
    backgroundColor: '#E2E8F0',
    paddingHorizontal: Spacing.md,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  systemText: { fontSize: 11, color: Colors.textSecondary, fontStyle: 'italic' },

  emptyChat: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: Spacing.xxxl },
  emptyIcon: { fontSize: 44, marginBottom: Spacing.sm },
  emptyTitle: { fontSize: FontSize.md, fontWeight: FontWeight.bold, color: Colors.text },
  emptySubtitle: {
    fontSize: FontSize.xs,
    color: Colors.muted,
    textAlign: 'center',
    marginTop: 4,
    paddingHorizontal: Spacing.xl,
  },

  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: Spacing.sm,
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
    gap: Spacing.xs,
  },
  input: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: FontSize.base,
    color: Colors.text,
    maxHeight: 100,
  },
  sendBtn: {
    backgroundColor: Colors.accent,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: { opacity: 0.4 },
  sendText: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, color: Colors.white },
});
