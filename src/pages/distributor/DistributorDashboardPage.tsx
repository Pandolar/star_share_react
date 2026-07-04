import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardBody, CardHeader, Input, Textarea, Button, Chip, Divider, Select, SelectItem } from '@heroui/react';
import { Settings, Link as LinkIcon, Bell, Lock, LogOut, Save, Globe, ExternalLink, Ticket } from 'lucide-react';
import distributorApiService, { DistributorInfo, DistributorPackage } from '../../services/distributorApi';
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

    // 余额 / 生成卡密
    const [balance, setBalance] = useState<number>(0);
    const [balanceLogs, setBalanceLogs] = useState<any[]>([]);
    const [packages, setPackages] = useState<DistributorPackage[]>([]);
    const [genPackageId, setGenPackageId] = useState<string>('');
    const [genCount, setGenCount] = useState<string>('1');
    const [genExpireDays, setGenExpireDays] = useState<string>('');
    const [generating, setGenerating] = useState(false);

    const permissions = distributor?.permissions;
    const canGenerate = permissions?.can_generate_cdk ?? true;
    const canEditNotice = permissions?.can_edit_notice ?? true;
    const canEditLinks = permissions?.can_edit_links ?? true;

    const selectedPackage = packages.find((p) => String(p.package_id) === genPackageId);
    const estimatedCost = selectedPackage ? (selectedPackage.unit_price * (Number(genCount) || 0)) : 0;

    useEffect(() => {
        // 检查登录状态
        if (!distributorApiService.isLoggedIn()) {
            navigate('/distributor-login');
            return;
        }

        fetchSettings();
        fetchBalance();
        fetchPackages();
    }, [navigate]);

    const fetchBalance = async () => {
        try {
            const res = await distributorApiService.getMyBalance({ current_page: 1, page_size: 20 });
            if (res.code === 20000 && res.data) {
                setBalance(res.data.balance);
                setBalanceLogs(res.data.logs || []);
            }
        } catch (e) { /* 忽略 */ }
    };

    const fetchPackages = async () => {
        try {
            const res = await distributorApiService.getPackages();
            if (res.code === 20000 && res.data) {
                setPackages(res.data);
                if (res.data.length > 0) setGenPackageId(String(res.data[0].package_id));
            }
        } catch (e) { /* 忽略 */ }
    };

    const handleGenerateCdk = async () => {
        if (!genPackageId) {
            showToast('请选择套餐', 'warning');
            return;
        }
        const count = Number(genCount);
        if (!count || count < 1) {
            showToast('请输入生成数量', 'warning');
            return;
        }
        if (estimatedCost > balance) {
            showToast('余额不足，无法生成', 'error');
            return;
        }
        setGenerating(true);
        try {
            const res = await distributorApiService.generateCdk({
                package_id: Number(genPackageId),
                number: count,
                expires_days: genExpireDays === '' ? null : Number(genExpireDays),
            });
            if (res.code === 20000 && res.data) {
                showToast(`成功生成 ${res.data.count} 个CDK，扣款 ¥${res.data.total_cost}`, 'success');
                setBalance(res.data.balance_after);
                fetchBalance();
            } else {
                showToast(res.msg || '生成失败', 'error');
            }
        } catch (e: any) {
            showToast(e.response?.data?.msg || e.message || '生成失败', 'error');
        } finally {
            setGenerating(false);
        }
    };

    const fetchSettings = async () => {
        setLoading(true);
        try {
            const response = await distributorApiService.getSettings();
            if (response.code === 20000 && response.data) {
                setDistributor(response.data);
                setNotice(response.data.notice || '');
                setPurchaseUrl(response.data.purchase_url || '');
                setCustomerServiceUrl(response.data.customer_service_url || '');
                if (typeof response.data.balance === 'number') setBalance(response.data.balance);
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
            // 仅提交有权限的字段，避免后端权限校验拦截整次保存
            const payload: any = {};
            if (canEditNotice) payload.notice = notice.trim();
            if (canEditLinks) {
                payload.purchase_url = purchaseUrl.trim();
                payload.customer_service_url = customerServiceUrl.trim();
            }
            if (Object.keys(payload).length === 0) {
                showToast('当前账号无可修改的配置项', 'warning');
                setSaving(false);
                return;
            }
            const response = await distributorApiService.updateSettings(payload);

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
                                <div className="p-3 bg-success-50 rounded-lg">
                                    <p className="text-sm text-default-500 mb-1">账户余额</p>
                                    <p className="text-2xl font-bold text-success">¥{Number(balance).toFixed(2)}</p>
                                    {typeof distributor?.level === 'number' && (
                                        <Chip size="sm" variant="flat" color="secondary" className="mt-1">等级 L{distributor.level}</Chip>
                                    )}
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
                        {/* 生成卡密（用余额） */}
                        {canGenerate && (
                            <Card>
                                <CardHeader className="flex gap-3">
                                    <Ticket className="w-5 h-5 text-success" />
                                    <div className="flex flex-col">
                                        <p className="text-md font-semibold">生成卡密</p>
                                        <p className="text-sm text-default-500">用账户余额生成已上架套餐的卡密</p>
                                    </div>
                                </CardHeader>
                                <Divider />
                                <CardBody className="space-y-4">
                                    {packages.length === 0 ? (
                                        <p className="text-sm text-default-400">暂无可生成的套餐</p>
                                    ) : (
                                        <>
                                            <Select
                                                label="选择套餐"
                                                selectedKeys={genPackageId ? [genPackageId] : []}
                                                onChange={(e) => setGenPackageId(e.target.value)}
                                                variant="bordered"
                                            >
                                                {packages.map((p) => (
                                                    <SelectItem key={String(p.package_id)} textValue={p.package_name}>
                                                        {p.package_name}（{(p.discount_rate * 10).toFixed(1)}折 · ¥{p.unit_price.toFixed(2)}/张）
                                                    </SelectItem>
                                                ))}
                                            </Select>
                                            <div className="grid grid-cols-2 gap-4">
                                                <Input
                                                    type="number"
                                                    label="生成数量"
                                                    value={genCount}
                                                    onChange={(e) => setGenCount(e.target.value)}
                                                    min={1}
                                                    variant="bordered"
                                                />
                                                <Input
                                                    type="number"
                                                    label="过期天数"
                                                    placeholder={String(distributor?.default_cdk_expire_days ?? 90)}
                                                    value={genExpireDays}
                                                    onChange={(e) => setGenExpireDays(e.target.value)}
                                                    min={0}
                                                    variant="bordered"
                                                    description={`留空用默认 ${distributor?.default_cdk_expire_days ?? 90} 天，0=永不过期`}
                                                />
                                            </div>
                                            {selectedPackage && (
                                                <div className="flex items-center justify-between p-3 bg-default-100 rounded-lg text-sm">
                                                    <span>
                                                        单价 <span className="font-medium">¥{selectedPackage.unit_price.toFixed(2)}</span>
                                                        <span className="text-default-400"> × {Number(genCount) || 0}</span>
                                                    </span>
                                                    <span>
                                                        预计扣款：<span className={`font-bold ${estimatedCost > balance ? 'text-danger' : 'text-success'}`}>¥{estimatedCost.toFixed(2)}</span>
                                                    </span>
                                                </div>
                                            )}
                                            <Button
                                                color="success"
                                                size="lg"
                                                className="w-full"
                                                onPress={handleGenerateCdk}
                                                isLoading={generating}
                                                isDisabled={estimatedCost > balance}
                                                startContent={!generating && <Ticket className="w-5 h-5" />}
                                            >
                                                {estimatedCost > balance ? '余额不足' : (generating ? '生成中...' : '确认生成并扣款')}
                                            </Button>
                                            <p className="text-xs text-default-400">
                                                生成的卡密可在管理员/CDK列表中查看，归属本分销商。
                                            </p>
                                        </>
                                    )}
                                    {balanceLogs.length > 0 && (
                                        <div className="pt-2">
                                            <p className="text-sm text-default-500 mb-2">最近余额流水</p>
                                            <div className="max-h-48 overflow-auto space-y-1">
                                                {balanceLogs.map((log) => (
                                                    <div key={log.id} className="flex justify-between text-xs border-b pb-1">
                                                        <span>
                                                            <span className={log.change_amount >= 0 ? 'text-success' : 'text-danger'}>
                                                                {log.change_amount >= 0 ? '+' : ''}{Number(log.change_amount).toFixed(2)}
                                                            </span>
                                                            {log.remarks && <span className="text-default-400 ml-2">{log.remarks}</span>}
                                                        </span>
                                                        <span className="text-default-400">{dayjs(log.created_at).format('MM-DD HH:mm')}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </CardBody>
                            </Card>
                        )}

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
                                    isDisabled={!canEditNotice}
                                    description={canEditNotice ? '留空则不显示公告' : '当前账号无自定义公告权限'}
                                />

                                <Input
                                    label="购买按钮链接"
                                    placeholder="https://your-domain.com/buy-cdk"
                                    value={purchaseUrl}
                                    onChange={(e) => setPurchaseUrl(e.target.value)}
                                    startContent={<LinkIcon className="w-4 h-4 text-default-400" />}
                                    variant="bordered"
                                    isDisabled={!canEditLinks}
                                    description={canEditLinks ? '订阅页面"购买激活码"按钮跳转链接' : '当前账号无修改链接权限'}
                                />

                                <Input
                                    label="客服icon链接"
                                    placeholder="https://your-domain.com/support"
                                    value={customerServiceUrl}
                                    onChange={(e) => setCustomerServiceUrl(e.target.value)}
                                    startContent={<LinkIcon className="w-4 h-4 text-default-400" />}
                                    variant="bordered"
                                    isDisabled={!canEditLinks}
                                    description={canEditLinks ? '右下角客服icon跳转链接' : '当前账号无修改链接权限'}
                                />

                                <Button
                                    color="primary"
                                    size="lg"
                                    className="w-full"
                                    onPress={handleSaveSettings}
                                    isLoading={saving}
                                    isDisabled={!canEditNotice && !canEditLinks}
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
