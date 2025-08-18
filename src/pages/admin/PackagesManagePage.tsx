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
    Package,
    Filter,
    RefreshCw,
    Gift,
    DollarSign,
    Clock,
    Star,
} from 'lucide-react';
import dayjs from 'dayjs';
import adminApiService from '../../services/adminApi';
import { Package as PackageType, CreatePackageRequest, UpdatePackageRequest, PackageQueryParams } from '../../types/admin';
import { showToast } from '../../components/Toast';

/**
 * 套餐管理页面
 * 提供套餐的增删改查功能
 */
const PackagesManagePage: React.FC = () => {
    // 状态管理
    const [packages, setPackages] = useState<PackageType[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [categoryFilter, setCategoryFilter] = useState<string>('all');
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [total, setTotal] = useState(0);
    const [selectedPackage, setSelectedPackage] = useState<PackageType | null>(null);
    const [formData, setFormData] = useState<Partial<CreatePackageRequest | UpdatePackageRequest>>({});

    // Modal控制
    const { isOpen: isCreateOpen, onOpen: onCreateOpen, onClose: onCreateClose } = useDisclosure();
    const { isOpen: isEditOpen, onOpen: onEditOpen, onClose: onEditClose } = useDisclosure();
    const { isOpen: isViewOpen, onOpen: onViewOpen, onClose: onViewClose } = useDisclosure();
    const { isOpen: isDeleteOpen, onOpen: onDeleteOpen, onClose: onDeleteClose } = useDisclosure();

    const pageSize = 10;

    // 套餐类型选项
    const categoryOptions = [
        { key: 'all', label: '全部类型' },
        { key: 'GPT', label: 'GPT' },
        { key: '克劳德', label: '克劳德' },
        { key: 'Claude', label: 'Claude' },
        { key: '其他', label: '其他' },
    ];

    // 套餐等级选项
    const levelOptions = [
        { key: '基础', label: '基础' },
        { key: '黄金', label: '黄金' },
        { key: '钻石', label: '钻石' },
        { key: '终极', label: '终极' },
        { key: 'VIP', label: 'VIP' },
    ];

    // 获取套餐列表
    const fetchPackages = useCallback(async () => {
        setLoading(true);
        try {
            const params: PackageQueryParams = {
                current_page: currentPage,
                page_size: pageSize,
            };

            if (searchQuery.trim()) {
                params.querystring = searchQuery.trim();
            }

            if (categoryFilter !== 'all') {
                params.category = categoryFilter;
            }

            const response = await adminApiService.getPackages(params);

            if (response.code === 20000) {
                setPackages(response.data || []);
                setTotal(response.total || 0);
                setTotalPages(Math.ceil((response.total || 0) / pageSize));
            } else {
                showToast(response.msg || '获取套餐列表失败', 'error');
            }
        } catch (error) {
            console.error('获取套餐列表失败:', error);
            showToast('获取套餐列表失败', 'error');
        } finally {
            setLoading(false);
        }
    }, [currentPage, searchQuery, categoryFilter]);

    // 初始化和依赖更新
    useEffect(() => {
        fetchPackages();
    }, [fetchPackages]);

    // 处理搜索
    const handleSearch = () => {
        setCurrentPage(1);
        fetchPackages();
    };

    // 处理重置
    const handleReset = () => {
        setSearchQuery('');
        setCategoryFilter('all');
        setCurrentPage(1);
    };

    // 处理创建套餐
    const handleCreate = async () => {
        try {
            const createData = formData as CreatePackageRequest;
            if (!createData.package_name || !createData.category || !createData.price || !createData.duration || !createData.level) {
                showToast('套餐名称、类型、价格、时长和等级不能为空', 'warning');
                return;
            }

            const response = await adminApiService.createPackage(createData);
            if (response.code === 20000) {
                showToast('创建套餐成功', 'success');
                onCreateClose();
                fetchPackages();
                setFormData({});
            } else {
                showToast(response.msg || '创建套餐失败', 'error');
            }
        } catch (error) {
            console.error('创建套餐失败:', error);
            showToast('创建套餐失败', 'error');
        }
    };

    // 处理编辑套餐
    const handleEdit = async () => {
        try {
            if (!selectedPackage) return;

            const updateData = {
                id: selectedPackage.id,
                ...formData
            } as UpdatePackageRequest;

            const response = await adminApiService.updatePackage(updateData);
            if (response.code === 20000) {
                showToast('更新套餐成功', 'success');
                onEditClose();
                fetchPackages();
                setFormData({});
                setSelectedPackage(null);
            } else {
                showToast(response.msg || '更新套餐失败', 'error');
            }
        } catch (error) {
            console.error('更新套餐失败:', error);
            showToast('更新套餐失败', 'error');
        }
    };

    // 处理删除套餐
    const handleDelete = async () => {
        try {
            if (!selectedPackage) return;

            const response = await adminApiService.deletePackage(selectedPackage.id);
            if (response.code === 20000) {
                showToast('删除套餐成功', 'success');
                onDeleteClose();
                fetchPackages();
                setSelectedPackage(null);
            } else {
                showToast(response.msg || '删除套餐失败', 'error');
            }
        } catch (error) {
            console.error('删除套餐失败:', error);
            showToast('删除套餐失败', 'error');
        }
    };

    // 打开编辑Modal
    const openEditModal = (pkg: PackageType) => {
        setSelectedPackage(pkg);
        setFormData({
            package_name: pkg.package_name,
            category: pkg.category,
            price: Number(pkg.price),
            duration: pkg.duration,
            level: pkg.level,
            priority: pkg.priority,
            introduce: pkg.introduce || '',
            remarks: pkg.remarks || '',
        });
        onEditOpen();
    };

    // 打开查看Modal
    const openViewModal = (pkg: PackageType) => {
        setSelectedPackage(pkg);
        onViewOpen();
    };

    // 打开删除Modal
    const openDeleteModal = (pkg: PackageType) => {
        setSelectedPackage(pkg);
        onDeleteOpen();
    };

    // 状态渲染
    const renderStatus = (status: number) => (
        <Chip
            color={status === 1 ? 'success' : 'danger'}
            variant="flat"
            size="sm"
        >
            {status === 1 ? '上架' : '下架'}
        </Chip>
    );

    // 等级渲染
    const renderLevel = (level: string) => {
        const colorMap: Record<string, 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'danger'> = {
            '基础': 'default',
            '黄金': 'warning',
            '钻石': 'primary',
            '终极': 'danger',
            'VIP': 'secondary',
        };

        return (
            <Chip
                color={colorMap[level] || 'default'}
                variant="flat"
                size="sm"
                startContent={<Star className="w-3 h-3" />}
            >
                {level}
            </Chip>
        );
    };

    // 操作按钮渲染
    const renderActions = (pkg: PackageType) => (
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
            <DropdownMenu aria-label="套餐操作">
                <DropdownItem
                    key="view"
                    startContent={<Eye className="w-4 h-4" />}
                    onPress={() => openViewModal(pkg)}
                >
                    查看详情
                </DropdownItem>
                <DropdownItem
                    key="edit"
                    startContent={<Edit className="w-4 h-4" />}
                    onPress={() => openEditModal(pkg)}
                >
                    编辑
                </DropdownItem>
                <DropdownItem
                    key="delete"
                    color="danger"
                    startContent={<Trash2 className="w-4 h-4" />}
                    onPress={() => openDeleteModal(pkg)}
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
                <Package className="w-6 h-6 text-blue-600" />
                <h1 className="text-2xl font-bold text-gray-800">套餐管理</h1>
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
                            placeholder="搜索套餐名称..."

                            onChange={(e) => setSearchQuery(e.target.value)}
                            startContent={<Search className="w-4 h-4 text-gray-400" />}
                            className="flex-1"
                            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                        />
                        <Select
                            placeholder="选择类型"
                            value={categoryFilter}
                            onChange={(e) => setCategoryFilter(e.target.value)}
                            className="w-full sm:w-40"
                        >
                            {categoryOptions.map((option) => (
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
                    共 {total} 个套餐
                </div>
                <Button
                    color="primary"
                    startContent={<Plus className="w-4 h-4" />}
                    onPress={onCreateOpen}
                >
                    添加套餐
                </Button>
            </div>

            {/* 套餐表格 */}
            <Card>
                <CardBody className="p-0">
                    <Table
                        aria-label="套餐列表"
                        isHeaderSticky
                        classNames={{
                            wrapper: "max-h-[600px]",
                        }}
                    >
                        <TableHeader>
                            <TableColumn>套餐信息</TableColumn>
                            <TableColumn>价格/时长</TableColumn>
                            <TableColumn>等级</TableColumn>
                            <TableColumn>优先级</TableColumn>
                            <TableColumn>状态</TableColumn>
                            <TableColumn>备注</TableColumn>
                            <TableColumn width={80}>操作</TableColumn>
                        </TableHeader>
                        <TableBody
                            isLoading={loading}
                            loadingContent={<Spinner label="加载中..." />}
                            emptyContent="暂无套餐数据"
                        >
                            {packages.map((pkg) => (
                                <TableRow key={pkg.id}>
                                    <TableCell>
                                        <div className="space-y-1">
                                            <div className="font-medium">{pkg.package_name}</div>
                                            <div className="text-sm text-gray-500">{pkg.category}</div>
                                            <div className="text-xs text-gray-400">ID: {pkg.id}</div>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-1 text-sm font-medium text-green-600">
                                                <DollarSign className="w-3 h-3" />
                                                ¥{pkg.price}
                                            </div>
                                            <div className="flex items-center gap-1 text-xs text-gray-500">
                                                <Clock className="w-3 h-3" />
                                                {pkg.duration}天
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell>{renderLevel(pkg.level)}</TableCell>
                                    <TableCell>
                                        <Chip variant="flat" size="sm">
                                            {pkg.priority}
                                        </Chip>
                                    </TableCell>
                                    <TableCell>{renderStatus(pkg.status)}</TableCell>
                                    <TableCell>
                                        <div className="max-w-40 truncate text-sm text-gray-600">
                                            {pkg.remarks || '-'}
                                        </div>
                                    </TableCell>
                                    <TableCell>{renderActions(pkg)}</TableCell>
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

            {/* 创建套餐Modal */}
            <Modal
                isOpen={isCreateOpen}
                onClose={onCreateClose}
                size="3xl"
                scrollBehavior="inside"
            >
                <ModalContent>
                    <ModalHeader className="flex gap-2 items-center">
                        <Gift className="w-5 h-5" />
                        添加套餐
                    </ModalHeader>
                    <ModalBody>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Input
                                label="套餐名称"
                                placeholder="请输入套餐名称"

                                onChange={(e) => setFormData({ ...formData, package_name: e.target.value })}
                                isRequired
                            />
                            <Select
                                label="套餐类型"
                                placeholder="选择套餐类型"
                                selectedKeys={formData.category ? [formData.category] : []}
                                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                isRequired
                            >
                                {categoryOptions.map((option) => (
                                    <SelectItem key={option.key}>
                                        {option.label}
                                    </SelectItem>
                                ))}
                            </Select>
                            <Input
                                label="套餐价格"
                                type="number"
                                placeholder="请输入价格（元）"

                                onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                                startContent={<DollarSign className="w-4 h-4" />}
                                isRequired
                            />
                            <Input
                                label="套餐时长"
                                type="number"
                                placeholder="请输入时长（天）"

                                onChange={(e) => setFormData({ ...formData, duration: Number(e.target.value) })}
                                startContent={<Clock className="w-4 h-4" />}
                                isRequired
                            />
                            <Select
                                label="套餐等级"
                                placeholder="选择套餐等级"
                                selectedKeys={formData.level ? [formData.level] : []}
                                onChange={(e) => setFormData({ ...formData, level: e.target.value })}
                                isRequired
                            >
                                {levelOptions.map((option) => (
                                    <SelectItem key={option.key}>
                                        {option.label}
                                    </SelectItem>
                                ))}
                            </Select>
                            <Input
                                label="优先级"
                                type="number"
                                placeholder="请输入优先级（数字越大越靠前）"

                                onChange={(e) => setFormData({ ...formData, priority: Number(e.target.value) })}
                                isRequired
                            />
                            <Select
                                label="状态"
                                placeholder="选择状态"
                                selectedKeys={formData.status !== undefined ? [String(formData.status)] : []}
                                onChange={(e) => setFormData({ ...formData, status: Number(e.target.value) as 0 | 1 })}
                            >
                                <SelectItem key="1">上架</SelectItem>
                                <SelectItem key="0">下架</SelectItem>
                            </Select>
                        </div>
                        <Textarea
                            label="套餐介绍"
                            placeholder="请输入套餐介绍（可选）"

                            onChange={(e) => setFormData({ ...formData, introduce: e.target.value })}
                            minRows={3}
                            className="mt-4"
                        />
                        <Textarea
                            label="备注"
                            placeholder="请输入备注信息（可选）"

                            onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                            minRows={2}
                        />
                    </ModalBody>
                    <ModalFooter>
                        <Button variant="light" onPress={onCreateClose}>
                            取消
                        </Button>
                        <Button color="primary" onPress={handleCreate}>
                            创建
                        </Button>
                    </ModalFooter>
                </ModalContent>
            </Modal>

            {/* 编辑套餐Modal */}
            <Modal
                isOpen={isEditOpen}
                onClose={onEditClose}
                size="3xl"
                scrollBehavior="inside"
            >
                <ModalContent>
                    <ModalHeader className="flex gap-2 items-center">
                        <Edit className="w-5 h-5" />
                        编辑套餐
                    </ModalHeader>
                    <ModalBody>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Input
                                label="套餐名称"
                                placeholder="请输入套餐名称"

                                onChange={(e) => setFormData({ ...formData, package_name: e.target.value })}
                            />
                            <Select
                                label="套餐类型"
                                placeholder="选择套餐类型"
                                selectedKeys={formData.category ? [formData.category] : []}
                                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                            >
                                {categoryOptions.map((option) => (
                                    <SelectItem key={option.key}>
                                        {option.label}
                                    </SelectItem>
                                ))}
                            </Select>
                            <Input
                                label="套餐价格"
                                type="number"
                                placeholder="请输入价格（元）"

                                onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                                startContent={<DollarSign className="w-4 h-4" />}
                            />
                            <Input
                                label="套餐时长"
                                type="number"
                                placeholder="请输入时长（天）"

                                onChange={(e) => setFormData({ ...formData, duration: Number(e.target.value) })}
                                startContent={<Clock className="w-4 h-4" />}
                            />
                            <Select
                                label="套餐等级"
                                placeholder="选择套餐等级"
                                selectedKeys={formData.level ? [formData.level] : []}
                                onChange={(e) => setFormData({ ...formData, level: e.target.value })}
                            >
                                {levelOptions.map((option) => (
                                    <SelectItem key={option.key}>
                                        {option.label}
                                    </SelectItem>
                                ))}
                            </Select>
                            <Input
                                label="优先级"
                                type="number"
                                placeholder="请输入优先级"

                                onChange={(e) => setFormData({ ...formData, priority: Number(e.target.value) })}
                            />
                        </div>
                        <Textarea
                            label="套餐介绍"
                            placeholder="请输入套餐介绍"

                            onChange={(e) => setFormData({ ...formData, introduce: e.target.value })}
                            minRows={3}
                            className="mt-4"
                        />
                        <Textarea
                            label="备注"
                            placeholder="请输入备注信息"

                            onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                            minRows={2}
                        />
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

            {/* 查看套餐详情Modal */}
            <Modal
                isOpen={isViewOpen}
                onClose={onViewClose}
                size="2xl"
            >
                <ModalContent>
                    <ModalHeader className="flex gap-2 items-center">
                        <Eye className="w-5 h-5" />
                        套餐详情
                    </ModalHeader>
                    <ModalBody>
                        {selectedPackage && (
                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <span className="text-sm text-gray-500">套餐ID</span>
                                        <div className="font-medium">{selectedPackage.id}</div>
                                    </div>
                                    <div>
                                        <span className="text-sm text-gray-500">套餐名称</span>
                                        <div className="font-medium">{selectedPackage.package_name}</div>
                                    </div>
                                    <div>
                                        <span className="text-sm text-gray-500">套餐类型</span>
                                        <div className="font-medium">{selectedPackage.category}</div>
                                    </div>
                                    <div>
                                        <span className="text-sm text-gray-500">价格</span>
                                        <div className="font-medium text-green-600">¥{selectedPackage.price}</div>
                                    </div>
                                    <div>
                                        <span className="text-sm text-gray-500">时长</span>
                                        <div className="font-medium">{selectedPackage.duration}天</div>
                                    </div>
                                    <div>
                                        <span className="text-sm text-gray-500">等级</span>
                                        <div>{renderLevel(selectedPackage.level)}</div>
                                    </div>
                                    <div>
                                        <span className="text-sm text-gray-500">优先级</span>
                                        <div className="font-medium">{selectedPackage.priority}</div>
                                    </div>
                                    <div>
                                        <span className="text-sm text-gray-500">状态</span>
                                        <div>{renderStatus(selectedPackage.status)}</div>
                                    </div>
                                    {selectedPackage.created_at && (
                                        <div>
                                            <span className="text-sm text-gray-500">创建时间</span>
                                            <div className="font-medium">
                                                {dayjs(selectedPackage.created_at).format('YYYY-MM-DD HH:mm:ss')}
                                            </div>
                                        </div>
                                    )}
                                    {selectedPackage.updated_at && (
                                        <div>
                                            <span className="text-sm text-gray-500">更新时间</span>
                                            <div className="font-medium">
                                                {dayjs(selectedPackage.updated_at).format('YYYY-MM-DD HH:mm:ss')}
                                            </div>
                                        </div>
                                    )}
                                </div>
                                {selectedPackage.introduce && (
                                    <div>
                                        <span className="text-sm text-gray-500">套餐介绍</span>
                                        <div className="mt-1 p-3 bg-gray-50 rounded-lg text-sm">
                                            {selectedPackage.introduce}
                                        </div>
                                    </div>
                                )}
                                {selectedPackage.remarks && (
                                    <div>
                                        <span className="text-sm text-gray-500">备注</span>
                                        <div className="mt-1 p-3 bg-gray-50 rounded-lg text-sm">
                                            {selectedPackage.remarks}
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
                            确定要删除套餐 <strong>{selectedPackage?.package_name}</strong> 吗？
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

export default PackagesManagePage; 