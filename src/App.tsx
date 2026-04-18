import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { ToastContainer } from './components/Toast';
import ErrorBoundary from './components/ErrorBoundary';

const HomePage = lazy(() => import('./pages/HomePage'));
const UserCenter = lazy(() => import('./pages/user/UserCenter'));
const GoPlusPage = lazy(() => import('./pages/features/GoPlusPage'));
const ShareSpeedTestPage = lazy(() => import('./pages/features/ShareSpeedTestPage'));
const JumpNsPage = lazy(() => import('./pages/features/JumpNsPage'));
const RedirectPage = lazy(() => import('./pages/features/RedirectPage'));
const LoginPage = lazy(() => import('./pages/auth/LoginPage'));
const RegisterPage = lazy(() => import('./pages/auth/RegisterPage'));
const ForgotPasswordPage = lazy(() => import('./pages/auth/ForgotPasswordPage'));
const NewApiPage = lazy(() => import('./pages/features/NewApiPage'));
const CustomerServicePage = lazy(() => import('./pages/features/CustomerServicePage'));
const AdminLoginPage = lazy(() => import('./pages/admin/AdminLoginPage'));
const AdminLayout = lazy(() => import('./components/admin/AdminLayout'));
const OverviewDashboardPage = lazy(() => import('./pages/admin/OverviewDashboardPage'));
const AdminProtectedRoute = lazy(() => import('./components/admin/AdminProtectedRoute'));
const UsersManagePage = lazy(() => import('./pages/admin/UsersManagePage'));
const PackagesManagePage = lazy(() => import('./pages/admin/PackagesManagePage'));
const SettingsManagePage = lazy(() => import('./pages/admin/SettingsManagePage'));
const OrdersManagePage = lazy(() => import('./pages/admin/OrdersManagePage'));
const CDKManagePage = lazy(() => import('./pages/admin/CDKManagePage'));
const UserPackagesManagePage = lazy(() => import('./pages/admin/UserPackagesManagePage'));
const InviteManagePage = lazy(() => import('./pages/admin/InviteManagePage'));

const RouteLoadingFallback: React.FC = () => (
  <div className="flex min-h-screen items-center justify-center bg-white px-4 text-sm text-gray-500">
    页面加载中...
  </div>
);

const AdminRouteShell: React.FC = () => (
  <AdminProtectedRoute>
    <AdminLayout />
  </AdminProtectedRoute>
);

const App: React.FC = () => {
  return (
    <HelmetProvider>
      <Router>
        <div className="App">
          {/* 全局Toast通知容器 */}
          <ToastContainer />
          <Suspense fallback={<RouteLoadingFallback />}>
            <Routes>
              {/* 主页路由 */}
              <Route
                path="/"
                element={
                  <ErrorBoundary autoReload={true} reloadDelay={1500}>
                    <HomePage />
                  </ErrorBoundary>
                }
              />

              {/* 认证路由 */}
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />

              {/* 用户中心路由 */}
              <Route path="/user-center" element={<UserCenter />} />

              {/* 其他功能路由 */}
              <Route path="/handle_callback" element={<RedirectPage />} />
              <Route path="/goplus" element={<GoPlusPage />} />
              <Route path="/sharespeedtest" element={<ShareSpeedTestPage />} />
              <Route path="/jumpns" element={<JumpNsPage />} />
              <Route path="/new-api" element={<NewApiPage />} />
              <Route path="/customer-service" element={<CustomerServicePage />} />

              {/* Admin管理后台路由 */}
              <Route path="/star-admin/login" element={<AdminLoginPage />} />
              <Route path="/star-admin" element={<AdminRouteShell />}>
                {/* Admin子路由 - 默认重定向到用户管理 */}
                <Route index element={<Navigate to="/star-admin/overview" replace />} />
                <Route path="overview" element={<OverviewDashboardPage />} />
                <Route path="users" element={<UsersManagePage />} />
                <Route path="packages" element={<PackagesManagePage />} />
                <Route path="user-packages" element={<UserPackagesManagePage />} />
                <Route path="orders" element={<OrdersManagePage />} />
                <Route path="cdk" element={<CDKManagePage />} />
                <Route path="settings" element={<SettingsManagePage />} />
                <Route path="invites" element={<InviteManagePage />} />
              </Route>
            </Routes>
          </Suspense>
        </div>
      </Router>
    </HelmetProvider>
  );
};

export default App;
