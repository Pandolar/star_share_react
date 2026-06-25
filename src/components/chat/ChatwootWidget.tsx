/**
 * Chatwoot 客服组件（SDK 方式）
 * 使用官方 SDK 正确实现用户识别和聊天历史保存
 */
/// <reference path="../../types/chatwoot.d.ts" />

import { useEffect, useRef } from 'react';
import { getChatwootBaseUrl, getChatwootWebsiteToken, loadChatwootConfig } from '../../config';
import { getChatwootGuestSignature, getChatwootUserSignature } from '../../services/chatwootApi';
import { getCookie } from '../../utils/cookies';

const GUEST_STORAGE_KEY = 'chatwoot_guest_identifier';
const DEBUG = process.env.NODE_ENV === 'development';

type ChatwootMode = 'auto' | 'guest' | 'user';

interface ChatwootWidgetProps {
  mode?: ChatwootMode;
  hideMessageBubble?: boolean;
}

const log = (...args: any[]) => {
  if (DEBUG) {
    console.log('[Chatwoot Widget]', ...args);
  }
};

const logError = (...args: any[]) => {
  console.error('[Chatwoot Widget Error]', ...args);
};

// 生成游客标识
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

// 获取或创建游客标识
const getGuestIdentifier = (): string => {
  try {
    const stored = localStorage.getItem(GUEST_STORAGE_KEY);
    if (stored && stored.startsWith('guest_')) {
      log('使用已存储的游客标识:', stored);
      return stored;
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

// 检查用户是否已登录
const isLoggedIn = (): boolean => {
  const xuserid = getCookie('xuserid');
  const xtoken = getCookie('xtoken');
  const xyUuidToken = getCookie('xy_uuid_token');
  return !!(xuserid && xtoken && xyUuidToken);
};

// 加载 Chatwoot SDK
const loadChatwootSDK = async (): Promise<void> => {
  // 先加载配置
  await loadChatwootConfig();
  const baseUrl = getChatwootBaseUrl();

  return new Promise((resolve, reject) => {
    // 如果 SDK 已经加载
    if (window.chatwootSDK) {
      log('SDK 已加载');
      resolve();
      return;
    }

    // 检查是否已经有脚本标签
    const existingScript = document.getElementById('chatwoot-sdk-script');
    if (existingScript) {
      log('SDK 脚本已存在，等待加载');
      existingScript.addEventListener('load', () => resolve());
      existingScript.addEventListener('error', () => reject(new Error('SDK 加载失败')));
      return;
    }

    // 创建脚本标签
    const script = document.createElement('script');
    script.id = 'chatwoot-sdk-script';
    script.src = `${baseUrl}/packs/js/sdk.js`;
    script.async = true;
    script.defer = true;

    script.onload = () => {
      log('SDK 脚本加载成功');
      resolve();
    };

    script.onerror = () => {
      logError('SDK 脚本加载失败');
      reject(new Error('Chatwoot SDK 加载失败'));
    };

    document.head.appendChild(script);
    log('开始加载 SDK 脚本');
  });
};

// 初始化 Chatwoot SDK
const initChatwootSDK = (): Promise<void> => {
  return new Promise((resolve) => {
    const chatwoot = window.$chatwoot as any;
    // 如果已经初始化
    if (chatwoot) {
      log('SDK 已初始化');
      resolve();
      return;
    }

    // 获取动态配置
    const websiteToken = getChatwootWebsiteToken();
    const baseUrl = getChatwootBaseUrl();

    // 运行 SDK
    if (window.chatwootSDK?.run) {
      window.chatwootSDK.run({
        websiteToken,
        baseUrl,
      });
      log('SDK 初始化完成', { websiteToken, baseUrl });

      // 等待 $chatwoot 对象可用
      const checkInterval = setInterval(() => {
        if (window.$chatwoot) {
          clearInterval(checkInterval);
          log('$chatwoot 对象已准备就绪');
          resolve();
        }
      }, 100);

      // 超时保护
      setTimeout(() => {
        clearInterval(checkInterval);
        if (!window.$chatwoot) {
          logError('$chatwoot 对象初始化超时');
        }
        resolve();
      }, 5000);
    } else {
      logError('chatwootSDK.run 方法不可用');
      resolve();
    }
  });
};

// 设置用户身份（游客模式）
const setGuestUser = async (): Promise<void> => {
  try {
    const identifier = getGuestIdentifier();
    log('设置游客身份:', identifier);

    const signature = await getChatwootGuestSignature(identifier);
    log('获取游客签名成功:', signature);

    const chatwoot = window.$chatwoot as any;
    if (chatwoot?.setUser) {
      chatwoot.setUser(signature.identifier, {
        identifier_hash: signature.identifier_hash,
        name: '游客',
      });
      log('游客身份设置成功');
    } else {
      logError('$chatwoot.setUser 方法不可用');
    }
  } catch (error) {
    logError('设置游客身份失败:', error);
    throw error;
  }
};

// 设置用户身份（已登录用户模式）
const setAuthenticatedUser = async (): Promise<void> => {
  try {
    log('设置已登录用户身份');

    const signature = await getChatwootUserSignature();
    log('获取用户签名成功:', signature);

    const chatwoot = window.$chatwoot as any;
    if (chatwoot?.setUser) {
      chatwoot.setUser(signature.identifier, {
        identifier_hash: signature.identifier_hash,
        name: signature.name,
        email: signature.email,
      });
      log('用户身份设置成功:', { name: signature.name, email: signature.email });
    } else {
      logError('$chatwoot.setUser 方法不可用');
    }
  } catch (error) {
    logError('设置用户身份失败:', error);
    throw error;
  }
};

export const ChatwootWidget: React.FC<ChatwootWidgetProps> = ({
  mode = 'auto',
  hideMessageBubble = false,
}) => {
  const isInitializedRef = useRef(false);

  useEffect(() => {
    // 防止重复初始化
    if (isInitializedRef.current) {
      log('组件已初始化，跳过');
      return;
    }

    const initChatwoot = async () => {
      try {
        log('开始初始化 Chatwoot', { mode, hideMessageBubble });

        // 设置全局配置
        window.chatwootSettings = {
          hideMessageBubble,
          position: 'right',
          locale: 'zh_CN',
          type: 'standard',
        };

        // 1. 加载 SDK
        await loadChatwootSDK();

        // 2. 初始化 SDK
        await initChatwootSDK();

        // 3. 确定使用模式
        const effectiveMode = mode === 'auto' ? (isLoggedIn() ? 'user' : 'guest') : mode;
        log('使用模式:', effectiveMode);

        // 4. 设置用户身份
        if (effectiveMode === 'user') {
          await setAuthenticatedUser();
        } else {
          await setGuestUser();
        }

        isInitializedRef.current = true;
        log('✅ Chatwoot 初始化完成');
      } catch (error) {
        logError('❌ Chatwoot 初始化失败:', error);
      }
    };

    initChatwoot();

    // 清理函数
    return () => {
      // 不做任何清理，保持 Chatwoot 实例存活
      log('组件卸载（Chatwoot 实例保持）');
    };
  }, [mode, hideMessageBubble]);

  // 此组件不渲染任何内容
  return null;
};

// 导出工具函数供外部使用
export const toggleChatwoot = (state?: 'open' | 'close') => {
  const chatwoot = window.$chatwoot as any;
  if (chatwoot?.toggle) {
    chatwoot.toggle(state);
  } else {
    logError('Chatwoot 未初始化');
  }
};

export const resetChatwoot = () => {
  const chatwoot = window.$chatwoot as any;
  if (chatwoot?.reset) {
    chatwoot.reset();
    log('Chatwoot 已重置');
  }
};
