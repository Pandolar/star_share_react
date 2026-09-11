import React, { useCallback, useEffect, useState } from 'react';
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  Input,
  Pagination,
  Spinner,
  Tab,
  Tabs,
  Tooltip,
} from '@heroui/react';
import { ArrowLeft, Headphones, RefreshCw, Search, UserRound } from 'lucide-react';
import adminApiService from '../../services/adminApi';
import type { AdminCsConversation } from '../../types/admin';
import type { ChatAttachment, ChatAttachmentConfig, ChatMessage } from '../../components/chat/types';
import { newClientMessageId } from '../../components/chat/types';
import ChatMessageList from '../../components/chat/ChatMessageList';
import ChatComposer from '../../components/chat/ChatComposer';
import { formatBytes } from '../../components/chat/attachmentCache';
import { useCustomerService } from '../../contexts/CustomerServiceContext';
import { showToast } from '../../components/Toast';

const FILTERS = [
  ['all', '全部'],
  ['unread', '未读'],
];
const relativeTime = (value: string | null) => {
  if (!value) return '-';
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 1000));
  return seconds < 60
    ? '刚刚'
    : seconds < 3600
      ? `${Math.floor(seconds / 60)} 分钟前`
      : seconds < 86400
        ? `${Math.floor(seconds / 3600)} 小时前`
        : `${Math.floor(seconds / 86400)} 天前`;
};
const dataUrlFor = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('读取附件失败'));
    reader.readAsDataURL(file);
  });
const AttachmentSummary: React.FC<{ attachment: ChatAttachment }> = ({ attachment }) => (
  <span className="text-xs text-default-500">
    附件：{attachment.name}（{formatBytes(attachment.bytes)}）
  </span>
);

