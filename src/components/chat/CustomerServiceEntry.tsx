import React, { useState } from 'react';
import { Badge, Button, Modal, ModalBody, ModalContent, ModalFooter, ModalHeader } from '@heroui/react';
import { MessageCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useCustomerService } from '../../contexts/CustomerServiceContext';
import { ChatwootFloatingButton } from './ChatwootFloatingButton';

export default function CustomerServiceEntry({ mode }: { mode: 'user' | 'guest' }): React.ReactElement | null {
  const { config, provider, unread } = useCustomerService();
  const navigate = useNavigate();
  const [guestHintOpen, setGuestHintOpen] = useState(false);

  // 只有内置客服才会上报未读数：Chatwoot 入口与关闭状态都走不到这里。
  const builtin = config?.provider === 'builtin' ? config : null;


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
      <div className={`fixed bottom-5 ${isLeft ? 'left-5' : 'right-5'} z-50 flex items-center gap-2.5`}>
        <div className="pointer-events-none rounded-xl border border-default-200 bg-content1 px-3 py-2 text-sm font-medium text-default-700 shadow-sm">
          {builtin.entry.floating_bubble}
        </div>
        <Badge
          color="danger"
          content={displayedUnread}
          isInvisible={mode !== 'user' || !builtin.badge.enabled || !builtin.badge.show_on_floating || unread <= 0}
          shape="circle"
        >
          <Button
            isIconOnly
            disableRipple
            aria-label="联系客服"
            title="联系客服"
            onPress={handleClick}
            className="h-12 w-12 min-w-12 rounded-xl border border-white/20 bg-primary text-white shadow-md transition-colors hover:bg-primary-600"
          >
            <MessageCircle size={22} strokeWidth={2.25} />
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
