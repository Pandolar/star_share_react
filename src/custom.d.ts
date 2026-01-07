/// <reference types="styled-jsx/style" />

interface ChatwootSDK {
  run: (config: { websiteToken: string; baseUrl: string }) => void;
}

interface ChatwootWidget {
  setUser?: (identifier: string, attributes: {
    name?: string;
    email?: string;
    identifier_hash?: string;
    [key: string]: unknown;
  }) => void;
  reset?: () => void;
}

interface Window {
  chatwootSDK?: ChatwootSDK;
  $chatwoot?: ChatwootWidget;
}