const CustomerServicePage: React.FC = () => {
  const { config } = useCustomerService();
  const [rows, setRows] = useState<AdminCsConversation[]>([]);
  const [quickReplies, setQuickReplies] = useState<Array<{ id: string; title: string; content: string; attachments?: ChatAttachment[] }>>([]);
  const [selected, setSelected] = useState<AdminCsConversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [filter, setFilter] = useState('unread');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [listLoading, setListLoading] = useState(false);
  const [messageLoading, setMessageLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [reply, setReply] = useState('');
  const [attachments, setAttachments] = useState<ChatAttachment[]>([]);
  const [mobileChat, setMobileChat] = useState(false);
  const pageSize = 20;
  const loadList = useCallback(
    async (silent = false) => {
      if (document.hidden) return;
      if (!silent) setListLoading(true);
      try {
        const result = await adminApiService.getCsConversations({
          current_page: page,
          page_size: pageSize,
          filter,
          querystring: query.trim() || undefined,
          order_column: 'last_message_at',
          order: 'desc',
        });
        const nextRows = result.data;
        setRows(nextRows);
        setTotal(result.total);
        setSelected((current) => {
          if (!current) return null;
          const refreshed = nextRows.find((item) => item.id === current.id);
          return refreshed ? { ...refreshed, admin_unread: 0, unread: 0 } : current;
        });
      } catch (error) {
        if (!silent) showToast(error instanceof Error ? error.message : '获取客服会话失败', 'error');
      } finally {
        if (!silent) setListLoading(false);
      }
    },
    [filter, page, query]
  );
  const openConversation = useCallback(
    async (conversation: AdminCsConversation) => {
      setSelected(conversation);
      setMessages([]);
      setAttachments([]);
      setReply('');
      setMobileChat(true);
      setMessageLoading(true);
      try {
        const result = await adminApiService.getCsMessages({ conversation_id: conversation.id, limit: 50 });
        setMessages(result.messages);
        await adminApiService.markCsRead(conversation.id);
        const readConversation = { ...result.conversation, admin_unread: 0, unread: 0 } as AdminCsConversation;
        setSelected((current) => (current?.id === conversation.id ? { ...current, ...readConversation } : current));
        setRows((current) => current.map((item) => (
          item.id === conversation.id ? { ...item, ...readConversation } : item
        )));
      } catch (error) {
        showToast(error instanceof Error ? error.message : '获取消息失败', 'error');
      } finally {
        setMessageLoading(false);
      }
    },
    []
  );
  const refreshMessages = useCallback(async () => {
    if (!selected || !mobileChat || document.hidden) return;
    try {
      const afterId = messages.length ? messages[messages.length - 1].id : undefined;
      const result = await adminApiService.getCsMessages({ conversation_id: selected.id, after_id: afterId, limit: 50 });
      setMessages((current) =>
        afterId && result.messages.length ? [...current, ...result.messages] : afterId ? current : result.messages
      );
      const hasIncoming = result.messages.some((message) => message.role === 'user');
      if (hasIncoming || result.conversation.admin_unread > 0) {
        await adminApiService.markCsRead(selected.id);
      }
      const readConversation = { ...result.conversation, admin_unread: 0, unread: 0 } as AdminCsConversation;
      setSelected((current) => (current ? { ...current, ...readConversation } : current));
      setRows((current) => current.map((item) => (
        item.id === selected.id ? { ...item, ...readConversation } : item
      )));
    } catch {
      /* 下次轮询重试 */
    }
  }, [messages, mobileChat, selected]);
  useEffect(() => {
    void loadList();
  }, [loadList]);
  useEffect(() => {
    const timer = window.setInterval(() => void loadList(true), 15_000);
    const visible = () => {
      if (!document.hidden) void loadList(true);
    };
    document.addEventListener('visibilitychange', visible);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', visible);
    };
  }, [loadList]);
  useEffect(() => {
    const timer = window.setInterval(() => void refreshMessages(), 10_000);
    return () => window.clearInterval(timer);
  }, [refreshMessages]);
  useEffect(() => {
    const loadQuickReplies = async () => {
      try {
        const response = await adminApiService.getConfigs();
        const raw = response.code === 20000 ? response.data.find((item) => item.key === 'CUSTOMER_SERVICE_CONFIG')?.value : null;
        const parsed = raw ? JSON.parse(raw) : null;
        if (Array.isArray(parsed?.quick_replies))
          setQuickReplies(
            parsed.quick_replies.filter(
              (item: { id?: unknown; title?: unknown; content?: unknown; enabled?: unknown }) =>
                item.enabled !== false && typeof item.id === 'string' && typeof item.title === 'string' && typeof item.content === 'string'
            ) as Array<{ id: string; title: string; content: string; attachments?: ChatAttachment[] }>
          );
      } catch {
        /* 不影响会话处理 */
      }
    };
    void loadQuickReplies();
  }, []);
  const builtinConfig = config?.provider === 'builtin' ? config : null;
  const attachmentConfig: ChatAttachmentConfig | null = builtinConfig?.attachments ?? null;
  const applySentMessage = (conversation: AdminCsConversation, message: ChatMessage) => {
    const next: AdminCsConversation = {
      ...conversation,
      status: conversation.status === 'open' || conversation.status === 'closed' ? 'processing' : conversation.status,
      last_message_at: message.created_at,
      last_message_preview: message.content || '附件消息',
      last_message_role: 'admin',
      admin_unread: 0,
      unread: 0,
    };
    setMessages((current) => [...current, message]);
    setSelected(next);
    setRows((current) => current.map((item) => item.id === next.id ? next : item));
  };
  const sendMessage = async () => {
    if (!selected || (!reply.trim() && !attachments.length)) return;
    setSending(true);
    try {
      const message = await adminApiService.sendCsMessage({
        conversation_id: selected.id,
        content: reply.trim(),
        attachment_ids: attachments.map((item) => item.id),
        client_msg_id: newClientMessageId(),
      });
      applySentMessage(selected, message);
      setReply('');
      setAttachments([]);
      void loadList(true);
    } catch (error) {
      showToast(error instanceof Error ? error.message : '发送消息失败', 'error');
    } finally {
      setSending(false);
    }
  };
  const sendQuickReply = async (quickReplyId: string) => {
    if (!selected || sending) return;
    setSending(true);
    try {
      const message = await adminApiService.sendCsMessage({
        conversation_id: selected.id,
        content: '',
        attachment_ids: [],
        quick_reply_id: quickReplyId,
        client_msg_id: newClientMessageId(),
      });
      applySentMessage(selected, message);
      void loadList(true);
    } catch (error) {
      showToast(error instanceof Error ? error.message : '发送快捷回复失败', 'error');
    } finally {
      setSending(false);
    }
  };
  const uploadAttachment = async (file: File): Promise<ChatAttachment> => {
    if (!selected) throw new Error('请先选择会话');
    return adminApiService.uploadCsAttachment({
      data_base64: await dataUrlFor(file),
      filename: file.name,
      mime_type: file.type || undefined,
      conversation_id: selected.id,
    });
  };
  const pages = Math.max(1, Math.ceil(total / pageSize));
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 font-semibold"><Headphones className="h-5 w-5 text-primary" />在线客服</div>
          <Button variant="flat" isLoading={listLoading} startContent={!listLoading && <RefreshCw className="h-4 w-4" />} onPress={() => void loadList()}>
            刷新
          </Button>
        </CardHeader>
      </Card>
      <div className="grid h-[calc(100dvh-9rem)] min-h-[360px] max-h-[760px] grid-cols-1 gap-4 overflow-hidden lg:h-[min(72vh,760px)] lg:min-h-[520px] lg:grid-cols-[320px_minmax(0,1fr)]">
        <Card className={`${mobileChat ? 'hidden lg:block' : 'block'} min-h-0 overflow-hidden`}>
          <CardBody className="flex h-full min-h-0 flex-col gap-3 overflow-hidden p-3">
            <Tabs
              selectedKey={filter}
              onSelectionChange={(key) => {
                setFilter(String(key));
                setPage(1);
              }}
              aria-label="会话筛选"
              size="sm"
            >
              {FILTERS.map(([key, label]) => (
                <Tab key={key} title={label} />
              ))}
            </Tabs>
            <Input
              value={query}
              onValueChange={(value) => {
                setQuery(value);
                setPage(1);
              }}
              placeholder="搜索用户或消息"
              startContent={<Search className="h-4 w-4" />}
            />
            <div className="min-h-0 flex-1 overflow-y-auto">
              {listLoading && !rows.length ? (
                <div className="flex justify-center py-10">
                  <Spinner label="加载中" />
                </div>
              ) : rows.length ? (
                rows.map((item) => (
                  <Button
                    key={item.id}
                    variant={selected?.id === item.id ? 'flat' : 'light'}
                    color={selected?.id === item.id ? 'primary' : 'default'}
                    className="mb-1 h-auto w-full justify-start px-3 py-3 text-left"
                    onPress={() => void openConversation(item)}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={`h-2.5 w-2.5 shrink-0 rounded-full ${
                            ['resolved', 'closed'].includes(item.status)
                              ? 'bg-success-700'
                              : item.admin_unread > 0
                                ? 'bg-danger'
                                : 'bg-success-300'
                          }`}
                          aria-label={['resolved', 'closed'].includes(item.status) ? '已完成' : item.admin_unread > 0 ? '未查看' : '已查看'}
                        />
                        <span className="min-w-0 flex-1 truncate text-sm font-medium">
                          {item.user.profile.username || item.user.profile.email || `用户 ${item.user.id}`}
                        </span>
                        <span className="shrink-0 text-xs text-default-500">{relativeTime(item.last_message_at)}</span>
                      </div>
                      <div className="mt-1 flex items-center gap-2 text-xs text-default-500">
                        <span className="shrink-0">{['resolved', 'closed'].includes(item.status) ? '已完成' : item.admin_unread > 0 ? '未查看' : '已查看'}</span>
                        <span className="truncate">{item.last_message_preview || '暂无消息'}</span>
                      </div>
                    </div>
                  </Button>
                ))
              ) : (
                <div className="py-10 text-center text-sm text-default-500">暂无会话</div>
              )}
            </div>
            {pages > 1 && <Pagination page={page} total={pages} size="sm" onChange={setPage} className="justify-center" />}
          </CardBody>
        </Card>
        <Card className={`${mobileChat ? 'block' : 'hidden lg:block'} min-h-0 min-w-0 overflow-hidden`}>
          <CardBody className="flex h-full min-h-0 flex-col gap-3 overflow-hidden p-3 sm:p-4">
            {selected ? (
              <>
                <div className="flex items-center justify-between gap-3 border-b border-divider pb-3">
                  <Button isIconOnly className="lg:hidden" size="sm" variant="light" aria-label="返回会话列表" onPress={() => setMobileChat(false)}>
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 font-semibold">
                      <span className="truncate">{selected.user.profile.username || selected.user.profile.email || '用户'}</span>
                      {selected.admin_unread > 0 && <span className="h-2 w-2 rounded-full bg-danger" aria-label="有未读消息" />}
                    </div>
                    <div className="mt-1 text-sm text-default-500">与 Nice 的对话</div>
                  </div>
                  <Tooltip
                    placement="bottom-end"
                    content={
                      <div className="min-w-60 space-y-2 p-1 text-sm">
                        <div className="font-medium">用户信息</div>
                        <div className="grid gap-1 text-default-600">
                          <span>用户名：{selected.user.profile.username || '-'}</span>
                          <span>邮箱：{selected.user.profile.email || '-'}</span>
                          <span>注册：{selected.user.profile.created_at ? new Date(selected.user.profile.created_at).toLocaleString() : '-'}</span>
                          <span>当前套餐：{selected.user.billing.current_package?.name || '-'}</span>
                          <span>套餐状态：{selected.user.billing.current_package?.status || '-'}</span>
                          <span>现金订单：{selected.user.billing.paid_orders} 笔 / ¥{selected.user.billing.paid_amount.toFixed(2)}</span>
                          <span>最近支付：{selected.user.billing.last_paid_at ? new Date(selected.user.billing.last_paid_at).toLocaleString() : '-'}</span>
                        </div>
                      </div>
                    }
                  >
                    <Button size="sm" variant="flat" startContent={<UserRound className="h-4 w-4" />}>
                      用户信息
                    </Button>
                  </Tooltip>
                </div>
                {messages
                  .flatMap((message) => message.attachments)
                  .slice(-1)
                  .map((attachment) => (
                    <AttachmentSummary key={attachment.id} attachment={attachment} />
                  ))}
                <div className="min-h-0 flex-1 overflow-hidden">
                  <ChatMessageList messages={messages} selfRole="admin" loading={messageLoading} emptyText="暂无消息" scope="admin" />
                </div>
                {attachmentConfig ? (
                  <ChatComposer
                    value={reply}
                    onValueChange={setReply}
                    onSend={() => void sendMessage()}
                    sending={sending}
                    maxLength={builtinConfig?.limits.max_content_length ?? 2000}
                    attachmentConfig={attachmentConfig}
                    attachments={attachments}
                    onAttachmentsChange={setAttachments}
                    uploadAttachment={uploadAttachment}
                    quickReplies={quickReplies}
                    onPickQuickReply={(id) => void sendQuickReply(id)}
                  />
                ) : (
                  <div className="text-sm text-warning">客服配置尚未加载，暂不能发送消息。</div>
                )}
              </>
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-3 text-default-500">
                <Headphones className="h-10 w-10" />
                <span>请选择左侧会话开始处理</span>
              </div>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
};
export default CustomerServicePage;
