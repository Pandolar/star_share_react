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
    MoreVertical,
    Edit,
    Trash2,
    Eye,
    ShoppingCart,
    Filter,
    RefreshCw,
    DollarSign,
    User,
    Calendar,
} from 'lucide-react';
import dayjs from 'dayjs';
import adminApiService from '../../services/adminApi';
import { Order, UpdateOrderRequest, OrderQueryParams } from '../../types/admin';
import { showToast } from '../../components/Toast';

/**
 * 订单管理页面
 * 提供订单的查看、编辑、删除功能
 */
const OrdersManagePage: React.FC = () => {
    // 状态管理
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchInput, setSearchInput] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [total, setTotal] = useState(0);
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
    const [formData, setFormData] = useState<Partial<UpdateOrderRequest>>({});

    // Modal控制
    const { isOpen: isEditOpen, onOpen: onEditOpen, onClose: onEditClose } = useDisclosure();
    const { isOpen: isViewOpen, onOpen: onViewOpen, onClose: onViewClose } = useDisclosure();
    const { isOpen: isDeleteOpen, onOpen: onDeleteOpen, onClose: onDeleteClose } = useDisclosure();

    const [pageSize, setPageSize] = useState<number>(10);

  // 状态选项
  const statusOptions = [
    { key: 'all', label: '全部状态' },
    { key: 'pending', label: '待支付' },
    { key: 'paid', label: '已支付' },
    { key: 'failed', label: '支付失败' },
  ];

    // 获取订单列表
    const fetchOrders = useCallback(async () => {
        setLoading(true);
        try {
            const params: OrderQueryParams = {
                current_page: currentPage,
                page_size: pageSize,
            };

            if (searchQuery.trim()) {
                params.querystring = searchQuery.trim();
            }

            if (statusFilter !== 'all') {
                params.status = statusFilter as 'pending' | 'paid' | 'failed';
            }

            const response = await adminApiService.getOrders(params);

            if (response.code === 20000) {
                setOrders(Array.isArray(response.data) ? response.data : []);
                const totalNum = Number(response.total) || 0;
                const nextTotalPages = Math.max(1, Math.ceil(totalNum / pageSize));
                setTotal(totalNum);
                setTotalPages(nextTotalPages);
                if (currentPage > nextTotalPages) setCurrentPage(nextTotalPages);
            } else {
                // 错误捕获：显示空表格
                setOrders([]);
                setTotal(0);
                setTotalPages(1);
                showToast(response.msg || '获取订单列表失败', 'error');
            }
        } catch {
            // 错误捕获：显示空表格
            setOrders([]);
            setTotal(0);
            setTotalPages(1);
            showToast('获取订单列表失败', 'error');
        } finally {
            setLoading(false);
        }
    }, [currentPage, searchQuery, statusFilter, pageSize]);

    // 初始化和依赖更新
    useEffect(() => {
        fetchOrders();
    }, [fetchOrders]);

    // 处理搜索
    const handleSearch = () => {
        const nextQuery = searchInput.trim();
        if (currentPage === 1 && searchQuery === nextQuery) {
            fetchOrders();
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
        setCurrentPage(1);
    };

    // 处理编辑订单
    const handleEdit = async () => {
        try {
            if (!selectedOrder) return;

            const updateData = {
                id: selectedOrder.id,
                ...formData
            } as UpdateOrderRequest;

            const response = await adminApiService.updateOrder(updateData);
            if (response.code === 20000) {
                showToast('更新订单成功', 'success');
                onEditClose();
                fetchOrders();
                setFormData({});
                setSelectedOrder(null);
            } else {
                showToast(response.msg || '更新订单失败', 'error');
            }
        } catch {
            showToast('更新订单失败', 'error');
        }
    };

    // 处理删除订单
    const handleDelete = async () => {
        try {
            if (!selectedOrder) return;

            const response = await adminApiService.deleteOrder(selectedOrder.id);
            if (response.code === 20000) {
                showToast('删除订单成功', 'success');
                onDeleteClose();
                fetchOrders();
                setSelectedOrder(null);
            } else {
                showToast(response.msg || '删除订单失败', 'error');
            }
        } catch {
            showToast('删除订单失败', 'error');
        }
    };

    // 打开编辑Modal
    const openEditModal = (order: Order) => {
        setSelectedOrder(order);
        setFormData({
            status: order.status,
            remarks: order.remarks || '',
        });
        onEditOpen();
    };

    // 打开查看Modal
    const openViewModal = (order: Order) => {
        setSelectedOrder(order);
        onViewOpen();
    };

    // 打开删除Modal
    const openDeleteModal = (order: Order) => {
        setSelectedOrder(order);
        onDeleteOpen();
    };

    // 状态渲染
    const renderStatus = (status: string) => {
        const colorMap = {
            pending: 'warning',
            paid: 'success',
            failed: 'danger',
        } as const;

        const labelMap = {
            pending: '待支付',
            paid: '已支付',
            failed: '支付失败',
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

    const renderInvoiceStatus = (order: Order) => {
        if (!order.invoice_requested) return <Chip size="sm" variant="flat">未申请</Chip>;
        const labels: Record<string, string> = { not_requested: '未申请', awaiting_payment: '待支付', pending_issue: '待开票', issued: '已开票', cancelled: '已取消', payment_exception: '异常到账' };
        const color = order.invoice_status === 'issued' ? 'success' : order.invoice_status === 'pending_issue' ? 'warning' : 'default';
        return <Chip size="sm" color={color} variant="flat">{labels[order.invoice_status || 'awaiting_payment']}</Chip>;
    };

    // 操作按钮渲染
    const renderActions = (order: Order) => (
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
            <DropdownMenu aria-label="订单操作">
                <DropdownItem
                    key="view"
                    startContent={<Eye className="w-4 h-4" />}
                    onPress={() => openViewModal(order)}
                >
                    查看详情
                </DropdownItem>
                <DropdownItem
                    key="edit"
                    startContent={<Edit className="w-4 h-4" />}
                    onPress={() => openEditModal(order)}
                >
                    编辑
                </DropdownItem>
                <DropdownItem
                    key="delete"
                    color="danger"
                    startContent={<Trash2 className="w-4 h-4" />}
                    onPress={() => openDeleteModal(order)}
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
                <ShoppingCart className="w-6 h-6 text-primary" />
                <h1 className="text-2xl font-bold text-default-800">订单管理</h1>
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
                            placeholder="搜索订单号..."
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
                    共 {total} 个订单
                </div>
            </div>

            {/* 订单表格 */}
            <Card>
                <CardBody className="p-0">
                    <Table
                        aria-label="订单列表"
                        isHeaderSticky
                        classNames={{
                            wrapper: "max-h-[600px] overflow-x-auto",
                            table: "min-w-[1100px]",
                        }}
                    >
                        <TableHeader>
                            <TableColumn width={100}>ID</TableColumn>
                            <TableColumn>订单信息</TableColumn>
                            <TableColumn>用户信息</TableColumn>
                            <TableColumn>套餐信息</TableColumn>
                            <TableColumn>状态</TableColumn>
                            <TableColumn>开票</TableColumn>
                            <TableColumn>创建时间</TableColumn>
                            <TableColumn>备注</TableColumn>
                            <TableColumn width={80}>操作</TableColumn>
                        </TableHeader>
                        <TableBody
                            isLoading={loading}
                            loadingContent={<Spinner label="加载中..." />}
                            emptyContent="暂无订单数据"
                        >
                            {orders.map((order) => (
                                <TableRow key={order.id} onDoubleClick={() => openEditModal(order)}>
                                    <TableCell>{order.id}</TableCell>
                                    <TableCell>
                                        <div className="space-y-1">
                                            <div className="font-medium">{order.order_id}</div>
                                            {order.trade_no && (
                                                <div className="text-xs text-default-500">交易号: {order.trade_no}</div>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <User className="w-4 h-4 text-default-400" />
                                            <span className="text-sm">用户ID: {order.user_id}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <DollarSign className="w-4 h-4 text-default-400" />
                                            <span className="text-sm">套餐ID: {order.package_id}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>{renderStatus(order.status)}</TableCell>
                                    <TableCell>{renderInvoiceStatus(order)}</TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <Calendar className="w-4 h-4 text-default-400" />
                                            <span className="text-sm">
                                                {dayjs(order.created_at).format('YYYY-MM-DD HH:mm')}
                                            </span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="max-w-40 truncate text-sm text-default-600">
                                            {order.remarks || '-'}
                                        </div>
                                    </TableCell>
                                    <TableCell>{renderActions(order)}</TableCell>
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

            {/* 编辑订单Modal */}
            <Modal
                isOpen={isEditOpen}
                onClose={onEditClose}
                size="xl"
            >
                <ModalContent>
                    <ModalHeader className="flex gap-2 items-center">
                        <Edit className="w-5 h-5" />
                        编辑订单
                    </ModalHeader>
                    <ModalBody>
                        <div className="space-y-4">
                            <Select
                                label="订单状态"
                                placeholder="选择订单状态"
                                selectedKeys={formData.status ? [formData.status] : []}
                                onSelectionChange={(keys) => setFormData({ ...formData, status: String(Array.from(keys)[0] || 'pending') as 'pending' | 'paid' | 'failed' })}
                            >
                                <SelectItem key="pending">待支付</SelectItem>
                                <SelectItem key="paid">已支付</SelectItem>
                                <SelectItem key="failed">支付失败</SelectItem>
                            </Select>
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

            {/* 查看订单详情Modal */}
            <Modal
                isOpen={isViewOpen}
                onClose={onViewClose}
                size="2xl"
            >
                <ModalContent>
                    <ModalHeader className="flex gap-2 items-center">
                        <Eye className="w-5 h-5" />
                        订单详情
                    </ModalHeader>
                    <ModalBody>
                        {selectedOrder && (
                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <span className="text-sm text-default-500">订单ID</span>
                                        <div className="font-medium">{selectedOrder.id}</div>
                                    </div>
                                    <div>
                                        <span className="text-sm text-default-500">订单号</span>
                                        <div className="font-medium">{selectedOrder.order_id}</div>
                                    </div>
                                    <div>
                                        <span className="text-sm text-default-500">用户ID</span>
                                        <div className="font-medium">{selectedOrder.user_id}</div>
                                    </div>
                                    <div>
                                        <span className="text-sm text-default-500">套餐ID</span>
                                        <div className="font-medium">{selectedOrder.package_id}</div>
                                    </div>
                                    <div>
                                        <span className="text-sm text-default-500">状态</span>
                                        <div>{renderStatus(selectedOrder.status)}</div>
                                    </div>
                                    <div>
                                        <span className="text-sm text-default-500">开票状态</span>
                                        <div>{renderInvoiceStatus(selectedOrder)}</div>
                                    </div>
                                    {selectedOrder.payable_amount != null && (
                                        <div>
                                            <span className="text-sm text-default-500">应付金额</span>
                                            <div className="font-medium">¥{selectedOrder.payable_amount}</div>
                                        </div>
                                    )}
                                    <div>
                                        <span className="text-sm text-default-500">创建时间</span>
                                        <div className="font-medium">
                                            {dayjs(selectedOrder.created_at).format('YYYY-MM-DD HH:mm:ss')}
                                        </div>
                                    </div>
                                    {selectedOrder.trade_no && (
                                        <div>
                                            <span className="text-sm text-default-500">交易号</span>
                                            <div className="font-medium">{selectedOrder.trade_no}</div>
                                        </div>
                                    )}
                                    {selectedOrder.way && (
                                        <div>
                                            <span className="text-sm text-default-500">支付方式</span>
                                            <div className="font-medium">{selectedOrder.way}</div>
                                        </div>
                                    )}
                                </div>
                                {selectedOrder.remarks && (
                                    <Alert isVisible color="default" variant="flat" title="备注" description={selectedOrder.remarks} />
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
                            确定要删除订单 <strong>{selectedOrder?.order_id}</strong> 吗？
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

export default OrdersManagePage; 
