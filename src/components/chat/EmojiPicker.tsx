import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@heroui/react';
import { Smile } from 'lucide-react';

/**
 * 轻量表情选择器：常用 Unicode Emoji，分栏 + 最近使用。
 * 无第三方依赖；点击后回调所选表情，由调用方拼进输入框。
 */

const CATEGORIES: { key: string; label: string; emojis: string[] }[] = [
  {
    key: 'smileys',
    label: '笑脸',
    emojis: [
      '😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃',
      '😉', '😊', '😇', '🥰', '😍', '🤩', '😘', '😗', '😚', '😙',
      '🥲', '😋', '😛', '😜', '🤪', '😝', '🤗', '🤭', '🫢', '🤫',
      '🤔', '🫡', '🤐', '🤨', '😐', '😑', '😶', '🫥', '😏', '😒',
      '🙄', '😬', '😮', '😯', '😴', '🤤', '😪', '😵', '🤯', '🥱',
      '😎', '🥳', '🤠', '🥺', '😢', '😭', '😤', '😠', '😡', '🤬',
      '😱', '😨', '😰', '😥', '😓', '🫣', '🤗', '🤔', '🫨', '🤝',
    ],
  },
  {
    key: 'gestures',
    label: '手势',
    emojis: [
      '👍', '👎', '👌', '🤌', '🤏', '✌️', '🤞', '🫰', '🤟', '🤘',
      '🤙', '👈', '👉', '👆', '👇', '☝️', '✋', '🤚', '🖐️', '🖖',
      '👋', '🤝', '🙏', '✍️', '💪', '🦾', '👏', '🙌', '🫶', '👐',
      '🤲', '🫱', '🫲', '🫳', '🫴', '👊', '✊', '🤛', '🤜', '💅',
    ],
  },
  {
    key: 'hearts',
    label: '爱心',
    emojis: [
      '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔',
      '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟', '♥️',
      '💯', '💢', '💥', '💫', '💦', '💨', '🕳️', '💬', '👁️‍🗨️', '🗨️',
    ],
  },
  {
    key: 'animals',
    label: '动物',
    emojis: [
      '🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯',
      '🦁', '🐮', '🐷', '🐸', '🐵', '🙈', '🙉', '🙊', '🐔', '🐧',
      '🐦', '🐤', '🦆', '🦅', '🦉', '🦇', '🐺', '🐗', '🐴', '🦄',
      '🐝', '🐛', '🦋', '🐌', '🐞', '🐜', '🦂', '🐢', '🐍', '🐙',
    ],
  },
  {
    key: 'food',
    label: '食物',
    emojis: [
      '🍏', '🍎', '🍐', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🫐',
      '🍈', '🍒', '🍑', '🥭', '🍍', '🥥', '🥝', '🍅', '🍆', '🥑',
      '🥦', '🥬', '🥒', '🌶️', '🌽', '🥕', '🧄', '🧅', '🥔', '🍠',
      '🍜', '🍝', '🍣', '🍱', '🍛', '🍚', '🍢', '🍡', '🍧', '🍰',
      '🎂', '☕', '🍵', '🧋', '🥤', '🍺', '🍻', '🥂', '🍷', '🥃',
    ],
  },
  {
    key: 'activities',
    label: '活动',
    emojis: [
      '⚽', '🏀', '🏈', '⚾', '🥎', '🎾', '🏐', '🏉', '🎱', '🏓',
      '🏆', '🥇', '🥈', '🥉', '🎯', '🎮', '🕹️', '🎲', '🧩', '🎰',
      '🎨', '🎬', '🎤', '🎧', '🎼', '🎹', '🥁', '🎷', '🎺', '🎸',
    ],
  },
  {
    key: 'objects',
    label: '物品',
    emojis: [
      '⌚', '📱', '💻', '⌨️', '🖥️', '🖨️', '🖱️', '💽', '💾', '💿',
      '📷', '📹', '🎥', '📞', '☎️', '📟', '📡', '📺', '📻', '⚗️',
      '🔍', '🔎', '🕯️', '💡', '🔦', '📈', '📉', '📊', '📋', '📌',
      '📎', '🖇️', '✂️', '📁', '📂', '🗑️', '🔒', '🔑', '🔨', '🛠️',
    ],
  },
  {
    key: 'symbols',
    label: '符号',
    emojis: [
      '✅', '❌', '❓', '❗', '⭕', '🚫', '⚠️', '♻️', '🔱', '⚜️',
      '🔰', '✳️', '✴️', '❇️', '©️', '®️', '™️', '#️⃣', '*️⃣', '0️⃣',
      '🔟', '🎯', '🌱', '🌸', '🌞', '🌝', '🌚', '⭐', '🌟', '✨',
      '⚡', '🔥', '💧', '🌊', '🎉', '🎊', '🎈', '🎁', '🏆', '🥳',
    ],
  },
].map((category) => ({ ...category, emojis: Array.from(new Set(category.emojis)) }));

