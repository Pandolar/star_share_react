import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
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

interface Anchor {
  left: number;
  top: number;
}

const PREVIEW_WIDTH = 288;
const GROUP_WIDTH = 224;

/**
 * 快捷回复菜单：未分组项置顶，分组项悬停展开；悬停任意一项在侧边显示内容与图片预览。
 * 菜单本体与侧边浮层均用 fixed 定位/portal，避免布局抖动与父级 overflow 裁切。
 */
export default function QuickReplyMenu({ items, scope, disabled, onPick, onDelete }: Props): React.ReactElement {
  const [open, setOpen] = useState(false);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [previewAnchor, setPreviewAnchor] = useState<Anchor | null>(null);
  const [activeGroup, setActiveGroup] = useState<string | null>(null);
  const [groupAnchor, setGroupAnchor] = useState<Anchor | null>(null);
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
  const groupItems = activeGroup ? groups.find(([group]) => group === activeGroup)?.[1] || [] : [];

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

  useEffect(() => {
    if (open) return;
    setActiveGroup(null);
    setGroupAnchor(null);
    setPreviewId(null);
    setPreviewAnchor(null);
  }, [open]);

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

  const pick = (item: QuickReplyItem) => {
    onPick(item.id, item.content);
    setOpen(false);
    setPreviewId(null);
    setPreviewAnchor(null);
    setActiveGroup(null);
  };

  // 侧边预览锚点：优先显示在行右侧，空间不足则翻到左侧并夹在视口内。
  const sideAnchor = (rect: DOMRect, width: number, gap: number): Anchor => {
    const left = rect.right + width + gap + 8 <= window.innerWidth
      ? rect.right + gap
      : Math.max(8, rect.left - width - gap);
    const top = Math.max(8, Math.min(rect.top, window.innerHeight - 200));
    return { left, top };
  };

  const row = (item: QuickReplyItem) => (
    <div
      key={item.id}
      data-reply-id={item.id}
      className="group flex cursor-pointer items-center gap-1 rounded-md px-2 py-1.5 text-sm hover:bg-default-100"
      onMouseEnter={(event) => {
        setPreviewId(item.id);
        setPreviewAnchor(sideAnchor(event.currentTarget.getBoundingClientRect(), PREVIEW_WIDTH, 8));
      }}
      onMouseLeave={() => setPreviewAnchor(null)}
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
        onMouseEnter={() => setOpen(true)}
        onPress={() => setOpen((value) => !value)}
      >
        快捷回复
      </Button>
      {open && (
        <div
          className="absolute bottom-full left-0 z-50 mb-2 w-64 rounded-xl border border-default-200 bg-white p-1 shadow-lg dark:bg-default-50"
          role="menu"
          aria-label="快捷回复"
        >
          <div className="max-h-56 overflow-y-auto">
            {ungrouped.map(row)}
            {groups.map(([group, groupItems]) => (
              <div
                key={group}
                onMouseEnter={(event) => {
                  setActiveGroup(group);
                  setGroupAnchor(sideAnchor(event.currentTarget.getBoundingClientRect(), GROUP_WIDTH, 6));
                }}
              >
                <div className="flex items-center gap-1 rounded-md px-2 py-1.5 text-sm hover:bg-default-100">
                  <Folder className="h-3.5 w-3.5 text-default-400" />
                  <span className="min-w-0 flex-1 truncate">{group}</span>
                  <span className="text-xs text-default-400">{groupItems.length}</span>
                  <ChevronRight className="h-3.5 w-3.5 text-default-300" />
                </div>
              </div>
            ))}
            {!items.length && <p className="px-2 py-2 text-xs text-default-400">暂无快捷短语</p>}
          </div>
        </div>
      )}
      {open && activeGroup && groupAnchor && groupItems.length > 0 && createPortal(
        <div
          role="menu"
          aria-label={`分组 ${activeGroup}`}
          className="fixed z-[70]"
          style={{ left: groupAnchor.left, top: groupAnchor.top }}
          onMouseEnter={() => setActiveGroup(activeGroup)}
        >
          <div className="w-56 rounded-xl border border-default-200 bg-white p-1 shadow-lg dark:bg-default-50">
            {groupItems.map(row)}
          </div>
        </div>,
        document.body,
      )}
      {open && preview && previewAnchor && createPortal(
        <div
          className="pointer-events-none fixed z-[80] w-72 rounded-xl border border-default-200 bg-white p-3 shadow-lg dark:bg-default-50"
          style={{ left: previewAnchor.left, top: previewAnchor.top }}
          role="tooltip"
          aria-label={`快捷短语预览 ${preview.title}`}
        >
          <p className="mb-1 text-xs font-medium text-default-600">{preview.title}</p>
          <p className="max-h-40 overflow-y-auto whitespace-pre-wrap break-words text-xs text-default-500">{preview.content}</p>
          {(preview.attachments || []).length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {(preview.attachments || []).map((attachment) => (
                thumbs[attachment.id]
                  ? <img key={attachment.id} src={thumbs[attachment.id]} alt={attachment.name} className="h-16 w-16 rounded object-cover" />
                  : <span key={attachment.id} className="h-16 w-16 animate-pulse rounded bg-default-100" />
              ))}
            </div>
          )}
        </div>,
        document.body,
      )}
    </div>
  );
}
