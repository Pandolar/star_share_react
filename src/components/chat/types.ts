export type ChatRole = 'user' | 'admin' | 'system';
export type ChatConversationStatus = 'open' | 'processing' | 'resolved' | 'closed';
export type ChatAttachmentKind = 'image' | 'document' | 'video' | 'audio';

export interface ChatAttachment {
  id: string;
  kind: ChatAttachmentKind;
  name: string;
  mime_type: string;
  bytes: number;
  width: number | null;
  height: number | null;
}

export interface ChatMessage {
  id: number;
  conversation_id: number;
  role: ChatRole;
  sender_name: string;
  content: string;
  content_type: string;
  attachments: ChatAttachment[];
  created_at: string;
  client_msg_id: string | null;
}

export interface ChatConversation {
  id: number;
  status: ChatConversationStatus;
  category_id: string | null;
  category_name: string;
  subject: string;
  created_at: string;
  updated_at: string;
  last_message_at: string | null;
  last_message_preview: string;
  last_message_role: ChatRole | null;
  unread: number;
  user_unread: number;
  admin_unread: number;
  closed_at: string | null;
  closed_by: string | null;
  reopen_count: number;
  internal_remark: string;
  messages?: ChatMessage[];
}

export interface ChatAttachmentTypeConfig {
  enabled: boolean;
  extensions: string[];
  max_upload_mb: number;
  compress: boolean;
  max_compressed_mb?: number;
  max_edge?: number;
  quality?: number;
}

export interface ChatAttachmentConfig {
  enabled: boolean;
  max_count_per_message: number;
  max_total_mb_per_message: number;
  types: Record<ChatAttachmentKind, ChatAttachmentTypeConfig>;
}

export interface ChatWelcomeConfig {
  title: string;
  message: string;
  working_hours_enabled: boolean;
  offline_message: string;
  auto_reply_enabled: boolean;
  auto_reply_message: string;
}

export type ChatProvider = 'builtin' | 'chatwoot' | 'off';

export interface ChatConfig {
  enabled: boolean;
  provider: ChatProvider;
  entry: {
    tab_enabled: boolean;
    tab_label: string;
    floating_enabled: boolean;
    floating_position: 'right' | 'left';
    floating_bubble: string;
    guest_enabled: boolean;
    guest_login_hint: string;
  };
  categories: { id: string; name: string; description: string }[];
  welcome: ChatWelcomeConfig;
  attachments: ChatAttachmentConfig;
  limits: {
    max_subject_length: number;
    max_content_length: number;
    max_open_conversations_per_user: number;
    auto_close_days: number;
    allow_reopen: boolean;
  };
  badge: { enabled: boolean; max_display: number; show_on_floating: boolean };
}

export const CHAT_KIND_LABELS: Record<ChatAttachmentKind, string> = {
  image: '图片',
  document: '文档',
  video: '视频',
  audio: '音频',
};

export function chatKindOf(attachment: ChatAttachment): ChatAttachmentKind {
  return attachment.kind;
}

/** 幂等用的客户端消息 ID。crypto.randomUUID 仅在安全上下文可用，HTTP 环境下回退到随机数拼接。 */
export function newClientMessageId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  const bytes = new Uint8Array(16);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) crypto.getRandomValues(bytes);
  else for (let index = 0; index < bytes.length; index += 1) bytes[index] = Math.floor(Math.random() * 256);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
