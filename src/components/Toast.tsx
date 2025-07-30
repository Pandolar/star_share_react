/**
 * Toast 通知组件
 * 提供美观的页面级别消息提示
 */
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-react';
import { toast, ToastInstance } from '../utils/toast';

interface ToastProps {
  toast: ToastInstance;
  onClose: (id: string) => void;
}

const ToastItem: React.FC<ToastProps> = ({ toast: toastData, onClose }) => {
  const { id, type, message, duration, closable } = toastData;

  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        onClose(id);
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [id, duration, onClose]);

  const getToastStyle = () => {
    switch (type) {
      case 'success':
        return {
          bgColor: 'bg-green-50 border-green-200',
          textColor: 'text-green-800',
          iconColor: 'text-green-500',
          icon: CheckCircle
        };
      case 'error':
        return {
          bgColor: 'bg-red-50 border-red-200',
          textColor: 'text-red-800',
          iconColor: 'text-red-500',
          icon: AlertCircle
        };
      case 'warning':
        return {
          bgColor: 'bg-yellow-50 border-yellow-200',
          textColor: 'text-yellow-800',
          iconColor: 'text-yellow-500',
          icon: AlertTriangle
        };
      case 'info':
        return {
          bgColor: 'bg-blue-50 border-blue-200',
          textColor: 'text-blue-800',
          iconColor: 'text-blue-500',
          icon: Info
        };
      default:
        return {
          bgColor: 'bg-gray-50 border-gray-200',
          textColor: 'text-gray-800',
          iconColor: 'text-gray-500',
          icon: Info
        };
    }
  };

  const { bgColor, textColor, iconColor, icon: IconComponent } = getToastStyle();

  return (
    <motion.div
      initial={{ opacity: 0, y: -50, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      className={`relative ${bgColor} border rounded-lg p-4 shadow-lg max-w-md w-full`}
    >
      <div className="flex items-start">
        <div className={`flex-shrink-0 ${iconColor} mr-3`}>
          <IconComponent size={20} />
        </div>
        <div className={`flex-1 ${textColor} text-sm font-medium`}>
          {message}
        </div>
        {closable && (
          <button
            onClick={() => onClose(id)}
            className={`flex-shrink-0 ml-3 ${iconColor} hover:opacity-70 transition-opacity`}
          >
            <X size={16} />
          </button>
        )}
      </div>
    </motion.div>
  );
};

export const ToastContainer: React.FC = () => {
  const [toasts, setToasts] = useState<ToastInstance[]>([]);

  useEffect(() => {
    const unsubscribe = toast.subscribe((newToast) => {
      setToasts(prev => [...prev, newToast]);
    });

    return unsubscribe;
  }, []);

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      <AnimatePresence>
        {toasts.map((toastData) => (
          <ToastItem
            key={toastData.id}
            toast={toastData}
            onClose={removeToast}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}; 