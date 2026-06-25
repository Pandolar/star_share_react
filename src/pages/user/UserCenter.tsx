/**
 * 用户中心主页面
 * 提供用户个人信息管理、订阅套餐、订单记录等功能的统一入口
 */
import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Card, CardBody, Button } from '@heroui/react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell,
  User,
  Package,
  FileText,
  MessageCircle,
  Menu,
  X,
  LogOut,
  Home,
  AlertCircle,
} from 'lucide-react';

// Tab页面组件导入
import { AnnouncementTab } from './tabs/AnnouncementTab';
import { ProfileTab } from './tabs/ProfileTab';
import { SubscriptionTab } from './tabs/SubscriptionTab';
import { OrderHistoryTab } from './tabs/OrderHistoryTab';
import { InviteTab } from './tabs/InviteTab';

// 组件和工具导入
import { LogoutConfirmModal } from '../../components/LogoutConfirmModal';
import { ChatwootFloatingButton } from '../../components/chat/ChatwootFloatingButton';
import { clearAuthCookies, getCookie } from '../../utils/cookies';
import { useAuthCheck } from '../../hooks/useAuthCheck';
import { userInfoApi } from '../../services/userApi';
import { useWhiteLabel } from '../../contexts/WhiteLabelContext';

// Tab配置接口
interface TabConfig {
  key: string;
  label: string;
  icon: React.ReactNode;
  component: React.ComponentType;
}

// Tab配置数组（全量，白牌模式下会过滤）
const ALL_TAB_CONFIGS: TabConfig[] = [
  {
    key: 'announcements',
    label: '公告通知',
    icon: <Bell size={20} />,
    component: AnnouncementTab
  },
  {
    key: 'profile',
    label: '个人主页',
    icon: <User size={20} />,
    component: ProfileTab
  },
  {
    key: 'subscription',
    label: '订阅套餐',
    icon: <Package size={20} />,
    component: SubscriptionTab
  },
  {
    key: 'orders',
    label: '订单记录',
    icon: <FileText size={20} />,
    component: OrderHistoryTab
  },
  {
    key: 'invite',
    label: '邀请好友',
    icon: <MessageCircle size={20} />,
    component: InviteTab
  },
];

