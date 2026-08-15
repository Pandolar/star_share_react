/**
 * Chatwoot 浮动客服按钮
 * 显示在页面右下角，点击打开/关闭客服对话框
 */
import React, { useState, useEffect } from 'react';
import { MessageCircle, X } from 'lucide-react';
import { ChatwootWidget, toggleChatwoot } from './ChatwootWidget';
import { useWhiteLabel } from '../../contexts/WhiteLabelContext';

type ChatwootMode = 'auto' | 'guest' | 'user';

interface ChatwootFloatingButtonProps {
  mode?: ChatwootMode;
}

export const ChatwootFloatingButton: React.FC<ChatwootFloatingButtonProps> = ({
  mode = 'auto',
}) => {
  const { isWhiteLabel } = useWhiteLabel();
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const handleChatwootOpen = () => {
      setIsOpen(true);
      setUnreadCount(0);
    };
    const handleChatwootClose = () => setIsOpen(false);

    window.addEventListener('chatwoot:open', handleChatwootOpen);
    window.addEventListener('chatwoot:close', handleChatwootClose);
    return () => {
      window.removeEventListener('chatwoot:open', handleChatwootOpen);
      window.removeEventListener('chatwoot:close', handleChatwootClose);
    };
  }, []);

  if (isWhiteLabel) return null;

  return (
    <>
      <ChatwootWidget mode={mode} hideMessageBubble />
      <div className="fixed bottom-5 right-5 z-50">
        <button
          onClick={() => toggleChatwoot(isOpen ? 'close' : 'open')}
          className={`relative h-14 w-14 rounded-full shadow-lg transition-all duration-300 ease-in-out hover:scale-110 active:scale-95 ${isOpen ? 'bg-red-500 hover:bg-red-600' : 'bg-blue-600 hover:bg-blue-700'}`}
          aria-label={isOpen ? '关闭客服' : '打开客服'}
          title={isOpen ? '关闭客服' : '联系客服'}
        >
          <div className="absolute inset-0 flex items-center justify-center text-white">
            {isOpen ? <X size={24} strokeWidth={2.5} /> : <MessageCircle size={24} strokeWidth={2.5} />}
          </div>
          {!isOpen && unreadCount > 0 && (
            <div className="absolute -right-1 -top-1 flex h-5 min-w-[20px] items-center justify-center rounded-full border-2 border-white bg-red-500 px-1.5 text-xs font-bold text-white">
              {unreadCount > 99 ? '99+' : unreadCount}
            </div>
          )}
          {!isOpen && <div className="absolute inset-0 animate-ping rounded-full bg-blue-600 opacity-75" />}
        </button>
        {!isOpen && (
          <div className="pointer-events-none absolute bottom-full right-0 mb-2 opacity-0 transition-opacity duration-200 hover:opacity-100">
            <div className="whitespace-nowrap rounded-lg bg-default-900 px-3 py-1.5 text-sm text-white shadow-lg">
              需要帮助？联系客服
              <div className="absolute right-4 top-full h-0 w-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-default-900" />
            </div>
          </div>
        )}
      </div>
    </>
  );
};
