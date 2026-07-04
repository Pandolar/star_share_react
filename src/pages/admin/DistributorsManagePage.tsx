import React, { useState, useEffect, useCallback } from 'react';
import {
    Table,
    TableHeader,
    TableColumn,
    TableBody,
    TableRow,
    TableCell,
    Input,
    Button,
    Chip,
    Pagination,
    Modal,
    ModalContent,
    ModalHeader,
    ModalBody,
    ModalFooter,
    useDisclosure,
    Card,
    CardBody,
    Textarea,
    Spinner,
    Switch,
} from '@heroui/react';
import {
    Search,
    Plus,
    Edit,
    Trash2,
    Eye,
    RefreshCw,
    Users,
    Globe,
    CheckCircle2,
    XCircle,
    Wallet,
    Percent,
} from 'lucide-react';
import dayjs from 'dayjs';
import adminApiService from '../../services/adminApi';
import { showToast } from '../../components/Toast';

interface Distributor {
    id: number;
    username: string;
    status: number;
    domains: string;
    notice: string;
    notice_id: string;
    purchase_url: string;
    customer_service_url: string;
    remarks: string;
    balance: number;
    level: number;
    default_cdk_expire_days: number;
    can_login: boolean;
    can_generate_cdk: boolean;
    can_edit_notice: boolean;
    can_edit_links: boolean;
    created_at: string;
    updated_at: string;
}

interface DistributorFormState {
    username: string;
    password: string;
    domains: string[];
    remarks: string;
    status: number;
    level: number;
    default_cdk_expire_days: number;
    can_login: boolean;
    can_generate_cdk: boolean;
    can_edit_notice: boolean;
    can_edit_links: boolean;
}

const DEFAULT_FORM: DistributorFormState = {
    username: '',
    password: '',
    domains: [],
    remarks: '',
    status: 1,
    level: 1,
    default_cdk_expire_days: 90,
    can_login: true,
    can_generate_cdk: true,
    can_edit_notice: true,
    can_edit_links: true,
};

const PERMISSION_FIELDS: { key: keyof DistributorFormState; label: string }[] = [
    { key: 'can_login', label: '登录后台' },
    { key: 'can_generate_cdk', label: '生成卡密' },
    { key: 'can_edit_notice', label: '自定义公告' },
    { key: 'can_edit_links', label: '改购买/客服链接' },
];

/**
 * 分销商管理页面
 */
