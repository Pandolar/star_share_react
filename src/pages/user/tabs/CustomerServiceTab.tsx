import React, { useEffect, useRef, useState } from 'react';
import {
  Button,
  Chip,
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownTrigger,
  Input,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  Select,
  SelectItem,
  Skeleton,
} from '@heroui/react';
import { Headphones, MessageSquarePlus, MoreVertical } from 'lucide-react';
import { customerServiceApi } from '../../../services/userApi';
import { useCustomerService } from '../../../contexts/CustomerServiceContext';
import ChatComposer from '../../../components/chat/ChatComposer';
import ChatMessageList from '../../../components/chat/ChatMessageList';
import type { ChatAttachment, ChatConversation, ChatMessage } from '../../../components/chat/types';
import { newClientMessageId } from '../../../components/chat/types';
import { toast } from '../../../utils/toast';

const statusLabel: Record<ChatConversation['status'], string> = {
  open: '待处理',
  processing: '处理中',
  resolved: '已解决',
  closed: '已关闭',
};
const statusColor: Record<ChatConversation['status'], 'warning' | 'primary' | 'success' | 'default'> = {
  open: 'warning',
  processing: 'primary',
  resolved: 'success',
  closed: 'default',
};
const relativeTime = (value: string | null) => (value ? new Date(value).toLocaleDateString() : '');
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
  const [newAttachments, setNewAttachments] = useState<ChatAttachment[]>([]);
  const [newOpen, setNewOpen] = useState(false);
  const [categoryId, setCategoryId] = useState('');
  const [subject, setSubject] = useState('');
  const [initialContent, setInitialContent] = useState('');
  const [creating, setCreating] = useState(false);
  const [mobileChat, setMobileChat] = useState(false);
  const lastMessageId = useRef<number | null>(null);

  const loadConversations = async () => {
    try {
      const next = await customerServiceApi.getConversations();
      setConversations(next);
      setSelected((current) => next.find((item) => item.id === current?.id) || current);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '获取会话失败');
    }
  };
  const loadMessages = async (conversationId: number, params: { after_id?: number; before_id?: number; silent?: boolean } = {}) => {
    setLoadingMessages(!params.after_id);
    try {
      const response = await customerServiceApi.getMessages({
        conversation_id: conversationId,
        limit: 30,
        after_id: params.after_id,
        before_id: params.before_id,
      });
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
    if (!selected) return;
    void loadMessages(selected.id).catch(() => {});
    void customerServiceApi
      .markRead(selected.id)
      .then(() => window.dispatchEvent(new Event('csRead')))
      .catch(() => {});
  }, [selected?.id]);
  useEffect(() => {
    if (!selected || config?.provider !== 'builtin') return;
    const conversationId = selected.id;
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
  }, [selected?.id, config?.provider]);
  const uploadAttachment = async (file: File) =>
    customerServiceApi.uploadAttachment({
      data_base64: await fileData(file),
      filename: file.name,
      mime_type: file.type,
      conversation_id: selected?.id,
    });
  const send = async () => {
    if (!selected) return;
    try {
      const message = await customerServiceApi.sendMessage({
        conversation_id: selected.id,
        content: composerValue,
        attachment_ids: attachments.map((item) => item.id),
        client_msg_id: newClientMessageId(),
      });
      setMessages((previous) => [...previous, message]);
      setComposerValue('');
      setAttachments([]);
      void loadConversations();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '发送失败');
    }
  };
  const createConversation = async () => {
    if (!categoryId || (!initialContent.trim() && !newAttachments.length)) {
      toast.warning('请选择分类并填写问题描述');
      return;
    }
    setCreating(true);
    try {
      const conversation = await customerServiceApi.createConversation({
        category_id: categoryId,
        subject,
        content: initialContent,
        attachment_ids: newAttachments.map((attachment) => attachment.id),
        client_msg_id: newClientMessageId(),
        client_context: { page: window.location.pathname, user_agent: navigator.userAgent },
      });
      setNewOpen(false);
      setCategoryId('');
      setSubject('');
      setInitialContent('');
      setNewAttachments([]);
      await loadConversations();
      setSelected(conversation);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '创建会话失败');
    } finally {
      setCreating(false);
    }
  };
  const changeStatus = async (action: 'close' | 'reopen') => {
    if (!selected) return;
    try {
      const next = await customerServiceApi.updateConversation({ id: selected.id, action });
      setSelected(next);
      setConversations((previous) => previous.map((item) => (item.id === next.id ? next : item)));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '操作失败');
    }
  };
  const content = (
    <div className="flex h-[min(70vh,720px)] min-h-[520px] overflow-hidden rounded-xl border border-default-200 bg-content1">
      <aside className={`${mobileChat ? 'hidden md:flex' : 'flex'} w-full shrink-0 flex-col border-r border-default-200 md:w-80`}>
        <div className="flex items-center justify-between border-b border-default-200 p-3">
          <span className="font-semibold">我的会话</span>
          <Button isIconOnly size="sm" color="primary" aria-label="新建会话" onPress={() => setNewOpen(true)}>
            <MessageSquarePlus size={18} />
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {conversations.map((conversation) => (
            <Button
              key={conversation.id}
              fullWidth
              variant="light"
              className={`h-auto justify-start rounded-none border-b border-default-100 p-3 text-left ${selected?.id === conversation.id ? 'bg-primary/10' : ''}`}
              onPress={() => {
                setSelected(conversation);
                setMobileChat(true);
              }}
            >
              <div className="w-full">
                <div className="flex items-center gap-2">
                  <Chip size="sm" variant="flat">
                    {conversation.category_name}
                  </Chip>
                  <span className="truncate font-medium">{conversation.subject}</span>
                  {conversation.unread > 0 && (
                    <Chip size="sm" color="danger" variant="flat">
                      {conversation.unread}
                    </Chip>
                  )}
                </div>
                <p className="mt-1 truncate text-xs text-default-500">{conversation.last_message_preview}</p>
                <div className="mt-1 flex justify-between">
                  <Chip size="sm" color={statusColor[conversation.status]} variant="flat">
                    {statusLabel[conversation.status]}
                  </Chip>
                  <span className="text-xs text-default-400">{relativeTime(conversation.last_message_at)}</span>
                </div>
              </div>
            </Button>
          ))}
          {!conversations.length && <p className="p-6 text-center text-sm text-default-500">暂无会话</p>}
        </div>
      </aside>
      <section className={`${mobileChat ? 'flex' : 'hidden md:flex'} min-w-0 flex-1 flex-col`}>
        {selected ? (
          <>
            <div className="flex items-center gap-2 border-b border-default-200 p-3">
              <Button className="md:hidden" size="sm" variant="light" onPress={() => setMobileChat(false)}>
                返回
              </Button>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{selected.subject}</p>
                <Chip size="sm" color={statusColor[selected.status]} variant="flat">
                  {statusLabel[selected.status]}
                </Chip>
              </div>
              <Dropdown>
                <DropdownTrigger>
                  <Button isIconOnly size="sm" variant="light" aria-label="会话操作">
                    <MoreVertical size={18} />
                  </Button>
                </DropdownTrigger>
                <DropdownMenu aria-label="会话操作">
                  {selected.status === 'closed' ? (
                    <DropdownItem key="reopen" isDisabled={!config?.limits.allow_reopen} onPress={() => void changeStatus('reopen')}>
                      重新开启
                    </DropdownItem>
                  ) : (
                    <DropdownItem key="close" onPress={() => void changeStatus('close')}>
                      结束会话
                    </DropdownItem>
                  )}
                </DropdownMenu>
              </Dropdown>
            </div>
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
            <div className="border-t border-default-200 p-3">
              <ChatComposer
                value={composerValue}
                onValueChange={setComposerValue}
                onSend={() => void send()}
                disabled={selected.status === 'closed'}
                disabledHint="会话已关闭，请重新开启后发送"
                maxLength={config!.limits.max_content_length}
                attachmentConfig={config!.attachments}
                attachments={attachments}
                onAttachmentsChange={setAttachments}
                uploadAttachment={uploadAttachment}
              />
            </div>
          </>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center text-center">
            <Headphones size={36} className="mb-3 text-primary" />
            <p className="font-semibold">{config?.welcome.title}</p>
            <p className="mt-2 max-w-sm text-sm text-default-500">{config?.welcome.message}</p>
            <Button color="primary" className="mt-4" onPress={() => setNewOpen(true)}>
              新建会话
            </Button>
          </div>
        )}
      </section>
    </div>
  );
  if (loading) return <Skeleton className="h-96 rounded-xl" />;
  if (!config || config.provider !== 'builtin') return <div className="py-12 text-center text-default-500">在线客服暂未开启</div>;
  return (
    <>
      <div>{content}</div>
      <Modal isOpen={newOpen} onOpenChange={setNewOpen}>
        <ModalContent>
          <ModalHeader>新建咨询</ModalHeader>
          <ModalBody>
            <Select
              label="咨询分类"
              selectedKeys={categoryId ? [categoryId] : []}
              onSelectionChange={(keys) => setCategoryId(Array.from(keys)[0] as string)}
            >
              {config.categories.map((category) => (
                <SelectItem key={category.id}>{category.name}</SelectItem>
              ))}
            </Select>
            <Input label="主题" value={subject} onValueChange={setSubject} maxLength={config.limits.max_subject_length} />
            <ChatComposer
              value={initialContent}
              onValueChange={setInitialContent}
              onSend={() => {}}
              sending={creating}
              placeholder="问题描述"
              maxLength={config.limits.max_content_length}
              attachmentConfig={config.attachments}
              attachments={newAttachments}
              onAttachmentsChange={setNewAttachments}
              uploadAttachment={uploadAttachment}
              footerNote="可添加附件后提交咨询"
            />
          </ModalBody>
          <ModalFooter>
            <Button variant="light" onPress={() => setNewOpen(false)}>
              取消
            </Button>
            <Button color="primary" isLoading={creating} onPress={() => void createConversation()}>
              提交
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
}
