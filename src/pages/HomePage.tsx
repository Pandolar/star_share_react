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
import { useWhiteLabel } from '../contexts/WhiteLabelContext';
import { Link } from 'react-router-dom';
import { Button, Card, CardBody } from '@heroui/react';
import { UserMarkdown } from '../components/UserMarkdown';
import CustomerServiceEntry from '../components/chat/CustomerServiceEntry';

// 骨架屏组件
const HomePageSkeleton: React.FC = () => (
  <div className="min-h-screen bg-white">
    <div className="animate-pulse">
      {/* Header skeleton */}
      <div className="h-16 bg-default-100"></div>
      {/* Hero skeleton */}
      <div className="h-96 bg-default-200"></div>
      {/* LatestModels skeleton */}
      <div className="py-20">
        <div className="max-w-7xl mx-auto px-4">
          <div className="h-8 bg-default-200 rounded w-48 mx-auto mb-4"></div>
          <div className="h-4 bg-default-200 rounded w-96 mx-auto mb-8"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-64 bg-default-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    </div>
  </div>
);

const HomePage: React.FC = () => {
  const site = useWhiteLabel();
  const { loading: siteLoading } = site;
  const { forceBlockWeChat, showBrowserTip, hideTip } = useWeChatDetection({ forceMode: true });

  // Wait for site configuration so branded content cannot flash on managed hosts.
  if (siteLoading) {
    return <div className="min-h-screen bg-white" />;
  }
  if (site.error) return <main className="mx-auto max-w-xl p-8" role="alert"><h1 className="text-xl font-semibold">站点配置暂时不可用</h1><p className="my-4 text-default-600">{site.error}</p><Button onPress={() => window.location.reload()}>重新加载</Button></main>;
  if (site.site_id !== null) {
    return (
      <main className="min-h-screen bg-default-50 px-5 py-12">
        <div className="mx-auto max-w-3xl space-y-6">
          <header className="flex items-center gap-4">
            {site.logo_url && <img src={site.logo_url} alt="" className="h-12 w-12 rounded-xl object-contain" />}
            <div><p className="text-sm text-default-500">会员服务</p><h1 className="text-3xl font-semibold text-default-900">{site.site_name || '会员中心'}</h1></div>
          </header>
          <Card shadow="sm"><CardBody className="gap-5 p-7">
            <h2 className="text-xl font-medium">在本站管理您的服务</h2>
            <p className="text-default-600">{site.features.online_purchase ? '查看套餐、购买或续费，订单均可在会员中心查看。' : '使用激活码开通服务，已开通的套餐可继续使用。'}</p>
            {site.status === 'paused' && <p className="text-warning-700">本站暂停售卖新套餐，已有账号和服务不受影响。</p>}
            <div className="flex flex-wrap gap-3"><Button as={Link} to="/user-center" color="primary">进入会员中心</Button><Button as={Link} to="/jumpns" variant="flat">开始使用</Button>{site.features.register && <Button as={Link} to="/register" variant="light">注册账号</Button>}</div>
          </CardBody></Card>
          {site.notice && <Card shadow="sm"><CardBody className="gap-4 p-7"><h2 className="text-lg font-semibold">站点公告</h2><UserMarkdown>{site.notice}</UserMarkdown></CardBody></Card>}
          <p className="text-center text-sm text-default-400">{site.site_name}</p>
        </div>
        <CustomerServiceEntry mode="guest" />
      </main>
    );
  }

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