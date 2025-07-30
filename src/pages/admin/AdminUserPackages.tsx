import React, { useState, useEffect } from 'react';
import { 
  Card, 
  CardBody,
  Button,
  Input,
  Select,
  SelectItem,
  Chip,
  Avatar,
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  Pagination,
  Spinner,
  Badge
} from '@heroui/react';
import { 
  RefreshCw, 
  Search, 
  User, 
  Package, 
  Calendar,
  Clock,
  DollarSign,
  ShoppingCart,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Gift
} from 'lucide-react';
import { userPackageApi } from '../../services/api';
import { motion } from 'framer-motion';
import { showMessage } from '../../utils/toast';

interface UserPackage {
  id: number;
  user_id: number;
  username: string;
  email?: string;
  package_id: number;
  package_name: string;
  category: string;
  price: number;
  duration: number;
  start_date: string;
  end_date: string;
  status: number;
  created_at: string;
  updated_at?: string;
}

const AdminUserPackages: React.FC = () => {
  const [data, setData] = useState<UserPackage[]>([]);
  const [filteredData, setFilteredData] = useState<UserPackage[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  
  // 搜索参数
  const [searchParams, setSearchParams] = useState({
    username: '',
    package_name: '',
    category: '',
    status: '',
  });

  // 分类选项
  const categories = [
    { key: '', label: '全部分类' },
    { key: 'personal', label: '个人版' },
    { key: 'enterprise', label: '企业版' },
    { key: 'premium', label: '高级版' },
  ];

  // 状态选项
  const statuses = [
    { key: '', label: '全部状态' },
    { key: '1', label: '正常' },
    { key: '0', label: '禁用' },
  ];

  // 加载数据
  const loadData = async () => {
    setLoading(true);
    try {
      const requestParams = {
        page: 1,
        limit: 100,
        ...searchParams,
      };

      const result = await userPackageApi.list(requestParams);
      
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

    // 按用户名过滤
    if (searchParams.username) {
      filtered = filtered.filter(pkg => 
        pkg.username.toLowerCase().includes(searchParams.username.toLowerCase())
      );
    }

    // 按套餐名过滤
    if (searchParams.package_name) {
      filtered = filtered.filter(pkg => 
        pkg.package_name.toLowerCase().includes(searchParams.package_name.toLowerCase())
      );
    }

    // 按分类过滤
    if (searchParams.category) {
      filtered = filtered.filter(pkg => pkg.category === searchParams.category);
    }

    // 按状态过滤
    if (searchParams.status) {
      filtered = filtered.filter(pkg => String(pkg.status) === searchParams.status);
    }

    setFilteredData(filtered);
    setCurrentPage(1);
  }, [data, searchParams]);

  useEffect(() => {
    loadData();
  }, []);

  // 搜索
  const handleSearch = () => {
    loadData();
  };

  // 重置搜索
  const handleReset = () => {
    setSearchParams({
      username: '',
      package_name: '',
      category: '',
      status: '',
    });
  };

  // 获取状态信息
  const getStatusInfo = (status: number, endDate: string) => {
    const now = new Date();
    const end = new Date(endDate);
    
    if (status === 0) {
      return { label: '已禁用', color: 'danger' as const, icon: <XCircle className="w-3 h-3" /> };
    }
    
    if (end < now) {
      return { label: '已过期', color: 'default' as const, icon: <Clock className="w-3 h-3" /> };
    }
    
    const daysDiff = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (daysDiff <= 7) {
      return { label: '即将过期', color: 'warning' as const, icon: <AlertTriangle className="w-3 h-3" /> };
    }
    
    return { label: '正常', color: 'success' as const, icon: <CheckCircle className="w-3 h-3" /> };
  };

  const getCategoryInfo = (category: string) => {
    const categoryMap: { [key: string]: { label: string, color: any, icon: string } } = {
      'personal': { label: '个人版', color: 'primary', icon: '👤' },
      'enterprise': { label: '企业版', color: 'success', icon: '🏢' },
      'premium': { label: '高级版', color: 'secondary', icon: '⭐' },
    };
    return categoryMap[category] || { label: category, color: 'default', icon: '📦' };
  };

  // 计算统计数据
  const stats = {
    total: data.length,
    active: data.filter(pkg => {
      const now = new Date();
      const end = new Date(pkg.end_date);
      return pkg.status === 1 && end >= now;
    }).length,
    expired: data.filter(pkg => {
      const now = new Date();
      const end = new Date(pkg.end_date);
      return end < now;
    }).length,
    expiringSoon: data.filter(pkg => {
      const now = new Date();
      const end = new Date(pkg.end_date);
      const daysDiff = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      return pkg.status === 1 && daysDiff <= 7 && daysDiff > 0;
    }).length
  };

  // 分页数据
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedData = filteredData.slice(startIndex, endIndex);
  const totalPages = Math.ceil(filteredData.length / pageSize);

  const columns = [
    { name: "用户信息", uid: "user_info", sortable: true },
    { name: "套餐信息", uid: "package_info", sortable: true },
    { name: "使用期限", uid: "duration", sortable: true },
    { name: "状态", uid: "status", sortable: true },
    { name: "购买时间", uid: "created_at", sortable: true }
  ];

  const renderCell = (userPackage: UserPackage, columnKey: React.Key) => {
    const statusInfo = getStatusInfo(userPackage.status, userPackage.end_date);
    const categoryInfo = getCategoryInfo(userPackage.category);

    switch (columnKey) {
      case "user_info":
        return (
          <div className="flex items-center gap-3">
            <Avatar
              name={userPackage.username.charAt(0).toUpperCase()}
              size="sm"
              color="primary"
              className="text-xs font-bold"
            />
            <div className="flex flex-col">
              <p className="text-sm font-semibold text-gray-900">{userPackage.username}</p>
              <p className="text-xs text-gray-500">ID: {userPackage.user_id}</p>
              {userPackage.email && (
                <p className="text-xs text-blue-600">{userPackage.email}</p>
              )}
            </div>
          </div>
        );
      case "package_info":
        return (
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-100 text-blue-600">
              <Package className="w-4 h-4" />
            </div>
            <div className="flex flex-col">
              <p className="text-sm font-semibold text-gray-900">{userPackage.package_name}</p>
              <div className="flex items-center gap-2 mt-1">
                <Chip size="sm" color={categoryInfo.color} variant="flat">
                  {categoryInfo.icon} {categoryInfo.label}
                </Chip>
              </div>
              <div className="flex items-center gap-1 mt-1">
                <DollarSign className="w-3 h-3 text-green-500" />
                <span className="text-xs text-green-600 font-medium">¥{userPackage.price.toFixed(2)}</span>
                <span className="text-xs text-gray-500">/ {userPackage.duration}天</span>
              </div>
            </div>
          </div>
        );
      case "duration":
        return (
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-1">
              <Calendar className="w-3 h-3 text-gray-400" />
              <span className="text-xs text-gray-600">
                {new Date(userPackage.start_date).toLocaleDateString()}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3 text-gray-400" />
              <span className="text-xs text-gray-600">
                {new Date(userPackage.end_date).toLocaleDateString()}
              </span>
            </div>
          </div>
        );
      case "status":
        return (
          <Chip
            size="sm"
            color={statusInfo.color}
            variant="flat"
            startContent={statusInfo.icon}
          >
            {statusInfo.label}
          </Chip>
        );
      case "created_at":
        return (
          <div className="flex items-center gap-1">
            <ShoppingCart className="w-3 h-3 text-gray-400" />
            <span className="text-xs text-gray-500">
              {new Date(userPackage.created_at).toLocaleDateString()}
            </span>
          </div>
        );
      default:
        return userPackage[columnKey as keyof UserPackage];
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
            用户套餐记录
          </h1>
          <p className="text-gray-600 mt-1">查看所有用户的套餐购买和使用情况</p>
        </div>
        <Button
          variant="flat"
          startContent={<RefreshCw className="w-4 h-4" />}
          onPress={loadData}
          isLoading={loading}
        >
          刷新数据
        </Button>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-0">
          <CardBody className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500 text-white">
                <Gift className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm text-gray-600">总套餐数</p>
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
                <p className="text-sm text-gray-600">正常套餐</p>
                <p className="text-2xl font-bold text-gray-900">{stats.active}</p>
              </div>
            </div>
          </CardBody>
        </Card>
        <Card className="bg-gradient-to-br from-amber-50 to-amber-100 border-0">
          <CardBody className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500 text-white">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm text-gray-600">即将过期</p>
                <p className="text-2xl font-bold text-gray-900">{stats.expiringSoon}</p>
              </div>
            </div>
          </CardBody>
        </Card>
        <Card className="bg-gradient-to-br from-red-50 to-red-100 border-0">
          <CardBody className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-500 text-white">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm text-gray-600">已过期</p>
                <p className="text-2xl font-bold text-gray-900">{stats.expired}</p>
              </div>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* 搜索和过滤 */}
      <Card className="border-0 shadow-lg">
        <CardBody className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            <Input
              label="用户名"
              placeholder="搜索用户名..."
              value={searchParams.username}
              onChange={(e) => setSearchParams({
                ...searchParams,
                username: e.target.value
              })}
              startContent={<User className="w-4 h-4 text-gray-400" />}
              variant="bordered"
            />
            
            <Input
              label="套餐名称"
              placeholder="搜索套餐名称..."
              value={searchParams.package_name}
              onChange={(e) => setSearchParams({
                ...searchParams,
                package_name: e.target.value
              })}
              startContent={<Package className="w-4 h-4 text-gray-400" />}
              variant="bordered"
            />
            
            <Select
              label="套餐分类"
              placeholder="选择分类"
              selectedKeys={searchParams.category ? [searchParams.category] : []}
              onSelectionChange={(keys) => {
                const value = Array.from(keys)[0] as string || '';
                setSearchParams({
                  ...searchParams,
                  category: value
                });
              }}
              variant="bordered"
            >
              {categories.map((category) => (
                <SelectItem key={category.key}>
                  {category.label}
                </SelectItem>
              ))}
            </Select>
            
            <Select
              label="状态"
              placeholder="选择状态"
              selectedKeys={searchParams.status ? [searchParams.status] : []}
              onSelectionChange={(keys) => {
                const value = Array.from(keys)[0] as string || '';
                setSearchParams({
                  ...searchParams,
                  status: value
                });
              }}
              variant="bordered"
            >
              {statuses.map((status) => (
                <SelectItem key={status.key}>
                  {status.label}
                </SelectItem>
              ))}
            </Select>
          </div>
          
          <div className="flex justify-end gap-3">
            <Button variant="flat" onPress={handleReset}>
              重置筛选
            </Button>
            <Button 
              color="primary" 
              startContent={<Search className="w-4 h-4" />}
              onPress={handleSearch}
              isLoading={loading}
              className="bg-gradient-to-r from-blue-500 to-purple-600"
            >
              搜索
            </Button>
          </div>
        </CardBody>
      </Card>

      {/* 数据表格 */}
      <Card className="border-0 shadow-lg">
        <Table
          aria-label="用户套餐数据表格"
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
                <Gift className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">暂无用户套餐数据</p>
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
    </motion.div>
  );
};

export default AdminUserPackages;