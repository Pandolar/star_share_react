import React, { useEffect, useState } from 'react';
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
    Ticket,
    Copy,
    Store,
    ReceiptText,
    KeyRound,
    LogOut,
    Home,
    Users,
} from 'lucide-react';
import distributorApiService from '../../services/distributorApi';
import type { DistributorInfo } from '../../services/distributorApi';

/**
 * 分销商后台布局：顶部导航 + 左侧功能导航 + 右侧内容，对齐管理后台结构。
 */
const DistributorLayout: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [distributor, setDistributor] = useState<DistributorInfo | null>(() => {
        try {
            const cached = localStorage.getItem('distributor');
            const value: unknown = cached ? JSON.parse(cached) : null;
            return value && typeof value === 'object' && 'username' in value ? value as DistributorInfo : null;
        } catch {
            return null;
        }
    });

    useEffect(() => {
        let active = true;
        void distributorApiService.getSettings().then((response) => {
            if (active && response.code === 20000 && response.data) {
                setDistributor(response.data);
                localStorage.setItem('distributor', JSON.stringify(response.data));
            }
        }).catch(() => undefined);
        return () => { active = false; };
    }, [location.pathname]);

    const currentTab = location.pathname.split('/').pop() || 'purchase';

    const isSubAccount = Boolean(distributor?.parent_distributor_id);
    const canUseCdk = distributor?.can_generate_cdk !== false && !isSubAccount;
    const menuItems = [
        ...(canUseCdk ? [
            { key: 'purchase', label: '卡密采购', icon: <Ticket className="w-5 h-5" /> },
            { key: 'cdks', label: '我的卡密', icon: <Copy className="w-5 h-5" /> },
        ] : []),
        { key: 'sites', label: '站点经营', icon: <Store className="w-5 h-5" /> },
        ...(!isSubAccount ? [{ key: 'sub-accounts', label: '二级代理', icon: <Users className="w-5 h-5" /> }] : []),
        { key: 'commissions', label: '佣金对账', icon: <ReceiptText className="w-5 h-5" /> },
        { key: 'security', label: '账号安全', icon: <KeyRound className="w-5 h-5" /> },
    ];

    return (
        <div className="min-h-screen bg-default-50">
            <Navbar isBordered isMenuOpen={isMenuOpen} onMenuOpenChange={setIsMenuOpen} maxWidth="full">
                <NavbarContent className="sm:hidden" justify="start">
                    <NavbarMenuToggle aria-label={isMenuOpen ? '关闭菜单' : '打开菜单'} className="sm:hidden" />
                </NavbarContent>
                <NavbarContent className="hidden sm:flex gap-4" justify="start">
                    <NavbarBrand>
                        <div className="flex items-center gap-2">
                            <Store className="w-6 h-6 text-primary" />
                            <span className="font-bold text-lg text-default-800">分销商控制台</span>
                        </div>
                    </NavbarBrand>
                </NavbarContent>
                <NavbarContent justify="end">
                    <NavbarItem>
                        <Button variant="light" color="primary" startContent={<Home className="w-4 h-4" />} onPress={() => window.open('/', '_blank')}>
                            前台首页
                        </Button>
                    </NavbarItem>
                    <NavbarItem>
                        <Dropdown>
                            <DropdownTrigger>
                                <User
                                    name={distributor?.username || '分销商'}
                                    description={`等级 L${distributor?.level ?? 1}`}
                                    avatarProps={{ src: '', fallback: (distributor?.username || 'D').slice(0, 2), color: 'primary' }}
                                    className="cursor-pointer"
                                />
                            </DropdownTrigger>
                            <DropdownMenu aria-label="用户菜单">
                                <DropdownItem key="security" startContent={<KeyRound className="w-4 h-4" />} onPress={() => navigate('/distributor/security')}>
                                    账号安全
                                </DropdownItem>
                                <DropdownItem key="logout" color="danger" startContent={<LogOut className="w-4 h-4" />} onPress={() => void distributorApiService.logout()}>
                                    退出登录
                                </DropdownItem>
                            </DropdownMenu>
                        </Dropdown>
                    </NavbarItem>
                </NavbarContent>
                <NavbarMenu className="pt-6">
                    {menuItems.map((item) => (
                        <NavbarMenuItem key={item.key}>
                            <Button
                                variant={currentTab === item.key ? 'flat' : 'light'}
                                color={currentTab === item.key ? 'primary' : 'default'}
                                startContent={item.icon}
                                size="lg"
                                onPress={() => { navigate(`/distributor/${item.key}`); setIsMenuOpen(false); }}
                                className="w-full justify-start text-base"
                            >
                                {item.label}
                            </Button>
                        </NavbarMenuItem>
                    ))}
                </NavbarMenu>
            </Navbar>

            <div className="mx-auto w-full max-w-[1600px] px-4 py-6">
                <div className="flex gap-6">
                    <Card shadow="sm" className="hidden sm:flex w-72 shrink-0 h-fit">
                        <CardBody className="p-3">
                            <Listbox
                                aria-label="分销商后台导航"
                                selectionMode="single"
                                selectedKeys={[currentTab]}
                                onSelectionChange={(keys) => {
                                    if (keys !== 'all') navigate(`/distributor/${String(Array.from(keys)[0] || 'purchase')}`);
                                }}
                                variant="flat"
                                color="primary"
                            >
                                {menuItems.map((item) => (
                                    <ListboxItem key={item.key} startContent={item.icon} textValue={item.label} className="min-h-12 px-4">
                                        <span className="text-base font-medium">{item.label}</span>
                                    </ListboxItem>
                                ))}
                            </Listbox>
                        </CardBody>
                    </Card>
                    <div className="flex-1 min-w-0">
                        <Outlet />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DistributorLayout;
