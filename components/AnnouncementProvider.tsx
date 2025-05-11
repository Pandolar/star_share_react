"use client";

import { useState, useEffect } from 'react';
import { Announcement } from './Announcement';
import { fetchAnnouncementContent, shouldShowAnnouncement } from '../lib/announcement';

export function AnnouncementProvider({ children }: { children: React.ReactNode }) {
  const [announcementData, setAnnouncementData] = useState<{ content: string; title?: string } | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadAnnouncement = async () => {
      try {
        setLoading(true);
        
        // 检查是否应该显示公告
        if (!shouldShowAnnouncement()) {
          setLoading(false);
          return;
        }
        
        // 获取公告内容
        const data = await fetchAnnouncementContent();
        if (data && data.content) {
          setAnnouncementData(data);
          setIsOpen(true);
        }
      } catch (error) {
        console.error('加载公告时发生错误:', error);
        // 错误处理：不显示公告，但不影响应用其他部分
      } finally {
        setLoading(false);
      }
    };

    loadAnnouncement();
  }, []);

  // 如果正在加载或没有数据，只渲染子组件
  if (loading || !announcementData) {
    return <>{children}</>;
  }

  return (
    <>
      {children}
      
      {announcementData && (
        <Announcement 
          content={announcementData.content}
          title={announcementData.title}
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
        />
      )}
    </>
  );
} 