import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import type { ChatConfig, ChatProvider } from '../components/chat/types';
import userApi, { customerServiceApi } from '../services/userApi';

interface CustomerServiceContextValue {
  /**
   * 内置客服的完整配置；未启用内置客服时为 null。
   * Chatwoot 走独立入口，其公开响应只有 { enabled, provider }，不会填充到这里。
   */
  config: ChatConfig | null;
  /** 后端声明的客服提供方。Chatwoot 入口不随内置客服开关消失，据此单独判断。 */
  provider: ChatProvider | null;
  loading: boolean;
  refresh: () => Promise<void>;
  unread: number;
  unreadByConversation: Record<string, number>;
  refreshUnread: (force?: boolean) => Promise<void>;
  markConversationRead: (conversationId: number) => Promise<void>;
  applyConversationRead: (conversationId: number, totalUnread: number) => void;
}

interface ResolvedConfig {
  config: ChatConfig | null;
  provider: ChatProvider | null;
}

const CustomerServiceContext = createContext<CustomerServiceContextValue | null>(null);

const EMPTY_CONFIG: ResolvedConfig = { config: null, provider: null };

let cachedConfig: ResolvedConfig | undefined;
let configRequest: Promise<ResolvedConfig> | null = null;

/**
 * 后端 `public_config` 的两种形态：
 *   - 内置客服可用：完整配置（provider 为 builtin/chatwoot）；
 *   - 不可用或 provider=off：只回 `{ enabled: false, provider: 'chatwoot' | 'off' }`。
 * 后者绝不能被当成完整的 ChatConfig 使用 —— 早期实现用类型断言把残缺对象塞进 config，
 * 导致浮动入口读取 config.badge/config.entry 时抛 TypeError，进而触发全局重载循环。
 */
const resolveConfig = (raw: Awaited<ReturnType<typeof customerServiceApi.getConfig>>): ResolvedConfig => {
  if (raw.provider === 'off') return EMPTY_CONFIG;
  if (raw.enabled === true && raw.provider === 'builtin') return { config: raw, provider: 'builtin' };
  if (raw.enabled === true && raw.provider === 'chatwoot') return { config: raw, provider: 'chatwoot' };
  return { config: null, provider: raw.provider };
};

const loadConfig = (): Promise<ResolvedConfig> => {
  if (configRequest) return configRequest;

  configRequest = customerServiceApi
    .getConfig()
    .then(resolveConfig)
    .catch(() => EMPTY_CONFIG)
    .then((resolved) => {
      cachedConfig = resolved;
      return resolved;
    })
    .finally(() => {
      configRequest = null;
    });

  return configRequest;
};

export function CustomerServiceProvider({ children }: { children: React.ReactNode }): React.ReactElement {
  const [resolved, setResolved] = useState<ResolvedConfig>(cachedConfig ?? EMPTY_CONFIG);
  const [loading, setLoading] = useState(cachedConfig === undefined);
  const [unread, setUnread] = useState(0);
  const [unreadByConversation, setUnreadByConversation] = useState<Record<string, number>>({});
  const unreadRequest = useRef<Promise<void> | null>(null);
  const unreadUpdatedAt = useRef(0);
  const activeRefreshAt = useRef(0);
  const unreadByConversationRef = useRef<Record<string, number>>({});
  const refreshUnread = useCallback(async (force = false): Promise<void> => {
    if (resolved.config?.provider !== 'builtin' || !userApi.auth.isAuthenticated() || document.hidden || !document.hasFocus()) return;
    if (!force && Date.now() - unreadUpdatedAt.current < 15_000) return;
    if (unreadRequest.current) return unreadRequest.current;
    const request = customerServiceApi.getUnread()
      .then((result) => {
        setUnread(Number(result.unread) || 0);
        const next = result.by_conversation || {};
        unreadByConversationRef.current = next;
        setUnreadByConversation(next);
        unreadUpdatedAt.current = Date.now();
      })
      .catch(() => {})
      .finally(() => {
        unreadRequest.current = null;
      });
    unreadRequest.current = request;
    return request;
  }, [resolved.config?.provider]);
  const applyConversationRead = useCallback((conversationId: number, totalUnread: number): void => {
    const key = String(conversationId);
    const next = { ...unreadByConversationRef.current };
    delete next[key];
    unreadByConversationRef.current = next;
    setUnreadByConversation(next);
    setUnread(Math.max(0, Number(totalUnread) || 0));
    unreadUpdatedAt.current = Date.now();
  }, []);

  const markConversationRead = useCallback(async (conversationId: number): Promise<void> => {
    const key = String(conversationId);
    const cleared = Number(unreadByConversationRef.current[key]) || 0;
    if (cleared) {
      const optimistic = { ...unreadByConversationRef.current };
      delete optimistic[key];
      unreadByConversationRef.current = optimistic;
      setUnreadByConversation(optimistic);
      setUnread((current) => Math.max(0, current - cleared));
    }
    try {
      const result = await customerServiceApi.markRead(conversationId);
      setUnread(Number(result.unread) || 0);
      const next = { ...unreadByConversationRef.current };
      delete next[key];
      unreadByConversationRef.current = next;
      setUnreadByConversation(next);
      unreadUpdatedAt.current = Date.now();
    } catch (error) {
      unreadUpdatedAt.current = 0;
      void refreshUnread(true);
      throw error;
    }
  }, [refreshUnread]);

  const refresh = async (): Promise<void> => {
    setLoading(true);
    cachedConfig = undefined;
    setResolved(await loadConfig());
    setLoading(false);
  };

  useEffect(() => {
    if (cachedConfig !== undefined) return;

    void loadConfig().then((next) => {
      setResolved(next);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (resolved.config?.provider !== 'builtin') {
      setUnread(0);
      unreadByConversationRef.current = {};
      setUnreadByConversation({});
      return;
    }
    const refreshActivePage = () => {
      if (document.hidden || !document.hasFocus()) return;
      const now = Date.now();
      if (now - activeRefreshAt.current < 250) return;
      activeRefreshAt.current = now;
      void refreshUnread(true);
    };
    refreshActivePage();
    const timer = window.setInterval(() => void refreshUnread(), 30_000);
    document.addEventListener('visibilitychange', refreshActivePage);
    window.addEventListener('focus', refreshActivePage);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', refreshActivePage);
      window.removeEventListener('focus', refreshActivePage);
    };
  }, [refreshUnread, resolved.config?.provider]);

  return (
    <CustomerServiceContext.Provider
      value={{
        config: resolved.config,
        provider: resolved.provider,
        loading,
        refresh,
        unread,
        unreadByConversation,
        refreshUnread,
        markConversationRead,
        applyConversationRead,
      }}
    >
      {children}
    </CustomerServiceContext.Provider>
  );
}

export function useCustomerService(): CustomerServiceContextValue {
  const context = useContext(CustomerServiceContext);
  if (!context) {
    throw new Error('useCustomerService 必须在 CustomerServiceProvider 内使用');
  }
  return context;
}