const DistributorsManagePage: React.FC = () => {
    const [distributors, setDistributors] = useState<Distributor[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [total, setTotal] = useState(0);
    const [selectedDistributor, setSelectedDistributor] = useState<Distributor | null>(null);
    const [pageSize] = useState<number>(10);

    // Modal控制
    const { isOpen: isCreateOpen, onOpen: onCreateOpen, onClose: onCreateClose } = useDisclosure();
    const { isOpen: isEditOpen, onOpen: onEditOpen, onClose: onEditClose } = useDisclosure();
    const { isOpen: isViewOpen, onOpen: onViewOpen, onClose: onViewClose } = useDisclosure();
    const { isOpen: isDeleteOpen, onOpen: onDeleteOpen, onClose: onDeleteClose } = useDisclosure();
    const { isOpen: isBalanceOpen, onOpen: onBalanceOpen, onClose: onBalanceClose } = useDisclosure();
    const { isOpen: isDiscountOpen, onOpen: onDiscountOpen, onClose: onDiscountClose } = useDisclosure();

    // 表单数据
    const [formData, setFormData] = useState<DistributorFormState>({ ...DEFAULT_FORM });
    const [domainsInput, setDomainsInput] = useState('');

    // 充值相关
    const [rechargeAmount, setRechargeAmount] = useState('');
    const [rechargeRemarks, setRechargeRemarks] = useState('');
    const [balanceLogs, setBalanceLogs] = useState<any[]>([]);

    // 折扣相关
    const [packageOptions, setPackageOptions] = useState<Array<{ id: number; package_name: string }>>([]);
    const [currentLevel, setCurrentLevel] = useState<number>(1);
    const [levelMapRaw, setLevelMapRaw] = useState<Record<string, any>>({});
    // 本分销商个体折扣（输入框用字符串）
    const [distOverall, setDistOverall] = useState<string>('');
    const [distPkgRates, setDistPkgRates] = useState<Record<string, string>>({});
    // 当前等级默认折扣
    const [levelOverall, setLevelOverall] = useState<string>('');
    const [levelPkgRates, setLevelPkgRates] = useState<Record<string, string>>({});

    // 获取分销商列表
    const fetchDistributors = useCallback(async () => {
        try {
            setLoading(true);
            const params: any = {
                page: currentPage,
                page_size: pageSize,
            };
            if (searchQuery) params.search = searchQuery;

            const response = await adminApiService.getDistributors(params);
            if (response.code === 20000) {
                const data = Array.isArray(response.data) ? response.data : response.data?.list || [];
                setDistributors(data);
                setTotal(response.data?.total || data.length);
                setTotalPages(Math.ceil((response.data?.total || data.length) / pageSize));
            } else {
                showToast(response.msg || '获取分销商列表失败', 'error');
            }
        } catch (error: any) {
            console.error('获取分销商列表失败:', error);
            showToast(error.message || '获取分销商列表失败', 'error');
        } finally {
            setLoading(false);
        }
    }, [currentPage, pageSize, searchQuery]);

    useEffect(() => {
        fetchDistributors();
    }, [fetchDistributors]);

    // 创建分销商
    const handleCreate = async () => {
        try {
            if (!formData.username || !formData.password) {
                showToast('请填写账号和密码', 'error');
                return;
            }

            const domains = domainsInput
                .split('\n')
                .map(d => d.trim())
                .filter(d => d.length > 0);

            if (domains.length === 0) {
                showToast('请至少添加一个域名', 'error');
                return;
            }

            const requestData = {
                username: formData.username!,
                password: formData.password!,
                domains: domains,
                remarks: formData.remarks,
                level: formData.level,
                default_cdk_expire_days: formData.default_cdk_expire_days,
                can_login: formData.can_login,
                can_generate_cdk: formData.can_generate_cdk,
                can_edit_notice: formData.can_edit_notice,
                can_edit_links: formData.can_edit_links,
            };

            const response = await adminApiService.createDistributor(requestData);
            if (response.code === 20000) {
                showToast('创建成功', 'success');
                onCreateClose();
                resetForm();
                fetchDistributors();
            } else {
                showToast(response.msg || '创建失败', 'error');
            }
        } catch (error: any) {
            console.error('创建分销商失败:', error);
            showToast(error.message || '创建失败', 'error');
        }
    };

    // 更新分销商
    const handleUpdate = async () => {
        try {
            if (!selectedDistributor) return;

            const domains = domainsInput
                .split('\n')
                .map(d => d.trim())
                .filter(d => d.length > 0);

            const requestData = {
                id: selectedDistributor.id,
                username: formData.username,
                password: formData.password,
                status: formData.status,
                domains: domains.length > 0 ? domains : undefined,
                remarks: formData.remarks,
                level: formData.level,
                default_cdk_expire_days: formData.default_cdk_expire_days,
                can_login: formData.can_login,
                can_generate_cdk: formData.can_generate_cdk,
                can_edit_notice: formData.can_edit_notice,
                can_edit_links: formData.can_edit_links,
            };

            const response = await adminApiService.updateDistributor(requestData);
            if (response.code === 20000) {
                showToast('更新成功', 'success');
                onEditClose();
                resetForm();
                fetchDistributors();
            } else {
                showToast(response.msg || '更新失败', 'error');
            }
        } catch (error: any) {
            console.error('更新分销商失败:', error);
            showToast(error.message || '更新失败', 'error');
        }
    };

    // 删除分销商
    const handleDelete = async () => {
        try {
            if (!selectedDistributor) return;

            const response = await adminApiService.deleteDistributor(selectedDistributor.id);
            if (response.code === 20000) {
                showToast('删除成功', 'success');
                onDeleteClose();
                fetchDistributors();
            } else {
                showToast(response.msg || '删除失败', 'error');
            }
        } catch (error: any) {
            console.error('删除分销商失败:', error);
            showToast(error.message || '删除失败', 'error');
        }
    };

    // 重置表单
    const resetForm = () => {
        setFormData({ ...DEFAULT_FORM });
        setDomainsInput('');
        setSelectedDistributor(null);
    };

    // 打开创建Modal
    const openCreateModal = () => {
        resetForm();
        onCreateOpen();
    };

    // 打开编辑Modal
    const openEditModal = (distributor: Distributor) => {
        setSelectedDistributor(distributor);
        let domains: string[] = [];
        try {
            domains = JSON.parse(distributor.domains || '[]');
        } catch {
            domains = [];
        }
        setFormData({
            username: distributor.username,
            password: '',
            domains: [],
            remarks: distributor.remarks || '',
            status: distributor.status,
            level: distributor.level ?? 1,
            default_cdk_expire_days: distributor.default_cdk_expire_days ?? 90,
            can_login: distributor.can_login ?? true,
            can_generate_cdk: distributor.can_generate_cdk ?? true,
            can_edit_notice: distributor.can_edit_notice ?? true,
            can_edit_links: distributor.can_edit_links ?? true,
        });
        setDomainsInput(domains.join('\n'));
        onEditOpen();
    };

    // 打开查看Modal
    const openViewModal = (distributor: Distributor) => {
        setSelectedDistributor(distributor);
        onViewOpen();
    };

    // 打开删除Modal
    const openDeleteModal = (distributor: Distributor) => {
        setSelectedDistributor(distributor);
        onDeleteOpen();
    };

    // ===== 余额充值 =====
    const openBalanceModal = async (distributor: Distributor) => {
        setSelectedDistributor(distributor);
        setRechargeAmount('');
        setRechargeRemarks('');
        setBalanceLogs([]);
        onBalanceOpen();
        try {
            const res = await adminApiService.getDistributorBalanceLog({ distributor_id: distributor.id, page: 1, page_size: 20 });
            if (res.code === 20000) {
                setBalanceLogs(res.data?.logs || []);
            }
        } catch (e) { /* 忽略流水加载失败 */ }
    };

    const handleRecharge = async (sign: 1 | -1) => {
        if (!selectedDistributor) return;
        const num = parseFloat(rechargeAmount);
        if (isNaN(num) || num <= 0) {
            showToast('请输入正确的金额', 'error');
            return;
        }
        try {
            const res = await adminApiService.rechargeDistributorBalance({
                distributor_id: selectedDistributor.id,
                amount: sign * num,
                remarks: rechargeRemarks,
            });
            if (res.code === 20000) {
                showToast(sign > 0 ? '充值成功' : '扣减成功', 'success');
                setRechargeAmount('');
                setRechargeRemarks('');
                openBalanceModal(selectedDistributor); // 刷新流水
                fetchDistributors();
            } else {
                showToast(res.msg || '操作失败', 'error');
            }
        } catch (e: any) {
            showToast(e.message || '操作失败', 'error');
        }
    };

    // ===== 折扣（无独立折扣表：个体折扣存分销商，等级默认折扣存全局配置）=====
    const ratesFromConfig = (cfg: any): { overall: string; pkgRates: Record<string, string> } => {
        const overall = cfg?.overall != null ? String(cfg.overall) : '';
        const pkgRates: Record<string, string> = {};
        const packages = cfg?.packages || {};
        Object.entries(packages).forEach(([pid, r]) => { pkgRates[String(pid)] = String(r); });
        return { overall, pkgRates };
    };

    const buildConfig = (overall: string, pkgRates: Record<string, string>): { ok: boolean; cfg?: any; err?: string } => {
        const cfg: any = {};
        const check = (v: string): number | null => {
            if (v === '' || v == null) return null;
            const n = Number(v);
            if (isNaN(n) || n <= 0 || n > 1) return NaN as any;
            return Math.round(n * 10000) / 10000;
        };
        const ov = check(overall);
        if (Number.isNaN(ov as any)) return { ok: false, err: '整体折扣率需在 (0,1] 之间' };
        if (ov != null) cfg.overall = ov;
        const packages: Record<string, number> = {};
        for (const [pid, raw] of Object.entries(pkgRates)) {
            const n = check(raw);
            if (Number.isNaN(n as any)) return { ok: false, err: '套餐折扣率需在 (0,1] 之间' };
            if (n != null) packages[pid] = n;
        }
        if (Object.keys(packages).length) cfg.packages = packages;
        return { ok: true, cfg };
    };

    const loadDiscounts = async (distributor: Distributor) => {
        try {
            const [dRes, pRes] = await Promise.all([
                adminApiService.getDistributorDiscounts({ distributor_id: distributor.id }),
                adminApiService.getPackages({ current_page: 1, page_size: 1000 }),
            ]);
            if (pRes.code === 20000) {
                const list: any[] = Array.isArray(pRes.data) ? pRes.data : [];
                setPackageOptions(list.map((p: any) => ({ id: p.id, package_name: p.package_name })));
            }
            if (dRes.code === 20000) {
                const levelMap = dRes.data?.level_discounts || {};
                setLevelMapRaw(levelMap);
                const dcfg = dRes.data?.distributor?.discount_config || {};
                const dr = ratesFromConfig(dcfg);
                setDistOverall(dr.overall);
                setDistPkgRates(dr.pkgRates);
                const lvl = distributor.level ?? 1;
                const lr = ratesFromConfig(levelMap[String(lvl)] || {});
                setLevelOverall(lr.overall);
                setLevelPkgRates(lr.pkgRates);
            }
        } catch (e) { /* 忽略 */ }
    };

    const openDiscountModal = (distributor: Distributor) => {
        setSelectedDistributor(distributor);
        setCurrentLevel(distributor.level ?? 1);
        setPackageOptions([]);
        setLevelMapRaw({});
        setDistOverall(''); setDistPkgRates({});
        setLevelOverall(''); setLevelPkgRates({});
        onDiscountOpen();
        loadDiscounts(distributor);
    };

    const handleSaveDistDiscount = async () => {
        if (!selectedDistributor) return;
        const built = buildConfig(distOverall, distPkgRates);
        if (!built.ok) { showToast(built.err || '折扣率格式错误', 'error'); return; }
        try {
            const res = await adminApiService.saveDistributorDiscount({
                distributor_id: selectedDistributor.id,
                discount_config: built.cfg,
            });
            if (res.code === 20000) {
                showToast('本分销商折扣已保存', 'success');
                loadDiscounts(selectedDistributor);
            } else {
                showToast(res.msg || '保存失败', 'error');
            }
        } catch (e: any) {
            showToast(e.response?.data?.msg || e.message || '保存失败', 'error');
        }
    };

    const handleSaveLevelDiscount = async () => {
        const built = buildConfig(levelOverall, levelPkgRates);
        if (!built.ok) { showToast(built.err || '折扣率格式错误', 'error'); return; }
        // 合并当前等级到完整 map（其它等级保持不变）
        const merged: Record<string, any> = { ...levelMapRaw };
        if (built.cfg && Object.keys(built.cfg).length) {
            merged[String(currentLevel)] = built.cfg;
        } else {
            delete merged[String(currentLevel)];
        }
        try {
            const res = await adminApiService.saveLevelDiscounts(merged);
            if (res.code === 20000) {
                showToast(`等级 L${currentLevel} 默认折扣已保存`, 'success');
                setLevelMapRaw(merged);
            } else {
                showToast(res.msg || '保存失败', 'error');
            }
        } catch (e: any) {
            showToast(e.response?.data?.msg || e.message || '保存失败', 'error');
        }
    };

    // 快速切换状态
    const toggleStatus = async (distributor: Distributor) => {
        try {
            const newStatus = distributor.status === 1 ? 0 : 1;
            const response = await adminApiService.updateDistributor({
                id: distributor.id,
                status: newStatus,
            });
            if (response.code === 20000) {
                showToast(newStatus === 1 ? '已启用' : '已禁用', 'success');
                fetchDistributors();
            } else {
                showToast(response.msg || '操作失败', 'error');
            }
        } catch (error: any) {
            console.error('切换状态失败:', error);
            showToast(error.message || '操作失败', 'error');
        }
    };

    // 解析域名数组
    const parseDomains = (domainsStr: string): string[] => {
        try {
            return JSON.parse(domainsStr || '[]');
        } catch {
            return [];
        }
    };

    return (
        <div className="space-y-6">
            {/* 页面标题 */}
            <div>
                <div className="flex items-center gap-3 mb-2">
                    <Users className="w-6 h-6 text-blue-600" />
                    <h1 className="text-2xl font-bold text-default-800">分销商管理</h1>
                </div>
                <p className="text-default-500">管理白牌分销商账号、域名和配置</p>
            </div>

            {/* 工具栏 */}
            <Card>
                <CardBody>
                    <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                        <div className="flex gap-3 items-center flex-1 w-full sm:w-auto">
                            <Input
                                placeholder="搜索账号、域名、备注..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && fetchDistributors()}
                                startContent={<Search size={18} />}
                                className="max-w-md"
                            />
                            <Button
                                color="primary"
                                variant="flat"
                                onPress={fetchDistributors}
                                isIconOnly
                            >
                                <RefreshCw size={18} />
                            </Button>
                        </div>
                        <Button
                            color="primary"
                            onPress={openCreateModal}
                            startContent={<Plus size={18} />}
                        >
                            创建分销商
                        </Button>
                    </div>
                </CardBody>
            </Card>

            {/* 统计信息 */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card>
                    <CardBody className="text-center">
                        <p className="text-default-500 text-sm">总分销商</p>
                        <p className="text-2xl font-bold">{total}</p>
                    </CardBody>
                </Card>
                <Card>
                    <CardBody className="text-center">
                        <p className="text-default-500 text-sm">启用中</p>
                        <p className="text-2xl font-bold text-success">
                            {distributors.filter(d => d.status === 1).length}
                        </p>
                    </CardBody>
                </Card>
                <Card>
                    <CardBody className="text-center">
                        <p className="text-default-500 text-sm">已禁用</p>
                        <p className="text-2xl font-bold text-danger">
                            {distributors.filter(d => d.status === 0).length}
                        </p>
                    </CardBody>
                </Card>
            </div>

            {/* 分销商表格 */}
            <Card>
                <CardBody>
                    {loading ? (
                        <div className="flex justify-center items-center py-20">
                            <Spinner size="lg" />
                        </div>
                    ) : (
                        <>
                            <Table
                                aria-label="分销商列表"
                                className="min-h-[400px]"
                            >
                                <TableHeader>
                                    <TableColumn>ID</TableColumn>
                                    <TableColumn>账号</TableColumn>
                                    <TableColumn>状态</TableColumn>
                                    <TableColumn>等级</TableColumn>
                                    <TableColumn>余额</TableColumn>
                                    <TableColumn>域名</TableColumn>
                                    <TableColumn>备注</TableColumn>
                                    <TableColumn>创建时间</TableColumn>
                                    <TableColumn>操作</TableColumn>
                                </TableHeader>
                                <TableBody emptyContent="暂无分销商">
                                    {distributors.map((distributor) => {
                                        const domains = parseDomains(distributor.domains);
                                        return (
                                            <TableRow key={distributor.id}>
                                                <TableCell>{distributor.id}</TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-2">
                                                        <Users size={16} className="text-default-400" />
                                                        <span className="font-medium">{distributor.username}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <Switch
                                                        isSelected={distributor.status === 1}
                                                        onValueChange={() => toggleStatus(distributor)}
                                                        size="sm"
                                                        color="success"
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <Chip size="sm" variant="flat" color="secondary">L{distributor.level ?? 1}</Chip>
                                                </TableCell>
                                                <TableCell>
                                                    <span className="font-medium text-success">¥{Number(distributor.balance ?? 0).toFixed(2)}</span>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex flex-wrap gap-1">
                                                        {domains.slice(0, 2).map((domain, idx) => (
                                                            <Chip
                                                                key={idx}
                                                                size="sm"
                                                                variant="flat"
                                                                color="primary"
                                                                startContent={<Globe size={12} />}
                                                            >
                                                                {domain}
                                                            </Chip>
                                                        ))}
                                                        {domains.length > 2 && (
                                                            <Chip size="sm" variant="flat">
                                                                +{domains.length - 2}
                                                            </Chip>
                                                        )}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <span className="text-sm text-default-500">
                                                        {distributor.remarks || '-'}
                                                    </span>
                                                </TableCell>
                                                <TableCell>
                                                    <span className="text-sm">
                                                        {dayjs(distributor.created_at).format('YYYY-MM-DD HH:mm')}
                                                    </span>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex gap-2">
                                                        <Button
                                                            size="sm"
                                                            variant="flat"
                                                            color="success"
                                                            onPress={() => openBalanceModal(distributor)}
                                                            isIconOnly
                                                            title="余额充值"
                                                        >
                                                            <Wallet size={16} />
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            variant="flat"
                                                            color="secondary"
                                                            onPress={() => openDiscountModal(distributor)}
                                                            isIconOnly
                                                            title="折扣设置"
                                                        >
                                                            <Percent size={16} />
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            variant="flat"
                                                            color="primary"
                                                            onPress={() => openViewModal(distributor)}
                                                            isIconOnly
                                                        >
                                                            <Eye size={16} />
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            variant="flat"
                                                            color="warning"
                                                            onPress={() => openEditModal(distributor)}
                                                            isIconOnly
                                                        >
                                                            <Edit size={16} />
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            variant="flat"
                                                            color="danger"
                                                            onPress={() => openDeleteModal(distributor)}
                                                            isIconOnly
                                                        >
                                                            <Trash2 size={16} />
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>

                            {/* 分页 */}
                            {totalPages > 1 && (
                                <div className="flex justify-center mt-4">
                                    <Pagination
                                        total={totalPages}
                                        page={currentPage}
                                        onChange={setCurrentPage}
                                        showControls
                                    />
                                </div>
                            )}
                        </>
                    )}
                </CardBody>
            </Card>

            {/* 创建分销商Modal */}
            <Modal isOpen={isCreateOpen} onClose={onCreateClose} size="2xl">
                <ModalContent>
                    <ModalHeader>创建分销商</ModalHeader>
                    <ModalBody>
                        <div className="space-y-4">
                            <Input
                                label="账号"
                                placeholder="请输入分销商账号"
                                value={formData.username}
                                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                isRequired
                            />
                            <Input
                                label="密码"
                                type="password"
                                placeholder="请输入密码（至少8位）"
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                isRequired
                            />
                            <Textarea
                                label="域名列表"
                                placeholder="每行一个域名，例如：&#10;aaa.com&#10;www.aaa.com"
                                value={domainsInput}
                                onChange={(e) => setDomainsInput(e.target.value)}
                                minRows={4}
                                isRequired
                                description="分销商的白牌域名，一个域名只能属于一个分销商"
                            />
                            <Textarea
                                label="备注"
                                placeholder="请输入备注信息"
                                value={formData.remarks}
                                onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                                minRows={2}
                            />
                            <div className="grid grid-cols-2 gap-4">
                                <Input
                                    type="number"
                                    label="分销商等级"
                                    value={String(formData.level)}
                                    onChange={(e) => setFormData({ ...formData, level: Number(e.target.value) || 1 })}
                                    min={1}
                                    description="用于匹配等级默认折扣"
                                />
                                <Input
                                    type="number"
                                    label="默认CDK过期天数"
                                    value={String(formData.default_cdk_expire_days)}
                                    onChange={(e) => setFormData({ ...formData, default_cdk_expire_days: Number(e.target.value) || 0 })}
                                    min={0}
                                    description="0=永不过期，分销商生成时默认使用"
                                />
                            </div>
                            <div>
                                <p className="text-sm text-default-500 mb-2">权限开关</p>
                                <div className="grid grid-cols-2 gap-3">
                                    {PERMISSION_FIELDS.map(({ key, label }) => (
                                        <Switch
                                            key={key}
                                            size="sm"
                                            isSelected={formData[key] as boolean}
                                            onValueChange={(v) => setFormData({ ...formData, [key]: v })}
                                        >
                                            {label}
                                        </Switch>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </ModalBody>
                    <ModalFooter>
                        <Button variant="flat" onPress={onCreateClose}>
                            取消
                        </Button>
                        <Button color="primary" onPress={handleCreate}>
                            创建
                        </Button>
                    </ModalFooter>
                </ModalContent>
            </Modal>

            {/* 编辑分销商Modal */}
            <Modal isOpen={isEditOpen} onClose={onEditClose} size="2xl">
                <ModalContent>
                    <ModalHeader>编辑分销商</ModalHeader>
                    <ModalBody>
                        <div className="space-y-4">
                            <Input
                                label="账号"
                                placeholder="请输入分销商账号"
                                value={formData.username}
                                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                            />
                            <Input
                                label="新密码"
                                type="password"
                                placeholder="留空则不修改密码"
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                description="留空表示不修改密码"
                            />
                            <Textarea
                                label="域名列表"
                                placeholder="每行一个域名"
                                value={domainsInput}
                                onChange={(e) => setDomainsInput(e.target.value)}
                                minRows={4}
                            />
                            <Textarea
                                label="备注"
                                placeholder="请输入备注信息"
                                value={formData.remarks}
                                onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                                minRows={2}
                            />
                            <div className="grid grid-cols-2 gap-4">
                                <Input
                                    type="number"
                                    label="分销商等级"
                                    value={String(formData.level)}
                                    onChange={(e) => setFormData({ ...formData, level: Number(e.target.value) || 1 })}
                                    min={1}
                                    description="用于匹配等级默认折扣"
                                />
                                <Input
                                    type="number"
                                    label="默认CDK过期天数"
                                    value={String(formData.default_cdk_expire_days)}
                                    onChange={(e) => setFormData({ ...formData, default_cdk_expire_days: Number(e.target.value) || 0 })}
                                    min={0}
                                    description="0=永不过期"
                                />
                            </div>
                            <div>
                                <p className="text-sm text-default-500 mb-2">权限开关</p>
                                <div className="grid grid-cols-2 gap-3">
                                    {PERMISSION_FIELDS.map(({ key, label }) => (
                                        <Switch
                                            key={key}
                                            size="sm"
                                            isSelected={formData[key] as boolean}
                                            onValueChange={(v) => setFormData({ ...formData, [key]: v })}
                                        >
                                            {label}
                                        </Switch>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </ModalBody>
                    <ModalFooter>
                        <Button variant="flat" onPress={onEditClose}>
                            取消
                        </Button>
                        <Button color="primary" onPress={handleUpdate}>
                            保存
                        </Button>
                    </ModalFooter>
                </ModalContent>
            </Modal>

            {/* 查看分销商Modal */}
            <Modal isOpen={isViewOpen} onClose={onViewClose} size="2xl">
                <ModalContent>
                    <ModalHeader>分销商详情</ModalHeader>
                    <ModalBody>
                        {selectedDistributor && (
                            <div className="space-y-4">
                                <div>
                                    <p className="text-sm text-default-500 mb-1">账号</p>
                                    <p className="font-medium">{selectedDistributor.username}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-default-500 mb-1">状态</p>
                                    <Chip
                                        color={selectedDistributor.status === 1 ? 'success' : 'danger'}
                                        variant="flat"
                                        startContent={selectedDistributor.status === 1 ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                                    >
                                        {selectedDistributor.status === 1 ? '启用' : '禁用'}
                                    </Chip>
                                </div>
                                <div>
                                    <p className="text-sm text-default-500 mb-2">域名列表</p>
                                    <div className="flex flex-wrap gap-2">
                                        {parseDomains(selectedDistributor.domains).map((domain, idx) => (
                                            <Chip key={idx} variant="flat" color="primary" startContent={<Globe size={12} />}>
                                                {domain}
                                            </Chip>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <p className="text-sm text-default-500 mb-1">公告</p>
                                    <p className="text-sm">{selectedDistributor.notice || '-'}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-default-500 mb-1">购买链接</p>
                                    <p className="text-sm break-all">{selectedDistributor.purchase_url || '-'}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-default-500 mb-1">客服链接</p>
                                    <p className="text-sm break-all">{selectedDistributor.customer_service_url || '-'}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-default-500 mb-1">备注</p>
                                    <p className="text-sm">{selectedDistributor.remarks || '-'}</p>
                                </div>
                                <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                                    <div>
                                        <p className="text-sm text-default-500 mb-1">创建时间</p>
                                        <p className="text-sm">{dayjs(selectedDistributor.created_at).format('YYYY-MM-DD HH:mm:ss')}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-default-500 mb-1">更新时间</p>
                                        <p className="text-sm">{dayjs(selectedDistributor.updated_at).format('YYYY-MM-DD HH:mm:ss')}</p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </ModalBody>
                    <ModalFooter>
                        <Button onPress={onViewClose}>关闭</Button>
                    </ModalFooter>
                </ModalContent>
            </Modal>

            {/* 余额充值Modal */}
            <Modal isOpen={isBalanceOpen} onClose={onBalanceClose} size="2xl">
                <ModalContent>
                    <ModalHeader>
                        余额管理 - {selectedDistributor?.username}
                    </ModalHeader>
                    <ModalBody>
                        <div className="space-y-4">
                            <Card>
                                <CardBody className="text-center">
                                    <p className="text-default-500 text-sm">当前余额</p>
                                    <p className="text-3xl font-bold text-success">
                                        ¥{Number(selectedDistributor?.balance ?? 0).toFixed(2)}
                                    </p>
                                </CardBody>
                            </Card>
                            <Input
                                type="number"
                                label="金额（元）"
                                placeholder="输入充值或扣减的金额"
                                value={rechargeAmount}
                                onChange={(e) => setRechargeAmount(e.target.value)}
                                min={0}
                            />
                            <Input
                                label="备注"
                                placeholder="可选，如：季度返点"
                                value={rechargeRemarks}
                                onChange={(e) => setRechargeRemarks(e.target.value)}
                            />
                            <div className="flex gap-3">
                                <Button color="success" className="flex-1" onPress={() => handleRecharge(1)}>
                                    充值（+）
                                </Button>
                                <Button color="danger" variant="flat" className="flex-1" onPress={() => handleRecharge(-1)}>
                                    扣减（-）
                                </Button>
                            </div>
                            <div>
                                <p className="text-sm text-default-500 mb-2">最近流水</p>
                                <div className="max-h-64 overflow-auto space-y-2">
                                    {balanceLogs.length === 0 && (
                                        <p className="text-sm text-default-400">暂无流水</p>
                                    )}
                                    {balanceLogs.map((log) => (
                                        <div key={log.id} className="flex justify-between text-sm border-b pb-1">
                                            <span>
                                                <span className={log.change_amount >= 0 ? 'text-success' : 'text-danger'}>
                                                    {log.change_amount >= 0 ? '+' : ''}{Number(log.change_amount).toFixed(2)}
                                                </span>
                                                <span className="text-default-400 ml-2">{log.type}</span>
                                                {log.remarks && <span className="text-default-400 ml-2">{log.remarks}</span>}
                                            </span>
                                            <span className="text-default-400">
                                                余额{Number(log.balance_after).toFixed(2)} · {dayjs(log.created_at).format('MM-DD HH:mm')}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </ModalBody>
                    <ModalFooter>
                        <Button onPress={onBalanceClose}>关闭</Button>
                    </ModalFooter>
                </ModalContent>
            </Modal>

            {/* 折扣设置Modal */}
            <Modal isOpen={isDiscountOpen} onClose={onDiscountClose} size="3xl">
                <ModalContent>
                    <ModalHeader>
                        折扣设置 - {selectedDistributor?.username}（当前等级 L{currentLevel}）
                    </ModalHeader>
                    <ModalBody>
                        <div className="space-y-5">
                            <p className="text-xs text-default-400">
                                生效优先级：分销商×套餐 &gt; 分销商整体 &gt; 等级×套餐 &gt; 等级整体 &gt; 原价。折扣率 0.8 表示 8 折；留空表示不设。
                            </p>

                            {/* 本分销商个体折扣 */}
                            <Card>
                                <CardBody className="space-y-3">
                                    <p className="text-sm font-semibold">本分销商专属折扣</p>
                                    <Input
                                        type="number"
                                        label="整体折扣率"
                                        size="sm"
                                        placeholder="如 0.8，留空=不设整体"
                                        value={distOverall}
                                        onChange={(e) => setDistOverall(e.target.value)}
                                        step={0.01}
                                        min={0}
                                        max={1}
                                    />
                                    <div className="space-y-2">
                                        <p className="text-xs text-default-500">按套餐定制（优先于整体）</p>
                                        {packageOptions.length === 0 && <p className="text-xs text-default-400">加载套餐中...</p>}
                                        {packageOptions.map((p) => (
                                            <div key={p.id} className="flex items-center gap-3">
                                                <span className="text-sm flex-1">{p.package_name}</span>
                                                <Input
                                                    type="number"
                                                    size="sm"
                                                    className="w-32"
                                                    placeholder="折扣率"
                                                    value={distPkgRates[String(p.id)] || ''}
                                                    onChange={(e) => setDistPkgRates({ ...distPkgRates, [String(p.id)]: e.target.value })}
                                                    step={0.01}
                                                    min={0}
                                                    max={1}
                                                />
                                            </div>
                                        ))}
                                    </div>
                                    <Button color="primary" size="sm" onPress={handleSaveDistDiscount}>
                                        保存本分销商折扣
                                    </Button>
                                </CardBody>
                            </Card>

                            {/* 等级默认折扣 */}
                            <Card>
                                <CardBody className="space-y-3">
                                    <p className="text-sm font-semibold">
                                        等级 L{currentLevel} 默认折扣
                                        <span className="text-xs text-default-400 font-normal ml-2">影响所有 L{currentLevel} 分销商</span>
                                    </p>
                                    <Input
                                        type="number"
                                        label="整体折扣率"
                                        size="sm"
                                        placeholder="如 0.9，留空=不设整体"
                                        value={levelOverall}
                                        onChange={(e) => setLevelOverall(e.target.value)}
                                        step={0.01}
                                        min={0}
                                        max={1}
                                    />
                                    <div className="space-y-2">
                                        <p className="text-xs text-default-500">按套餐定制（优先于整体）</p>
                                        {packageOptions.map((p) => (
                                            <div key={p.id} className="flex items-center gap-3">
                                                <span className="text-sm flex-1">{p.package_name}</span>
                                                <Input
                                                    type="number"
                                                    size="sm"
                                                    className="w-32"
                                                    placeholder="折扣率"
                                                    value={levelPkgRates[String(p.id)] || ''}
                                                    onChange={(e) => setLevelPkgRates({ ...levelPkgRates, [String(p.id)]: e.target.value })}
                                                    step={0.01}
                                                    min={0}
                                                    max={1}
                                                />
                                            </div>
                                        ))}
                                    </div>
                                    <Button color="secondary" size="sm" onPress={handleSaveLevelDiscount}>
                                        保存等级 L{currentLevel} 默认折扣
                                    </Button>
                                </CardBody>
                            </Card>
                        </div>
                    </ModalBody>
                    <ModalFooter>
                        <Button onPress={onDiscountClose}>关闭</Button>
                    </ModalFooter>
                </ModalContent>
            </Modal>

            {/* 删除确认Modal */}
            <Modal isOpen={isDeleteOpen} onClose={onDeleteClose}>
                <ModalContent>
                    <ModalHeader>确认删除</ModalHeader>
                    <ModalBody>
                        <p>确定要删除分销商 <strong>{selectedDistributor?.username}</strong> 吗？</p>
                        <p className="text-danger text-sm mt-2">注意：删除后将无法恢复，该分销商的所有配置将被清除。</p>
                    </ModalBody>
                    <ModalFooter>
                        <Button variant="flat" onPress={onDeleteClose}>
                            取消
                        </Button>
                        <Button color="danger" onPress={handleDelete}>
                            确认删除
                        </Button>
                    </ModalFooter>
                </ModalContent>
            </Modal>
        </div>
    );
};

export default DistributorsManagePage;
