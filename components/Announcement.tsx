"use client";

import { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { X } from 'lucide-react';
import { Button } from './ui/button';
import { motion, AnimatePresence } from 'framer-motion';

interface AnnouncementProps {
  content: string;
  title?: string;
  isOpen?: boolean;
  onClose?: () => void;
}

const STORAGE_KEY = 'announcement_hide_until';

export function Announcement({ content, title = '系统公告', isOpen = false, onClose }: AnnouncementProps) {
  const [open, setOpen] = useState(isOpen);
  
  useEffect(() => {
    // 检查本地存储中是否有不显示公告的设置
    const hideUntil = localStorage.getItem(STORAGE_KEY);
    if (hideUntil) {
      const hideUntilDate = new Date(hideUntil);
      if (new Date() < hideUntilDate) {
        // 在不提示期间内，不显示公告
        return;
      }
    }
    
    // 如果没有设置或已过期，则显示公告
    setOpen(true);
  }, []);

  useEffect(() => {
    setOpen(isOpen);
  }, [isOpen]);

  const handleClose = () => {
    setOpen(false);
    onClose?.();
  };

  const handleHide24Hours = () => {
    // 设置24小时内不再提示
    const hideUntil = new Date();
    hideUntil.setHours(hideUntil.getHours() + 24);
    localStorage.setItem(STORAGE_KEY, hideUntil.toISOString());
    
    setOpen(false);
    onClose?.();
  };

  // 当公告打开时，禁止背景滚动
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* 背景遮罩 */}
          <motion.div 
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
          />
          
          {/* 公告卡片 */}
          <motion.div
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md md:max-w-lg bg-white dark:bg-gray-900 shadow-2xl rounded-xl overflow-hidden"
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
          >
            {/* 顶部渐变装饰条 */}
            <div className="h-1.5 w-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500" />
            
            {/* 公告头部 */}
            <div className="flex justify-between items-center p-5 border-b border-gray-100 dark:border-gray-800">
              <h2 className="text-xl font-semibold">{title}</h2>
              <button
                onClick={handleClose}
                className="rounded-full p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                aria-label="关闭"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            {/* 公告内容 */}
            <div className="p-5 max-h-[60vh] overflow-y-auto">
              <div className="announcement-content">
                <ReactMarkdown>{content}</ReactMarkdown>
              </div>
            </div>
            
            {/* 公告底部按钮 */}
            <div className="flex justify-end gap-3 p-5 pt-3 border-t border-gray-100 dark:border-gray-800">
              <Button 
                variant="outline" 
                onClick={handleHide24Hours}
                className="text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
              >
                24小时不提示
              </Button>
              <Button 
                onClick={handleClose}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-md hover:shadow-lg transition-all"
              >
                确定
              </Button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
} 