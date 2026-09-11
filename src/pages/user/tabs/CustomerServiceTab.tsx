import React, { useEffect, useRef, useState } from 'react';
import { Button, Skeleton } from '@heroui/react';
import { Headphones } from 'lucide-react';
import { customerServiceApi } from '../../../services/userApi';
import { useCustomerService } from '../../../contexts/CustomerServiceContext';
import ChatComposer from '../../../components/chat/ChatComposer';
import ChatMessageList from '../../../components/chat/ChatMessageList';
import type { ChatAttachment, ChatConversation, ChatMessage } from '../../../components/chat/types';
import { newClientMessageId } from '../../../components/chat/types';
import { toast } from '../../../utils/toast';

const relativeTime = (value: string | null) => {
  if (!value) return '';
  const date = new Date(value);
  const today = new Date();
  return date.toDateString() === today.toDateString()
    ? date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : date.toLocaleDateString([], { month: 'numeric', day: 'numeric' });
};

const fileData = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('读取附件失败'));
    reader.readAsDataURL(file);
  });

export default function CustomerServiceTab(): React.ReactElement {
  const { config, loading } = useCustomerService();
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [selected, setSelected] = useState<ChatConversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [composerValue, setComposerValue] = useState('');
  const [attachments, setAttachments] = useState<ChatAttachment[]>([]);
  const [sending, setSending] = useState(false);
  const [mobileChat, setMobileChat] = useState(false);
  const lastMessageId = useRef<number | null>(null);
  const selectedId = selected?.id;

  const loadConversations = async () => {
    try {
      const next = await customerServiceApi.getConversations();
      setConversations(next);
      setSelected((current) => next.find((item) => item.id === current?.id) || next[0] || null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '获取会话失败');
    }
  };

  const loadMessages = async (conversationId: number, params: { after_id?: number; before_id?: number; silent?: boolean } = {}) => {
    setLoadingMessages(!params.after_id);
    try {
      const response = await customerServiceApi.getMessages({ conversation_id: conversationId, limit: 30, after_id: params.after_id, before_id: params.before_id });
      setSelected(response.conversation);
      setMessages((previous) =>
        params.after_id
          ? [...previous, ...response.messages.filter((item) => !previous.some((known) => known.id === item.id))]
          : params.before_id
            ? [...response.messages, ...previous]
            : response.messages
      );
      setHasMore(response.has_more);
      return response.messages;
    } catch (error) {
      if (!params.silent) toast.error(error instanceof Error ? error.message : '获取消息失败');
      throw error;
    } finally {
      setLoadingMessages(false);
    }
  };

  useEffect(() => {
    lastMessageId.current = messages.length ? messages[messages.length - 1].id : null;
  }, [messages]);
  useEffect(() => {
    if (config?.provider === 'builtin') void loadConversations();
  }, [config?.provider]);
  useEffect(() => {
    if (!selectedId) return;
    void loadMessages(selectedId).catch(() => {});
    void customerServiceApi.markRead(selectedId).then(() => window.dispatchEvent(new Event('csRead'))).catch(() => {});
  }, [selectedId]);
  useEffect(() => {
    if (!selectedId || config?.provider !== 'builtin') return;
    const conversationId = selectedId;
    let cancelled = false;
    let timeout = 0;
    let delay = 3000;
    const tick = async () => {
      if (!cancelled && !document.hidden) {
        try {
          const incoming = await loadMessages(conversationId, { after_id: lastMessageId.current ?? undefined, silent: true });
          if (incoming.length) {
            await customerServiceApi.markRead(conversationId);
            window.dispatchEvent(new Event('csRead'));
          }
          delay = 3000;
        } catch {
          delay = Math.min(delay * 2, 12000);
        }
      }
      if (!cancelled) timeout = window.setTimeout(tick, delay);
    };
    const onVisible = () => {
      if (!document.hidden) {
        window.clearTimeout(timeout);
        void tick();
      }
    };
    timeout = window.setTimeout(tick, delay);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [selectedId, config?.provider]);

  const uploadAttachment = async (file: File) =>
    customerServiceApi.uploadAttachment({ data_base64: await fileData(file), filename: file.name, mime_type: file.type, conversation_id: selected?.id });

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
      } else {
        const conversation = await customerServiceApi.createConversation({
          content: composerValue,
          attachment_ids: attachments.map((attachment) => attachment.id),
          client_msg_id: newClientMessageId(),
          client_context: { page: window.location.pathname, user_agent: navigator.userAgent },
        });
        await loadConversations();
        setSelected(conversation);
        setMobileChat(true);
      }
      setComposerValue('');
      setAttachments([]);
      void loadConversations();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '发送失败');
    } finally {
      setSending(false);
    }
  };

  if (loading) return <Skeleton className="h-96 rounded-xl" />;
  if (!config || config.provider !== 'builtin') return <div className="py-12 text-center text-default-500">在线客服暂未开启</div>;

  return (
    <div className="flex h-[min(70vh,720px)] min-h-[520px] overflow-hidden rounded-xl border border-default-200 bg-content1">
      <aside className={`${mobileChat ? 'hidden md:flex' : 'flex'} w-full shrink-0 flex-col border-r border-default-200 md:w-60`}>
        <div className="border-b border-default-200 p-3 font-semibold">我的咨询</div>
        <div className="flex-1 overflow-y-auto">
          {conversations.map((conversation) => (
            <Button
              key={conversation.id}
              fullWidth
              variant="light"
              className={`h-auto justify-start rounded-none border-b border-default-100 px-3 py-2.5 text-left ${selected?.id === conversation.id ? 'bg-primary/10' : ''}`}
              onPress={() => {
                setSelected(conversation);
                setMobileChat(true);
              }}
            >
              <div className="w-full min-w-0">
                <div className="flex items-center gap-2">
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">{conversation.last_message_preview || '附件消息'}</span>
                  {conversation.unread > 0 && <span className="flex h-2 w-2 shrink-0 rounded-full bg-danger" aria-label={`${conversation.unread} 条未读`} />}
                  <span className="shrink-0 text-xs text-default-400">{relativeTime(conversation.last_message_at)}</span>
                </div>
                <p className="mt-1 truncate text-xs text-default-500">{conversation.last_message_preview || '暂无消息'}</p>
              </div>
            </Button>
          ))}
          {!conversations.length && <p className="p-6 text-center text-sm text-default-500">暂无咨询记录</p>}
        </div>
      </aside>
      <section className={`${mobileChat || !conversations.length ? 'flex' : 'hidden md:flex'} min-w-0 flex-1 flex-col`}>
        <div className="flex items-center border-b border-default-200 p-3">
          {selected && <Button className="md:hidden" size="sm" variant="light" onPress={() => setMobileChat(false)}>返回</Button>}
          <p className="flex-1 font-semibold">在线客服</p>
        </div>
        {selected ? (
          <div className="min-h-0 flex-1 p-3">
            <ChatMessageList
              messages={messages}
              selfRole="user"
              loading={loadingMessages}
              hasMore={hasMore}
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
    </div>
  );
}
