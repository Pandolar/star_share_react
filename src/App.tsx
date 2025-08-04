import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import HomePage from './pages/HomePage';
import UserCenter from './pages/user/UserCenter';
import AdminLayout from './layouts/AdminLayout';
import AdminLogin from './pages/admin/AdminLogin';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminPackages from './pages/admin/AdminPackages';
import AdminUsers from './pages/admin/AdminUsers';
import AdminUserPackages from './pages/admin/AdminUserPackages';
import AdminCDK from './pages/admin/AdminCDK';
import AdminConfig from './pages/admin/AdminConfig';
import ProtectedRoute from './components/ProtectedRoute';
import { ToastContainer } from './components/Toast';
import { RedirectPage, GoPlusPage } from './pages/other';
import { HeroUIProvider } from '@heroui/react';
import { HomeInfoProvider } from './contexts/HomeInfoContext';

// 添加导入
import ErrorBoundary from './components/ErrorBoundary';

const App: React.FC = () => {
  return (
    <HelmetProvider>
      <HeroUIProvider>
        <HomeInfoProvider>
          <Router>
            <div className="App">
              {/* 全局Toast通知容器 */}
              <ToastContainer />
              <Routes>
                {/* 主页路由 */}
                // 修改主页路由配置
                <Route 
                  path="/" 
                  element={
                    <ErrorBoundary autoReload={true} reloadDelay={1500}>
                      <HomePage />
                    </ErrorBoundary>
                  } 
                />

                {/* 用户中心路由 */}
                <Route path="/user-center" element={<UserCenter />} />

                {/* 其他功能路由 */}
                <Route path="/handle_callback" element={<RedirectPage />} />
                <Route path="/goplus" element={<GoPlusPage />} />

                {/* 管理员登录路由 */}
                <Route path="/admin/login" element={<AdminLogin />} />

                {/* 管理员路由重定向 */}
                <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />

                {/* 管理员路由 - 需要认证 */}
                <Route
                  path="/admin/dashboard"
                  element={
                    <ProtectedRoute>
                      <AdminLayout>
                        <AdminDashboard />
                      </AdminLayout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/packages"
                  element={
                    <ProtectedRoute>
                      <AdminLayout>
                        <AdminPackages />
                      </AdminLayout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/users"
                  element={
                    <ProtectedRoute>
                      <AdminLayout>
                        <AdminUsers />
                      </AdminLayout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/user-packages"
                  element={
                    <ProtectedRoute>
                      <AdminLayout>
                        <AdminUserPackages />
                      </AdminLayout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/cdk"
                  element={
                    <ProtectedRoute>
                      <AdminLayout>
                        <AdminCDK />
                      </AdminLayout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/config"
                  element={
                    <ProtectedRoute>
                      <AdminLayout>
                        <AdminConfig />
                      </AdminLayout>
                    </ProtectedRoute>
                  }
                />
              </Routes>
            </div>
          </Router>
        </HomeInfoProvider>
      </HeroUIProvider>
    </HelmetProvider>
  );
};

export default App;