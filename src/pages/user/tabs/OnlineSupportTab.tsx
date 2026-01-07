import React from 'react';
import { ChatwootEmbed } from '../../../components/chat/ChatwootEmbed';

export const OnlineSupportTab: React.FC = () => {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">在线客服</h2>
        <p className="text-sm text-gray-500 mt-1">如有疑问可直接在此与客服沟通</p>
      </div>
      <ChatwootEmbed mode="user" height={640} />
    </div>
  );
};
