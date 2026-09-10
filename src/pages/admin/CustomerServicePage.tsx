import React, { useCallback, useEffect, useState } from 'react';
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  Chip,
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownTrigger,
  Input,
  Pagination,
  Select,
  SelectItem,
  Spinner,
  Tab,
  Tabs,
  Textarea,
} from '@heroui/react';
import { Headphones, RefreshCw, Search, UserRound } from 'lucide-react';
import adminApiService from '../../services/adminApi';
import type { AdminCsConversation, AdminCsStats } from '../../types/admin';
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
  ['awaiting', '待接待'],
  ['processing', '处理中'],
  ['resolved', '已解决'],
  ['closed', '已关闭'],
];
const STATUSES = [
  { key: 'open', label: '待处理', color: 'warning' as const },
  { key: 'processing', label: '处理中', color: 'primary' as const },
  { key: 'resolved', label: '已解决', color: 'success' as const },
  { key: 'closed', label: '已关闭', color: 'default' as const },
];
const EMPTY_STATS: AdminCsStats = { total: 0, open: 0, processing: 0, resolved: 0, closed: 0, unread_total: 0, awaiting_reply: 0 };
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
const formatDuration = (seconds: number): string =>
  seconds < 60
    ? '不到 1 分钟'
    : seconds < 3600
      ? `${Math.floor(seconds / 60)} 分钟`
      : seconds < 86400
        ? `${Math.floor(seconds / 3600)} 小时`
        : `${Math.floor(seconds / 86400)} 天`;
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
  const [stats, setStats] = useState<AdminCsStats>(EMPTY_STATS);
  const [selected, setSelected] = useState<AdminCsConversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [filter, setFilter] = useState('unread');
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [orderColumn, setOrderColumn] = useState('last_message_at');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [listLoading, setListLoading] = useState(false);
  const [messageLoading, setMessageLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [reply, setReply] = useState('');
  const [attachments, setAttachments] = useState<ChatAttachment[]>([]);
  const [remark, setRemark] = useState('');
  const [quickReplies, setQuickReplies] = useState<{ id: string; title: string; content: string }[]>([]);
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
          category_id: category === 'all' ? undefined : category,
          querystring: query.trim() || undefined,
          order_column: orderColumn,
          order: 'desc',
        });
        setRows(result.data);
        setTotal(result.total);
        setSelected((current) => (current ? result.data.find((item) => item.id === current.id) || current : null));
      } catch (error) {
        if (!silent) showToast(error instanceof Error ? error.message : '获取客服会话失败', 'error');
      } finally {
        if (!silent) setListLoading(false);
      }
    },
    [category, filter, orderColumn, page, query]
  );
  const loadStats = useCallback(async () => {
    if (document.hidden) return;
    try {
      setStats(await adminApiService.getCsStats());
    } catch {
      /* 保持上一次统计 */
    }
  }, []);
  const openConversation = useCallback(
    async (conversation: AdminCsConversation) => {
      setSelected(conversation);
      setMessages([]);
      setAttachments([]);
      setReply('');
      setRemark(conversation.internal_remark || '');
      setMessageLoading(true);
      try {
        const result = await adminApiService.getCsMessages({ conversation_id: conversation.id, limit: 50 });
        setMessages(result.messages);
        await adminApiService.markCsRead(conversation.id);
        void loadList(true);
        void loadStats();
      } catch (error) {
        showToast(error instanceof Error ? error.message : '获取消息失败', 'error');
      } finally {
        setMessageLoading(false);
      }
    },
    [loadList, loadStats]
  );
  const refreshMessages = useCallback(async () => {
    if (!selected || document.hidden) return;
    try {
      const afterId = messages.length ? messages[messages.length - 1].id : undefined;
      const result = await adminApiService.getCsMessages({ conversation_id: selected.id, after_id: afterId, limit: 50 });
      setMessages((current) =>
        afterId && result.messages.length ? [...current, ...result.messages] : afterId ? current : result.messages
      );
      setSelected((current) => (current ? { ...current, ...result.conversation } : current));
    } catch {
      /* 下次轮询重试 */
    }
  }, [messages, selected]);
  useEffect(() => {
    void loadList();
    void loadStats();
  }, [loadList, loadStats]);
  useEffect(() => {
    const timer = window.setInterval(() => {
      void loadList(true);
      void loadStats();
    }, 5000);
    const visible = () => {
      if (!document.hidden) {
        void loadList(true);
        void loadStats();
      }
    };
    document.addEventListener('visibilitychange', visible);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', visible);
    };
  }, [loadList, loadStats]);
  useEffect(() => {
    const timer = window.setInterval(() => void refreshMessages(), 3000);
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
            )
          );
      } catch {
        /* 不影响会话处理 */
      }
    };
    void loadQuickReplies();
  }, []);
  const builtinConfig = config?.provider === 'builtin' ? config : null;
  const attachmentConfig: ChatAttachmentConfig | null = builtinConfig?.attachments ?? null;
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
      setMessages((current) => [...current, message]);
      setReply('');
      setAttachments([]);
      void loadList(true);
      void loadStats();
    } catch (error) {
      showToast(error instanceof Error ? error.message : '发送消息失败', 'error');
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
  const updateConversation = async (payload: { status?: string; internal_remark?: string }) => {
    if (!selected) return;
    try {
      const updated = await adminApiService.updateCsConversation({ id: selected.id, ...payload });
      setSelected(updated);
      setRemark(updated.internal_remark || '');
      showToast('会话已更新', 'success');
      void openConversation(updated);
      void loadList(true);
      void loadStats();
    } catch (error) {
      showToast(error instanceof Error ? error.message : '更新会话失败', 'error');
    }
  };
  const selectedStatus = STATUSES.find((item) => item.key === selected?.status);
  const pages = Math.max(1, Math.ceil(total / pageSize));
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 font-semibold">
            <Headphones className="h-5 w-5 text-primary" />
            在线客服
          </div>
          <Button
            variant="flat"
            isLoading={listLoading}
            startContent={!listLoading && <RefreshCw className="h-4 w-4" />}
            onPress={() => {
              void loadList();
              void loadStats();
            }}
          >
            刷新
          </Button>
        </CardHeader>
        <CardBody className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
          {[
            ['全部', stats.total],
            ['待处理', stats.open],
            ['处理中', stats.processing],
            ['已解决', stats.resolved],
            ['已关闭', stats.closed],
            ['未读会话', stats.unread_total],
            ['待回复', stats.awaiting_reply],
          ].map(([label, value]) => (
            <div key={String(label)} className="rounded-lg bg-default-50 px-3 py-2">
              <div className="text-xs text-default-500">{label}</div>
              <div className="text-xl font-semibold">{value}</div>
            </div>
          ))}
        </CardBody>
      </Card>
      <div className="grid min-h-[680px] gap-4 lg:grid-cols-[360px_minmax(0,1fr)]">
        <Card className="min-h-0">
          <CardBody className="gap-3 overflow-hidden p-3">
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
            <div className="grid grid-cols-2 gap-2">
              <Select
                aria-label="分类筛选"
                selectedKeys={[category]}
                onSelectionChange={(keys) => {
                  setCategory(String(Array.from(keys)[0] || 'all'));
                  setPage(1);
                }}
                size="sm"
              >
                {[{ id: 'all', name: '全部分类' }, ...(builtinConfig?.categories ?? [])].map((item) => (
                  <SelectItem key={item.id}>{item.name}</SelectItem>
                ))}
              </Select>
              <Select
                aria-label="排序方式"
                selectedKeys={[orderColumn]}
                onSelectionChange={(keys) => setOrderColumn(String(Array.from(keys)[0] || 'last_message_at'))}
                size="sm"
              >
                <SelectItem key="last_message_at">最近消息</SelectItem>
                <SelectItem key="last_user_message_at">等待最久</SelectItem>
                <SelectItem key="created_at">创建时间</SelectItem>
              </Select>
            </div>
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
                        <span className="truncate font-medium">{item.user.username || item.user.email || `用户 #${item.user.id}`}</span>
                        {item.admin_unread > 0 && (
                          <Chip size="sm" color="danger" variant="flat">
                            {item.admin_unread}
                          </Chip>
                        )}
                      </div>
                      <div className="mt-1 flex items-center gap-2">
                        <Chip size="sm" variant="flat" color={STATUSES.find((status) => status.key === item.status)?.color || 'default'}>
                          {STATUSES.find((status) => status.key === item.status)?.label || item.status}
                        </Chip>
                        <span className="text-xs text-default-500">{relativeTime(item.last_message_at)}</span>
                      </div>
                      <div className="mt-1 truncate text-xs text-default-500">
                        {item.last_message_preview || item.subject || '暂无消息'}
                      </div>
                      {item.waiting_seconds !== null && item.waiting_seconds >= 3600 && (
                        <div className="mt-1 text-xs text-danger">已等待 {formatDuration(item.waiting_seconds)}</div>
                      )}
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
        <Card className="min-h-0">
          <CardBody className="min-h-0 gap-3 p-4">
            {selected ? (
              <>
                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-divider pb-3">
                  <div>
                    <div className="font-semibold">
                      {selected.subject || '未命名会话'}{' '}
                      <Chip size="sm" variant="flat" color={selectedStatus?.color || 'default'}>
                        {selectedStatus?.label || selected.status}
                      </Chip>
                    </div>
                    <div className="mt-1 text-sm text-default-500">
                      {selected.user.username || '-'} · {selected.user.email || '-'} · 用户 #{selected.user.id}
                    </div>
                  </div>
                  <Dropdown>
                    <DropdownTrigger>
                      <Button size="sm" variant="flat">
                        变更状态
                      </Button>
                    </DropdownTrigger>
                    <DropdownMenu aria-label="变更会话状态" onAction={(key) => void updateConversation({ status: String(key) })}>
                      {STATUSES.filter((item) => item.key !== selected.status).map((item) => (
                        <DropdownItem key={item.key} color={item.key === 'closed' ? 'danger' : 'default'}>
                          {item.label}
                        </DropdownItem>
                      ))}
                    </DropdownMenu>
                  </Dropdown>
                </div>
                <div className="rounded-lg bg-default-50 p-3 text-sm">
                  <div className="flex items-center gap-2 font-medium">
                    <UserRound className="h-4 w-4" />
                    用户资料
                  </div>
                  <div className="mt-2 grid gap-1 text-default-600 sm:grid-cols-2">
                    <span>ID：{selected.user.id}</span>
                    <span>注册：{selected.user.created_at ? new Date(selected.user.created_at).toLocaleString() : '-'}</span>
                    <span>邮箱：{selected.user.email || '-'}</span>
                    <span>待回复：{selected.waiting_seconds === null ? '-' : formatDuration(selected.waiting_seconds)}</span>
                  </div>
                </div>
                {messages
                  .flatMap((message) => message.attachments)
                  .slice(-1)
                  .map((attachment) => (
                    <AttachmentSummary key={attachment.id} attachment={attachment} />
                  ))}
                <div className="min-h-0 flex-1">
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
                    onPickQuickReply={setReply}
                    extraActions={
                      <Dropdown>
                        <DropdownTrigger>
                          <Button size="sm" variant="light">
                            快捷回复
                          </Button>
                        </DropdownTrigger>
                        <DropdownMenu
                          aria-label="客服快捷回复"
                          onAction={(key) => {
                            const item = quickReplies.find((entry) => entry.id === key);
                            if (item) setReply(item.content);
                          }}
                        >
                          {quickReplies.map((item) => (
                            <DropdownItem key={item.id}>{item.title}</DropdownItem>
                          ))}
                        </DropdownMenu>
                      </Dropdown>
                    }
                    footerNote={
                      <div className="flex gap-2">
                        <Textarea
                          aria-label="内部备注"
                          value={remark}
                          onValueChange={setRemark}
                          placeholder="内部备注（用户不可见）"
                          minRows={1}
                          maxRows={3}
                        />
                        <Button color="primary" variant="flat" onPress={() => void updateConversation({ internal_remark: remark })}>
                          保存备注
                        </Button>
                      </div>
                    }
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
