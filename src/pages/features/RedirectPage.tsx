import React, { useEffect, useState } from 'react';
import { getQueryParam } from '../../utils/urlParams';
import { setAuthCookies, clearAuthCookies } from '../../utils/cookies';
import { getUserInfo, redirectToLogin, redirectByDomain } from '../../services/auth';

interface RedirectPageProps { }

const RedirectPage: React.FC<RedirectPageProps> = () => {
  const [status, setStatus] = useState<'loading' | 'redirecting' | 'error'>('loading');
  const [message, setMessage] = useState('正在跳转...');

  useEffect(() => {
    const handleRedirect = async () => {
      try {
        // 获取 URL 参数
        const xUserId = getQueryParam('xuserid');
        const xToken = getQueryParam('xtoken');
        const xyUuidToken = getQueryParam('xy_uuid_token');
        const casAccessToken = getQueryParam('access_token');
        const domain = getQueryParam('domain');

        // 特殊情况：如果是登录页面且有 xyUuidToken
        if (xyUuidToken && window.location.pathname === '/login') {
          window.location.href = `/client-api/login?code=${xyUuidToken}&redirect=true`;
          return;
        }

        // 如果有用户ID和token，进行验证
        if (xUserId && xToken) {
          setMessage('正在验证用户信息...');

          // 设置 cookies
          setAuthCookies({
            xuserid: xUserId,
            xtoken: xToken,
            xy_uuid_token: xyUuidToken || undefined,
            cas_access_token: casAccessToken || undefined,
          });

          try {
            // 验证用户信息
            const userInfo = await getUserInfo(xUserId, xToken);

            if (userInfo.code !== 20000) {
              // 用户信息无效，清除 cookies 并跳转到登录页面
              setMessage('用户信息无效，正在跳转到登录页面...');
              clearAuthCookies();
              await redirectToLogin();
            } else {
              // 用户信息有效，根据 domain 参数跳转
              setMessage('验证成功，正在跳转...');
              setStatus('redirecting');

              // 延迟一点时间让用户看到成功消息
              setTimeout(() => {
                redirectByDomain(domain || '');
              }, 1000);
            }
          } catch (error) {
            // 请求失败，清除 cookies 并跳转到登录页面
            setMessage('验证失败，正在跳转到登录页面...');
            clearAuthCookies();
            await redirectToLogin();
          }
        } else {
          // 没有必要的参数，跳转到登录页面
          setMessage('缺少必要参数，正在跳转到登录页面...');
          await redirectToLogin();
        }
      } catch (error) {
        setStatus('error');
        setMessage('跳转失败，请稍后重试');
      }
    };

    handleRedirect();
  }, []);

  const getStatusColor = () => {
    switch (status) {
      case 'loading':
        return 'text-blue-600';
      case 'redirecting':
        return 'text-green-600';
      case 'error':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const getIcon = () => {
    switch (status) {
      case 'loading':
        return (
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        );
      case 'redirecting':
        return (
          <div className="flex items-center justify-center w-8 h-8 bg-green-100 rounded-full">
            <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        );
      case 'error':
        return (
          <div className="flex items-center justify-center w-8 h-8 bg-red-100 rounded-full">
            <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
        <div className="flex flex-col items-center space-y-4">
          {getIcon()}

          <h1 className={`text-2xl font-bold ${getStatusColor()}`}>
            {status === 'error' ? '跳转失败' : '正在跳转'}
          </h1>

          <p className="text-gray-600 text-lg">
            {message}
          </p>

          {status === 'loading' && (
            <div className="text-sm text-gray-500 mt-4">
              请稍候，正在处理您的请求...
            </div>
          )}

          {status === 'error' && (
            <div className="mt-6">
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                重试
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RedirectPage; 