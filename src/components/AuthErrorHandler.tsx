/**
 * 全局认证错误处理组件
 * 在应用级别监听认证失败事件并统一处理
 */
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { showMessage } from '../utils/toast';

export const AuthErrorHandler: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const handleAuthFailure = (event: CustomEvent) => {
      const { message, code } = event.detail;

      // 显示美观的页面提示，不再使用浏览器弹窗
      showMessage.error(message || '认证失败，请重新登录');

      // 3秒后跳转到首页，只显示一次提示
      setTimeout(() => {
        navigate('/', { replace: true });
      }, 3000);
    };

    // 监听全局认证失败事件
    window.addEventListener('authFailure', handleAuthFailure as EventListener);

    return () => {
      window.removeEventListener('authFailure', handleAuthFailure as EventListener);
    };
  }, [navigate]);

  return null; // 这个组件不渲染任何内容
}; 