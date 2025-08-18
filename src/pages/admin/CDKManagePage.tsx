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
    useDisclosure,
    Card,
    CardBody,
    CardHeader,
    Textarea,
    Select,
    SelectItem,
    Spinner,
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
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [total, setTotal] = useState(0);
    const [selectedCDK, setSelectedCDK] = useState<CDK | null>(null);
    const [formData, setFormData] = useState<Partial<CreateCDKRequest | UpdateCDKRequest>>({});

    // Modal控制
    const { isOpen: isCreateOpen, onOpen: onCreateOpen, onClose: onCreateClose } = useDisclosure();
    const { isOpen: isEditOpen, onOpen: onEditOpen, onClose: onEditClose } = useDisclosure();
    const { isOpen: isViewOpen, onOpen: onViewOpen, onClose: onViewClose } = useDisclosure();
    const { isOpen: isDeleteOpen, onOpen: onDeleteOpen, onClose: onDeleteClose } = useDisclosure();

    const pageSize = 10;

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
            const response = await adminApiService.getPackages();
            if (response.code === 20000) {
                setPackages(response.data || []);
            }
        } catch (error) {
            console.error('获取套餐列表失败:', error);
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

            const response = await adminApiService.getCDKs(params);

            if (response.code === 20000) {
                setCDKs(response.data || []);
                setTotal(response.total || 0);
                setTotalPages(Math.ceil((response.total || 0) / pageSize));
            } else {
                showToast(response.msg || '获取CDK列表失败', 'error');
            }
        } catch (error) {
            console.error('获取CDK列表失败:', error);
            showToast('获取CDK列表失败', 'error');
        } finally {
            setLoading(false);
        }
    }, [currentPage, searchQuery, statusFilter]);

    // 初始化
    useEffect(() => {
        fetchPackages();
        fetchCDKs();
    }, [fetchPackages, fetchCDKs]);

    // 处理搜索
    const handleSearch = () => {
        setCurrentPage(1);
        fetchCDKs();
    };

    // 处理重置
    const handleReset = () => {
        setSearchQuery('');
        setStatusFilter('all');
        setCurrentPage(1);
    };

    // 处理批量生成CDK
    const handleCreate = async () => {
        try {
            const createData = formData as CreateCDKRequest;
            if (!createData.number || !createData.package_id) {
                showToast('生成数量和关联套餐不能为空', 'warning');
                return;
            }

            const response = await adminApiService.createCDKs(createData);
            if (response.code === 20000) {
                showToast(`成功生成${createData.number}个CDK`, 'success');
                onCreateClose();
                fetchCDKs();
                setFormData({});
            } else {
                showToast(response.msg || '生成CDK失败', 'error');
            }
        } catch (error) {
            console.error('生成CDK失败:', error);
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
        } catch (error) {
            console.error('更新CDK失败:', error);
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
        } catch (error) {
            console.error('删除CDK失败:', error);
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
    const renderStatus = (status: string) => {
        const colorMap = {
            used: 'success',
            unused: 'primary',
            disabled: 'danger',
        } as const;

        const labelMap = {
            used: '已使用',
            unused: '未使用',
            disabled: '已停用',
        };

        return (
            <Chip
                color={colorMap[status as keyof typeof colorMap] || 'default'}
                variant="flat"
                size="sm"
            >
                {labelMap[status as keyof typeof labelMap] || status}
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
                <CreditCard className="w-6 h-6 text-blue-600" />
                <h1 className="text-2xl font-bold text-gray-800">CDK管理</h1>
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

                            onChange={(e) => setSearchQuery(e.target.value)}
                            startContent={<Search className="w-4 h-4 text-gray-400" />}
                            className="flex-1"
                            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                        />
                                    <Select
              placeholder="选择状态"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full sm:w-40"
            >
              {statusOptions.map((option) => (
                <SelectItem key={option.key}>
                  {option.label}
                </SelectItem>
              ))}
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
                <div className="text-sm text-gray-600">
                    共 {total} 个CDK
                </div>
                <Button
                    color="primary"
                    startContent={<Plus className="w-4 h-4" />}
                    onPress={onCreateOpen}
                >
                    批量生成CDK
                </Button>
            </div>

            {/* CDK表格 */}
            <Card>
                <CardBody className="p-0">
                    <Table
                        aria-label="CDK列表"
                        isHeaderSticky
                        classNames={{
                            wrapper: "max-h-[600px]",
                        }}
                    >
                        <TableHeader>
                            <TableColumn>CDK信息</TableColumn>
                            <TableColumn>关联套餐</TableColumn>
                            <TableColumn>状态</TableColumn>
                            <TableColumn>使用信息</TableColumn>
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
                                <TableRow key={cdk.id}>
                                    <TableCell>
                                        <div className="space-y-1">
                                            <div className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">
                                                {cdk.cdk}
                                            </div>
                                            <div className="text-xs text-gray-400">ID: {cdk.id}</div>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <Package className="w-4 h-4 text-gray-400" />
                                            <span className="text-sm">套餐ID: {cdk.package_id}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>{renderStatus(cdk.status)}</TableCell>
                                    <TableCell>
                                        <div className="space-y-1">
                                            {cdk.user_id && (
                                                <div className="text-sm">用户ID: {cdk.user_id}</div>
                                            )}
                                            {cdk.used_at && (
                                                <div className="text-xs text-gray-500">
                                                    使用时间: {dayjs(cdk.used_at).format('MM-DD HH:mm')}
                                                </div>
                                            )}
                                            {!cdk.user_id && !cdk.used_at && (
                                                <div className="text-xs text-gray-400">-</div>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-sm">
                                        {dayjs(cdk.created_at).format('YYYY-MM-DD HH:mm')}
                                    </TableCell>
                                    <TableCell>
                                        <div className="max-w-40 truncate text-sm text-gray-600">
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
            {totalPages > 1 && (
                <div className="flex justify-center">
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
                            <Input
                                label="生成数量"
                                type="number"
                                placeholder="请输入生成数量"

                                onChange={(e) => setFormData({ ...formData, number: Number(e.target.value) })}
                                isRequired
                            />
                            <Select
                                label="关联套餐"
                                placeholder="选择关联套餐"
                                selectedKeys={formData.package_id ? [String(formData.package_id)] : []}
                                onChange={(e) => setFormData({ ...formData, package_id: Number(e.target.value) })}
                                isRequired
                            >
                                {packages.map((pkg) => (
                                    <SelectItem key={pkg.id}>
                                        {pkg.package_name} - ¥{pkg.price}
                                    </SelectItem>
                                ))}
                            </Select>
                            <Textarea
                                label="备注"
                                placeholder="请输入备注信息（可选）"

                                onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                                minRows={3}
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
                                onChange={(e) => setFormData({ ...formData, status: e.target.value as 'used' | 'unused' | 'disabled' })}
                            >
                                <SelectItem key="used">已使用</SelectItem>
                                <SelectItem key="unused">未使用</SelectItem>
                                <SelectItem key="disabled">已停用</SelectItem>
                            </Select>
                            <Textarea
                                label="备注"
                                placeholder="请输入备注信息"

                                onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
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
                                        <span className="text-sm text-gray-500">CDK ID</span>
                                        <div className="font-medium">{selectedCDK.id}</div>
                                    </div>
                                    <div>
                                        <span className="text-sm text-gray-500">CDK码</span>
                                        <div className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">
                                            {selectedCDK.cdk}
                                        </div>
                                    </div>
                                    <div>
                                        <span className="text-sm text-gray-500">关联套餐ID</span>
                                        <div className="font-medium">{selectedCDK.package_id}</div>
                                    </div>
                                    <div>
                                        <span className="text-sm text-gray-500">状态</span>
                                        <div>{renderStatus(selectedCDK.status)}</div>
                                    </div>
                                    <div>
                                        <span className="text-sm text-gray-500">创建时间</span>
                                        <div className="font-medium">
                                            {dayjs(selectedCDK.created_at).format('YYYY-MM-DD HH:mm:ss')}
                                        </div>
                                    </div>
                                    {selectedCDK.used_at && (
                                        <div>
                                            <span className="text-sm text-gray-500">使用时间</span>
                                            <div className="font-medium">
                                                {dayjs(selectedCDK.used_at).format('YYYY-MM-DD HH:mm:ss')}
                                            </div>
                                        </div>
                                    )}
                                    {selectedCDK.user_id && (
                                        <div>
                                            <span className="text-sm text-gray-500">使用用户ID</span>
                                            <div className="font-medium">{selectedCDK.user_id}</div>
                                        </div>
                                    )}
                                </div>
                                {selectedCDK.remarks && (
                                    <div>
                                        <span className="text-sm text-gray-500">备注</span>
                                        <div className="mt-1 p-3 bg-gray-50 rounded-lg text-sm">
                                            {selectedCDK.remarks}
                                        </div>
                                    </div>
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
                        <p className="text-sm text-gray-500">
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