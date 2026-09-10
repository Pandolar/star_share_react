import React, { useRef, useState } from 'react';
import { Alert, Button, Chip, Dropdown, DropdownItem, DropdownMenu, DropdownTrigger, Progress, Textarea } from '@heroui/react';
import { Paperclip, Send } from 'lucide-react';
import type { ChatAttachment, ChatAttachmentConfig, ChatAttachmentKind } from './types';
import { compressImageFile } from './imageCompression';
import { toast } from '../../utils/toast';

export interface ChatComposerProps {
  value: string;
  onValueChange: (value: string) => void;
  onSend: () => void;
  sending?: boolean;
  disabled?: boolean;
  disabledHint?: string;
  placeholder?: string;
  maxLength: number;
  attachmentConfig: ChatAttachmentConfig;
  attachments: ChatAttachment[];
  onAttachmentsChange: (next: ChatAttachment[]) => void;
  uploadAttachment: (file: File) => Promise<ChatAttachment>;
  quickReplies?: { id: string; title: string; content: string }[];
  onPickQuickReply?: (content: string) => void;
  extraActions?: React.ReactNode;
  footerNote?: React.ReactNode;
}

const kindFor = (file: File, config: ChatAttachmentConfig): ChatAttachmentKind | null => {
  const extension = `.${file.name.split('.').pop()?.toLowerCase() || ''}`;
  return (
    (Object.keys(config.types) as ChatAttachmentKind[]).find(
      (kind) => config.types[kind].enabled && config.types[kind].extensions.includes(extension)
    ) || null
  );
};

export default function ChatComposer({
  value,
  onValueChange,
  onSend,
  sending = false,
  disabled = false,
  disabledHint,
  placeholder = '请输入消息…',
  maxLength,
  attachmentConfig,
  attachments,
  onAttachmentsChange,
  uploadAttachment,
  quickReplies,
  onPickQuickReply,
  extraActions,
  footerNote,
}: ChatComposerProps): React.ReactElement {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const accept = (Object.keys(attachmentConfig.types) as ChatAttachmentKind[])
    .filter((kind) => attachmentConfig.types[kind].enabled)
    .flatMap((kind) => attachmentConfig.types[kind].extensions)
    .join(',');
  const uploadFiles = async (files: FileList | File[]) => {
    const selected = Array.from(files);
    if (!attachmentConfig.enabled) {
      toast.error('附件功能未开启');
      return;
    }
    if (attachments.length + selected.length > attachmentConfig.max_count_per_message) {
      toast.error(`每条消息最多 ${attachmentConfig.max_count_per_message} 个附件`);
      return;
    }
    const totalBytes =
      attachments.reduce((sum, attachment) => sum + attachment.bytes, 0) + selected.reduce((sum, file) => sum + file.size, 0);
    if (totalBytes > attachmentConfig.max_total_mb_per_message * 1024 * 1024) {
      toast.error(`附件总大小最多 ${attachmentConfig.max_total_mb_per_message} MB`);
      return;
    }
    setUploading(true);
    try {
      const uploaded: ChatAttachment[] = [];
      for (const file of selected) {
        const kind = kindFor(file, attachmentConfig);
        if (!kind) {
          toast.error(`不支持的文件类型：${file.name}`);
          continue;
        }
        const type = attachmentConfig.types[kind];
        if (file.size > type.max_upload_mb * 1024 * 1024) {
          toast.error(`${file.name} 超过 ${type.max_upload_mb} MB 限制`);
          continue;
        }
        const prepared =
          kind === 'image' && type.compress && type.max_edge && type.quality && type.max_compressed_mb
            ? await compressImageFile(file, { max_edge: type.max_edge, quality: type.quality, max_compressed_mb: type.max_compressed_mb })
            : file;
        uploaded.push(await uploadAttachment(prepared));
      }
      if (uploaded.length) onAttachmentsChange([...attachments, ...uploaded]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '附件上传失败');
    } finally {
      setUploading(false);
    }
  };
  const send = () => {
    if (!sending && !disabled && (value.trim() || attachments.length)) onSend();
  };
  return (
    <div
      className={`rounded-lg border p-3 ${dragging ? 'border-primary bg-primary/5' : 'border-default-200'}`}
      onDragOver={(event) => {
        event.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(event) => {
        event.preventDefault();
        setDragging(false);
        void uploadFiles(event.dataTransfer.files);
      }}
    >
      {dragging && <Alert color="primary" title="松开即可上传附件" className="mb-2" />}
      {disabled && disabledHint && <Alert color="warning" title={disabledHint} className="mb-2" />}
      {attachments.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-2">
          {attachments.map((attachment) => (
            <Chip key={attachment.id} onClose={() => onAttachmentsChange(attachments.filter((item) => item.id !== attachment.id))}>
              {attachment.name}
            </Chip>
          ))}
        </div>
      )}
      {uploading && <Progress isIndeterminate size="sm" className="mb-2" aria-label="附件上传中" />}
      <Textarea
        value={value}
        onValueChange={onValueChange}
        placeholder={placeholder}
        minRows={1}
        maxRows={6}
        maxLength={maxLength}
        isDisabled={disabled}
        onKeyDown={(event) => {
          if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
            event.preventDefault();
            send();
          }
        }}
        onPaste={(event) => {
          if (event.clipboardData.files.length) void uploadFiles(event.clipboardData.files);
        }}
      />
      <div className="mt-2 flex items-center gap-2">
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          multiple
          accept={accept}
          onChange={(event) => {
            if (event.target.files) void uploadFiles(event.target.files);
            event.target.value = '';
          }}
        />
        <Button
          isIconOnly
          variant="light"
          aria-label="添加附件"
          isDisabled={disabled || uploading || !attachmentConfig.enabled}
          onPress={() => inputRef.current?.click()}
        >
          <Paperclip size={18} />
        </Button>
        {quickReplies?.length ? (
          <Dropdown>
            <DropdownTrigger>
              <Button size="sm" variant="flat">
                快捷回复
              </Button>
            </DropdownTrigger>
            <DropdownMenu aria-label="快捷回复">
              {quickReplies.map((reply) => (
                <DropdownItem key={reply.id} onPress={() => onPickQuickReply?.(reply.content)}>
                  {reply.title}
                </DropdownItem>
              ))}
            </DropdownMenu>
          </Dropdown>
        ) : null}
        {extraActions}
        <span className="ml-auto text-xs text-default-500">
          {value.length}/{maxLength}
        </span>
        <Button
          isIconOnly
          color="primary"
          aria-label="发送消息"
          isLoading={sending}
          isDisabled={disabled || sending || (!value.trim() && !attachments.length)}
          onPress={send}
        >
          <Send size={18} />
        </Button>
      </div>
      {footerNote && <div className="mt-2 text-xs text-default-500">{footerNote}</div>}
    </div>
  );
}
