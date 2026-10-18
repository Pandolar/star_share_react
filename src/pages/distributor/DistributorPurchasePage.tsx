import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Alert,
    Button,
    Card,
    CardBody,
    CardFooter,
    CardHeader,
    Chip,
    Divider,
    Form,
    Listbox,
    ListboxItem,
    Modal,
    ModalBody,
    ModalContent,
    ModalFooter,
    ModalHeader,
    NumberInput,
    Progress,
    Select,
    SelectItem,
    Spinner,
    Textarea,
    useDisclosure,
} from '@heroui/react';
import { RefreshCw, ShieldCheck, Ticket, Wallet } from 'lucide-react';
import dayjs from 'dayjs';
import distributorApiService from '../../services/distributorApi';
import type {
    BalanceLog,
    DistributorCdkStats,
    DistributorInfo,
    DistributorPackage,
} from '../../services/distributorApi';
import { showToast } from '../../components/Toast';

const EMPTY_STATS: DistributorCdkStats = { total: 0, used: 0, unused: 0, expired: 0 };
const formatDateTime = (value?: string | null) => (
    value && dayjs(value).isValid() ? dayjs(value).format('YYYY-MM-DD HH:mm') : '-'
);

const DistributorPurchasePage: React.FC = () => {
    const navigate = useNavigate();
    const [distributor, setDistributor] = useState<DistributorInfo | null>(null);
    const [loading, setLoading] = useState(true);
    const [pageError, setPageError] = useState('');
    const [balance, setBalance] = useState(0);
    const [balanceLogs, setBalanceLogs] = useState<BalanceLog[]>([]);
    const [packages, setPackages] = useState<DistributorPackage[]>([]);
    const [stats, setStats] = useState<DistributorCdkStats>(EMPTY_STATS);
    const [genPackageId, setGenPackageId] = useState('');
    const [genCount, setGenCount] = useState(1);
    const [genExpireDays, setGenExpireDays] = useState<number | undefined>(undefined);
    const [genRemarks, setGenRemarks] = useState('');
    const [generating, setGenerating] = useState(false);
    const generateModal = useDisclosure();

    const canGenerate = distributor?.permissions?.can_generate_cdk === true;
    const selectedPackage = packages.find((item) => String(item.package_id) === genPackageId);
    const estimatedCost = Number(((selectedPackage?.unit_price || 0) * (genCount || 0)).toFixed(2));
    const balanceCoverage = estimatedCost > 0 ? Math.min(100, Math.round((balance / estimatedCost) * 100)) : 100;
    const discountActive = distributor?.discount_active !== false;

    const loadPage = useCallback(async () => {
        setLoading(true);
        setPageError('');
        try {
            const response = await distributorApiService.getSettings();
            if (response.code !== 20000 || !response.data) throw new Error(response.msg || '获取账号配置失败');
            setDistributor(response.data);
            localStorage.setItem('distributor', JSON.stringify(response.data));
            const [statsResult, balanceResult, packagesResult] = await Promise.allSettled([
                distributorApiService.getCdkStats(),
                distributorApiService.getMyBalance({ current_page: 1, page_size: 20 }),
                distributorApiService.getPackages(),
            ]);
            if (statsResult.status === 'fulfilled' && statsResult.value.code === 20000 && statsResult.value.data) setStats(statsResult.value.data);
            if (response.data.permissions?.can_generate_cdk === true) {
                if (balanceResult.status === 'fulfilled' && balanceResult.value.code === 20000 && balanceResult.value.data) {
                    setBalance(Number(balanceResult.value.data.balance || 0));
                    setBalanceLogs(balanceResult.value.data.logs || []);
                }
                if (packagesResult.status === 'fulfilled' && packagesResult.value.code === 20000 && Array.isArray(packagesResult.value.data)) {
                    setPackages(packagesResult.value.data);
                    setGenPackageId((current) => current || String(packagesResult.value.data?.[0]?.package_id || ''));
                }
            }
        } catch (error: unknown) {
            setPageError(error instanceof Error ? error.message : '页面加载失败，请稍后重试');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { void loadPage(); }, [loadPage]);

    const refreshBalance = async () => {
        const response = await distributorApiService.getMyBalance({ current_page: 1, page_size: 20 });
        if (response.code === 20000 && response.data) {
            setBalance(Number(response.data.balance || 0));
            setBalanceLogs(response.data.logs || []);
        }
    };

    const openGenerateConfirmation = () => {
        if (!selectedPackage) { showToast('请选择套餐', 'warning'); return; }
        if (!Number.isInteger(genCount) || genCount < 1 || genCount > 10000) { showToast('单次生成数量需为 1-10000 的整数', 'warning'); return; }
        if (genExpireDays !== undefined && (!Number.isInteger(genExpireDays) || genExpireDays < 0)) { showToast('过期天数必须是大于等于 0 的整数', 'warning'); return; }
        if (estimatedCost > balance) { showToast('余额不足，请联系管理员充值', 'error'); return; }
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
                sessionStorage.setItem('distributorLastBatch', response.data.batch_id);
                generateModal.onClose();
                showToast(`已生成 ${response.data.count} 个卡密，扣款 ¥${response.data.total_cost.toFixed(2)}`, 'success');
                navigate('/distributor/cdks');
            } else {
                showToast(response.msg || '生成失败', 'error');
            }
        } catch (error: unknown) {
            showToast(error instanceof Error ? error.message : '生成失败', 'error');
        } finally {
            setGenerating(false);
        }
    };

    if (loading) {
        return <div className="flex min-h-[50vh] items-center justify-center"><Spinner size="lg" label="正在加载卡密采购..." /></div>;
    }
    if (pageError || !distributor) {
        return <Alert isVisible color="danger" title="页面加载失败" description={pageError || '未获取到分销商信息'} endContent={<Button color="danger" variant="flat" onPress={() => void loadPage()}>重新加载</Button>} className="max-w-xl" />;
    }

    return <div className="space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-4">
            <div>
                <h1 className="text-2xl font-semibold">卡密采购</h1>
                <p className="mt-1 text-sm text-default-500">用余额按进货价生成卡密，自己定价卖给客户，差价就是你的利润。</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
                <Chip color={distributor.status === 1 ? 'success' : 'danger'} variant="flat">账号{distributor.status === 1 ? '已启用' : '已停用'}</Chip>
                <Chip color="secondary" variant="flat">等级 L{distributor.level ?? 1}</Chip>
                {canGenerate && <Chip color="success" variant="flat">余额 ¥{balance.toFixed(2)}</Chip>}
                {canGenerate && <Chip color={discountActive ? 'success' : 'warning'} variant="flat">{discountActive ? `折扣至 ${distributor.expires_at ? formatDateTime(distributor.expires_at) : '永久'}` : '折扣已到期 · 按原价'}</Chip>}
            </div>
        </header>

        <div className={`grid gap-4 sm:grid-cols-2 ${canGenerate ? 'lg:grid-cols-6' : 'lg:grid-cols-5'}`}>
            {canGenerate && <Card shadow="sm"><CardBody><p className="text-sm text-default-500">账户余额</p><p className="mt-1 text-2xl font-semibold">¥{balance.toFixed(2)}</p></CardBody></Card>}
            <Card shadow="sm"><CardBody><p className="text-sm text-default-500">卡密总数</p><p className="mt-1 text-2xl font-semibold">{stats.total}</p></CardBody></Card>
            <Card shadow="sm"><CardBody><p className="text-sm text-default-500">可交付未使用</p><p className="mt-1 text-2xl font-semibold text-success">{Math.max(stats.unused - stats.expired, 0)}</p></CardBody></Card>
            <Card shadow="sm"><CardBody><p className="text-sm text-default-500">已使用</p><p className="mt-1 text-2xl font-semibold">{stats.used}</p></CardBody></Card>
            <Card shadow="sm"><CardBody><p className="text-sm text-default-500">已过期未用</p><p className="mt-1 text-2xl font-semibold text-warning">{stats.expired}</p></CardBody></Card>
            <Card shadow="sm"><CardBody><p className="text-sm text-default-500">已停用</p><p className="mt-1 text-2xl font-semibold text-danger">{Math.max(stats.total - stats.used - stats.unused, 0)}</p></CardBody></Card>
        </div>

        {canGenerate ? (
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
                                <NumberInput label="生成数量" value={genCount} onValueChange={(value) => setGenCount(value)} minValue={1} maxValue={10000} isRequired description="单次最多 10000 个" />
                                <NumberInput label="有效期（天）" value={genExpireDays} onValueChange={(value) => setGenExpireDays(Number.isNaN(value) ? undefined : value)} minValue={0} placeholder={String(distributor.default_cdk_expire_days ?? 90)} description={`留空用管理员默认 ${distributor.default_cdk_expire_days ?? 90} 天；0 表示永不过期`} />
                                <Textarea className="md:col-span-2" label="批次备注（可选）" value={genRemarks} onValueChange={setGenRemarks} placeholder="例如：客户名称、渠道或订单号" minRows={2} />
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
                                            <Progress aria-label="余额覆盖比例" value={balanceCoverage} color={estimatedCost > balance ? 'danger' : 'success'} size="sm" />
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
                                        startContent={<strong className={log.change_amount >= 0 ? 'text-success' : 'text-danger'}>{log.change_amount >= 0 ? '+' : ''}{Number(log.change_amount).toFixed(2)}</strong>}
                                        endContent={<span className="whitespace-nowrap text-xs text-default-500">余额 {Number(log.balance_after).toFixed(2)}</span>}
                                    />
                                ))}
                            </Listbox>
                        )}
                    </CardBody>
                    <CardFooter>
                        <Button size="sm" variant="flat" startContent={<RefreshCw className="h-4 w-4" />} onPress={() => void refreshBalance()}>刷新流水</Button>
                    </CardFooter>
                </Card>
            </div>
        ) : (
            <Alert isVisible color="default" title="当前账号未开通卡密采购" description="你的账号目前只能查看和交付已有卡密；需要采购权限请联系管理员开通。已有卡密在左侧「我的卡密」查看。" />
        )}

        <Alert
            isVisible
            color={discountActive ? 'primary' : 'warning'}
            variant="flat"
            title={discountActive ? '分销商折扣有效期说明' : '分销商折扣已到期'}
            description={discountActive
                ? `当前折扣有效期至 ${distributor.expires_at ? formatDateTime(distributor.expires_at) : '永久'}。有效期仅影响生成卡密时的折扣价格。`
                : `折扣已于 ${distributor.expires_at ? formatDateTime(distributor.expires_at) : '-'} 到期。到期后仍可登录控制台、管理站点、查看余额和生成卡密，但新生成卡密按套餐原价扣款；历史卡密、余额及其他功能不受影响。`}
        />

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
                                <Button color="success" isLoading={generating} onPress={() => void handleGenerateCdk()}>确认生成并扣款</Button>
                            </ModalFooter>
                        </>
                    )}
                </ModalContent>
            </Modal>
        )}
    </div>;
};

export default DistributorPurchasePage;
