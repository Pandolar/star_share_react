/**
 * Cookie管理工具函数
 */

import { domainConfig, getCasdoorLogoutUrl } from '../config/domains';

// 获取当前域名信息
const getCurrentDomain = (): { currentDomain: string; mainDomain: string } => {
  const hostname = window.location.hostname;
  const parts = hostname.split('.');

  // 如果是IP地址或localhost，直接返回当前域名
  if (hostname === 'localhost' || /^\d+\.\d+\.\d+\.\d+$/.test(hostname)) {
    return {
      currentDomain: hostname,
      mainDomain: hostname
    };
  }

  // 获取主域名（最后两个部分，如 yy.com）
  const mainDomain = parts.length >= 2 ? parts.slice(-2).join('.') : hostname;

  return {
    currentDomain: hostname,
    mainDomain: mainDomain
  };
};

// 删除指定域名下的所有cookie
const clearCookiesForDomain = (domain: string): void => {
  const cookies = document.cookie.split(';');

  for (let cookie of cookies) {
    const eqPos = cookie.indexOf('=');
    const name = eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim();

    if (name) {
      // 尝试多种删除方式，确保彻底清除
      const expireDate = 'Thu, 01 Jan 1970 00:00:00 GMT';

      // 1. 删除当前域名，根路径
      document.cookie = `${name}=; expires=${expireDate}; path=/`;

      // 2. 删除当前域名，当前路径
      document.cookie = `${name}=; expires=${expireDate}; path=${window.location.pathname}`;

      // 3. 删除指定域名，根路径
      document.cookie = `${name}=; expires=${expireDate}; path=/; domain=${domain}`;

      // 4. 删除指定域名前缀点，根路径
      document.cookie = `${name}=; expires=${expireDate}; path=/; domain=.${domain}`;

      // 5. 删除当前完整域名
      document.cookie = `${name}=; expires=${expireDate}; path=/; domain=${window.location.hostname}`;

      // 6. 删除当前完整域名前缀点
      document.cookie = `${name}=; expires=${expireDate}; path=/; domain=.${window.location.hostname}`;

      // 7. 尝试删除所有可能的路径组合
      const pathParts = window.location.pathname.split('/').filter(part => part);
      let currentPath = '';
      for (const part of pathParts) {
        currentPath += `/${part}`;
        document.cookie = `${name}=; expires=${expireDate}; path=${currentPath}`;
        document.cookie = `${name}=; expires=${expireDate}; path=${currentPath}; domain=${domain}`;
        document.cookie = `${name}=; expires=${expireDate}; path=${currentPath}; domain=.${domain}`;
      }
    }
  }
};

