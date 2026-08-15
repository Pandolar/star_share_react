import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    Accordion,
    AccordionItem,
    Alert,
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
    Modal,
    ModalBody,
    ModalContent,
    ModalFooter,
    ModalHeader,
    NumberInput,
    Pagination,
    Select,
    SelectItem,
    Snippet,
    Spinner,
    Switch,
    Tab,
    Table,
    TableBody,
    TableCell,
    TableColumn,
    TableHeader,
    TableRow,
    Tabs,
    Textarea,
    Tooltip,
    useDisclosure,
} from '@heroui/react';
import {
    BookOpen,
    CheckCircle2,
    Edit,
    Eye,
    Globe,
    MoreVertical,
    Percent,
    Plus,
    RefreshCw,
    Search,
    ShieldCheck,
    Trash2,
    Users,
    Wallet,
    XCircle,
} from 'lucide-react';
import dayjs from 'dayjs';
import adminApiService from '../../services/adminApi';
import { showToast } from '../../components/Toast';

type PermissionKey = 'can_login' | 'can_generate_cdk' | 'can_edit_notice';

interface DiscountConfig {
    overall?: number;
    packages?: Record<string, number>;
}

interface Distributor {
    id: number;
    username: string;
    status: number;
    domains: string | string[];
    domains_parsed?: string[];
    notice?: string;
    notice_id?: string;
    remarks?: string;
    balance?: number;
    level?: number;
    default_cdk_expire_days?: number;
    expires_at?: string | null;
    discount_active?: boolean;
    can_login?: boolean;
    can_generate_cdk?: boolean;
    can_edit_notice?: boolean;
    discount_config?: DiscountConfig;
    created_at?: string;
    updated_at?: string;
}

interface DistributorFormState {
    username: string;
    password: string;
    status: number;
    domainsText: string;
    remarks: string;
    resetPassword: boolean;
    level: number;
    defaultCdkExpireDays: number;
    expiresAt: string;
    can_login: boolean;
    can_generate_cdk: boolean;
    can_edit_notice: boolean;
}

interface BalanceLog {
    id: number;
    change_amount: number;
    balance_after: number;
    type: string;
    remarks?: string;
    batch_id?: string;
    created_at: string;
}

interface PackageOption {
    id: number;
    package_name: string;
    price?: string | number;
}

const DEFAULT_FORM: DistributorFormState = {
    username: '',
    password: '',
    status: 1,
    domainsText: '',
    resetPassword: false,
    remarks: '',
    level: 1,
    defaultCdkExpireDays: 90,
    expiresAt: dayjs().add(365, 'day').format('YYYY-MM-DD'),
    can_login: true,
    can_generate_cdk: true,
    can_edit_notice: true,
};
const PERMISSIONS: Array<{ key: PermissionKey; label: string; description: string }> = [
    { key: 'can_login', label: '登录分销商后台', description: '关闭后立即终止所有设备会话，并阻止后续登录。' },
    { key: 'can_generate_cdk', label: '余额生成卡密', description: '允许按最终折后价扣减余额并生成当前账号名下的卡密。' },
    { key: 'can_edit_notice', label: '修改站点公告', description: '允许分销商在后台修改其绑定域名显示的公告。' },
];

const normalizeDomain = (value: string) => {
    let domain = value.trim().toLowerCase();
    if (!domain) return '';
    try {
        if (domain.includes('://')) domain = new URL(domain).hostname;
    } catch {
        return '';
    }
    domain = domain.split('/')[0].split(':')[0].replace(/^\.+|\.+$/g, '');
    return domain;
};

const parseDomainText = (value: string): { domains: string[]; invalid: string[] } => {
    const rawValues = value.split(/[\n,，]+/).map((item) => item.trim()).filter(Boolean);
    const invalid: string[] = [];
    const domains = rawValues.map((item) => {
        const normalized = normalizeDomain(item);
        const labels = normalized.split('.');
        const isValid = normalized.length <= 253
            && labels.length >= 2
            && labels.every((label) => label.length > 0
                && label.length <= 63
                && /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(label));
        if (!isValid) invalid.push(item);
        return normalized;
    }).filter(Boolean);
    return { domains: Array.from(new Set(domains)), invalid };
};

const parseStoredDomains = (distributor: Distributor): string[] => {
    if (Array.isArray(distributor.domains_parsed)) return distributor.domains_parsed.map(String).filter(Boolean);
    if (Array.isArray(distributor.domains)) return distributor.domains.map(String).filter(Boolean);
    try {
        const parsed = JSON.parse(distributor.domains || '[]');
        return Array.isArray(parsed) ? parsed.map(String).filter(Boolean) : [];
    } catch {
        return distributor.domains ? distributor.domains.split(',').map((item) => item.trim()).filter(Boolean) : [];
    }
};

const domainsOverlap = (left: string, right: string) => (
    left === right || left.endsWith(`.${right}`) || right.endsWith(`.${left}`)
);

const toOptionalRate = (value: number) => (Number.isNaN(value) ? undefined : value);

