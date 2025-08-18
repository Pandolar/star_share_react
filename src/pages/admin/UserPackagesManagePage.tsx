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
    User,
    Package,
    Calendar,
    Clock,
} from 'lucide-react';
import dayjs from 'dayjs';
import adminApiService from '../../services/adminApi';
import { UserPackage, UserPackageQueryParams } from '../../types/admin';
import { showToast } from '../../components/Toast';

/**
 * 用户套餐记录管理页面
 * 提供用户套餐记录的查看功能
 */
const UserPackagesManagePage: React.FC = () => {
    // 状态管理
    const [userPackages, setUserPackages] = useState<UserPackage[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [total, setTotal] = useState(0);
    const [selectedUserPackage, setSelectedUserPackage] = useState<UserPackage | null>(null);

    // Modal控制
    const { isOpen: isViewOpen, onOpen: onViewOpen, onClose: onViewClose } = useDisclosure();

    const pageSize = 10;

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
                setUserPackages(response.data || []);
                setTotal(response.total || 0);
                setTotalPages(Math.ceil((response.total || 0) / pageSize));
            } else {
                showToast(response.msg || '获取用户套餐记录失败', 'error');
            }
        } catch (error) {
            console.error('获取用户套餐记录失败:', error);
            showToast('获取用户套餐记录失败', 'error');
        } finally {
            setLoading(false);
        }
    }, [currentPage, searchQuery, statusFilter]);

    // 初始化和依赖更新
    useEffect(() => {
        fetchUserPackages();
    }, [fetchUserPackages]);

    // 处理搜索
    const handleSearch = () => {
        setCurrentPage(1);
        fetchUserPackages();
    };

    // 处理重置
    const handleReset = () => {
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
                <UserCheck className="w-6 h-6 text-blue-600" />
                <h1 className="text-2xl font-bold text-gray-800">用户套餐记录</h1>
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

            {/* 统计信息 */}
            <div className="flex justify-between items-center">
                <div className="text-sm text-gray-600">
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
                            wrapper: "max-h-[600px]",
                        }}
                    >
                        <TableHeader>
                            <TableColumn>记录信息</TableColumn>
                            <TableColumn>用户信息</TableColumn>
                            <TableColumn>套餐信息</TableColumn>
                            <TableColumn>订单信息</TableColumn>
                            <TableColumn>状态</TableColumn>
                            <TableColumn>剩余时长</TableColumn>
                            <TableColumn>创建时间</TableColumn>
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
                                            <div className="font-medium">ID: {userPackage.id}</div>
                                            {userPackage.way && (
                                                <div className="text-xs text-gray-500">获取方式: {userPackage.way}</div>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <User className="w-4 h-4 text-gray-400" />
                                            <span className="text-sm">用户ID: {userPackage.user_id}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <Package className="w-4 h-4 text-gray-400" />
                                            <span className="text-sm">套餐ID: {userPackage.package_id}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="text-sm">
                                            {userPackage.order_id || '-'}
                                        </div>
                                    </TableCell>
                                    <TableCell>{renderStatus(userPackage.status)}</TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <Clock className="w-4 h-4 text-gray-400" />
                                            <span className="text-sm">
                                                {formatRemainingDuration(userPackage.remaining_duration)}
                                            </span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <Calendar className="w-4 h-4 text-gray-400" />
                                            <span className="text-sm">
                                                {dayjs(userPackage.created_at).format('YYYY-MM-DD HH:mm')}
                                            </span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="max-w-40 truncate text-sm text-gray-600">
                                            {userPackage.remarks || '-'}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Button
                                            isIconOnly
                                            variant="light"
                                            size="sm"
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
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <span className="text-sm text-gray-500">记录ID</span>
                                        <div className="font-medium">{selectedUserPackage.id}</div>
                                    </div>
                                    <div>
                                        <span className="text-sm text-gray-500">用户ID</span>
                                        <div className="font-medium">{selectedUserPackage.user_id}</div>
                                    </div>
                                    <div>
                                        <span className="text-sm text-gray-500">套餐ID</span>
                                        <div className="font-medium">{selectedUserPackage.package_id}</div>
                                    </div>
                                    <div>
                                        <span className="text-sm text-gray-500">订单号</span>
                                        <div className="font-medium">{selectedUserPackage.order_id || '-'}</div>
                                    </div>
                                    <div>
                                        <span className="text-sm text-gray-500">状态</span>
                                        <div>{renderStatus(selectedUserPackage.status)}</div>
                                    </div>
                                    <div>
                                        <span className="text-sm text-gray-500">获取方式</span>
                                        <div className="font-medium">{selectedUserPackage.way || '-'}</div>
                                    </div>
                                    <div>
                                        <span className="text-sm text-gray-500">剩余时长</span>
                                        <div className="font-medium">
                                            {formatRemainingDuration(selectedUserPackage.remaining_duration)}
                                        </div>
                                    </div>
                                    <div>
                                        <span className="text-sm text-gray-500">创建时间</span>
                                        <div className="font-medium">
                                            {dayjs(selectedUserPackage.created_at).format('YYYY-MM-DD HH:mm:ss')}
                                        </div>
                                    </div>
                                </div>
                                {selectedUserPackage.remarks && (
                                    <div>
                                        <span className="text-sm text-gray-500">备注</span>
                                        <div className="mt-1 p-3 bg-gray-50 rounded-lg text-sm">
                                            {selectedUserPackage.remarks}
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
        </div>
    );
};

export default UserPackagesManagePage; 