"use client";

// 从静态JSON文件获取公告内容的函数
export async function fetchAnnouncementContent(): Promise<{ content: string; title?: string } | null> {
  try {
    console.log('开始获取公告内容...');
    
    // 从静态JSON文件获取，而不是API路由
    const response = await fetch('/data/announcement.json', { 
      cache: 'no-store' // 确保不使用缓存
    });
    
    if (!response.ok) {
      console.error('获取公告数据失败:', response.status);
      return null;
    }
    
    const data = await response.json();
    console.log('成功获取公告数据:', data);
    
    // 确保返回的数据有正确的格式
    if (!data || typeof data.content !== 'string') {
      console.error('公告数据格式不正确:', data);
      return null;
    }
    
    return data;
  } catch (error) {
    console.error('获取公告时发生错误:', error);
    // 如果无法获取数据，返回一个内置的备用数据
    return {
      title: "内置公告",
      content: "# 欢迎使用我们的系统\n\n由于无法从服务器获取公告，这是一个内置的备用公告。\n\n请稍后再试。"
    };
  }
}

// 检查是否应该显示公告
export function shouldShowAnnouncement(): boolean {
  try {
    const STORAGE_KEY = 'announcement_hide_until';
    const hideUntil = localStorage.getItem(STORAGE_KEY);
    
    if (hideUntil) {
      const hideUntilDate = new Date(hideUntil);
      if (new Date() < hideUntilDate) {
        // 在不提示期间内
        return false;
      }
    }
    
    return true;
  } catch (e) {
    // 如果无法访问localStorage（例如在SSR环境中），默认返回false
    console.error('检查公告显示状态时发生错误:', e);
    return false;
  }
} 