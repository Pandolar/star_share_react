import React, { Suspense, useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { setPendingNavigation } from './navPending';
import {
    Button,
    Navbar,
    NavbarBrand,
    NavbarContent,
    NavbarItem,
    NavbarMenuToggle,
    NavbarMenu,
    NavbarMenuItem,
    Card,
    CardBody,
    Dropdown,
    DropdownTrigger,
    DropdownMenu,
    DropdownItem,
    Spinner,
    User,
    Listbox,
    ListboxItem,
} from '@heroui/react';
import {
    Users,
    Package,
    ShoppingCart,
    CreditCard,
    UserCheck,
    Settings,
    LogOut,
    Shield,
    Home,
    BarChart3,
    Gift,
    Globe,
    ReceiptText,
    ScrollText,
    FileSearch,
    FileText,
    MessageSquare,
    Headphones,
    UserCog,
    KeyRound,
} from 'lucide-react';
import { useAdminAuth } from '../../contexts/AdminAuthContext';

/**
 * 管理后台布局组件
 * 提供统一的导航和布局结构
 */
const AdminLayout: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const { principal, can, canAny, logout } = useAdminAuth();

    // 获取当前激活的Tab
    const getCurrentTab = (): string => {
        const path = location.pathname.split('/').pop() || 'users';
        return path;
    };

    // 处理Tab切换
    const handleTabChange = (key: string): void => {
        // React Router 转场会保留旧页面直到新 chunk 就绪；提示状态走模块级订阅，
        // 独立子组件渲染，避免被挂起中的 Outlet 渲染回退掉。
        if (key !== getCurrentTab()) setPendingNavigation(key);
        navigate(`/star-admin/${key}`);
    };

    // 处理登出
    const handleLogout = async (): Promise<void> => {
        await logout();
        navigate('/star-admin/login', { replace: true });
    };

    // 导航与后端权限一一对应；无权限页面不显示入口，直接访问仍由路由守卫和后端拒绝。
    const menuItems = [
        { key: 'overview', label: '系统总览', icon: <BarChart3 className="w-5 h-5" />, path: '/star-admin/overview', permission: 'dashboard.read' },
        { key: 'users', label: '用户管理', icon: <Users className="w-5 h-5" />, path: '/star-admin/users', permission: 'user.read' },
        { key: 'packages', label: '套餐管理', icon: <Package className="w-5 h-5" />, path: '/star-admin/packages', permission: 'package.read' },
        { key: 'user-packages', label: '用户套餐', icon: <UserCheck className="w-5 h-5" />, path: '/star-admin/user-packages', permission: 'user_package.read' },
        { key: 'teams', label: '团队管理', icon: <Users className="w-5 h-5" />, path: '/star-admin/teams', permission: 'team.read' },
        { key: 'orders', label: '订单管理', icon: <ShoppingCart className="w-5 h-5" />, path: '/star-admin/orders', permission: 'order.read' },
        { key: 'invoices', label: '开票管理', icon: <ReceiptText className="w-5 h-5" />, path: '/star-admin/invoices', permission: 'invoice.read' },
        { key: 'cdk', label: 'CDK管理', icon: <CreditCard className="w-5 h-5" />, path: '/star-admin/cdk', permission: 'cdk.read' },
        { key: 'sites', label: '代理站点', icon: <Globe className="w-5 h-5" />, path: '/star-admin/sites', permission: 'site.read' },
        { key: 'commissions', label: '佣金对账', icon: <ReceiptText className="w-5 h-5" />, path: '/star-admin/commissions', permission: 'commission.read' },
        { key: 'distributors', label: '分销商管理', icon: <Users className="w-5 h-5" />, path: '/star-admin/distributors', permission: 'distributor.read' },
        { key: 'articles', label: '文章管理', icon: <FileText className="w-5 h-5" />, path: '/star-admin/articles', permission: 'article.read' },
        { key: 'audit-logs', label: '审计日志', icon: <ScrollText className="w-5 h-5" />, path: '/star-admin/audit-logs', permission: 'audit.read' },
        { key: 'runtime-logs', label: '运行日志', icon: <FileSearch className="w-5 h-5" />, path: '/star-admin/runtime-logs', permission: 'runtime_log.read' },
        { key: 'settings', label: '系统配置', icon: <Settings className="w-5 h-5" />, path: '/star-admin/settings', permission: 'config.read' },
        { key: 'invites', label: '邀请管理', icon: <Gift className="w-5 h-5" />, path: '/star-admin/invites', permission: null, anyOf: ['invite.policy.read', 'invite.cashback.read', 'invite.analytics.read', 'invite.reward.read', 'invite.withdrawal.read'] },
        { key: 'feedback', label: '工单管理', icon: <MessageSquare className="w-5 h-5" />, path: '/star-admin/feedback', permission: 'feedback.read' },
        { key: 'customer-service', label: '在线客服', icon: <Headphones className="w-5 h-5" />, path: '/star-admin/service', permission: 'customer_service.conversation.read' },
        { key: 'administrators', label: '管理员与角色', icon: <UserCog className="w-5 h-5" />, path: '/star-admin/administrators', permission: 'administrator.account.read' },
        { key: 'security', label: '账号安全', icon: <KeyRound className="w-5 h-5" />, path: '/star-admin/security', permission: null },
    ].filter((item) => 'anyOf' in item ? canAny(...(item.anyOf || [])) : can(item.permission));

    return (
        <div className="min-h-screen bg-default-50">
            {/* 顶部导航栏 */}
            <Navbar
                isBordered
                isMenuOpen={isMenuOpen}
                onMenuOpenChange={setIsMenuOpen}
                maxWidth="full"
            >
                {/* 左侧品牌区域 */}
                <NavbarContent className="sm:hidden" justify="start">
                    <NavbarMenuToggle
                        aria-label={isMenuOpen ? "关闭菜单" : "打开菜单"}
                        className="sm:hidden"
                    />
                </NavbarContent>

                <NavbarContent className="hidden sm:flex gap-4" justify="start">
                    <NavbarBrand>
                        <div className="flex items-center gap-2">
                            <Shield className="w-6 h-6 text-primary" />
                            <span className="font-bold text-lg text-default-800">
                                Star Share 管理后台
                            </span>
                        </div>
                    </NavbarBrand>
                </NavbarContent>

                {/* 右侧用户区域 */}
                <NavbarContent justify="end">
                    <NavbarItem>
                        <Button
                            variant="light"
                            color="primary"
                            startContent={<Home className="w-4 h-4" />}
                            onPress={() => window.open('/', '_blank')}
                        >
                            前台首页
                        </Button>
                    </NavbarItem>
                    <NavbarItem>
                        <Dropdown>
                            <DropdownTrigger>
                                <User
                                    name={principal?.display_name || principal?.username || '管理员'}
                                    description={principal?.is_superadmin ? '超级管理员' : principal?.roles.map((role) => role.name).join('、') || '管理员'}
                                    avatarProps={{
                                        src: "",
                                        fallback: (principal?.display_name || principal?.username || 'A').slice(0, 2),
                                        color: "primary",
                                    }}
                                    className="cursor-pointer"
                                />
                            </DropdownTrigger>
                            <DropdownMenu aria-label="用户菜单">
                                <DropdownItem key="security" startContent={<KeyRound className="w-4 h-4" />} onPress={() => navigate('/star-admin/security')}>
                                    账号安全
                                </DropdownItem>
                                <DropdownItem key="logout" color="danger" startContent={<LogOut className="w-4 h-4" />} onPress={() => void handleLogout()}>
                                    退出登录
                                </DropdownItem>
                            </DropdownMenu>
                        </Dropdown>
                    </NavbarItem>
                </NavbarContent>

                {/* 移动端菜单 */}
                <NavbarMenu className="pt-6">
                    {menuItems.map((item) => (
                        <NavbarMenuItem key={item.key}>
                            <Button
                                variant={getCurrentTab() === item.key ? "flat" : "light"}
                                color={getCurrentTab() === item.key ? "primary" : "default"}
                                startContent={item.icon}
                                size="lg"
                                onPress={() => {
                                    handleTabChange(item.key);
                                    setIsMenuOpen(false);
                                }}
                                className="w-full justify-start text-base"
                            >
                                {item.label}
                            </Button>
                        </NavbarMenuItem>
                    ))}
                </NavbarMenu>
            </Navbar>

            {/* 主要内容区域：左侧导航 + 右侧页面内容 */}
            <div className="mx-auto px-4 py-6 w-full max-w-[1600px]">
                <div className="flex gap-6">
                    {/* 左侧导航 */}
                    <Card shadow="sm" className={`hidden sm:flex w-72 shrink-0 h-fit ${getCurrentTab() === 'customer-service' ? 'max-h-[calc(100dvh-7rem)] overflow-y-auto' : ''}`}>
                        <CardBody className="p-3">
                            <Listbox
                                aria-label="管理后台导航"
                                selectionMode="single"
                                selectedKeys={[getCurrentTab()]}
                                onSelectionChange={(keys) => {
                                    if (keys !== 'all') handleTabChange(String(Array.from(keys)[0] || 'overview'));
                                }}
                                variant="flat"
                                color="primary"
                            >
                                {menuItems.map((item) => (
                                    <ListboxItem
                                        key={item.key}
                                        startContent={item.icon}
                                        textValue={item.label}
                                        className="min-h-12 px-4"
                                    >
                                        <span className="text-base font-medium">{item.label}</span>
                                    </ListboxItem>
                                ))}
                            </Listbox>
                        </CardBody>
                    </Card>

                    {/* 右侧内容：切换期间由 navPending 的 DOM 进度条提示；整页懒加载由 Suspense 兜底 */}
                    <div className="flex-1 min-w-0">
                        <Suspense fallback={<div className="flex min-h-[40vh] items-center justify-center"><Spinner size="lg" color="primary" label="正在加载页面…" /></div>}>
                            <Outlet />
                        </Suspense>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default AdminLayout; 
