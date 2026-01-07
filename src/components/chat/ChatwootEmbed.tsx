import React, { useEffect, useMemo, useState, useRef } from 'react';
import { CHATWOOT_BASE_URL, CHATWOOT_WEBSITE_TOKEN } from '../../config/chatwoot';
import { getChatwootGuestSignature, getChatwootUserSignature } from '../../services/chatwootApi';
import { getCookie } from '../../utils/cookies';
import { chatwootRequestManager } from '../../utils/chatwootRequestManager';

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
  const [rateLimitInfo, setRateLimitInfo] = useState<string>('');

  // 组件挂载标记，防止重复初始化
  const isMountedRef = useRef(false);
  const componentIdRef = useRef(`chatwoot-${Math.random().toString(36).substr(2, 9)}`);

  const desiredMode = useMemo(() => {
    const effectiveMode = mode === 'auto' ? (isLoggedIn() ? 'user' : 'guest') : mode;
    log('Chatwoot 模式:', { requested: mode, effective: effectiveMode, componentId: componentIdRef.current });
    return effectiveMode;
  }, [mode]);

  useEffect(() => {
    // 防止重复挂载
    if (isMountedRef.current) {
      log('组件已挂载，跳过重复初始化', componentIdRef.current);
      return;
    }
    isMountedRef.current = true;

    let isCancelled = false;

    const loadSignature = async () => {
      setErrorMessage('');
      setIsRateLimited(false);
      setRateLimitInfo('');

      log('开始加载签名...', { mode: desiredMode, componentId: componentIdRef.current });

      try {
        let signature: { identifier: string; identifier_hash: string };
        let cacheKey: string;
        let requestKey: string; // 全局请求管理器的 key

        if (desiredMode === 'user') {
          const xuserid = getCookie('xuserid');
          cacheKey = `${SIGNATURE_CACHE_PREFIX}user_${xuserid}`;
          requestKey = `user_signature_${xuserid}`;

          // 先尝试从缓存获取
          const cached = getCachedSignature(cacheKey);
          if (cached) {
            signature = cached;
            log('使用用户签名缓存', componentIdRef.current);
          } else {
            log('通过全局管理器请求用户签名...', componentIdRef.current);
            // 使用全局请求管理器，防止并发
            signature = await chatwootRequestManager.executeRequest(
              requestKey,
              () => getChatwootUserSignature()
            );
            log('用户签名获取成功:', { identifier: signature.identifier.substring(0, 20) + '...' });
            setCachedSignature(cacheKey, signature);
          }
        } else {
          const guestIdentifier = getGuestIdentifier();
          cacheKey = `${SIGNATURE_CACHE_PREFIX}guest_${guestIdentifier}`;
          requestKey = `guest_signature_${guestIdentifier}`;

          // 先尝试从缓存获取
          const cached = getCachedSignature(cacheKey);
          if (cached) {
            signature = cached;
            log('使用游客签名缓存', componentIdRef.current);
          } else {
            log('通过全局管理器请求游客签名...', componentIdRef.current);
            // 使用全局请求管理器，防止并发
            signature = await chatwootRequestManager.executeRequest(
              requestKey,
              () => getChatwootGuestSignature(guestIdentifier)
            );
            log('游客签名获取成功:', { identifier: signature.identifier.substring(0, 20) + '...' });
            setCachedSignature(cacheKey, signature);
          }
        }

        if (!isCancelled) {
          const url = buildWidgetUrl(signature.identifier, signature.identifier_hash);
          setIframeUrl(url);

          // 输出诊断信息
          log('✅ Chatwoot 组件初始化完成', {
            componentId: componentIdRef.current,
            mode: desiredMode,
            identifier: signature.identifier.substring(0, 30) + '...',
            cacheKey,
            managerStats: chatwootRequestManager.getStats(),
          });
        }
      } catch (error: any) {
        logError('加载签名失败:', error, componentIdRef.current);
        if (!isCancelled) {
          // 检查是否是 429 错误
          const is429 = error?.message?.includes('429') ||
                        error?.response?.status === 429 ||
                        error?.status === 429;

          if (is429) {
            setIsRateLimited(true);
            const identifier = desiredMode === 'user'
              ? getCookie('xy_uuid_token')?.substring(0, 30)
              : getGuestIdentifier().substring(0, 30);

            setRateLimitInfo(`当前标识: ${identifier}...`);
            setErrorMessage('Chatwoot 服务器限流保护已触发');
            logError('⚠️ 触发 Chatwoot 限流 (429)', {
              identifier,
              mode: desiredMode,
              suggestion: '这个标识可能在之前的测试中被限流，建议：\n1. 等待 5-10 分钟\n2. 如果是用户模式，可尝试切换到游客模式\n3. 清除 sessionStorage 和 localStorage'
            });
          } else {
            const errorMsg = error instanceof Error ? error.message : '客服加载失败，请稍后再试';
            setErrorMessage(errorMsg);
          }
        }
      }
    };

    loadSignature();

    return () => {
      isCancelled = true;
      isMountedRef.current = false;
    };
  }, [desiredMode]);

  const handleManualRetry = () => {
    log('手动重试...清除缓存并重新加载', componentIdRef.current);

    // 清除缓存
    try {
      sessionStorage.clear();
      localStorage.removeItem(GUEST_STORAGE_KEY);
      log('✅ 缓存已清除');
    } catch (err) {
      logError('清除缓存失败:', err);
    }

    // 重置状态
    setErrorMessage('');
    setIsRateLimited(false);
    setRateLimitInfo('');
    setIframeUrl(null);
    isMountedRef.current = false;

    // 刷新页面
    window.location.reload();
  };

  const handleSwitchToGuest = () => {
    log('切换到游客模式...');
    window.location.href = '/customer-service';
  };

  if (errorMessage) {
    return (
      <div className="w-full rounded-lg border border-dashed border-red-200 bg-red-50 p-6">
        <div className="text-center mb-4">
          <p className="text-sm text-red-600 font-semibold mb-2">{errorMessage}</p>
          {rateLimitInfo && (
            <p className="text-xs text-gray-600 bg-white px-3 py-2 rounded inline-block">
              {rateLimitInfo}
            </p>
          )}
        </div>

        {isRateLimited && (
          <div className="text-xs text-gray-700 mb-4 bg-yellow-50 p-4 rounded border border-yellow-200">
            <p className="font-semibold mb-3 text-yellow-800">⚠️ 429 限流保护触发 - 诊断信息：</p>
            <ul className="text-left space-y-2 mb-3">
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span><strong>原因：</strong>这个标识（identifier）在短时间内请求 Chatwoot 次数过多</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span><strong>持续时间：</strong>Chatwoot 限流通常持续 5-15 分钟</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span><strong>当前模式：</strong>{desiredMode === 'user' ? '用户模式（使用 xy_uuid_token）' : '游客模式（使用 guest_xxx）'}</span>
              </li>
            </ul>

            <div className="bg-blue-50 p-3 rounded border border-blue-200">
              <p className="font-semibold text-blue-800 mb-2">💡 解决方案：</p>
              <ol className="text-left space-y-2 list-decimal list-inside">
                <li><strong>等待 10 分钟</strong>后刷新页面（推荐）</li>
                {desiredMode === 'user' && (
                  <li><strong>切换到游客模式</strong>测试（使用新的 identifier）</li>
                )}
                <li>检查是否有<strong>多个页面/标签</strong>同时打开客服</li>
                <li>避免<strong>频繁刷新</strong>页面</li>
              </ol>
            </div>
          </div>
        )}

        <div className="flex gap-2 justify-center flex-wrap">
          <button
            onClick={handleManualRetry}
            className="px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded text-sm transition-colors"
          >
            清除缓存并重试
          </button>
          {desiredMode === 'user' && isRateLimited && (
            <button
              onClick={handleSwitchToGuest}
              className="px-4 py-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded text-sm transition-colors"
            >
              切换到游客模式
            </button>
          )}
        </div>

        {DEBUG && (
          <div className="mt-4 text-xs text-left bg-gray-100 p-3 rounded">
            <p className="font-mono text-gray-600">
              <strong>调试信息：</strong><br/>
              Component ID: {componentIdRef.current}<br/>
              Mode: {desiredMode}<br/>
              Manager Stats: {JSON.stringify(chatwootRequestManager.getStats(), null, 2)}
            </p>
          </div>
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
        key={iframeUrl} // 使用 key 强制重新挂载
        title="在线客服"
        src={iframeUrl}
        className="w-full"
        style={{ height }}
        frameBorder={0}
        allow="microphone; camera"
        onError={(e) => {
          logError('iframe 加载错误:', e, componentIdRef.current);
          setErrorMessage('客服窗口加载失败，请刷新页面重试');
        }}
      />
      {DEBUG && (
        <div className="text-xs p-2 bg-gray-50 border-t border-gray-200 text-gray-600">
          <span className="font-mono">Component: {componentIdRef.current} | Mode: {desiredMode}</span>
        </div>
      )}
    </div>
  );
};
