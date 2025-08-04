import React from 'react';
import Header from './Header';
import Hero from './Hero';
import LatestModels from './LatestModels';
import NativeApplications from './NativeApplications';
import NewsUpdates from './NewsUpdates';
import Footer from './Footer';

// 主页组件 - 整合所有页面组件
const HomePage: React.FC = () => {
  return (
    <div className="HomePage">
      {/* 头部导航 */}
      <Header />
      
      {/* 主要内容区域 */}
      <main>
        {/* 英雄轮播区域 */}
        <Hero />
        
        {/* 最新模型展示 */}
        <LatestModels />
        
        {/* 原生应用展示 */}
        {/* <NativeApplications /> */}
        
        {/* 新闻更新 */}
        {/* <NewsUpdates /> */}
      </main>

      {/* 页脚 */}
      <Footer />
    </div>
  );
};

export default HomePage; 