import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
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
import { HeroUIProvider } from '@heroui/react';

const App: React.FC = () => {
  return (
    <HeroUIProvider>
      <Router>
        <div className="App">
          {/* 全局Toast通知容器 */}
          <ToastContainer />
          <Routes>
            {/* 主页路由 */}
            <Route path="/" element={<HomePage />} />

            {/* 用户中心路由 */}
            <Route path="/user-center" element={<UserCenter />} />

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
    </HeroUIProvider>
  );
};

export default App;