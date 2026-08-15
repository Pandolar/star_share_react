import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Accordion,
    AccordionItem,
    Alert,
    Avatar,
    Button,
    Card,
    CardBody,
    CardFooter,
    CardHeader,
    Chip,
    Divider,
    Dropdown,
    DropdownItem,
    DropdownMenu,
    DropdownTrigger,
    Form,
    Input,
    Listbox,
    ListboxItem,
    Modal,
    ModalBody,
    ModalContent,
    ModalFooter,
    ModalHeader,
    Navbar,
    NavbarBrand,
    NavbarContent,
    NavbarItem,
    NumberInput,
    Pagination,
    Progress,
    Select,
    SelectItem,
    Snippet,
    Spinner,
    Tab,
    Table,
    TableBody,
    TableCell,
    TableColumn,
    TableHeader,
    TableRow,
    Tabs,
    Textarea,
    useDisclosure,
    User,
} from '@heroui/react';
import {
    Bell,
    ChevronDown,
    CircleHelp,
    Copy,
    ExternalLink,
    Globe,
    KeyRound,
    Lock,
    LogOut,
    RefreshCw,
    Save,
    Search,
    Settings,
    ShieldCheck,
    Ticket,
    Wallet,
} from 'lucide-react';
import dayjs from 'dayjs';
import distributorApiService, {
    BalanceLog,
    DistributorCdk,
    DistributorCdkStats,
    DistributorInfo,
    DistributorPackage,
} from '../../services/distributorApi';
import { showToast } from '../../components/Toast';

type CdkStatusFilter = 'all' | 'unused' | 'used' | 'disabled';

const CDK_PAGE_SIZE = 10;
const EMPTY_STATS: DistributorCdkStats = { total: 0, used: 0, unused: 0, expired: 0 };

const isExpired = (cdk: DistributorCdk) => (
    cdk.status === 'unused'
    && Boolean(cdk.expires_at)
    && dayjs(cdk.expires_at).isBefore(dayjs())
);

const normalizeDomains = (domains: DistributorInfo['domains'] | undefined): string[] => {
    if (Array.isArray(domains)) return domains.map(String).filter(Boolean);
    if (!domains) return [];
    try {
        const parsed = JSON.parse(domains);
        if (Array.isArray(parsed)) return parsed.map(String).filter(Boolean);
    } catch {
        // Historical cache values may be comma separated.
    }
    return domains.split(',').map((item) => item.trim()).filter(Boolean);
};


const formatDateTime = (value?: string | null) => (
    value && dayjs(value).isValid() ? dayjs(value).format('YYYY-MM-DD HH:mm') : '-'
);

