import React, { Suspense } from 'react';
import Header from '../components/Header';
import Hero from '../components/Hero';
import LatestModels from '../components/LatestModels';
import Footer from '../components/Footer';
import SEOHead from '../components/SEOHead';
import WeChatBrowserTip from '../components/WeChatBrowserTip';
import ForceBrowserPage from '../components/ForceBrowserPage';
import { homeSEOConfig } from '../config/seo';
import { HomeInfoProvider } from '../contexts/HomeInfoContext';
import { useWeChatDetection } from '../hooks/useWeChatDetection';

// 骨架屏组件
const HomePageSkeleton: React.FC = () => (
  <div className="min-h-screen bg-white">
    <div className="animate-pulse">
      {/* Header skeleton */}
      <div className="h-16 bg-gray-100"></div>
      {/* Hero skeleton */}
      <div className="h-96 bg-gray-200"></div>
      {/* LatestModels skeleton */}
      <div className="py-20">
        <div className="max-w-7xl mx-auto px-4">
          <div className="h-8 bg-gray-200 rounded w-48 mx-auto mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-96 mx-auto mb-8"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-64 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    </div>
  </div>
);

const HomePage: React.FC = () => {
  // 微信检测功能 - 启用强制模式
  const { isWeChat, showBrowserTip, forceBlockWeChat, hideTip } = useWeChatDetection({
    forceMode: true, // 启用强制模式，不允许在微信中访问
    showTipByDefault: false // 强制模式下不使用普通提示
  });

  // 如果在微信中且启用强制模式，显示强制浏览器打开页面
  if (forceBlockWeChat) {
    return (
      <>
        <SEOHead config={homeSEOConfig} />
        <ForceBrowserPage
          siteName=""
          customTitle="需要在浏览器中打开"
          customDescription="暂不支持在微信内置浏览器中访问。请您使用浏览器打开本页面，享受完整功能。"
          showCurrentUrl={true}
        />
      </>
    );
  }

  return (
    <HomeInfoProvider>
      <SEOHead config={homeSEOConfig} />
      <Suspense fallback={<HomePageSkeleton />}>
        <div className="HomePage">
          <Header />
          <main>
            <Hero />
            <LatestModels />
          </main>
          <Footer />

          {/* 微信浏览器提示组件（强制模式下不会显示，保留用于其他模式） */}
          <WeChatBrowserTip
            show={showBrowserTip}
            onHide={hideTip}
            customMessage="为了获得最佳浏览体验，推荐您在浏览器中打开本页面"
          />
        </div>
      </Suspense>
    </HomeInfoProvider>
  );
};

export default HomePage;