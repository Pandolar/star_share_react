import React, { Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import ErrorBoundary from './components/ErrorBoundary';
import { lazyWithRetry } from './utils/lazyWithRetry';
import { WhiteLabelProvider, useWhiteLabel } from './contexts/WhiteLabelContext';
import { CustomerServiceProvider } from './contexts/CustomerServiceContext';
import { AdminAuthProvider, useAdminAuth } from './contexts/AdminAuthContext';
import AdminPermissionRoute from './components/admin/AdminPermissionRoute';
import type { SiteFeatureName } from './services/userApi';

const HomePage = lazyWithRetry(() => import('./pages/HomePage'), 'HomePage');
const UserCenter = lazyWithRetry(() => import('./pages/user/UserCenter'), 'UserCenter');
const ShareSpeedTestPage = lazyWithRetry(() => import('./pages/features/ShareSpeedTestPage'), 'ShareSpeedTestPage');
const JumpNsPage = lazyWithRetry(() => import('./pages/features/JumpNsPage'), 'JumpNsPage');
const RedirectPage = lazyWithRetry(() => import('./pages/features/RedirectPage'), 'RedirectPage');
const LoginPage = lazyWithRetry(() => import('./pages/auth/LoginPage'), 'LoginPage');
const RegisterPage = lazyWithRetry(() => import('./pages/auth/RegisterPage'), 'RegisterPage');
const ForgotPasswordPage = lazyWithRetry(() => import('./pages/auth/ForgotPasswordPage'), 'ForgotPasswordPage');
const CustomerServicePage = lazyWithRetry(() => import('./pages/features/CustomerServicePage'), 'CustomerServicePage');
const IOSInstallPage = lazyWithRetry(() => import('./pages/features/IOSInstallPage'), 'IOSInstallPage');
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
const TeamsManagePage = lazyWithRetry(() => import('./pages/admin/TeamsManagePage'), 'TeamsManagePage');
const InviteManagePage = lazyWithRetry(() => import('./pages/admin/InviteManagePage'), 'InviteManagePage');
const DistributorsManagePage = lazyWithRetry(() => import('./pages/admin/DistributorsManagePage'), 'DistributorsManagePage');
const InvoicesManagePage = lazyWithRetry(() => import('./pages/admin/InvoicesManagePage'), 'InvoicesManagePage');
const AuditLogsPage = lazyWithRetry(() => import('./pages/admin/AuditLogsPage'), 'AuditLogsPage');
const RuntimeLogsPage = lazyWithRetry(() => import('./pages/admin/RuntimeLogsPage'), 'RuntimeLogsPage');
const ArticlesManagePage = lazyWithRetry(() => import('./pages/admin/ArticlesManagePage'), 'ArticlesManagePage');
const FeedbackManagePage = lazyWithRetry(() => import('./pages/admin/FeedbackManagePage'), 'FeedbackManagePage');
const AdminCustomerServicePage = lazyWithRetry(() => import('./pages/admin/CustomerServicePage'), 'CustomerServicePage');
const DistributorLoginPage = lazyWithRetry(() => import('./pages/distributor/DistributorLoginPage'), 'DistributorLoginPage');
const AdministratorManagePage = lazyWithRetry(() => import('./pages/admin/AdministratorManagePage'), 'AdministratorManagePage');
const AdminSecurityPage = lazyWithRetry(() => import('./pages/admin/AdminSecurityPage'), 'AdminSecurityPage');
const DistributorLayout = lazyWithRetry(() => import('./components/distributor/DistributorLayout'), 'DistributorLayout');
const DistributorPurchasePage = lazyWithRetry(() => import('./pages/distributor/DistributorPurchasePage'), 'DistributorPurchasePage');
const DistributorCdksPage = lazyWithRetry(() => import('./pages/distributor/DistributorCdksPage'), 'DistributorCdksPage');
const DistributorSecurityPage = lazyWithRetry(() => import('./pages/distributor/DistributorSecurityPage'), 'DistributorSecurityPage');
const DistributorCommissionsPage = lazyWithRetry(() => import('./pages/distributor/DistributorCommissionsPage'), 'DistributorCommissionsPage');
const DistributorProtectedRoute = lazyWithRetry(() => import('./components/distributor/DistributorProtectedRoute'), 'DistributorProtectedRoute');
const SitesManagePage = lazyWithRetry(() => import('./pages/admin/SitesManagePage'), 'SitesManagePage');
const CommissionsManagePage = lazyWithRetry(() => import('./pages/admin/CommissionsManagePage'), 'CommissionsManagePage');
const DistributorSitesPage = lazyWithRetry(() => import('./pages/distributor/DistributorSitesPage'), 'DistributorSitesPage');
const DistributorSubAccountsPage = lazyWithRetry(() => import('./pages/distributor/DistributorSubAccountsPage'), 'DistributorSubAccountsPage');

const RouteLoadingFallback: React.FC = () => (
  <div className="flex min-h-screen items-center justify-center bg-white px-4 text-sm text-default-500">
    页面加载中...
  </div>
);

const SiteFeatureRoute: React.FC<{ feature: SiteFeatureName; children: React.ReactNode }> = ({ feature, children }) => {
  const { features, loading, error } = useWhiteLabel();
  if (loading) return <RouteLoadingFallback />;
  if (error) return <div className="p-8 text-center" role="alert">{error}，请刷新后重试。</div>;
  if (!features[feature]) return <Navigate to="/user-center" replace />;
  return <>{children}</>;
};

const AdminRouteShell: React.FC = () => (
  <AdminProtectedRoute>
    <AdminLayout />
  </AdminProtectedRoute>
);

const AdminIndexRedirect: React.FC = () => {
  const { can } = useAdminAuth();
  const first = [
    ['dashboard.read', 'overview'], ['user.read', 'users'], ['package.read', 'packages'],
    ['order.read', 'orders'], ['customer_service.conversation.read', 'customer-service'],
    ['administrator.account.read', 'administrators'], ['config.read', 'settings'],
    ['site.read', 'sites'], ['commission.read', 'commissions'],
  ].find(([permission]) => can(permission));
  return <Navigate to={`/star-admin/${first?.[1] || 'security'}`} replace />;
};

const RequireAdminPermission: React.FC<{ permission?: string; anyOf?: string[]; children: React.ReactNode }> = ({ permission, anyOf, children }) => (
  <AdminPermissionRoute permission={permission} anyOf={anyOf}>{children}</AdminPermissionRoute>
);

const DistributorRouteShell: React.FC = () => (
  <DistributorProtectedRoute>
    <DistributorLayout />
  </DistributorProtectedRoute>
);

const App: React.FC = () => {
  return (
    <HelmetProvider>
      <Router>
        <AdminAuthProvider>
        <WhiteLabelProvider>
          <div className="App">
            {/* 全局兜底：任何路由的渲染/懒加载错误都进入恢复流程，避免整页白屏 */}
            <ErrorBoundary autoReload={true} reloadDelay={1500}>
              <Suspense fallback={<RouteLoadingFallback />}>
                <CustomerServiceProvider>
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
                    <Route path="/sharespeedtest" element={<SiteFeatureRoute feature="speedtest"><ShareSpeedTestPage /></SiteFeatureRoute>} />
                    <Route path="/jumpns" element={<JumpNsPage />} />
                    <Route path="/ios" element={<IOSInstallPage />} />
                    <Route path="/customer-service" element={<SiteFeatureRoute feature="customer_service"><CustomerServicePage /></SiteFeatureRoute>} />

                    {/* 分销商路由（结构对齐 /star-admin/：登录页独立，其余在 /distributor 受保护壳下） */}
                    <Route path="/distributor/login" element={<DistributorLoginPage />} />
                    <Route path="/distributor" element={<DistributorRouteShell />}>
                      {/* 默认进入卡密采购；旧控制台地址兼容跳转到采购页 */}
                      <Route index element={<Navigate to="/distributor/purchase" replace />} />
                      <Route path="dashboard" element={<Navigate to="/distributor/purchase" replace />} />
                      <Route path="purchase" element={<DistributorPurchasePage />} />
                      <Route path="cdks" element={<DistributorCdksPage />} />
                      <Route path="sites" element={<DistributorSitesPage />} />
                      <Route path="sub-accounts" element={<DistributorSubAccountsPage />} />
                      <Route path="commissions" element={<DistributorCommissionsPage />} />
                      <Route path="security" element={<DistributorSecurityPage />} />
                    </Route>

                    {/* Admin管理后台路由 */}
                    <Route path="/star-admin/login" element={<AdminLoginPage />} />
                    {/* 客服工作台：独立于后台布局的全屏大页面 */}
                    <Route
                      path="/star-admin/service"
                      element={
                        <AdminProtectedRoute>
                          <RequireAdminPermission permission="customer_service.conversation.read">
                            <AdminCustomerServicePage />
                          </RequireAdminPermission>
                        </AdminProtectedRoute>
                      }
                    />
                    <Route path="/star-admin" element={<AdminRouteShell />}>
                      <Route index element={<AdminIndexRedirect />} />
                      <Route path="overview" element={<RequireAdminPermission permission="dashboard.read"><OverviewDashboardPage /></RequireAdminPermission>} />
                      <Route path="users" element={<RequireAdminPermission permission="user.read"><UsersManagePage /></RequireAdminPermission>} />
                      <Route path="packages" element={<RequireAdminPermission permission="package.read"><PackagesManagePage /></RequireAdminPermission>} />
                      <Route path="user-packages" element={<RequireAdminPermission permission="user_package.read"><UserPackagesManagePage /></RequireAdminPermission>} />
                      <Route path="teams" element={<RequireAdminPermission permission="team.read"><TeamsManagePage /></RequireAdminPermission>} />
                      <Route path="orders" element={<RequireAdminPermission permission="order.read"><OrdersManagePage /></RequireAdminPermission>} />
                      <Route path="invoices" element={<RequireAdminPermission permission="invoice.read"><InvoicesManagePage /></RequireAdminPermission>} />
                      <Route path="cdk" element={<RequireAdminPermission permission="cdk.read"><CDKManagePage /></RequireAdminPermission>} />
                      <Route path="distributors" element={<RequireAdminPermission permission="distributor.read"><DistributorsManagePage /></RequireAdminPermission>} />
                      <Route path="sites" element={<RequireAdminPermission permission="site.read"><SitesManagePage /></RequireAdminPermission>} />
                      <Route path="commissions" element={<RequireAdminPermission permission="commission.read"><CommissionsManagePage /></RequireAdminPermission>} />
                      <Route path="audit-logs" element={<RequireAdminPermission permission="audit.read"><AuditLogsPage /></RequireAdminPermission>} />
                      <Route path="runtime-logs" element={<RequireAdminPermission permission="runtime_log.read"><RuntimeLogsPage /></RequireAdminPermission>} />
                      <Route path="articles" element={<RequireAdminPermission permission="article.read"><ArticlesManagePage /></RequireAdminPermission>} />
                      <Route path="settings" element={<RequireAdminPermission permission="config.read"><SettingsManagePage /></RequireAdminPermission>} />
                      <Route path="invites" element={<RequireAdminPermission anyOf={['invite.policy.read', 'invite.cashback.read', 'invite.analytics.read', 'invite.reward.read', 'invite.withdrawal.read']}><InviteManagePage /></RequireAdminPermission>} />
                      <Route path="feedback" element={<RequireAdminPermission permission="feedback.read"><FeedbackManagePage /></RequireAdminPermission>} />
                      {/* 旧地址兼容跳转到独立客服工作台 */}
                      <Route path="customer-service" element={<Navigate to="/star-admin/service" replace />} />
                      <Route path="administrators" element={<RequireAdminPermission permission="administrator.account.read"><AdministratorManagePage /></RequireAdminPermission>} />
                      <Route path="security" element={<AdminSecurityPage />} />
                    </Route>
                  </Routes>
                </CustomerServiceProvider>
              </Suspense>
          </ErrorBoundary>
          </div>
        </WhiteLabelProvider>
        </AdminAuthProvider>
      </Router>
    </HelmetProvider>
  );
};

export default App;
