/**
 * 用户中心主页面
 * 提供用户个人信息管理、订阅套餐、订单记录等功能的统一入口
 */
import React, { useState, useEffect } from 'react';
import { Card, CardBody, Button } from '@heroui/react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell,
  User,
  Package,
  FileText,
  Menu,
  X,
} from 'lucide-react';

// Tab页面组件导入
import { AnnouncementTab } from './tabs/AnnouncementTab';
import { ProfileTab } from './tabs/ProfileTab';
import { SubscriptionTab } from './tabs/SubscriptionTab';
import { OrderHistoryTab } from './tabs/OrderHistoryTab';

// 组件和工具导入
import { LogoutConfirmModal } from '../../components/LogoutConfirmModal';
import { logout } from '../../utils/cookieUtils';
import { useAuthCheck } from '../../hooks/useAuthCheck';

// Tab配置接口
interface TabConfig {
  key: string;
  label: string;
  icon: React.ReactNode;
  component: React.ComponentType;
}

// Tab配置数组
const tabConfigs: TabConfig[] = [
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
  // { // 临时注释
  //   key: 'tutorial',
  //   label: '使用教程',
  //   icon: <Book size={20} />,
  //   component: TutorialTab
  // },
  // {
  //   key: 'contact',
  //   label: '联系我们',
  //   icon: <MessageCircle size={20} />,
  //   component: ContactTab
  // }
];

const UserCenter: React.FC = () => {
  const [activeTab, setActiveTab] = useState(tabConfigs[0].key);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [logoutModalOpen, setLogoutModalOpen] = useState(false);

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

  // 获取当前激活的Tab组件
  const getCurrentTabComponent = () => {
    const currentTab = tabConfigs.find(tab => tab.key === activeTab);
    if (!currentTab) return null;
    const Component = currentTab.component;
    return <Component />;
  };

  // 处理退出登录
  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      // 如果logout失败，只清理本地数据，不强制跳转
      // 让用户手动刷新页面或重新导航
      localStorage.clear();
      sessionStorage.clear();
      // 注释掉强制跳转，避免覆盖casdoor的logout URL
      // window.location.href = '/';
    }
  };

  // 渲染导航项
  const renderTabItem = (tab: TabConfig, isMobile = false) => {
    const isActive = activeTab === tab.key;

    return (
      <motion.button
        key={tab.key}
        onClick={() => {
          setActiveTab(tab.key);
          if (isMobile) setMobileMenuOpen(false);
        }}
        className={`
          w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-all duration-200
          ${isActive
            ? 'bg-blue-600 text-white shadow-md'
            : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card>
          <CardBody className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">检查登录状态中...</p>
          </CardBody>
        </Card>
      </div>
    );
  }

  // 如果认证失败且正在倒计时，显示倒计时页面
  if (!isAuthenticated && countdown > 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card>
          <CardBody className="p-8 text-center">
            <div className="text-red-500 text-6xl mb-4">⚠️</div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">登录状态异常</h2>
            <p className="text-gray-600 mb-4">系统检测到您的登录状态已过期</p>
            <div className="text-2xl font-bold text-red-500 mb-2">{countdown}</div>
            <p className="text-sm text-gray-500">秒后将自动返回首页，请重新登录</p>
          </CardBody>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">

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

      <div className="container mx-auto px-4 lg:px-6 py-6">
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
                <h2 className="text-lg font-semibold text-gray-900 mb-4">导航菜单</h2>
                <nav className="space-y-2">
                  {tabConfigs.map(tab => renderTabItem(tab))}
                </nav>

                {/* 分隔线 */}
                <div className="my-6 border-t border-gray-200"></div>

                {/* 退出登录按钮 */}
                {/* <motion.button
                  onClick={() => setLogoutModalOpen(true)}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-all duration-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                  whileHover={{ x: 4 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <span className="flex-shrink-0">
                    <LogOut size={20} />
                  </span>
                  <span className="flex-1 font-medium">退出登录</span>
                </motion.button> */}
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
                <div className="h-16 flex items-center justify-between px-4 border-b border-gray-200 bg-blue-600">
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
                  {/* <div className="my-6 border-t border-gray-200"></div> */}

                  {/* 退出登录按钮 */}
                  {/* <motion.button
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
                  </motion.button> */}
                </nav>
              </motion.aside>
            )}
          </AnimatePresence>

          {/* 主内容区域 */}
          <motion.main
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            className="flex-1 min-w-0"
          >
            <Card className="min-h-[calc(100vh-12rem)]">
              <CardBody className="p-6">
                <AnimatePresence mode="wait">
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
    </div>
  );
};

export default UserCenter;