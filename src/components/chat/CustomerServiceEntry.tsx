import React, { useCallback, useEffect, useState } from 'react';
import { Badge, Button, Modal, ModalBody, ModalContent, ModalFooter, ModalHeader } from '@heroui/react';
import { MessageCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useCustomerService } from '../../contexts/CustomerServiceContext';
import { customerServiceApi } from '../../services/userApi';
import { ChatwootFloatingButton } from './ChatwootFloatingButton';

export default function CustomerServiceEntry({ mode }: { mode: 'user' | 'guest' }): React.ReactElement | null {
  const { config, provider } = useCustomerService();
  const navigate = useNavigate();
  const [guestHintOpen, setGuestHintOpen] = useState(false);
  const [unread, setUnread] = useState(0);

  // 只有内置客服才会上报未读数：Chatwoot 入口与关闭状态都走不到这里。
  const builtin = config?.provider === 'builtin' ? config : null;

  const refreshUnread = useCallback(async () => {
    try {
      const result = await customerServiceApi.getUnread();
      setUnread(Number(result.unread) || 0);
    } catch {
      setUnread(0);
    }
  }, []);

  useEffect(() => {
    if (mode !== 'user' || !builtin?.badge.enabled || !builtin.badge.show_on_floating) {
      return;
    }

    const handleRead = () => setUnread(0);
    const handleVisibilityChange = () => {
      if (!document.hidden) void refreshUnread();
    };

    void refreshUnread();
    const timer = window.setInterval(() => {
      if (!document.hidden) void refreshUnread();
    }, 60_000);
    window.addEventListener('csRead', handleRead);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.clearInterval(timer);
      window.removeEventListener('csRead', handleRead);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [builtin, mode, refreshUnread]);

  // Chatwoot 是独立入口，不随内置客服开关消失；配置缺失时同样安全返回。
  if (provider === 'chatwoot') return <ChatwootFloatingButton mode={mode} />;
  if (!builtin || !builtin.entry.floating_enabled) return null;
  if (mode === 'guest' && !builtin.entry.guest_enabled) return null;

  const isLeft = builtin.entry.floating_position === 'left';
  const displayedUnread = unread > builtin.badge.max_display ? `${builtin.badge.max_display}+` : unread;

  const handleClick = () => {
    if (mode === 'guest') {
      setGuestHintOpen(true);
      return;
    }
    navigate('/user-center?tab=support');
  };

  return (
    <>
      <div className={`fixed bottom-6 ${isLeft ? 'left-6' : 'right-6'} z-50 flex items-center gap-3`}>
        <div className="pointer-events-none rounded-lg bg-default-900 px-3 py-1.5 text-sm text-white shadow-lg">
          {builtin.entry.floating_bubble}
        </div>
        <Badge
          color="danger"
          content={displayedUnread}
          isInvisible={mode !== 'user' || !builtin.badge.enabled || !builtin.badge.show_on_floating || unread <= 0}
          shape="circle"
        >
          <Button isIconOnly aria-label="联系客服" title="联系客服" onPress={handleClick}>
            <MessageCircle size={24} strokeWidth={2.5} />
          </Button>
        </Badge>
      </div>

      <Modal isOpen={guestHintOpen} onOpenChange={setGuestHintOpen}>
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader>在线客服</ModalHeader>
              <ModalBody>{builtin.entry.guest_login_hint}</ModalBody>
              <ModalFooter>
                <Button variant="light" onPress={onClose}>
                  取消
                </Button>
                <Button color="primary" onPress={() => navigate('/login')}>
                  去登录
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </>
  );
}