const UserCenter: React.FC = () => {
  const [activeTab, setActiveTab] = useState('subscription');
  const [searchParams, setSearchParams] = useSearchParams();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [logoutModalOpen, setLogoutModalOpen] = useState(false);
  const [emailUnbound, setEmailUnbound] = useState(false);
  const navigate = useNavigate();

  // 白牌模式：隐藏“邀请好友”“订单记录”Tab（白牌无邀请、无支付即无订单）
  const { isWhiteLabel } = useWhiteLabel();
  const tabConfigs = React.useMemo(
    () =>
      isWhiteLabel
        ? ALL_TAB_CONFIGS.filter(t => t.key !== 'invite' && t.key !== 'orders')
        : ALL_TAB_CONFIGS,
    [isWhiteLabel]
  );

  // 使用认证检查Hook
  const { isAuthenticated, isChecking, countdown, handleAuthFailure } = useAuthCheck({
    checkOnMount: true,
    showCountdown: true,
    countdownSeconds: 3
  });

  // 监听全局认证失败事件
  useEffect(() => {
    const handleGlobalAuthFailure = (event: CustomEvent) => {
      const { message } = event.detail;
      handleAuthFailure(message);
    };

    window.addEventListener('authFailure', handleGlobalAuthFailure as EventListener);

    return () => {
      window.removeEventListener('authFailure', handleGlobalAuthFailure as EventListener);
    };
  }, [handleAuthFailure]);

  // 检测占位邮箱用户，显示常驻横幅
  useEffect(() => {
    let cancelled = false;
    if (!isAuthenticated) return;
    (async () => {
      try {
        const resp = await userInfoApi.getUserInfo();
        if (!cancelled && resp.code === 20000 && resp.data?.email?.endsWith('@default.com')) {
          setEmailUnbound(true);
        }
      } catch {}
    })();
    return () => { cancelled = true; };
  }, [isAuthenticated]);

  // 一键跳转到绑定邮箱（profile tab，并通过 query 携带 openEdit=email 由 ProfileTab 自动打开弹窗）
  const goBindEmail = () => {
    const params = new URLSearchParams(searchParams);
    params.set('tab', 'profile');
    params.set('openEdit', 'email');
    setSearchParams(params);
    setActiveTab('profile');
  };

  // 根据 URL 查询参数同步激活的 Tab（支持 ?tab=subscription 等）
  useEffect(() => {
    const urlTab = searchParams.get('tab');
    const validKeys = tabConfigs.map(t => t.key);
    if (urlTab && validKeys.includes(urlTab) && urlTab !== activeTab) {
      setActiveTab(urlTab);
      return;
    }
    // 白牌模式下，如果访问被禁用的 tab（如 invite/orders），重定向到第一个可用 tab
    if (urlTab && !validKeys.includes(urlTab) && isWhiteLabel) {
      const params = new URLSearchParams(searchParams);
      params.delete('tab');
      setSearchParams(params);
      setActiveTab(validKeys[0] || 'usage');
      return;
    }
    // 付费重置配额深链：未指定 tab 时落到”个人主页”（使用额度区块在此）
    if (!urlTab && searchParams.get('action') === 'reset_quota' && activeTab !== 'profile') {
      setActiveTab('profile');
    }
  }, [searchParams, activeTab, tabConfigs]);

  // 切换 Tab 并将 tab 写入 URL 查询参数
  const switchTab = (key: string, isMobile = false) => {
    const params = new URLSearchParams(searchParams);
    params.set('tab', key);
    // push 模式：不传 replace 选项，新增浏览历史记录
    setSearchParams(params);
    setActiveTab(key);
    if (isMobile) setMobileMenuOpen(false);
  };

  // 获取当前激活的Tab组件
  const getCurrentTabComponent = () => {
    const currentTab = tabConfigs.find(tab => tab.key === activeTab);
    if (!currentTab) return null;
    const Component = currentTab.component;
    return <Component />;
  };

  // 处理退出登录：先调用后端接口，再清理本地状态并跳转
  const handleLogout = async () => {
    // 准备鉴权参数（从cookie中读取）
    const xuserid = getCookie('xuserid') || '';
    const xtoken = getCookie('xtoken') || '';
    const xyUuidToken = getCookie('xy_uuid_token') || '';

    const headers: Record<string, string> = {};
    if (xuserid) headers['xuserid'] = xuserid;
    if (xtoken) headers['xtoken'] = xtoken;
    if (xyUuidToken) headers['xy_uuid_token'] = xyUuidToken;

    // 调用后端登出接口（GET /u/logout），若非200则重试一次
    const callLogoutOnce = async (): Promise<number | null> => {
      try {
        const resp = await fetch('/u/logout', {
          method: 'GET',
          headers,
          credentials: 'include',
        });
        return resp.status;
      } catch (e) {
        return null;
      }
    };

    try {
      const status1 = await callLogoutOnce();
      if (status1 !== 200) {
        await callLogoutOnce(); // 最多重试一次
      }
    } finally {
      // 无论接口是否成功，都进行清理和后续逻辑
      try {
        localStorage.clear();
        sessionStorage.clear();
        clearAuthCookies();
      } catch {}

      // 导航到测速页
      navigate('/sharespeedtest', { replace: true });

      // 兜底：若单页导航失败，强制跳转
      setTimeout(() => {
        if (window.location.pathname !== '/sharespeedtest') {
          window.location.href = '/sharespeedtest';
        }
      }, 100);
    }
  };

  // 渲染导航项
  const renderTabItem = (tab: TabConfig, isMobile = false) => {
    const isActive = activeTab === tab.key;

    return (
      <motion.button
        key={tab.key}
        onClick={() => switchTab(tab.key, isMobile)}
        className={`
          w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-all duration-200
          ${isActive
            ? 'bg-blue-600 text-white shadow-md'
            : 'text-default-600 hover:bg-default-100 hover:text-default-900'
          }
        `}
        whileHover={{ x: isActive ? 0 : 4 }}
        whileTap={{ scale: 0.98 }}
      >
        <span className="flex-shrink-0">{tab.icon}</span>
        <span className="flex-1 font-medium">{tab.label}</span>
      </motion.button>
    );
  };

  // 如果正在检查认证状态，显示加载状态
  if (isChecking) {
    return (
      <div className="min-h-screen bg-default-50 flex items-center justify-center">
        <Card>
          <CardBody className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-default-600">检查登录状态中...</p>
          </CardBody>
        </Card>
      </div>
    );
  }

  // 如果认证失败且正在倒计时，显示倒计时页面
  if (!isAuthenticated && countdown > 0) {
    return (
      <div className="min-h-screen bg-default-50 flex items-center justify-center">
        <Card>
          <CardBody className="p-8 text-center">
            <div className="text-red-500 text-6xl mb-4">⚠️</div>
            <h2 className="text-xl font-semibold text-default-900 mb-2">登录状态异常</h2>
            <p className="text-default-600 mb-4">系统检测到您的登录状态已过期</p>
            <div className="text-2xl font-bold text-red-500 mb-2">{countdown}</div>
            <p className="text-sm text-default-500">秒后将自动返回首页，请重新登录</p>
          </CardBody>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-default-50">

      {/* 移动端菜单按钮 */}
      <div className="lg:hidden fixed top-4 left-4 z-30">
        <Button
          isIconOnly
          variant="light"
          className="bg-white shadow-md"
          onClick={() => setMobileMenuOpen(true)}
        >
          <Menu size={20} />
        </Button>
      </div>

      {/* 移动端顶部标签栏（便于发现可切换） */}
      <div className="lg:hidden sticky top-0 z-20 bg-default-50/95 backdrop-blur supports-[backdrop-filter]:bg-default-50/80">
        <div className="px-4 pt-16 pb-3 border-b border-default-200">
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
            {tabConfigs.map(tab => {
              const isActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => switchTab(tab.key)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-full whitespace-nowrap transition-colors text-sm ${isActive
                    ? 'bg-blue-600 text-white shadow'
                    : 'bg-white text-default-700 border border-default-200 hover:bg-default-50'
                    }`}
                  aria-pressed={isActive}
                >
                  <span className="flex-shrink-0">{tab.icon}</span>
                  <span className="font-medium">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="container max-w-[2700px] mx-auto px-4 lg:px-6 py-6">
        {emailUnbound && (
          <Card className="mb-4 border border-danger/30 bg-danger/5">
            <CardBody className="p-4">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex items-start gap-3 flex-1">
                  <AlertCircle size={20} className="text-danger flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-danger-700 leading-5">
                    你的账号尚未绑定真实邮箱。为了您的账户安全，请尽快绑定邮箱。
                  </p>
                </div>
                <Button
                  size="sm"
                  color="danger"
                  className="self-start sm:self-auto flex-shrink-0"
                  onPress={goBindEmail}
                >
                  立即绑定
                </Button>
              </div>
            </CardBody>
          </Card>
        )}
        <div className="flex flex-col lg:flex-row gap-6">
          {/* 桌面端侧边导航栏 */}
          <motion.aside
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
            className="hidden lg:block w-72 flex-shrink-0"
          >
            <Card className="sticky top-6">
              <CardBody className="p-6">
                <h2 className="text-lg font-semibold text-default-900 mb-4">导航菜单</h2>
                <nav className="space-y-2">
                  {tabConfigs.map(tab => renderTabItem(tab))}
                </nav>

                {/* 分隔线 */}
                <div className="my-6 border-t border-default-200"></div>

                {/* 返回首页 */}
                <motion.button
                  onClick={() => navigate('/jumpns')}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-all duration-200 text-blue-600 hover:bg-blue-50 hover:text-blue-700"
                  whileHover={{ x: 4 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <span className="flex-shrink-0">
                    <Home size={20} />
                  </span>
                  <span className="flex-1 font-medium">返回首页</span>
                </motion.button>

                {/* 退出登录按钮 */}
                <motion.button
                  onClick={() => setLogoutModalOpen(true)}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-all duration-200 
                            text-red-400 hover:bg-red-50 hover:text-red-500" // 关键修改：将600→400（正常文本）、700→500（ hover文本），背景色保持浅红不变
                  whileHover={{ x: 4 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <span className="flex-shrink-0">
                    <LogOut size={20} />
                  </span>
                  <span className="flex-1 font-medium">退出登录</span>
                </motion.button>
              </CardBody>
            </Card>
          </motion.aside>

          {/* 移动端侧边栏遮罩 */}
          <AnimatePresence>
            {mobileMenuOpen && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/50 z-50 lg:hidden"
                onClick={() => setMobileMenuOpen(false)}
              />
            )}
          </AnimatePresence>

          {/* 移动端侧边栏 */}
          <AnimatePresence>
            {mobileMenuOpen && (
              <motion.aside
                initial={{ x: -300 }}
                animate={{ x: 0 }}
                exit={{ x: -300 }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="fixed left-0 top-0 bottom-0 w-80 bg-white z-50 lg:hidden shadow-xl"
              >
                {/* 移动端头部 */}
                <div className="h-16 flex items-center justify-between px-4 border-b border-default-200 bg-blue-600">
                  <h2 className="text-lg font-semibold text-white">用户中心</h2>
                  <Button
                    isIconOnly
                    variant="light"
                    className="text-white"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <X size={20} />
                  </Button>
                </div>

                {/* 移动端导航菜单 */}
                <nav className="p-4 space-y-2">
                  {tabConfigs.map(tab => renderTabItem(tab, true))}

                  {/* 分隔线 */}
                  {/* <div className="my-6 border-t border-default-200"></div> */}

                  {/* 返回首页 */}
                  <motion.button
                    onClick={() => {
                      navigate('/sharespeedtest');
                      setMobileMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-all duration-200 text-blue-600 hover:bg-blue-50 hover:text-blue-700"
                    whileHover={{ x: 4 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <span className="flex-shrink-0">
                      <Home size={20} />
                    </span>
                    <span className="flex-1 font-medium">返回首页</span>
                  </motion.button>

                  {/* 退出登录按钮 */}
                  <motion.button
                    onClick={() => {
                      setLogoutModalOpen(true);
                      setMobileMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-all duration-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                    whileHover={{ x: 4 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <span className="flex-shrink-0">
                      <LogOut size={20} />
                    </span>
                    <span className="flex-1 font-medium">退出登录</span>
                  </motion.button>
                </nav>
              </motion.aside>
            )}
          </AnimatePresence>

          {/* 主内容区域 */}
          {/* 注意：不要用 initial 透明度动画包裹整个内容区。
              framer-motion 的入场动画依赖 requestAnimationFrame，
              若首屏处于后台标签/重定向/慢首绘等场景，rAF 被节流时入场动画可能不触发，
              元素会卡在 opacity:0 造成白屏（切换 Tab 才恢复）。
              这里持久容器不做透明度入场，AnimatePresence 用 initial={false} 让首个子项直接以最终态渲染。 */}
          <motion.main
            initial={false}
            animate={{ opacity: 1, y: 0 }}
            className="flex-1 min-w-0"
          >
            <Card className="min-h-[calc(min(100vh,1600px)-12rem)]">
              <CardBody className="p-6">
                <AnimatePresence mode="wait" initial={false}>
                  <motion.div
                    key={activeTab}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.2 }}
                  >
                    {getCurrentTabComponent()}
                  </motion.div>
                </AnimatePresence>
              </CardBody>
            </Card>
          </motion.main>
        </div>
      </div>

      {/* 退出登录确认弹窗 */}
      <LogoutConfirmModal
        isOpen={logoutModalOpen}
        onOpenChange={setLogoutModalOpen}
        onConfirm={handleLogout}
      />

      {/* 浮动客服按钮 - 用户模式 */}
      {!isWhiteLabel && <ChatwootFloatingButton mode="user" />}
    </div>
  );
};

export default UserCenter;
