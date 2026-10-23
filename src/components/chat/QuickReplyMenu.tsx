import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Button, Chip } from '@heroui/react';
import { ChevronRight, Folder, Trash2, Zap } from 'lucide-react';
import type { ChatAttachment } from './types';
import { buildAttachmentUrl, fetchAttachmentBlob } from './attachmentCache';

export interface QuickReplyItem {
  id: string;
  title: string;
  content: string;
  group?: string;
  attachments?: ChatAttachment[];
}

interface Props {
  items: QuickReplyItem[];
  scope: 'user' | 'admin';
  disabled?: boolean;
  onPick: (id: string, content: string) => void;
  onDelete?: (id: string) => void;
}

/**
 * 快捷回复菜单：未分组项置顶，分组项悬停展开；悬停任意一项显示内容与图片预览。
 */
export default function QuickReplyMenu({ items, scope, disabled, onPick, onDelete }: Props): React.ReactElement {
  const [open, setOpen] = useState(false);
  const [activeGroup, setActiveGroup] = useState<string | null>(null);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const closeTimer = useRef<number | null>(null);
  const groupTimer = useRef<number | null>(null);
  const [thumbs, setThumbs] = useState<Record<string, string>>({});
  const rootRef = useRef<HTMLDivElement | null>(null);

  const ungrouped = useMemo(() => items.filter((item) => !item.group), [items]);
  const groups = useMemo(() => {
    const byGroup: Record<string, QuickReplyItem[]> = {};
    items.forEach((item) => {
      if (!item.group) return;
      (byGroup[item.group] ||= []).push(item);
    });
    return Object.entries(byGroup);
  }, [items]);

  const preview = items.find((item) => item.id === previewId) || null;

  useEffect(() => {
    if (!open) return undefined;
    const onPointerDown = (event: MouseEvent | TouchEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('touchstart', onPointerDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('touchstart', onPointerDown);
    };
  }, [open]);

  useEffect(() => () => {
    if (closeTimer.current !== null) window.clearTimeout(closeTimer.current);
    if (groupTimer.current !== null) window.clearTimeout(groupTimer.current);
  }, []);

  // 悬停预览时才下载图片，避免一次性加载全部附件。
  useEffect(() => {
    if (!preview) return undefined;
    let cancelled = false;
    (preview.attachments || []).forEach((attachment) => {
      if (thumbs[attachment.id]) return;
      fetchAttachmentBlob(buildAttachmentUrl(scope, attachment.id))
        .then((blob) => {
          if (cancelled) return;
          setThumbs((current) => ({ ...current, [attachment.id]: URL.createObjectURL(blob) }));
        })
        .catch(() => undefined);
    });
    return () => { cancelled = true; };
  }, [preview, scope, thumbs]);

  const keepOpen = () => {
    if (closeTimer.current !== null) window.clearTimeout(closeTimer.current);
  };
  const scheduleClose = () => {
    keepOpen();
    closeTimer.current = window.setTimeout(() => { setOpen(false); setActiveGroup(null); setPreviewId(null); }, 180);
  };

  const pick = (item: QuickReplyItem) => {
    onPick(item.id, item.content);
    setOpen(false);
    setActiveGroup(null);
    setPreviewId(null);
  };

  const row = (item: QuickReplyItem) => (
    <div
      key={item.id}
      className="group flex cursor-pointer items-center gap-1 rounded-md px-2 py-1.5 text-sm hover:bg-default-100"
      onMouseEnter={() => { keepOpen(); setPreviewId(item.id); }}
      onClick={() => pick(item)}
      role="menuitem"
      tabIndex={0}
      onKeyDown={(event) => { if (event.key === 'Enter') pick(item); }}
    >
      <span className="min-w-0 flex-1 truncate">{item.title}</span>
      {item.attachments?.length ? <Chip size="sm" variant="flat" className="h-4 px-1 text-[10px]">图{item.attachments.length}</Chip> : null}
      {onDelete && (
        <button
          type="button"
          aria-label={`删除快捷短语 ${item.title}`}
          className="hidden rounded p-0.5 text-default-400 hover:text-danger group-hover:block"
          onClick={(event) => { event.stopPropagation(); onDelete(item.id); }}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );

  return (
    <div className="relative" ref={rootRef}>
      <Button
        size="sm"
        variant="flat"
        isDisabled={disabled}
        startContent={<Zap className="h-3.5 w-3.5" />}
        onMouseEnter={() => { keepOpen(); setOpen(true); }}
        onMouseLeave={scheduleClose}
        onPress={() => setOpen((value) => !value)}
      >
        快捷回复
      </Button>
      {open && (
        <div className="absolute bottom-full left-0 z-50 mb-2 w-64 rounded-xl border border-default-200 bg-white p-1 shadow-lg dark:bg-default-50" role="menu" aria-label="快捷回复">
          <div className="max-h-56 overflow-y-auto" onMouseLeave={() => setPreviewId(null)}>
            {ungrouped.map(row)}
            {groups.map(([group, groupItems]) => (
              <div
                key={group}
                className="relative"
                onMouseEnter={() => {
                  keepOpen();
                  setPreviewId(null);
                  if (groupTimer.current !== null) window.clearTimeout(groupTimer.current);
                  groupTimer.current = window.setTimeout(() => setActiveGroup(group), 80);
                }}
                onMouseLeave={() => {
                  if (groupTimer.current !== null) window.clearTimeout(groupTimer.current);
                  groupTimer.current = window.setTimeout(() => setActiveGroup((current) => (current === group ? null : current)), 150);
                }}
              >
                <div className="flex items-center gap-1 rounded-md px-2 py-1.5 text-sm hover:bg-default-100">
                  <Folder className="h-3.5 w-3.5 text-default-400" />
                  <span className="min-w-0 flex-1 truncate">{group}</span>
                  <span className="text-xs text-default-400">{groupItems.length}</span>
                  <ChevronRight className="h-3.5 w-3.5 text-default-300" />
                </div>
                {activeGroup === group && (
                  <div className="absolute left-full top-0 z-50 ml-1 w-56 rounded-xl border border-default-200 bg-white p-1 shadow-lg dark:bg-default-50" role="menu" aria-label={`分组 ${group}`}>
                    {groupItems.map(row)}
                  </div>
                )}
              </div>
            ))}
            {!items.length && <p className="px-2 py-2 text-xs text-default-400">暂无快捷短语</p>}
          </div>
          {preview && (
            <div className="mt-1 border-t border-default-100 px-2 pb-1 pt-2">
              <p className="mb-1 text-xs font-medium text-default-600">{preview.title}</p>
              <p className="max-h-24 overflow-y-auto whitespace-pre-wrap break-words text-xs text-default-500">{preview.content}</p>
              {(preview.attachments || []).length > 0 && (
                <div className="mt-1 flex flex-wrap gap-1">
                  {(preview.attachments || []).map((attachment) => (
                    thumbs[attachment.id]
                      ? <img key={attachment.id} src={thumbs[attachment.id]} alt={attachment.name} className="h-12 w-12 rounded object-cover" />
                      : <span key={attachment.id} className="h-12 w-12 animate-pulse rounded bg-default-100" />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
