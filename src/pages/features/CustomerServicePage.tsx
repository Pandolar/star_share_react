import React, { useEffect } from 'react';
import { Spinner } from '@heroui/react';
import { useNavigate } from 'react-router-dom';
import { ChatwootWidget, toggleChatwoot } from '../../components/chat/ChatwootWidget';
import { useCustomerService } from '../../contexts/CustomerServiceContext';

const CustomerServicePage: React.FC = () => {
  const { provider, loading } = useCustomerService();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;

    if (provider === 'chatwoot') {
      const timer = setTimeout(() => {
        toggleChatwoot('open');
      }, 1000);
      return () => clearTimeout(timer);
    }

    navigate('/user-center?tab=support', { replace: true });
  }, [provider, loading, navigate]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (provider === 'chatwoot') {
    return <ChatwootWidget mode="auto" hideMessageBubble={false} />;
  }

  return null;
};

export default CustomerServicePage;
