/**
 * 微信检测相关工具函数
 */

/**
 * 检测当前是否在微信浏览器中
 * @returns {boolean} 是否在微信浏览器中
 */
export const isWeChatBrowser = (): boolean => {
    if (typeof window === 'undefined') {
        return false; // 服务端渲染环境
    }

    const userAgent = navigator.userAgent.toLowerCase();
    return /micromessenger/.test(userAgent);
};

/**
 * 检测当前是否在微信小程序的webview中
 * @returns {boolean} 是否在微信小程序webview中
 */
export const isWeChatMiniProgram = (): boolean => {
    if (typeof window === 'undefined') {
        return false;
    }

    const userAgent = navigator.userAgent.toLowerCase();
    return /miniprogram/.test(userAgent);
};

/**
 * 获取当前页面的完整URL
 * @returns {string} 当前页面URL
 */
export const getCurrentPageUrl = (): string => {
    if (typeof window === 'undefined') {
        return '';
    }

    return window.location.href;
};

/**
 * 复制文本到剪贴板
 * @param {string} text - 要复制的文本
 * @returns {Promise<boolean>} 复制是否成功
 */
export const copyToClipboard = async (text: string): Promise<boolean> => {
    try {
        if (navigator.clipboard && window.isSecureContext) {
            await navigator.clipboard.writeText(text);
            return true;
        } else {
            // 降级方案：使用传统的复制方法
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
        }
    } catch (err) {
        console.error('复制到剪贴板失败:', err);
        return false;
    }
};

/**
 * 显示浏览器打开指引
 * 用于在微信中提示用户如何在浏览器中打开
 * @param {boolean} forceMode - 是否为强制模式（会影响提示内容）
 */
export const showBrowserOpenGuide = (forceMode: boolean = false) => {
  if (typeof window === 'undefined') return;
  
  const currentUrl = getCurrentPageUrl();
  
  const baseMessage = forceMode 
    ? '本网站暂不支持在微信中访问，请在浏览器中打开：'
    : '为了更好的浏览体验，建议您在浏览器中打开：';
  
  const fullMessage = `${baseMessage}\n\n1. 点击右上角"..."菜单\n2. 选择"在浏览器中打开"\n\n或复制以下链接：\n${currentUrl}`;
  
  // 尝试复制到剪贴板
  copyToClipboard(currentUrl).then(success => {
    if (success) {
      const successMessage = forceMode
        ? '链接已复制！请在浏览器中粘贴打开以正常访问本网站。'
        : '链接已复制到剪贴板！请在浏览器中粘贴打开，或点击右上角"..."选择"在浏览器中打开"';
      alert(successMessage);
    } else {
      // 如果复制失败，使用prompt让用户手动复制
      const promptMessage = forceMode
        ? '请复制以下链接在浏览器中打开以正常访问：'
        : '请复制以下链接在浏览器中打开：';
      prompt(promptMessage, currentUrl);
    }
  });
};

/**
 * 微信环境检测结果接口
 */
export interface WeChatEnvironmentInfo {
    /** 是否在微信浏览器中 */
    isWeChat: boolean;
    /** 是否在微信小程序webview中 */
    isMiniProgram: boolean;
    /** 当前页面URL */
    currentUrl: string;
    /** 用户代理字符串 */
    userAgent: string;
}

/**
 * 获取微信环境信息
 * @returns {WeChatEnvironmentInfo} 微信环境信息
 */
export const getWeChatEnvironmentInfo = (): WeChatEnvironmentInfo => {
  const userAgent = typeof window !== 'undefined' ? navigator.userAgent : '';
  
  return {
    isWeChat: isWeChatBrowser(),
    isMiniProgram: isWeChatMiniProgram(),
    currentUrl: getCurrentPageUrl(),
    userAgent
  };
};

/**
 * 检查是否需要强制阻止微信访问
 * @param {boolean} forceMode - 是否启用强制模式
 * @returns {boolean} 是否需要阻止访问
 */
export const shouldBlockWeChatAccess = (forceMode: boolean = false): boolean => {
  if (!forceMode) return false;
  return isWeChatBrowser();
};

/**
 * 重定向到浏览器打开页面（强制模式专用）
 * 在强制模式下，阻止页面正常加载，显示专门的提示页面
 */
export const redirectToBrowserPage = () => {
  if (typeof window === 'undefined') return;
  
  // 阻止页面的默认行为
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      document.body.style.display = 'none';
    });
  } else {
    document.body.style.display = 'none';
  }
  
  // 显示强制浏览器打开的提示
  showBrowserOpenGuide(true);
};

/**
 * 强制模式配置选项
 */
export interface ForceModOptions {
  /** 是否启用强制模式 */
  enabled: boolean;
  /** 网站名称 */
  siteName?: string;
  /** 自定义提示标题 */
  customTitle?: string;
  /** 自定义提示描述 */
  customDescription?: string;
  /** 是否显示当前URL */
  showCurrentUrl?: boolean;
}

/**
 * 初始化强制模式
 * 在页面加载时检测微信环境，如果需要强制阻止则立即处理
 * @param {ForceModOptions} options - 强制模式配置
 * @returns {boolean} 是否被强制阻止
 */
export const initForceMode = (options: ForceModOptions): boolean => {
  const { enabled, siteName, customTitle, customDescription } = options;
  
  if (!enabled || !isWeChatBrowser()) {
    return false;
  }
  
  // 在微信中且启用强制模式，需要阻止访问
  console.warn(`[ForceMode] 检测到微信浏览器访问 ${siteName || '网站'}，强制要求在浏览器中打开`);
  
  return true;
}; 