const DistributorDashboardPage: React.FC = () => {
    const navigate = useNavigate();
    const [distributor, setDistributor] = useState<DistributorInfo | null>(null);
    const [loading, setLoading] = useState(true);
    const [pageError, setPageError] = useState('');
    const [activeTab, setActiveTab] = useState('cdk');

    const [notice, setNotice] = useState('');
    const [savingSettings, setSavingSettings] = useState(false);

    const [oldPassword, setOldPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [changingPassword, setChangingPassword] = useState(false);

    const [balance, setBalance] = useState(0);
    const [balanceLogs, setBalanceLogs] = useState<BalanceLog[]>([]);
    const [packages, setPackages] = useState<DistributorPackage[]>([]);
    const [stats, setStats] = useState<DistributorCdkStats>(EMPTY_STATS);
    const [genPackageId, setGenPackageId] = useState('');
    const [genCount, setGenCount] = useState(1);
    const [genExpireDays, setGenExpireDays] = useState<number | undefined>(undefined);
    const [genRemarks, setGenRemarks] = useState('');
    const [generating, setGenerating] = useState(false);
    const [lastBatchId, setLastBatchId] = useState('');

    const [cdks, setCdks] = useState<DistributorCdk[]>([]);
    const [cdkLoading, setCdkLoading] = useState(false);
    const [cdkSearchInput, setCdkSearchInput] = useState('');
    const [cdkSearch, setCdkSearch] = useState('');
    const [cdkStatus, setCdkStatus] = useState<CdkStatusFilter>('all');
    const [cdkPage, setCdkPage] = useState(1);
    const [cdkTotal, setCdkTotal] = useState(0);

    const generateModal = useDisclosure();
    const logoutModal = useDisclosure();

    const permissions = distributor?.permissions;
    const canGenerate = permissions?.can_generate_cdk === true;
    const canEditNotice = permissions?.can_edit_notice === true;
    const discountActive = distributor?.discount_active !== false;
    const domains = useMemo(() => normalizeDomains(distributor?.domains), [distributor?.domains]);
    const selectedPackage = packages.find((item) => String(item.package_id) === genPackageId);
    const estimatedCost = Number(((selectedPackage?.unit_price || 0) * (genCount || 0)).toFixed(2));
    const deliverableUnused = Math.max(stats.unused - stats.expired, 0);
    const disabledCdks = Math.max(stats.total - stats.used - stats.unused, 0);
    const cdkTotalPages = Math.max(1, Math.ceil(cdkTotal / CDK_PAGE_SIZE));
    const balanceCoverage = estimatedCost > 0
        ? Math.min(100, Math.round((balance / estimatedCost) * 100))
        : 100;

    const fetchSettings = useCallback(async () => {
        const response = await distributorApiService.getSettings();
        if (response.code !== 20000 || !response.data) {
            throw new Error(response.msg || '获取账号配置失败');
        }
        const info = response.data;
        setDistributor(info);
        setNotice(info.notice || '');
        setBalance(Number(info.balance || 0));
        localStorage.setItem('distributor', JSON.stringify(info));
        return info;
    }, []);

    const fetchBalance = useCallback(async () => {
        const response = await distributorApiService.getMyBalance({ current_page: 1, page_size: 20 });
        if (response.code === 20000 && response.data) {
            setBalance(Number(response.data.balance || 0));
            setBalanceLogs(response.data.logs || []);
        }
    }, []);

    const fetchPackages = useCallback(async () => {
        const response = await distributorApiService.getPackages();
        if (response.code === 20000 && Array.isArray(response.data)) {
            setPackages(response.data);
            setGenPackageId((current) => current || String(response.data?.[0]?.package_id || ''));
        }
    }, []);

    const fetchStats = useCallback(async () => {
        const response = await distributorApiService.getCdkStats();
        if (response.code === 20000 && response.data) setStats(response.data);
    }, []);

    const loadCdks = useCallback(async (page: number, search: string, status: CdkStatusFilter) => {
        setCdkLoading(true);
        try {
            const response = await distributorApiService.getCdks({
                current_page: page,
                page_size: CDK_PAGE_SIZE,
                querystring: search || undefined,
                status: status === 'all' ? undefined : status,
                order_column: 'id',
                order: 'desc',
            });
            if (response.code === 20000) {
                const totalNum = Number(response.total) || 0;
                const nextTotalPages = Math.max(1, Math.ceil(totalNum / CDK_PAGE_SIZE));
                setCdks(Array.isArray(response.data) ? response.data : []);
                setCdkTotal(totalNum);
                if (page > nextTotalPages) setCdkPage(nextTotalPages);
            } else {
                setCdks([]);
                setCdkTotal(0);
                showToast(response.msg || '获取卡密失败', 'error');
            }
        } catch (error: any) {
            setCdks([]);
            setCdkTotal(0);
            showToast(error.response?.data?.msg || '获取卡密失败', 'error');
        } finally {
            setCdkLoading(false);
        }
    }, []);

    const fetchCdks = useCallback(
        () => loadCdks(cdkPage, cdkSearch, cdkStatus),
        [cdkPage, cdkSearch, cdkStatus, loadCdks],
    );

    const loadDashboard = useCallback(async () => {
        setLoading(true);
        setPageError('');
        try {
            const info = await fetchSettings();
            await Promise.allSettled([
                fetchStats(),
                ...(info.permissions?.can_generate_cdk === true ? [fetchBalance(), fetchPackages()] : []),
            ]);
        } catch (error: any) {
            setPageError(error.message || '控制台加载失败，请稍后重试');
        } finally {
            setLoading(false);
        }
    }, [fetchBalance, fetchPackages, fetchSettings, fetchStats]);
    useEffect(() => {
        if (!distributorApiService.isLoggedIn()) {
            navigate('/distributor/login', { replace: true });
            return;
        }
        loadDashboard();
    }, [loadDashboard, navigate]);

    useEffect(() => {
        if (!loading && distributor) fetchCdks();
    }, [distributor, fetchCdks, loading]);

    const openGenerateConfirmation = () => {
        if (!selectedPackage) {
            showToast('请选择套餐', 'warning');
            return;
        }
        if (!Number.isInteger(genCount) || genCount < 1 || genCount > 10000) {
            showToast('单次生成数量需为 1-10000 的整数', 'warning');
            return;
        }
        if (genExpireDays !== undefined && (!Number.isInteger(genExpireDays) || genExpireDays < 0)) {
            showToast('过期天数必须是大于等于 0 的整数', 'warning');
            return;
        }
        if (estimatedCost > balance) {
            showToast('余额不足，请联系管理员充值', 'error');
            return;
        }
        generateModal.onOpen();
    };

    const handleGenerateCdk = async () => {
        if (!selectedPackage) return;
        setGenerating(true);
        try {
            const response = await distributorApiService.generateCdk({
                package_id: selectedPackage.package_id,
                number: genCount,
                expires_days: genExpireDays ?? null,
                remarks: genRemarks.trim() || undefined,
            });
            if (response.code === 20000 && response.data) {
                setLastBatchId(response.data.batch_id);
                setBalance(response.data.balance_after);
                setCdkPage(1);
                setCdkSearch('');
                setCdkSearchInput('');
                setCdkStatus('all');
                setGenRemarks('');
                generateModal.onClose();
                showToast(`已生成 ${response.data.count} 个卡密，扣款 ¥${response.data.total_cost.toFixed(2)}`, 'success');
                await Promise.allSettled([
                    fetchBalance(),
                    fetchStats(),
                    loadCdks(1, '', 'all'),
                ]);
            } else {
                showToast(response.msg || '生成失败', 'error');
            }
        } catch (error: any) {
            showToast(error.response?.data?.msg || error.message || '生成失败', 'error');
        } finally {
            setGenerating(false);
        }
    };

    const handleSaveSettings = async (event: React.FormEvent) => {
        event.preventDefault();
        const payload: { notice?: string } = {};
        if (canEditNotice) payload.notice = notice.trim();

        setSavingSettings(true);
        try {
            const response = await distributorApiService.updateSettings(payload);
            if (response.code === 20000) {
                showToast('站点配置已保存', 'success');
                await fetchSettings();
            } else {
                showToast(response.msg || '保存失败', 'error');
            }
        } catch (error: any) {
            showToast(error.response?.data?.msg || '保存失败', 'error');
        } finally {
            setSavingSettings(false);
        }
    };

    const handleChangePassword = async (event: React.FormEvent) => {
        event.preventDefault();
        if (!oldPassword || !newPassword || !confirmPassword) {
            showToast('请填写完整的密码信息', 'warning');
            return;
        }
        if (newPassword.length < 8) {
            showToast('新密码至少 8 位', 'warning');
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
                distributorApiService.clearLocalSession('密码已修改，请使用新密码重新登录');
            } else {
                showToast(response.msg || '密码修改失败', 'error');
            }
        } catch (error: any) {
            showToast(error.response?.data?.msg || '密码修改失败', 'error');
        } finally {
            setChangingPassword(false);
        }
    };

    const copyText = async (value: string, successMessage = '已复制') => {
        try {
            await navigator.clipboard.writeText(value);
            showToast(successMessage, 'success');
        } catch {
            showToast('复制失败，请手动复制', 'error');
        }
    };

    const copyVisibleCdks = () => {
        const values = cdks.filter((item) => item.status === 'unused' && !isExpired(item)).map((item) => item.cdk);
        if (values.length === 0) {
            showToast('当前页没有可交付的未使用卡密', 'warning');
            return;
        }
        copyText(values.join('\n'), `已复制当前页 ${values.length} 个可用卡密`);
    };

    const applyCdkFilters = () => {
        const nextSearch = cdkSearchInput.trim();
        if (cdkPage === 1 && cdkSearch === nextSearch) {
            loadCdks(1, nextSearch, cdkStatus);
            return;
        }
        setCdkPage(1);
        setCdkSearch(nextSearch);
    };

    const resetCdkFilters = () => {
        setCdkSearchInput('');
        setCdkSearch('');
        setCdkStatus('all');
        setCdkPage(1);
    };

    const renderCdkStatus = (cdk: DistributorCdk) => {
        if (isExpired(cdk)) return <Chip color="warning" variant="flat" size="sm">已过期</Chip>;
        const config = {
            unused: { color: 'success' as const, label: '未使用' },
            used: { color: 'default' as const, label: '已使用' },
            disabled: { color: 'danger' as const, label: '已停用' },
        }[cdk.status];
        return <Chip color={config?.color || 'default'} variant="flat" size="sm">{config?.label || cdk.status}</Chip>;
    };

    if (loading) {
        return (
            <main className="flex min-h-screen items-center justify-center bg-default-50">
                <Spinner size="lg" label="正在加载分销商控制台..." />
            </main>
        );
    }

    if (pageError || !distributor) {
        return (
            <main className="flex min-h-screen items-center justify-center bg-default-50 p-4">
                <Alert
                    isVisible
                    color="danger"
                    title="控制台加载失败"
                    description={pageError || '未获取到分销商信息'}
                    endContent={<Button color="danger" variant="flat" onPress={loadDashboard}>重新加载</Button>}
                    className="max-w-xl"
                />
            </main>
        );
    }

    return (
        <div className="min-h-screen bg-default-50">
            <Navbar isBordered maxWidth="xl">
                <NavbarBrand className="gap-2">
                    <Avatar color="primary" icon={<Settings className="h-5 w-5" />} size="sm" />
                    <div>
                        <p className="font-semibold text-foreground">分销商控制台</p>
                        <p className="text-xs text-default-500">业务控制台</p>
                    </div>
                </NavbarBrand>
                <NavbarContent justify="end">
                    <NavbarItem className="hidden sm:flex">
                        <User
                            name={distributor.username}
                            description={`等级 L${distributor.level ?? 1}`}
                            avatarProps={{ fallback: distributor.username.slice(0, 1).toUpperCase() }}
                        />
                    </NavbarItem>
                    <NavbarItem>
                        <Dropdown placement="bottom-end">
                            <DropdownTrigger>
                                <Button variant="flat" endContent={<ChevronDown className="h-4 w-4" />}>
                                    账号
                                </Button>
                            </DropdownTrigger>
                            <DropdownMenu aria-label="账号操作">
                                <DropdownItem key="security" startContent={<KeyRound className="h-4 w-4" />} onPress={() => setActiveTab('security')}>
                                    修改密码
                                </DropdownItem>
                                <DropdownItem key="logout" color="danger" startContent={<LogOut className="h-4 w-4" />} onPress={logoutModal.onOpen}>
                                    退出登录
                                </DropdownItem>
                            </DropdownMenu>
                        </Dropdown>
                    </NavbarItem>
                </NavbarContent>
            </Navbar>

            <main className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
                <section className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-2xl font-semibold text-foreground">你好，{distributor.username}</h1>
                        <p className="mt-1 text-sm text-default-500">查看卡密业务与当前账号可用的管理功能。</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <Chip color={distributor.status === 1 ? 'success' : 'danger'} variant="flat">
                            账号{distributor.status === 1 ? '已启用' : '已停用'}
                        </Chip>
                        <Chip color="secondary" variant="flat">等级 L{distributor.level ?? 1}</Chip>
                        {canGenerate && <Chip color="success" variant="flat">余额 ¥{balance.toFixed(2)}</Chip>}
                        {canGenerate && <Chip color={discountActive ? 'success' : 'warning'} variant="flat">{discountActive ? `折扣至 ${distributor.expires_at ? formatDateTime(distributor.expires_at) : '永久'}` : '折扣已到期 · 按原价'}</Chip>}
                    </div>
                </section>

                <Accordion variant="splitted" defaultExpandedKeys={['quick-start']}>
                    <AccordionItem
                        key="quick-start"
                        aria-label="基础用法"
                        startContent={<CircleHelp className="h-5 w-5 text-primary" />}
                        title="基础用法"
                        subtitle="查看当前账号可用功能的操作说明"
                    >
                        <div className="grid gap-4 pb-3 md:grid-cols-2">
                            <Alert isVisible color="success" variant="flat" title="查看并交付卡密" description="到“我的卡密”复制未使用且未过期的卡密交付客户。每个卡密默认只能使用一次。" />
                            {canGenerate && (
                                <Alert isVisible color="secondary" variant="flat" title="生成卡密" description="余额和折扣由管理员维护；生成区显示最终折后单价，费用在生成成功时一次性扣除。" />
                            )}
                            {canEditNotice && (
                                <Alert
                                    isVisible
                                    color="warning"
                                    variant="flat"
                                    title="配置站点公告"
                                    description="可维护绑定域名展示的基础公告，保存后请用绑定域名实际访问确认。"
                                />
                            )}
                        </div>
                    </AccordionItem>
                </Accordion>

                {canEditNotice && domains.length === 0 && (
                    <Alert
                        isVisible
                        color="warning"
                        title="当前账号没有绑定域名"
                        description="系统暂时无法把访问域名映射到你的站点配置，请联系管理员绑定域名并完成 DNS/反向代理配置。"
                    />
                )}


                <Tabs
                    aria-label="分销商控制台功能"
                    selectedKey={activeTab}
                    onSelectionChange={(key) => setActiveTab(String(key))}
                    color="primary"
                    variant="underlined"
                    className="w-full"
                >
                    <Tab key="cdk" title={<span className="flex items-center gap-2"><Ticket className="h-4 w-4" />卡密业务</span>}>
                        <div className="space-y-6 pt-4">
                            <div className={`grid gap-4 sm:grid-cols-2 ${canGenerate ? 'lg:grid-cols-6' : 'lg:grid-cols-5'}`}>
                                {canGenerate && <Card shadow="sm"><CardBody><p className="text-sm text-default-500">账户余额</p><p className="mt-1 text-2xl font-semibold">¥{balance.toFixed(2)}</p></CardBody></Card>}
                                <Card shadow="sm"><CardBody><p className="text-sm text-default-500">卡密总数</p><p className="mt-1 text-2xl font-semibold">{stats.total}</p></CardBody></Card>
                                <Card shadow="sm"><CardBody><p className="text-sm text-default-500">可交付未使用</p><p className="mt-1 text-2xl font-semibold text-success">{deliverableUnused}</p></CardBody></Card>
                                <Card shadow="sm"><CardBody><p className="text-sm text-default-500">已使用</p><p className="mt-1 text-2xl font-semibold">{stats.used}</p></CardBody></Card>
                                <Card shadow="sm"><CardBody><p className="text-sm text-default-500">已过期未用</p><p className="mt-1 text-2xl font-semibold text-warning">{stats.expired}</p></CardBody></Card>
                                <Card shadow="sm"><CardBody><p className="text-sm text-default-500">已停用</p><p className="mt-1 text-2xl font-semibold text-danger">{disabledCdks}</p></CardBody></Card>
                            </div>

                            {canGenerate && (
                                <div className="grid gap-6 lg:grid-cols-3">
                                    <Card className="lg:col-span-2" shadow="sm">
                                        <CardHeader className="flex-col items-start gap-1">
                                            <div className="flex items-center gap-2 font-semibold"><Ticket className="h-5 w-5 text-success" />用余额生成卡密</div>
                                            <p className="text-sm text-default-500">{discountActive ? '列表单价已按“专属套餐 → 专属整体 → 等级套餐 → 等级整体 → 原价”的优先级计算。' : '分销商折扣已到期，当前可继续生成卡密，所有套餐均按原价结算。'}</p>
                                        </CardHeader>
                                        <Divider />
                                        <CardBody>
                                            {packages.length === 0 ? (
                                                <Alert isVisible color="default" title="暂无可生成套餐" description="当前没有已上架套餐，请联系管理员检查套餐状态。" />
                                            ) : (
                                                <Form className="grid gap-4 md:grid-cols-2" onSubmit={(event) => { event.preventDefault(); openGenerateConfirmation(); }}>
                                                    <Select
                                                        className="md:col-span-2"
                                                        label="套餐"
                                                        selectedKeys={genPackageId ? [genPackageId] : []}
                                                        onSelectionChange={(keys) => setGenPackageId(String(Array.from(keys)[0] || ''))}
                                                        isRequired
                                                    >
                                                        {packages.map((item) => (
                                                            <SelectItem key={String(item.package_id)} textValue={item.package_name}>
                                                                {item.package_name} · {(item.discount_rate * 10).toFixed(1)} 折 · ¥{item.unit_price.toFixed(2)}/个
                                                            </SelectItem>
                                                        ))}
                                                    </Select>
                                                    <NumberInput
                                                        label="生成数量"
                                                        value={genCount}
                                                        onValueChange={(value) => setGenCount(value)}
                                                        minValue={1}
                                                        maxValue={10000}
                                                        isRequired
                                                        description="单次最多 10000 个"
                                                    />
                                                    <NumberInput
                                                        label="有效期（天）"
                                                        value={genExpireDays}
                                                        onValueChange={(value) => setGenExpireDays(Number.isNaN(value) ? undefined : value)}
                                                        minValue={0}
                                                        placeholder={String(distributor.default_cdk_expire_days ?? 90)}
                                                        description={`留空用管理员默认 ${distributor.default_cdk_expire_days ?? 90} 天；0 表示永不过期`}
                                                    />
                                                    <Textarea
                                                        className="md:col-span-2"
                                                        label="批次备注（可选）"
                                                        value={genRemarks}
                                                        onValueChange={setGenRemarks}
                                                        placeholder="例如：客户名称、渠道或订单号"
                                                        minRows={2}
                                                    />
                                                    <Alert
                                                        className="md:col-span-2"
                                                        isVisible
                                                        color={estimatedCost > balance ? 'danger' : 'success'}
                                                        variant="flat"
                                                        title="本次费用预估"
                                                        description={(
                                                            <div className="mt-1 space-y-2">
                                                                <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                                                                    <span>折后单价：<strong>¥{(selectedPackage?.unit_price || 0).toFixed(2)}</strong></span>
                                                                    <span>预计扣款：<strong>¥{estimatedCost.toFixed(2)}</strong></span>
                                                                </div>
                                                                <Progress
                                                                    aria-label="余额覆盖比例"
                                                                    value={balanceCoverage}
                                                                    color={estimatedCost > balance ? 'danger' : 'success'}
                                                                    size="sm"
                                                                />
                                                                <p className="text-xs">当前余额 ¥{balance.toFixed(2)}，生成成功后才会扣款。</p>
                                                            </div>
                                                        )}
                                                    />
                                                    <Button className="md:col-span-2" type="submit" color="success" size="lg" startContent={<ShieldCheck className="h-5 w-5" />} isDisabled={!selectedPackage || estimatedCost > balance}>
                                                        核对并确认生成
                                                    </Button>
                                                </Form>
                                            )}
                                        </CardBody>
                                    </Card>

                                    <Card shadow="sm">
                                        <CardHeader className="flex items-center gap-2 font-semibold"><Wallet className="h-5 w-5 text-primary" />最近余额流水</CardHeader>
                                        <Divider />
                                        <CardBody className="gap-3">
                                            {balanceLogs.length === 0 ? (
                                                <p className="text-sm text-default-500">暂无余额流水。余额由管理员维护，生成卡密会自动记录扣款。</p>
                                            ) : (
                                                <Listbox aria-label="最近余额流水" selectionMode="none" variant="flat">
                                                    {balanceLogs.slice(0, 8).map((log, index) => (
                                                        <ListboxItem
                                                            key={log.id}
                                                            textValue={`${log.remarks || log.type} ${formatDateTime(log.created_at)}`}
                                                            description={`${log.remarks || log.type} · ${formatDateTime(log.created_at)}`}
                                                            isReadOnly
                                                            showDivider={index < Math.min(balanceLogs.length, 8) - 1}
                                                            startContent={(
                                                                <strong className={log.change_amount >= 0 ? 'text-success' : 'text-danger'}>
                                                                    {log.change_amount >= 0 ? '+' : ''}{Number(log.change_amount).toFixed(2)}
                                                                </strong>
                                                            )}
                                                            endContent={<span className="whitespace-nowrap text-xs text-default-500">余额 {Number(log.balance_after).toFixed(2)}</span>}
                                                        />
                                                    ))}
                                                </Listbox>
                                            )}
                                        </CardBody>
                                        <CardFooter>
                                            <Button size="sm" variant="flat" startContent={<RefreshCw className="h-4 w-4" />} onPress={fetchBalance}>刷新流水</Button>
                                        </CardFooter>
                                    </Card>
                                </div>
                            )}

                            {canGenerate && lastBatchId && (
                                <Alert
                                    isVisible
                                    color="success"
                                    title="最近一批卡密已生成"
                                    description={<span className="flex flex-wrap items-center gap-2">批次 ID：<Snippet hideSymbol size="sm" codeString={lastBatchId}>{lastBatchId}</Snippet> 卡密已显示在下方列表顶部。</span>}
                                />
                            )}

                            <Card shadow="sm">
                                <CardHeader className="flex flex-col items-stretch gap-4">
                                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                        <div>
                                            <p className="font-semibold">我的卡密</p>
                                            <p className="text-sm text-default-500">只显示当前分销商名下的卡密，共 {cdkTotal} 条。</p>
                                        </div>
                                        <Button variant="flat" color="primary" startContent={<Copy className="h-4 w-4" />} onPress={copyVisibleCdks}>
                                            复制当前页可用卡密
                                        </Button>
                                    </div>
                                    <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_180px_auto]">
                                        <Input
                                            value={cdkSearchInput}
                                            onValueChange={setCdkSearchInput}
                                            onKeyDown={(event) => event.key === 'Enter' && applyCdkFilters()}
                                            placeholder="搜索卡密、批次或备注"
                                            startContent={<Search className="h-4 w-4 text-default-400" />}
                                            isClearable
                                            onClear={() => {
                                                setCdkSearchInput('');
                                                setCdkSearch('');
                                                setCdkPage(1);
                                            }}
                                        />
                                        <Select aria-label="卡密状态" selectedKeys={[cdkStatus]} onSelectionChange={(keys) => { setCdkStatus(String(Array.from(keys)[0] || 'all') as CdkStatusFilter); setCdkPage(1); }}>
                                            <SelectItem key="all">全部状态</SelectItem>
                                            <SelectItem key="unused">未使用（含已过期）</SelectItem>
                                            <SelectItem key="used">已使用</SelectItem>
                                            <SelectItem key="disabled">已停用</SelectItem>
                                        </Select>
                                        <div className="flex gap-2">
                                            <Button color="primary" onPress={applyCdkFilters}>查询</Button>
                                            <Button variant="flat" onPress={resetCdkFilters}>重置</Button>
                                        </div>
                                    </div>
                                </CardHeader>
                                <Divider />
                                <CardBody className="p-0">
                                    <Table aria-label="我的卡密列表" classNames={{ table: 'min-w-[920px]' }}>
                                        <TableHeader>
                                            <TableColumn>卡密</TableColumn>
                                            <TableColumn>套餐</TableColumn>
                                            <TableColumn>状态</TableColumn>
                                            <TableColumn>有效期</TableColumn>
                                            <TableColumn>批次</TableColumn>
                                            <TableColumn>创建时间</TableColumn>
                                            <TableColumn>操作</TableColumn>
                                        </TableHeader>
                                        <TableBody isLoading={cdkLoading} loadingContent={<Spinner label="加载卡密中..." />} emptyContent="没有符合条件的卡密">
                                            {cdks.map((cdk) => (
                                                <TableRow key={cdk.id}>
                                                    <TableCell><code className="text-xs">{cdk.cdk}</code></TableCell>
                                                    <TableCell><div><p className="text-sm font-medium">{cdk.package_name || `套餐 #${cdk.package_id}`}</p><p className="text-xs text-default-500">使用 {cdk.use_count || 0}/{cdk.max_uses || 1}</p></div></TableCell>
                                                    <TableCell>{renderCdkStatus(cdk)}</TableCell>
                                                    <TableCell>{cdk.expires_at ? formatDateTime(cdk.expires_at) : '永不过期'}</TableCell>
                                                    <TableCell><span className="block max-w-32 truncate text-xs" title={cdk.batch_id || ''}>{cdk.batch_id || '-'}</span></TableCell>
                                                    <TableCell>{formatDateTime(cdk.created_at)}</TableCell>
                                                    <TableCell>
                                                        <Button isIconOnly size="sm" variant="light" aria-label="复制卡密" onPress={() => copyText(cdk.cdk, '卡密已复制')}>
                                                            <Copy className="h-4 w-4" />
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </CardBody>
                                <CardFooter className="flex flex-col gap-3 sm:flex-row sm:justify-between">
                                    <p className="text-sm text-default-500">第 {cdkPage}/{cdkTotalPages} 页，每页 {CDK_PAGE_SIZE} 条</p>
                                    <Pagination total={cdkTotalPages} page={cdkPage} onChange={setCdkPage} showControls />
                                </CardFooter>
                            </Card>
                        </div>
                    </Tab>

                    {canEditNotice && (
                        <Tab key="site" title={<span className="flex items-center gap-2"><Globe className="h-4 w-4" />站点配置</span>}>
                            <div className="grid gap-6 pt-4 lg:grid-cols-3">
                                <Card shadow="sm">
                                    <CardHeader className="flex items-center gap-2 font-semibold"><Globe className="h-5 w-5 text-primary" />站点归属</CardHeader>
                                    <Divider />
                                    <CardBody className="gap-4">
                                        {domains.length === 0 ? (
                                            <Alert isVisible color="warning" title="未绑定域名" description="站点配置暂时不会匹配到访问端，请联系管理员处理域名归属。" />
                                        ) : (
                                            <Listbox
                                                aria-label="绑定域名"
                                                selectionMode="none"
                                                variant="flat"
                                                onAction={(key) => window.open(`https://${String(key)}`, '_blank', 'noopener,noreferrer')}
                                            >
                                                {domains.map((domain, index) => (
                                                    <ListboxItem
                                                        key={domain}
                                                        textValue={domain}
                                                        showDivider={index < domains.length - 1}
                                                        startContent={<Globe className="h-4 w-4 text-primary" />}
                                                        endContent={<ExternalLink className="h-4 w-4 text-default-400" />}
                                                    >
                                                        {domain}
                                                    </ListboxItem>
                                                ))}
                                            </Listbox>
                                        )}
                                    </CardBody>
                                </Card>

                                <Card className="lg:col-span-2" shadow="sm">
                                    <CardHeader className="flex-col items-start gap-1">
                                        <div className="flex items-center gap-2 font-semibold"><Bell className="h-5 w-5 text-primary" />访问端公告配置</div>
                                        <p className="text-sm text-default-500">保存后由访问端按绑定域名读取，仅用于展示基础公告。</p>
                                    </CardHeader>
                                    <Divider />
                                    <CardBody>
                                        <Form className="gap-4" onSubmit={handleSaveSettings}>
                                            {canEditNotice && (
                                                <Textarea
                                                    label="公告"
                                                    value={notice}
                                                    onValueChange={setNotice}
                                                    minRows={4}
                                                    maxRows={8}
                                                    description="公告修改后会生成新的公告 ID，访问端可据此重新展示。"
                                                    placeholder="例如：购买方式、服务时间或重要通知"
                                                />
                                            )}
                                            <Button type="submit" color="primary" size="lg" isLoading={savingSettings} startContent={!savingSettings && <Save className="h-5 w-5" />}>
                                                保存站点配置
                                            </Button>
                                        </Form>
                                    </CardBody>
                                </Card>
                            </div>
                        </Tab>
                    )}

                    <Tab key="security" title={<span className="flex items-center gap-2"><Lock className="h-4 w-4" />安全设置</span>}>
                        <div className="mx-auto max-w-2xl pt-4">
                            <Card shadow="sm">
                                <CardHeader className="flex-col items-start gap-1">
                                    <div className="flex items-center gap-2 font-semibold"><KeyRound className="h-5 w-5 text-warning" />修改登录密码</div>
                                    <p className="text-sm text-default-500">修改成功后当前登录立即失效，需要使用新密码重新登录。</p>
                                </CardHeader>
                                <Divider />
                                <CardBody>
                                    <Form className="gap-4" onSubmit={handleChangePassword}>
                                        <Input label="当前密码" type="password" value={oldPassword} onValueChange={setOldPassword} autoComplete="current-password" isRequired />
                                        <Input label="新密码" type="password" value={newPassword} onValueChange={setNewPassword} autoComplete="new-password" minLength={8} description="至少 8 位，建议使用字母、数字和符号组合。" isRequired />
                                        <Input label="确认新密码" type="password" value={confirmPassword} onValueChange={setConfirmPassword} autoComplete="new-password" isInvalid={Boolean(confirmPassword && newPassword !== confirmPassword)} errorMessage="两次输入的新密码不一致" isRequired />
                                        <Button type="submit" color="warning" size="lg" isLoading={changingPassword} startContent={!changingPassword && <Lock className="h-5 w-5" />}>修改密码并重新登录</Button>
                                    </Form>
                                </CardBody>
                            </Card>
                        </div>
                    </Tab>
                </Tabs>
                <Alert
                    isVisible
                    color={discountActive ? 'primary' : 'warning'}
                    variant="flat"
                    title={discountActive ? '分销商折扣有效期说明' : '分销商折扣已到期'}
                    description={discountActive
                        ? `当前折扣有效期至 ${distributor.expires_at ? formatDateTime(distributor.expires_at) : '永久'}。有效期仅影响生成卡密时的折扣价格。`
                        : `折扣已于 ${distributor.expires_at ? formatDateTime(distributor.expires_at) : '-'} 到期。到期后仍可登录控制台、管理站点、查看余额和生成卡密，但新生成卡密按套餐原价扣款；历史卡密、余额及其他功能不受影响。`}
                />
            </main>

            {canGenerate && (
                <Modal isOpen={generateModal.isOpen} onOpenChange={generateModal.onOpenChange} placement="center">
                    <ModalContent>
                        {(onClose) => (
                            <>
                                <ModalHeader>确认生成卡密</ModalHeader>
                                <ModalBody className="gap-3">
                                    <Alert isVisible color="warning" title="生成成功后费用不可自动退回" description="请确认套餐、数量、有效期和客户信息无误。" />
                                    <div className="grid grid-cols-2 gap-3 text-sm">
                                        <span className="text-default-500">套餐</span><strong className="text-right">{selectedPackage?.package_name || '-'}</strong>
                                        <span className="text-default-500">数量</span><strong className="text-right">{genCount} 个</strong>
                                        <span className="text-default-500">有效期</span><strong className="text-right">{genExpireDays === undefined ? `默认 ${distributor.default_cdk_expire_days ?? 90} 天` : genExpireDays === 0 ? '永不过期' : `${genExpireDays} 天`}</strong>
                                        <span className="text-default-500">折后单价</span><strong className="text-right">¥{(selectedPackage?.unit_price || 0).toFixed(2)}</strong>
                                        <span className="text-default-500">本次扣款</span><strong className="text-right text-danger">¥{estimatedCost.toFixed(2)}</strong>
                                        <span className="text-default-500">扣款后余额</span><strong className="text-right">¥{Math.max(0, balance - estimatedCost).toFixed(2)}</strong>
                                    </div>
                                </ModalBody>
                                <ModalFooter>
                                    <Button variant="light" onPress={onClose}>返回检查</Button>
                                    <Button color="success" isLoading={generating} onPress={handleGenerateCdk}>确认生成并扣款</Button>
                                </ModalFooter>
                            </>
                        )}
                    </ModalContent>
                </Modal>
            )}

            <Modal isOpen={logoutModal.isOpen} onOpenChange={logoutModal.onOpenChange} placement="center">
                <ModalContent>
                    {(onClose) => (
                        <>
                            <ModalHeader>退出分销商控制台</ModalHeader>
                            <ModalBody><p>确定要退出当前账号吗？未提交的表单内容不会保留。</p></ModalBody>
                            <ModalFooter>
                                <Button variant="light" onPress={onClose}>取消</Button>
                                <Button color="danger" onPress={() => { void distributorApiService.logout(); }}>退出登录</Button>
                            </ModalFooter>
                        </>
                    )}
                </ModalContent>
            </Modal>
        </div>
    );
};

export default DistributorDashboardPage;
