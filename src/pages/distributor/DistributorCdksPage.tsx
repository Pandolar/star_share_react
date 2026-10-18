import React, { useCallback, useEffect, useState } from 'react';
import {
    Alert,
    Button,
    Card,
    CardBody,
    CardFooter,
    CardHeader,
    Chip,
    Divider,
    Input,
    Pagination,
    Select,
    SelectItem,
    Snippet,
    Spinner,
    Table,
    TableBody,
    TableCell,
    TableColumn,
    TableHeader,
    TableRow,
} from '@heroui/react';
import { Copy, Search } from 'lucide-react';
import dayjs from 'dayjs';
import distributorApiService from '../../services/distributorApi';
import type { DistributorCdk } from '../../services/distributorApi';
import { showToast } from '../../components/Toast';

type CdkStatusFilter = 'all' | 'unused' | 'used' | 'disabled';

const CDK_PAGE_SIZE = 10;
const formatDateTime = (value?: string | null) => (
    value && dayjs(value).isValid() ? dayjs(value).format('YYYY-MM-DD HH:mm') : '-'
);
const isExpired = (cdk: DistributorCdk) => (
    cdk.status === 'unused' && Boolean(cdk.expires_at) && dayjs(cdk.expires_at).isBefore(dayjs())
);

const DistributorCdksPage: React.FC = () => {
    const [cdks, setCdks] = useState<DistributorCdk[]>([]);
    const [cdkLoading, setCdkLoading] = useState(false);
    const [cdkSearchInput, setCdkSearchInput] = useState('');
    const [cdkSearch, setCdkSearch] = useState('');
    const [cdkStatus, setCdkStatus] = useState<CdkStatusFilter>('all');
    const [cdkPage, setCdkPage] = useState(1);
    const [cdkTotal, setCdkTotal] = useState(0);
    const [lastBatchId, setLastBatchId] = useState(() => sessionStorage.getItem('distributorLastBatch') || '');

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
                setCdks(Array.isArray(response.data) ? response.data : []);
                setCdkTotal(totalNum);
                const totalPages = Math.max(1, Math.ceil(totalNum / CDK_PAGE_SIZE));
                if (page > totalPages) setCdkPage(totalPages);
            } else {
                setCdks([]);
                setCdkTotal(0);
                showToast(response.msg || '获取卡密失败', 'error');
            }
        } catch (error: unknown) {
            setCdks([]);
            setCdkTotal(0);
            showToast(error instanceof Error ? error.message : '获取卡密失败', 'error');
        } finally {
            setCdkLoading(false);
        }
    }, []);

    useEffect(() => { void loadCdks(cdkPage, cdkSearch, cdkStatus); }, [cdkPage, cdkSearch, cdkStatus, loadCdks]);

    const copyText = async (value: string, successMessage = '已复制') => {
        try {
            await navigator.clipboard.writeText(value);
            showToast(successMessage, 'success');
        } catch {
            showToast('复制失败，请手动复制', 'error');
        }
    };

    const cdkTotalPages = Math.max(1, Math.ceil(cdkTotal / CDK_PAGE_SIZE));
    const statusChip = (cdk: DistributorCdk) => {
        if (isExpired(cdk)) return <Chip color="warning" variant="flat" size="sm">已过期</Chip>;
        const config = {
            unused: { color: 'success' as const, label: '未使用' },
            used: { color: 'default' as const, label: '已使用' },
            disabled: { color: 'danger' as const, label: '已停用' },
        }[cdk.status];
        return <Chip color={config?.color || 'default'} variant="flat" size="sm">{config?.label || cdk.status}</Chip>;
    };

    return <div className="space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-4">
            <div>
                <h1 className="text-2xl font-semibold">我的卡密</h1>
                <p className="mt-1 text-sm text-default-500">复制未使用且未过期的卡密交付客户；每个卡密默认只能用一次。</p>
            </div>
        </header>

        {lastBatchId && (
            <Alert
                isVisible
                color="success"
                title="最近一批卡密已生成"
                description={<span className="flex flex-wrap items-center gap-2">批次 ID：<Snippet hideSymbol size="sm" codeString={lastBatchId}>{lastBatchId}</Snippet> 卡密已显示在下方列表顶部。</span>}
                onClose={() => { sessionStorage.removeItem('distributorLastBatch'); setLastBatchId(''); }}
            />
        )}

        <Card shadow="sm">
            <CardHeader className="flex flex-col items-stretch gap-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <p className="font-semibold">卡密列表</p>
                        <p className="text-sm text-default-500">只显示当前分销商名下的卡密，共 {cdkTotal} 条。</p>
                    </div>
                    <Button
                        variant="flat"
                        color="primary"
                        startContent={<Copy className="h-4 w-4" />}
                        onPress={() => {
                            const values = cdks.filter((item) => item.status === 'unused' && !isExpired(item)).map((item) => item.cdk);
                            if (!values.length) { showToast('当前页没有可交付的未使用卡密', 'warning'); return; }
                            void copyText(values.join('\n'), `已复制当前页 ${values.length} 个可用卡密`);
                        }}
                    >
                        复制当前页可用卡密
                    </Button>
                </div>
                <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_180px_auto]">
                    <Input
                        value={cdkSearchInput}
                        onValueChange={setCdkSearchInput}
                        onKeyDown={(event) => {
                            if (event.key === 'Enter') {
                                const next = cdkSearchInput.trim();
                                if (cdkPage === 1 && cdkSearch === next) void loadCdks(1, next, cdkStatus);
                                else { setCdkPage(1); setCdkSearch(next); }
                            }
                        }}
                        placeholder="搜索卡密、批次或备注"
                        startContent={<Search className="h-4 w-4 text-default-400" />}
                        isClearable
                        onClear={() => { setCdkSearchInput(''); setCdkSearch(''); setCdkPage(1); }}
                    />
                    <Select aria-label="卡密状态" selectedKeys={[cdkStatus]} onSelectionChange={(keys) => { setCdkStatus(String(Array.from(keys)[0] || 'all') as CdkStatusFilter); setCdkPage(1); }}>
                        <SelectItem key="all">全部状态</SelectItem>
                        <SelectItem key="unused">未使用（含已过期）</SelectItem>
                        <SelectItem key="used">已使用</SelectItem>
                        <SelectItem key="disabled">已停用</SelectItem>
                    </Select>
                    <div className="flex gap-2">
                        <Button color="primary" onPress={() => {
                            const next = cdkSearchInput.trim();
                            if (cdkPage === 1 && cdkSearch === next) void loadCdks(1, next, cdkStatus);
                            else { setCdkPage(1); setCdkSearch(next); }
                        }}>查询</Button>
                        <Button variant="flat" onPress={() => { setCdkSearchInput(''); setCdkSearch(''); setCdkStatus('all'); setCdkPage(1); }}>重置</Button>
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
                                <TableCell>{statusChip(cdk)}</TableCell>
                                <TableCell>{cdk.expires_at ? formatDateTime(cdk.expires_at) : '永不过期'}</TableCell>
                                <TableCell><span className="block max-w-32 truncate text-xs" title={cdk.batch_id || ''}>{cdk.batch_id || '-'}</span></TableCell>
                                <TableCell>{formatDateTime(cdk.created_at)}</TableCell>
                                <TableCell>
                                    <Button isIconOnly size="sm" variant="light" aria-label="复制卡密" onPress={() => void copyText(cdk.cdk, '卡密已复制')}>
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
    </div>;
};

export default DistributorCdksPage;
