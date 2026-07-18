import React, { useState, useEffect, useCallback } from 'react';
import {
    Alert,
    Table,
    TableHeader,
    TableColumn,
    TableBody,
    TableRow,
    TableCell,
    Input,
    Button,
    Dropdown,
    DropdownTrigger,
    DropdownMenu,
    DropdownItem,
    Chip,
    Pagination,
    Modal,
    ModalContent,
    ModalHeader,
    ModalBody,
    ModalFooter,
    NumberInput,
    useDisclosure,
    Card,
    CardBody,
    CardHeader,
    Textarea,
    Select,
    SelectItem,
    Snippet,
    Spinner,
    type SharedSelection,
} from '@heroui/react';
import {
    Search,
    Plus,
    MoreVertical,
    Edit,
    Trash2,
    Eye,
    CreditCard,
    Filter,
    RefreshCw,
    Gift,
    Copy,
    Package,
    Download,
} from 'lucide-react';
import dayjs from 'dayjs';
import adminApiService from '../../services/adminApi';
import { CDK, CreateCDKRequest, UpdateCDKRequest, CDKQueryParams, Package as PackageType } from '../../types/admin';
import { showToast } from '../../components/Toast';

/**
 * CDK管理页面
 * 提供CDK的增删改查功能
 */
const CDKManagePage: React.FC = () => {
    // 状态管理
    const [cdks, setCDKs] = useState<CDK[]>([]);
    const [packages, setPackages] = useState<PackageType[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchInput, setSearchInput] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [total, setTotal] = useState(0);
    const [selectedCDK, setSelectedCDK] = useState<CDK | null>(null);
    const [selectedKeys, setSelectedKeys] = useState<SharedSelection>(new Set());
    const [formData, setFormData] = useState<Partial<CreateCDKRequest & UpdateCDKRequest>>({});

    // Modal控制
    const { isOpen: isCreateOpen, onOpen: onCreateOpen, onClose: onCreateClose } = useDisclosure();
    const { isOpen: isEditOpen, onOpen: onEditOpen, onClose: onEditClose } = useDisclosure();
    const { isOpen: isViewOpen, onOpen: onViewOpen, onClose: onViewClose } = useDisclosure();
    const { isOpen: isDeleteOpen, onOpen: onDeleteOpen, onClose: onDeleteClose } = useDisclosure();

    const [pageSize, setPageSize] = useState<number>(10);
    // 跨页选择：Map<id, cdk字符串> 在翻页时持久化
    const [crossPageSelection, setCrossPageSelection] = useState<Map<number, string>>(new Map());
    // 分销商列表（用于生成CDK时选择归属）
    const [distributors, setDistributors] = useState<Array<{ id: number; username: string }>>([]);
    // 分销商筛选
    const [distributorFilter, setDistributorFilter] = useState<string>('all');

  // 状态选项
  const statusOptions = [
    { key: 'all', label: '全部状态' },
    { key: 'used', label: '已使用' },
    { key: 'unused', label: '未使用' },
    { key: 'disabled', label: '已停用' },
  ];

    // 获取套餐列表（用于生成CDK）
    const fetchPackages = useCallback(async () => {
        try {
            const response = await adminApiService.getPackages({ current_page: 1, page_size: 1000 });
            if (response.code === 20000) {
                setPackages(Array.isArray(response.data) ? response.data : []);
            }
        } catch {
            showToast('获取套餐选项失败', 'error');
        }
    }, []);

    // 获取分销商列表（用于生成CDK时选择归属、筛选）
    const fetchDistributors = useCallback(async () => {
        try {
            const response = await adminApiService.getDistributors({ current_page: 1, page_size: 1000 });
            if (response.code === 20000) {
                const data = Array.isArray(response.data) ? response.data : (response.data?.list || []);
                setDistributors(data.map((d: any) => ({ id: d.id, username: d.username })));
            }
        } catch {
            showToast('获取分销商选项失败', 'error');
        }
    }, []);

    // 获取CDK列表
    const fetchCDKs = useCallback(async () => {
        setLoading(true);
        try {
            const params: CDKQueryParams = {
                current_page: currentPage,
                page_size: pageSize,
            };

            if (searchQuery.trim()) {
                params.querystring = searchQuery.trim();
            }

            if (statusFilter !== 'all') {
                params.status = statusFilter as 'used' | 'unused' | 'disabled';
            }

            if (distributorFilter !== 'all') {
                params.distributor_id = distributorFilter === 'self' ? 0 : Number(distributorFilter);
            }

            const response = await adminApiService.getCDKs(params);

            if (response.code === 20000) {
                setCDKs(Array.isArray(response.data) ? response.data : []);
                const totalNum = Number(response.total) || 0;
                const nextTotalPages = Math.max(1, Math.ceil(totalNum / pageSize));
                setTotal(totalNum);
                setTotalPages(nextTotalPages);
                if (currentPage > nextTotalPages) setCurrentPage(nextTotalPages);
            } else {
                // 错误捕获：显示空表格
                setCDKs([]);
                setTotal(0);
                setTotalPages(1);
                showToast(response.msg || '获取CDK列表失败', 'error');
            }
        } catch {
            // 错误捕获：显示空表格
            setCDKs([]);
            setTotal(0);
            setTotalPages(1);
            showToast('获取CDK列表失败', 'error');
        } finally {
            setLoading(false);
        }
    }, [currentPage, searchQuery, statusFilter, distributorFilter, pageSize]);

    // 初始化筛选选项
    useEffect(() => {
        fetchPackages();
        fetchDistributors();
    }, [fetchPackages, fetchDistributors]);

    // 列表条件变化时刷新
    useEffect(() => {
        fetchCDKs();
    }, [fetchCDKs]);

    // 翻页/刷新后，根据跨页选择同步当前页的勾选状态
    useEffect(() => {
        const onPage = cdks.filter((c) => crossPageSelection.has(c.id)).map((c) => c.id);
        setSelectedKeys(new Set(onPage));
    }, [cdks, crossPageSelection]);

    // 处理搜索
    const handleSearch = () => {
        const nextQuery = searchInput.trim();
        if (currentPage === 1 && searchQuery === nextQuery) {
            fetchCDKs();
            return;
        }
        setCurrentPage(1);
        setSearchQuery(nextQuery);
    };

    // 处理重置
    const handleReset = () => {
        setSearchInput('');
        setSearchQuery('');
        setStatusFilter('all');
        setDistributorFilter('all');
        setCurrentPage(1);
    };

    // 导出CDK（mode: full=完整, distribute=分发）
    const handleExport = async (mode: 'full' | 'distribute') => {
        try {
            const params: {
                mode: 'full' | 'distribute';
                status?: string;
                distributor_id?: number | null;
            } = { mode };
            if (statusFilter !== 'all') params.status = statusFilter;
            if (distributorFilter !== 'all') {
                params.distributor_id = distributorFilter === 'self' ? 0 : Number(distributorFilter);
            }
            const blob = await adminApiService.exportCDKs(params);
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `cdk_export_${mode}_${dayjs().format('YYYYMMDD_HHmmss')}.csv`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
            showToast('导出成功', 'success');
        } catch {
            showToast('导出失败', 'error');
        }
    };

    // 处理批量生成CDK
    const handleCreate = async () => {
        try {
            const createData = formData as CreateCDKRequest;
            if (!createData.number || !createData.package_id) {
                showToast('生成数量和关联套餐不能为空', 'warning');
                return;
            }
            if (!Number.isInteger(createData.number) || createData.number < 1 || createData.number > 10000) {
                showToast('生成数量必须是 1-10000 的整数', 'warning');
                return;
            }
            if (createData.expires_days !== undefined && (!Number.isInteger(createData.expires_days) || createData.expires_days < 0)) {
                showToast('有效期必须是大于等于 0 的整数', 'warning');
                return;
            }

            const response = await adminApiService.createCDKs(createData);
            if (response.code === 20000) {
                // 后端返回 batch_id + count，生成成功后提示并刷新列表
                const count = response.data?.count || createData.number;
                const batchId = response.data?.batch_id || '';
                showToast(`成功生成 ${count} 个CDK${batchId ? `（批次：${batchId}）` : ''}`, 'success');
                onCreateClose();
                fetchCDKs();
                setFormData({});
            } else {
                showToast(response.msg || '生成CDK失败', 'error');
            }
        } catch {
            showToast('生成CDK失败', 'error');
        }
    };

    // 处理编辑CDK
    const handleEdit = async () => {
        try {
            if (!selectedCDK) return;

            const updateData = {
                id: selectedCDK.id,
                ...formData
            } as UpdateCDKRequest;

            const response = await adminApiService.updateCDK(updateData);
            if (response.code === 20000) {
                showToast('更新CDK成功', 'success');
                onEditClose();
                fetchCDKs();
                setFormData({});
                setSelectedCDK(null);
            } else {
                showToast(response.msg || '更新CDK失败', 'error');
            }
        } catch {
            showToast('更新CDK失败', 'error');
        }
    };

    // 处理删除CDK
    const handleDelete = async () => {
        try {
            if (!selectedCDK) return;

            const response = await adminApiService.deleteCDK(selectedCDK.id);
            if (response.code === 20000) {
                showToast('删除CDK成功', 'success');
                onDeleteClose();
                fetchCDKs();
                setSelectedCDK(null);
            } else {
                showToast(response.msg || '删除CDK失败', 'error');
            }
        } catch {
            showToast('删除CDK失败', 'error');
        }
    };

    // 复制CDK到剪贴板
    const handleCopyCDK = async (cdk: string) => {
        try {
            await navigator.clipboard.writeText(cdk);
            showToast('CDK已复制到剪贴板', 'success');
        } catch (error) {
            showToast('复制失败', 'error');
        }
    };

    // 复制选中的CDK（跨页选择）
    const handleCopySelectedCDKs = async () => {
        try {
            if (crossPageSelection.size === 0) {
                showToast('请先选择需要复制的CDK', 'warning');
                return;
            }
            const text = Array.from(crossPageSelection.values()).join('\n');
            await navigator.clipboard.writeText(text);
            showToast(`已复制 ${crossPageSelection.size} 个CDK`, 'success');
        } catch (_) {
            showToast('复制失败', 'error');
        }
    };

    // 复制全部筛选结果（跨所有页）
    const handleCopyAllFiltered = async () => {
        try {
            const params: CDKQueryParams = { page_size: 99999 };
            if (searchQuery.trim()) params.querystring = searchQuery.trim();
            if (statusFilter !== 'all') params.status = statusFilter as CDKQueryParams['status'];
            if (distributorFilter !== 'all') {
                params.distributor_id = distributorFilter === 'self' ? 0 : Number(distributorFilter);
            }
            const response = await adminApiService.getCDKs(params);
            if (response.code === 20000) {
                const list = Array.isArray(response.data) ? response.data : [];
                if (list.length === 0) {
                    showToast('当前筛选条件下无CDK', 'warning');
                    return;
                }
                const text = list.map((c) => c.cdk).join('\n');
                await navigator.clipboard.writeText(text);
                showToast(`已复制全部 ${list.length} 个CDK`, 'success');
            } else {
                showToast(response.msg || '获取CDK列表失败', 'error');
            }
        } catch (_) {
            showToast('复制失败', 'error');
        }
    };

    // 导出为 .txt 文件
    const handleExportTxt = async () => {
        try {
            const params: CDKQueryParams = { page_size: 99999 };
            if (searchQuery.trim()) params.querystring = searchQuery.trim();
            if (statusFilter !== 'all') params.status = statusFilter as CDKQueryParams['status'];
            if (distributorFilter !== 'all') {
                params.distributor_id = distributorFilter === 'self' ? 0 : Number(distributorFilter);
            }
            const response = await adminApiService.getCDKs(params);
            if (response.code === 20000) {
                const list = Array.isArray(response.data) ? response.data : [];
                if (list.length === 0) {
                    showToast('当前筛选条件下无CDK', 'warning');
                    return;
                }
                const text = list.map((c) => c.cdk).join('\n');
                const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `cdk_export_${dayjs().format('YYYYMMDD_HHmmss')}.txt`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                showToast(`已导出 ${list.length} 个CDK`, 'success');
            } else {
                showToast(response.msg || '获取CDK列表失败', 'error');
            }
        } catch (_) {
            showToast('导出失败', 'error');
        }
    };

    // 打开编辑Modal
    const openEditModal = (cdk: CDK) => {
        setSelectedCDK(cdk);
        setFormData({
            status: cdk.status,
            remarks: cdk.remarks || '',
        });
        onEditOpen();
    };

    // 打开查看Modal
    const openViewModal = (cdk: CDK) => {
        setSelectedCDK(cdk);
        onViewOpen();
    };

    // 打开删除Modal
    const openDeleteModal = (cdk: CDK) => {
        setSelectedCDK(cdk);
        onDeleteOpen();
    };

    // 状态渲染
    const renderStatus = (status: string, expiresAt?: string | null) => {
        // 检查是否过期
        const isExpired = expiresAt && dayjs(expiresAt).isBefore(dayjs());

        const colorMap = {
            used: 'success',
            unused: 'primary',
            disabled: 'danger',
            expired: 'warning',
        } as const;

        const labelMap = {
            used: '已使用',
            unused: '未使用',
            disabled: '已停用',
            expired: '已过期',
        };

        // 如果未使用但已过期，显示已过期状态
        const displayStatus = (status === 'unused' && isExpired) ? 'expired' : status;

        return (
            <Chip
                color={colorMap[displayStatus as keyof typeof colorMap] || 'default'}
                variant="flat"
                size="sm"
            >
                {labelMap[displayStatus as keyof typeof labelMap] || status}
            </Chip>
        );
    };

    // 操作按钮渲染
    const renderActions = (cdk: CDK) => (
        <Dropdown>
            <DropdownTrigger>
                <Button
                    isIconOnly
                    variant="light"
                    size="sm"
                >
                    <MoreVertical className="w-4 h-4" />
                </Button>
            </DropdownTrigger>
            <DropdownMenu aria-label="CDK操作">
                <DropdownItem
                    key="copy"
                    startContent={<Copy className="w-4 h-4" />}
                    onPress={() => handleCopyCDK(cdk.cdk)}
                >
                    复制CDK
                </DropdownItem>
                <DropdownItem
                    key="view"
                    startContent={<Eye className="w-4 h-4" />}
                    onPress={() => openViewModal(cdk)}
                >
                    查看详情
                </DropdownItem>
                <DropdownItem
                    key="edit"
                    startContent={<Edit className="w-4 h-4" />}
                    onPress={() => openEditModal(cdk)}
                >
                    编辑
                </DropdownItem>
                <DropdownItem
                    key="delete"
                    color="danger"
                    startContent={<Trash2 className="w-4 h-4" />}
                    onPress={() => openDeleteModal(cdk)}
                >
                    删除
                </DropdownItem>
            </DropdownMenu>
        </Dropdown>
    );

    return (
        <div className="space-y-6">
            {/* 页面标题 */}
            <div className="flex items-center gap-3">
                <CreditCard className="w-6 h-6 text-primary" />
                <h1 className="text-2xl font-bold text-default-800">CDK管理</h1>
            </div>

            {/* 搜索和筛选区域 */}
            <Card>
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <Filter className="w-4 h-4" />
                        <span className="font-medium">筛选条件</span>
                    </div>
                </CardHeader>
                <CardBody>
                    <div className="flex flex-col sm:flex-row gap-4">
                        <Input
                            placeholder="搜索CDK..."
                            value={searchInput}
                            onValueChange={setSearchInput}
                            startContent={<Search className="w-4 h-4 text-default-400" />}
                            className="flex-1"
                            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                        />
                        <Select
                            placeholder="选择状态"
                            selectedKeys={[statusFilter]}
                            onSelectionChange={(keys) => {
                                setStatusFilter(String(Array.from(keys)[0] || 'all'));
                                setCurrentPage(1);
                            }}
                            className="w-full sm:w-40"
                        >
                            {statusOptions.map((option) => (
                                <SelectItem key={option.key}>
                                    {option.label}
                                </SelectItem>
                            ))}
                        </Select>
                        <Select
                            placeholder="选择归属"
                            selectedKeys={[distributorFilter]}
                            onSelectionChange={(keys) => {
                                setDistributorFilter(String(Array.from(keys)[0] || 'all'));
                                setCurrentPage(1);
                            }}
                            className="w-full sm:w-44"
                        >
                            {[
                                <SelectItem key="all">全部归属</SelectItem>,
                                <SelectItem key="self">自营</SelectItem>,
                                ...distributors.map((d) => (
                                    <SelectItem key={String(d.id)}>{d.username}</SelectItem>
                                )),
                            ]}
                        </Select>
                        <div className="flex gap-2">
                            <Button
                                color="primary"
                                onPress={handleSearch}
                                startContent={<Search className="w-4 h-4" />}
                            >
                                搜索
                            </Button>
                            <Button
                                variant="bordered"
                                onPress={handleReset}
                                startContent={<RefreshCw className="w-4 h-4" />}
                            >
                                重置
                            </Button>
                        </div>
                    </div>
                </CardBody>
            </Card>

            {/* 操作区域 */}
            <div className="flex justify-between items-center">
                <div className="text-sm text-default-600">
                    共 {total} 个CDK
                </div>
                <div className="flex gap-2">
                    <Button
                        variant="flat"
                        color="secondary"
                        startContent={<Download className="w-4 h-4" />}
                        onPress={() => handleExport('full')}
                    >
                        导出(完整)
                    </Button>
                    <Button
                        variant="flat"
                        color="secondary"
                        startContent={<Download className="w-4 h-4" />}
                        onPress={() => handleExport('distribute')}
                    >
                        导出(分发)
                    </Button>
                    <Button
                        color="primary"
                        startContent={<Plus className="w-4 h-4" />}
                        onPress={onCreateOpen}
                    >
                        批量生成CDK
                    </Button>
                </div>
            </div>
            <div className="flex justify-end mt-2 gap-2 flex-wrap">
                <Button
                    variant="flat"
                    color="primary"
                    startContent={<Copy className="w-4 h-4" />}
                    onPress={handleCopySelectedCDKs}
                    isDisabled={crossPageSelection.size === 0}
                >
                    复制选中 ({crossPageSelection.size})
                </Button>
                <Button
                    variant="flat"
                    color="secondary"
                    startContent={<Copy className="w-4 h-4" />}
                    onPress={handleCopyAllFiltered}
                >
                    复制全部筛选结果
                </Button>
                <Button
                    variant="flat"
                    color="default"
                    startContent={<Download className="w-4 h-4" />}
                    onPress={handleExportTxt}
                >
                    导出 .txt
                </Button>
            </div>

            {/* CDK表格 */}
            <Card>
                <CardBody className="p-0">
                    <Table
                        aria-label="CDK列表"
                        isHeaderSticky
                        classNames={{
                            wrapper: "max-h-[600px] overflow-x-auto",
                            table: "min-w-[1100px]",
                        }}
                        selectionMode="multiple"
                        selectedKeys={selectedKeys}
                        onSelectionChange={(keys) => {
                            if (keys === 'all') {
                                // 全选当前页
                                const newMap = new Map(crossPageSelection);
                                cdks.forEach((c) => newMap.set(c.id, c.cdk));
                                setCrossPageSelection(newMap);
                                setSelectedKeys(new Set(cdks.map((c) => c.id)));
                            } else {
                                const keySet = keys;
                                const newMap = new Map(crossPageSelection);
                                // 取消当前页中不在新选择里的
                                cdks.forEach((c) => {
                                    if (!keySet.has(c.id)) newMap.delete(c.id);
                                    else newMap.set(c.id, c.cdk);
                                });
                                setCrossPageSelection(newMap);
                                setSelectedKeys(keys);
                            }
                        }}
                    >
                        <TableHeader>
                            <TableColumn width={100}>ID</TableColumn>
                            <TableColumn>CDK信息</TableColumn>
                            <TableColumn>关联套餐</TableColumn>
                            <TableColumn>归属</TableColumn>
                            <TableColumn>状态</TableColumn>
                            <TableColumn>使用信息</TableColumn>
                            <TableColumn>过期时间</TableColumn>
                            <TableColumn>创建时间</TableColumn>
                            <TableColumn>备注</TableColumn>
                            <TableColumn width={80}>操作</TableColumn>
                        </TableHeader>
                        <TableBody
                            isLoading={loading}
                            loadingContent={<Spinner label="加载中..." />}
                            emptyContent="暂无CDK数据"
                        >
                            {cdks.map((cdk) => (
                                <TableRow key={cdk.id} onDoubleClick={() => openEditModal(cdk)}>
                                    <TableCell>{cdk.id}</TableCell>
                                    <TableCell>
                                        <Snippet hideSymbol size="sm" codeString={cdk.cdk}>{cdk.cdk}</Snippet>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <Package className="w-4 h-4 text-default-400" />
                                            <span className="text-sm">
                                                {(() => {
                                                    const pkg = packages.find(p => p.id === cdk.package_id);
                                                    return pkg ? `${pkg.package_name} (ID: ${cdk.package_id})` : `套餐ID: ${cdk.package_id}`;
                                                })()}
                                            </span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        {cdk.distributor_id ? (
                                            <Chip size="sm" variant="flat" color="primary">
                                                {cdk.distributor_name || `分销商#${cdk.distributor_id}`}
                                            </Chip>
                                        ) : (
                                            <Chip size="sm" variant="flat" color="success">自营</Chip>
                                        )}
                                    </TableCell>
                                    <TableCell>{renderStatus(cdk.status, cdk.expires_at)}</TableCell>
                                    <TableCell>
                                        <div className="space-y-1">
                                            {cdk.user_id && (
                                                <div className="text-sm">
                                                    {cdk.user_username || cdk.user_email || `ID: ${cdk.user_id}`}
                                                </div>
                                            )}
                                            {cdk.user_id && cdk.user_email && !cdk.user_username && (
                                                <div className="text-xs text-default-500">{cdk.user_email}</div>
                                            )}
                                            {cdk.user_id && cdk.user_username && (
                                                <div className="text-xs text-default-500">{cdk.user_email || `ID: ${cdk.user_id}`}</div>
                                            )}
                                            {(cdk.max_uses || 1) > 1 && (
                                                <div className="text-xs text-default-500">
                                                    使用次数: {cdk.use_count || 0}/{cdk.max_uses}
                                                </div>
                                            )}
                                            {cdk.used_at && (
                                                <div className="text-xs text-default-500">
                                                    使用时间: {dayjs(cdk.used_at).format('MM-DD HH:mm')}
                                                </div>
                                            )}
                                            {!cdk.user_id && !cdk.used_at && (cdk.max_uses || 1) <= 1 && (
                                                <div className="text-xs text-default-400">-</div>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-sm">
                                        {cdk.expires_at ? (
                                            (() => {
                                                const expired = dayjs(cdk.expires_at).isBefore(dayjs());
                                                return (
                                                    <span className={expired ? 'text-danger' : 'text-default-600'}>
                                                        {dayjs(cdk.expires_at).format('YYYY-MM-DD HH:mm')}
                                                        {expired && <span className="block text-xs">已过期</span>}
                                                    </span>
                                                );
                                            })()
                                        ) : (
                                            <span className="text-default-400">永不过期</span>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-sm">
                                        {dayjs(cdk.created_at).format('YYYY-MM-DD HH:mm')}
                                    </TableCell>
                                    <TableCell>
                                        <div className="max-w-40 truncate text-sm text-default-600">
                                            {cdk.remarks || '-'}
                                        </div>
                                    </TableCell>
                                    <TableCell>{renderActions(cdk)}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardBody>
            </Card>

            {/* 分页 */}
            {totalPages > 0 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-sm text-default-600">
                        <span>每页</span>
                        <Select
                            aria-label="每页数量"
                            selectedKeys={[String(pageSize)]}
                            onSelectionChange={(keys) => {
                                setPageSize(Number(Array.from(keys)[0] || 10));
                                setCurrentPage(1);
                            }}
                            className="w-28"
                        >
                            <SelectItem key="10">10</SelectItem>
                            <SelectItem key="30">30</SelectItem>
                            <SelectItem key="100">100</SelectItem>
                            <SelectItem key="1000">1000</SelectItem>
                        </Select>
                        <span>条，共 {total} 条</span>
                    </div>
                    <Pagination
                        total={totalPages}
                        page={currentPage}
                        onChange={setCurrentPage}
                        showControls
                        showShadow
                        color="primary"
                    />
                </div>
            )}

            {/* 批量生成CDK Modal */}
            <Modal
                isOpen={isCreateOpen}
                onClose={onCreateClose}
                size="xl"
            >
                <ModalContent>
                    <ModalHeader className="flex gap-2 items-center">
                        <Gift className="w-5 h-5" />
                        批量生成CDK
                    </ModalHeader>
                    <ModalBody>
                        <div className="space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <NumberInput
                                    label="生成数量"
                                    placeholder="请输入生成数量"
                                    value={formData.number}
                                    onValueChange={(number) => setFormData({ ...formData, number: Number.isNaN(number) ? undefined : number })}
                                    minValue={1}
                                    maxValue={10000}
                                    step={1}
                                    isRequired
                                />
                                <NumberInput
                                    label="有效期（天）"
                                    placeholder="0 或留空 = 永不过期"
                                    value={(formData as CreateCDKRequest).expires_days}
                                    onValueChange={(expires_days) => setFormData({ ...formData, expires_days: Number.isNaN(expires_days) ? undefined : expires_days })}
                                    minValue={0}
                                    step={1}
                                    description="从生成时起算"
                                />
                            </div>
                            <Select
                                label="关联套餐"
                                placeholder="选择关联套餐"
                                selectedKeys={formData.package_id ? [String(formData.package_id)] : []}
                                onSelectionChange={(keys) => setFormData({ ...formData, package_id: Number(Array.from(keys)[0]) })}
                                isRequired
                                variant="bordered"
                            >
                                {packages.map((pkg) => (
                                    <SelectItem key={pkg.id}>
                                        {pkg.package_name} - ¥{pkg.price}
                                    </SelectItem>
                                ))}
                            </Select>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <Select
                                    label="归属"
                                    placeholder="选择归属"
                                    selectedKeys={[(formData as CreateCDKRequest).distributor_id ? String((formData as CreateCDKRequest).distributor_id) : 'self']}
                                    onSelectionChange={(keys) => {
                                        const val = String(Array.from(keys)[0] || 'self');
                                        setFormData({ ...formData, distributor_id: val === 'self' ? null : Number(val) });
                                    }}
                                    variant="bordered"
                                >
                                    {[
                                        <SelectItem key="self">自营</SelectItem>,
                                        ...distributors.map((d) => (
                                            <SelectItem key={String(d.id)}>{d.username}</SelectItem>
                                        )),
                                    ]}
                                </Select>
                            </div>
                            <Textarea
                                label="备注"
                                placeholder="请输入备注信息（可选）"
                                value={formData.remarks || ''}
                                onValueChange={(remarks) => setFormData({ ...formData, remarks })}
                                minRows={2}
                                variant="bordered"
                            />
                        </div>
                    </ModalBody>
                    <ModalFooter>
                        <Button variant="light" onPress={onCreateClose}>
                            取消
                        </Button>
                        <Button color="primary" onPress={handleCreate}>
                            生成
                        </Button>
                    </ModalFooter>
                </ModalContent>
            </Modal>

            {/* 编辑CDK Modal */}
            <Modal
                isOpen={isEditOpen}
                onClose={onEditClose}
                size="xl"
            >
                <ModalContent>
                    <ModalHeader className="flex gap-2 items-center">
                        <Edit className="w-5 h-5" />
                        编辑CDK
                    </ModalHeader>
                    <ModalBody>
                        <div className="space-y-4">
                            <Select
                                label="CDK状态"
                                placeholder="选择CDK状态"
                                selectedKeys={formData.status ? [formData.status] : []}
                                onSelectionChange={(keys) => setFormData({ ...formData, status: String(Array.from(keys)[0] || 'unused') as 'used' | 'unused' | 'disabled' })}
                            >
                                <SelectItem key="used">已使用</SelectItem>
                                <SelectItem key="unused">未使用</SelectItem>
                                <SelectItem key="disabled">已停用</SelectItem>
                            </Select>
                            <NumberInput
                                label="延期天数"
                                placeholder="输入正数延长有效期，负数缩短有效期"
                                value={formData.expires_days_extend}
                                onValueChange={(expires_days_extend) => setFormData({ ...formData, expires_days_extend: Number.isNaN(expires_days_extend) ? undefined : expires_days_extend })}
                                step={1}
                                description="留空表示不修改到期时间，正数延长、负数缩短"
                            />
                            <Textarea
                                label="备注"
                                placeholder="请输入备注信息"
                                value={formData.remarks || ''}
                                onValueChange={(remarks) => setFormData({ ...formData, remarks })}
                                minRows={3}
                            />
                        </div>
                    </ModalBody>
                    <ModalFooter>
                        <Button variant="light" onPress={onEditClose}>
                            取消
                        </Button>
                        <Button color="primary" onPress={handleEdit}>
                            保存
                        </Button>
                    </ModalFooter>
                </ModalContent>
            </Modal>

            {/* 查看CDK详情Modal */}
            <Modal
                isOpen={isViewOpen}
                onClose={onViewClose}
                size="2xl"
            >
                <ModalContent>
                    <ModalHeader className="flex gap-2 items-center">
                        <Eye className="w-5 h-5" />
                        CDK详情
                    </ModalHeader>
                    <ModalBody>
                        {selectedCDK && (
                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <span className="text-sm text-default-500">CDK ID</span>
                                        <div className="font-medium">{selectedCDK.id}</div>
                                    </div>
                                    <div>
                                        <span className="text-sm text-default-500">CDK码</span>
                                        <Snippet hideSymbol size="sm" codeString={selectedCDK.cdk}>{selectedCDK.cdk}</Snippet>
                                    </div>
                                    <div>
                                        <span className="text-sm text-default-500">关联套餐ID</span>
                                        <div className="font-medium">{selectedCDK.package_id}</div>
                                    </div>
                                    <div>
                                        <span className="text-sm text-default-500">状态</span>
                                        <div>{renderStatus(selectedCDK.status, selectedCDK.expires_at)}</div>
                                    </div>
                                    <div>
                                        <span className="text-sm text-default-500">到期时间</span>
                                        <div className="font-medium">
                                            {selectedCDK.expires_at ? (
                                                <>
                                                    {dayjs(selectedCDK.expires_at).format('YYYY-MM-DD HH:mm:ss')}
                                                    {dayjs(selectedCDK.expires_at).isBefore(dayjs()) && (
                                                        <span className="text-danger text-xs ml-2">(已过期)</span>
                                                    )}
                                                </>
                                            ) : (
                                                <span className="text-default-400">永不过期</span>
                                            )}
                                        </div>
                                    </div>
                                    <div>
                                        <span className="text-sm text-default-500">创建时间</span>
                                        <div className="font-medium">
                                            {dayjs(selectedCDK.created_at).format('YYYY-MM-DD HH:mm:ss')}
                                        </div>
                                    </div>
                                    {selectedCDK.used_at && (
                                        <div>
                                            <span className="text-sm text-default-500">使用时间</span>
                                            <div className="font-medium">
                                                {dayjs(selectedCDK.used_at).format('YYYY-MM-DD HH:mm:ss')}
                                            </div>
                                        </div>
                                    )}
                                    {selectedCDK.user_id && (
                                        <div>
                                            <span className="text-sm text-default-500">使用用户</span>
                                            <div className="font-medium">
                                                {selectedCDK.user_username || selectedCDK.user_email || `ID: ${selectedCDK.user_id}`}
                                                {selectedCDK.user_username && selectedCDK.user_email && (
                                                    <span className="text-sm text-default-500 ml-2">({selectedCDK.user_email})</span>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                                {selectedCDK.remarks && (
                                    <Alert isVisible color="default" variant="flat" title="备注" description={selectedCDK.remarks} />
                                )}
                            </div>
                        )}
                    </ModalBody>
                    <ModalFooter>
                        <Button color="primary" onPress={onViewClose}>
                            关闭
                        </Button>
                    </ModalFooter>
                </ModalContent>
            </Modal>

            {/* 删除确认Modal */}
            <Modal
                isOpen={isDeleteOpen}
                onClose={onDeleteClose}
                size="md"
            >
                <ModalContent>
                    <ModalHeader className="flex gap-2 items-center text-danger">
                        <Trash2 className="w-5 h-5" />
                        确认删除
                    </ModalHeader>
                    <ModalBody>
                        <p>
                            确定要删除CDK <strong>{selectedCDK?.cdk}</strong> 吗？
                        </p>
                        <p className="text-sm text-default-500">
                            删除后将无法恢复，请谨慎操作。
                        </p>
                    </ModalBody>
                    <ModalFooter>
                        <Button variant="light" onPress={onDeleteClose}>
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

export default CDKManagePage;
