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
    // User as UserComponent,
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
    Divider,
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
    Users,
    UserPlus,
    Filter,
    RefreshCw,
} from 'lucide-react';
import dayjs from 'dayjs';
import adminApiService from '../../services/adminApi';
import { User, CreateUserRequest, UpdateUserRequest, UserQueryParams, UserPackage, Order } from '../../types/admin';
import { showToast } from '../../components/Toast';

/**
 * 用户管理页面
 * 提供用户的增删改查功能
 */
const UsersManagePage: React.FC = () => {
    // 状态管理
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [total, setTotal] = useState(0);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [formData, setFormData] = useState<Partial<CreateUserRequest | UpdateUserRequest>>({});

    // Modal控制
    const { isOpen: isCreateOpen, onOpen: onCreateOpen, onClose: onCreateClose } = useDisclosure();
    const { isOpen: isEditOpen, onOpen: onEditOpen, onClose: onEditClose } = useDisclosure();
    const { isOpen: isViewOpen, onOpen: onViewOpen, onClose: onViewClose } = useDisclosure();
    const { isOpen: isDeleteOpen, onOpen: onDeleteOpen, onClose: onDeleteClose } = useDisclosure();
    const { isOpen: isQuickClearOpen, onOpen: onQuickClearOpen, onClose: onQuickClearClose } = useDisclosure();
    const { isOpen: isClearLimitConfirmOpen, onOpen: onClearLimitConfirmOpen, onClose: onClearLimitConfirmClose } = useDisclosure();

    const [pageSize, setPageSize] = useState<number>(10);
    const [clearLimitKeyword, setClearLimitKeyword] = useState('');
    const [clearLimitCandidates, setClearLimitCandidates] = useState<User[]>([]);
    const [clearLimitSearchLoading, setClearLimitSearchLoading] = useState(false);
    const [clearLimitSubmitting, setClearLimitSubmitting] = useState(false);
    const [pendingClearLimitUser, setPendingClearLimitUser] = useState<User | null>(null);
    const [viewUserPackages, setViewUserPackages] = useState<UserPackage[]>([]);
    const [viewUserOrders, setViewUserOrders] = useState<Order[]>([]);
    const [viewDetailLoading, setViewDetailLoading] = useState(false);

    // 状态选项
    const statusOptions = [
        { key: 'all', label: '全部状态' },
        { key: 'active', label: '正常' },
        { key: 'disabled', label: '禁用' },
    ];

    // 获取用户列表
    const fetchUsers = useCallback(async () => {
        setLoading(true);
        try {
            const params: UserQueryParams = {
                current_page: currentPage,
                page_size: pageSize,
            };

            if (searchQuery.trim()) {
                params.querystring = searchQuery.trim();
            }

            if (statusFilter !== 'all') {
                params.status = statusFilter === 'active' ? 1 : 0;
            }

            const response = await adminApiService.getUsers(params);

            if (response.code === 20000) {
                setUsers(Array.isArray(response.data) ? response.data : []);
                const totalNum = Number(response.total) || 0;
                setTotal(totalNum);
                setTotalPages(Math.ceil(totalNum / pageSize));
            } else {
                // 错误捕获：显示空表格
                setUsers([]);
                setTotal(0);
                setTotalPages(1);
                showToast(response.msg || '获取用户列表失败', 'error');
            }
        } catch (error) {
            // 错误捕获：显示空表格
            setUsers([]);
            setTotal(0);
            setTotalPages(1);
            showToast('获取用户列表失败', 'error');
        } finally {
            setLoading(false);
        }
    }, [currentPage, searchQuery, statusFilter, pageSize]);

    // 初始化和依赖更新
    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);

    // 处理搜索
    const handleSearch = () => {
        setCurrentPage(1);
        fetchUsers();
    };

    // 处理重置
    const handleReset = () => {
        setSearchQuery('');
        setStatusFilter('all');
        setCurrentPage(1);
    };

    // 处理创建用户
    const handleCreate = async () => {
        try {
            const createData = formData as CreateUserRequest;
            if (!createData.email || !createData.password) {
                showToast('邮箱和密码不能为空', 'warning');
                return;
            }

            const response = await adminApiService.createUser(createData);
            if (response.code === 20000) {
                showToast('创建用户成功', 'success');
                onCreateClose();
                fetchUsers();
                setFormData({});
            } else {
                showToast(response.msg || '创建用户失败', 'error');
            }
        } catch (error) {
            showToast('创建用户失败', 'error');
        }
    };

    // 处理编辑用户
    const handleEdit = async () => {
        try {
            if (!selectedUser) return;

            const updateData = {
                id: selectedUser.id,
                ...formData
            } as UpdateUserRequest;

            const response = await adminApiService.updateUser(updateData);
            if (response.code === 20000) {
                showToast('更新用户成功', 'success');
                onEditClose();
                fetchUsers();
                setFormData({});
                setSelectedUser(null);
            } else {
                showToast(response.msg || '更新用户失败', 'error');
            }
        } catch (error) {
            showToast('更新用户失败', 'error');
        }
    };

    // 处理删除用户
    const handleDelete = async () => {
        try {
            if (!selectedUser) return;

            const response = await adminApiService.deleteUser(selectedUser.id);
            if (response.code === 20000) {
                showToast('删除用户成功', 'success');
                onDeleteClose();
                fetchUsers();
                setSelectedUser(null);
            } else {
                showToast(response.msg || '删除用户失败', 'error');
            }
        } catch (error) {
            showToast('删除用户失败', 'error');
        }
    };

    // 统一通过确认弹窗执行解除限速，避免列表操作和批量搜索入口行为不一致。
    const confirmClearLimit = async () => {
        if (!pendingClearLimitUser) return;

        setClearLimitSubmitting(true);
        try {
            const response = await adminApiService.clearUserLimit(pendingClearLimitUser.id);
            if (response.code === 20000) {
                // 构建操作摘要：限速清除 + 解封 + 加白
                const d = response.data || {};
                const parts: string[] = ['限速已清除'];
                if (d.unban === 'done') parts.push('已解封');
                else if (d.unban === 'skipped') parts.push('解封跳过(未封禁)');
                else if (typeof d.unban === 'string' && d.unban.startsWith('failed')) parts.push('解封失败');
                if (d.whitelist === 'done') parts.push('已加白');
                else if (d.whitelist === 'skipped') parts.push('加白跳过(已在白名单)');
                else if (typeof d.whitelist === 'string' && d.whitelist.startsWith('failed')) parts.push('加白失败');
                showToast(parts.join(' | '), 'success');
                onClearLimitConfirmClose();
                setPendingClearLimitUser(null);
            } else {
                showToast(response.msg || '解除限速失败', 'error');
            }
        } catch (error) {
            showToast('解除限速失败', 'error');
        } finally {
            setClearLimitSubmitting(false);
        }
    };

    const openClearLimitConfirm = (user: User) => {
        setPendingClearLimitUser(user);
        onClearLimitConfirmOpen();
    };

    const handleQuickClearLimitSearch = async () => {
        const keyword = clearLimitKeyword.trim();
        if (!keyword) {
            showToast('请输入邮箱、用户名或用户ID', 'warning');
            return;
        }

        setClearLimitSearchLoading(true);
        try {
            const fuzzyResponse = await adminApiService.getUsers({
                current_page: 1,
                page_size: 10,
                querystring: keyword,
            });

            if (fuzzyResponse.code !== 20000) {
                throw new Error(fuzzyResponse.msg || '搜索用户失败');
            }

            let candidates = Array.isArray(fuzzyResponse.data) ? fuzzyResponse.data : [];

            // 纯数字输入时额外补一次 ID 精确查询，兼容后端仅对 querystring 做用户名/邮箱匹配的情况。
            if (/^\d+$/.test(keyword)) {
                const exactIdResponse = await adminApiService.getUsers({
                    current_page: 1,
                    page_size: 1,
                    id: Number(keyword),
                });

                if (exactIdResponse.code === 20000) {
                    const exactUsers = Array.isArray(exactIdResponse.data) ? exactIdResponse.data : [];
                    const mergedUsers = [...candidates, ...exactUsers];
                    candidates = mergedUsers.filter((user, index, list) => list.findIndex((item) => item.id === user.id) === index);
                }
            }

            setClearLimitCandidates(candidates);

            if (candidates.length === 0) {
                showToast('未找到匹配用户，请检查输入内容', 'warning');
            }
        } catch (error) {
            showToast(error instanceof Error ? error.message : '搜索用户失败', 'error');
            setClearLimitCandidates([]);
        } finally {
            setClearLimitSearchLoading(false);
        }
    };

    const handleQuickClearLimitSelect = (user: User) => {
        setPendingClearLimitUser(user);
        onQuickClearClose();
        onClearLimitConfirmOpen();
    };

    // 打开编辑Modal
    const openEditModal = (user: User) => {
        setSelectedUser(user);
        setFormData({
            username: user.username || '',
            email: user.email,
            status: user.status,
            remarks: user.remarks || '',
        });
        onEditOpen();
    };

    // 打开查看Modal（同时加载该用户的套餐和订单记录）
    const openViewModal = async (user: User) => {
        setSelectedUser(user);
        setViewUserPackages([]);
        setViewUserOrders([]);
        setViewDetailLoading(true);
        onViewOpen();
        try {
            const [pkgResp, orderResp] = await Promise.all([
                adminApiService.getUserPackages({ user_id: user.id, page_size: 50 }),
                adminApiService.getOrders({ user_id: user.id, page_size: 50 }),
            ]);
            if (pkgResp.code === 20000) setViewUserPackages(Array.isArray(pkgResp.data) ? pkgResp.data : []);
            if (orderResp.code === 20000) setViewUserOrders(Array.isArray(orderResp.data) ? orderResp.data : []);
        } catch {} finally {
            setViewDetailLoading(false);
        }
    };

    // 打开删除Modal
    const openDeleteModal = (user: User) => {
        setSelectedUser(user);
        onDeleteOpen();
    };

    // 状态渲染
    const renderStatus = (status: number) => (
        <Chip
            color={status === 1 ? 'success' : 'danger'}
            variant="flat"
            size="sm"
        >
            {status === 1 ? '正常' : '禁用'}
        </Chip>
    );

    // 操作按钮渲染
    const renderActions = (user: User) => (
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
            <DropdownMenu aria-label="用户操作">
                <DropdownItem
                    key="view"
                    startContent={<Eye className="w-4 h-4" />}
                    onPress={() => openViewModal(user)}
                >
                    查看详情
                </DropdownItem>
                <DropdownItem
                    key="clear-limit"
                    startContent={<RefreshCw className="w-4 h-4" />}
                    onPress={() => openClearLimitConfirm(user)}
                >
                    清除限速
                </DropdownItem>
                <DropdownItem
                    key="edit"
                    startContent={<Edit className="w-4 h-4" />}
                    onPress={() => openEditModal(user)}
                >
                    编辑
                </DropdownItem>
                <DropdownItem
                    key="delete"
                    color="danger"
                    startContent={<Trash2 className="w-4 h-4" />}
                    onPress={() => openDeleteModal(user)}
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
                <Users className="w-6 h-6 text-blue-600" />
                <h1 className="text-2xl font-bold text-default-800">用户管理</h1>
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
                            placeholder="搜索用户名或邮箱..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            startContent={<Search className="w-4 h-4 text-default-400" />}
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
            <div className="flex justify-between items-center gap-3 flex-wrap">
                <div className="text-sm text-default-600">
                    共 {total} 个用户
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                    <Button
                        variant="bordered"
                        color="primary"
                        startContent={<RefreshCw className="w-4 h-4" />}
                        onPress={() => {
                            setClearLimitKeyword('');
                            setClearLimitCandidates([]);
                            onQuickClearOpen();
                        }}
                    >
                        一键解除限速
                    </Button>
                    <Button
                        color="primary"
                        startContent={<Plus className="w-4 h-4" />}
                        onPress={onCreateOpen}
                    >
                        添加用户
                    </Button>
                </div>
            </div>

            {/* 用户表格 */}
            <Card>
                <CardBody className="p-0">
                    <Table
                        aria-label="用户列表"
                        isHeaderSticky
                        classNames={{
                            wrapper: "max-h-[600px] overflow-x-auto",
                            table: "min-w-[1100px]",
                        }}
                    >
                        <TableHeader>
                            <TableColumn width={100}>ID</TableColumn>
                            <TableColumn>用户信息</TableColumn>
                            <TableColumn>联系方式</TableColumn>
                            <TableColumn>状态</TableColumn>
                            <TableColumn>创建时间</TableColumn>
                            <TableColumn>备注</TableColumn>
                            <TableColumn width={80}>操作</TableColumn>
                        </TableHeader>
                        <TableBody
                            isLoading={loading}
                            loadingContent={<Spinner label="加载中..." />}
                            emptyContent="暂无用户数据"
                        >
                            {users.map((user) => (
                                <TableRow key={user.id} onDoubleClick={() => openEditModal(user)}>
                                    <TableCell>{user.id}</TableCell>
                                    <TableCell>
                                        <div className="space-y-1">
                                            <div className="font-medium">{user.username || '未设置'}</div>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="space-y-1">
                                            <div className="text-sm">{user.email}</div>
                                            {user.tel && (
                                                <div className="text-xs text-default-500">{user.tel}</div>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell>{renderStatus(user.status)}</TableCell>
                                    <TableCell className="text-sm">
                                        {dayjs(user.created_at).format('YYYY-MM-DD HH:mm')}
                                    </TableCell>
                                    <TableCell>
                                        <div className="max-w-40 truncate text-sm text-default-600">
                                            {user.remarks || '-'}
                                        </div>
                                    </TableCell>
                                    <TableCell>{renderActions(user)}</TableCell>
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
                            value={String(pageSize)}
                            onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
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

            {/* 创建用户Modal */}
            <Modal
                isOpen={isCreateOpen}
                onClose={onCreateClose}
                size="2xl"
                scrollBehavior="inside"
            >
                <ModalContent>
                    <ModalHeader className="flex gap-2 items-center">
                        <UserPlus className="w-5 h-5" />
                        添加用户
                    </ModalHeader>
                    <ModalBody>
                        <div className="space-y-4">
                            <Input
                                label="邮箱"
                                placeholder="请输入用户邮箱"

                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                isRequired
                            />
                            <Input
                                label="密码"
                                type="password"
                                placeholder="请输入密码"

                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                isRequired
                            />
                            <Input
                                label="用户名"
                                placeholder="请输入用户名（可选）"

                                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                            />
                            <Select
                                label="状态"
                                placeholder="选择用户状态"
                                selectedKeys={formData.status !== undefined ? [String(formData.status)] : []}
                                onChange={(e) => setFormData({ ...formData, status: Number(e.target.value) as 0 | 1 })}
                            >
                                <SelectItem key="1">正常</SelectItem>
                                <SelectItem key="0">禁用</SelectItem>
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
                            创建
                        </Button>
                    </ModalFooter>
                </ModalContent>
            </Modal>

            {/* 编辑用户Modal */}
            <Modal
                isOpen={isEditOpen}
                onClose={onEditClose}
                size="2xl"
                scrollBehavior="inside"
            >
                <ModalContent>
                    <ModalHeader className="flex gap-2 items-center">
                        <Edit className="w-5 h-5" />
                        编辑用户
                    </ModalHeader>
                    <ModalBody>
                        <div className="space-y-4">
                            <Input
                                label="邮箱"
                                placeholder="请输入用户邮箱"
                                value={typeof (formData as any).email === 'string' ? (formData as any).email : ''}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            />
                            <Input
                                label="用户名"
                                placeholder="请输入用户名"
                                value={typeof (formData as any).username === 'string' ? (formData as any).username : ''}
                                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                            />
                            <Select
                                label="状态"
                                placeholder="选择用户状态"
                                selectedKeys={formData.status !== undefined ? [String(formData.status)] : []}
                                onChange={(e) => setFormData({ ...formData, status: Number(e.target.value) as 0 | 1 })}
                            >
                                <SelectItem key="1">正常</SelectItem>
                                <SelectItem key="0">禁用</SelectItem>
                            </Select>
                            <Textarea
                                label="备注"
                                placeholder="请输入备注信息"
                                value={typeof (formData as any).remarks === 'string' ? (formData as any).remarks : ''}
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

            {/* 查看用户详情Modal */}
            <Modal
                isOpen={isViewOpen}
                onClose={onViewClose}
                size="4xl"
                scrollBehavior="inside"
            >
                <ModalContent>
                    <ModalHeader className="flex gap-2 items-center">
                        <Eye className="w-5 h-5" />
                        用户详情
                    </ModalHeader>
                    <ModalBody>
                        {selectedUser && (
                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <span className="text-sm text-default-500">用户ID</span>
                                        <div className="font-medium">{selectedUser.id}</div>
                                    </div>
                                    <div>
                                        <span className="text-sm text-default-500">用户名</span>
                                        <div className="font-medium">{selectedUser.username || '-'}</div>
                                    </div>
                                    <div>
                                        <span className="text-sm text-default-500">邮箱</span>
                                        <div className="font-medium">{selectedUser.email}</div>
                                    </div>
                                    <div>
                                        <span className="text-sm text-default-500">邀请人用户ID</span>
                                        <div className="font-medium">{selectedUser.inviter_user ?? '-'}</div>
                                    </div>
                                    <div>
                                        <span className="text-sm text-default-500">电话</span>
                                        <div className="font-medium">{selectedUser.tel || '-'}</div>
                                    </div>
                                    <div>
                                        <span className="text-sm text-default-500">状态</span>
                                        <div>{renderStatus(selectedUser.status)}</div>
                                    </div>
                                    <div>
                                        <span className="text-sm text-default-500">创建时间</span>
                                        <div className="font-medium">
                                            {dayjs(selectedUser.created_at).format('YYYY-MM-DD HH:mm:ss')}
                                        </div>
                                    </div>
                                    <div>
                                        <span className="text-sm text-default-500">邀请码</span>
                                        <div className="font-medium">{selectedUser.inviter_code || '-'}</div>
                                    </div>
                                    <div>
                                        <span className="text-sm text-default-500">邀请绑定时间</span>
                                        <div className="font-medium">
                                            {selectedUser.invite_bound_at ? dayjs(selectedUser.invite_bound_at).format('YYYY-MM-DD HH:mm:ss') : '-'}
                                        </div>
                                    </div>
                                    <div>
                                        <span className="text-sm text-default-500">XY UUID Token</span>
                                        <div className="font-medium break-all">{selectedUser.xy_uuid_token || '-'}</div>
                                    </div>
                                    <div>
                                        <span className="text-sm text-default-500">微信OpenID</span>
                                        <div className="font-medium break-all">{selectedUser.wechat_openid || '-'}</div>
                                    </div>
                                </div>
                                <div>
                                    <span className="text-sm text-default-500">备注</span>
                                    <div className="mt-1 p-3 bg-default-50 rounded-lg text-sm whitespace-pre-wrap break-words">
                                        {selectedUser.remarks || '-'}
                                    </div>
                                </div>
                                <div>
                                    <span className="text-sm text-default-500">用户偏好</span>
                                    <div className="mt-1 p-3 bg-default-50 rounded-lg text-sm overflow-x-auto">
                                        <pre className="whitespace-pre-wrap break-words">
                                            {selectedUser.preferences ? JSON.stringify(selectedUser.preferences, null, 2) : '-'}
                                        </pre>
                                    </div>
                                </div>

                                {/* 套餐记录 */}
                                <Divider className="my-2" />
                                <div>
                                    <span className="text-sm font-medium text-default-700">套餐记录</span>
                                    {viewDetailLoading ? (
                                        <div className="py-4 flex justify-center"><Spinner size="sm" /></div>
                                    ) : viewUserPackages.length === 0 ? (
                                        <div className="mt-2 text-sm text-default-400">暂无套餐记录</div>
                                    ) : (
                                        <div className="mt-2 overflow-x-auto">
                                            <table className="w-full text-sm border-collapse">
                                                <thead>
                                                    <tr className="text-default-500 border-b border-default-200">
                                                        <th className="text-left py-1.5 pr-3 font-medium">套餐ID</th>
                                                        <th className="text-left py-1.5 pr-3 font-medium">状态</th>
                                                        <th className="text-left py-1.5 pr-3 font-medium">方式</th>
                                                        <th className="text-left py-1.5 font-medium">创建时间</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {viewUserPackages.map((pkg) => (
                                                        <tr key={pkg.id} className="border-b border-default-100">
                                                            <td className="py-1.5 pr-3">{pkg.package_id}</td>
                                                            <td className="py-1.5 pr-3">
                                                                <Chip size="sm" variant="flat" color={pkg.status === 'active' ? 'success' : pkg.status === 'frozen' ? 'warning' : 'default'}>
                                                                    {pkg.status}
                                                                </Chip>
                                                            </td>
                                                            <td className="py-1.5 pr-3">{pkg.way || '-'}</td>
                                                            <td className="py-1.5">{dayjs(pkg.created_at).format('YYYY-MM-DD HH:mm')}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </div>

                                {/* 订单记录 */}
                                <div>
                                    <span className="text-sm font-medium text-default-700">订单记录</span>
                                    {viewDetailLoading ? (
                                        <div className="py-4 flex justify-center"><Spinner size="sm" /></div>
                                    ) : viewUserOrders.length === 0 ? (
                                        <div className="mt-2 text-sm text-default-400">暂无订单记录</div>
                                    ) : (
                                        <div className="mt-2 overflow-x-auto">
                                            <table className="w-full text-sm border-collapse">
                                                <thead>
                                                    <tr className="text-default-500 border-b border-default-200">
                                                        <th className="text-left py-1.5 pr-3 font-medium">订单号</th>
                                                        <th className="text-left py-1.5 pr-3 font-medium">状态</th>
                                                        <th className="text-left py-1.5 pr-3 font-medium">方式</th>
                                                        <th className="text-left py-1.5 font-medium">创建时间</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {viewUserOrders.map((order) => (
                                                        <tr key={order.id} className="border-b border-default-100">
                                                            <td className="py-1.5 pr-3 font-mono text-xs">{order.order_id}</td>
                                                            <td className="py-1.5 pr-3">
                                                                <Chip size="sm" variant="flat" color={order.status === 'paid' ? 'success' : order.status === 'failed' ? 'danger' : 'warning'}>
                                                                    {order.status}
                                                                </Chip>
                                                            </td>
                                                            <td className="py-1.5 pr-3">{order.way || '-'}</td>
                                                            <td className="py-1.5">{dayjs(order.created_at).format('YYYY-MM-DD HH:mm')}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </div>
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
                            确定要删除用户 <strong>{selectedUser?.username || selectedUser?.email}</strong> 吗？
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

            <Modal
                isOpen={isQuickClearOpen}
                onClose={onQuickClearClose}
                size="3xl"
                scrollBehavior="inside"
            >
                <ModalContent>
                    <ModalHeader className="flex gap-2 items-center">
                        <RefreshCw className="w-5 h-5" />
                        一键解除限速
                    </ModalHeader>
                    <ModalBody>
                        <div className="space-y-4">
                            <div className="flex flex-col sm:flex-row gap-3">
                                <Input
                                    label="邮箱 / 用户名 / 用户ID"
                                    placeholder="支持模糊搜索，例如输入 aaaaaaa"
                                    value={clearLimitKeyword}
                                    onChange={(e) => setClearLimitKeyword(e.target.value)}
                                    onKeyPress={(e) => e.key === 'Enter' && handleQuickClearLimitSearch()}
                                    className="flex-1"
                                />
                                <Button
                                    color="primary"
                                    className="sm:self-end"
                                    onPress={handleQuickClearLimitSearch}
                                    isLoading={clearLimitSearchLoading}
                                >
                                    搜索用户
                                </Button>
                            </div>

                            <Divider />

                            <div className="space-y-3">
                                <div className="text-sm text-default-600">
                                    {clearLimitCandidates.length > 0 ? `找到 ${clearLimitCandidates.length} 个候选用户，请确认目标用户后再解除限速。` : '输入任意邮箱、用户名或用户 ID 后搜索。'}
                                </div>
                                <div className="space-y-2">
                                    {clearLimitCandidates.map((user) => (
                                        <div key={user.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-lg border border-default-200 p-3">
                                            <div className="space-y-1">
                                                <div className="font-medium text-default-900">{user.username || '未设置用户名'}</div>
                                                <div className="text-sm text-default-600">{user.email}</div>
                                                <div className="text-xs text-default-500">
                                                    ID: {user.id} · 状态: {user.status === 1 ? '正常' : '禁用'} · 创建时间: {dayjs(user.created_at).format('YYYY-MM-DD HH:mm:ss')}
                                                </div>
                                            </div>
                                            <Button color="primary" variant="flat" onPress={() => handleQuickClearLimitSelect(user)}>
                                                确认是此用户
                                            </Button>
                                        </div>
                                    ))}
                                    {!clearLimitSearchLoading && clearLimitCandidates.length === 0 && (
                                        <div className="rounded-lg border border-dashed border-default-200 p-6 text-center text-sm text-default-500">
                                            暂无候选用户
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </ModalBody>
                    <ModalFooter>
                        <Button variant="light" onPress={onQuickClearClose}>
                            关闭
                        </Button>
                    </ModalFooter>
                </ModalContent>
            </Modal>

            <Modal
                isOpen={isClearLimitConfirmOpen}
                onClose={() => {
                    setPendingClearLimitUser(null);
                    onClearLimitConfirmClose();
                }}
                size="lg"
            >
                <ModalContent>
                    <ModalHeader className="flex gap-2 items-center">
                        <RefreshCw className="w-5 h-5 text-warning" />
                        确认解除限速
                    </ModalHeader>
                    <ModalBody>
                        <div className="space-y-3 text-sm text-default-700">
                            <p>请确认要为以下用户执行一键操作（解除限速 + 解封 + 加白）：</p>
                            <div className="rounded-lg bg-default-50 p-4 space-y-2">
                                <div><span className="text-default-500">用户ID：</span>{pendingClearLimitUser?.id ?? '-'}</div>
                                <div><span className="text-default-500">用户名：</span>{pendingClearLimitUser?.username || '-'}</div>
                                <div><span className="text-default-500">邮箱：</span>{pendingClearLimitUser?.email || '-'}</div>
                            </div>
                            <p className="text-warning-600">确认后将同步执行：清除限速、解封（如已封禁）、加白（如未在白名单），请确保目标用户无误。</p>
                        </div>
                    </ModalBody>
                    <ModalFooter>
                        <Button
                            variant="light"
                            onPress={() => {
                                setPendingClearLimitUser(null);
                                onClearLimitConfirmClose();
                            }}
                        >
                            取消
                        </Button>
                        <Button color="warning" onPress={confirmClearLimit} isLoading={clearLimitSubmitting}>
                            确认解除限速
                        </Button>
                    </ModalFooter>
                </ModalContent>
            </Modal>
        </div>
    );
};

export default UsersManagePage; 
