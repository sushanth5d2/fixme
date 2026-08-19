import { Timestamps } from './common';

export interface Conversation extends Timestamps {
  id: string;
  requestId: string;
  jobId: string | null;
  members: ConversationMember[];
  lastMessageAt: string | null;
  lastMessagePreview: string | null;
}

export interface ConversationMember {
  userId: string;
  role: string;
  joinedAt: string;
}

export interface Message extends Timestamps {
  id: string;
  conversationId: string;
  senderId: string;
  content: string | null;
  attachments: MessageAttachment[];
  isRead: boolean;
  readAt: string | null;
  deletedAt: string | null;
}

export interface MessageAttachment {
  id: string;
  messageId: string;
  url: string; // signed URL
  mimeType: string;
  filename: string;
  sizeBytes: number;
}

export interface SendMessageDto {
  content?: string;
  attachmentIds?: string[]; // pre-uploaded object IDs
}

// WebSocket event types
export interface WsTypingEvent {
  conversationId: string;
  userId: string;
  isTyping: boolean;
}

export interface WsMessageEvent extends Message {
  conversationId: string;
}

export interface WsReadReceiptEvent {
  conversationId: string;
  messageId: string;
  userId: string;
  readAt: string;
}
