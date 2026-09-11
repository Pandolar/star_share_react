import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Avatar, Button, Card, Image, Modal, ModalBody, ModalContent, ModalHeader, ScrollShadow, Spinner, Tooltip } from '@heroui/react';
import { Download, FileText } from 'lucide-react';
import type { ChatAttachment, ChatMessage } from './types';
import { buildAttachmentUrl, fetchAttachmentBlob, formatBytes } from './attachmentCache';

export interface ChatMessageListProps {
  messages: ChatMessage[];
  selfRole: 'user' | 'admin';
  loading?: boolean;
  hasMore?: boolean;
  loadingMore?: boolean;
  onLoadMore?: () => void;
  emptyText?: string;
  scope: 'user' | 'admin';
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

export default function ChatMessageList({
  messages,
  selfRole,
  loading = false,
  hasMore = false,
  loadingMore = false,
  onLoadMore,
  emptyText = '暂无消息',
  scope,
}: ChatMessageListProps): React.ReactElement {
  const bottomRef = useRef<HTMLDivElement>(null);
  const [previewUrl, setPreviewUrl] = useState('');
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);
  if (loading)
    return (
      <div className="flex min-h-48 items-center justify-center">
        <Spinner label="加载消息中" />
      </div>
    );
  return (
    <>
      <ScrollShadow className="h-full min-h-0 space-y-3 px-1" hideScrollBar>
        {hasMore && (
          <div className="text-center">
            <Button size="sm" variant="light" isLoading={loadingMore} onPress={onLoadMore}>
              加载更早消息
            </Button>
          </div>
        )}
        {messages.length === 0 && <p className="py-10 text-center text-sm text-default-500">{emptyText}</p>}
        {messages.map((message, index) => {
          if (message.role === 'system')
            return (
              <p key={message.id} className="py-1 text-center text-xs text-default-400">
                {message.content}
              </p>
            );
          const mine = message.role === selfRole;
          const grouped = index > 0 && messages[index - 1].role === message.role;
          return (
            <div key={message.id} className={`flex gap-2 ${mine ? 'justify-end' : 'justify-start'} ${grouped ? '-mt-1' : 'mt-3'}`}>
              {!mine && (
                <Avatar size="sm" name={senderName(message).slice(0, 1)} className="flex-shrink-0" />
              )}
              <div className={`max-w-[80%] ${mine ? 'items-end' : 'items-start'} flex flex-col`}>
                {!grouped && <span className="mb-1 text-xs text-default-500">{senderName(message)}</span>}
                <div
                  className={`rounded-2xl px-3 py-2 text-sm ${mine ? 'bg-primary text-primary-foreground' : 'bg-default-100 text-default-800'}`}
                >
                  {message.content && <p className="whitespace-pre-wrap break-words">{message.content}</p>}
                  {message.attachments?.map((attachment) => (
                    <AttachmentView key={attachment.id} attachment={attachment} scope={scope} onPreview={setPreviewUrl} />
                  ))}
                </div>
                <Tooltip content={new Date(message.created_at).toLocaleString()}>
                  <span className="mt-1 text-xs text-default-400">{relativeTime(message.created_at)}</span>
                </Tooltip>
              </div>
              {mine && (
                <Avatar size="sm" name={senderName(message).slice(0, 1)} className="flex-shrink-0" />
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
