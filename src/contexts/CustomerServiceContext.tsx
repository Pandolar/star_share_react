import React, { createContext, useContext, useEffect, useState } from 'react';
import type { ChatConfig } from '../components/chat/types';
import { customerServiceApi } from '../services/userApi';

interface CustomerServiceContextValue {
  config: ChatConfig | null;
  loading: boolean;
  refresh: () => Promise<void>;
}

const CustomerServiceContext = createContext<CustomerServiceContextValue | null>(null);

let cachedConfig: ChatConfig | null | undefined;
let configRequest: Promise<ChatConfig | null> | null = null;

const loadConfig = (): Promise<ChatConfig | null> => {
  if (configRequest) return configRequest;

  configRequest = customerServiceApi
    .getConfig()
    .then((raw) => {
      if (raw?.provider === 'chatwoot') {
        return { provider: 'chatwoot' } as ChatConfig;
      }
      return raw?.enabled === true && raw.provider === 'builtin' ? raw : null;
    })
    .catch(() => null)
    .then((config) => {
      cachedConfig = config;
      return config;
    })
    .finally(() => {
      configRequest = null;
    });

  return configRequest;
};

export function CustomerServiceProvider({ children }: { children: React.ReactNode }): React.ReactElement {
  const [config, setConfig] = useState<ChatConfig | null>(cachedConfig ?? null);
  const [loading, setLoading] = useState(cachedConfig === undefined);

  const refresh = async (): Promise<void> => {
    setLoading(true);
    cachedConfig = undefined;
    const nextConfig = await loadConfig();
    setConfig(nextConfig);
    setLoading(false);
  };

  useEffect(() => {
    if (cachedConfig !== undefined) return;

    void loadConfig().then((nextConfig) => {
      setConfig(nextConfig);
      setLoading(false);
    });
  }, []);

  return <CustomerServiceContext.Provider value={{ config, loading, refresh }}>{children}</CustomerServiceContext.Provider>;
}

export function useCustomerService(): CustomerServiceContextValue {
  const context = useContext(CustomerServiceContext);
  if (!context) {
    throw new Error('useCustomerService 必须在 CustomerServiceProvider 内使用');
  }
  return context;
}
