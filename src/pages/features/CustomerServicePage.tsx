import React from 'react';
import { ChatwootEmbed } from '../../components/chat/ChatwootEmbed';

const CustomerServicePage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container max-w-5xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-gray-900">在线客服</h1>
          <p className="text-sm text-gray-500 mt-2">
            已登录用户将同步历史记录，未登录用户以游客身份咨询。
          </p>
        </div>
        <ChatwootEmbed mode="auto" height={720} />
      </div>
    </div>
  );
};

export default CustomerServicePage;
