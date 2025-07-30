import React, { useState, useEffect } from 'react';
import {
  Card,
  CardBody,
  CardHeader,
  Button,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Input,
  Select,
  SelectItem,
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  Chip,
  Avatar,
  useDisclosure,
  Pagination,
  Spinner,
  Badge
} from '@heroui/react';
import {
  Plus,
  Edit,
  Trash2,
  RefreshCw,
  User,
  Search,
  Mail,
  Phone,
  Calendar,
  Shield,
  UserCheck,
  UserX,
  Star,
  Eye,
  EyeOff
} from 'lucide-react';
import { userApi } from '../../services/api';
import { motion } from 'framer-motion';
import { showMessage } from '../../utils/toast';

interface User {
  id: number;
  username: string;
  email?: string;
  phone?: string;
  status?: number;
  level?: number;
  created_at?: string;
  updated_at?: string;
  last_login?: string;
  inviter_user?: string;
  remarks?: string;
  preferences?: string;
}

const AdminUsers: React.FC = () => {
  const [data, setData] = useState<User[]>([]);
  const [filteredData, setFilteredData] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingRecord, setEditingRecord] = useState<User | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedLevel, setSelectedLevel] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [showPassword, setShowPassword] = useState(false);
  const { isOpen, onOpen, onOpenChange } = useDisclosure();

  // 表单数据
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    phone: '',
    level: '1',
    status: '1',
    password: '',
    inviter_user: '',
    remarks: ''
  });

  // 状态选项
  const statuses = [
    { key: 'all', label: '全部状态' },
    { key: '1', label: '正常' },
    { key: '0', label: '禁用' },
  ];

  // 等级选项
  const levels = [
    { key: 'all', label: '全部等级' },
    { key: '1', label: '普通用户' },
    { key: '2', label: 'VIP用户' },
    { key: '3', label: '超级VIP' },
    { key: '4', label: '白金用户' },
    { key: '5', label: '钻石用户' },
  ];

  // 加载数据
  const loadData = async () => {
    setLoading(true);
    try {
      const result = await userApi.list({
        page: 1,
        limit: 100,
      });

      const users = Array.isArray(result.data) ? result.data : [];
      setData(users);
      setFilteredData(users);
    } catch (error: any) {
      showMessage.error(error.message || '加载数据失败');
      setData([]);
      setFilteredData([]);
    } finally {
      setLoading(false);
    }
  };

  // 过滤数据
  useEffect(() => {
    let filtered = data;

    // 按搜索查询过滤
    if (searchQuery) {
      filtered = filtered.filter(user =>
        user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (user.email && user.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (user.phone && user.phone.includes(searchQuery))
      );
    }

    // 按状态过滤
    if (selectedStatus !== 'all') {
      filtered = filtered.filter(user => String(user.status) === selectedStatus);
    }

    // 按等级过滤
    if (selectedLevel !== 'all') {
      filtered = filtered.filter(user => String(user.level) === selectedLevel);
    }

    setFilteredData(filtered);
    setCurrentPage(1);
  }, [data, searchQuery, selectedStatus, selectedLevel]);

  useEffect(() => {
    loadData();
  }, []);

  // 新增用户
  const handleAdd = () => {
    setEditingRecord(null);
    setFormData({
      username: '',
      email: '',
      phone: '',
      level: '1',
      status: '1',
      password: '',
      inviter_user: '',
      remarks: ''
    });
    onOpen();
  };

  // 编辑用户
  const handleEdit = (record: User) => {
    setEditingRecord(record);
    setFormData({
      username: record.username,
      email: record.email || '',
      phone: record.phone || '',
      level: String(record.level || 1),
      status: String(record.status || 1),
      password: '',
      inviter_user: record.inviter_user || '',
      remarks: record.remarks || ''
    });
    onOpen();
  };

  // 删除用户
  const handleDelete = async (id: number, username: string) => {
    if (!window.confirm(`确定删除用户 "${username}" 吗？`)) return;

    try {
      await userApi.delete(id);
      showMessage.success('删除成功');
      loadData();
    } catch (error: any) {
      showMessage.error(error.message || '删除失败');
    }
  };

  // 保存用户
  const handleSave = async () => {
    try {
      const saveData = {
        ...formData,
        level: parseInt(formData.level),
        status: parseInt(formData.status)
      };

      if (editingRecord) {
        await userApi.update({ id: editingRecord.id, ...saveData });
        showMessage.success('更新成功');
      } else {
        await userApi.create(saveData);
        showMessage.success('创建成功');
      }

      onOpenChange();
      loadData();
    } catch (error: any) {
      showMessage.error(error.message || '保存失败');
    }
  };

  const getLevelInfo = (level: number) => {
    const levelMap: { [key: number]: { label: string, color: any, icon: string } } = {
      1: { label: '普通用户', color: 'default', icon: '👤' },
      2: { label: 'VIP用户', color: 'primary', icon: '⭐' },
      3: { label: '超级VIP', color: 'secondary', icon: '🌟' },
      4: { label: '白金用户', color: 'warning', icon: '💎' },
      5: { label: '钻石用户', color: 'danger', icon: '💍' },
    };
    return levelMap[level] || { label: `等级${level}`, color: 'default', icon: '👤' };
  };

  const getUserAvatar = (user: User) => {
    const levelInfo = getLevelInfo(user.level || 1);
    return (
      <div className="relative">
        <Avatar
          name={user.username.charAt(0).toUpperCase()}
          size="sm"
          color={levelInfo.color}
          className="text-xs font-bold"
        />
        {user.level && user.level > 1 && (
          <Badge
            content={levelInfo.icon}
            size="sm"
            className="absolute -top-1 -right-1 text-xs"
          >
            <span></span>
          </Badge>
        )}
      </div>
    );
  };

  // 分页数据
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedData = filteredData.slice(startIndex, endIndex);
  const totalPages = Math.ceil(filteredData.length / pageSize);

  const columns = [
    { name: "用户信息", uid: "user_info", sortable: true },
    { name: "联系方式", uid: "contact", sortable: true },
    { name: "等级", uid: "level", sortable: true },
    { name: "状态", uid: "status", sortable: true },
    { name: "注册时间", uid: "created_at", sortable: true },
    { name: "最后登录", uid: "last_login", sortable: true },
    { name: "操作", uid: "actions" },
  ];

  const renderCell = (user: User, columnKey: React.Key) => {
    const cellValue = user[columnKey as keyof User];
    const levelInfo = getLevelInfo(user.level || 1);

    switch (columnKey) {
      case "user_info":
        return (
          <div className="flex items-center gap-3">
            {getUserAvatar(user)}
            <div className="flex flex-col">
              <p className="text-sm font-semibold text-gray-900">{user.username}</p>
              <p className="text-xs text-gray-500">ID: {user.id}</p>
              {user.inviter_user && (
                <p className="text-xs text-blue-600">邀请人: {user.inviter_user}</p>
              )}
            </div>
          </div>
        );
      case "contact":
        return (
          <div className="flex flex-col gap-1">
            {user.email && (
              <div className="flex items-center gap-1">
                <Mail className="w-3 h-3 text-gray-400" />
                <span className="text-xs text-gray-600">{user.email}</span>
              </div>
            )}
            {user.phone && (
              <div className="flex items-center gap-1">
                <Phone className="w-3 h-3 text-gray-400" />
                <span className="text-xs text-gray-600">{user.phone}</span>
              </div>
            )}
          </div>
        );
      case "level":
        return (
          <div className="flex items-center gap-2">
            <Chip size="sm" color={levelInfo.color} variant="flat">
              {levelInfo.icon} {levelInfo.label}
            </Chip>
          </div>
        );
      case "status":
        return (
          <Chip
            size="sm"
            color={user.status === 1 ? 'success' : 'danger'}
            variant="flat"
            startContent={user.status === 1 ? <UserCheck className="w-3 h-3" /> : <UserX className="w-3 h-3" />}
          >
            {user.status === 1 ? '正常' : '禁用'}
          </Chip>
        );
      case "created_at":
        return (
          <div className="flex items-center gap-1">
            <Calendar className="w-3 h-3 text-gray-400" />
            <span className="text-xs text-gray-500">
              {user.created_at ? new Date(user.created_at).toLocaleDateString() : '-'}
            </span>
          </div>
        );
      case "last_login":
        return (
          <span className="text-xs text-gray-500">
            {user.last_login ? new Date(user.last_login).toLocaleDateString() : '未登录'}
          </span>
        );
      case "actions":
        return (
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="light"
              color="primary"
              onPress={() => handleEdit(user)}
              startContent={<Edit className="w-4 h-4" />}
            >
              编辑
            </Button>
            <Button
              size="sm"
              variant="light"
              color="danger"
              onPress={() => handleDelete(user.id, user.username)}
              startContent={<Trash2 className="w-4 h-4" />}
            >
              删除
            </Button>
          </div>
        );
      default:
        return cellValue;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
            用户管理
          </h1>
          <p className="text-gray-600 mt-1">管理系统中的所有用户账户</p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="flat"
            startContent={<RefreshCw className="w-4 h-4" />}
            onPress={loadData}
            isLoading={loading}
          >
            刷新数据
          </Button>
          <Button
            color="primary"
            variant="shadow"
            startContent={<Plus className="w-4 h-4" />}
            onPress={handleAdd}
            className="bg-gradient-to-r from-blue-500 to-purple-600"
          >
            新增用户
          </Button>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-0">
          <CardBody className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500 text-white">
                <User className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm text-gray-600">总用户数</p>
                <p className="text-2xl font-bold text-gray-900">{data.length}</p>
              </div>
            </div>
          </CardBody>
        </Card>
        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-0">
          <CardBody className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500 text-white">
                <UserCheck className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm text-gray-600">正常用户</p>
                <p className="text-2xl font-bold text-gray-900">
                  {data.filter(u => u.status === 1).length}
                </p>
              </div>
            </div>
          </CardBody>
        </Card>
        <Card className="bg-gradient-to-br from-amber-50 to-amber-100 border-0">
          <CardBody className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500 text-white">
                <Star className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm text-gray-600">VIP用户</p>
                <p className="text-2xl font-bold text-gray-900">
                  {data.filter(u => (u.level || 1) >= 2).length}
                </p>
              </div>
            </div>
          </CardBody>
        </Card>
        <Card className="bg-gradient-to-br from-red-50 to-red-100 border-0">
          <CardBody className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-500 text-white">
                <UserX className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm text-gray-600">禁用用户</p>
                <p className="text-2xl font-bold text-gray-900">
                  {data.filter(u => u.status === 0).length}
                </p>
              </div>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* 搜索和过滤 */}
      <Card className="border-0 shadow-lg">
        <CardBody className="p-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <Input
              placeholder="搜索用户名、邮箱或手机号..."
              value={searchQuery}
              onValueChange={setSearchQuery}
              startContent={<Search className="w-4 h-4 text-gray-400" />}
              className="flex-1"
              variant="bordered"
            />
            <Select
              placeholder="选择状态"
              value={selectedStatus}
              onSelectionChange={(keys) => setSelectedStatus(Array.from(keys)[0] as string)}
              className="w-full sm:w-40"
              variant="bordered"
            >
              {statuses.map((status) => (
                <SelectItem key={status.key}>
                  {status.label}
                </SelectItem>
              ))}
            </Select>
            <Select
              placeholder="选择等级"
              value={selectedLevel}
              onSelectionChange={(keys) => setSelectedLevel(Array.from(keys)[0] as string)}
              className="w-full sm:w-40"
              variant="bordered"
            >
              {levels.map((level) => (
                <SelectItem key={level.key}>
                  {level.label}
                </SelectItem>
              ))}
            </Select>
          </div>
        </CardBody>
      </Card>

      {/* 数据表格 */}
      <Card className="border-0 shadow-lg">
        <Table
          aria-label="用户数据表格"
          isHeaderSticky
          classNames={{
            wrapper: "max-h-[600px]",
          }}
          bottomContent={
            totalPages > 1 ? (
              <div className="flex w-full justify-center">
                <Pagination
                  isCompact
                  showControls
                  showShadow
                  color="primary"
                  page={currentPage}
                  total={totalPages}
                  onChange={setCurrentPage}
                />
              </div>
            ) : null
          }
        >
          <TableHeader columns={columns}>
            {(column) => (
              <TableColumn key={column.uid} allowsSorting={column.sortable}>
                {column.name}
              </TableColumn>
            )}
          </TableHeader>
          <TableBody
            items={paginatedData}
            loadingContent={<Spinner />}
            isLoading={loading}
            emptyContent={
              <div className="text-center py-8">
                <User className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">暂无用户数据</p>
              </div>
            }
          >
            {(item) => (
              <TableRow key={item.id}>
                {(columnKey) => <TableCell>{renderCell(item, columnKey)}</TableCell>}
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      {/* 编辑/新增模态框 */}
      <Modal isOpen={isOpen} onOpenChange={onOpenChange} size="3xl" scrollBehavior="inside">
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="flex flex-col gap-1">
                <h3 className="text-xl font-bold">
                  {editingRecord ? '编辑用户' : '新增用户'}
                </h3>
                <p className="text-sm text-gray-500">
                  {editingRecord ? '修改用户信息' : '创建新的用户账户'}
                </p>
              </ModalHeader>
              <ModalBody>
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                      label="用户名"
                      placeholder="请输入用户名"
                      value={formData.username}
                      onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                      startContent={<User className="w-4 h-4 text-gray-400" />}
                      isRequired
                      variant="bordered"
                    />

                    <Input
                      label="邮箱地址"
                      placeholder="请输入邮箱地址"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      startContent={<Mail className="w-4 h-4 text-gray-400" />}
                      variant="bordered"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                      label="手机号码"
                      placeholder="请输入手机号码"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      startContent={<Phone className="w-4 h-4 text-gray-400" />}
                      variant="bordered"
                    />

                    <Input
                      label="邀请人"
                      placeholder="请输入邀请人用户名"
                      value={formData.inviter_user}
                      onChange={(e) => setFormData({ ...formData, inviter_user: e.target.value })}
                      variant="bordered"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Select
                      label="用户等级"
                      placeholder="请选择用户等级"
                      selectedKeys={[formData.level]}
                      onSelectionChange={(keys) => {
                        const value = Array.from(keys)[0] as string;
                        setFormData({ ...formData, level: value });
                      }}
                      variant="bordered"
                    >
                      <SelectItem key="1">普通用户</SelectItem>
                      <SelectItem key="2">VIP用户</SelectItem>
                      <SelectItem key="3">超级VIP</SelectItem>
                      <SelectItem key="4">白金用户</SelectItem>
                      <SelectItem key="5">钻石用户</SelectItem>
                    </Select>

                    <Select
                      label="账户状态"
                      placeholder="请选择账户状态"
                      selectedKeys={[formData.status]}
                      onSelectionChange={(keys) => {
                        const value = Array.from(keys)[0] as string;
                        setFormData({ ...formData, status: value });
                      }}
                      variant="bordered"
                    >
                      <SelectItem key="1">正常</SelectItem>
                      <SelectItem key="0">禁用</SelectItem>
                    </Select>
                  </div>

                  {!editingRecord && (
                    <Input
                      label="登录密码"
                      placeholder="请输入登录密码"
                      type={showPassword ? "text" : "password"}
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      endContent={
                        <button
                          className="focus:outline-none"
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? (
                            <EyeOff className="w-4 h-4 text-gray-400" />
                          ) : (
                            <Eye className="w-4 h-4 text-gray-400" />
                          )}
                        </button>
                      }
                      isRequired
                      variant="bordered"
                    />
                  )}

                  <Input
                    label="备注信息"
                    placeholder="请输入备注信息..."
                    value={formData.remarks}
                    onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                    variant="bordered"
                  />
                </div>
              </ModalBody>
              <ModalFooter>
                <Button variant="flat" onPress={onClose}>
                  取消
                </Button>
                <Button
                  color="primary"
                  onPress={handleSave}
                  className="bg-gradient-to-r from-blue-500 to-purple-600"
                >
                  保存
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </motion.div>
  );
};

export default AdminUsers;