/**
 * Chatwoot SDK 全局类型定义
 */

interface ChatwootUser {
  identifier_hash: string;
  name?: string;
  email?: string;
  avatar_url?: string;
  phone_number?: string;
}

interface ChatwootSDK {
  run: (config: {
    websiteToken: string;
    baseUrl: string;
  }) => void;
}

interface ChatwootWidget {
  toggle?: (state?: 'open' | 'close') => void;
  setUser?: (identifier: string, user: ChatwootUser) => void;
  setCustomAttributes?: (attributes: Record<string, any>) => void;
  deleteCustomAttribute?: (attributeName: string) => void;
  setLabel?: (label: string) => void;
  removeLabel?: (label: string) => void;
  setLocale?: (locale: string) => void;
  reset?: () => void;
}

declare global {
  interface Window {
    chatwootSDK?: ChatwootSDK;
    $chatwoot?: ChatwootWidget;
    chatwootSettings?: {
      hideMessageBubble?: boolean;
      position?: 'left' | 'right';
      locale?: string;
      type?: 'standard' | 'expanded_bubble';
      launcherTitle?: string;
    };
  }
}

export {};
