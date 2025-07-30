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
  Textarea,
  Select,
  SelectItem,
  Chip,
  useDisclosure,
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  Pagination,
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
  Spinner,
  Divider,
  Avatar
} from '@heroui/react';
import { 
  Plus, 
  Edit, 
  Trash2, 
  RefreshCw, 
  Package, 
  Search,
  Filter,
  MoreVertical,
  Eye,
  Calendar,
  DollarSign,
  Clock,
  Star
} from 'lucide-react';
import { packageApi } from '../../services/api';
import { motion } from 'framer-motion';
import { showMessage } from '../../utils/toast';

interface Package {
  id: number;
  package_name: string;
  category: string;
  price: number;
  duration: number;
  introduce?: string;
  level: number;
  priority: number;
  remarks?: string;
  status?: number;
  created_at?: string;
  updated_at?: string;
}

const AdminPackages: React.FC = () => {
  const [data, setData] = useState<Package[]>([]);
  const [filteredData, setFilteredData] = useState<Package[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingRecord, setEditingRecord] = useState<Package | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const { isOpen, onOpen, onOpenChange } = useDisclosure();

  // 表单数据
  const [formData, setFormData] = useState({
    package_name: '',
    category: 'personal',
    price: '',
    duration: '',
    introduce: '',
    level: '',
    priority: '',
    remarks: '',
    status: '1'
  });

  // 分类选项
  const categories = [
    { key: 'all', label: '全部分类' },
    { key: 'personal', label: '个人版' },
    { key: 'enterprise', label: '企业版' },
    { key: 'premium', label: '高级版' },
  ];

  // 状态选项
  const statuses = [
    { key: 'all', label: '全部状态' },
    { key: '1', label: '启用' },
    { key: '0', label: '禁用' },
  ];

  // 加载数据
  const loadData = async () => {
    setLoading(true);
    try {
      const result = await packageApi.list({
        page: 1,
        limit: 100,
      });
      
      const packages = Array.isArray(result.data) ? result.data : [];
      setData(packages);
      setFilteredData(packages);
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
      filtered = filtered.filter(pkg => 
        pkg.package_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (pkg.introduce && pkg.introduce.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }

    // 按分类过滤
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(pkg => pkg.category === selectedCategory);
    }

    // 按状态过滤
    if (selectedStatus !== 'all') {
      filtered = filtered.filter(pkg => String(pkg.status) === selectedStatus);
    }

    setFilteredData(filtered);
    setCurrentPage(1);
  }, [data, searchQuery, selectedCategory, selectedStatus]);

  useEffect(() => {
    loadData();
  }, []);

  // 新增套餐
  const handleAdd = () => {
    setEditingRecord(null);
    setFormData({
      package_name: '',
      category: 'personal',
      price: '',
      duration: '',
      introduce: '',
      level: '',
      priority: '',
      remarks: '',
      status: '1'
    });
    onOpen();
  };

  // 编辑套餐
  const handleEdit = (record: Package) => {
    setEditingRecord(record);
    setFormData({
      package_name: record.package_name,
      category: record.category,
      price: String(record.price),
      duration: String(record.duration),
      introduce: record.introduce || '',
      level: String(record.level),
      priority: String(record.priority),
      remarks: record.remarks || '',
      status: String(record.status || 1)
    });
    onOpen();
  };

  // 删除套餐
  const handleDelete = async (id: number, name: string) => {
    if (!window.confirm(`确定删除套餐 "${name}" 吗？`)) return;
    
    try {
      await packageApi.delete(id);
      showMessage.success('删除成功');
      loadData();
    } catch (error: any) {
      showMessage.error(error.message || '删除失败');
    }
  };

  // 保存套餐
  const handleSave = async () => {
    try {
      const saveData = {
        ...formData,
        price: parseFloat(formData.price),
        duration: parseInt(formData.duration),
        level: parseInt(formData.level),
        priority: parseInt(formData.priority),
        status: parseInt(formData.status)
      };

      if (editingRecord) {
        await packageApi.update({ id: editingRecord.id, ...saveData });
        showMessage.success('更新成功');
      } else {
        await packageApi.create(saveData);
        showMessage.success('创建成功');
      }
      
      onOpenChange();
      loadData();
    } catch (error: any) {
      showMessage.error(error.message || '保存失败');
    }
  };

  const getCategoryInfo = (category: string) => {
    const categoryMap: { [key: string]: { label: string, color: any, icon: string } } = {
      'personal': { label: '个人版', color: 'primary', icon: '👤' },
      'enterprise': { label: '企业版', color: 'success', icon: '🏢' },
      'premium': { label: '高级版', color: 'secondary', icon: '⭐' },
    };
    return categoryMap[category] || { label: category, color: 'default', icon: '📦' };
  };

  const getLevelColor = (level: number) => {
    if (level >= 5) return 'danger';
    if (level >= 3) return 'warning';
    return 'success';
  };

  // 分页数据
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedData = filteredData.slice(startIndex, endIndex);
  const totalPages = Math.ceil(filteredData.length / pageSize);

  const columns = [
    { name: "套餐信息", uid: "package_info", sortable: true },
    { name: "价格", uid: "price", sortable: true },
    { name: "时长", uid: "duration", sortable: true },
    { name: "等级", uid: "level", sortable: true },
    { name: "状态", uid: "status", sortable: true },
    { name: "创建时间", uid: "created_at", sortable: true },
    { name: "操作", uid: "actions" },
  ];

  const renderCell = (pkg: Package, columnKey: React.Key) => {
    const cellValue = pkg[columnKey as keyof Package];
    const categoryInfo = getCategoryInfo(pkg.category);

    switch (columnKey) {
      case "package_info":
        return (
          <div className="flex items-start gap-3">
            <Avatar
              showFallback
              fallback={<Package className="w-4 h-4 text-gray-400" />}
              className="w-10 h-10"
              color={categoryInfo.color}
            />
            <div className="flex flex-col">
              <p className="text-sm font-semibold text-gray-900">{pkg.package_name}</p>
              <div className="flex items-center gap-2 mt-1">
                <Chip size="sm" color={categoryInfo.color} variant="flat">
                  {categoryInfo.icon} {categoryInfo.label}
                </Chip>
                <span className="text-xs text-gray-500">优先级: {pkg.priority}</span>
              </div>
              {pkg.introduce && (
                <p className="text-xs text-gray-500 mt-1 line-clamp-2">{pkg.introduce}</p>
              )}
            </div>
          </div>
        );
      case "price":
        return (
          <div className="flex items-center gap-1">
            <DollarSign className="w-4 h-4 text-green-500" />
            <span className="text-sm font-semibold text-green-600">¥{pkg.price.toFixed(2)}</span>
          </div>
        );
      case "duration":
        return (
          <div className="flex items-center gap-1">
            <Clock className="w-4 h-4 text-blue-500" />
            <span className="text-sm text-gray-900">{pkg.duration}天</span>
          </div>
        );
      case "level":
        return (
          <div className="flex items-center gap-1">
            <Star className="w-4 h-4 text-amber-500" />
            <Chip size="sm" color={getLevelColor(pkg.level)} variant="flat">
              L{pkg.level}
            </Chip>
          </div>
        );
      case "status":
        return (
          <Chip
            size="sm"
            color={pkg.status === 1 ? 'success' : 'danger'}
            variant="flat"
          >
            {pkg.status === 1 ? '启用' : '禁用'}
          </Chip>
        );
      case "created_at":
        return (
          <div className="flex items-center gap-1">
            <Calendar className="w-4 h-4 text-gray-400" />
            <span className="text-xs text-gray-500">
              {pkg.created_at ? new Date(pkg.created_at).toLocaleDateString() : '-'}
            </span>
          </div>
        );
      case "actions":
        return (
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="light"
              color="primary"
              onPress={() => handleEdit(pkg)}
              startContent={<Edit className="w-4 h-4" />}
            >
              编辑
            </Button>
            <Button
              size="sm"
              variant="light"
              color="danger"
              onPress={() => handleDelete(pkg.id, pkg.package_name)}
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
            套餐管理
          </h1>
          <p className="text-gray-600 mt-1">管理系统中的所有套餐配置</p>
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
            新增套餐
          </Button>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-0">
          <CardBody className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500 text-white">
                <Package className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm text-gray-600">总套餐数</p>
                <p className="text-2xl font-bold text-gray-900">{data.length}</p>
              </div>
            </div>
          </CardBody>
        </Card>
        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-0">
          <CardBody className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500 text-white">
                <Eye className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm text-gray-600">启用套餐</p>
                <p className="text-2xl font-bold text-gray-900">
                  {data.filter(p => p.status === 1).length}
                </p>
              </div>
            </div>
          </CardBody>
        </Card>
        <Card className="bg-gradient-to-br from-amber-50 to-amber-100 border-0">
          <CardBody className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500 text-white">
                <DollarSign className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm text-gray-600">平均价格</p>
                <p className="text-2xl font-bold text-gray-900">
                  ¥{data.length > 0 ? (data.reduce((sum, p) => sum + p.price, 0) / data.length).toFixed(0) : '0'}
                </p>
              </div>
            </div>
          </CardBody>
        </Card>
        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-0">
          <CardBody className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-500 text-white">
                <Star className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm text-gray-600">最高等级</p>
                <p className="text-2xl font-bold text-gray-900">
                  L{data.length > 0 ? Math.max(...data.map(p => p.level)) : '0'}
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
              placeholder="搜索套餐名称或介绍..."
              value={searchQuery}
              onValueChange={setSearchQuery}
              startContent={<Search className="w-4 h-4 text-gray-400" />}
              className="flex-1"
              variant="bordered"
            />
            <Select
              placeholder="选择分类"
              value={selectedCategory}
              onSelectionChange={(keys) => setSelectedCategory(Array.from(keys)[0] as string)}
              className="w-full sm:w-40"
              variant="bordered"
            >
              {categories.map((category) => (
                <SelectItem key={category.key}>
                  {category.label}
                </SelectItem>
              ))}
            </Select>
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
          </div>
        </CardBody>
      </Card>

      {/* 数据表格 */}
      <Card className="border-0 shadow-lg">
        <Table
          aria-label="套餐数据表格"
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
                <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">暂无套餐数据</p>
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
                  {editingRecord ? '编辑套餐' : '新增套餐'}
                </h3>
                <p className="text-sm text-gray-500">
                  {editingRecord ? '修改套餐信息' : '创建新的套餐配置'}
                </p>
              </ModalHeader>
              <ModalBody>
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                      label="套餐名称"
                      placeholder="请输入套餐名称"
                      value={formData.package_name}
                      onChange={(e) => setFormData({...formData, package_name: e.target.value})}
                      isRequired
                      variant="bordered"
                    />
                    
                    <Select
                      label="分类"
                      placeholder="请选择分类"
                      selectedKeys={[formData.category]}
                      onSelectionChange={(keys) => {
                        const value = Array.from(keys)[0] as string;
                        setFormData({...formData, category: value});
                      }}
                      variant="bordered"
                    >
                      <SelectItem key="personal">个人版</SelectItem>
                      <SelectItem key="enterprise">企业版</SelectItem>
                      <SelectItem key="premium">高级版</SelectItem>
                    </Select>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                      label="价格(元)"
                      placeholder="请输入价格"
                      type="number"
                      step="0.01"
                      value={formData.price}
                      onChange={(e) => setFormData({...formData, price: e.target.value})}
                      startContent={<DollarSign className="w-4 h-4 text-gray-400" />}
                      isRequired
                      variant="bordered"
                    />
                    
                    <Input
                      label="时长(天)"
                      placeholder="请输入时长"
                      type="number"
                      value={formData.duration}
                      onChange={(e) => setFormData({...formData, duration: e.target.value})}
                      startContent={<Clock className="w-4 h-4 text-gray-400" />}
                      isRequired
                      variant="bordered"
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Input
                      label="等级"
                      placeholder="请输入等级"
                      type="number"
                      value={formData.level}
                      onChange={(e) => setFormData({...formData, level: e.target.value})}
                      startContent={<Star className="w-4 h-4 text-gray-400" />}
                      isRequired
                      variant="bordered"
                    />
                    
                    <Input
                      label="优先级"
                      placeholder="请输入优先级"
                      type="number"
                      value={formData.priority}
                      onChange={(e) => setFormData({...formData, priority: e.target.value})}
                      isRequired
                      variant="bordered"
                    />
                    
                    <Select
                      label="状态"
                      placeholder="请选择状态"
                      selectedKeys={[formData.status]}
                      onSelectionChange={(keys) => {
                        const value = Array.from(keys)[0] as string;
                        setFormData({...formData, status: value});
                      }}
                      variant="bordered"
                    >
                      <SelectItem key="1">启用</SelectItem>
                      <SelectItem key="0">禁用</SelectItem>
                    </Select>
                  </div>
                  
                  <Textarea
                    label="套餐介绍"
                    placeholder="请输入套餐的详细介绍..."
                    value={formData.introduce}
                    onChange={(e) => setFormData({...formData, introduce: e.target.value})}
                    maxRows={4}
                    variant="bordered"
                  />
                  
                  <Textarea
                    label="备注"
                    placeholder="请输入备注信息..."
                    value={formData.remarks}
                    onChange={(e) => setFormData({...formData, remarks: e.target.value})}
                    maxRows={3}
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

export default AdminPackages;