/**
 * 微信浏览器检测工具
 */

export const isWeChatBrowser = (): boolean => {
    if (typeof window === 'undefined') return false;
    return /micromessenger/.test(navigator.userAgent.toLowerCase());
};

export const getCurrentPageUrl = (): string => {
    if (typeof window === 'undefined') return '';
    return window.location.href;
};

export const copyToClipboard = async (text: string): Promise<boolean> => {
    try {
        if (navigator.clipboard && window.isSecureContext) {
            await navigator.clipboard.writeText(text);
            return true;
        }
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        const result = document.execCommand('copy');
        document.body.removeChild(textArea);
        return result;
    } catch (err) {
        console.error('复制到剪贴板失败:', err);
        return false;
    }
};

export interface WeChatEnvironmentInfo {
    isWeChat: boolean;
    isMiniProgram: boolean;
    currentUrl: string;
    userAgent: string;
}

export const getWeChatEnvironmentInfo = (): WeChatEnvironmentInfo => {
    const userAgent = typeof window !== 'undefined' ? navigator.userAgent : '';
    return {
        isWeChat: isWeChatBrowser(),
        isMiniProgram: /miniprogram/.test(userAgent.toLowerCase()),
        currentUrl: getCurrentPageUrl(),
        userAgent,
    };
};
