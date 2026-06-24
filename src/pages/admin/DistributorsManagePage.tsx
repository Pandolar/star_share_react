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
    Textarea,
    Spinner,
    Switch,
} from '@heroui/react';
import {
    Search,
    Plus,
    Edit,
    Trash2,
    Eye,
    RefreshCw,
    Users,
    Globe,
    CheckCircle2,
    XCircle,
} from 'lucide-react';
import dayjs from 'dayjs';
import adminApiService from '../../services/adminApi';
import { showToast } from '../../components/Toast';

interface Distributor {
    id: number;
    username: string;
    status: number;
    domains: string;
    notice: string;
    notice_id: string;
    purchase_url: string;
    customer_service_url: string;
    remarks: string;
    created_at: string;
    updated_at: string;
}

interface CreateDistributorRequest {
    username: string;
    password: string;
    domains: string[];
    remarks?: string;
}

interface UpdateDistributorRequest {
    id: number;
    username?: string;
    password?: string;
    status?: number;
    domains?: string[];
    remarks?: string;
}

/**
 * 分销商管理页面
 */
const DistributorsManagePage: React.FC = () => {
    const [distributors, setDistributors] = useState<Distributor[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [total, setTotal] = useState(0);
    const [selectedDistributor, setSelectedDistributor] = useState<Distributor | null>(null);
    const [pageSize] = useState<number>(10);

    // Modal控制
    const { isOpen: isCreateOpen, onOpen: onCreateOpen, onClose: onCreateClose } = useDisclosure();
    const { isOpen: isEditOpen, onOpen: onEditOpen, onClose: onEditClose } = useDisclosure();
    const { isOpen: isViewOpen, onOpen: onViewOpen, onClose: onViewClose } = useDisclosure();
    const { isOpen: isDeleteOpen, onOpen: onDeleteOpen, onClose: onDeleteClose } = useDisclosure();

    // 表单数据
    const [formData, setFormData] = useState<Partial<CreateDistributorRequest & { status: number }>>({
        username: '',
        password: '',
        domains: [],
        remarks: '',
        status: 1,
    });
    const [domainsInput, setDomainsInput] = useState('');

    // 获取分销商列表
    const fetchDistributors = useCallback(async () => {
        try {
            setLoading(true);
            const params: any = {
                page: currentPage,
                page_size: pageSize,
            };
            if (searchQuery) params.search = searchQuery;

            const response = await adminApiService.getDistributors(params);
            if (response.code === 20000) {
                const data = Array.isArray(response.data) ? response.data : response.data?.list || [];
                setDistributors(data);
                setTotal(response.data?.total || data.length);
                setTotalPages(Math.ceil((response.data?.total || data.length) / pageSize));
            } else {
                showToast(response.msg || '获取分销商列表失败', 'error');
            }
        } catch (error: any) {
            console.error('获取分销商列表失败:', error);
            showToast(error.message || '获取分销商列表失败', 'error');
        } finally {
            setLoading(false);
        }
    }, [currentPage, pageSize, searchQuery]);

    useEffect(() => {
        fetchDistributors();
    }, [fetchDistributors]);

    // 创建分销商
    const handleCreate = async () => {
        try {
            if (!formData.username || !formData.password) {
                showToast('请填写账号和密码', 'error');
                return;
            }

            const domains = domainsInput
                .split('\n')
                .map(d => d.trim())
                .filter(d => d.length > 0);

            if (domains.length === 0) {
                showToast('请至少添加一个域名', 'error');
                return;
            }

            const requestData: CreateDistributorRequest = {
                username: formData.username!,
                password: formData.password!,
                domains: domains,
                remarks: formData.remarks,
            };

            const response = await adminApiService.createDistributor(requestData);
            if (response.code === 20000) {
                showToast('创建成功', 'success');
                onCreateClose();
                resetForm();
                fetchDistributors();
            } else {
                showToast(response.msg || '创建失败', 'error');
            }
        } catch (error: any) {
            console.error('创建分销商失败:', error);
            showToast(error.message || '创建失败', 'error');
        }
    };

    // 更新分销商
    const handleUpdate = async () => {
        try {
            if (!selectedDistributor) return;

            const domains = domainsInput
                .split('\n')
                .map(d => d.trim())
                .filter(d => d.length > 0);

            const requestData: UpdateDistributorRequest = {
                id: selectedDistributor.id,
                username: formData.username,
                password: formData.password,
                status: formData.status,
                domains: domains.length > 0 ? domains : undefined,
                remarks: formData.remarks,
            };

            const response = await adminApiService.updateDistributor(requestData);
            if (response.code === 20000) {
                showToast('更新成功', 'success');
                onEditClose();
                resetForm();
                fetchDistributors();
            } else {
                showToast(response.msg || '更新失败', 'error');
            }
        } catch (error: any) {
            console.error('更新分销商失败:', error);
            showToast(error.message || '更新失败', 'error');
        }
    };

    // 删除分销商
    const handleDelete = async () => {
        try {
            if (!selectedDistributor) return;

            const response = await adminApiService.deleteDistributor(selectedDistributor.id);
            if (response.code === 20000) {
                showToast('删除成功', 'success');
                onDeleteClose();
                fetchDistributors();
            } else {
                showToast(response.msg || '删除失败', 'error');
            }
        } catch (error: any) {
            console.error('删除分销商失败:', error);
            showToast(error.message || '删除失败', 'error');
        }
    };

    // 重置表单
    const resetForm = () => {
        setFormData({
            username: '',
            password: '',
            domains: [],
            remarks: '',
        });
        setDomainsInput('');
        setSelectedDistributor(null);
    };

    // 打开创建Modal
    const openCreateModal = () => {
        resetForm();
        onCreateOpen();
    };

    // 打开编辑Modal
    const openEditModal = (distributor: Distributor) => {
        setSelectedDistributor(distributor);
        let domains: string[] = [];
        try {
            domains = JSON.parse(distributor.domains || '[]');
        } catch {
            domains = [];
        }
        setFormData({
            username: distributor.username,
            password: '',
            status: distributor.status,
            remarks: distributor.remarks,
        });
        setDomainsInput(domains.join('\n'));
        onEditOpen();
    };

    // 打开查看Modal
    const openViewModal = (distributor: Distributor) => {
        setSelectedDistributor(distributor);
        onViewOpen();
    };

    // 打开删除Modal
    const openDeleteModal = (distributor: Distributor) => {
        setSelectedDistributor(distributor);
        onDeleteOpen();
    };

    // 快速切换状态
    const toggleStatus = async (distributor: Distributor) => {
        try {
            const newStatus = distributor.status === 1 ? 0 : 1;
            const response = await adminApiService.updateDistributor({
                id: distributor.id,
                status: newStatus,
            });
            if (response.code === 20000) {
                showToast(newStatus === 1 ? '已启用' : '已禁用', 'success');
                fetchDistributors();
            } else {
                showToast(response.msg || '操作失败', 'error');
            }
        } catch (error: any) {
            console.error('切换状态失败:', error);
            showToast(error.message || '操作失败', 'error');
        }
    };

    // 解析域名数组
    const parseDomains = (domainsStr: string): string[] => {
        try {
            return JSON.parse(domainsStr || '[]');
        } catch {
            return [];
        }
    };

    return (
        <div className="space-y-6">
            {/* 页面标题 */}
            <div>
                <div className="flex items-center gap-3 mb-2">
                    <Users className="w-6 h-6 text-blue-600" />
                    <h1 className="text-2xl font-bold text-default-800">分销商管理</h1>
                </div>
                <p className="text-default-500">管理白牌分销商账号、域名和配置</p>
            </div>

            {/* 工具栏 */}
            <Card>
                <CardBody>
                    <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                        <div className="flex gap-3 items-center flex-1 w-full sm:w-auto">
                            <Input
                                placeholder="搜索账号、域名、备注..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && fetchDistributors()}
                                startContent={<Search size={18} />}
                                className="max-w-md"
                            />
                            <Button
                                color="primary"
                                variant="flat"
                                onPress={fetchDistributors}
                                isIconOnly
                            >
                                <RefreshCw size={18} />
                            </Button>
                        </div>
                        <Button
                            color="primary"
                            onPress={openCreateModal}
                            startContent={<Plus size={18} />}
                        >
                            创建分销商
                        </Button>
                    </div>
                </CardBody>
            </Card>

            {/* 统计信息 */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card>
                    <CardBody className="text-center">
                        <p className="text-default-500 text-sm">总分销商</p>
                        <p className="text-2xl font-bold">{total}</p>
                    </CardBody>
                </Card>
                <Card>
                    <CardBody className="text-center">
                        <p className="text-default-500 text-sm">启用中</p>
                        <p className="text-2xl font-bold text-success">
                            {distributors.filter(d => d.status === 1).length}
                        </p>
                    </CardBody>
                </Card>
                <Card>
                    <CardBody className="text-center">
                        <p className="text-default-500 text-sm">已禁用</p>
                        <p className="text-2xl font-bold text-danger">
                            {distributors.filter(d => d.status === 0).length}
                        </p>
                    </CardBody>
                </Card>
            </div>

            {/* 分销商表格 */}
            <Card>
                <CardBody>
                    {loading ? (
                        <div className="flex justify-center items-center py-20">
                            <Spinner size="lg" />
                        </div>
                    ) : (
                        <>
                            <Table
                                aria-label="分销商列表"
                                className="min-h-[400px]"
                            >
                                <TableHeader>
                                    <TableColumn>ID</TableColumn>
                                    <TableColumn>账号</TableColumn>
                                    <TableColumn>状态</TableColumn>
                                    <TableColumn>域名</TableColumn>
                                    <TableColumn>备注</TableColumn>
                                    <TableColumn>创建时间</TableColumn>
                                    <TableColumn>操作</TableColumn>
                                </TableHeader>
                                <TableBody emptyContent="暂无分销商">
                                    {distributors.map((distributor) => {
                                        const domains = parseDomains(distributor.domains);
                                        return (
                                            <TableRow key={distributor.id}>
                                                <TableCell>{distributor.id}</TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-2">
                                                        <Users size={16} className="text-default-400" />
                                                        <span className="font-medium">{distributor.username}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <Switch
                                                        isSelected={distributor.status === 1}
                                                        onValueChange={() => toggleStatus(distributor)}
                                                        size="sm"
                                                        color="success"
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex flex-wrap gap-1">
                                                        {domains.slice(0, 2).map((domain, idx) => (
                                                            <Chip
                                                                key={idx}
                                                                size="sm"
                                                                variant="flat"
                                                                color="primary"
                                                                startContent={<Globe size={12} />}
                                                            >
                                                                {domain}
                                                            </Chip>
                                                        ))}
                                                        {domains.length > 2 && (
                                                            <Chip size="sm" variant="flat">
                                                                +{domains.length - 2}
                                                            </Chip>
                                                        )}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <span className="text-sm text-default-500">
                                                        {distributor.remarks || '-'}
                                                    </span>
                                                </TableCell>
                                                <TableCell>
                                                    <span className="text-sm">
                                                        {dayjs(distributor.created_at).format('YYYY-MM-DD HH:mm')}
                                                    </span>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex gap-2">
                                                        <Button
                                                            size="sm"
                                                            variant="flat"
                                                            color="primary"
                                                            onPress={() => openViewModal(distributor)}
                                                            isIconOnly
                                                        >
                                                            <Eye size={16} />
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            variant="flat"
                                                            color="warning"
                                                            onPress={() => openEditModal(distributor)}
                                                            isIconOnly
                                                        >
                                                            <Edit size={16} />
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            variant="flat"
                                                            color="danger"
                                                            onPress={() => openDeleteModal(distributor)}
                                                            isIconOnly
                                                        >
                                                            <Trash2 size={16} />
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>

                            {/* 分页 */}
                            {totalPages > 1 && (
                                <div className="flex justify-center mt-4">
                                    <Pagination
                                        total={totalPages}
                                        page={currentPage}
                                        onChange={setCurrentPage}
                                        showControls
                                    />
                                </div>
                            )}
                        </>
                    )}
                </CardBody>
            </Card>

            {/* 创建分销商Modal */}
            <Modal isOpen={isCreateOpen} onClose={onCreateClose} size="2xl">
                <ModalContent>
                    <ModalHeader>创建分销商</ModalHeader>
                    <ModalBody>
                        <div className="space-y-4">
                            <Input
                                label="账号"
                                placeholder="请输入分销商账号"
                                value={formData.username}
                                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                isRequired
                            />
                            <Input
                                label="密码"
                                type="password"
                                placeholder="请输入密码（至少8位）"
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                isRequired
                            />
                            <Textarea
                                label="域名列表"
                                placeholder="每行一个域名，例如：&#10;aaa.com&#10;www.aaa.com"
                                value={domainsInput}
                                onChange={(e) => setDomainsInput(e.target.value)}
                                minRows={4}
                                isRequired
                                description="分销商的白牌域名，一个域名只能属于一个分销商"
                            />
                            <Textarea
                                label="备注"
                                placeholder="请输入备注信息"
                                value={formData.remarks}
                                onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                                minRows={2}
                            />
                        </div>
                    </ModalBody>
                    <ModalFooter>
                        <Button variant="flat" onPress={onCreateClose}>
                            取消
                        </Button>
                        <Button color="primary" onPress={handleCreate}>
                            创建
                        </Button>
                    </ModalFooter>
                </ModalContent>
            </Modal>

            {/* 编辑分销商Modal */}
            <Modal isOpen={isEditOpen} onClose={onEditClose} size="2xl">
                <ModalContent>
                    <ModalHeader>编辑分销商</ModalHeader>
                    <ModalBody>
                        <div className="space-y-4">
                            <Input
                                label="账号"
                                placeholder="请输入分销商账号"
                                value={formData.username}
                                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                            />
                            <Input
                                label="新密码"
                                type="password"
                                placeholder="留空则不修改密码"
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                description="留空表示不修改密码"
                            />
                            <Textarea
                                label="域名列表"
                                placeholder="每行一个域名"
                                value={domainsInput}
                                onChange={(e) => setDomainsInput(e.target.value)}
                                minRows={4}
                            />
                            <Textarea
                                label="备注"
                                placeholder="请输入备注信息"
                                value={formData.remarks}
                                onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                                minRows={2}
                            />
                        </div>
                    </ModalBody>
                    <ModalFooter>
                        <Button variant="flat" onPress={onEditClose}>
                            取消
                        </Button>
                        <Button color="primary" onPress={handleUpdate}>
                            保存
                        </Button>
                    </ModalFooter>
                </ModalContent>
            </Modal>

            {/* 查看分销商Modal */}
            <Modal isOpen={isViewOpen} onClose={onViewClose} size="2xl">
                <ModalContent>
                    <ModalHeader>分销商详情</ModalHeader>
                    <ModalBody>
                        {selectedDistributor && (
                            <div className="space-y-4">
                                <div>
                                    <p className="text-sm text-default-500 mb-1">账号</p>
                                    <p className="font-medium">{selectedDistributor.username}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-default-500 mb-1">状态</p>
                                    <Chip
                                        color={selectedDistributor.status === 1 ? 'success' : 'danger'}
                                        variant="flat"
                                        startContent={selectedDistributor.status === 1 ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                                    >
                                        {selectedDistributor.status === 1 ? '启用' : '禁用'}
                                    </Chip>
                                </div>
                                <div>
                                    <p className="text-sm text-default-500 mb-2">域名列表</p>
                                    <div className="flex flex-wrap gap-2">
                                        {parseDomains(selectedDistributor.domains).map((domain, idx) => (
                                            <Chip key={idx} variant="flat" color="primary" startContent={<Globe size={12} />}>
                                                {domain}
                                            </Chip>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <p className="text-sm text-default-500 mb-1">公告</p>
                                    <p className="text-sm">{selectedDistributor.notice || '-'}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-default-500 mb-1">购买链接</p>
                                    <p className="text-sm break-all">{selectedDistributor.purchase_url || '-'}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-default-500 mb-1">客服链接</p>
                                    <p className="text-sm break-all">{selectedDistributor.customer_service_url || '-'}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-default-500 mb-1">备注</p>
                                    <p className="text-sm">{selectedDistributor.remarks || '-'}</p>
                                </div>
                                <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                                    <div>
                                        <p className="text-sm text-default-500 mb-1">创建时间</p>
                                        <p className="text-sm">{dayjs(selectedDistributor.created_at).format('YYYY-MM-DD HH:mm:ss')}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-default-500 mb-1">更新时间</p>
                                        <p className="text-sm">{dayjs(selectedDistributor.updated_at).format('YYYY-MM-DD HH:mm:ss')}</p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </ModalBody>
                    <ModalFooter>
                        <Button onPress={onViewClose}>关闭</Button>
                    </ModalFooter>
                </ModalContent>
            </Modal>

            {/* 删除确认Modal */}
            <Modal isOpen={isDeleteOpen} onClose={onDeleteClose}>
                <ModalContent>
                    <ModalHeader>确认删除</ModalHeader>
                    <ModalBody>
                        <p>确定要删除分销商 <strong>{selectedDistributor?.username}</strong> 吗？</p>
                        <p className="text-danger text-sm mt-2">注意：删除后将无法恢复，该分销商的所有配置将被清除。</p>
                    </ModalBody>
                    <ModalFooter>
                        <Button variant="flat" onPress={onDeleteClose}>
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

export default DistributorsManagePage;
