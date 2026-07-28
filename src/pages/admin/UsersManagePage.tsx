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
    // User as UserComponent,
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
    Gift,
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
    const [searchInput, setSearchInput] = useState('');
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
    const { isOpen: isCompensationOpen, onOpen: onCompensationOpen, onClose: onCompensationClose } = useDisclosure();

    // 补偿表单
    const [compensationUser, setCompensationUser] = useState<User | null>(null);
    const [compensationForm, setCompensationForm] = useState<{ level: string; days: string; category: string }>({ level: '', days: '', category: 'GPT' });
    const [compensationSubmitting, setCompensationSubmitting] = useState(false);
    // 套餐等级/类别选项（从套餐列表派生）
    const [packageLevels, setPackageLevels] = useState<Array<{ level: string; category: string }>>([]);

    const [pageSize, setPageSize] = useState<number>(10);
    const [clearLimitKeyword, setClearLimitKeyword] = useState('');
    const [clearLimitCandidates, setClearLimitCandidates] = useState<User[]>([]);
    const [clearLimitSearchLoading, setClearLimitSearchLoading] = useState(false);
    const [clearLimitSubmitting, setClearLimitSubmitting] = useState(false);
    const [refreshingPackageUserId, setRefreshingPackageUserId] = useState<number | null>(null);
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
                const nextTotalPages = Math.max(1, Math.ceil(totalNum / pageSize));
                setTotal(totalNum);
                setTotalPages(nextTotalPages);
                if (currentPage > nextTotalPages) setCurrentPage(nextTotalPages);
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

    // 加载套餐等级/类别（用于补偿弹窗下拉，去重）
    useEffect(() => {
        (async () => {
            try {
                const resp = await adminApiService.getPackages({ page_size: 1000 });
                if (resp.code === 20000 && Array.isArray(resp.data)) {
                    const seen = new Set<string>();
                    const levels: Array<{ level: string; category: string }> = [];
                    resp.data.forEach((p) => {
                        const key = `${p.level}|${p.category}`;
                        if (p.level && p.category && !seen.has(key)) {
                            seen.add(key);
                            levels.push({ level: p.level, category: p.category });
                        }
                    });
                    setPackageLevels(levels);
                }
            } catch {
                showToast('加载补偿套餐选项失败', 'error');
            }
        })();
    }, []);

    // 打开补偿弹窗
    const openCompensationModal = (user: User) => {
        setCompensationUser(user);
        setCompensationForm({ level: '', days: '', category: 'GPT' });
        onCompensationOpen();
    };

    // 提交补偿
    const handleGrantCompensation = async () => {
        if (!compensationUser) return;
        if (!compensationForm.level) {
            showToast('请选择补偿等级', 'warning');
            return;
        }
        const days = parseInt(compensationForm.days);
        if (!days || days <= 0) {
            showToast('请输入有效的补偿天数', 'warning');
            return;
        }
        setCompensationSubmitting(true);
        try {
            const resp = await adminApiService.grantCompensation({
                user_id: compensationUser.id,
                level: compensationForm.level,
                days,
                category: compensationForm.category,
            });
            if (resp.code === 20000) {
                showToast(resp.msg || '补偿成功', 'success');
                onCompensationClose();
                fetchUsers();
            } else {
                showToast(resp.msg || '补偿失败', 'error');
            }
        } catch (e: any) {
            showToast(e?.response?.data?.msg || '补偿失败', 'error');
        } finally {
            setCompensationSubmitting(false);
        }
    };

    // 处理搜索
    const handleSearch = () => {
        const nextQuery = searchInput.trim();
        if (currentPage === 1 && searchQuery === nextQuery) {
            fetchUsers();
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

    const clearUserLimit = async (user: User) => {
        if (clearLimitSubmitting) return;
        setClearLimitSubmitting(true);
        try {
            const response = await adminApiService.clearUserLimit(user.id);
            if (response.code === 20000) {
                const d = response.data || {};
                const parts: string[] = ['限速已清除'];
                if (d.unban === 'done') parts.push('已解封');
                else if (d.unban === 'skipped') parts.push('解封跳过(未封禁)');
                else if (typeof d.unban === 'string' && (d.unban.startsWith('failed') || d.unban.startsWith('error'))) parts.push('解封失败');
                if (d.whitelist === 'done') parts.push('已加白');
                else if (d.whitelist === 'skipped') parts.push('加白跳过(已在白名单)');
                else if (typeof d.whitelist === 'string' && (d.whitelist.startsWith('failed') || d.whitelist.startsWith('error'))) parts.push('加白失败');
                showToast(parts.join(' | '), 'success');
                onClearLimitConfirmClose();
                setPendingClearLimitUser(null);
                return true;
            }
            showToast(response.msg || '解除限速失败', 'error');
        } catch (error) {
            showToast('解除限速失败', 'error');
        } finally {
            setClearLimitSubmitting(false);
        }
        return false;
    };

    const refreshUserPackages = async (user: User) => {
        if (refreshingPackageUserId !== null) return;
        setRefreshingPackageUserId(user.id);
        try {
            const response = await adminApiService.refreshUserPackages(user.id);
            if (response.code !== 20000) throw new Error(response.msg || '刷新用户套餐失败');
            showToast(`用户 #${user.id} 套餐信息已刷新到 Redis`, 'success');
            await fetchUsers();
        } catch (error) {
            showToast(error instanceof Error ? error.message : '刷新用户套餐失败', 'error');
        } finally {
            setRefreshingPackageUserId(null);
        }
    };

    const confirmClearLimit = async () => {
        if (pendingClearLimitUser) await clearUserLimit(pendingClearLimitUser);
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

            setClearLimitCandidates(candidates.length > 1 ? candidates : []);

            if (candidates.length === 1) {
                onQuickClearClose();
                await clearUserLimit(candidates[0]);
            } else if (candidates.length === 0) {
                showToast('未找到匹配用户，请检查输入内容', 'warning');
            }
        } catch (error) {
            showToast(error instanceof Error ? error.message : '搜索用户失败', 'error');
            setClearLimitCandidates([]);
        } finally {
            setClearLimitSearchLoading(false);
        }
    };

    const handleQuickClearLimitSelect = async (user: User) => {
        onQuickClearClose();
        await clearUserLimit(user);
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

    const renderMembership = (user: User, compact = false) => {
        const membership = user.membership;
        if (!membership || membership.status === 'free') {
            return <span className="text-sm text-default-400">Free</span>;
        }
        const timeText = membership.status === 'active' && membership.expires_at
            ? `至 ${dayjs(membership.expires_at).format('YYYY-MM-DD')}`
            : membership.remaining_minutes
                ? `剩余 ${Math.max(1, Math.ceil(membership.remaining_minutes / 1440))} 天`
                : '已冻结';
        if (compact) {
            return (
                <div className="flex min-w-0 items-center gap-2 whitespace-nowrap">
                    <span className="max-w-40 truncate text-sm font-medium" title={membership.package_name || ''}>{membership.package_name || '-'}</span>
                    <Chip size="sm" color="primary" variant="flat">{membership.level}</Chip>
                    <span className="text-xs text-default-500">{timeText}</span>
                </div>
            );
        }
        return (
            <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium">{membership.package_name || '-'}</span>
                <Chip size="sm" color="primary" variant="flat">{membership.level}</Chip>
                <span className="text-sm text-default-500">{membership.category || '-'} · {timeText}</span>
            </div>
        );
    };

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
                    key="refresh-packages"
                    startContent={<RefreshCw className={`w-4 h-4 ${refreshingPackageUserId === user.id ? 'animate-spin' : ''}`} />}
                    onPress={() => refreshUserPackages(user)}
                >
                    刷新用户套餐
                </DropdownItem>
                <DropdownItem
                    key="compensation"
                    startContent={<Gift className="w-4 h-4" />}
                    onPress={() => openCompensationModal(user)}
                >
                    补偿套餐
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
                <Users className="w-6 h-6 text-primary" />
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
                            table: "min-w-[1450px]",
                        }}
                    >
                        <TableHeader>
                            <TableColumn width={80}>ID</TableColumn>
                            <TableColumn>用户</TableColumn>
                            <TableColumn>会员与套餐</TableColumn>
                            <TableColumn>现金累充</TableColumn>
                            <TableColumn>邀请人</TableColumn>
                            <TableColumn>联系方式</TableColumn>
                            <TableColumn>状态</TableColumn>
                            <TableColumn>注册时间</TableColumn>
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
                                    <TableCell><span className="font-medium">{user.username || '未设置用户名'}</span></TableCell>
                                    <TableCell>{renderMembership(user, true)}</TableCell>
                                    <TableCell>
                                        <span className="whitespace-nowrap font-semibold text-success">¥{Number(user.cash_summary?.paid_amount || 0).toFixed(2)}</span>
                                        <span className="ml-1 text-xs text-default-500">· {user.cash_summary?.paid_orders || 0} 笔</span>
                                    </TableCell>
                                    <TableCell>
                                        {user.inviter ? (
                                            <span className="whitespace-nowrap text-sm" title={user.inviter.email || ''}>{user.inviter.username || user.inviter.email || `用户 #${user.inviter.id}`} <span className="text-default-400">#{user.inviter.id}</span></span>
                                        ) : <span className="text-default-400">无</span>}
                                    </TableCell>
                                    <TableCell><span className="whitespace-nowrap text-sm">{user.email}{user.tel ? ` · ${user.tel}` : ''}</span></TableCell>
                                    <TableCell>{renderStatus(user.status)}</TableCell>
                                    <TableCell className="whitespace-nowrap text-sm">{dayjs(user.created_at).format('YYYY-MM-DD HH:mm')}</TableCell>
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
                                value={formData.email || ''}
                                onValueChange={(email) => setFormData({ ...formData, email })}
                                isRequired
                            />
                            <Input
                                label="密码"
                                type="password"
                                placeholder="请输入密码"
                                value={'password' in formData ? formData.password || '' : ''}
                                onValueChange={(password) => setFormData({ ...formData, password })}
                                isRequired
                            />
                            <Input
                                label="用户名"
                                placeholder="请输入用户名（可选）"
                                value={formData.username || ''}
                                onValueChange={(username) => setFormData({ ...formData, username })}
                            />
                            <Select
                                label="状态"
                                placeholder="选择用户状态"
                                selectedKeys={formData.status !== undefined ? [String(formData.status)] : []}
                                onSelectionChange={(keys) => setFormData({ ...formData, status: Number(Array.from(keys)[0] || 1) as 0 | 1 })}
                            >
                                <SelectItem key="1">正常</SelectItem>
                                <SelectItem key="0">禁用</SelectItem>
                            </Select>
                            <Textarea
                                label="备注"
                                placeholder="请输入备注信息（可选）"
                                value={formData.remarks || ''}
                                onValueChange={(remarks) => setFormData({ ...formData, remarks })}
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
                                value={formData.email || ''}
                                onValueChange={(email) => setFormData({ ...formData, email })}
                            />
                            <Input
                                label="用户名"
                                placeholder="请输入用户名"
                                value={formData.username || ''}
                                onValueChange={(username) => setFormData({ ...formData, username })}
                            />
                            <Select
                                label="状态"
                                placeholder="选择用户状态"
                                selectedKeys={formData.status !== undefined ? [String(formData.status)] : []}
                                onSelectionChange={(keys) => setFormData({ ...formData, status: Number(Array.from(keys)[0] || 1) as 0 | 1 })}
                            >
                                <SelectItem key="1">正常</SelectItem>
                                <SelectItem key="0">禁用</SelectItem>
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
                                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                                    <Card shadow="none"><CardBody className="gap-2"><span className="text-sm text-default-500">账号状态</span><div>{renderStatus(selectedUser.status)}</div></CardBody></Card>
                                    <Card shadow="none"><CardBody className="gap-2"><span className="text-sm text-default-500">会员套餐</span>{renderMembership(selectedUser)}</CardBody></Card>
                                    <Card shadow="none"><CardBody className="gap-1"><span className="text-sm text-default-500">现金累充</span><strong className="text-xl text-success">¥{Number(selectedUser.cash_summary?.paid_amount || 0).toFixed(2)} <span className="text-xs font-normal text-default-500">· {selectedUser.cash_summary?.paid_orders || 0} 笔</span></strong></CardBody></Card>
                                    <Card shadow="none"><CardBody className="gap-1"><span className="text-sm text-default-500">邀请人</span><strong className="text-sm">{selectedUser.inviter ? `${selectedUser.inviter.username || selectedUser.inviter.email || '未命名用户'} #${selectedUser.inviter.id}` : '无'}</strong>{selectedUser.inviter?.email && <span className="truncate text-xs text-default-500">{selectedUser.inviter.email}</span>}</CardBody></Card>
                                </div>
                                <p className="text-sm font-medium text-default-700">基础资料</p>
                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
                                        <span className="text-sm text-default-500">邀请人</span>
                                        <div className="font-medium">{selectedUser.inviter ? `${selectedUser.inviter.username || selectedUser.inviter.email || '未命名用户'}（ID #${selectedUser.inviter.id}）` : '无'}</div>
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
                                <Textarea label="备注" value={selectedUser.remarks || '-'} isReadOnly minRows={2} />
                                <Textarea
                                    label="用户偏好"
                                    value={selectedUser.preferences ? JSON.stringify(selectedUser.preferences, null, 2) : '-'}
                                    isReadOnly
                                    minRows={4}
                                />

                                {/* 套餐记录 */}
                                <Divider className="my-2" />
                                <div>
                                    <span className="text-sm font-medium text-default-700">套餐记录</span>
                                    {viewDetailLoading ? (
                                        <div className="py-4 flex justify-center"><Spinner size="sm" /></div>
                                    ) : viewUserPackages.length === 0 ? (
                                        <div className="mt-2 text-sm text-default-400">暂无套餐记录</div>
                                    ) : (
                                        <Table aria-label="用户套餐记录" className="mt-2">
                                            <TableHeader>
                                                <TableColumn>套餐</TableColumn>
                                                <TableColumn>状态</TableColumn>
                                                <TableColumn>来源</TableColumn>
                                                <TableColumn>开通时间</TableColumn>
                                            </TableHeader>
                                            <TableBody>
                                                {viewUserPackages.map((pkg) => (
                                                    <TableRow key={pkg.id}>
                                                        <TableCell><div><p className="font-medium">{pkg.package?.package_name || `套餐 #${pkg.package_id}`}</p><p className="text-xs text-default-500">{pkg.package ? `${pkg.package.category} · ${pkg.package.level}` : `ID ${pkg.package_id}`}</p></div></TableCell>
                                                        <TableCell><Chip size="sm" variant="flat" color={pkg.status === 'active' ? 'success' : pkg.status === 'frozen' ? 'warning' : 'default'}>{pkg.status === 'active' ? '有效' : pkg.status === 'frozen' ? '冻结' : '过期'}</Chip></TableCell>
                                                        <TableCell>{pkg.way === 'purchase' ? '现金购买' : pkg.way === 'exchange' ? '兑换码' : pkg.way || '-'}</TableCell>
                                                        <TableCell>{dayjs(pkg.created_at).format('YYYY-MM-DD HH:mm')}</TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
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
                                        <Table aria-label="用户订单记录" className="mt-2">
                                            <TableHeader>
                                                <TableColumn>订单与套餐</TableColumn>
                                                <TableColumn>状态</TableColumn>
                                                <TableColumn>实付金额</TableColumn>
                                                <TableColumn>创建时间</TableColumn>
                                            </TableHeader>
                                            <TableBody>
                                                {viewUserOrders.map((order) => (
                                                    <TableRow key={order.id}>
                                                        <TableCell><div><p className="font-medium">{order.package?.package_name || `套餐 #${order.package_id}`}</p><code className="text-xs text-default-500">{order.order_id}</code>{order.promotion_code && <Chip className="ml-2" size="sm" color="success" variant="flat">{order.promotion_code}</Chip>}</div></TableCell>
                                                        <TableCell><Chip size="sm" variant="flat" color={order.status === 'paid' ? 'success' : order.status === 'failed' ? 'danger' : 'warning'}>{order.status === 'paid' ? '已支付' : order.status === 'failed' ? '支付失败' : '待支付'}</Chip></TableCell>
                                                        <TableCell><div><p className="font-medium">¥{Number(order.paid_amount ?? order.payable_amount ?? order.base_amount ?? 0).toFixed(2)}</p>{Number(order.discount_amount || 0) > 0 && <p className="text-xs text-success">优惠 ¥{Number(order.discount_amount).toFixed(2)}</p>}</div></TableCell>
                                                        <TableCell>{dayjs(order.created_at).format('YYYY-MM-DD HH:mm')}</TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
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
                                    onValueChange={setClearLimitKeyword}
                                    onKeyDown={(e) => e.key === 'Enter' && handleQuickClearLimitSearch()}
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
                                    {clearLimitCandidates.length > 1 ? `找到 ${clearLimitCandidates.length} 个候选用户，请确认目标用户；确认后会立即解除限速、解封并加白。` : '输入任意邮箱、用户名或用户 ID 后搜索；唯一结果会直接执行。'}
                                </div>
                                <div className="space-y-2">
                                    {clearLimitCandidates.map((user) => (
                                        <Card key={user.id} shadow="none">
                                            <CardBody className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
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
                                            </CardBody>
                                        </Card>
                                    ))}
                                    {!clearLimitSearchLoading && clearLimitCandidates.length === 0 && (
                                        <Alert isVisible color="default" variant="flat" title="暂无候选用户" />
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
                            <Alert
                                isVisible
                                color="warning"
                                variant="flat"
                                title={pendingClearLimitUser?.username || pendingClearLimitUser?.email || '未选择用户'}
                                description={`用户 ID：${pendingClearLimitUser?.id ?? '-'}；邮箱：${pendingClearLimitUser?.email || '-'}。确认后将同步执行清除限速、解封和加白。`}
                            />
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

            {/* 补偿套餐 Modal */}
            <Modal isOpen={isCompensationOpen} onClose={onCompensationClose} size="lg">
                <ModalContent>
                    <ModalHeader className="flex gap-2 items-center">
                        <Gift className="w-5 h-5 text-warning" />
                        补偿套餐
                    </ModalHeader>
                    <ModalBody>
                        <div className="space-y-4">
                            {compensationUser && (
                                <Alert
                                    isVisible
                                    color="default"
                                    variant="flat"
                                    title={compensationUser.username || compensationUser.email}
                                    description={`用户 ID：${compensationUser.id}`}
                                />
                            )}
                            <Select
                                label="补偿等级"
                                placeholder="选择补偿的套餐等级"
                                selectedKeys={compensationForm.level ? [`${compensationForm.level}|${compensationForm.category}`] : []}
                                onSelectionChange={(keys) => {
                                    const [level, category] = String(Array.from(keys)[0] || '').split('|');
                                    setCompensationForm({ ...compensationForm, level: level || '', category: category || 'GPT' });
                                }}
                                isRequired
                                variant="bordered"
                                description="仅列出系统中存在套餐的等级"
                            >
                                {packageLevels.map((pl) => (
                                    <SelectItem key={`${pl.level}|${pl.category}`}>
                                        {pl.level}（{pl.category}）
                                    </SelectItem>
                                ))}
                            </Select>
                            <NumberInput
                                label="补偿天数"
                                placeholder="请输入补偿天数，如 3"
                                value={compensationForm.days ? Number(compensationForm.days) : undefined}
                                onValueChange={(days) => setCompensationForm({ ...compensationForm, days: Number.isNaN(days) ? '' : String(days) })}
                                minValue={1}
                                step={1}
                                isRequired
                                variant="bordered"
                                description="补偿时长将作为该等级套餐排队，在现有套餐消耗完后自动使用"
                            />
                        </div>
                    </ModalBody>
                    <ModalFooter>
                        <Button variant="light" onPress={onCompensationClose}>取消</Button>
                        <Button color="primary" onPress={handleGrantCompensation} isLoading={compensationSubmitting}>
                            确认补偿
                        </Button>
                    </ModalFooter>
                </ModalContent>
            </Modal>
        </div>
    );
};

export default UsersManagePage;
