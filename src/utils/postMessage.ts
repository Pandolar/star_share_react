/**
 * postMessage 通信工具
 * 向父页面发送导航/退出消息（使用 '*' targetOrigin，不校验来源）
 */

export interface PostMessageOptions {
    action: string;
    url?: string;
    newWindow?: boolean;
    [key: string]: any;
}

export const postMessageToParent = (options: PostMessageOptions) => {
    try {
        window.parent.postMessage(options, '*');
    } catch {
        // ignore
    }
};

export const postNavigate = (url: string, newWindow: boolean = false) => {
    postMessageToParent({ action: 'navigate', url, newWindow: !!newWindow });
};

/**
 * 根据策略获取退出登录后的目标 URL
 */
const getLogoutTargetUrl = (strategy: string = 'auto', customUrl: string = '/') => {
    switch (strategy) {
        case 'current':
            return window.location.href;
        case 'custom':
            return customUrl;
        case 'auto':
        default:
            if (window.location.pathname.includes('/user-center')) {
                return window.location.origin + '/';
            }
            return window.location.href;
    }
};

/**
 * 发送退出登录通知，让父页面跳转
 */
export const notifyLogout = (redirectUrl?: string) => {
    let targetUrl = redirectUrl;
    if (!targetUrl) {
        try {
            const config = require('../config');
            const { strategy, customUrl } = config.postMessage.logoutRedirect;
            targetUrl = getLogoutTargetUrl(strategy, customUrl);
        } catch {
            targetUrl = getLogoutTargetUrl('auto', '/');
        }
    }
    postMessageToParent({ action: 'navigate', url: targetUrl, newWindow: false });
};
