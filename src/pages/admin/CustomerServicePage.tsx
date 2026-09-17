import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Button,
  Card,
  Checkbox,
  CardBody,
  CardHeader,
  Input,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  Pagination,
  Spinner,
  Tab,
  Tabs,
  Tooltip,
  Textarea,
} from '@heroui/react';
import { ArrowLeft, Bell, BellOff, Headphones, Plus, RefreshCw, Search, Send, UserRound } from 'lucide-react';
import adminApiService from '../../services/adminApi';
import type { AdminCsConversation } from '../../types/admin';
import type { ChatAttachment, ChatAttachmentConfig, ChatMessage } from '../../components/chat/types';
import { newClientMessageId } from '../../components/chat/types';
import ChatMessageList from '../../components/chat/ChatMessageList';
import ChatComposer from '../../components/chat/ChatComposer';
import { formatBytes } from '../../components/chat/attachmentCache';
import { useCustomerService } from '../../contexts/CustomerServiceContext';
import { showToast } from '../../components/Toast';
import { useAdminAuth } from '../../contexts/AdminAuthContext';

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
  const { can } = useAdminAuth();
  const canSend = can('customer_service.message.send');
  const canBatchSend = can('customer_service.message.batch_send');
  const canRecall = can('customer_service.message.recall');
  const canManageQuickReplies = can('customer_service.quick_reply.manage');
  const canUpload = can('customer_service.attachment.upload');
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
  // 撤回时限来自后台配置的原始 JSON（用户侧 public_config 会剔除 admin 段）。
  const [recallWindowMinutes, setRecallWindowMinutes] = useState(10);
  const [recallTarget, setRecallTarget] = useState<ChatMessage | null>(null);
  const [recalling, setRecalling] = useState(false);
  const [reply, setReply] = useState('');
  const [attachments, setAttachments] = useState<ChatAttachment[]>([]);
  const [batchSelection, setBatchSelection] = useState<Set<number>>(new Set());
  const [batchReplyOpen, setBatchReplyOpen] = useState(false);
  const [batchReply, setBatchReply] = useState('');
  const [batchQuickReplyId, setBatchQuickReplyId] = useState<string | undefined>();
  const [batchSending, setBatchSending] = useState(false);
  const [quickPhraseOpen, setQuickPhraseOpen] = useState(false);
  const [quickPhraseTitle, setQuickPhraseTitle] = useState('');
  const [quickPhraseContent, setQuickPhraseContent] = useState('');
  const [quickPhraseSaving, setQuickPhraseSaving] = useState(false);
  const [mobileChat, setMobileChat] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission | 'unsupported'>(() => (
    typeof Notification === 'undefined' ? 'unsupported' : Notification.permission
  ));
  const listRequestId = useRef(0);
  const messageRequestId = useRef(0);
  const refreshRequestId = useRef(0);
  const activeConversationId = useRef<number | null>(null);
  const batchClientMessageId = useRef('');
  const lastListRequest = useRef({ key: '', at: 0 });
  const activeRefreshAt = useRef(0);
  const notifiedMessageAt = useRef(new Map<number, string>());
  const notificationBaselineReady = useRef(false);
  const openConversationRef = useRef<((conversation: AdminCsConversation) => void) | null>(null);
  const notificationPermissionRef = useRef(notificationPermission);
  notificationPermissionRef.current = notificationPermission;
  activeConversationId.current = selected?.id ?? null;
  const pageSize = 20;
  const loadList = useCallback(
    async (silent = false) => {
      if (silent && (document.hidden || !document.hasFocus())) return;
      const requestKey = `${page}:${filter}:${query.trim()}`;
      const now = Date.now();
      if (lastListRequest.current.key === requestKey && now - lastListRequest.current.at < 250) return;
      lastListRequest.current = { key: requestKey, at: now };
      const requestId = ++listRequestId.current;
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
        if (requestId !== listRequestId.current) return;
        const nextRows = result.data;
        setRows(nextRows);
        const visibleIds = new Set(nextRows.map((item) => item.id));
        setBatchSelection((current) => new Set(Array.from(current).filter((id) => visibleIds.has(id))));
        setTotal(result.total);
        if (notificationBaselineReady.current && notificationPermissionRef.current === 'granted') {
          nextRows.forEach((item) => {
            const lastNotifiedAt = notifiedMessageAt.current.get(item.id);
            if (
              item.admin_unread > 0
              && item.last_message_role === 'user'
              && item.last_message_at
              && lastNotifiedAt !== item.last_message_at
            ) {
              const displayName = item.user.profile.username || item.user.profile.email || `用户 ${item.user.id}`;
              const notification = new Notification(`在线客服新消息 · ${displayName}`, {
                body: item.last_message_preview || '用户发来了一条新消息',
                icon: '/logo192.png',
                tag: `cs-conversation-${item.id}`,
              });
              notification.onclick = () => {
                window.focus();
                notification.close();
                openConversationRef.current?.(item);
              };
            }
          });
        }
        nextRows.forEach((item) => {
          if (item.last_message_at) notifiedMessageAt.current.set(item.id, item.last_message_at);
        });
        notificationBaselineReady.current = true;
        setSelected((current) => {
          if (!current) return null;
          const refreshed = nextRows.find((item) => item.id === current.id);
          return refreshed ? { ...refreshed, admin_unread: 0, unread: 0 } : current;
        });
      } catch (error) {
        if (requestId === listRequestId.current && !silent) {
          showToast(error instanceof Error ? error.message : '获取客服会话失败', 'error');
        }
      } finally {
        if (requestId === listRequestId.current && !silent) setListLoading(false);
      }
    },
    [filter, page, query]
  );
  const openConversation = useCallback(
    async (conversation: AdminCsConversation) => {
      const requestId = ++messageRequestId.current;
      activeConversationId.current = conversation.id;
      refreshRequestId.current += 1;
      setSelected(conversation);
      setMessages([]);
      setAttachments([]);
      setReply('');
      setRecallTarget(null);
      setMobileChat(true);
      setMessageLoading(true);
      try {
        const result = await adminApiService.getCsMessages({ conversation_id: conversation.id, limit: 50 });
        if (requestId !== messageRequestId.current || activeConversationId.current !== conversation.id) return;
        setMessages(result.messages);
        await adminApiService.markCsRead(conversation.id);
        if (requestId !== messageRequestId.current || activeConversationId.current !== conversation.id) return;
        const readConversation = { ...result.conversation, admin_unread: 0, unread: 0 } as AdminCsConversation;
        setSelected((current) => (current?.id === conversation.id ? { ...current, ...readConversation } : current));
        setRows((current) => current.map((item) => (
          item.id === conversation.id ? { ...item, ...readConversation } : item
        )));
      } catch (error) {
        if (requestId === messageRequestId.current && activeConversationId.current === conversation.id) {
          showToast(error instanceof Error ? error.message : '获取消息失败', 'error');
        }
      } finally {
        if (requestId === messageRequestId.current) setMessageLoading(false);
      }
    },
    []
  );
  openConversationRef.current = (conversation) => {
    void openConversation(conversation);
  };
  const refreshMessages = useCallback(async () => {
    if (!selected || !mobileChat || document.hidden || !document.hasFocus()) return;
    const conversationId = selected.id;
    const requestId = ++refreshRequestId.current;
    const afterId = messages.length ? messages[messages.length - 1].id : undefined;
    try {
      const result = await adminApiService.getCsMessages({ conversation_id: conversationId, after_id: afterId, limit: 50 });
      if (requestId !== refreshRequestId.current || activeConversationId.current !== conversationId) return;
      setMessages((current) => {
        if (!afterId) return result.messages;
        const known = new Set(current.map((message) => message.id));
        return [...current, ...result.messages.filter((message) => !known.has(message.id))];
      });
      const hasIncoming = result.messages.some((message) => message.role === 'user');
      if (hasIncoming || result.conversation.admin_unread > 0) {
        await adminApiService.markCsRead(conversationId);
      }
      if (requestId !== refreshRequestId.current || activeConversationId.current !== conversationId) return;
      const readConversation = { ...result.conversation, admin_unread: 0, unread: 0 } as AdminCsConversation;
      setSelected((current) => (current?.id === conversationId ? { ...current, ...readConversation } : current));
      setRows((current) => current.map((item) => (
        item.id === conversationId ? { ...item, ...readConversation } : item
      )));
    } catch {
      /* 下次轮询重试 */
    }
  }, [messages, mobileChat, selected]);
  const requestBrowserNotificationPermission = async () => {
    if (typeof Notification === 'undefined') {
      showToast('当前浏览器不支持系统通知', 'warning');
      return;
    }
    if (Notification.permission === 'denied') {
      setNotificationPermission('denied');
      showToast('通知权限已被浏览器拒绝，请在地址栏的网站设置中改为允许', 'warning');
      return;
    }
    const permission = await Notification.requestPermission();
    setNotificationPermission(permission);
    if (permission === 'granted') showToast('浏览器通知已开启', 'success');
    else showToast('浏览器通知未开启', 'warning');
  };
  useEffect(() => {
    void loadList();
  }, [loadList]);
  useEffect(() => {
    const refreshActivePage = () => {
      if (typeof Notification !== 'undefined') setNotificationPermission(Notification.permission);
      if (document.hidden || !document.hasFocus()) return;
      const now = Date.now();
      if (now - activeRefreshAt.current < 250) return;
      activeRefreshAt.current = now;
      void loadList(true);
      void refreshMessages();
    };
    const listTimer = window.setInterval(() => void loadList(true), 10_000);
    const messageTimer = window.setInterval(() => void refreshMessages(), 10_000);
    document.addEventListener('visibilitychange', refreshActivePage);
    window.addEventListener('focus', refreshActivePage);
    return () => {
      window.clearInterval(listTimer);
      window.clearInterval(messageTimer);
      document.removeEventListener('visibilitychange', refreshActivePage);
      window.removeEventListener('focus', refreshActivePage);
    };
  }, [loadList, refreshMessages]);
  useEffect(() => {
    const loadAdminConfig = async () => {
      try {
        const runtimeConfig = await adminApiService.getCsRuntimeConfig();
        if (Array.isArray(runtimeConfig.quick_replies)) {
          setQuickReplies(runtimeConfig.quick_replies.filter((item) => item.enabled !== false));
        }
        const minutes = Number(runtimeConfig.recall_window_minutes);
        if (Number.isFinite(minutes) && minutes >= 1 && minutes <= 1440) setRecallWindowMinutes(Math.trunc(minutes));
      } catch {
        /* 不影响会话只读处理 */
      }
    };
    void loadAdminConfig();
  }, []);
  const builtinConfig = config?.provider === 'builtin' ? config : null;
  const attachmentConfig: ChatAttachmentConfig | null = builtinConfig?.attachments ?? null;
  const composerAttachmentConfig: ChatAttachmentConfig | null = attachmentConfig
    ? (canUpload ? attachmentConfig : { ...attachmentConfig, enabled: false })
    : null;
  const conversationPatch = (message: ChatMessage) => ({
    status: 'processing' as const,
    closed_at: null,
    closed_by: null,
    last_message_at: message.created_at,
    last_message_preview: message.content || '附件消息',
    last_message_role: 'admin' as const,
    admin_unread: 0,
    unread: 0,
  });
  const applySentMessage = (conversationId: number, message: ChatMessage) => {
    const patch = conversationPatch(message);
    if (activeConversationId.current === conversationId) {
      setMessages((current) => current.some((item) => item.id === message.id) ? current : [...current, message]);
    }
    setSelected((current) => (current?.id === conversationId ? { ...current, ...patch } : current));
    setRows((current) => current.map((item) => item.id === conversationId ? { ...item, ...patch } : item));
  };
  const sendMessage = async () => {
    if (!selected || (!reply.trim() && !attachments.length)) return;
    const conversationId = selected.id;
    const content = reply.trim();
    const attachmentIds = attachments.map((item) => item.id);
    setSending(true);
    try {
      const message = await adminApiService.sendCsMessage({
        conversation_id: conversationId,
        content,
        attachment_ids: attachmentIds,
        client_msg_id: newClientMessageId(),
      });
      applySentMessage(conversationId, message);
      if (activeConversationId.current === conversationId) {
        setReply('');
        setAttachments([]);
      }
      void loadList(true);
    } catch (error) {
      showToast(error instanceof Error ? error.message : '发送消息失败', 'error');
    } finally {
      setSending(false);
    }
  };
  const sendQuickReply = async (quickReplyId: string) => {
    if (!selected || sending) return;
    const conversationId = selected.id;
    setSending(true);
    try {
      const message = await adminApiService.sendCsMessage({
        conversation_id: conversationId,
        content: '',
        attachment_ids: [],
        quick_reply_id: quickReplyId,
        client_msg_id: newClientMessageId(),
      });
      applySentMessage(conversationId, message);
      void loadList(true);
    } catch (error) {
      showToast(error instanceof Error ? error.message : '发送快捷回复失败', 'error');
    } finally {
      setSending(false);
    }
  };
  const openBatchReply = () => {
    if (batchSelection.size < 2) return;
    batchClientMessageId.current = newClientMessageId();
    setBatchReply('');
    setBatchQuickReplyId(undefined);
    setBatchReplyOpen(true);
  };
  const confirmBatchReply = async () => {
    const conversationIds = Array.from(batchSelection);
    if (conversationIds.length < 2 || (!batchReply.trim() && !batchQuickReplyId)) return;
    setBatchSending(true);
    try {
      const result = await adminApiService.batchSendCsMessages({
        conversation_ids: conversationIds,
        content: batchReply.trim(),
        quick_reply_id: batchQuickReplyId,
        client_msg_id: batchClientMessageId.current,
      });
      const sentByConversation = new Map(result.messages.map((message) => [message.conversation_id, message]));
      setRows((current) => current.map((item) => {
        const message = sentByConversation.get(item.id);
        return message ? { ...item, ...conversationPatch(message) } : item;
      }));
      setSelected((current) => {
        if (!current) return current;
        const message = sentByConversation.get(current.id);
        return message ? { ...current, ...conversationPatch(message) } : current;
      });
      const activeMessage = activeConversationId.current ? sentByConversation.get(activeConversationId.current) : undefined;
      if (activeMessage) {
        setMessages((current) => current.some((item) => item.id === activeMessage.id) ? current : [...current, activeMessage]);
      }
      setBatchSelection(new Set());
      setBatchReplyOpen(false);
      showToast(`已向 ${result.sent_count} 个用户发送回复`, 'success');
      void loadList(true);
    } catch (error) {
      showToast(error instanceof Error ? error.message : '批量回复失败', 'error');
    } finally {
      setBatchSending(false);
    }
  };
  const openQuickPhrase = () => {
    setQuickPhraseTitle('');
    setQuickPhraseContent(reply.trim());
    setQuickPhraseOpen(true);
  };
  const saveQuickPhrase = async () => {
    if (!quickPhraseTitle.trim() || !quickPhraseContent.trim()) return;
    setQuickPhraseSaving(true);
    try {
      const created = await adminApiService.createCsQuickReply({
        title: quickPhraseTitle.trim(),
        content: quickPhraseContent.trim(),
      });
      setQuickReplies((current) => [...current, created]);
      setQuickPhraseOpen(false);
      showToast('快捷短语已保存', 'success');
    } catch (error) {
      showToast(error instanceof Error ? error.message : '保存快捷短语失败', 'error');
    } finally {
      setQuickPhraseSaving(false);
    }
  };
  const confirmRecall = async () => {
    if (!recallTarget) return;
    const conversationId = recallTarget.conversation_id;
    setRecalling(true);
    try {
      const result = await adminApiService.recallCsMessage({ message_id: recallTarget.id });
      if (activeConversationId.current === conversationId) {
        setMessages((current) => {
          const next = current.map((item) => (item.id === result.message.id ? result.message : item));
          return result.event && !next.some((item) => item.id === result.event?.id) ? [...next, result.event] : next;
        });
      }
      const patch = {
        last_message_at: result.conversation.last_message_at,
        last_message_preview: result.conversation.last_message_preview,
        last_message_role: result.conversation.last_message_role,
      };
      setSelected((current) => (current?.id === conversationId ? { ...current, ...patch } : current));
      setRows((current) => current.map((item) => (item.id === conversationId ? { ...item, ...patch } : item)));
      setRecallTarget(null);
      showToast('消息已撤回', 'success');
      void loadList(true);
    } catch (error) {
      showToast(error instanceof Error ? error.message : '撤回消息失败', 'error');
    } finally {
      setRecalling(false);
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
          <div className="flex flex-wrap gap-2">
            {notificationPermission !== 'granted' && notificationPermission !== 'unsupported' && (
              <Button
                color={notificationPermission === 'denied' ? 'warning' : 'primary'}
                variant="flat"
                startContent={notificationPermission === 'denied' ? <BellOff className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
                onPress={() => void requestBrowserNotificationPermission()}
              >
                {notificationPermission === 'denied' ? '通知权限已拒绝' : '开启浏览器通知'}
              </Button>
            )}
            {notificationPermission === 'granted' && (
              <Button variant="flat" color="success" startContent={<Bell className="h-4 w-4" />} isDisabled>
                浏览器通知已开启
              </Button>
            )}
            <Button variant="flat" isLoading={listLoading} startContent={!listLoading && <RefreshCw className="h-4 w-4" />} onPress={() => void loadList()}>
              刷新
            </Button>
          </div>
        </CardHeader>
      </Card>
      <div className="grid h-[calc(100dvh-13rem)] min-h-[360px] max-h-[760px] grid-cols-1 gap-4 overflow-hidden lg:h-[min(72vh,760px)] lg:min-h-[520px] lg:grid-cols-[320px_minmax(0,1fr)]">
        <Card className={`${mobileChat ? 'hidden lg:block' : 'block'} min-h-0 overflow-hidden`}>
          <CardBody className="flex h-full min-h-0 flex-col gap-3 overflow-hidden p-3">
            <Tabs
              selectedKey={filter}
              onSelectionChange={(key) => {
                const nextFilter = String(key);
                if (nextFilter === filter) {
                  void loadList();
                  return;
                }
                setRows([]);
                setTotal(0);
                setFilter(nextFilter);
                setPage(1);
                setBatchSelection(new Set());
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
                setBatchSelection(new Set());
              }}
              placeholder="搜索用户或消息"
              startContent={<Search className="h-4 w-4" />}
            />
            {canBatchSend && <div className="flex items-center justify-between gap-2">
              <Checkbox
                size="sm"
                isSelected={rows.length > 0 && batchSelection.size === rows.length}
                isIndeterminate={batchSelection.size > 0 && batchSelection.size < rows.length}
                onValueChange={(checked) => setBatchSelection(checked ? new Set(rows.map((item) => item.id)) : new Set())}
              >
                全选
              </Checkbox>
              <Button
                size="sm"
                color="primary"
                variant="flat"
                startContent={<Send className="h-4 w-4" />}
                isDisabled={batchSelection.size < 2}
                onPress={openBatchReply}
              >
                批量回复{batchSelection.size ? `（${batchSelection.size}）` : ''}
              </Button>
            </div>}
            <div className="min-h-0 flex-1 overflow-y-auto">
              {listLoading && !rows.length ? (
                <div className="flex justify-center py-10">
                  <Spinner label="加载中" />
                </div>
              ) : rows.length ? (
                rows.map((item) => (
                  <div key={item.id} className="mb-1 flex items-center gap-1">
                    {canBatchSend && <Checkbox
                      size="sm"
                      aria-label={`选择会话 ${item.user.profile.username || item.user.profile.email || item.user.id}`}
                      isSelected={batchSelection.has(item.id)}
                      onValueChange={(checked) => setBatchSelection((current) => {
                        const next = new Set(current);
                        if (checked) next.add(item.id);
                        else next.delete(item.id);
                        return next;
                      })}
                    />}
                    <Button
                      variant={selected?.id === item.id ? 'flat' : 'light'}
                      color={selected?.id === item.id ? 'primary' : 'default'}
                      className="h-auto min-w-0 flex-1 justify-start px-3 py-3 text-left"
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
                  </div>
                ))
              ) : (
                <div className="py-10 text-center text-sm text-default-500">暂无会话</div>
              )}
            </div>
            {pages > 1 && <Pagination page={page} total={pages} size="sm" onChange={(nextPage) => { setBatchSelection(new Set()); setPage(nextPage); }} className="justify-center" />}
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
                  <ChatMessageList messages={messages} conversationKey={selected.id} selfRole="admin" loading={messageLoading} emptyText="暂无消息" scope="admin" recallWindowMinutes={canRecall ? recallWindowMinutes : undefined} onRecall={canRecall ? setRecallTarget : undefined} />
                </div>
                {composerAttachmentConfig ? (
                  <ChatComposer
                    key={selected.id}
                    value={reply}
                    onValueChange={setReply}
                    onSend={() => void sendMessage()}
                    sending={sending}
                    disabled={!canSend}
                    disabledHint={!canSend ? '当前账号只有会话查看权限，不能发送消息。' : undefined}
                    maxLength={builtinConfig?.limits.max_content_length ?? 2000}
                    attachmentConfig={composerAttachmentConfig}
                    attachments={attachments}
                    onAttachmentsChange={setAttachments}
                    uploadAttachment={uploadAttachment}
                    quickReplies={canSend ? quickReplies : []}
                    onPickQuickReply={canSend ? ((id) => void sendQuickReply(id)) : undefined}
                    extraActions={canManageQuickReplies ? (
                      <Button size="sm" variant="flat" startContent={<Plus className="h-4 w-4" />} onPress={openQuickPhrase}>
                        新建快捷短语
                      </Button>
                    ) : null}
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
      <Modal
        isOpen={Boolean(recallTarget)}
        onOpenChange={(open) => {
          if (!open && !recalling) setRecallTarget(null);
        }}
        size="md"
      >
        <ModalContent>
          <ModalHeader>撤回消息</ModalHeader>
          <ModalBody>
            <p className="text-sm text-default-600">
              撤回后用户将无法再看到这条消息的内容与附件，会话中会显示“客服撤回了一条消息”。撤回操作会记入审计日志，且不可撤销。
            </p>
            {recallTarget?.content && (
              <div className="rounded-medium bg-default-100 p-3 text-sm text-default-700">
                <p className="whitespace-pre-wrap break-words">{recallTarget.content}</p>
              </div>
            )}
          </ModalBody>
          <ModalFooter>
            <Button variant="light" isDisabled={recalling} onPress={() => setRecallTarget(null)}>
              取消
            </Button>
            <Button color="danger" isLoading={recalling} onPress={() => void confirmRecall()}>
              确认撤回
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
      <Modal
        isOpen={batchReplyOpen}
        onOpenChange={(open) => {
          if (!open && !batchSending) setBatchReplyOpen(false);
        }}
        size="lg"
      >
        <ModalContent>
          <ModalHeader>批量回复</ModalHeader>
          <ModalBody className="space-y-3">
            <p className="text-sm text-default-600">将向已选择的 {batchSelection.size} 个用户发送相同回复。发送过程为单个事务，不会只成功一部分。</p>
            {quickReplies.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {quickReplies.map((item) => (
                  <Button
                    key={item.id}
                    size="sm"
                    variant={batchQuickReplyId === item.id ? 'solid' : 'flat'}
                    color={batchQuickReplyId === item.id ? 'primary' : 'default'}
                    onPress={() => {
                      setBatchQuickReplyId(item.id);
                      setBatchReply(item.content);
                    }}
                  >
                    {item.title}
                  </Button>
                ))}
              </div>
            )}
            <Textarea
              label="回复内容"
              value={batchReply}
              onValueChange={setBatchReply}
              minRows={4}
              maxRows={10}
              maxLength={builtinConfig?.limits.max_content_length ?? 2000}
              isDisabled={batchSending}
            />
          </ModalBody>
          <ModalFooter>
            <Button variant="light" isDisabled={batchSending} onPress={() => setBatchReplyOpen(false)}>取消</Button>
            <Button
              color="primary"
              startContent={!batchSending && <Send className="h-4 w-4" />}
              isLoading={batchSending}
              isDisabled={!batchReply.trim() && !batchQuickReplyId}
              onPress={() => void confirmBatchReply()}
            >
              发送给 {batchSelection.size} 个用户
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
      <Modal
        isOpen={quickPhraseOpen}
        onOpenChange={(open) => {
          if (!open && !quickPhraseSaving) setQuickPhraseOpen(false);
        }}
        size="md"
      >
        <ModalContent>
          <ModalHeader>新建快捷短语</ModalHeader>
          <ModalBody className="space-y-3">
            <Input
              label="标题"
              value={quickPhraseTitle}
              onValueChange={setQuickPhraseTitle}
              maxLength={20}
              isDisabled={quickPhraseSaving}
            />
            <Textarea
              label="内容"
              value={quickPhraseContent}
              onValueChange={setQuickPhraseContent}
              minRows={4}
              maxRows={10}
              maxLength={500}
              isDisabled={quickPhraseSaving}
            />
          </ModalBody>
          <ModalFooter>
            <Button variant="light" isDisabled={quickPhraseSaving} onPress={() => setQuickPhraseOpen(false)}>取消</Button>
            <Button
              color="primary"
              isLoading={quickPhraseSaving}
              isDisabled={!quickPhraseTitle.trim() || !quickPhraseContent.trim()}
              onPress={() => void saveQuickPhrase()}
            >
              保存快捷短语
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
};
export default CustomerServicePage;
