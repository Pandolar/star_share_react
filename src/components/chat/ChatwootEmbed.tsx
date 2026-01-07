import React, { useEffect, useMemo, useState } from 'react';
import { CHATWOOT_BASE_URL, CHATWOOT_WEBSITE_TOKEN } from '../../config/chatwoot';
import { getChatwootGuestSignature, getChatwootUserSignature } from '../../services/chatwootApi';
import { getCookie } from '../../utils/cookies';

const GUEST_STORAGE_KEY = 'chatwoot_guest_identifier';
const DEBUG = process.env.NODE_ENV === 'development'; // 开发环境启用调试日志

type EmbedMode = 'auto' | 'guest' | 'user';

interface ChatwootEmbedProps {
  mode?: EmbedMode;
  height?: number;
}

const log = (...args: any[]) => {
  if (DEBUG) {
    console.log('[Chatwoot]', ...args);
  }
};

const logError = (...args: any[]) => {
  console.error('[Chatwoot Error]', ...args);
};

const buildWidgetUrl = (identifier: string, identifierHash: string): string => {
  const params = new URLSearchParams({
    website_token: CHATWOOT_WEBSITE_TOKEN,
    identifier,
    identifier_hash: identifierHash,
  });
  const url = `${CHATWOOT_BASE_URL}/widget?${params.toString()}`;
  log('构建 Widget URL:', { identifier, url });
  return url;
};

const generateGuestIdentifier = (): string => {
  let identifier: string;
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    identifier = `guest_${crypto.randomUUID()}`;
  } else {
    identifier = `guest_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  }
  log('生成新的游客标识:', identifier);
  return identifier;
};

const getGuestIdentifier = (): string => {
  try {
    const stored = localStorage.getItem(GUEST_STORAGE_KEY);
    if (stored && stored.startsWith('guest_')) {
      log('使用已存储的游客标识:', stored);
      return stored;
    } else if (stored) {
      log('存储的标识格式无效，将重新生成:', stored);
    }
  } catch (err) {
    logError('读取 localStorage 失败:', err);
  }

  const identifier = generateGuestIdentifier();
  try {
    localStorage.setItem(GUEST_STORAGE_KEY, identifier);
    log('游客标识已保存到 localStorage');
  } catch (err) {
    logError('保存到 localStorage 失败:', err);
  }
  return identifier;
};

const isLoggedIn = (): boolean => {
  const xuserid = getCookie('xuserid');
  const xtoken = getCookie('xtoken');
  const xyUuidToken = getCookie('xy_uuid_token');
  const loggedIn = !!(xuserid && xtoken && xyUuidToken);
  log('登录状态检查:', { loggedIn, xuserid: !!xuserid, xtoken: !!xtoken, xyUuidToken: !!xyUuidToken });
  return loggedIn;
};

export const ChatwootEmbed: React.FC<ChatwootEmbedProps> = ({ mode = 'auto', height = 620 }) => {
  const [iframeUrl, setIframeUrl] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [retryCount, setRetryCount] = useState(0);

  const desiredMode = useMemo(() => {
    const effectiveMode = mode === 'auto' ? (isLoggedIn() ? 'user' : 'guest') : mode;
    log('Chatwoot 模式:', { requested: mode, effective: effectiveMode });
    return effectiveMode;
  }, [mode]);

  useEffect(() => {
    let isCancelled = false;

    const loadSignature = async () => {
      setErrorMessage('');
      setIframeUrl(null);

      log('开始加载签名...', { mode: desiredMode, retryCount });

      try {
        if (desiredMode === 'user') {
          log('请求用户签名...');
          const signature = await getChatwootUserSignature();
          log('用户签名获取成功:', signature);
          if (!isCancelled) {
            setIframeUrl(buildWidgetUrl(signature.identifier, signature.identifier_hash));
          }
          return;
        }

        const guestIdentifier = getGuestIdentifier();
        log('请求游客签名...', { identifier: guestIdentifier });
        const signature = await getChatwootGuestSignature(guestIdentifier);
        log('游客签名获取成功:', signature);
        if (!isCancelled) {
          setIframeUrl(buildWidgetUrl(signature.identifier, signature.identifier_hash));
        }
      } catch (error) {
        logError('加载签名失败:', error);
        if (!isCancelled) {
          const errorMsg = error instanceof Error ? error.message : '客服加载失败，请稍后再试';
          setErrorMessage(errorMsg);

          // 自动重试逻辑（最多重试2次）
          if (retryCount < 2) {
            log(`将在3秒后重试 (${retryCount + 1}/2)...`);
            setTimeout(() => {
              setRetryCount(prev => prev + 1);
            }, 3000);
          }
        }
      }
    };

    loadSignature();

    return () => {
      isCancelled = true;
    };
  }, [desiredMode, retryCount]);

  if (errorMessage) {
    return (
      <div className="w-full rounded-lg border border-dashed border-red-200 bg-red-50 p-6 text-center">
        <p className="text-sm text-red-600 mb-3">{errorMessage}</p>
        {retryCount >= 2 && (
          <button
            onClick={() => setRetryCount(0)}
            className="px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded text-sm transition-colors"
          >
            手动重试
          </button>
        )}
        {retryCount < 2 && (
          <p className="text-xs text-gray-500">正在自动重试...</p>
        )}
      </div>
    );
  }

  if (!iframeUrl) {
    return (
      <div className="w-full rounded-lg border border-dashed border-gray-200 bg-gray-50 p-6 text-center text-sm text-gray-500">
        <div className="flex items-center justify-center gap-2">
          <svg className="animate-spin h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span>正在加载客服...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full rounded-lg border border-gray-200 overflow-hidden">
      <iframe
        title="在线客服"
        src={iframeUrl}
        className="w-full"
        style={{ height }}
        frameBorder={0}
        allow="microphone; camera"
        onError={(e) => {
          logError('iframe 加载错误:', e);
          setErrorMessage('客服窗口加载失败，请刷新页面重试');
        }}
      />
    </div>
  );
};
