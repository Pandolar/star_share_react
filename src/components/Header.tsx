import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Menu, X } from 'lucide-react';
import { useHomeInfo } from '../contexts/HomeInfoContext';
import { NavAction as NavActionType, ButtonType, TargetType } from '../types/homeInfo';

// 按钮渲染函数
const renderNavAction = (
  action: NavActionType,
  key: string | number,
  isMobile: boolean = false,
  onClick?: () => void
) => {
  let className = '';
  let whileHover: any = {};
  let whileTap: any = {};

  switch (action.type) {
    case 'text':
      className =
        'text-gray-600 hover:text-gray-900 transition-colors duration-200 font-medium px-3 py-2 rounded-lg hover:bg-gray-50' +
        (isMobile ? ' py-3' : '');
      whileHover = isMobile ? {} : { y: -1 };
      whileTap = { scale: 0.98 };
      break;
    case 'outline':
      className =
        'px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 flex items-center justify-center font-medium';
      whileHover = { scale: 1.02 };
      whileTap = { scale: 0.98 };
      break;
    case 'solid':
      className =
        'px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors duration-200 flex items-center justify-center font-medium';
      whileHover = { scale: 1.02 };
      whileTap = { scale: 0.98 };
      break;
    default:
      break;
  }

  return (
    <motion.a
      key={key}
      href={action.url}
      target={action.target}
      rel={action.target === '_blank' ? 'noopener noreferrer' : undefined}
      className={`${className} no-underline`}
      whileHover={whileHover}
      whileTap={whileTap}
      onClick={onClick}
      style={{ textDecoration: 'none' }}
    >
      {action.name}
    </motion.a>
  );
};

// Header组件
const Header: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { homeInfo, loading } = useHomeInfo();

  // 如果还在加载中，显示默认的导航
  if (loading) {
    return (
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Loading skeleton */}
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gray-200 rounded animate-pulse"></div>
              <div className="w-24 h-6 bg-gray-200 rounded animate-pulse"></div>
            </div>
          </div>
        </div>
      </header>
    );
  }

  const { siteInfo, navigation } = homeInfo;
  const navActions = navigation.navActions;

  // 拆分导航项和右侧按钮
  const navItems = navActions.filter((item) => item.type === 'text');
  const rightButtons = navActions.filter((item) => item.type !== 'text');

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <motion.div
            className="flex items-center space-x-3"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <img
              src={siteInfo.logoUrl}
              alt="Logo"
              className="w-8 h-8"
            />
            <div className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              {siteInfo.siteName}
            </div>
          </motion.div>

          {/* 桌面导航菜单 */}
          <nav className="hidden md:flex items-center space-x-2">
            {navItems.map((item, idx) =>
              renderNavAction(item, idx)
            )}
          </nav>

          {/* 右侧按钮组 */}
          <div className="hidden md:flex items-center space-x-3">
            {rightButtons.map((item, idx) =>
              renderNavAction(item, idx)
            )}
          </div>

          {/* 移动端菜单按钮 */}
          <div className="md:hidden">
            <motion.button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="p-2 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors duration-200"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </motion.button>
          </div>
        </div>

        {/* 移动端菜单 */}
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="md:hidden border-t border-gray-200 mt-4 pt-4 pb-6"
          >
            <nav className="flex flex-col space-y-4">
              {navItems.map((item, idx) =>
                renderNavAction(item, idx, true, () => setIsMenuOpen(false))
              )}

              {/* 移动端按钮组 */}
              <div className="flex flex-col space-y-3 pt-4">
                {rightButtons.map((item, idx) =>
                  renderNavAction(item, idx, true)
                )}
              </div>
            </nav>
          </motion.div>
        )}
      </div>
    </header>
  );
};

export default Header;