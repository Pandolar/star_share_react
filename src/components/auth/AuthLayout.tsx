import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { setChatwootGuest } from '../../utils/chatwoot';

interface AuthLayoutProps {
  children: React.ReactNode;
  title: string;
}

const AuthLayout: React.FC<AuthLayoutProps> = ({ children, title }) => {
  useEffect(() => {
    setChatwootGuest().catch(() => {
      // 忽略客服初始化失败，避免影响认证流程
    });
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-25 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center"
        >
          <img
            className="mx-auto h-12 w-auto"
            src="/img/logo.png"
            alt="Logo"
          />
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            {title}
          </h2>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="bg-white p-8 shadow-soft rounded-2xl space-y-6"
        >
          {children}
        </motion.div>
      </div>
    </div>
  );
};

export default AuthLayout;
