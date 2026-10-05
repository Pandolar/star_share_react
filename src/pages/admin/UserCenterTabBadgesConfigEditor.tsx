import React, { useMemo } from 'react';
import { Select, SelectItem, Switch } from '@heroui/react';

type TabKey = 'announcements' | 'profile' | 'subscription' | 'team' | 'orders' | 'activity' | 'invite' | 'about' | 'support';
type TabConfig = { enabled: boolean; emoji: string };
type BadgeConfig = { enabled: boolean; tabs: Partial<Record<TabKey, TabConfig>> };

type TabOption = { key: TabKey; label: string; emoji: string };

const TAB_OPTIONS: TabOption[] = [
  { key: 'announcements', label: '公告', emoji: '⭐' },
  { key: 'profile', label: '个人资料', emoji: '✨' },
  { key: 'subscription', label: '订阅套餐', emoji: '🎉' },
  { key: 'team', label: '团队', emoji: '🔥' },
  { key: 'orders', label: '订单', emoji: '💰' },
  { key: 'activity', label: '活动', emoji: '📌' },
  { key: 'invite', label: '邀请返利', emoji: '🆕' },
  { key: 'about', label: '关于我们', emoji: '📢' },
  { key: 'support', label: '客服支持', emoji: '🌈' },
];

const EMOJIS = ['⭐', '✨', '🎉', '🔥', '💰', '📌', '🆕', '📢', '🌈', '👥'];

const parseConfig = (value: string): BadgeConfig => {
  try {
    const raw = JSON.parse(value || '{}') as { enabled?: unknown; tabs?: unknown };
    const rawTabs = raw && typeof raw.tabs === 'object' && raw.tabs !== null && !Array.isArray(raw.tabs)
      ? raw.tabs as Record<string, unknown>
      : {};
    const tabs: Partial<Record<TabKey, TabConfig>> = {};
    TAB_OPTIONS.forEach(({ key, emoji: defaultEmoji }) => {
      const tab = rawTabs[key];
      if (!tab || typeof tab !== 'object' || Array.isArray(tab)) return;
      const candidate = tab as { enabled?: unknown; emoji?: unknown };
      const emoji = typeof candidate.emoji === 'string' && EMOJIS.includes(candidate.emoji)
        ? candidate.emoji
        : defaultEmoji;
      tabs[key] = { enabled: candidate.enabled === true, emoji };
    });
    return { enabled: raw?.enabled === true, tabs };
  } catch {
    return { enabled: false, tabs: {} };
  }
};

export const UserCenterTabBadgesConfigEditor: React.FC<{
  value: string;
  onChange: (json: string) => void;
  disabled?: boolean;
}> = ({ value, onChange, disabled = false }) => {
  const config = useMemo(() => parseConfig(value), [value]);
  const emit = (next: BadgeConfig) => onChange(JSON.stringify(next, null, 2));

  const updateTab = (option: TabOption, patch: Partial<TabConfig>) => {
    const current = config.tabs[option.key] || { enabled: false, emoji: option.emoji };
    emit({ ...config, tabs: { ...config.tabs, [option.key]: { ...current, ...patch } } });
  };

  return (
    <div className="space-y-4 rounded-medium border border-divider p-4">
      <Switch
        isSelected={config.enabled}
        onValueChange={(enabled) => emit({ ...config, enabled })}
        isDisabled={disabled}
      >
        启用用户中心 Tab 角标
      </Switch>
      <p className="text-sm text-default-500">
        默认关闭。仅可选择系统预置 Emoji；客服未读数字会优先于 Emoji 显示。
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        {TAB_OPTIONS.map((option) => {
          const tab = config.tabs[option.key] || { enabled: false, emoji: option.emoji };
          return (
            <div key={option.key} className="flex items-center gap-3 rounded-medium border border-divider p-3">
              <Switch
                size="sm"
                isSelected={tab.enabled}
                onValueChange={(enabled) => updateTab(option, { enabled })}
                isDisabled={disabled || !config.enabled}
              >
                {option.label}
              </Switch>
              <Select
                aria-label={`${option.label}角标 Emoji`}
                selectedKeys={[tab.emoji]}
                onSelectionChange={(keys) => updateTab(option, { emoji: String(Array.from(keys)[0] || option.emoji) })}
                isDisabled={disabled || !config.enabled}
                className="min-w-24 flex-1"
                size="sm"
              >
                {EMOJIS.map((emoji) => <SelectItem key={emoji}>{emoji}</SelectItem>)}
              </Select>
            </div>
          );
        })}
      </div>
    </div>
  );
};
