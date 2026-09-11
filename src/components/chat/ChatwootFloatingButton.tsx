/**
 * Chatwoot 浮动客服按钮
 * 显示在页面右下角，点击打开/关闭客服对话框
 */
import React, { useState, useEffect } from 'react';
import { MessageCircle, X } from 'lucide-react';
import { Button } from '@heroui/react';
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
        <Button
          isIconOnly
          disableRipple
          onPress={() => toggleChatwoot(isOpen ? 'close' : 'open')}
          className={`relative h-12 w-12 min-w-12 rounded-xl border border-white/20 text-white shadow-md transition-colors duration-200 ${isOpen ? 'bg-default-800 hover:bg-default-700' : 'bg-primary hover:bg-primary-600'}`}
          aria-label={isOpen ? '关闭客服' : '打开客服'}
          title={isOpen ? '关闭客服' : '联系客服'}
        >
          {isOpen ? <X size={21} strokeWidth={2.25} /> : <MessageCircle size={22} strokeWidth={2.25} />}
          {!isOpen && unreadCount > 0 && (
            <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-background bg-danger px-1 text-[10px] font-bold leading-none text-danger-foreground">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </Button>
      </div>
    </>
  );
};