// 彻底清除所有相关域名的cookie（超强版）
const clearAllRelatedCookies = (currentDomain: string, mainDomain: string): void => {
  try {
    console.log('🍪 当前所有cookies:', document.cookie);

    // 获取当前所有cookie名称
    const cookies = document.cookie.split(';');
    const cookieNames = cookies.map(cookie => {
      const name = cookie.split('=')[0].trim();
      return name;
    }).filter(name => name);

    console.log('🍪 发现的cookie名称:', cookieNames);

    // 对每个cookie进行暴力删除，尝试所有可能的组合
    cookieNames.forEach(cookieName => {
      if (cookieName) {
        console.log(`🗑️ 正在删除cookie: ${cookieName}`);

        // 1. 基础删除（无domain）
        document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;

        // 2. 删除主域名的cookie
        document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=${domainConfig.mainDomain}`;

        // 3. 删除.主域名的cookie (这个是关键！)
        document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=${domainConfig.cookieDomain}`;

        // 4. 删除当前完整域名
        document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=${window.location.hostname}`;

        // 5. 删除.当前完整域名
        document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=.${window.location.hostname}`;

        // 6. 带secure属性的删除
        document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; secure`;
        document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=${domainConfig.mainDomain}; secure`;
        document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=${domainConfig.cookieDomain}; secure`;

        // 7. 不同路径的删除
        const paths = ['/', '', window.location.pathname];
        paths.forEach(path => {
          document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=${path}`;
          document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=${path}; domain=${domainConfig.mainDomain}`;
          document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=${path}; domain=${domainConfig.cookieDomain}`;
        });
      }
    });

    // 等待一下让删除操作生效
    const start = Date.now();
    while (Date.now() - start < 50) { /* 等待50ms */ }

    // 额外保险：再次删除常见的认证cookie
    const criticalCookies = [
      'xuserid', 'xtoken', 'cas_access_token', 'access_token', 'refresh_token',
      'user_session', 'auth_token', 'session_id', 'JSESSIONID', 'sessionid',
      'authToken', 'userToken', 'loginToken'
    ];

    criticalCookies.forEach(cookieName => {
      // 多种删除方式确保清除
      document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
      document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=${domainConfig.mainDomain}`;
      document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=${domainConfig.cookieDomain}`;
      document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=${window.location.hostname}`;
      document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=.${window.location.hostname}`;
    });

    // 再等待一下
    const start2 = Date.now();
    while (Date.now() - start2 < 50) { /* 等待50ms */ }

    console.log('🍪 清理后剩余cookies:', document.cookie);

    // 如果还有cookie，再进行一轮强制清理
    if (document.cookie.trim()) {
      console.log('⚠️ 发现残留cookie，进行强制清理');
      const remainingCookies = document.cookie.split(';');
      remainingCookies.forEach(cookie => {
        const cookieName = cookie.split('=')[0].trim();
        if (cookieName) {
          // 超级暴力删除
          document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
          document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=${domainConfig.cookieDomain}`;
          document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=${domainConfig.mainDomain}`;
          document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=; domain=${domainConfig.cookieDomain}`;
          document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; domain=${domainConfig.cookieDomain}`;

          // 尝试空值设置
          document.cookie = `${cookieName}=; max-age=0; path=/; domain=${domainConfig.cookieDomain}`;
          document.cookie = `${cookieName}=; max-age=0; path=/; domain=${domainConfig.mainDomain}`;
        }
      });
    }

    console.log('🍪 最终剩余cookies:', document.cookie);

  } catch (error) {
    console.error('❌ Cookie清理过程出错:', error);
    // 应急清理
    try {
      const allCookies = document.cookie.split(';');
      allCookies.forEach(cookie => {
        const cookieName = cookie.split('=')[0].trim();
        if (cookieName) {
          document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
          document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=${domainConfig.cookieDomain}`;
        }
      });
    } catch (basicError) {
      console.error('❌ 应急清理也失败:', basicError);
    }
  }
};

// 检测是否在iframe中
const isInIframe = (): boolean => {
  try {
    return window.self !== window.top;
  } catch (e) {
    return true; // 如果无法访问top，说明在iframe中
  }
};

// 通知父页面删除cookie
const notifyParentToDeleteCookies = (): void => {
  try {
    if (window.parent && window.parent !== window) {
      window.parent.postMessage({
        action: 'deleteCookies',
        domain: domainConfig.cookieDomain,
        cookies: document.cookie.split(';').map(c => c.split('=')[0].trim()).filter(name => name)
      }, '*');
      console.log('📤 已通知父页面删除cookies');
    }
  } catch (e) {
    console.warn('⚠️ 无法通知父页面删除cookies:', e);
  }
};

// 退出登录功能（强化版）
export const logout = async (): Promise<void> => {
  console.log('🚀 开始执行logout流程');

  // 检测iframe环境
  const inIframe = isInIframe();
  console.log('🖼️ 是否在iframe中:', inIframe);

  try {
    const { currentDomain, mainDomain } = getCurrentDomain();
    console.log('📍 域名信息:', { currentDomain, mainDomain });

    // 在清除cookie之前先获取cas_access_token
    const casAccessToken = getCookie('cas_access_token');
    console.log('🔑 获取到的cas_access_token:', casAccessToken ? '存在' : '不存在');

    try {
      // 动态导入 postMessage 工具（避免循环依赖）
      console.log('📞 准备发送postMessage通知');
      const { notifyLogout } = await import('./postMessage');

      // 先发送退出登录通知到父页面，自动获取当前页面地址
      notifyLogout();
      console.log('✅ postMessage通知发送完成');

      // 等待一小段时间确保消息发送完成
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (postMessageError) {
      console.warn('⚠️ postMessage发送失败，继续执行清理:', postMessageError);
      // 不让postMessage错误中断整个流程
    }

    // 清除localStorage和sessionStorage
    console.log('🗑️ 开始清除本地存储');
    try {
      localStorage.clear();
      sessionStorage.clear();
      console.log('✅ 本地存储清除完成');
    } catch (storageError) {
      console.error('❌ 本地存储清除失败:', storageError);
    }

    // 如果在iframe中，先通知父页面删除cookie
    if (inIframe) {
      console.log('🖼️ 检测到iframe环境，通知父页面删除cookies');
      notifyParentToDeleteCookies();
      // 等待一下让父页面有时间处理
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    // 彻底清除所有相关域名的cookie
    console.log('🍪 开始清除cookies');
    try {
      console.log('🍪 清除前的cookies:', document.cookie);
      clearAllRelatedCookies(currentDomain, mainDomain);
      console.log('🍪 清除后的cookies:', document.cookie);
      console.log('✅ Cookie清除完成');
    } catch (cookieError) {
      console.error('❌ Cookie清除失败:', cookieError);
    }

    // 如果在iframe中且仍有cookie残留，再次通知父页面
    if (inIframe && document.cookie.trim()) {
      console.log('🖼️ iframe中仍有cookie残留，再次通知父页面');
      notifyParentToDeleteCookies();
      await new Promise(resolve => setTimeout(resolve, 300));
    }

    // 确定最终跳转地址
    let redirectUri: string;
    if (currentDomain !== mainDomain) {
      // 当前是子域名，跳转到主域名
      redirectUri = `${window.location.protocol}//${mainDomain}`;
    } else {
      // 当前是主域名，跳转到根路径
      redirectUri = `${window.location.protocol}//${currentDomain}/`;
    }
    console.log('🔗 重定向URI:', redirectUri);

    // 构造Casdoor logout URL
    const casdoorLogoutUrl = getCasdoorLogoutUrl(redirectUri, casAccessToken || undefined);

    console.log('🎯 最终跳转URL:', casdoorLogoutUrl);

    // 如果在iframe中，需要特殊处理跳转
    if (inIframe) {
      console.log('🖼️ iframe环境，通知父页面跳转');
      try {
        // 通知父页面进行跳转
        window.parent.postMessage({
          action: 'logout_redirect',
          url: casdoorLogoutUrl
        }, '*');

        // 也尝试直接跳转（作为备用）
        setTimeout(() => {
          window.location.href = casdoorLogoutUrl;
        }, 500);
      } catch (e) {
        console.warn('⚠️ 无法通知父页面跳转，直接跳转');
        window.location.href = casdoorLogoutUrl;
      }
    } else {
      // 强制等待一下，确保所有操作完成
      await new Promise(resolve => setTimeout(resolve, 200));
      console.log('🚀 准备跳转到Casdoor');
      // 跳转到Casdoor logout接口
      window.location.href = casdoorLogoutUrl;
    }

  } catch (error) {
    console.error('❌ logout函数执行失败:', error);

    // 如果全流程失败，至少执行基础清理
    console.log('🛡️ 执行应急清理');
    try {
      localStorage.clear();
      sessionStorage.clear();

      // 基础cookie清理
      const cookies = document.cookie.split(';');
      cookies.forEach(cookie => {
        const cookieName = cookie.split('=')[0].trim();
        if (cookieName) {
          document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
          document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=${domainConfig.cookieDomain}`;
        }
      });

      console.log('🛡️ 应急清理完成，强制跳转到主页');
      // 应急跳转
      if (inIframe) {
        window.parent.postMessage({ action: 'logout_redirect', url: `https://${domainConfig.mainDomain}/` }, '*');
      }
      window.location.href = `https://${domainConfig.mainDomain}/`;
    } catch (emergencyError) {
      console.error('❌ 应急清理也失败了:', emergencyError);
      // 最后的手段
      alert('退出登录时发生错误，请手动清除浏览器缓存或刷新页面');
    }
  }
};

// 获取cookie值
export const getCookie = (name: string): string | null => {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) {
    return parts.pop()?.split(';').shift() || null;
  }
  return null;
};

// 检查是否已登录
export const isAuthenticated = (): boolean => {
  const xuserid = getCookie('xuserid');
  const xtoken = getCookie('xtoken');
  return !!(xuserid && xtoken);
}; 