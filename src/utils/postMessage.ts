/**
 * postMessage 通信工具（简化版）
 * 适配外部主网页的简化监听逻辑，无需校验 origin
 * 
 * 使用示例：
 * 
 * // 1. 基本导航 (跳转到某个页面)
 * postNavigate('https://example.com', true);  // 新窗口打开
 * postNavigate('/dashboard');                 // 当前窗口跳转（默认 false）
 * 
 * // 2. 发送退出登录通知
 * notifyLogout(); // 自动获取当前页面地址
 * notifyLogout('/login'); // 手动指定跳转到登录页
 * 
 * // 3. 发送自定义消息
 * postMessageToParent({
 *   action: 'custom-action',
 *   data: { userId: 123 }
 * });
 * 
 * // 4. 快速退出登录
 * logoutAndNotify(); // 自动获取地址 + 发送通知 + 清除数据 + 跳转
 * 
 * 注意：现在所有消息都使用 '*' 作为 targetOrigin，
 * 对应外部主网页的简化监听逻辑（不校验来源）
 */

export interface PostMessageOptions {
    action: string;
    url?: string;
    newWindow?: boolean;
    [key: string]: any;
}

export interface PostMessageConfig {
    targetOrigins: string[];
    defaultTargetOrigin?: string;
}

// 简化配置 - 使用 '*' 作为通用目标
const DEFAULT_CONFIG: PostMessageConfig = {
    targetOrigins: ['*'], // 使用通用目标
    defaultTargetOrigin: '*'
};

/**
 * 向父页面发送导航消息（简化版，无需关心 origin）
 * @param url 目标URL
 * @param newWindow 是否在新窗口打开，默认 false
 */
export const postNavigate = (url: string, newWindow: boolean = false) => {
    const message: PostMessageOptions = {
        action: 'navigate',
        url: url,
        newWindow: !!newWindow // 确保是布尔值
    };

    try {
        window.parent.postMessage(message, '*'); // 使用 '*' 表示任意目标 origin
        console.log('[通信] 发送跳转指令:', message);
    } catch (error) {
        console.error('[通信] 发送跳转指令失败:', error);
    }
};

/**
 * 向父页面发送自定义消息（简化版）
 * @param options 消息选项
 */
export const postMessageToParent = (options: PostMessageOptions) => {
    try {
        window.parent.postMessage(options, '*');
        console.log('[通信] 发送自定义消息:', options);
    } catch (error) {
        console.error('[通信] 发送自定义消息失败:', error);
    }
};

/**
 * 获取退出登录后的目标URL
 * @param strategy 跳转策略
 * @param customUrl 自定义URL
 * @returns 目标URL
 */
const getLogoutTargetUrl = (strategy: string = 'auto', customUrl: string = '/') => {
    switch (strategy) {
        case 'current':
            // 跳转到当前完整地址
            return window.location.href;

        case 'custom':
            // 使用自定义URL
            return customUrl;

        case 'auto':
        default:
            // 自动策略：用户中心跳转到主域名根路径，其他保持当前地址
            const currentOrigin = window.location.origin;
            const currentPath = window.location.pathname;

            if (currentPath.includes('/user-center')) {
                return currentOrigin + '/';
            } else {
                return window.location.href;
            }
    }
};

/**
 * 发送退出登录通知（简化版）
 * 直接发送导航消息让主页面跳转到指定URL
 * @param redirectUrl 退出登录后跳转的URL，如果不提供则根据配置策略自动获取
 */
export const notifyLogout = (redirectUrl?: string) => {
    let targetUrl = redirectUrl;

    if (!targetUrl) {
        // 如果没有指定URL，使用配置策略
        try {
            // 这里使用同步方式获取配置，避免async问题
            const config = require('../config');
            const { strategy, customUrl } = config.postMessage.logoutRedirect;
            targetUrl = getLogoutTargetUrl(strategy, customUrl);
        } catch (error) {
            // 如果获取配置失败，使用默认的auto策略
            console.warn('[通信] 获取配置失败，使用默认策略:', error);
            targetUrl = getLogoutTargetUrl('auto', '/');
        }
    }

    // 发送导航消息，让主页面跳转
    const message: PostMessageOptions = {
        action: 'navigate',
        url: targetUrl,
        newWindow: false
    };

    postMessageToParent(message);
    console.log('[通信] 发送退出登录导航指令:', {
        from: window.location.href,
        to: targetUrl,
        strategy: redirectUrl ? 'manual' : 'config'
    });
};

/**
 * 获取当前配置（保留兼容性）
 */
export const getPostMessageConfig = (): PostMessageConfig => {
    return { ...DEFAULT_CONFIG };
};

/**
 * 快速退出登录并通知父页面（简化版）
 * @param redirectUrl 退出登录后跳转的URL，如果不提供则自动获取当前页面地址
 * @example
 * logoutAndNotify(); // 自动获取当前页面地址
 * logoutAndNotify('/login'); // 跳转到登录页
 */
export const logoutAndNotify = async (redirectUrl?: string) => {
    // 发送退出登录通知
    notifyLogout(redirectUrl);

    // 等待通知发送完成
    await new Promise(resolve => setTimeout(resolve, 100));

    // 清除本地数据
    localStorage.clear();
    sessionStorage.clear();

    // 跳转到首页
    window.location.href = '/';
}; 