/**
 * Chatwoot 浮动客服按钮
 * 显示在页面右下角，点击打开/关闭客服对话框
 * 白牌模式：如果配置了 customerServiceUrl，则跳转外链而非打开 Chatwoot
 */
import React, { useState, useEffect } from 'react';
import { MessageCircle, X, ExternalLink } from 'lucide-react';
import { ChatwootWidget, toggleChatwoot } from './ChatwootWidget';
import { useWhiteLabel } from '../../contexts/WhiteLabelContext';

type ChatwootMode = 'auto' | 'guest' | 'user';

interface ChatwootFloatingButtonProps {
  mode?: ChatwootMode;
}

export const ChatwootFloatingButton: React.FC<ChatwootFloatingButtonProps> = ({
  mode = 'auto',
}) => {
  const { isWhiteLabel, customerServiceUrl } = useWhiteLabel();
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // 白牌模式下如果有外链，则不渲染 Chatwoot
  const useExternalLink = isWhiteLabel && !!customerServiceUrl;

  // 监听 Chatwoot 事件
  useEffect(() => {
    const handleChatwootReady = () => {
      console.log('[Chatwoot Button] Chatwoot 已准备就绪');
    };

    const handleChatwootOpen = () => {
      setIsOpen(true);
      setUnreadCount(0);
    };

    const handleChatwootClose = () => {
      setIsOpen(false);
    };

    // 监听未读消息
    const checkUnreadMessages = () => {
      // Chatwoot SDK 会通过 window.$chatwoot 提供未读消息数
      // 这里可以扩展实现未读消息提示
    };

    window.addEventListener('chatwoot:ready', handleChatwootReady);
    window.addEventListener('chatwoot:open', handleChatwootOpen);
    window.addEventListener('chatwoot:close', handleChatwootClose);

    return () => {
      window.removeEventListener('chatwoot:ready', handleChatwootReady);
      window.removeEventListener('chatwoot:open', handleChatwootOpen);
      window.removeEventListener('chatwoot:close', handleChatwootClose);
    };
  }, []);

  const handleClick = () => {
    if (useExternalLink) {
      window.open(customerServiceUrl, '_blank');
    } else {
      toggleChatwoot(isOpen ? 'close' : 'open');
    }
  };

  return (
    <>
      {/* Chatwoot Widget 组件 - 隐藏默认气泡（白牌外链模式下不渲染） */}
      {!useExternalLink && <ChatwootWidget mode={mode} hideMessageBubble={true} />}

      {/* 自定义浮动按钮 */}
      <div className="fixed bottom-5 right-5 z-50">
        <button
          onClick={handleClick}
          className={`
            relative
            w-14 h-14
            rounded-full
            shadow-lg
            transition-all
            duration-300
            ease-in-out
            hover:scale-110
            active:scale-95
            ${isOpen && !useExternalLink
              ? 'bg-red-500 hover:bg-red-600'
              : 'bg-blue-600 hover:bg-blue-700'
            }
          `}
          aria-label={useExternalLink ? '联系客服' : (isOpen ? '关闭客服' : '打开客服')}
          title={useExternalLink ? '联系客服' : (isOpen ? '关闭客服' : '联系客服')}
        >
          {/* 图标 */}
          <div className="absolute inset-0 flex items-center justify-center text-white">
            {useExternalLink ? (
              <MessageCircle size={24} strokeWidth={2.5} />
            ) : isOpen ? (
              <X size={24} strokeWidth={2.5} />
            ) : (
              <MessageCircle size={24} strokeWidth={2.5} />
            )}
          </div>

          {/* 未读消息徽章 */}
          {!isOpen && !useExternalLink && unreadCount > 0 && (
            <div className="absolute -top-1 -right-1 min-w-[20px] h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center px-1.5 border-2 border-white">
              {unreadCount > 99 ? '99+' : unreadCount}
            </div>
          )}

          {/* 脉动动画（未打开时） */}
          {(!isOpen || useExternalLink) && (
            <div className="absolute inset-0 rounded-full bg-blue-600 animate-ping opacity-75"></div>
          )}
        </button>

        {/* 提示文字（可选） */}
        {(!isOpen || useExternalLink) && (
          <div className="absolute bottom-full right-0 mb-2 opacity-0 hover:opacity-100 transition-opacity duration-200 pointer-events-none">
            <div className="bg-default-900 text-white text-sm px-3 py-1.5 rounded-lg whitespace-nowrap shadow-lg">
              需要帮助？联系客服
              <div className="absolute top-full right-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-default-900"></div>
            </div>
          </div>
        )}
      </div>

      {/* 移动端样式调整 */}
      <style>{`
        @media (max-width: 640px) {
          .fixed.bottom-5.right-5 {
            bottom: 1rem;
            right: 1rem;
          }
        }
      `}</style>
    </>
  );
};