const DistributorsManagePage: React.FC = () => {
    const [distributors, setDistributors] = useState<Distributor[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchInput, setSearchInput] = useState('');
    const [query, setQuery] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [total, setTotal] = useState(0);
    const [selectedDistributor, setSelectedDistributor] = useState<Distributor | null>(null);
    const [formData, setFormData] = useState<DistributorFormState>(DEFAULT_FORM);
    const [formSubmitting, setFormSubmitting] = useState(false);
    const [statusSubmitting, setStatusSubmitting] = useState(false);

    const createModal = useDisclosure();
    const editModal = useDisclosure();
    const viewModal = useDisclosure();
    const deleteModal = useDisclosure();
    const balanceModal = useDisclosure();
    const discountModal = useDisclosure();
    const statusModal = useDisclosure();

    const [balanceAction, setBalanceAction] = useState<'recharge' | 'deduct'>('recharge');
    const [balanceAmount, setBalanceAmount] = useState<number | undefined>(undefined);
    const [balanceRemarks, setBalanceRemarks] = useState('');
    const [balanceLogs, setBalanceLogs] = useState<BalanceLog[]>([]);
    const [balanceLoading, setBalanceLoading] = useState(false);
    const [balanceSubmitting, setBalanceSubmitting] = useState(false);

    const [packageOptions, setPackageOptions] = useState<PackageOption[]>([]);
    const [discountLoading, setDiscountLoading] = useState(false);
    const [discountSaving, setDiscountSaving] = useState(false);
    const [currentLevel, setCurrentLevel] = useState(1);
    const [levelMap, setLevelMap] = useState<Record<string, DiscountConfig>>({});
    const [distOverall, setDistOverall] = useState<number | undefined>(undefined);
    const [distPackageRates, setDistPackageRates] = useState<Record<string, number | undefined>>({});
    const [levelOverall, setLevelOverall] = useState<number | undefined>(undefined);
    const [levelPackageRates, setLevelPackageRates] = useState<Record<string, number | undefined>>({});

    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const loginUrl = `${window.location.origin}/distributor/login`;
    const currentPageBalance = distributors.reduce((sum, item) => sum + Number(item.balance || 0), 0);

    const fetchDistributors = useCallback(async () => {
        setLoading(true);
        try {
            const response = await adminApiService.getDistributors({
                current_page: currentPage,
                page_size: pageSize,
                querystring: query || undefined,
            });
            if (response.code === 20000) {
                const list = Array.isArray(response.data) ? response.data : [];
                const totalNum = Number(response.total) || 0;
                const nextTotalPages = Math.max(1, Math.ceil(totalNum / pageSize));
                setDistributors(list);
                setTotal(totalNum);
                if (currentPage > nextTotalPages) setCurrentPage(nextTotalPages);
            } else {
                setDistributors([]);
                setTotal(0);
                showToast(response.msg || '获取分销商列表失败', 'error');
            }
        } catch (error: any) {
            setDistributors([]);
            setTotal(0);
            showToast(error.response?.data?.msg || error.message || '获取分销商列表失败', 'error');
        } finally {
            setLoading(false);
        }
    }, [currentPage, pageSize, query]);

    useEffect(() => {
        fetchDistributors();
    }, [fetchDistributors]);

    const applySearch = () => {
        setCurrentPage(1);
        setQuery(searchInput.trim());
    };

    const resetSearch = () => {
        setSearchInput('');
        setQuery('');
        setCurrentPage(1);
    };

    const resetForm = () => {
        setFormData({ ...DEFAULT_FORM, expiresAt: dayjs().add(365, 'day').format('YYYY-MM-DD') });
        setSelectedDistributor(null);
    };

    const openCreateModal = () => {
        resetForm();
        createModal.onOpen();
    };

    const openEditModal = (distributor: Distributor) => {
        setSelectedDistributor(distributor);
        setFormData({
            username: distributor.username,
            password: '',
            status: distributor.status,
            resetPassword: false,
            domainsText: parseStoredDomains(distributor).join('\n'),
            remarks: distributor.remarks || '',
            level: distributor.level || 1,
            defaultCdkExpireDays: distributor.default_cdk_expire_days ?? 90,
            expiresAt: distributor.expires_at ? dayjs(distributor.expires_at).format('YYYY-MM-DD') : '',
            can_login: distributor.can_login !== false,
            can_generate_cdk: distributor.can_generate_cdk !== false,
            can_edit_notice: distributor.can_edit_notice !== false,
        });
        editModal.onOpen();
    };

    const validateDomainOwnership = async (domains: string[], excludeId?: number) => {
        if (domains.length === 0) return true;
        const response = await adminApiService.getDistributors({ current_page: 1, page_size: 10000 });
        if (response.code !== 20000 || !Array.isArray(response.data)) {
            showToast('无法完成域名归属校验，请稍后重试', 'error');
            return false;
        }
        for (const row of response.data as Distributor[]) {
            if (row.id === excludeId) continue;
            const existingDomains = parseStoredDomains(row).map(normalizeDomain).filter(Boolean);
            for (const domain of domains) {
                const conflict = existingDomains.find((existing) => domainsOverlap(domain, existing));
                if (conflict) {
                    showToast(`域名 ${domain} 与分销商 ${row.username} 的 ${conflict} 存在根域/子域重叠`, 'error');
                    return false;
                }
            }
        }
        return true;
    };

    const validateForm = async (isCreate: boolean) => {
        if (!formData.username.trim()) {
            showToast('请输入分销商账号', 'warning');
            return null;
        }
        if (isCreate && formData.password.length < 8) {
            showToast('初始密码至少 8 位', 'warning');
            return null;
        }
        if (!isCreate && formData.resetPassword && formData.password.length < 8) {
            showToast('新密码至少 8 位', 'warning');
            return null;
        }
        if (!Number.isInteger(formData.level) || formData.level < 1) {
            showToast('分销商等级必须是大于等于 1 的整数', 'warning');
            return null;
        }
        if (!Number.isInteger(formData.defaultCdkExpireDays) || formData.defaultCdkExpireDays < 0) {
            showToast('默认卡密有效期必须是大于等于 0 的整数', 'warning');
            return null;
        }
        if (formData.expiresAt && !dayjs(formData.expiresAt).isValid()) {
            showToast('请选择有效的分销商有效期', 'warning');
            return null;
        }

        const parsed = parseDomainText(formData.domainsText);
        if (parsed.invalid.length > 0) {
            showToast(`域名格式不正确：${parsed.invalid.join('、')}`, 'warning');
            return null;
        }
        if (!(await validateDomainOwnership(parsed.domains, selectedDistributor?.id))) return null;
        return parsed.domains;
    };

    const handleCreate = async () => {
        setFormSubmitting(true);
        try {
            const domains = await validateForm(true);
            if (!domains) return;
            const response = await adminApiService.createDistributor({
                username: formData.username.trim(),
                password: formData.password,
                domains,
                remarks: formData.remarks.trim(),
                level: formData.level,
                default_cdk_expire_days: formData.defaultCdkExpireDays,
                expires_at: formData.expiresAt || null,
                can_login: formData.can_login,
                can_generate_cdk: formData.can_generate_cdk,
                can_edit_notice: formData.can_edit_notice,
            });
            if (response.code === 20000) {
                createModal.onClose();
                resetForm();
                showToast('分销商已创建', 'success');
                await fetchDistributors();
            } else {
                showToast(response.msg || '创建失败', 'error');
            }
        } catch (error: any) {
            showToast(error.response?.data?.msg || error.message || '创建失败', 'error');
        } finally {
            setFormSubmitting(false);
        }
    };

    const handleUpdate = async () => {
        if (!selectedDistributor) return;
        setFormSubmitting(true);
        try {
            const domains = await validateForm(false);
            if (!domains) return;
            const response = await adminApiService.updateDistributor({
                id: selectedDistributor.id,
                password: formData.resetPassword ? formData.password : undefined,
                status: formData.status,
                domains,
                remarks: formData.remarks.trim(),
                level: formData.level,
                default_cdk_expire_days: formData.defaultCdkExpireDays,
                expires_at: formData.expiresAt || null,
                can_login: formData.can_login,
                can_generate_cdk: formData.can_generate_cdk,
                can_edit_notice: formData.can_edit_notice,
            });
            if (response.code === 20000) {
                editModal.onClose();
                resetForm();
                showToast('分销商配置已更新', 'success');
                await fetchDistributors();
            } else {
                showToast(response.msg || '更新失败', 'error');
            }
        } catch (error: any) {
            showToast(error.response?.data?.msg || error.message || '更新失败', 'error');
        } finally {
            setFormSubmitting(false);
        }
    };

    const handleToggleStatus = async () => {
        if (!selectedDistributor) return;
        setStatusSubmitting(true);
        try {
            const distributor = selectedDistributor;
            const nextStatus = distributor.status === 1 ? 0 : 1;
            const response = await adminApiService.updateDistributor({ id: distributor.id, status: nextStatus });
            if (response.code === 20000) {
                statusModal.onClose();
                showToast(nextStatus === 1 ? '账号已启用' : '账号已停用', 'success');
                await fetchDistributors();
            } else {
                showToast(response.msg || '状态更新失败', 'error');
            }
        } catch (error: any) {
            showToast(error.response?.data?.msg || error.message || '状态更新失败', 'error');
        } finally {
            setStatusSubmitting(false);
        }
    };

    const handleDelete = async () => {
        if (!selectedDistributor) return;
        setFormSubmitting(true);
        try {
            const response = await adminApiService.deleteDistributor(selectedDistributor.id);
            if (response.code === 20000) {
                deleteModal.onClose();
                showToast('分销商账号记录已删除', 'success');
                setSelectedDistributor(null);
                await fetchDistributors();
            } else {
                showToast(response.msg || '删除失败', 'error');
            }
        } catch (error: any) {
            showToast(error.response?.data?.msg || error.message || '删除失败', 'error');
        } finally {
            setFormSubmitting(false);
        }
    };

    const loadBalanceLogs = async (distributor: Distributor) => {
        setBalanceLoading(true);
        try {
            const response = await adminApiService.getDistributorBalanceLog({
                distributor_id: distributor.id,
                current_page: 1,
                page_size: 30,
            });
            if (response.code === 20000) setBalanceLogs(response.data?.logs || []);
            else showToast(response.msg || '余额流水加载失败', 'error');
        } catch (error: any) {
            showToast(error.response?.data?.msg || '余额流水加载失败', 'error');
        } finally {
            setBalanceLoading(false);
        }
    };

    const openBalanceModal = (distributor: Distributor) => {
        setSelectedDistributor(distributor);
        setBalanceAction('recharge');
        setBalanceAmount(undefined);
        setBalanceRemarks('');
        setBalanceLogs([]);
        balanceModal.onOpen();
        loadBalanceLogs(distributor);
    };

    const handleBalanceChange = async () => {
        if (!selectedDistributor || !balanceAmount || balanceAmount <= 0) {
            showToast('请输入大于 0 的金额', 'warning');
            return;
        }
        if (balanceAction === 'deduct' && balanceAmount > Number(selectedDistributor.balance || 0)) {
            showToast('扣减金额不能超过当前余额', 'warning');
            return;
        }
        setBalanceSubmitting(true);
        try {
            const signedAmount = balanceAction === 'recharge' ? balanceAmount : -balanceAmount;
            const response = await adminApiService.rechargeDistributorBalance({
                distributor_id: selectedDistributor.id,
                amount: signedAmount,
                remarks: balanceRemarks.trim(),
            });
            if (response.code === 20000) {
                const updated = { ...selectedDistributor, balance: Number(response.data?.balance ?? Number(selectedDistributor.balance || 0) + signedAmount) };
                setSelectedDistributor(updated);
                setBalanceAmount(undefined);
                setBalanceRemarks('');
                showToast(balanceAction === 'recharge' ? '余额已充值' : '余额已扣减', 'success');
                await Promise.all([loadBalanceLogs(updated), fetchDistributors()]);
            } else {
                showToast(response.msg || '余额操作失败', 'error');
            }
        } catch (error: any) {
            showToast(error.response?.data?.msg || error.message || '余额操作失败', 'error');
        } finally {
            setBalanceSubmitting(false);
        }
    };

    const hydrateDiscountInputs = (config?: DiscountConfig) => {
        const rates: Record<string, number | undefined> = {};
        Object.entries(config?.packages || {}).forEach(([packageId, rate]) => { rates[packageId] = Number(rate); });
        return { overall: config?.overall != null ? Number(config.overall) : undefined, rates };
    };

    const loadDiscounts = async (distributor: Distributor) => {
        setDiscountLoading(true);
        try {
            const [discountResponse, packageResponse] = await Promise.all([
                adminApiService.getDistributorDiscounts({ distributor_id: distributor.id }),
                adminApiService.getPackages({ current_page: 1, page_size: 1000 }),
            ]);
            if (packageResponse.code === 20000 && Array.isArray(packageResponse.data)) {
                setPackageOptions(packageResponse.data.map((item: any) => ({ id: item.id, package_name: item.package_name, price: item.price })));
            }
            if (discountResponse.code !== 20000) {
                showToast(discountResponse.msg || '折扣配置加载失败', 'error');
                return;
            }
            const levels = discountResponse.data?.level_discounts || {};
            const distributorConfig = discountResponse.data?.distributor?.discount_config || {};
            const level = distributor.level || 1;
            const distInputs = hydrateDiscountInputs(distributorConfig);
            const levelInputs = hydrateDiscountInputs(levels[String(level)] || {});
            setLevelMap(levels);
            setDistOverall(distInputs.overall);
            setDistPackageRates(distInputs.rates);
            setLevelOverall(levelInputs.overall);
            setLevelPackageRates(levelInputs.rates);
        } catch (error: any) {
            showToast(error.response?.data?.msg || '折扣配置加载失败', 'error');
        } finally {
            setDiscountLoading(false);
        }
    };

    const openDiscountModal = (distributor: Distributor) => {
        setSelectedDistributor(distributor);
        setCurrentLevel(distributor.level || 1);
        setPackageOptions([]);
        setLevelMap({});
        setDistOverall(undefined);
        setDistPackageRates({});
        setLevelOverall(undefined);
        setLevelPackageRates({});
        discountModal.onOpen();
        loadDiscounts(distributor);
    };

    const buildDiscountConfig = (overall: number | undefined, packageRates: Record<string, number | undefined>) => {
        if (overall !== undefined && (overall <= 0 || overall > 1)) return null;
        const packages: Record<string, number> = {};
        for (const [packageId, rate] of Object.entries(packageRates)) {
            if (rate === undefined) continue;
            if (rate <= 0 || rate > 1) return null;
            packages[packageId] = Math.round(rate * 10000) / 10000;
        }
        const config: DiscountConfig = {};
        if (overall !== undefined) config.overall = Math.round(overall * 10000) / 10000;
        if (Object.keys(packages).length > 0) config.packages = packages;
        return config;
    };

    const saveDistributorDiscount = async () => {
        if (!selectedDistributor) return;
        const config = buildDiscountConfig(distOverall, distPackageRates);
        if (!config) {
            showToast('折扣率必须在 (0, 1] 范围内，0.8 表示 8 折', 'warning');
            return;
        }
        setDiscountSaving(true);
        try {
            const response = await adminApiService.saveDistributorDiscount({ distributor_id: selectedDistributor.id, discount_config: config });
            if (response.code === 20000) {
                showToast('分销商专属折扣已保存', 'success');
                await loadDiscounts(selectedDistributor);
            } else showToast(response.msg || '保存失败', 'error');
        } catch (error: any) {
            showToast(error.response?.data?.msg || error.message || '保存失败', 'error');
        } finally {
            setDiscountSaving(false);
        }
    };

    const saveLevelDiscount = async () => {
        const config = buildDiscountConfig(levelOverall, levelPackageRates);
        if (!config) {
            showToast('折扣率必须在 (0, 1] 范围内，0.8 表示 8 折', 'warning');
            return;
        }
        const nextLevelMap = { ...levelMap };
        if (Object.keys(config).length > 0) nextLevelMap[String(currentLevel)] = config;
        else delete nextLevelMap[String(currentLevel)];

        setDiscountSaving(true);
        try {
            const response = await adminApiService.saveLevelDiscounts(nextLevelMap);
            if (response.code === 20000) {
                setLevelMap(nextLevelMap);
                showToast(`等级 L${currentLevel} 默认折扣已保存`, 'success');
            } else showToast(response.msg || '保存失败', 'error');
        } catch (error: any) {
            showToast(error.response?.data?.msg || error.message || '保存失败', 'error');
        } finally {
            setDiscountSaving(false);
        }
    };

    const permissionsEnabled = (distributor: Distributor) => PERMISSIONS.filter(({ key }) => distributor[key] !== false).length;

    const projectedBalance = useMemo(() => {
        const current = Number(selectedDistributor?.balance || 0);
        if (!balanceAmount) return current;
        return balanceAction === 'recharge' ? current + balanceAmount : current - balanceAmount;
    }, [balanceAction, balanceAmount, selectedDistributor?.balance]);

    const renderDiscountEditor = (
        overall: number | undefined,
        setOverall: (value: number | undefined) => void,
        packageRates: Record<string, number | undefined>,
        setPackageRates: React.Dispatch<React.SetStateAction<Record<string, number | undefined>>>,
        saveLabel: string,
        onSave: () => void,
        color: 'primary' | 'secondary',
    ) => (
        <div className="space-y-4">
            <NumberInput
                label="整体折扣率"
                value={overall}
                onValueChange={(value) => setOverall(toOptionalRate(value))}
                minValue={0.0001}
                maxValue={1}
                step={0.01}
                placeholder="留空表示不设置"
                description="例如 0.8 表示按原价的 80% 结算。"
            />
            <Table aria-label={`${saveLabel}套餐折扣`} classNames={{ wrapper: 'max-h-80' }}>
                <TableHeader>
                    <TableColumn>套餐</TableColumn>
                    <TableColumn>原价</TableColumn>
                    <TableColumn>单独折扣率</TableColumn>
                </TableHeader>
                <TableBody emptyContent="暂无套餐，请先在套餐管理中创建并上架套餐">
                    {packageOptions.map((item) => (
                        <TableRow key={item.id}>
                            <TableCell>{item.package_name}</TableCell>
                            <TableCell>{item.price != null ? `¥${Number(item.price).toFixed(2)}` : '-'}</TableCell>
                            <TableCell>
                                <NumberInput
                                    aria-label={`${item.package_name}折扣率`}
                                    size="sm"
                                    value={packageRates[String(item.id)]}
                                    onValueChange={(value) => setPackageRates((current) => ({ ...current, [String(item.id)]: toOptionalRate(value) }))}
                                    minValue={0.0001}
                                    maxValue={1}
                                    step={0.01}
                                    placeholder="继承整体/上级"
                                />
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
            <Button color={color} onPress={onSave} isLoading={discountSaving}>{saveLabel}</Button>
        </div>
    );

    const renderDistributorForm = (mode: 'create' | 'edit') => (
        <div className="space-y-5">
            <Alert
                isVisible
                color="default"
                title={mode === 'create' ? '创建后默认启用' : '账号名创建后不可修改'}
                description={mode === 'create'
                    ? '建议先绑定域名、设置权限和默认有效期，再充值并配置折扣。'
                    : '保存普通配置不会修改密码；只有主动开启“重置登录密码”并填写新密码才会重置。'}
            />
            <div className="grid gap-4 sm:grid-cols-2">
                <Input
                    label="分销商账号"
                    value={formData.username}
                    onValueChange={(value) => setFormData((current) => ({ ...current, username: value }))}
                    isDisabled={mode === 'edit'}
                    isRequired
                    autoComplete="off"
                />
                {mode === 'create' ? (
                    <Input
                        label="初始密码"
                        type="password"
                        value={formData.password}
                        onValueChange={(value) => setFormData((current) => ({ ...current, password: value }))}
                        description="至少 8 位"
                        isRequired
                        autoComplete="new-password"
                    />
                ) : (
                    <div className="space-y-3">
                        <Switch
                            isSelected={formData.resetPassword}
                            onValueChange={(resetPassword) => setFormData((current) => ({ ...current, resetPassword, password: '' }))}
                        >
                            重置登录密码
                        </Switch>
                        {formData.resetPassword && (
                            <Input
                                label="新登录密码"
                                type="password"
                                value={formData.password}
                                onValueChange={(value) => setFormData((current) => ({ ...current, password: value }))}
                                description="至少 8 位；保存后所有设备需要用新密码重新登录"
                                isRequired
                                autoComplete="new-password"
                            />
                        )}
                    </div>
                )}
                {mode === 'edit' && (
                    <Select
                        label="账号状态"
                        selectedKeys={[String(formData.status)]}
                        onSelectionChange={(keys) => setFormData((current) => ({ ...current, status: Number(Array.from(keys)[0] || 1) }))}
                    >
                        <SelectItem key="1">启用</SelectItem>
                        <SelectItem key="0">停用</SelectItem>
                    </Select>
                )}
                <NumberInput
                    label="分销商等级"
                    value={formData.level}
                    onValueChange={(value) => setFormData((current) => ({ ...current, level: value }))}
                    minValue={1}
                    step={1}
                    description="用于匹配等级默认折扣。"
                    isRequired
                />
                <Input
                    type="date"
                    label="分销商有效期"
                    value={formData.expiresAt}
                    onValueChange={(expiresAt) => setFormData((current) => ({ ...current, expiresAt }))}
                    description="新建默认 365 天；到期后仍可登录和生成卡密，但卡密按套餐原价结算。留空表示折扣永久有效。"
                />
                <NumberInput
                    label="默认卡密有效期（天）"
                    value={formData.defaultCdkExpireDays}
                    onValueChange={(value) => setFormData((current) => ({ ...current, defaultCdkExpireDays: value }))}
                    minValue={0}
                    step={1}
                    description="分销商生成时留空会使用此值；0 表示永不过期。"
                    isRequired
                />
            </div>
            <Textarea
                label="域名列表"
                value={formData.domainsText}
                onValueChange={(value) => setFormData((current) => ({ ...current, domainsText: value }))}
                minRows={4}
                placeholder={'每行一个域名，例如：\nexample.com\nshop.example.com'}
                description="会自动去协议、端口并转小写。根域会匹配其所有子域，因此根域和子域不能分配给不同分销商。留空表示没有专属白牌站点映射。"
            />
            <Textarea
                label="管理员备注"
                value={formData.remarks}
                onValueChange={(value) => setFormData((current) => ({ ...current, remarks: value }))}
                minRows={2}
                placeholder="内部备注，不会展示给分销商客户"
            />
            <Card shadow="none">
                <CardHeader className="font-medium">权限开关</CardHeader>
                <CardBody className="grid gap-4 sm:grid-cols-2">
                    {PERMISSIONS.map(({ key, label, description }) => (
                        <div key={key} className="space-y-1">
                            <Switch
                                isSelected={formData[key]}
                                onValueChange={(checked) => setFormData((current) => ({ ...current, [key]: checked }))}
                            >
                                {label}
                            </Switch>
                            <p className="pl-10 text-xs text-default-500">{description}</p>
                        </div>
                    ))}
                </CardBody>
            </Card>
        </div>
    );

    return (
        <div className="space-y-6">
            <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <div className="flex items-center gap-2">
                        <Users className="h-6 w-6 text-primary" />
                        <h1 className="text-2xl font-semibold text-foreground">分销商管理</h1>
                    </div>
                    <p className="mt-1 text-sm text-default-500">管理白牌域名归属、账号权限、余额、折扣和卡密生成规则。</p>
                </div>
                <Button color="primary" startContent={<Plus className="h-4 w-4" />} onPress={openCreateModal}>创建分销商</Button>
            </header>

            <Accordion variant="splitted" defaultExpandedKeys={['guide']}>
                <AccordionItem key="guide" aria-label="分销商使用说明" startContent={<BookOpen className="h-5 w-5 text-primary" />} title="常用用法与规则" subtitle="首次配置或排查白牌站点时先看这里">
                    <div className="grid gap-4 pb-3 md:grid-cols-2">
                        <Alert isVisible color="primary" title="1. 账号与域名" description="创建账号后绑定访问域名。启用状态下，配置的根域及其子域会映射到该分销商；没有域名时仍可登录和做卡密业务，但没有专属站点内容。" />
                        <Alert isVisible color="secondary" title="2. 余额与折扣" description="管理员先充值余额，再配置等级或专属折扣。实际单价优先级：分销商套餐 > 分销商整体 > 等级套餐 > 等级整体 > 原价。" />
                        <Alert isVisible color="success" title="3. 卡密交付" description="分销商登录后台选择已上架套餐生成卡密，成功后自动扣款。卡密只归属于该分销商，客户在白牌站通过兑换码激活。" />
                        <Alert isVisible color="warning" title="4. 下线与删除" description="日常下线请停用账号，可立即停止域名映射和鉴权。删除不会自动回收已生成卡密或历史流水，只有确认不再需要账号记录时才使用。" />
                        <Card className="md:col-span-2" shadow="none">
                            <CardBody className="gap-2">
                                <Alert isVisible color="warning" variant="flat" title="部署必查：全局白牌范围" description="分销商绑定域名（或其父域）还必须由“系统配置 → 白牌设置 → WHITE_LABEL_CONFIG.domains”覆盖并启用。否则页面可能按白牌展示，但邀请、支付等后端接口未按白牌策略拦截。" />
                                <p className="text-sm font-medium">分销商后台地址</p>
                                <Snippet hideSymbol codeString={loginUrl} onCopy={() => showToast('登录地址已复制', 'success')}>{loginUrl}</Snippet>
                                <p className="text-xs text-default-500">白牌访问端会隐藏自营品牌、邀请、微信登录和在线支付，套餐通过卡密兑换激活；购买与客服入口由分销商配置。</p>
                            </CardBody>
                        </Card>
                    </div>
                </AccordionItem>
            </Accordion>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Card shadow="sm"><CardBody><p className="text-sm text-default-500">搜索结果</p><p className="mt-1 text-2xl font-semibold">{total}</p></CardBody></Card>
                <Card shadow="sm"><CardBody><p className="text-sm text-default-500">本页启用</p><p className="mt-1 text-2xl font-semibold text-success">{distributors.filter((item) => item.status === 1).length}</p></CardBody></Card>
                <Card shadow="sm"><CardBody><p className="text-sm text-default-500">本页停用</p><p className="mt-1 text-2xl font-semibold text-danger">{distributors.filter((item) => item.status !== 1).length}</p></CardBody></Card>
                <Card shadow="sm"><CardBody><p className="text-sm text-default-500">本页余额合计</p><p className="mt-1 text-2xl font-semibold">¥{currentPageBalance.toFixed(2)}</p></CardBody></Card>
            </div>

            <Card shadow="sm">
                <CardBody className="gap-4">
                    <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
                        <Input
                            value={searchInput}
                            onValueChange={setSearchInput}
                            onKeyDown={(event) => event.key === 'Enter' && applySearch()}
                            placeholder="搜索账号、域名、备注或 ID"
                            startContent={<Search className="h-4 w-4 text-default-400" />}
                            isClearable
                            onClear={resetSearch}
                        />
                        <div className="flex gap-2">
                            <Button color="primary" onPress={applySearch}>查询</Button>
                            <Button variant="flat" onPress={resetSearch}>重置</Button>
                            <Tooltip content="刷新列表">
                                <Button isIconOnly variant="flat" aria-label="刷新列表" onPress={fetchDistributors}><RefreshCw className="h-4 w-4" /></Button>
                            </Tooltip>
                        </div>
                    </div>
                </CardBody>
            </Card>

            <Card shadow="sm">
                <CardBody className="p-0">
                    <Table aria-label="分销商列表" classNames={{ table: 'min-w-[1120px]' }}>
                        <TableHeader>
                            <TableColumn>账号</TableColumn>
                            <TableColumn>站点状态</TableColumn>
                            <TableColumn>等级与余额</TableColumn>
                            <TableColumn>权限</TableColumn>
                            <TableColumn>管理员备注</TableColumn>
                            <TableColumn>更新时间</TableColumn>
                            <TableColumn>操作</TableColumn>
                        </TableHeader>
                        <TableBody isLoading={loading} loadingContent={<Spinner label="加载分销商中..." />} emptyContent="没有符合条件的分销商">
                            {distributors.map((distributor) => {
                                const domains = parseStoredDomains(distributor);
                                return (
                                    <TableRow key={distributor.id}>
                                        <TableCell><div><p className="font-medium">{distributor.username}</p><p className="text-xs text-default-500">ID {distributor.id}</p></div></TableCell>
                                        <TableCell>
                                            <div className="space-y-2">
                                                <Chip color={distributor.status === 1 ? 'success' : 'danger'} variant="flat" size="sm" startContent={distributor.status === 1 ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}>
                                                    {distributor.status === 1 ? '启用' : '停用'}
                                                </Chip>
                                                <div className="flex max-w-80 flex-wrap gap-1">
                                                    {domains.length === 0 ? <Chip size="sm" variant="flat">未绑定域名</Chip> : domains.slice(0, 3).map((domain) => <Chip key={domain} size="sm" color="primary" variant="flat">{domain}</Chip>)}
                                                    {domains.length > 3 && <Chip size="sm" variant="flat">+{domains.length - 3}</Chip>}
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell><div className="space-y-1"><Chip size="sm" color="secondary" variant="flat">L{distributor.level || 1}</Chip><p className="font-medium">¥{Number(distributor.balance || 0).toFixed(2)}</p><Chip size="sm" color={distributor.discount_active === false ? 'warning' : 'success'} variant="flat">{distributor.discount_active === false ? '折扣已到期' : `折扣至 ${distributor.expires_at ? dayjs(distributor.expires_at).format('YYYY-MM-DD') : '永久'}`}</Chip><p className="text-xs text-default-500">卡密默认 {distributor.default_cdk_expire_days ?? 90} 天</p></div></TableCell>
                                        <TableCell><Chip size="sm" variant="flat" color={permissionsEnabled(distributor) === 4 ? 'success' : 'warning'}>{permissionsEnabled(distributor)}/4 已开通</Chip></TableCell>
                                        <TableCell><span className="block max-w-56 truncate text-sm text-default-500" title={distributor.remarks || ''}>{distributor.remarks || '-'}</span></TableCell>
                                        <TableCell>{distributor.updated_at ? dayjs(distributor.updated_at).format('YYYY-MM-DD HH:mm') : '-'}</TableCell>
                                        <TableCell>
                                            <Dropdown placement="bottom-end">
                                                <DropdownTrigger><Button isIconOnly size="sm" variant="light" aria-label={`操作 ${distributor.username}`}><MoreVertical className="h-4 w-4" /></Button></DropdownTrigger>
                                                <DropdownMenu aria-label="分销商操作">
                                                    <DropdownItem key="view" startContent={<Eye className="h-4 w-4" />} onPress={() => { setSelectedDistributor(distributor); viewModal.onOpen(); }}>查看详情</DropdownItem>
                                                    <DropdownItem key="balance" startContent={<Wallet className="h-4 w-4" />} onPress={() => openBalanceModal(distributor)}>余额与流水</DropdownItem>
                                                    <DropdownItem key="discount" startContent={<Percent className="h-4 w-4" />} onPress={() => openDiscountModal(distributor)}>折扣设置</DropdownItem>
                                                    <DropdownItem key="edit" startContent={<Edit className="h-4 w-4" />} onPress={() => openEditModal(distributor)}>编辑配置</DropdownItem>
                                                    <DropdownItem key="status" color={distributor.status === 1 ? 'warning' : 'success'} startContent={<ShieldCheck className="h-4 w-4" />} onPress={() => { setSelectedDistributor(distributor); statusModal.onOpen(); }}>{distributor.status === 1 ? '停用账号' : '启用账号'}</DropdownItem>
                                                    <DropdownItem key="delete" color="danger" className="text-danger" startContent={<Trash2 className="h-4 w-4" />} onPress={() => { setSelectedDistributor(distributor); deleteModal.onOpen(); }}>删除账号记录</DropdownItem>
                                                </DropdownMenu>
                                            </Dropdown>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </CardBody>
                <CardFooter className="flex flex-col gap-3 sm:flex-row sm:justify-between">
                    <div className="flex items-center gap-2 text-sm text-default-500">
                        <span>每页</span>
                        <Select aria-label="每页数量" selectedKeys={[String(pageSize)]} onSelectionChange={(keys) => { setPageSize(Number(Array.from(keys)[0] || 10)); setCurrentPage(1); }} className="w-24">
                            <SelectItem key="10">10</SelectItem><SelectItem key="30">30</SelectItem><SelectItem key="100">100</SelectItem>
                        </Select>
                        <span>条，共 {total} 条</span>
                    </div>
                    <Pagination total={totalPages} page={currentPage} onChange={setCurrentPage} showControls />
                </CardFooter>
            </Card>

            <Modal isOpen={createModal.isOpen} onOpenChange={createModal.onOpenChange} size="3xl" scrollBehavior="inside">
                <ModalContent>{(onClose) => <><ModalHeader>创建分销商</ModalHeader><ModalBody>{renderDistributorForm('create')}</ModalBody><ModalFooter><Button variant="light" onPress={onClose}>取消</Button><Button color="primary" isLoading={formSubmitting} onPress={handleCreate}>创建账号</Button></ModalFooter></>}</ModalContent>
            </Modal>

            <Modal isOpen={editModal.isOpen} onOpenChange={editModal.onOpenChange} size="3xl" scrollBehavior="inside">
                <ModalContent>{(onClose) => <><ModalHeader>编辑分销商：{selectedDistributor?.username}</ModalHeader><ModalBody>{renderDistributorForm('edit')}</ModalBody><ModalFooter><Button variant="light" onPress={onClose}>取消</Button><Button color="primary" isLoading={formSubmitting} onPress={handleUpdate}>保存配置</Button></ModalFooter></>}</ModalContent>
            </Modal>

            <Modal isOpen={viewModal.isOpen} onOpenChange={viewModal.onOpenChange} size="3xl" scrollBehavior="inside">
                <ModalContent>{(onClose) => <><ModalHeader>分销商详情</ModalHeader><ModalBody>
                    {selectedDistributor && (
                        <Tabs aria-label="分销商详情分类" variant="underlined">
                            <Tab key="overview" title="概览"><div className="grid gap-4 py-3 sm:grid-cols-2">
                                <Card shadow="none"><CardBody><p className="text-sm text-default-500">账号状态</p><div className="mt-2"><Chip color={selectedDistributor.status === 1 ? 'success' : 'danger'} variant="flat">{selectedDistributor.status === 1 ? '启用' : '停用'}</Chip></div></CardBody></Card>
                                <Card shadow="none"><CardBody><p className="text-sm text-default-500">等级 / 余额</p><p className="mt-2 font-medium">L{selectedDistributor.level || 1} / ¥{Number(selectedDistributor.balance || 0).toFixed(2)}</p></CardBody></Card>
                                <Card shadow="none"><CardBody><p className="text-sm text-default-500">创建时间</p><p className="mt-2">{selectedDistributor.created_at ? dayjs(selectedDistributor.created_at).format('YYYY-MM-DD HH:mm:ss') : '-'}</p></CardBody></Card>
                                <Card shadow="none"><CardBody><p className="text-sm text-default-500">折扣有效期</p><p className="mt-2 font-medium">{selectedDistributor.expires_at ? dayjs(selectedDistributor.expires_at).format('YYYY-MM-DD HH:mm') : '永久有效'}</p><Chip className="mt-2" size="sm" color={selectedDistributor.discount_active === false ? 'warning' : 'success'} variant="flat">{selectedDistributor.discount_active === false ? '已到期，生成卡密按原价' : '折扣有效'}</Chip></CardBody></Card>
                                <Card shadow="none"><CardBody><p className="text-sm text-default-500">更新时间</p><p className="mt-2">{selectedDistributor.updated_at ? dayjs(selectedDistributor.updated_at).format('YYYY-MM-DD HH:mm:ss') : '-'}</p></CardBody></Card>
                            </div></Tab>
                            <Tab key="site" title="域名与内容"><div className="space-y-4 py-3">
                                <div><p className="mb-2 text-sm text-default-500">绑定域名</p><div className="flex flex-wrap gap-2">{parseStoredDomains(selectedDistributor).length === 0 ? <Chip variant="flat">未绑定</Chip> : parseStoredDomains(selectedDistributor).map((domain) => <Chip key={domain} color="primary" variant="flat" startContent={<Globe className="h-3 w-3" />}>{domain}</Chip>)}</div></div>
                                <Card shadow="none"><CardBody><p className="text-sm text-default-500">公告</p><p className="mt-2 whitespace-pre-wrap">{selectedDistributor.notice || '-'}</p></CardBody></Card>
                            </div></Tab>
                            <Tab key="permissions" title="权限"><div className="space-y-3 py-3">{PERMISSIONS.map(({ key, label, description }) => <Alert key={key} isVisible color={selectedDistributor[key] !== false ? 'success' : 'default'} title={`${label}：${selectedDistributor[key] !== false ? '已开通' : '未开通'}`} description={description} />)}</div></Tab>
                            <Tab key="notes" title="备注"><Card className="my-3" shadow="none"><CardBody><p className="whitespace-pre-wrap">{selectedDistributor.remarks || '无管理员备注'}</p></CardBody></Card></Tab>
                        </Tabs>
                    )}
                </ModalBody><ModalFooter><Button color="primary" onPress={onClose}>关闭</Button></ModalFooter></>}</ModalContent>
            </Modal>

            <Modal isOpen={balanceModal.isOpen} onOpenChange={balanceModal.onOpenChange} size="3xl" scrollBehavior="inside">
                <ModalContent>{(onClose) => <><ModalHeader>余额管理：{selectedDistributor?.username}</ModalHeader><ModalBody className="gap-5">
                    <div className="grid gap-4 sm:grid-cols-2"><Card shadow="none"><CardBody><p className="text-sm text-default-500">当前余额</p><p className="mt-1 text-3xl font-semibold">¥{Number(selectedDistributor?.balance || 0).toFixed(2)}</p></CardBody></Card><Card shadow="none"><CardBody><p className="text-sm text-default-500">操作后余额</p><p className={`mt-1 text-3xl font-semibold ${projectedBalance < 0 ? 'text-danger' : ''}`}>¥{projectedBalance.toFixed(2)}</p></CardBody></Card></div>
                    <Form className="grid gap-4 sm:grid-cols-2" onSubmit={(event) => { event.preventDefault(); handleBalanceChange(); }}>
                        <Select label="余额操作" selectedKeys={[balanceAction]} onSelectionChange={(keys) => setBalanceAction(String(Array.from(keys)[0] || 'recharge') as 'recharge' | 'deduct')}><SelectItem key="recharge">充值（增加余额）</SelectItem><SelectItem key="deduct">扣减（减少余额）</SelectItem></Select>
                        <NumberInput label="金额（元）" value={balanceAmount} onValueChange={(value) => setBalanceAmount(toOptionalRate(value))} minValue={0.01} step={0.01} isRequired />
                        <Input className="sm:col-span-2" label="操作备注" value={balanceRemarks} onValueChange={setBalanceRemarks} placeholder="例如：首次充值、季度返点、退款扣减" />
                        <Button className="sm:col-span-2" type="submit" color={balanceAction === 'recharge' ? 'success' : 'danger'} isLoading={balanceSubmitting}>{balanceAction === 'recharge' ? '确认充值' : '确认扣减'}</Button>
                    </Form>
                    <Divider />
                    <div><div className="mb-3 flex items-center justify-between"><p className="font-medium">最近余额流水</p><Button size="sm" variant="flat" startContent={<RefreshCw className="h-4 w-4" />} onPress={() => selectedDistributor && loadBalanceLogs(selectedDistributor)}>刷新</Button></div>
                        <Table aria-label="分销商余额流水"><TableHeader><TableColumn>变动</TableColumn><TableColumn>操作后余额</TableColumn><TableColumn>说明</TableColumn><TableColumn>时间</TableColumn></TableHeader><TableBody isLoading={balanceLoading} loadingContent={<Spinner label="加载流水中..." />} emptyContent="暂无余额流水">{balanceLogs.map((log) => <TableRow key={log.id}><TableCell><strong className={log.change_amount >= 0 ? 'text-success' : 'text-danger'}>{log.change_amount >= 0 ? '+' : ''}{Number(log.change_amount).toFixed(2)}</strong></TableCell><TableCell>¥{Number(log.balance_after).toFixed(2)}</TableCell><TableCell><span className="block max-w-72 truncate" title={log.remarks || log.type}>{log.remarks || log.type}</span></TableCell><TableCell>{dayjs(log.created_at).format('YYYY-MM-DD HH:mm:ss')}</TableCell></TableRow>)}</TableBody></Table>
                    </div>
                </ModalBody><ModalFooter><Button onPress={onClose}>关闭</Button></ModalFooter></>}</ModalContent>
            </Modal>

            <Modal isOpen={discountModal.isOpen} onOpenChange={discountModal.onOpenChange} size="4xl" scrollBehavior="inside">
                <ModalContent>{(onClose) => <><ModalHeader>折扣设置：{selectedDistributor?.username}</ModalHeader><ModalBody>
                    <Alert isVisible color="primary" title="折扣生效优先级" description="分销商×套餐 > 分销商整体 > 等级×套餐 > 等级整体 > 原价。留空表示继承下一级规则；折扣率 0.8 表示 8 折。" />
                    {discountLoading ? <div className="flex min-h-80 items-center justify-center"><Spinner label="加载折扣配置中..." /></div> : (
                        <Tabs aria-label="折扣配置分类" variant="underlined" className="mt-3">
                            <Tab key="distributor" title="本分销商专属折扣">{renderDiscountEditor(distOverall, setDistOverall, distPackageRates, setDistPackageRates, '保存专属折扣', saveDistributorDiscount, 'primary')}</Tab>
                            <Tab key="level" title={`等级 L${currentLevel} 默认折扣`}><Alert isVisible color="warning" variant="flat" title={`会影响所有等级 L${currentLevel} 的分销商`} description="已有专属折扣的分销商仍优先使用专属规则。" className="mb-4" />{renderDiscountEditor(levelOverall, setLevelOverall, levelPackageRates, setLevelPackageRates, `保存等级 L${currentLevel} 折扣`, saveLevelDiscount, 'secondary')}</Tab>
                        </Tabs>
                    )}
                </ModalBody><ModalFooter><Button onPress={onClose}>关闭</Button></ModalFooter></>}</ModalContent>
            </Modal>

            <Modal isOpen={statusModal.isOpen} onOpenChange={statusModal.onOpenChange} placement="center">
                <ModalContent>{(onClose) => <><ModalHeader>{selectedDistributor?.status === 1 ? '停用分销商账号' : '启用分销商账号'}</ModalHeader><ModalBody className="gap-3">
                    <Alert
                        isVisible
                        color={selectedDistributor?.status === 1 ? 'warning' : 'success'}
                        title={selectedDistributor?.username || '未选择账号'}
                        description={selectedDistributor?.status === 1
                            ? '停用会立即终止所有设备会话，并让域名映射和该分销商卡密的后续兑换失效；历史卡密与流水仍会保留。'
                            : '启用后会恢复域名映射和名下有效卡密的兑换；能否重新登录还取决于“登录分销商后台”权限。'}
                    />
                    <p className="text-sm text-default-600">确认执行此状态变更吗？</p>
                </ModalBody><ModalFooter><Button variant="light" onPress={onClose}>取消</Button><Button color={selectedDistributor?.status === 1 ? 'warning' : 'success'} isLoading={statusSubmitting} onPress={handleToggleStatus}>确认{selectedDistributor?.status === 1 ? '停用' : '启用'}</Button></ModalFooter></>}</ModalContent>
            </Modal>

            <Modal isOpen={deleteModal.isOpen} onOpenChange={deleteModal.onOpenChange} placement="center">
                <ModalContent>{(onClose) => <><ModalHeader className="text-danger">删除分销商账号记录</ModalHeader><ModalBody className="gap-3"><Alert isVisible color="danger" title="优先考虑停用账号" description="删除只移除分销商账号记录，不会自动回收此前生成的卡密，也不会清理历史余额流水。删除后无法在分销商后台登录。" /><p>确定删除 <strong>{selectedDistributor?.username}</strong> 吗？</p></ModalBody><ModalFooter><Button variant="light" onPress={onClose}>取消</Button><Button color="danger" isLoading={formSubmitting} onPress={handleDelete}>确认删除</Button></ModalFooter></>}</ModalContent>
            </Modal>
        </div>
    );
};

export default DistributorsManagePage;
