import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardBody, CardHeader, Input, Textarea, Button, Chip, Divider } from '@heroui/react';
import { Settings, Link as LinkIcon, Bell, Lock, LogOut, Save, Globe, ExternalLink } from 'lucide-react';
import distributorApiService, { DistributorInfo } from '../../services/distributorApi';
import { showToast } from '../../components/Toast';
import dayjs from 'dayjs';

const DistributorDashboardPage: React.FC = () => {
    const navigate = useNavigate();
    const [distributor, setDistributor] = useState<DistributorInfo | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // 配置表单
    const [notice, setNotice] = useState('');
    const [purchaseUrl, setPurchaseUrl] = useState('');
    const [customerServiceUrl, setCustomerServiceUrl] = useState('');

    // 修改密码表单
    const [oldPassword, setOldPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [changingPassword, setChangingPassword] = useState(false);

    useEffect(() => {
        // 检查登录状态
        if (!distributorApiService.isLoggedIn()) {
            navigate('/distributor-login');
            return;
        }

        fetchSettings();
    }, [navigate]);

    const fetchSettings = async () => {
        setLoading(true);
        try {
            const response = await distributorApiService.getSettings();
            if (response.code === 20000 && response.data) {
                setDistributor(response.data);
                setNotice(response.data.notice || '');
                setPurchaseUrl(response.data.purchase_url || '');
                setCustomerServiceUrl(response.data.customer_service_url || '');
                // 更新本地存储
                localStorage.setItem('distributor', JSON.stringify(response.data));
            } else {
                showToast(response.msg || '获取配置失败', 'error');
            }
        } catch (error: any) {
            console.error('获取配置失败:', error);
            showToast('获取配置失败', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleSaveSettings = async () => {
        setSaving(true);
        try {
            const response = await distributorApiService.updateSettings({
                notice: notice.trim(),
                purchase_url: purchaseUrl.trim(),
                customer_service_url: customerServiceUrl.trim(),
            });

            if (response.code === 20000) {
                showToast('保存成功', 'success');
                fetchSettings(); // 重新加载
            } else {
                showToast(response.msg || '保存失败', 'error');
            }
        } catch (error: any) {
            console.error('保存失败:', error);
            showToast(error.response?.data?.msg || '保存失败', 'error');
        } finally {
            setSaving(false);
        }
    };

    const handleChangePassword = async () => {
        if (!oldPassword || !newPassword || !confirmPassword) {
            showToast('请填写完整的密码信息', 'warning');
            return;
        }

        if (newPassword.length < 8) {
            showToast('新密码至少8位', 'warning');
            return;
        }

        if (newPassword !== confirmPassword) {
            showToast('两次输入的新密码不一致', 'warning');
            return;
        }

        setChangingPassword(true);
        try {
            const response = await distributorApiService.changePassword({
                old_password: oldPassword,
                new_password: newPassword,
            });

            if (response.code === 20000) {
                showToast('密码修改成功，请重新登录', 'success');
                setTimeout(() => {
                    distributorApiService.logout();
                }, 1500);
            } else {
                showToast(response.msg || '密码修改失败', 'error');
            }
        } catch (error: any) {
            console.error('密码修改失败:', error);
            showToast(error.response?.data?.msg || '密码修改失败', 'error');
        } finally {
            setChangingPassword(false);
        }
    };

    const handleLogout = () => {
        if (window.confirm('确定要退出登录吗？')) {
            distributorApiService.logout();
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-default-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                    <p className="text-default-600">加载中...</p>
                </div>
            </div>
        );
    }

    const domains = distributor?.domains ? distributor.domains.split(',').map(d => d.trim()) : [];

    return (
        <div className="min-h-screen bg-default-50">
            {/* 顶部导航栏 */}
            <div className="bg-white border-b border-default-200 shadow-sm">
                <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-500 rounded-lg">
                                <Settings className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <h1 className="text-xl font-bold text-default-800">分销商控制面板</h1>
                                <p className="text-sm text-default-500">
                                    欢迎，{distributor?.username}
                                </p>
                            </div>
                        </div>
                        <Button
                            color="danger"
                            variant="flat"
                            startContent={<LogOut className="w-4 h-4" />}
                            onPress={handleLogout}
                        >
                            退出登录
                        </Button>
                    </div>
                </div>
            </div>

            {/* 主内容区 */}
            <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* 左侧：基本信息 */}
                    <div className="lg:col-span-1">
                        <Card>
                            <CardHeader className="flex gap-3">
                                <Globe className="w-5 h-5 text-primary" />
                                <div className="flex flex-col">
                                    <p className="text-md font-semibold">基本信息</p>
                                </div>
                            </CardHeader>
                            <Divider />
                            <CardBody className="space-y-4">
                                <div>
                                    <p className="text-sm text-default-500 mb-1">账号</p>
                                    <p className="font-medium">{distributor?.username}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-default-500 mb-1">状态</p>
                                    <Chip
                                        color={distributor?.status === 1 ? 'success' : 'danger'}
                                        size="sm"
                                        variant="flat"
                                    >
                                        {distributor?.status === 1 ? '已启用' : '已禁用'}
                                    </Chip>
                                </div>
                                <div>
                                    <p className="text-sm text-default-500 mb-2">绑定域名</p>
                                    <div className="space-y-2">
                                        {domains.map((domain, index) => (
                                            <div key={index} className="flex items-center gap-2">
                                                <Chip size="sm" variant="flat" color="primary">
                                                    {domain}
                                                </Chip>
                                                <a
                                                    href={`http://${domain}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-primary hover:underline"
                                                >
                                                    <ExternalLink className="w-4 h-4" />
                                                </a>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <p className="text-sm text-default-500 mb-1">创建时间</p>
                                    <p className="text-sm">
                                        {dayjs(distributor?.created_at).format('YYYY-MM-DD HH:mm')}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-sm text-default-500 mb-1">更新时间</p>
                                    <p className="text-sm">
                                        {dayjs(distributor?.updated_at).format('YYYY-MM-DD HH:mm')}
                                    </p>
                                </div>
                                {distributor?.remarks && (
                                    <div>
                                        <p className="text-sm text-default-500 mb-1">备注</p>
                                        <p className="text-sm">{distributor.remarks}</p>
                                    </div>
                                )}
                            </CardBody>
                        </Card>
                    </div>

                    {/* 右侧：配置和修改密码 */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* 白牌配置 */}
                        <Card>
                            <CardHeader className="flex gap-3">
                                <Bell className="w-5 h-5 text-primary" />
                                <div className="flex flex-col">
                                    <p className="text-md font-semibold">白牌站点配置</p>
                                    <p className="text-sm text-default-500">配置后在您的域名生效</p>
                                </div>
                            </CardHeader>
                            <Divider />
                            <CardBody className="space-y-4">
                                <Textarea
                                    label="公告文字"
                                    placeholder="输入要在白牌站点显示的公告..."
                                    value={notice}
                                    onChange={(e) => setNotice(e.target.value)}
                                    minRows={3}
                                    maxRows={6}
                                    variant="bordered"
                                    description="留空则不显示公告"
                                />

                                <Input
                                    label="购买按钮链接"
                                    placeholder="https://your-domain.com/buy-cdk"
                                    value={purchaseUrl}
                                    onChange={(e) => setPurchaseUrl(e.target.value)}
                                    startContent={<LinkIcon className="w-4 h-4 text-default-400" />}
                                    variant="bordered"
                                    description='订阅页面"购买激活码"按钮跳转链接'
                                />

                                <Input
                                    label="客服icon链接"
                                    placeholder="https://your-domain.com/support"
                                    value={customerServiceUrl}
                                    onChange={(e) => setCustomerServiceUrl(e.target.value)}
                                    startContent={<LinkIcon className="w-4 h-4 text-default-400" />}
                                    variant="bordered"
                                    description="右下角客服icon跳转链接"
                                />

                                <Button
                                    color="primary"
                                    size="lg"
                                    className="w-full"
                                    onPress={handleSaveSettings}
                                    isLoading={saving}
                                    startContent={!saving && <Save className="w-5 h-5" />}
                                >
                                    {saving ? '保存中...' : '保存配置'}
                                </Button>
                            </CardBody>
                        </Card>

                        {/* 修改密码 */}
                        <Card>
                            <CardHeader className="flex gap-3">
                                <Lock className="w-5 h-5 text-warning" />
                                <div className="flex flex-col">
                                    <p className="text-md font-semibold">修改密码</p>
                                    <p className="text-sm text-default-500">定期修改密码保障账号安全</p>
                                </div>
                            </CardHeader>
                            <Divider />
                            <CardBody className="space-y-4">
                                <Input
                                    label="当前密码"
                                    type="password"
                                    placeholder="请输入当前密码"
                                    value={oldPassword}
                                    onChange={(e) => setOldPassword(e.target.value)}
                                    variant="bordered"
                                />

                                <Input
                                    label="新密码"
                                    type="password"
                                    placeholder="至少8位"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    variant="bordered"
                                />

                                <Input
                                    label="确认新密码"
                                    type="password"
                                    placeholder="再次输入新密码"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    variant="bordered"
                                />

                                <Button
                                    color="warning"
                                    size="lg"
                                    className="w-full"
                                    onPress={handleChangePassword}
                                    isLoading={changingPassword}
                                    startContent={!changingPassword && <Lock className="w-5 h-5" />}
                                >
                                    {changingPassword ? '修改中...' : '修改密码'}
                                </Button>
                            </CardBody>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DistributorDashboardPage;
