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
    User as UserComponent,
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
import { User, CreateUserRequest, UpdateUserRequest, UserQueryParams } from '../../types/admin';
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

    const pageSize = 10;

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
                setUsers(response.data || []);
                setTotal(response.total || 0);
                setTotalPages(Math.ceil((response.total || 0) / pageSize));
            } else {
                showToast(response.msg || '获取用户列表失败', 'error');
            }
        } catch (error) {
            console.error('获取用户列表失败:', error);
            showToast('获取用户列表失败', 'error');
        } finally {
            setLoading(false);
        }
    }, [currentPage, searchQuery, statusFilter]);

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
            console.error('创建用户失败:', error);
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
            console.error('更新用户失败:', error);
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
            console.error('删除用户失败:', error);
            showToast('删除用户失败', 'error');
        }
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

    // 打开查看Modal
    const openViewModal = (user: User) => {
        setSelectedUser(user);
        onViewOpen();
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
                <h1 className="text-2xl font-bold text-gray-800">用户管理</h1>
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
                    共 {total} 个用户
                </div>
                <Button
                    color="primary"
                    startContent={<Plus className="w-4 h-4" />}
                    onPress={onCreateOpen}
                >
                    添加用户
                </Button>
            </div>

            {/* 用户表格 */}
            <Card>
                <CardBody className="p-0">
                    <Table
                        aria-label="用户列表"
                        isHeaderSticky
                        classNames={{
                            wrapper: "max-h-[600px]",
                        }}
                    >
                        <TableHeader>
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
                                <TableRow key={user.id}>
                                    <TableCell>
                                        <UserComponent
                                            name={user.username || '未设置'}
                                            description={`ID: ${user.id}`}
                                            avatarProps={{
                                                src: "",
                                                fallback: user.username?.[0]?.toUpperCase() || 'U',
                                                className: "bg-blue-100 text-blue-600",
                                            }}
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <div className="space-y-1">
                                            <div className="text-sm">{user.email}</div>
                                            {user.tel && (
                                                <div className="text-xs text-gray-500">{user.tel}</div>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell>{renderStatus(user.status)}</TableCell>
                                    <TableCell className="text-sm">
                                        {dayjs(user.created_at).format('YYYY-MM-DD HH:mm')}
                                    </TableCell>
                                    <TableCell>
                                        <div className="max-w-40 truncate text-sm text-gray-600">
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

                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            />
                            <Input
                                label="用户名"
                                placeholder="请输入用户名"

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
                size="2xl"
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
                                        <span className="text-sm text-gray-500">用户ID</span>
                                        <div className="font-medium">{selectedUser.id}</div>
                                    </div>
                                    <div>
                                        <span className="text-sm text-gray-500">用户名</span>
                                        <div className="font-medium">{selectedUser.username || '-'}</div>
                                    </div>
                                    <div>
                                        <span className="text-sm text-gray-500">邮箱</span>
                                        <div className="font-medium">{selectedUser.email}</div>
                                    </div>
                                    <div>
                                        <span className="text-sm text-gray-500">电话</span>
                                        <div className="font-medium">{selectedUser.tel || '-'}</div>
                                    </div>
                                    <div>
                                        <span className="text-sm text-gray-500">状态</span>
                                        <div>{renderStatus(selectedUser.status)}</div>
                                    </div>
                                    <div>
                                        <span className="text-sm text-gray-500">创建时间</span>
                                        <div className="font-medium">
                                            {dayjs(selectedUser.created_at).format('YYYY-MM-DD HH:mm:ss')}
                                        </div>
                                    </div>
                                    <div>
                                        <span className="text-sm text-gray-500">邀请码</span>
                                        <div className="font-medium">{selectedUser.inviter_code || '-'}</div>
                                    </div>
                                    <div>
                                        <span className="text-sm text-gray-500">微信OpenID</span>
                                        <div className="font-medium">{selectedUser.wechat_openid || '-'}</div>
                                    </div>
                                </div>
                                {selectedUser.remarks && (
                                    <div>
                                        <span className="text-sm text-gray-500">备注</span>
                                        <div className="mt-1 p-3 bg-gray-50 rounded-lg text-sm">
                                            {selectedUser.remarks}
                                        </div>
                                    </div>
                                )}
                                {selectedUser.preferences && (
                                    <div>
                                        <span className="text-sm text-gray-500">用户偏好</span>
                                        <div className="mt-1 p-3 bg-gray-50 rounded-lg text-sm">
                                            <pre>{JSON.stringify(selectedUser.preferences, null, 2)}</pre>
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
                            确定要删除用户 <strong>{selectedUser?.username || selectedUser?.email}</strong> 吗？
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

export default UsersManagePage; 