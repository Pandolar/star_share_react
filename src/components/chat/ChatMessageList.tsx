import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Button, Card, Image, Modal, ModalBody, ModalContent, ModalHeader, ScrollShadow, Spinner, Tooltip } from '@heroui/react';
import { IdentityAvatar } from '../identity/IdentityAvatar';
import { Download, FileText, Undo2 } from 'lucide-react';
import type { ChatAttachment, ChatCard, ChatMessage } from './types';
import { CHAT_RECALL_CONTENT_TYPE, CHAT_RECALL_NOTICE } from './types';
import { buildAttachmentUrl, fetchAttachmentBlob, formatBytes } from './attachmentCache';
import ChatCardView from './ChatCardView';

export interface ChatMessageListProps {
  messages: ChatMessage[];
  conversationKey?: string | number | null;
  selfRole: 'user' | 'admin';
  loading?: boolean;
  hasMore?: boolean;
  loadingMore?: boolean;
  onLoadMore?: () => void;
  emptyText?: string;
  scope: 'user' | 'admin';
  /** 撤回时限（分钟）；提供后管理端可对窗口内的自己消息发起撤回。 */
  recallWindowMinutes?: number;
  onRecall?: (message: ChatMessage) => void;
  userLastReadMessageId?: number | null;
  /** 用户侧点击卡片支付。 */
  onPayCard?: (message: ChatMessage, card: ChatCard) => void;
  payingCardId?: number | null;
}

