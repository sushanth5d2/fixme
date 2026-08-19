import React, { useState, useEffect, useRef } from 'react';
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
} from 'react-native';
import { Colors, FontSize, FontWeight, Spacing, BorderRadius } from '../../theme/tokens';
import { api } from '../../services/api';
import { useAuthStore } from '../../stores/auth.store';

interface Message {
  id: string;
  content: string;
  senderId: string;
  isSystemMessage: boolean;
  createdAt: string;
}

export function ChatRoomScreen({ route }: any) {
  const { conversationId } = route.params;
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const user = useAuthStore((s) => s.user);

  const fetchMessages = async () => {
    try {
      const { data } = await api.get(`/chat/conversations/${conversationId}/messages?limit=50`);
      setMessages((data.data || []).reverse());
    } catch {} finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMessages();
    // Poll for new messages every 5s (Socket.IO will replace this later)
    const interval = setInterval(fetchMessages, 5000);
    return () => clearInterval(interval);
  }, [conversationId]);

  const handleSend = async () => {
    const content = text.trim();
    if (!content || sending) return;

    setSending(true);
    setText('');
    try {
      const { data } = await api.post('/chat/messages', {
        conversationId,
        content,
      });
      const newMsg = data.data || data;
      setMessages((prev) => [...prev, newMsg]);
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    } catch {
      setText(content); // Restore text on error
    } finally {
      setSending(false);
    }
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isMe = item.senderId === user?.id;
    const isSystem = item.isSystemMessage;

    if (isSystem) {
      return (
        <View style={styles.systemMsg}>
          <Text style={styles.systemText}>{item.content}</Text>
        </View>
      );
    }

    return (
      <View style={[styles.msgRow, isMe && styles.msgRowMe]}>
        <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleOther]}>
          <Text style={[styles.msgText, isMe && styles.msgTextMe]}>{item.content}</Text>
          <Text style={[styles.msgTime, isMe && styles.msgTimeMe]}>
            {new Date(item.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
      </View>
    );
  };

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color={Colors.accent} /></View>;
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={renderMessage}
        contentContainerStyle={styles.messageList}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
        ListEmptyComponent={
          <View style={styles.emptyChat}>
            <Text style={styles.emptyText}>Start the conversation 👋</Text>
          </View>
        }
      />

      <View style={styles.inputBar}>
        <TextInput
          style={styles.input}
          placeholder="Type a message..."
          placeholderTextColor={Colors.muted}
          value={text}
          onChangeText={setText}
          multiline
          maxLength={5000}
        />
        <TouchableOpacity
          style={[styles.sendBtn, (!text.trim() || sending) && styles.sendBtnDisabled]}
          onPress={handleSend}
          disabled={!text.trim() || sending}
        >
          <Text style={styles.sendText}>Send</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  messageList: { padding: Spacing.base, paddingBottom: Spacing.sm },

  msgRow: { marginBottom: Spacing.sm, flexDirection: 'row' },
  msgRowMe: { justifyContent: 'flex-end' },
  bubble: {
    maxWidth: '75%', padding: Spacing.md, borderRadius: BorderRadius.lg,
  },
  bubbleMe: {
    backgroundColor: Colors.accent, borderBottomRightRadius: 4,
  },
  bubbleOther: {
    backgroundColor: Colors.card, borderBottomLeftRadius: 4,
    borderWidth: 1, borderColor: Colors.borderLight,
  },
  msgText: { fontSize: FontSize.base, color: Colors.text, lineHeight: 20 },
  msgTextMe: { color: Colors.white },
  msgTime: { fontSize: FontSize.xs, color: Colors.muted, marginTop: 4, alignSelf: 'flex-end' },
  msgTimeMe: { color: 'rgba(255,255,255,0.7)' },

  systemMsg: { alignItems: 'center', marginVertical: Spacing.sm },
  systemText: { fontSize: FontSize.xs, color: Colors.muted, fontStyle: 'italic' },

  emptyChat: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: Spacing.xxxl },
  emptyText: { fontSize: FontSize.base, color: Colors.muted },

  inputBar: {
    flexDirection: 'row', alignItems: 'flex-end', padding: Spacing.sm,
    backgroundColor: Colors.white, borderTopWidth: 1, borderTopColor: Colors.borderLight,
  },
  input: {
    flex: 1, backgroundColor: Colors.bg, borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.base, paddingVertical: Spacing.sm,
    fontSize: FontSize.base, color: Colors.text, maxHeight: 100,
  },
  sendBtn: {
    backgroundColor: Colors.accent, borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.base, paddingVertical: Spacing.sm,
    marginLeft: Spacing.sm, justifyContent: 'center',
  },
  sendBtnDisabled: { opacity: 0.4 },
  sendText: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold, color: Colors.white },
});
