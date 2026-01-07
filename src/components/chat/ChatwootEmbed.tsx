import React, { useEffect, useMemo, useState, useRef } from 'react';
import { CHATWOOT_BASE_URL, CHATWOOT_WEBSITE_TOKEN } from '../../config/chatwoot';
import { getChatwootGuestSignature, getChatwootUserSignature } from '../../services/chatwootApi';
import { getCookie } from '../../utils/cookies';

const GUEST_STORAGE_KEY = 'chatwoot_guest_identifier';
const SIGNATURE_CACHE_PREFIX = 'chatwoot_signature_cache_';
const CACHE_DURATION = 1000 * 60 * 60; // 1小时缓存
const DEBUG = process.env.NODE_ENV === 'development';

type EmbedMode = 'auto' | 'guest' | 'user';

interface ChatwootEmbedProps {
  mode?: EmbedMode;
  height?: number;
}

interface SignatureCache {
  identifier: string;
  identifier_hash: string;
  timestamp: number;
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
  log('构建 Widget URL:', { identifier: identifier.substring(0, 20) + '...', url });
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

// 从缓存获取签名
const getCachedSignature = (cacheKey: string): SignatureCache | null => {
  try {
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) {
      const data: SignatureCache = JSON.parse(cached);
      const age = Date.now() - data.timestamp;
      if (age < CACHE_DURATION) {
        log('使用缓存的签名:', { cacheKey, age: Math.round(age / 1000) + 's' });
        return data;
      } else {
        log('缓存已过期:', { cacheKey, age: Math.round(age / 1000) + 's' });
        sessionStorage.removeItem(cacheKey);
      }
    }
  } catch (err) {
    logError('读取签名缓存失败:', err);
  }
  return null;
};

// 保存签名到缓存
const setCachedSignature = (cacheKey: string, signature: { identifier: string; identifier_hash: string }) => {
  try {
    const cache: SignatureCache = {
      identifier: signature.identifier,
      identifier_hash: signature.identifier_hash,
      timestamp: Date.now(),
    };
    sessionStorage.setItem(cacheKey, JSON.stringify(cache));
    log('签名已缓存:', { cacheKey });
  } catch (err) {
    logError('保存签名缓存失败:', err);
  }
};

export const ChatwootEmbed: React.FC<ChatwootEmbedProps> = ({ mode = 'auto', height = 620 }) => {
  const [iframeUrl, setIframeUrl] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [isRateLimited, setIsRateLimited] = useState(false);

  // 使用 ref 追踪请求状态，避免重复请求
  const isLoadingRef = useRef(false);
  const lastRequestTimeRef = useRef(0);

  const desiredMode = useMemo(() => {
    const effectiveMode = mode === 'auto' ? (isLoggedIn() ? 'user' : 'guest') : mode;
    log('Chatwoot 模式:', { requested: mode, effective: effectiveMode });
    return effectiveMode;
  }, [mode]);

  useEffect(() => {
    let isCancelled = false;
    const MIN_REQUEST_INTERVAL = 2000; // 最小请求间隔 2 秒

    const loadSignature = async () => {
      // 防止重复请求
      if (isLoadingRef.current) {
        log('已有请求正在进行中，跳过');
        return;
      }

      // 请求节流：距离上次请求不足 2 秒则跳过
      const timeSinceLastRequest = Date.now() - lastRequestTimeRef.current;
      if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
        log('请求过于频繁，跳过', { timeSinceLastRequest });
        return;
      }

      isLoadingRef.current = true;
      lastRequestTimeRef.current = Date.now();

      setErrorMessage('');
      setIsRateLimited(false);
      setIframeUrl(null);

      log('开始加载签名...', { mode: desiredMode });

      try {
        let signature: { identifier: string; identifier_hash: string };
        let cacheKey: string;

        if (desiredMode === 'user') {
          cacheKey = `${SIGNATURE_CACHE_PREFIX}user_${getCookie('xuserid')}`;

          // 先尝试从缓存获取
          const cached = getCachedSignature(cacheKey);
          if (cached) {
            signature = cached;
            log('使用用户签名缓存');
          } else {
            log('请求用户签名...');
            signature = await getChatwootUserSignature();
            log('用户签名获取成功:', { identifier: signature.identifier.substring(0, 20) + '...' });
            setCachedSignature(cacheKey, signature);
          }
        } else {
          const guestIdentifier = getGuestIdentifier();
          cacheKey = `${SIGNATURE_CACHE_PREFIX}guest_${guestIdentifier}`;

          // 先尝试从缓存获取
          const cached = getCachedSignature(cacheKey);
          if (cached) {
            signature = cached;
            log('使用游客签名缓存');
          } else {
            log('请求游客签名...', { identifier: guestIdentifier });
            signature = await getChatwootGuestSignature(guestIdentifier);
            log('游客签名获取成功:', { identifier: signature.identifier.substring(0, 20) + '...' });
            setCachedSignature(cacheKey, signature);
          }
        }

        if (!isCancelled) {
          setIframeUrl(buildWidgetUrl(signature.identifier, signature.identifier_hash));
        }
      } catch (error: any) {
        logError('加载签名失败:', error);
        if (!isCancelled) {
          // 检查是否是 429 错误
          const is429 = error?.message?.includes('429') ||
                        error?.response?.status === 429 ||
                        error?.status === 429;

          if (is429) {
            setIsRateLimited(true);
            setErrorMessage('请求过于频繁，请稍后再试（建议等待 1-2 分钟）');
            logError('触发限流保护 (429)');
          } else {
            const errorMsg = error instanceof Error ? error.message : '客服加载失败，请稍后再试';
            setErrorMessage(errorMsg);
          }
        }
      } finally {
        isLoadingRef.current = false;
      }
    };

    loadSignature();

    return () => {
      isCancelled = true;
    };
  }, [desiredMode]); // 只依赖 desiredMode，避免不必要的重新加载

  const handleManualRetry = () => {
    log('手动重试...');
    setErrorMessage('');
    setIsRateLimited(false);
    setIframeUrl(null);
    // 重置请求时间，允许立即重试
    lastRequestTimeRef.current = 0;
    isLoadingRef.current = false;
    // 强制重新加载（通过改变 key）
    window.location.reload();
  };

  if (errorMessage) {
    return (
      <div className="w-full rounded-lg border border-dashed border-red-200 bg-red-50 p-6 text-center">
        <p className="text-sm text-red-600 mb-3">{errorMessage}</p>
        {isRateLimited && (
          <div className="text-xs text-gray-600 mb-4 bg-yellow-50 p-3 rounded border border-yellow-200">
            <p className="font-semibold mb-2">限流保护触发原因：</p>
            <ul className="text-left space-y-1">
              <li>• 短时间内请求次数过多</li>
              <li>• 建议等待 1-2 分钟后重试</li>
              <li>• 避免频繁刷新页面</li>
            </ul>
          </div>
        )}
        <button
          onClick={handleManualRetry}
          className="px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded text-sm transition-colors"
        >
          {isRateLimited ? '等待后重试' : '重试'}
        </button>
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
          if (!isLoadingRef.current) {
            setErrorMessage('客服窗口加载失败，请刷新页面重试');
          }
        }}
      />
    </div>
  );
};
