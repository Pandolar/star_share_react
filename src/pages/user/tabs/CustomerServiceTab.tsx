import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Skeleton } from '@heroui/react';
import { Headphones } from 'lucide-react';
import { customerServiceApi } from '../../../services/userApi';
import { useCustomerService } from '../../../contexts/CustomerServiceContext';
import ChatComposer from '../../../components/chat/ChatComposer';
import ChatMessageList from '../../../components/chat/ChatMessageList';
import type { ChatAttachment, ChatConversation, ChatMessage } from '../../../components/chat/types';
import { newClientMessageId } from '../../../components/chat/types';
import { toast } from '../../../utils/toast';


const fileData = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('读取附件失败'));
    reader.readAsDataURL(file);
  });

export default function CustomerServiceTab(): React.ReactElement {
  const { config, loading, unreadByConversation, applyConversationRead, refreshUnread } = useCustomerService();
  const [selected, setSelected] = useState<ChatConversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [composerValue, setComposerValue] = useState('');
  const [attachments, setAttachments] = useState<ChatAttachment[]>([]);
  const [sending, setSending] = useState(false);
  const lastMessageId = useRef<number | null>(null);
  const selectedId = selected?.id;

  const loadConversation = useCallback(async () => {
    try {
      const conversation = (await customerServiceApi.getConversations())[0] || null;
      const next = conversation
        ? { ...conversation, unread: Number(unreadByConversation[String(conversation.id)] ?? conversation.unread) || 0 }
        : null;
      setSelected((current) => (next && current?.id === next.id ? { ...current, ...next } : next));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '获取会话失败');
    }
  }, [unreadByConversation]);

  const loadMessages = useCallback(async (conversationId: number, params: { after_id?: number; before_id?: number; silent?: boolean } = {}) => {
    const initialLoad = !params.after_id && !params.before_id && !params.silent;
    setLoadingMessages(initialLoad);
    if (params.before_id) setLoadingMore(true);
    try {
      const response = await customerServiceApi.getMessages({ conversation_id: conversationId, limit: 30, after_id: params.after_id, before_id: params.before_id });
      const readConversation = { ...response.conversation, unread: 0, user_unread: 0 };
      setSelected((current) => (current?.id === conversationId ? readConversation : current));
      setMessages((previous) =>
        params.after_id
          ? [...previous, ...response.messages.filter((item) => !previous.some((known) => known.id === item.id))]
          : params.before_id
            ? [...response.messages, ...previous]
            : response.messages
      );
      setHasMore(response.has_more);
      if (!params.before_id) applyConversationRead(conversationId, response.unread);
      return { ...response, conversation: readConversation };
    } catch (error) {
      if (!params.silent) toast.error(error instanceof Error ? error.message : '获取消息失败');
      throw error;
    } finally {
      if (initialLoad) setLoadingMessages(false);
      if (params.before_id) setLoadingMore(false);
    }
  }, [applyConversationRead]);

  useEffect(() => {
    lastMessageId.current = messages.length ? messages[messages.length - 1].id : null;
  }, [messages]);
  useEffect(() => {
    if (config?.provider === 'builtin') void loadConversation();
  }, [config?.provider, loadConversation]);
  useEffect(() => {
    if (!selectedId) return;
    void loadMessages(selectedId).catch(() => {});
  }, [loadMessages, selectedId]);
  useEffect(() => {
    if (!selectedId || config?.provider !== 'builtin') return;
    const conversationId = selectedId;
    let cancelled = false;
    let timeout: number | undefined;
    let delay = 15_000;
    const schedule = () => {
      window.clearTimeout(timeout);
      if (!cancelled && !document.hidden && document.hasFocus()) timeout = window.setTimeout(tick, delay);
    };
    const tick = async () => {
      if (cancelled || document.hidden || !document.hasFocus()) return;
      try {
        await loadMessages(conversationId, { after_id: lastMessageId.current ?? undefined, silent: true });
        delay = 15_000;
      } catch {
        delay = Math.min(delay * 2, 60_000);
      }
      schedule();
    };
    const refreshActivePage = () => {
      window.clearTimeout(timeout);
      if (!cancelled && !document.hidden && document.hasFocus()) {
        delay = 15_000;
        void refreshUnread(true);
        void loadConversation();
        void tick();
      }
    };
    const pause = () => {
      window.clearTimeout(timeout);
    };
    schedule();
    document.addEventListener('visibilitychange', refreshActivePage);
    window.addEventListener('focus', refreshActivePage);
    window.addEventListener('blur', pause);
    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
      document.removeEventListener('visibilitychange', refreshActivePage);
      window.removeEventListener('focus', refreshActivePage);
      window.removeEventListener('blur', pause);
    };
  }, [config?.provider, loadConversation, loadMessages, refreshUnread, selectedId]);

  const uploadAttachment = async (file: File) =>
    customerServiceApi.uploadAttachment({ data_base64: await fileData(file), filename: file.name, mime_type: file.type, conversation_id: selected?.id });

  const updateConversationAfterSend = (conversation: ChatConversation, message: ChatMessage) => {
    const next = {
      ...conversation,
      status: 'open' as const,
      closed_at: null,
      closed_by: null,
      last_message_at: message.created_at,
      last_message_preview: message.content || '附件消息',
      last_message_role: message.role,
    };
    setSelected((current) => (current?.id === next.id ? next : current));
  };


  const send = async () => {
    if (!composerValue.trim() && !attachments.length) return;
    setSending(true);
    try {
      if (selected) {
        const message = await customerServiceApi.sendMessage({
          conversation_id: selected.id,
          content: composerValue,
          attachment_ids: attachments.map((item) => item.id),
          client_msg_id: newClientMessageId(),
        });
        setMessages((previous) => [...previous, message]);
        updateConversationAfterSend(selected, message);
      } else {
        const conversation = await customerServiceApi.createConversation({
          content: composerValue,
          attachment_ids: attachments.map((attachment) => attachment.id),
          client_msg_id: newClientMessageId(),
          client_context: { page: window.location.pathname, user_agent: navigator.userAgent },
        });
        setSelected(conversation);
        setMessages(conversation.messages || []);
      }
      setComposerValue('');
      setAttachments([]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '发送失败');
    } finally {
      setSending(false);
    }
  };

  if (loading) return <Skeleton className="h-96 rounded-xl" />;
  if (!config || config.provider !== 'builtin') return <div className="py-12 text-center text-default-500">在线客服暂未开启</div>;

  return (
    <section className="flex h-[calc(100dvh-12rem)] min-h-[360px] max-h-[720px] flex-col overflow-hidden rounded-xl border border-default-200 bg-content1 sm:h-[min(70vh,720px)] sm:min-h-[520px]">
      <div className="border-b border-default-200 p-3">
        <p className="font-semibold">在线客服</p>
      </div>
      {selected ? (
        <div className="min-h-0 flex-1 p-3">
          <ChatMessageList
            messages={messages}
            conversationKey={selected.id}
            selfRole="user"
            loading={loadingMessages}
            hasMore={hasMore}
            loadingMore={loadingMore}
            onLoadMore={() => {
              if (messages[0]) void loadMessages(selected.id, { before_id: messages[0].id }).catch(() => {});
            }}
            scope="user"
          />
        </div>
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
          <Headphones size={36} className="mb-3 text-primary" />
          <p className="font-semibold">{config.welcome.title}</p>
          <p className="mt-2 max-w-sm text-sm text-default-500">{config.welcome.message}</p>
        </div>
      )}
      <div className="border-t border-default-200 p-3">
        <ChatComposer
          value={composerValue}
          onValueChange={setComposerValue}
          onSend={() => void send()}
          sending={sending}
          placeholder={selected ? '输入消息…' : '输入消息，开始咨询…'}
          maxLength={config.limits.max_content_length}
          attachmentConfig={config.attachments}
          attachments={attachments}
          onAttachmentsChange={setAttachments}
          uploadAttachment={uploadAttachment}
        />
      </div>
    </section>
  );
}
