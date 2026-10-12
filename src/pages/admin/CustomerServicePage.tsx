import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Button,
  Card,
  Checkbox,
  CardBody,
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
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
import { ArrowLeft, Bell, BellOff, Flag, Gauge, Headphones, MoreHorizontal, Pin, Plus, RefreshCw, Search, Send, ShieldCheck, StickyNote, UserRound } from 'lucide-react';
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
import CustomerServiceUserInfo from './CustomerServiceUserInfo';

const FILTERS = [
  ['all', '全部'],
  ['unread', '未读'],
  ['pinned', '置顶'],
];
const GROUPS = [
  { id: 'general', name: '普通跟进' },
  { id: 'supervisor', name: '主管待处理' },
];
const groupName = (groupId: string | null | undefined) => GROUPS.find((group) => group.id === groupId)?.name || '普通跟进';
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
const conversationActivity = (conversation: AdminCsConversation) => {
  const timestamp = conversation.last_message_at ? new Date(conversation.last_message_at).getTime() : 0;
  return Number.isFinite(timestamp) ? timestamp : 0;
};
const sortConversationsByRecent = (conversations: AdminCsConversation[]) => (
  [...conversations].sort((left, right) => (
    Number(right.is_pinned) - Number(left.is_pinned)
    || conversationActivity(right) - conversationActivity(left)
    || right.id - left.id
  ))
);
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
  const canManageConversation = can('customer_service.conversation.manage');
  const [rows, setRows] = useState<AdminCsConversation[]>([]);
  const [quickReplies, setQuickReplies] = useState<Array<{ id: string; title: string; content: string; attachments?: ChatAttachment[] }>>([]);
  const [selected, setSelected] = useState<AdminCsConversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [filter, setFilter] = useState('all');
  const [groupId, setGroupId] = useState('all');
  const [remarkDraft, setRemarkDraft] = useState('');
  const [remarkOpen, setRemarkOpen] = useState(false);
  const [userInfoConversationId, setUserInfoConversationId] = useState<number | null>(null);
  const [userActionLoading, setUserActionLoading] = useState(false);
  const [conversationSaving, setConversationSaving] = useState(false);
  const conversationSavingRef = useRef(false);
  const userActionRef = useRef(false);
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
  const canUnbanUser = can('user.status.update');
  const canClearUserLimit = can('user.limit.reset');
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
  const [quickPhraseDeleteTarget, setQuickPhraseDeleteTarget] = useState<{ id: string; title: string; content: string } | null>(null);
  const [quickPhraseDeleting, setQuickPhraseDeleting] = useState(false);
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
      const requestKey = `${page}:${filter}:${groupId}:${query.trim()}`;
      const now = Date.now();
      if (silent && lastListRequest.current.key === requestKey && now - lastListRequest.current.at < 250) return;
      lastListRequest.current = { key: requestKey, at: now };
      const requestId = ++listRequestId.current;
      if (!silent) setListLoading(true);
      try {
        const result = await adminApiService.getCsConversations({
          current_page: page,
          page_size: pageSize,
          filter,
          group_id: groupId === 'all' ? undefined : groupId,
          querystring: query.trim() || undefined,
        });
        if (requestId !== listRequestId.current) return;
        const nextRows = sortConversationsByRecent(result.data);
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
          return refreshed ? { ...current, ...refreshed } : current;
        });
      } catch (error) {
        if (requestId === listRequestId.current && !silent) {
          showToast(error instanceof Error ? error.message : '获取客服会话失败', 'error');
        }
      } finally {
        if (requestId === listRequestId.current && !silent) setListLoading(false);
      }
    },
    [filter, groupId, page, query]
  );
  const loadListRef = useRef(loadList);
  loadListRef.current = loadList;
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
        const latestDelivered = result.messages[result.messages.length - 1];
        const readResult = await adminApiService.markCsRead(conversation.id, latestDelivered?.id);
        if (requestId !== messageRequestId.current || activeConversationId.current !== conversation.id) return;
        const readConversation = { ...result.conversation, admin_unread: readResult.unread, unread: readResult.unread } as AdminCsConversation;
        setSelected((current) => (current?.id === conversation.id ? { ...current, ...readConversation } : current));
        setRows((current) => sortConversationsByRecent(current.map((item) => (
          item.id === conversation.id ? { ...item, ...readConversation } : item
        ))));
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
      const latestDelivered = result.messages[result.messages.length - 1];
      let remainingUnread = result.conversation.admin_unread;
      if (latestDelivered && (hasIncoming || remainingUnread > 0)) {
        remainingUnread = (await adminApiService.markCsRead(conversationId, latestDelivered.id)).unread;
      }
      if (requestId !== refreshRequestId.current || activeConversationId.current !== conversationId) return;
      const readConversation = { ...result.conversation, admin_unread: remainingUnread, unread: remainingUnread } as AdminCsConversation;
      setSelected((current) => (current?.id === conversationId ? { ...current, ...readConversation } : current));
      setRows((current) => sortConversationsByRecent(current.map((item) => (
        item.id === conversationId ? { ...item, ...readConversation } : item
      ))));
    } catch {
      /* 下次轮询重试 */
    }
  }, [messages, mobileChat, selected]);
  useEffect(() => {
    setRemarkOpen(false);
    setUserInfoConversationId(null);
  }, [selected?.id]);
  const updateConversation = async (patch: { is_pinned?: boolean; group_id?: string; user_remark?: string }) => {
    if (!selected || !canManageConversation || conversationSavingRef.current) return;
    const conversationId = selected.id;
    conversationSavingRef.current = true;
    setConversationSaving(true);
    try {
      const updated = await adminApiService.updateCsConversation({ id: conversationId, ...patch });
      setSelected((current) => current?.id === conversationId ? updated : current);
      setRows((current) => sortConversationsByRecent(current.map((item) => item.id === updated.id ? updated : item)));
      showToast(patch.user_remark !== undefined ? '用户备注已保存' : patch.group_id ? `已移至${groupName(patch.group_id)}` : updated.is_pinned ? '对话已置顶' : '已取消置顶', 'success');
      if (patch.user_remark !== undefined) setRemarkOpen(false);
      void loadListRef.current();
    } catch (error) {
      showToast(error instanceof Error ? error.message : '更新会话失败', 'error');
    } finally {
      conversationSavingRef.current = false;
      setConversationSaving(false);
    }
  };
  const runUserAction = async (action: 'unban' | 'clear_limit') => {
    if (!selected || userActionRef.current) return;
    const userId = selected.user.id;
    userActionRef.current = true;
    setUserActionLoading(true);
    try {
      if (action === 'unban') {
        await adminApiService.unbanCsUser(userId);
        setSelected((current) => current?.user.id === userId ? { ...current, user: { ...current.user, profile: { ...current.user.profile, status: 1 } } } : current);
      } else await adminApiService.clearCsUserLimit(userId);
      showToast(action === 'unban' ? '用户已解封' : '当前限速已清除', 'success');
      void loadListRef.current();
    } catch (error) {
      showToast(error instanceof Error ? error.message : '用户操作失败', 'error');
    } finally {
      userActionRef.current = false;
      setUserActionLoading(false);
    }
  };
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
    setRows((current) => sortConversationsByRecent(current.map((item) => item.id === conversationId ? { ...item, ...patch } : item)));
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
      setRows((current) => sortConversationsByRecent(current.map((item) => {
        const message = sentByConversation.get(item.id);
        return message ? { ...item, ...conversationPatch(message) } : item;
      })));
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
  const confirmQuickPhraseDelete = async () => {
    if (!quickPhraseDeleteTarget) return;
    const { id } = quickPhraseDeleteTarget;
    setQuickPhraseDeleting(true);
    try {
      await adminApiService.deleteCsQuickReply(id);
      setQuickReplies((current) => current.filter((item) => item.id !== id));
      setBatchQuickReplyId((current) => (current === id ? undefined : current));
      setQuickPhraseDeleteTarget(null);
      showToast('快捷短语已删除', 'success');
    } catch (error) {
      showToast(error instanceof Error ? error.message : '删除快捷短语失败', 'error');
    } finally {
      setQuickPhraseDeleting(false);
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
      setRows((current) => sortConversationsByRecent(current.map((item) => (item.id === conversationId ? { ...item, ...patch } : item))));
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
  let latestAdminMessageId: number | null = null;
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    if (messages[index].role === 'admin' && !messages[index].is_recalled && messages[index].content_type !== 'recall') {
      latestAdminMessageId = messages[index].id;
      break;
    }
  }
  const customerReadLatestReply = latestAdminMessageId !== null && latestAdminMessageId <= (selected?.user_last_read_message_id ?? 0);
  const notificationLabel = notificationPermission === 'granted' ? '浏览器通知已开启' : notificationPermission === 'denied' ? '浏览器通知被禁用，点击查看开启方式' : '开启浏览器通知';
  const openRemark = () => {
    if (!selected) return;
    setRemarkDraft(selected.user.profile.remarks || '');
    setRemarkOpen(true);
  };
  const pages = Math.max(1, Math.ceil(total / pageSize));
  return (
    <div className="flex h-[calc(100dvh-7rem)] min-h-[480px] flex-col gap-3">
      <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 overflow-hidden lg:grid-cols-[320px_minmax(0,1fr)]">
        <Card className={`${mobileChat ? 'hidden lg:block' : 'block'} min-h-0 overflow-hidden`}>
          <CardBody className="flex h-full min-h-0 flex-col gap-3 overflow-hidden p-3">
            <div className="flex shrink-0 items-center justify-between gap-1">
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
              <div className="flex items-center gap-0.5">
                {notificationPermission !== 'unsupported' && (
                  <Tooltip content={notificationLabel}>
                    <Button isIconOnly size="sm" variant="light" aria-label={notificationLabel} color={notificationPermission === 'granted' ? 'success' : 'default'} isDisabled={notificationPermission === 'granted'} onPress={() => void requestBrowserNotificationPermission()}>
                      {notificationPermission === 'denied' ? <BellOff className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
                    </Button>
                  </Tooltip>
                )}
                <Tooltip content="刷新会话">
                  <Button isIconOnly size="sm" variant="light" aria-label="刷新会话" isLoading={listLoading} onPress={() => void loadList()}><RefreshCw className="h-4 w-4" /></Button>
                </Tooltip>
              </div>
            </div>
            <Tabs
              selectedKey={groupId}
              onSelectionChange={(key) => {
                setGroupId(String(key));
                setRows([]);
                setTotal(0);
                setPage(1);
              }}
              aria-label="客服分组"
              size="sm"
            >
              <Tab key="all" title="全部分组" />
              {GROUPS.map((group) => <Tab key={group.id} title={group.name} />)}
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
                              item.admin_unread > 0
                                ? 'bg-danger'
                                : ['resolved', 'closed'].includes(item.status)
                                  ? 'bg-default-300'
                                  : 'bg-success-300'
                            }`}
                            aria-label={item.admin_unread > 0 ? `有 ${item.admin_unread} 条未读消息` : '已读'}
                          />
                          <span className="min-w-0 flex-1 truncate text-sm font-medium">
                            {item.user.profile.username || item.user.profile.email || `用户 ${item.user.id}`}
                          </span>
                          {item.admin_unread > 0 && (
                            <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-danger px-1 text-[11px] font-semibold text-white">
                              {item.admin_unread > 99 ? '99+' : item.admin_unread}
                            </span>
                          )}
                          {item.is_pinned && <Pin className="h-3.5 w-3.5 shrink-0 text-warning" aria-label="已置顶" />}
                          {item.group_id === 'supervisor' && <Tooltip content="主管待处理"><span className="shrink-0 text-secondary" aria-label="主管待处理"><Flag className="h-3.5 w-3.5" /></span></Tooltip>}
                          {item.user.billing.has_entitlement && <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-success" aria-label="有有效权益" />}
                          <span className="shrink-0 text-xs text-default-500">{relativeTime(item.last_message_at)}</span>
                        </div>
                        <div className="mt-1 flex items-center gap-2 text-xs text-default-500">
                          <span className="shrink-0">{item.admin_unread > 0 ? '未读' : ['resolved', 'closed'].includes(item.status) ? '已完成' : '已读'}</span>
                          <span className="truncate">{item.last_message_preview || '暂无消息'}</span>
                        </div>
                        <div className={`mt-1 truncate text-xs ${item.user.billing.has_entitlement ? 'text-success' : 'text-default-400'}`}>
                          {item.user.billing.has_entitlement ? item.user.billing.entitlements.map((entitlement) => `${entitlement.name}${entitlement.source === 'team' ? '（团队）' : ''}`).join(' · ') : '暂无有效权益'}
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
          <CardBody className="flex h-full min-h-0 flex-col gap-2 overflow-hidden p-3">
            {selected ? (
              <>
                <div className="flex shrink-0 items-center gap-2 border-b border-divider pb-2">
                  <Button isIconOnly className="lg:hidden" size="sm" variant="light" aria-label="返回会话列表" onPress={() => setMobileChat(false)}><ArrowLeft className="h-4 w-4" /></Button>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 text-sm font-semibold">
                      <span className="truncate">{selected.user.profile.username || selected.user.profile.email || '用户'}</span>
                      {selected.is_pinned && <Pin className="h-3 w-3 shrink-0 text-warning" aria-label="已置顶" />}
                      {selected.group_id === 'supervisor' && <Tooltip content="主管待处理"><span className="shrink-0 text-secondary" aria-label="主管待处理"><Flag className="h-3 w-3" /></span></Tooltip>}
                    </div>
                    <div className="mt-0.5 flex min-w-0 items-center gap-1.5 text-xs text-default-400">
                      {latestAdminMessageId !== null && <span className="shrink-0">{customerReadLatestReply ? '客户已读' : '客户未读'}</span>}
                      <span className="truncate">{selected.user.billing.has_entitlement ? selected.user.billing.entitlements.map((item) => item.name).join(' · ') : '暂无有效权益'}</span>
                    </div>
                  </div>
                  <Tooltip content={selected.user.profile.remarks ? `用户备注：${selected.user.profile.remarks}` : '添加用户备注'}>
                    <Button isIconOnly size="sm" variant="light" aria-label="用户备注" color={selected.user.profile.remarks ? 'primary' : 'default'} onPress={openRemark}><StickyNote className="h-4 w-4" /></Button>
                  </Tooltip>
                  <Button size="sm" variant="light" className="shrink-0 min-w-0 px-2" startContent={<UserRound className="h-4 w-4" />} onPress={() => setUserInfoConversationId(selected.id)}>用户信息</Button>
                  <Dropdown placement="bottom-end">
                    <DropdownTrigger><Button isIconOnly size="sm" variant="light" aria-label="更多会话操作"><MoreHorizontal className="h-5 w-5" /></Button></DropdownTrigger>
                    <DropdownMenu aria-label="会话操作">
                      <DropdownItem key="pin" isDisabled={!canManageConversation || conversationSaving} startContent={<Pin className="h-4 w-4" />} onPress={() => void updateConversation({ is_pinned: !selected.is_pinned })}>{selected.is_pinned ? '取消置顶' : '置顶对话'}</DropdownItem>
                      <DropdownItem key="group" isDisabled={!canManageConversation || conversationSaving} onPress={() => void updateConversation({ group_id: selected.group_id === 'supervisor' ? 'general' : 'supervisor' })}>{selected.group_id === 'supervisor' ? '移至普通跟进' : '转交主管待处理'}</DropdownItem>
                      <DropdownItem key="unban" isDisabled={!canUnbanUser || userActionLoading || selected.user.profile.status === 1} startContent={<ShieldCheck className="h-4 w-4" />} onPress={() => void runUserAction('unban')}>{selected.user.profile.status === 1 ? '账号正常' : '解封账号'}</DropdownItem>
                      <DropdownItem key="limit" isDisabled={!canClearUserLimit || userActionLoading} startContent={<Gauge className="h-4 w-4" />} onPress={() => void runUserAction('clear_limit')}>解除当前限速</DropdownItem>
                      <DropdownItem key="refresh" startContent={<RefreshCw className="h-4 w-4" />} onPress={() => { void loadList(); void refreshMessages(); }}>刷新会话</DropdownItem>
                      <DropdownItem key="notifications" isDisabled={notificationPermission === 'unsupported' || notificationPermission === 'granted'} startContent={<Bell className="h-4 w-4" />} onPress={() => void requestBrowserNotificationPermission()}>{notificationLabel}</DropdownItem>
                    </DropdownMenu>
                  </Dropdown>
                </div>
                {messages
                  .flatMap((message) => message.attachments)
                  .slice(-1)
                  .map((attachment) => (
                    <AttachmentSummary key={attachment.id} attachment={attachment} />
                  ))}
                <div className="min-h-0 flex-1 overflow-hidden">
                  <ChatMessageList messages={messages} conversationKey={selected.id} selfRole="admin" loading={messageLoading} emptyText="暂无消息" scope="admin" userLastReadMessageId={selected.user_last_read_message_id} recallWindowMinutes={canRecall ? recallWindowMinutes : undefined} onRecall={canRecall ? setRecallTarget : undefined} />
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
                    onDeleteQuickReply={canManageQuickReplies ? ((id) => {
                      const target = quickReplies.find((item) => item.id === id);
                      if (target) setQuickPhraseDeleteTarget(target);
                    }) : undefined}
                    quickReplyPreview
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
      <CustomerServiceUserInfo conversationId={userInfoConversationId} onClose={() => setUserInfoConversationId(null)} />
      <Modal isOpen={remarkOpen} onOpenChange={(open) => { if (!conversationSaving) setRemarkOpen(open); }} isDismissable={!conversationSaving} isKeyboardDismissDisabled={conversationSaving} size="md">
        <ModalContent>
          <ModalHeader>用户备注</ModalHeader>
          <ModalBody>
            <p className="text-xs text-default-500">仅内部可见，同一用户的所有会话共用。</p>
            <Textarea label="备注内容" autoFocus isReadOnly={!canManageConversation} isDisabled={conversationSaving} value={remarkDraft} onValueChange={setRemarkDraft} maxLength={255} minRows={3} maxRows={6} />
          </ModalBody>
          <ModalFooter>
            <Button variant="light" isDisabled={conversationSaving} onPress={() => setRemarkOpen(false)}>关闭</Button>
            {canManageConversation && <Button color="primary" isLoading={conversationSaving} isDisabled={remarkDraft === (selected?.user.profile.remarks || '')} onPress={() => void updateConversation({ user_remark: remarkDraft })}>保存备注</Button>}
          </ModalFooter>
        </ModalContent>
      </Modal>
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
        isOpen={Boolean(quickPhraseDeleteTarget)}
        onOpenChange={(open) => {
          if (!open && !quickPhraseDeleting) setQuickPhraseDeleteTarget(null);
        }}
        size="md"
      >
        <ModalContent>
          <ModalHeader>删除快捷短语</ModalHeader>
          <ModalBody>
            <p className="text-sm text-default-600">确定删除“{quickPhraseDeleteTarget?.title}”吗？删除后无法恢复。</p>
            {quickPhraseDeleteTarget?.content && (
              <div className="rounded-medium bg-default-100 p-3 text-sm text-default-700">
                <p className="whitespace-pre-wrap break-words">{quickPhraseDeleteTarget.content}</p>
              </div>
            )}
          </ModalBody>
          <ModalFooter>
            <Button variant="light" isDisabled={quickPhraseDeleting} onPress={() => setQuickPhraseDeleteTarget(null)}>取消</Button>
            <Button color="danger" isLoading={quickPhraseDeleting} onPress={() => void confirmQuickPhraseDelete()}>
              确认删除
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
