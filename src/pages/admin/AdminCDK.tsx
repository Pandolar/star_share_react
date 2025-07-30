import React, { useState, useEffect } from 'react';
import { 
  Card, 
  CardBody,
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
  Spinner
} from '@heroui/react';
import { 
  Plus, 
  Edit, 
  Trash2, 
  RefreshCw, 
  Key, 
  Copy,
  Calendar,
  User,
  Package,
  CheckCircle,
  XCircle,
  Clock
} from 'lucide-react';
import { cdkApi } from '../../services/api';
import { motion } from 'framer-motion';
import { showMessage } from '../../utils/toast';

interface CDK {
  id: number;
  code: string;
  package_id: number;
  package_name?: string;
  category?: string;
  price?: number;
  duration?: number;
  status: number;
  used_by?: number;
  used_by_username?: string;
  used_at?: string;
  created_at?: string;
  expires_at?: string;
  remarks?: string;
}

const AdminCDK: React.FC = () => {
  const [data, setData] = useState<CDK[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingRecord, setEditingRecord] = useState<CDK | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const { isOpen, onOpen, onOpenChange } = useDisclosure();

  // 表单数据
  const [formData, setFormData] = useState({
    code: '',
    package_id: '1',
    status: '1',
    expires_at: '',
    remarks: ''
  });

  // 加载数据
  const loadData = async () => {
    setLoading(true);
    try {
      const result = await cdkApi.list({
        page: 1,
        limit: 100,
      });
      
      setData(Array.isArray(result.data) ? result.data : []);
    } catch (error: any) {
      showMessage.error(error.message || '加载数据失败');
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // 生成随机CDK码
  const generateCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 16; i++) {
      if (i > 0 && i % 4 === 0) result += '-';
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  // 新增CDK
  const handleAdd = () => {
    setEditingRecord(null);
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 30);
    
    setFormData({
      code: generateCode(),
      package_id: '1',
      status: '1',
      expires_at: tomorrow.toISOString().split('T')[0],
      remarks: ''
    });
    onOpen();
  };

  // 编辑CDK
  const handleEdit = (record: CDK) => {
    setEditingRecord(record);
    setFormData({
      code: record.code,
      package_id: String(record.package_id),
      status: String(record.status),
      expires_at: record.expires_at ? record.expires_at.split('T')[0] : '',
      remarks: record.remarks || ''
    });
    onOpen();
  };

  // 删除CDK
  const handleDelete = async (id: number, code: string) => {
    if (!window.confirm(`确定删除CDK "${code}" 吗？`)) return;
    
    try {
      await cdkApi.delete(id);
      showMessage.success('删除成功');
      loadData();
    } catch (error: any) {
      showMessage.error(error.message || '删除失败');
    }
  };

  // 保存CDK
  const handleSave = async () => {
    try {
      if (editingRecord) {
        await cdkApi.update({ id: editingRecord.id, ...formData });
        showMessage.success('更新成功');
      } else {
        await cdkApi.create(formData);
        showMessage.success('创建成功');
      }
      
      onOpenChange();
      loadData();
    } catch (error: any) {
      showMessage.error(error.message || '保存失败');
    }
  };

  // 复制CDK码
  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code);
    showMessage.success('CDK码已复制到剪贴板');
  };

  // 计算统计数据
  const stats = {
    total: data.length,
    unused: data.filter(cdk => cdk.status === 1 && !cdk.used_at).length,
    used: data.filter(cdk => cdk.used_at).length,
    expired: data.filter(cdk => {
      if (!cdk.expires_at) return false;
      const now = new Date();
      const expiry = new Date(cdk.expires_at);
      return expiry < now;
    }).length
  };

  // 分页数据
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedData = data.slice(startIndex, endIndex);
  const totalPages = Math.ceil(data.length / pageSize);

  const columns = [
    { name: "CDK码", uid: "code", sortable: true },
    { name: "套餐信息", uid: "package_info", sortable: true },
    { name: "状态", uid: "status", sortable: true },
    { name: "使用信息", uid: "usage", sortable: true },
    { name: "过期时间", uid: "expires_at", sortable: true },
    { name: "操作", uid: "actions" }
  ];

  const renderCell = (cdk: CDK, columnKey: React.Key) => {
    switch (columnKey) {
      case "code":
        return (
          <div className="flex items-center gap-2">
            <code className="bg-gray-100 px-2 py-1 rounded text-sm font-mono">
              {cdk.code}
            </code>
            <Button
              size="sm"
              variant="light"
              isIconOnly
              onPress={() => handleCopy(cdk.code)}
            >
              <Copy className="w-4 h-4" />
            </Button>
          </div>
        );
      case "package_info":
        return (
          <div className="flex items-center gap-2">
            <div className="p-1 rounded bg-blue-100 text-blue-600">
              <Package className="w-4 h-4" />
            </div>
            <div>
              <p className="text-sm font-medium">{cdk.package_name || `套餐${cdk.package_id}`}</p>
              {cdk.price && (
                <p className="text-xs text-gray-500">¥{cdk.price}</p>
              )}
            </div>
          </div>
        );
      case "status":
        if (cdk.used_at) {
          return <Chip size="sm" color="success" variant="flat" startContent={<CheckCircle className="w-3 h-3" />}>已使用</Chip>;
        }
        if (cdk.expires_at && new Date(cdk.expires_at) < new Date()) {
          return <Chip size="sm" color="danger" variant="flat" startContent={<Clock className="w-3 h-3" />}>已过期</Chip>;
        }
        return <Chip size="sm" color="primary" variant="flat" startContent={<Key className="w-3 h-3" />}>未使用</Chip>;
      case "usage":
        return cdk.used_at ? (
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-1">
              <User className="w-3 h-3 text-gray-400" />
              <span className="text-xs">{cdk.used_by_username || `用户${cdk.used_by}`}</span>
            </div>
            <span className="text-xs text-gray-500">
              {new Date(cdk.used_at).toLocaleDateString()}
            </span>
          </div>
        ) : (
          <span className="text-xs text-gray-500">未使用</span>
        );
      case "expires_at":
        return cdk.expires_at ? (
          <div className="flex items-center gap-1">
            <Calendar className="w-3 h-3 text-gray-400" />
            <span className="text-xs text-gray-600">
              {new Date(cdk.expires_at).toLocaleDateString()}
            </span>
          </div>
        ) : (
          <span className="text-xs text-gray-500">永不过期</span>
        );
      case "actions":
        return (
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="light"
              color="primary"
              onPress={() => handleEdit(cdk)}
              startContent={<Edit className="w-4 h-4" />}
            >
              编辑
            </Button>
            <Button
              size="sm"
              variant="light"
              color="danger"
              onPress={() => handleDelete(cdk.id, cdk.code)}
              startContent={<Trash2 className="w-4 h-4" />}
            >
              删除
            </Button>
          </div>
        );
      default:
        return cdk[columnKey as keyof CDK];
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
            CDK管理
          </h1>
          <p className="text-gray-600 mt-1">管理兑换码的生成、分发和使用</p>
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
            生成CDK
          </Button>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-0">
          <CardBody className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500 text-white">
                <Key className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm text-gray-600">总CDK数</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              </div>
            </div>
          </CardBody>
        </Card>
        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-0">
          <CardBody className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500 text-white">
                <CheckCircle className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm text-gray-600">未使用</p>
                <p className="text-2xl font-bold text-gray-900">{stats.unused}</p>
              </div>
            </div>
          </CardBody>
        </Card>
        <Card className="bg-gradient-to-br from-amber-50 to-amber-100 border-0">
          <CardBody className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500 text-white">
                <User className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm text-gray-600">已使用</p>
                <p className="text-2xl font-bold text-gray-900">{stats.used}</p>
              </div>
            </div>
          </CardBody>
        </Card>
        <Card className="bg-gradient-to-br from-red-50 to-red-100 border-0">
          <CardBody className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-500 text-white">
                <XCircle className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm text-gray-600">已过期</p>
                <p className="text-2xl font-bold text-gray-900">{stats.expired}</p>
              </div>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* 数据表格 */}
      <Card className="border-0 shadow-lg">
        <Table
          aria-label="CDK数据表格"
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
                <Key className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">暂无CDK数据</p>
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
      <Modal isOpen={isOpen} onOpenChange={onOpenChange} size="2xl">
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="flex flex-col gap-1">
                <h3 className="text-xl font-bold">
                  {editingRecord ? '编辑CDK' : '生成CDK'}
                </h3>
              </ModalHeader>
              <ModalBody>
                <div className="space-y-4">
                  <div className="flex gap-2">
                    <Input
                      label="CDK码"
                      placeholder="CDK码"
                      value={formData.code}
                      onChange={(e) => setFormData({...formData, code: e.target.value})}
                      isRequired
                      variant="bordered"
                      className="flex-1"
                    />
                    <Button
                      variant="flat"
                      onPress={() => setFormData({...formData, code: generateCode()})}
                    >
                      重新生成
                    </Button>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <Select
                      label="关联套餐"
                      selectedKeys={[formData.package_id]}
                      onSelectionChange={(keys) => {
                        const value = Array.from(keys)[0] as string;
                        setFormData({...formData, package_id: value});
                      }}
                      variant="bordered"
                    >
                      <SelectItem key="1">基础套餐</SelectItem>
                      <SelectItem key="2">标准套餐</SelectItem>
                      <SelectItem key="3">高级套餐</SelectItem>
                    </Select>
                    
                    <Select
                      label="状态"
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
                  
                  <Input
                    label="过期时间"
                    type="date"
                    value={formData.expires_at}
                    onChange={(e) => setFormData({...formData, expires_at: e.target.value})}
                    variant="bordered"
                  />
                  
                  <Textarea
                    label="备注"
                    placeholder="请输入备注信息..."
                    value={formData.remarks}
                    onChange={(e) => setFormData({...formData, remarks: e.target.value})}
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

export default AdminCDK;