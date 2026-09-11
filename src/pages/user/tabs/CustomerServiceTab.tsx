import React, { useEffect, useRef, useState } from 'react';
import { Button, Skeleton } from '@heroui/react';
import { Headphones, Plus } from 'lucide-react';
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
      setSelected((current) => next.find((item) => item.id === current?.id) || current || next[0] || null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '获取会话失败');
    }
  };

  const loadMessages = async (conversationId: number, params: { after_id?: number; before_id?: number; silent?: boolean } = {}) => {
    setLoadingMessages(!params.after_id);
    try {
      const response = await customerServiceApi.getMessages({ conversation_id: conversationId, limit: 30, after_id: params.after_id, before_id: params.before_id });
      setSelected((current) => (current?.id === conversationId ? response.conversation : current));
      setMessages((previous) =>
        params.after_id
          ? [...previous, ...response.messages.filter((item) => !previous.some((known) => known.id === item.id))]
          : params.before_id
            ? [...response.messages, ...previous]
            : response.messages
      );
      setHasMore(response.has_more);
      return response;
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
  }, [selectedId]);
  useEffect(() => {
    if (!selectedId || config?.provider !== 'builtin') return;
    const conversationId = selectedId;
    let cancelled = false;
    let timeout: number | undefined;
    let delay = 15_000;
    const schedule = () => {
      if (!cancelled && !document.hidden) timeout = window.setTimeout(tick, delay);
    };
    const tick = async () => {
      if (cancelled || document.hidden) return;
      try {
        const response = await loadMessages(conversationId, { after_id: lastMessageId.current ?? undefined, silent: true });
        const incomingAdminMessages = response.messages.filter((message) => message.role === 'admin');
        if (incomingAdminMessages.length) {
          setConversations((previous) => previous.map((item) => (item.id === conversationId ? response.conversation : item)));
          await customerServiceApi.markRead(conversationId);
          window.dispatchEvent(new Event('csRead'));
        }
        delay = 15_000;
      } catch {
        delay = Math.min(delay * 2, 60_000);
      }
      schedule();
    };
    const onVisible = () => {
      if (!document.hidden) {
        window.clearTimeout(timeout);
        delay = 15_000;
        void tick();
      }
    };
    schedule();
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [selectedId, config?.provider]);

  const uploadAttachment = async (file: File) =>
    customerServiceApi.uploadAttachment({ data_base64: await fileData(file), filename: file.name, mime_type: file.type, conversation_id: selected?.id });

  const updateConversationAfterSend = (conversation: ChatConversation, message: ChatMessage) => {
    const next = {
      ...conversation,
      last_message_at: message.created_at,
      last_message_preview: message.content || '附件消息',
      last_message_role: message.role,
    };
    setSelected((current) => (current?.id === next.id ? next : current));
    setConversations((previous) => [next, ...previous.filter((item) => item.id !== next.id)]);
  };

  const startNewConversation = () => {
    lastMessageId.current = null;
    setSelected(null);
    setMessages([]);
    setHasMore(false);
    setComposerValue('');
    setAttachments([]);
    setMobileChat(true);
  };

  const openConversation = (conversation: ChatConversation) => {
    if (conversation.id !== selected?.id) {
      lastMessageId.current = null;
      setMessages([]);
      setHasMore(false);
      setSelected(conversation);
    }
    setMobileChat(true);
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
        setConversations((previous) => [conversation, ...previous.filter((item) => item.id !== conversation.id)]);
        setSelected(conversation);
        setMessages(conversation.messages || []);
        setMobileChat(true);
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
    <div className="flex h-[min(70vh,720px)] min-h-[520px] overflow-hidden rounded-xl border border-default-200 bg-content1">
      <aside className={`${mobileChat ? 'hidden md:flex' : 'flex'} w-full shrink-0 flex-col border-r border-default-200 md:w-60`}>
        <div className="flex items-center gap-2 border-b border-default-200 p-3">
          <span className="flex-1 font-semibold">我的咨询</span>
          <Button aria-label="新建对话" size="sm" variant="light" startContent={<Plus size={16} />} onPress={startNewConversation}>
            新建对话
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {conversations.map((conversation) => (
            <Button
              key={conversation.id}
              fullWidth
              variant="light"
              className={`h-auto justify-start rounded-none border-b border-default-100 px-3 py-2.5 text-left ${selected?.id === conversation.id ? 'bg-primary/10' : ''}`}
              onPress={() => openConversation(conversation)}
            >
              <div className="w-full min-w-0">
                <div className="flex items-center gap-2">
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">{conversation.subject || '在线咨询'}</span>
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
