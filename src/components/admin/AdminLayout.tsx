import React, { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
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
    ReceiptText,
    ScrollText,
    FileText,
} from 'lucide-react';
import adminApiService from '../../services/adminApi';

/**
 * 管理后台布局组件
 * 提供统一的导航和布局结构
 */
const AdminLayout: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    // 获取当前激活的Tab
    const getCurrentTab = (): string => {
        const path = location.pathname.split('/').pop() || 'users';
        return path;
    };

    // 处理Tab切换
    const handleTabChange = (key: string): void => {
        navigate(`/star-admin/${key}`);
    };

    // 处理登出
    const handleLogout = (): void => {
        adminApiService.logout();
        navigate('/star-admin/login');
    };

    // 导航菜单项配置
    const menuItems = [
        {
            key: 'overview',
            label: '系统总览',
            icon: <BarChart3 className="w-5 h-5" />,
            path: '/star-admin/overview',
        },
        {
            key: 'users',
            label: '用户管理',
            icon: <Users className="w-5 h-5" />,
            path: '/star-admin/users',
        },
        {
            key: 'packages',
            label: '套餐管理',
            icon: <Package className="w-5 h-5" />,
            path: '/star-admin/packages',
        },
        {
            key: 'user-packages',
            label: '用户套餐',
            icon: <UserCheck className="w-5 h-5" />,
            path: '/star-admin/user-packages',
        },
        {
            key: 'teams',
            label: '团队管理',
            icon: <Users className="w-5 h-5" />,
            path: '/star-admin/teams',
        },
        {
            key: 'orders',
            label: '订单管理',
            icon: <ShoppingCart className="w-5 h-5" />,
            path: '/star-admin/orders',
        },
        {
            key: 'invoices',
            label: '开票管理',
            icon: <ReceiptText className="w-5 h-5" />,
            path: '/star-admin/invoices',
        },
        {
            key: 'cdk',
            label: 'CDK管理',
            icon: <CreditCard className="w-5 h-5" />,
            path: '/star-admin/cdk',
        },
        {
            key: 'distributors',
            label: '分销商管理',
            icon: <Users className="w-5 h-5" />,
            path: '/star-admin/distributors',
        },
        {
            key: 'articles',
            label: '文章管理',
            icon: <FileText className="w-5 h-5" />,
            path: '/star-admin/articles',
        },
        {
            key: 'audit-logs',
            label: '审计日志',
            icon: <ScrollText className="w-5 h-5" />,
            path: '/star-admin/audit-logs',
        },
        {
            key: 'settings',
            label: '系统配置',
            icon: <Settings className="w-5 h-5" />,
            path: '/star-admin/settings',
        },
        {
            key: 'invites',
            label: '邀请管理',
            icon: <Gift className="w-5 h-5" />,
            path: '/star-admin/invites',
        },
    ];

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
                                    name="管理员"
                                    description="系统管理员"
                                    avatarProps={{
                                        src: "",
                                        fallback: "Admin",
                                        color: "primary",
                                    }}
                                    className="cursor-pointer"
                                />
                            </DropdownTrigger>
                            <DropdownMenu aria-label="用户菜单">
                                <DropdownItem
                                    key="logout"
                                    color="danger"
                                    startContent={<LogOut className="w-4 h-4" />}
                                    onPress={handleLogout}
                                >
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
                <div className="hidden sm:flex gap-6">
                    {/* 左侧导航 */}
                    <Card shadow="sm" className="w-72 shrink-0 h-fit">
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

                    {/* 右侧内容 */}
                    <div className="flex-1 min-w-0">
                        <Outlet />
                    </div>
                </div>

                {/* 移动端：保留顶部菜单 + 内容 */}
                <div className="sm:hidden">
                    <Outlet />
                </div>
            </div>
        </div>
    );
};

export default AdminLayout; 