const RECENT_KEY = 'cs-emoji-recent';
const RECENT_LIMIT = 24;

const loadRecent = (): string[] => {
  try {
    const raw = window.localStorage.getItem(RECENT_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string').slice(0, RECENT_LIMIT) : [];
  } catch {
    return [];
  }
};

export interface EmojiPickerProps {
  disabled?: boolean;
  onPick: (emoji: string) => void;
}

export default function EmojiPicker({ disabled, onPick }: EmojiPickerProps): React.ReactElement {
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState('smileys');
  const [recent, setRecent] = useState<string[]>(() => loadRecent());
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return undefined;
    const onPointerDown = (event: MouseEvent | TouchEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('touchstart', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('touchstart', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const active = useMemo(() => CATEGORIES.find((item) => item.key === category) ?? CATEGORIES[0], [category]);

  const pick = (emoji: string) => {
    const next = [emoji, ...recent.filter((item) => item !== emoji)].slice(0, RECENT_LIMIT);
    setRecent(next);
    try {
      window.localStorage.setItem(RECENT_KEY, JSON.stringify(next));
    } catch {
      /* 本地存储不可用时仅本次会话记住 */
    }
    onPick(emoji);
  };

  return (
    <div className="relative" ref={rootRef}>
      <Button
        isIconOnly
        variant="light"
        aria-label="选择表情"
        isDisabled={disabled}
        onPress={() => setOpen((previous) => !previous)}
      >
        <Smile size={18} />
      </Button>
      {open && (
        <div
          className="absolute bottom-full left-0 z-50 mb-2 w-72 rounded-xl border border-default-200 bg-white p-2 shadow-lg dark:bg-default-50"
          role="dialog"
          aria-label="表情选择"
        >
          <div className="mb-2 flex flex-wrap gap-1">
            {recent.length > 0 && (
              <button
                type="button"
                onClick={() => setCategory('recent')}
                className={`rounded-full px-2 py-0.5 text-xs ${category === 'recent' ? 'bg-primary text-white' : 'bg-default-100 text-default-600'}`}
              >
                最近
              </button>
            )}
            {CATEGORIES.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => setCategory(item.key)}
                className={`rounded-full px-2 py-0.5 text-xs ${category === item.key ? 'bg-primary text-white' : 'bg-default-100 text-default-600'}`}
              >
                {item.label}
              </button>
            ))}
          </div>
          <div className="grid max-h-52 grid-cols-8 gap-0.5 overflow-y-auto">
            {(category === 'recent' ? recent : active.emojis).map((emoji, index) => (
              <button
                key={`${emoji}-${index}`}
                type="button"
                onClick={() => pick(emoji)}
                className="rounded-md p-1 text-xl leading-6 transition-colors hover:bg-default-100 focus:outline-none focus-visible:bg-default-200"
                aria-label={`插入表情 ${emoji}`}
              >
                {emoji}
              </button>
            ))}
          </div>
          <p className="mt-1 text-center text-[10px] text-default-400">点击插入，可连续选择</p>
        </div>
      )}
    </div>
  );
}
