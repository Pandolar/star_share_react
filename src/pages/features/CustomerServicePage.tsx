import React, { useEffect } from 'react';
import { ChatwootWidget, toggleChatwoot } from '../../components/chat/ChatwootWidget';

const CustomerServicePage: React.FC = () => {
  // 页面加载时自动打开客服窗口
  useEffect(() => {
    const timer = setTimeout(() => {
      toggleChatwoot('open');
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen bg-default-50">
      <ChatwootWidget mode="auto" hideMessageBubble={false} />

      <div className="container max-w-5xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-default-900">在线客服</h1>
          <p className="text-sm text-default-500 mt-2">
            已登录用户将自动保存历史记录，未登录用户以游客身份咨询。
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-8 text-center">
          <div className="max-w-md mx-auto">
            <div className="mb-6">
              <svg className="mx-auto h-16 w-16 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>

            <h2 className="text-xl font-medium text-default-900 mb-2">
              客服窗口已打开
            </h2>
            <p className="text-default-600 mb-6">
              您可以在页面右下角看到客服对话框，点击即可开始咨询。
            </p>

            <div className="bg-blue-50 rounded-lg p-4 text-sm text-left">
              <h3 className="font-medium text-blue-900 mb-2">提示：</h3>
              <ul className="space-y-1 text-blue-800">
                <li>• 已登录用户的聊天记录会自动保存</li>
                <li>• 游客聊天记录保存在本地浏览器</li>
                <li>• 客服团队会尽快回复您的消息</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomerServicePage;
