import React, { useEffect } from 'react';

// 校验跳转参数页面，对应 /jumpns
const JumpNsPage: React.FC = () => {
  useEffect(() => {
    // 从 URL 查询参数中安全地获取指定参数（自动 decodeURIComponent）
    const getUrlParam = (name: string): string | null => {
      const urlParams = new URLSearchParams(window.location.search);
      const value = urlParams.get(name);
      return value && value.trim() !== '' ? value : null;
    };

    // 获取 Cookie 值
    const getCookie = (name: string): string | null => {
      const cookieArr = document.cookie.split('; ');
      for (const cookie of cookieArr) {
        if (cookie.startsWith(name + '=')) {
          return cookie.substring(name.length + 1);
        }
      }
      return null;
    };

    // 设置 Cookie（默认有效期 7 天）
    const setCookie = (name: string, value: string, days = 7) => {
      const expires = new Date();
      expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
      // 对 value 进行 encodeURIComponent 防止特殊字符破坏 cookie
      document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires.toUTCString()}; path=/`;
    };

    // 清除指定的 Cookie
    const clearCookies = () => {
      const cookiesToClear = ['xuserid', 'xtoken', 'xy_uuid_token', 'lastCheckTime'];
      cookiesToClear.forEach((cookie) => {
        document.cookie = `${cookie}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC`;
      });
    };

    const currentUrl = window.location.href;
    const currentDomain = window.location.hostname;

    // 重定向到登录页
    const redirectToLogin = () => {
      window.location.href = `https://${currentDomain}/login?fromurl=${encodeURIComponent(currentUrl)}`;
    };

    // 主逻辑：优先使用 URL 参数，其次使用 Cookie，并进行校验
    const checkAndRedirect = async () => {
      // 1. 优先从 URL 查询参数中获取 token 信息
      let xUserId = getUrlParam('xuserid');
      let xToken = getUrlParam('xtoken');
      let xyUuidToken = getUrlParam('xy_uuid_token');

      // 2. 如果 URL 中缺少任一必要参数，则尝试从 Cookie 中读取
      const hasAllUrlParams = xUserId && xToken && xyUuidToken;
      if (!hasAllUrlParams) {
        xUserId = getCookie('xuserid');
        xToken = getCookie('xtoken');
        xyUuidToken = getCookie('xy_uuid_token');
      }

      // 3. 如果 URL 或 Cookie 中仍缺少任一参数，跳转登录
      if (!xUserId || !xToken || !xyUuidToken) {
        console.warn('缺少必要的认证参数（xuserid/xtoken/xy_uuid_token）');
        redirectToLogin();
        return;
      }

      // 4. 如果 URL 中提供了参数，则覆盖本地 Cookie（确保最新）
      if (hasAllUrlParams) {
        setCookie('xuserid', xUserId, 7);
        setCookie('xtoken', xToken, 7);
        setCookie('xy_uuid_token', xyUuidToken, 7);
      }

      try {
        // 5. 调用后端接口校验用户身份
        const resp = await fetch(`https://${currentDomain}/u/get_user_info`, {
          method: 'GET',
          headers: {
            'xuserid': xUserId,
            'xtoken': xToken,
            'Content-Type': 'application/json',
          },
          credentials: 'include',
        });

        if (!resp.ok) {
          throw new Error(`HTTP error! status: ${resp.status}`);
        }

        const data: any = await resp.json();

        // 6. 校验成功：code 为 20000
        if (data && data.code === 20000) {
          // 记录本次校验时间（有效期 1 天）
          setCookie('lastCheckTime', String(Date.now()), 1);

          // 构造目标跳转地址
          const targetUrl = `https://${currentDomain}/service-api/chat/select-car/callback?ticket=${encodeURIComponent(xyUuidToken)}&isPlus=1`;
          window.location.href = targetUrl;
        } else {
          // 7. 校验失败：清除 Cookie 并跳转登录
          console.warn('用户信息验证失败:', data?.msg || '无返回消息');
          clearCookies();
          redirectToLogin();
        }
      } catch (error) {
        // 8. 网络或解析错误：清除 Cookie 并跳转登录
        console.error('验证请求过程中发生错误:', error);
        clearCookies();
        redirectToLogin();
      }
    };

    checkAndRedirect();
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="text-center text-gray-700">
        <div className="h-10 w-10 mx-auto animate-spin rounded-full border-2 border-gray-200 border-t-blue-500" />
        <p className="mt-4 text-sm">正在校验您的登录状态，请稍候...</p>
      </div>
    </div>
  );
};

export default JumpNsPage;