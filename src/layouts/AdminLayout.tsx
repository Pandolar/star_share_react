/**
 * 管理后台布局组件
 * 提供统一的管理界面布局，包含侧边栏导航和顶部操作栏
 */
import React, { useState } from 'react';
import {
  Card,
  CardBody,
  Button,
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem
} from '@heroui/react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  Users,
  Gift,
  Key,
  Settings,
  LogOut,
  Menu,
  X,
  Bell,
  User
} from 'lucide-react';
import { clearStoredToken } from '../config';
import { logoutApi } from '../services/api';
import { showMessage } from '../utils/toast';
import { motion, AnimatePresence } from 'framer-motion';

interface AdminLayoutProps {
  children: React.ReactNode;
}

// 菜单项接口定义
interface MenuItem {
  key: string;
  icon: React.ReactNode;
  label: string;
  path: string;
  badge?: number; // 可选的徽章数字
}

const AdminLayout: React.FC<AdminLayoutProps> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // 菜单项配置
  const menuItems: MenuItem[] = [
    {
      key: '/admin/dashboard',
      icon: <LayoutDashboard size={20} />,
      label: '仪表盘',
      path: '/admin/dashboard',
    },
    {
      key: '/admin/packages',
      icon: <Package size={20} />,
      label: '套餐管理',
      path: '/admin/packages',
    },
    {
      key: '/admin/users',
      icon: <Users size={20} />,
      label: '用户管理',
      path: '/admin/users',
      badge: 5 // 示例徽章
    },
    {
      key: '/admin/user-packages',
      icon: <Gift size={20} />,
      label: '用户套餐',
      path: '/admin/user-packages',
    },
    {
      key: '/admin/cdk',
      icon: <Key size={20} />,
      label: 'CDK管理',
      path: '/admin/cdk',
    },
    {
      key: '/admin/config',
      icon: <Settings size={20} />,
      label: '系统配置',
      path: '/admin/config',
    },
  ];

  // 处理退出登录（简化版）
  const handleLogout = async () => {
    try {
      // 先调用后端API退出
      await logoutApi.logout();

      // 然后发送postMessage通知并清除本地数据
      const { notifyLogout } = await import('../utils/postMessage');
      notifyLogout(); // 自动获取当前页面地址

      clearStoredToken();
      showMessage.success('已安全退出');
      navigate('/admin/login');
    } catch (error) {
      // 即使API调用失败，也应该清除本地token并发送通知
      try {
        const { notifyLogout } = await import('../utils/postMessage');
        notifyLogout(); // 自动获取当前页面地址
      } catch (notifyError) {
        console.error('[通信] 发送退出通知失败:', notifyError);
      }

      clearStoredToken();
      navigate('/admin/login');
    }
  };

  // 处理菜单项点击
  const handleMenuClick = (path: string) => {
    navigate(path);
    setMobileMenuOpen(false); // 移动端点击后关闭菜单
  };

  // 获取当前选中的菜单项
  const getCurrentPath = () => {
    return location.pathname;
  };

  // 渲染菜单项
  const renderMenuItem = (item: MenuItem) => {
    const isActive = getCurrentPath() === item.path;

    return (
      <motion.div
        key={item.key}
        whileHover={{ x: collapsed ? 0 : 4 }}
        whileTap={{ scale: 0.98 }}
        className="relative"
      >
        <button
          onClick={() => handleMenuClick(item.path)}
          className={`
            w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200
            ${isActive
              ? 'bg-blue-600 text-white shadow-md'
              : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
            }
            ${collapsed ? 'justify-center px-2' : 'justify-start'}
          `}
        >
          <span className="flex-shrink-0">{item.icon}</span>
          {!collapsed && (
            <>
              <span className="flex-1 text-left font-medium">{item.label}</span>
              {item.badge && (
                <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full min-w-[20px] text-center">
                  {item.badge}
                </span>
              )}
            </>
          )}
        </button>
      </motion.div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 桌面端侧边栏 */}
      <motion.aside
        initial={false}
        animate={{ width: collapsed ? 80 : 280 }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
        className="fixed left-0 top-0 bottom-0 bg-white border-r border-gray-200 z-40 hidden lg:block"
        style={{
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
        }}
      >
        {/* Logo区域 */}
        <div className="h-16 flex items-center justify-center border-b border-gray-200 bg-blue-600">
          <motion.div
            animate={{ opacity: collapsed ? 0 : 1 }}
            transition={{ duration: 0.2 }}
            className="text-white font-bold text-lg"
          >
            {collapsed ? (
              <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                SA
              </div>
            ) : (
              'Star Admin'
            )}
          </motion.div>
        </div>

        {/* 导航菜单 */}
        <nav className="p-4 space-y-2">
          {menuItems.map(renderMenuItem)}
        </nav>
      </motion.aside>

      {/* 移动端菜单遮罩 */}
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
            initial={{ x: -280 }}
            animate={{ x: 0 }}
            exit={{ x: -280 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed left-0 top-0 bottom-0 w-72 bg-white z-50 lg:hidden shadow-2xl"
          >
            {/* 移动端Logo区域 */}
            <div className="h-16 flex items-center justify-between px-4 border-b border-gray-200 bg-blue-600">
              <div className="text-white font-bold text-lg">Star Admin</div>
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
              {menuItems.map((item) => {
                const isActive = getCurrentPath() === item.path;
                return (
                  <button
                    key={item.key}
                    onClick={() => handleMenuClick(item.path)}
                    className={`
                      w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200
                      ${isActive
                        ? 'bg-blue-600 text-white shadow-md'
                        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                      }
                    `}
                  >
                    <span className="flex-shrink-0">{item.icon}</span>
                    <span className="flex-1 text-left font-medium">{item.label}</span>
                    {item.badge && (
                      <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full min-w-[20px] text-center">
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* 主内容区域 */}
      <div
        className="min-h-screen transition-all duration-300 ease-in-out lg:ml-[280px] xl:ml-[280px]"
        style={{
          marginLeft: window.innerWidth >= 1024 ? (collapsed ? '80px' : '280px') : '0'
        }}
      >
        {/* 顶部导航栏 */}
        <header
          className="fixed top-0 right-0 h-16 bg-white border-b border-gray-200 z-30 transition-all duration-300 ease-in-out lg:left-[280px] xl:left-[280px]"
          style={{
            left: window.innerWidth >= 1024 ? (collapsed ? '80px' : '280px') : '0',
            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)'
          }}
        >
          <div className="h-full px-4 lg:px-6 flex items-center justify-between">
            {/* 左侧：菜单按钮 */}
            <div className="flex items-center gap-4">
              {/* 移动端菜单按钮 */}
              <Button
                isIconOnly
                variant="light"
                className="lg:hidden"
                onClick={() => setMobileMenuOpen(true)}
              >
                <Menu size={20} />
              </Button>

              {/* 桌面端折叠按钮 */}
              <Button
                isIconOnly
                variant="light"
                className="hidden lg:flex"
                onClick={() => setCollapsed(!collapsed)}
              >
                {collapsed ? <Menu size={20} /> : <X size={20} />}
              </Button>
            </div>

            {/* 右侧：操作按钮 */}
            <div className="flex items-center gap-2">
              {/* 通知按钮 */}
              <Button
                isIconOnly
                variant="light"
                className="relative"
              >
                <Bell size={20} />
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full"></span>
              </Button>

              {/* 用户菜单 */}
              <Dropdown>
                <DropdownTrigger>
                  <Button
                    variant="light"
                    className="flex items-center gap-2 px-3"
                  >
                    <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                      <User size={16} className="text-white" />
                    </div>
                    <span className="hidden sm:inline font-medium">管理员</span>
                  </Button>
                </DropdownTrigger>
                <DropdownMenu>
                  <DropdownItem
                    key="profile"
                    startContent={<User size={16} />}
                    onClick={() => console.log('个人资料')}
                  >
                    个人资料
                  </DropdownItem>
                  <DropdownItem
                    key="logout"
                    startContent={<LogOut size={16} />}
                    onClick={handleLogout}
                    color="danger"
                  >
                    退出登录
                  </DropdownItem>
                </DropdownMenu>
              </Dropdown>
            </div>
          </div>
        </header>

        {/* 内容区域 */}
        <div className="pt-16 p-4 lg:p-6 min-h-screen bg-gray-50">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="max-w-full"
          >
            <Card className="min-h-[calc(100vh-7rem)] shadow-sm">
              <CardBody className="p-6">
                {children}
              </CardBody>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default AdminLayout;