import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { getCookie, clearAuthCookies } from '../../utils/cookies';
import { userInfoApi } from '../../services/userApi';
import { WechatEmailBindModal } from './WechatEmailBindModal';

/**
 * Global safety net for accounts that logged in with WeChat before binding a
 * real email. The backend also blocks protected APIs; this gate makes direct
 * navigation and background 20022 responses visible and actionable.
 */
export const WechatEmailBindGate: React.FC = () => {
  const location = useLocation();
  const [required, setRequired] = useState(false);

  useEffect(() => {
    if (location.pathname === '/login') return undefined;
    if (!getCookie('xuserid') || !getCookie('xtoken')) return undefined;
    let cancelled = false;
    void userInfoApi.getUserInfo().then((response) => {
      if (!cancelled && response.code === 20000 && response.data?.email_bind_required) {
        setRequired(true);
      }
    }).catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [location.pathname]);

  useEffect(() => {
    const handler = () => setRequired(true);
    window.addEventListener('wechatEmailBindRequired', handler);
    return () => window.removeEventListener('wechatEmailBindRequired', handler);
  }, []);

  return (
    <WechatEmailBindModal
      isOpen={required}
      onSuccess={() => {
        setRequired(false);
        window.location.reload();
      }}
      onUseEmailLogin={() => {
        clearAuthCookies();
        window.location.href = '/login';
      }}
    />
  );
};

export default WechatEmailBindGate;
