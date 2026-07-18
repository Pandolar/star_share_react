import React, { Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import ErrorBoundary from './components/ErrorBoundary';
import { lazyWithRetry } from './utils/lazyWithRetry';
import { WhiteLabelProvider } from './contexts/WhiteLabelContext';

const HomePage = lazyWithRetry(() => import('./pages/HomePage'), 'HomePage');
const UserCenter = lazyWithRetry(() => import('./pages/user/UserCenter'), 'UserCenter');
const GoPlusPage = lazyWithRetry(() => import('./pages/features/GoPlusPage'), 'GoPlusPage');
const ShareSpeedTestPage = lazyWithRetry(() => import('./pages/features/ShareSpeedTestPage'), 'ShareSpeedTestPage');
const JumpNsPage = lazyWithRetry(() => import('./pages/features/JumpNsPage'), 'JumpNsPage');
const RedirectPage = lazyWithRetry(() => import('./pages/features/RedirectPage'), 'RedirectPage');
const LoginPage = lazyWithRetry(() => import('./pages/auth/LoginPage'), 'LoginPage');
const RegisterPage = lazyWithRetry(() => import('./pages/auth/RegisterPage'), 'RegisterPage');
const ForgotPasswordPage = lazyWithRetry(() => import('./pages/auth/ForgotPasswordPage'), 'ForgotPasswordPage');
const NewApiPage = lazyWithRetry(() => import('./pages/features/NewApiPage'), 'NewApiPage');
const CustomerServicePage = lazyWithRetry(() => import('./pages/features/CustomerServicePage'), 'CustomerServicePage');
const AdminLoginPage = lazyWithRetry(() => import('./pages/admin/AdminLoginPage'), 'AdminLoginPage');
const AdminLayout = lazyWithRetry(() => import('./components/admin/AdminLayout'), 'AdminLayout');
const OverviewDashboardPage = lazyWithRetry(() => import('./pages/admin/OverviewDashboardPage'), 'OverviewDashboardPage');
const AdminProtectedRoute = lazyWithRetry(() => import('./components/admin/AdminProtectedRoute'), 'AdminProtectedRoute');
const UsersManagePage = lazyWithRetry(() => import('./pages/admin/UsersManagePage'), 'UsersManagePage');
const PackagesManagePage = lazyWithRetry(() => import('./pages/admin/PackagesManagePage'), 'PackagesManagePage');
const SettingsManagePage = lazyWithRetry(() => import('./pages/admin/SettingsManagePage'), 'SettingsManagePage');
const OrdersManagePage = lazyWithRetry(() => import('./pages/admin/OrdersManagePage'), 'OrdersManagePage');
const CDKManagePage = lazyWithRetry(() => import('./pages/admin/CDKManagePage'), 'CDKManagePage');
const UserPackagesManagePage = lazyWithRetry(() => import('./pages/admin/UserPackagesManagePage'), 'UserPackagesManagePage');
const InviteManagePage = lazyWithRetry(() => import('./pages/admin/InviteManagePage'), 'InviteManagePage');
const DistributorsManagePage = lazyWithRetry(() => import('./pages/admin/DistributorsManagePage'), 'DistributorsManagePage');
const InvoicesManagePage = lazyWithRetry(() => import('./pages/admin/InvoicesManagePage'), 'InvoicesManagePage');
const DistributorLoginPage = lazyWithRetry(() => import('./pages/distributor/DistributorLoginPage'), 'DistributorLoginPage');
const DistributorDashboardPage = lazyWithRetry(() => import('./pages/distributor/DistributorDashboardPage'), 'DistributorDashboardPage');
const DistributorProtectedRoute = lazyWithRetry(() => import('./components/distributor/DistributorProtectedRoute'), 'DistributorProtectedRoute');

const RouteLoadingFallback: React.FC = () => (
  <div className="flex min-h-screen items-center justify-center bg-white px-4 text-sm text-default-500">
    页面加载中...
  </div>
);

const AdminRouteShell: React.FC = () => (
  <AdminProtectedRoute>
    <AdminLayout />
  </AdminProtectedRoute>
);

const DistributorRouteShell: React.FC = () => (
  <DistributorProtectedRoute>
    <Outlet />
  </DistributorProtectedRoute>
);

const App: React.FC = () => {
  return (
    <HelmetProvider>
      <Router>
        <WhiteLabelProvider>
          <div className="App">
            {/* 全局兜底：任何路由的渲染/懒加载错误都进入恢复流程，避免整页白屏 */}
            <ErrorBoundary autoReload={true} reloadDelay={1500}>
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

              {/* 分销商路由（结构对齐 /star-admin/：登录页独立，其余在 /distributor 受保护壳下） */}
              <Route path="/distributor/login" element={<DistributorLoginPage />} />
              <Route path="/distributor" element={<DistributorRouteShell />}>
                {/* 默认重定向到控制面板 */}
                <Route index element={<Navigate to="/distributor/dashboard" replace />} />
                <Route path="dashboard" element={<DistributorDashboardPage />} />
              </Route>

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
                <Route path="invoices" element={<InvoicesManagePage />} />
                <Route path="cdk" element={<CDKManagePage />} />
                <Route path="distributors" element={<DistributorsManagePage />} />
                <Route path="settings" element={<SettingsManagePage />} />
                <Route path="invites" element={<InviteManagePage />} />
              </Route>
              </Routes>
            </Suspense>
          </ErrorBoundary>
          </div>
        </WhiteLabelProvider>
      </Router>
    </HelmetProvider>
  );
};

export default App;
