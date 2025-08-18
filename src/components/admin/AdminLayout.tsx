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
    Tabs,
    Tab,
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
            key: 'users',
            label: '用户管理',
            icon: <Users className="w-4 h-4" />,
            path: '/star-admin/users',
        },
        {
            key: 'packages',
            label: '套餐管理',
            icon: <Package className="w-4 h-4" />,
            path: '/star-admin/packages',
        },
        {
            key: 'user-packages',
            label: '用户套餐',
            icon: <UserCheck className="w-4 h-4" />,
            path: '/star-admin/user-packages',
        },
        {
            key: 'orders',
            label: '订单管理',
            icon: <ShoppingCart className="w-4 h-4" />,
            path: '/star-admin/orders',
        },
        {
            key: 'cdk',
            label: 'CDK管理',
            icon: <CreditCard className="w-4 h-4" />,
            path: '/star-admin/cdk',
        },
        {
            key: 'settings',
            label: '系统配置',
            icon: <Settings className="w-4 h-4" />,
            path: '/star-admin/settings',
        },
    ];

    return (
        <div className="min-h-screen bg-gray-50">
            {/* 顶部导航栏 */}
            <Navbar
                isBordered
                isMenuOpen={isMenuOpen}
                onMenuOpenChange={setIsMenuOpen}
                className="bg-white shadow-sm"
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
                            <Shield className="w-6 h-6 text-blue-600" />
                            <span className="font-bold text-lg text-gray-800">
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
                            startContent={<Home className="w-4 h-4" />}
                            onPress={() => window.open('/', '_blank')}
                            className="text-gray-600 hover:text-blue-600"
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
                                        className: "bg-blue-100 text-blue-600",
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
                <NavbarMenu className="bg-white pt-6">
                    {menuItems.map((item) => (
                        <NavbarMenuItem key={item.key}>
                            <Button
                                variant={getCurrentTab() === item.key ? "flat" : "light"}
                                color={getCurrentTab() === item.key ? "primary" : "default"}
                                startContent={item.icon}
                                onPress={() => {
                                    handleTabChange(item.key);
                                    setIsMenuOpen(false);
                                }}
                                className="w-full justify-start"
                            >
                                {item.label}
                            </Button>
                        </NavbarMenuItem>
                    ))}
                </NavbarMenu>
            </Navbar>

            {/* 主要内容区域 */}
            <div className="container mx-auto px-4 py-6 max-w-7xl">
                {/* 桌面端Tab导航 */}
                <div className="hidden sm:block mb-6">
                    <Card className="bg-white shadow-sm">
                        <CardBody className="px-6 py-4">
                            <Tabs
                                aria-label="管理后台导航"
                                selectedKey={getCurrentTab()}
                                onSelectionChange={(key) => handleTabChange(key as string)}
                                variant="underlined"
                                classNames={{
                                    tabList: "gap-6 w-full relative rounded-none p-0 border-b border-divider",
                                    cursor: "w-full bg-blue-600",
                                    tab: "max-w-fit px-0 h-12",
                                    tabContent: "group-data-[selected=true]:text-blue-600"
                                }}
                            >
                                {menuItems.map((item) => (
                                    <Tab
                                        key={item.key}
                                        title={
                                            <div className="flex items-center gap-2">
                                                {item.icon}
                                                <span>{item.label}</span>
                                            </div>
                                        }
                                    />
                                ))}
                            </Tabs>
                        </CardBody>
                    </Card>
                </div>

                {/* 页面内容 */}
                <div className="w-full">
                    <Card className="bg-white shadow-sm min-h-[600px]">
                        <CardBody className="p-6">
                            <Outlet />
                        </CardBody>
                    </Card>
                </div>
            </div>
        </div>
    );
};

export default AdminLayout; 