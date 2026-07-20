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
    Select,
    SelectItem,
    Spinner,
} from '@heroui/react';
import {
    Search,
    Eye,
    UserCheck,
    Filter,
    RefreshCw,
    ExternalLink,
} from 'lucide-react';
import dayjs from 'dayjs';
import { useNavigate } from 'react-router-dom';
import adminApiService from '../../services/adminApi';
import { UserPackage, UserPackageQueryParams } from '../../types/admin';
import { showToast } from '../../components/Toast';
import { PackageSummary, UserSummary } from '../../components/admin/AdminEntitySummary';

const WAY_LABELS: Record<string, string> = {
    purchase: '购买',
    exchange: 'CDK兑换',
    other: '其他',
};

/**
 * 用户套餐记录管理页面
 * 提供用户套餐记录的查看功能
 */
const UserPackagesManagePage: React.FC = () => {
    const navigate = useNavigate();
    // 状态管理
    const [userPackages, setUserPackages] = useState<UserPackage[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchInput, setSearchInput] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [total, setTotal] = useState(0);
    const [selectedUserPackage, setSelectedUserPackage] = useState<UserPackage | null>(null);

    // Modal控制
    const { isOpen: isViewOpen, onOpen: onViewOpen, onClose: onViewClose } = useDisclosure();

    const [pageSize, setPageSize] = useState<number>(10);

  // 状态选项
  const statusOptions = [
    { key: 'all', label: '全部状态' },
    { key: 'active', label: '有效' },
    { key: 'frozen', label: '冻结' },
    { key: 'expired', label: '过期' },
  ];

    // 获取用户套餐记录列表
    const fetchUserPackages = useCallback(async () => {
        setLoading(true);
        try {
            const params: UserPackageQueryParams = {
                current_page: currentPage,
                page_size: pageSize,
            };

            if (searchQuery.trim()) {
                params.querystring = searchQuery.trim();
            }

            if (statusFilter !== 'all') {
                params.status = statusFilter as 'active' | 'frozen' | 'expired';
            }

            const response = await adminApiService.getUserPackages(params);

            if (response.code === 20000) {
                setUserPackages(Array.isArray(response.data) ? response.data : []);
                const totalNum = Number(response.total) || 0;
                const nextTotalPages = Math.max(1, Math.ceil(totalNum / pageSize));
                setTotal(totalNum);
                setTotalPages(nextTotalPages);
                if (currentPage > nextTotalPages) setCurrentPage(nextTotalPages);
            } else {
                // 错误捕获：显示空表格
                setUserPackages([]);
                setTotal(0);
                setTotalPages(1);
                showToast(response.msg || '获取用户套餐记录失败', 'error');
            }
        } catch {
            // 错误捕获：显示空表格
            setUserPackages([]);
            setTotal(0);
            setTotalPages(1);
            showToast('获取用户套餐记录失败', 'error');
        } finally {
            setLoading(false);
        }
    }, [currentPage, searchQuery, statusFilter, pageSize]);

    // 初始化和依赖更新
    useEffect(() => {
        fetchUserPackages();
    }, [fetchUserPackages]);

    // 处理搜索
    const handleSearch = () => {
        const nextQuery = searchInput.trim();
        if (currentPage === 1 && searchQuery === nextQuery) {
            fetchUserPackages();
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

    // 打开查看Modal
    const openViewModal = (userPackage: UserPackage) => {
        setSelectedUserPackage(userPackage);
        onViewOpen();
    };

    // 状态渲染
    const renderStatus = (status: string) => {
        const colorMap = {
            active: 'success',
            frozen: 'warning',
            expired: 'danger',
        } as const;

        const labelMap = {
            active: '有效',
            frozen: '冻结',
            expired: '过期',
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

    const renderOrderStatus = (status: 'pending' | 'paid' | 'failed') => {
        const config = {
            pending: { label: '待支付', color: 'warning' },
            paid: { label: '已支付', color: 'success' },
            failed: { label: '支付失败', color: 'danger' },
        } as const;
        return <Chip size="sm" variant="flat" color={config[status].color}>{config[status].label}</Chip>;
    };

    const openRelatedOrder = (orderId: string) => {
        navigate(`/star-admin/orders?query=${encodeURIComponent(orderId)}`);
    };

    // 剩余时长格式化
    const formatRemainingDuration = (duration?: number) => {
        if (!duration) return '-';
        const hours = Math.floor(duration / 60);
        const minutes = duration % 60;
        if (hours > 0) {
            return `${hours}小时${minutes}分钟`;
        }
        return `${minutes}分钟`;
    };

    return (
        <div className="space-y-6">
            {/* 页面标题 */}
            <div className="flex items-center gap-3">
                <UserCheck className="w-6 h-6 text-primary" />
                <h1 className="text-2xl font-bold text-default-800">用户套餐记录</h1>
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
                            placeholder="搜索用户ID、套餐ID或订单号..."
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

            {/* 统计信息 */}
            <div className="flex justify-between items-center">
                <div className="text-sm text-default-600">
                    共 {total} 条记录
                </div>
            </div>

            {/* 用户套餐记录表格 */}
            <Card>
                <CardBody className="p-0">
                    <Table
                        aria-label="用户套餐记录列表"
                        isHeaderSticky
                        classNames={{
                            wrapper: "max-h-[640px] overflow-x-auto",
                            table: "min-w-[1120px]",
                        }}
                    >
                        <TableHeader>
                            <TableColumn width={160}>记录</TableColumn>
                            <TableColumn width={250}>用户</TableColumn>
                            <TableColumn width={280}>套餐</TableColumn>
                            <TableColumn width={260}>关联订单 / 交易号</TableColumn>
                            <TableColumn width={150}>权益状态</TableColumn>
                            <TableColumn>备注</TableColumn>
                            <TableColumn width={80}>操作</TableColumn>
                        </TableHeader>
                        <TableBody
                            isLoading={loading}
                            loadingContent={<Spinner label="加载中..." />}
                            emptyContent="暂无用户套餐记录"
                        >
                            {userPackages.map((userPackage) => (
                                <TableRow key={userPackage.id}>
                                    <TableCell>
                                        <div className="space-y-1">
                                            <p className="font-medium">记录 #{userPackage.id}</p>
                                            <Chip size="sm" variant="flat" color={userPackage.way === 'exchange' ? 'secondary' : 'primary'}>
                                                {WAY_LABELS[userPackage.way || ''] || userPackage.way || '未知来源'}
                                            </Chip>
                                            <p className="text-xs text-default-400">{dayjs(userPackage.created_at).format('YYYY-MM-DD HH:mm')}</p>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <UserSummary user={userPackage.user} userId={userPackage.user_id} />
                                    </TableCell>
                                    <TableCell>
                                        <PackageSummary packageInfo={userPackage.package} packageId={userPackage.package_id} />
                                    </TableCell>
                                    <TableCell>
                                        <div className="max-w-64 space-y-1.5">
                                            <p className="break-all text-sm font-medium" title={userPackage.order_id || ''}>{userPackage.order_id || '-'}</p>
                                            {userPackage.related_order ? (
                                                <>
                                                    <p className="break-all text-xs text-default-500" title={userPackage.related_order.trade_no || ''}>
                                                        交易号：{userPackage.related_order.trade_no || '渠道未返回'}
                                                    </p>
                                                    <div className="flex items-center gap-1">
                                                        {renderOrderStatus(userPackage.related_order.status)}
                                                        <Button
                                                            isIconOnly
                                                            size="sm"
                                                            variant="light"
                                                            aria-label={`在订单管理查看 ${userPackage.order_id}`}
                                                            onPress={() => openRelatedOrder(userPackage.order_id || userPackage.related_order!.order_id)}
                                                        >
                                                            <ExternalLink className="h-3.5 w-3.5" />
                                                        </Button>
                                                    </div>
                                                </>
                                            ) : (
                                                <p className="text-xs text-default-400">无对应的订单管理记录</p>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="space-y-1.5">
                                            {renderStatus(userPackage.status)}
                                            <p className="text-xs text-default-500">
                                                {userPackage.status === 'frozen'
                                                    ? `剩余 ${formatRemainingDuration(userPackage.remaining_duration)}`
                                                    : userPackage.status === 'active' ? '权益生效中' : '权益已结束'}
                                            </p>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <p className="max-w-48 whitespace-normal text-sm text-default-600">{userPackage.remarks || '-'}</p>
                                    </TableCell>
                                    <TableCell>
                                        <Button
                                            isIconOnly
                                            variant="light"
                                            size="sm"
                                            aria-label={`查看用户套餐记录 ${userPackage.id}`}
                                            onPress={() => openViewModal(userPackage)}
                                        >
                                            <Eye className="w-4 h-4" />
                                        </Button>
                                    </TableCell>
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

            {/* 查看用户套餐详情Modal */}
            <Modal
                isOpen={isViewOpen}
                onClose={onViewClose}
                size="2xl"
            >
                <ModalContent>
                    <ModalHeader className="flex gap-2 items-center">
                        <Eye className="w-5 h-5" />
                        用户套餐详情
                    </ModalHeader>
                    <ModalBody>
                        {selectedUserPackage && (
                            <div className="space-y-4">
                                <div className="grid gap-4 sm:grid-cols-2">
                                    <div className="rounded-xl border border-divider p-3 sm:col-span-2">
                                        <p className="mb-2 text-sm text-default-500">用户</p>
                                        <UserSummary user={selectedUserPackage.user} userId={selectedUserPackage.user_id} />
                                    </div>
                                    <div className="rounded-xl border border-divider p-3 sm:col-span-2">
                                        <p className="mb-2 text-sm text-default-500">套餐</p>
                                        <PackageSummary packageInfo={selectedUserPackage.package} packageId={selectedUserPackage.package_id} />
                                    </div>
                                    <div>
                                        <span className="text-sm text-default-500">记录 / 获取方式</span>
                                        <div className="font-medium">#{selectedUserPackage.id} · {WAY_LABELS[selectedUserPackage.way || ''] || selectedUserPackage.way || '-'}</div>
                                    </div>
                                    <div>
                                        <span className="text-sm text-default-500">权益状态</span>
                                        <div className="mt-1 flex items-center gap-2">{renderStatus(selectedUserPackage.status)}<span className="text-sm">{formatRemainingDuration(selectedUserPackage.remaining_duration)}</span></div>
                                    </div>
                                    <div className="sm:col-span-2">
                                        <span className="text-sm text-default-500">订单号</span>
                                        <div className="break-all font-medium">{selectedUserPackage.order_id || '-'}</div>
                                    </div>
                                    <div className="sm:col-span-2">
                                        <span className="text-sm text-default-500">交易号</span>
                                        <div className="break-all font-medium">{selectedUserPackage.related_order?.trade_no || '无对应订单或渠道未返回'}</div>
                                        {selectedUserPackage.related_order && (
                                            <div className="mt-2 flex items-center gap-2">
                                                {renderOrderStatus(selectedUserPackage.related_order.status)}
                                                <Button size="sm" variant="flat" endContent={<ExternalLink className="h-3.5 w-3.5" />} onPress={() => openRelatedOrder(selectedUserPackage.order_id || selectedUserPackage.related_order!.order_id)}>
                                                    前往订单管理
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                    <div>
                                        <span className="text-sm text-default-500">创建时间</span>
                                        <div className="font-medium">{dayjs(selectedUserPackage.created_at).format('YYYY-MM-DD HH:mm:ss')}</div>
                                    </div>
                                </div>
                                {selectedUserPackage.remarks && (
                                    <Alert isVisible color="default" variant="flat" title="备注" description={selectedUserPackage.remarks} />
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
        </div>
    );
};

export default UserPackagesManagePage; 