const relativeTime = (value: string): string => {
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 1000));
  if (seconds < 60) return '刚刚';
  if (seconds < 3600) return `${Math.floor(seconds / 60)} 分钟前`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} 小时前`;
  return `${Math.floor(seconds / 86400)} 天前`;
};

const senderName = (message: ChatMessage): string => {
  if (message.role === 'admin') return 'Nice';
  return message.sender_name || '用户';
};

const AttachmentView: React.FC<{ attachment: ChatAttachment; scope: 'user' | 'admin'; onPreview: (url: string) => void }> = ({
  attachment,
  scope,
  onPreview,
}) => {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const load = useCallback(async () => {
    setLoading(true);
    try {
      return URL.createObjectURL(await fetchAttachmentBlob(buildAttachmentUrl(scope, attachment.id)));
    } finally {
      setLoading(false);
    }
  }, [attachment.id, scope]);
  useEffect(() => {
    if (attachment.kind !== 'image') return;
    let cancelled = false;
    load()
      .then((next) => {
        if (!cancelled) setUrl(next);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [attachment.kind, load]);
  if (attachment.kind === 'image')
    return url ? (
      <Image src={url} alt={attachment.name} className="max-h-40 max-w-[220px] cursor-zoom-in" onClick={() => onPreview(url)} />
    ) : (
      <Spinner size="sm" />
    );
  const download = async () => {
    const next = await load();
    const anchor = document.createElement('a');
    anchor.href = next;
    anchor.download = attachment.name;
    anchor.click();
  };
  return (
    <Card className="mt-2 max-w-xs border border-default-200" shadow="none">
      <div className="flex items-center gap-2 p-3">
        <FileText size={20} className="text-default-500" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm">{attachment.name}</p>
          <p className="text-xs text-default-500">{formatBytes(attachment.bytes)}</p>
        </div>
        <Button
          isIconOnly
          size="sm"
          variant="light"
          aria-label="下载附件"
          isLoading={loading}
          onPress={() => {
            void download();
          }}
        >
          <Download size={16} />
        </Button>
      </div>
    </Card>
  );
};

/** 撤回时限判定：仅用于隐藏失效按钮，真正的权限与时限由后端校验。 */
const withinRecallWindow = (createdAt: string, minutes: number): boolean =>
  Date.now() - new Date(createdAt).getTime() <= minutes * 60_000;

/** 客服头像固定种子：两侧系统显示同一只“客服小怪物”。 */
const CUSTOMER_SERVICE_AVATAR_ID = 9999999999;

const messageSenderUserId = (message: ChatMessage): number | null => {
  const id = Number((message as ChatMessage & { sender_id?: string | number }).sender_id);
  return Number.isFinite(id) && id > 0 ? id : null;
};

export default function ChatMessageList({
  messages,
  conversationKey,
  selfRole,
  loading = false,
  hasMore = false,
  loadingMore = false,
  onLoadMore,
  emptyText = '暂无消息',
  scope,
  recallWindowMinutes,
  onRecall,
  userLastReadMessageId,
  onPayCard,
  payingCardId,
}: ChatMessageListProps): React.ReactElement {
  const bottomRef = useRef<HTMLDivElement>(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const newestMessageId = messages[messages.length - 1]?.id;
  useEffect(() => {
    if (loading) return undefined;
    const frame = window.requestAnimationFrame(() => {
      bottomRef.current?.scrollIntoView({ behavior: 'auto', block: 'end' });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [conversationKey, loading, newestMessageId]);
  // 撤回事件是独立消息（增量轮询的唯一感知途径）：按 related_message_id 归并到原消息，
  // 事件本身不渲染，这样首屏、after_id、before_id 三条路径都得到同一结果。
  const recallNotices = new Map<number, string>();
  const visible: ChatMessage[] = [];
  for (const message of messages) {
    if (message.content_type === CHAT_RECALL_CONTENT_TYPE) {
      if (message.related_message_id) recallNotices.set(message.related_message_id, message.content || CHAT_RECALL_NOTICE);
      continue;
    }
    visible.push(message);
  }
  if (loading)
    return (
      <div className="flex min-h-48 items-center justify-center">
        <Spinner label="加载消息中" />
      </div>
    );
  return (
    <>
      <ScrollShadow className="h-full min-h-0 overflow-y-auto space-y-3 px-1" hideScrollBar>
        {hasMore && (
          <div className="text-center">
            <Button size="sm" variant="light" isLoading={loadingMore} onPress={onLoadMore}>
              加载更早消息
            </Button>
          </div>
        )}
        {visible.length === 0 && <p className="py-10 text-center text-sm text-default-500">{emptyText}</p>}
        {visible.map((message, index) => {
          const recalled = message.is_recalled === true || recallNotices.has(message.id);
          if (message.role === 'system')
            return (
              <p key={message.id} className="py-1 text-center text-xs text-default-400">
                {message.content}
              </p>
            );
          const mine = message.role === selfRole;
          const grouped = index > 0 && visible[index - 1].role === message.role;
          const canRecall =
            !recalled
            && mine
            && Boolean(onRecall)
            && recallWindowMinutes !== undefined
            && withinRecallWindow(message.created_at, recallWindowMinutes);
          return (
            <div key={message.id} className={`flex gap-2 ${mine ? 'justify-end' : 'justify-start'} ${grouped ? '-mt-1' : 'mt-3'}`}>
              {!mine && (
                <IdentityAvatar userId={scope === 'admin' ? messageSenderUserId(message) : CUSTOMER_SERVICE_AVATAR_ID} name={senderName(message)} size={28} className="mt-4" />
              )}
              <div className={`max-w-[80%] ${mine ? 'items-end' : 'items-start'} flex flex-col`}>
                {!grouped && <span className="mb-1 text-xs text-default-500">{senderName(message)}</span>}
                {message.card && !recalled ? (
                  <ChatCardView message={message} card={message.card} scope={scope} onPayCard={onPayCard} paying={payingCardId === message.id} />
                ) : (
                  <div
                    className={`rounded-2xl px-3 py-2 text-sm ${mine ? 'bg-primary text-primary-foreground' : 'bg-default-100 text-default-800'}`}
                  >
                    {recalled ? (
                      <p className="whitespace-pre-wrap break-words text-xs italic opacity-70">{recallNotices.get(message.id) ?? CHAT_RECALL_NOTICE}</p>
                    ) : (
                      <>
                        {message.content && <p className="whitespace-pre-wrap break-words">{message.content}</p>}
                        {message.attachments?.map((attachment, attachmentIndex) => (
                          <div key={attachment.id}>
                            {attachment.kind === 'image' && <p className="mb-1 text-xs opacity-70">图片{attachmentIndex + 1}</p>}
                            <AttachmentView attachment={attachment} scope={scope} onPreview={setPreviewUrl} />
                          </div>
                        ))}
                      </>
                    )}
                  </div>
                )}
                <div className="mt-1 flex items-center gap-1">
                  {scope === 'admin' && message.ai_meta?.source && <span className="text-xs text-secondary">{message.ai_meta.source === 'human_reviewed' ? '人工确认建议' : message.ai_meta.source === 'incident' ? '事故话术' : '自动回复'}</span>}
                  <Tooltip content={new Date(message.created_at).toLocaleString()}>
                    <span className="text-xs text-default-400">{relativeTime(message.created_at)}</span>
                  </Tooltip>
                  {scope === 'admin' && message.role === 'admin' && !recalled && (
                    <span className={`text-xs ${message.id <= (userLastReadMessageId ?? 0) ? 'text-success' : 'text-default-500'}`}>
                      {message.id <= (userLastReadMessageId ?? 0) ? '客户已读' : '客户未读'}
                    </span>
                  )}
                  {canRecall && (
                    <Tooltip content={`撤回这条消息（${recallWindowMinutes} 分钟内可撤回）`}>
                      <Button isIconOnly size="sm" variant="light" aria-label="撤回消息" onPress={() => onRecall?.(message)}>
                        <Undo2 className="h-3.5 w-3.5" />
                      </Button>
                    </Tooltip>
                  )}
                </div>
              </div>
              {mine && (
                <IdentityAvatar userId={scope === 'admin' ? CUSTOMER_SERVICE_AVATAR_ID : messageSenderUserId(message)} name={senderName(message)} size={28} className="mt-4" />
              )}
            </div>
          );
        })}
        <div ref={bottomRef} />
      </ScrollShadow>
      <Modal
        isOpen={Boolean(previewUrl)}
        onOpenChange={(open) => {
          if (!open) setPreviewUrl('');
        }}
        size="3xl"
      >
        <ModalContent>
          <ModalHeader>图片预览</ModalHeader>
          <ModalBody className="pb-6">
            <Image src={previewUrl} alt="附件预览" className="max-h-[70vh] object-contain" />
          </ModalBody>
        </ModalContent>
      </Modal>
    </>
  );
}
