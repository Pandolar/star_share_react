import React from 'react';
import { motion } from 'framer-motion';
import CustomerServiceEntry from '../chat/CustomerServiceEntry';
import { useWhiteLabel } from '../../contexts/WhiteLabelContext';

interface AuthLayoutProps {
  children: React.ReactNode;
  title: string;
}

const AuthLayout: React.FC<AuthLayoutProps> = ({ children, title }) => {
  const site = useWhiteLabel();
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-25 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center"
        >
          {(site.logo_url || !site.isWhiteLabel) && <img className="mx-auto h-12 w-auto" src={site.logo_url || '/img/logo.png'} alt={site.site_name || 'Logo'} />}
          {site.site_id !== null && <p className="mt-3 text-sm text-default-500">{site.site_name}</p>}
          <h2 className="mt-6 text-center text-3xl font-extrabold text-default-900">
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

      <CustomerServiceEntry mode="guest" />
    </div>
  );
};

export default AuthLayout;
