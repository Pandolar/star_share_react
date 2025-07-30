/**
 * 订单记录Tab页面
 * 显示用户的历史订单记录
 */
import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardBody, Button, Chip, Input, Spinner, Select, SelectItem, Pagination } from '@heroui/react';
import { motion } from 'framer-motion';
import {
  FileText,
  Search,
  Calendar,
  CheckCircle,
  Clock,
  XCircle,
  RefreshCw,
  AlertCircle,
  Filter
} from 'lucide-react';
import { orderUserApi } from '../../../services/userApi';

interface OrderInfo {
  order_id: string;
  package_id: number;
  package_name: string;
  status: string;
  created_at: string;
}

type OrderStatus = 'all' | 'completed' | 'pending' | 'failed';

export const OrderHistoryTab: React.FC = () => {
  const [orders, setOrders] = useState<OrderInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<OrderStatus>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // 获取订单列表
  const fetchOrders = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await orderUserApi.getOrders();

      if (response.code === 20000) {
        // 确保返回的数据是数组类型
        const ordersData = Array.isArray(response.data) ? response.data : [];
        setOrders(ordersData);
      } else {
        setError(response.msg || '获取订单记录失败');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '网络错误');
    } finally {
      setLoading(false);
    }
  };

  // 获取订单状态配置
  const getOrderStatusConfig = (status: string) => {
    switch (status) {
      case '已支付':
      case '已完成':
      case 'completed':
        return {
          color: 'success' as const,
          icon: CheckCircle,
          text: '已完成',
          filterValue: 'completed' as OrderStatus
        };
      case '待支付':
      case 'pending':
        return {
          color: 'warning' as const,
          icon: Clock,
          text: '待支付',
          filterValue: 'pending' as OrderStatus
        };
      case '已取消':
      case '支付失败':
      case 'failed':
      case 'cancelled':
        return {
          color: 'danger' as const,
          icon: XCircle,
          text: '已取消',
          filterValue: 'failed' as OrderStatus
        };
      default:
        return {
          color: 'default' as const,
          icon: RefreshCw,
          text: status,
          filterValue: 'all' as OrderStatus
        };
    }
  };

  // 过滤和搜索订单
  const filteredOrders = useMemo(() => {
    let result = Array.isArray(orders) ? orders : [];

    // 文本搜索
    if (searchTerm.trim()) {
      result = result.filter(order =>
        order.order_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.package_name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // 状态筛选
    if (statusFilter !== 'all') {
      result = result.filter(order => {
        const statusConfig = getOrderStatusConfig(order.status);
        return statusConfig.filterValue === statusFilter;
      });
    }

    return result;
  }, [orders, searchTerm, statusFilter]);

  // 分页数据
  const paginatedOrders = useMemo(() => {
    if (!Array.isArray(filteredOrders)) {
      return [];
    }
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return filteredOrders.slice(startIndex, endIndex);
  }, [filteredOrders, currentPage]);

  // 统计数据
  const orderStats = useMemo(() => {
    // 确保 orders 是数组
    const ordersArray = Array.isArray(orders) ? orders : [];

    const total = ordersArray.length;
    const completed = ordersArray.filter(order => {
      const config = getOrderStatusConfig(order.status);
      return config.filterValue === 'completed';
    }).length;
    const pending = ordersArray.filter(order => {
      const config = getOrderStatusConfig(order.status);
      return config.filterValue === 'pending';
    }).length;
    const failed = ordersArray.filter(order => {
      const config = getOrderStatusConfig(order.status);
      return config.filterValue === 'failed';
    }).length;

    return { total, completed, pending, failed };
  }, [orders]);

  // 总页数
  const totalPages = Math.ceil(filteredOrders.length / pageSize);

  // 重置筛选
  const resetFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setCurrentPage(1);
  };

  // 状态筛选选项
  const statusOptions = [
    { key: 'all', label: '全部订单' },
    { key: 'completed', label: '已完成' },
    { key: 'pending', label: '待支付' },
    { key: 'failed', label: '已取消' },
  ];

  // 当搜索或筛选条件改变时重置到第一页
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter]);

  useEffect(() => {
    fetchOrders();
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      {/* 页面标题 */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
          <FileText size={20} className="text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-default-900">订单记录</h1>
          <p className="text-sm text-default-500 mt-1">查看您的历史订单和交易记录</p>
        </div>
      </div>

      {/* 筛选工具栏 */}
      <Card>
        <CardBody className="p-6">
          <div className="flex flex-col gap-4">
            {/* 第一行：搜索和筛选 */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <Input
                  placeholder="搜索订单号、套餐名称..."
                  startContent={<Search size={16} />}
                  variant="bordered"
                  value={searchTerm}
                  onValueChange={setSearchTerm}
                />
              </div>
              <div className="flex gap-2">
                <Select
                  placeholder="筛选状态"
                  selectedKeys={[statusFilter]}
                  onSelectionChange={(keys) => {
                    const selectedKey = Array.from(keys)[0] as OrderStatus;
                    setStatusFilter(selectedKey || 'all');
                  }}
                  className="w-40"
                  startContent={<Filter size={16} />}
                  variant="bordered"
                >
                  {statusOptions.map((option) => (
                    <SelectItem key={option.key}>
                      {option.label}
                    </SelectItem>
                  ))}
                </Select>
                <Button
                  variant="bordered"
                  startContent={<RefreshCw size={16} />}
                  onPress={fetchOrders}
                  isLoading={loading}
                >
                  刷新
                </Button>
              </div>
            </div>

            {/* 第二行：快捷筛选和重置 */}
            {(searchTerm || statusFilter !== 'all') && (
              <div className="flex items-center gap-2 text-sm">
                <span className="text-default-500">当前筛选:</span>
                {searchTerm && (
                  <Chip size="sm" variant="flat" onClose={() => setSearchTerm('')}>
                    搜索: {searchTerm}
                  </Chip>
                )}
                {statusFilter !== 'all' && (
                  <Chip size="sm" variant="flat" onClose={() => setStatusFilter('all')}>
                    状态: {statusOptions.find(opt => opt.key === statusFilter)?.label}
                  </Chip>
                )}
                <Button size="sm" variant="light" onPress={resetFilters}>
                  清除全部
                </Button>
              </div>
            )}
          </div>
        </CardBody>
      </Card>

      {/* 订单统计 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card
          className={`cursor-pointer transition-all hover:shadow-md ${statusFilter === 'all' ? 'ring-2 ring-primary' : ''}`}
          onPress={() => setStatusFilter('all')}
        >
          <CardBody className="p-4 text-center">
            <div className="text-2xl font-bold text-primary mb-1">{orderStats.total}</div>
            <div className="text-sm text-default-500">总订单数</div>
          </CardBody>
        </Card>
        <Card
          className={`cursor-pointer transition-all hover:shadow-md ${statusFilter === 'completed' ? 'ring-2 ring-success' : ''}`}
          onPress={() => setStatusFilter('completed')}
        >
          <CardBody className="p-4 text-center">
            <div className="text-2xl font-bold text-success mb-1">{orderStats.completed}</div>
            <div className="text-sm text-default-500">已完成</div>
          </CardBody>
        </Card>
        <Card
          className={`cursor-pointer transition-all hover:shadow-md ${statusFilter === 'pending' ? 'ring-2 ring-warning' : ''}`}
          onPress={() => setStatusFilter('pending')}
        >
          <CardBody className="p-4 text-center">
            <div className="text-2xl font-bold text-warning mb-1">{orderStats.pending}</div>
            <div className="text-sm text-default-500">待支付</div>
          </CardBody>
        </Card>
        <Card
          className={`cursor-pointer transition-all hover:shadow-md ${statusFilter === 'failed' ? 'ring-2 ring-danger' : ''}`}
          onPress={() => setStatusFilter('failed')}
        >
          <CardBody className="p-4 text-center">
            <div className="text-2xl font-bold text-danger mb-1">{orderStats.failed}</div>
            <div className="text-sm text-default-500">已取消</div>
          </CardBody>
        </Card>
      </div>

      {/* 加载状态 */}
      {loading && (
        <Card>
          <CardBody className="p-6">
            <div className="flex items-center justify-center py-12">
              <Spinner size="lg" color="primary" />
              <span className="ml-3 text-default-600">加载中...</span>
            </div>
          </CardBody>
        </Card>
      )}

      {/* 错误状态 */}
      {error && (
        <Card>
          <CardBody className="p-6">
            <div className="flex items-start gap-4 p-6 bg-danger/10 rounded-lg">
              <AlertCircle size={20} className="text-danger flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-semibold text-danger mb-2">加载失败</h3>
                <p className="text-default-600 text-sm">{error}</p>
                <button
                  onClick={fetchOrders}
                  className="mt-3 text-sm text-primary hover:text-primary-600 underline"
                >
                  重试
                </button>
              </div>
            </div>
          </CardBody>
        </Card>
      )}

      {/* 订单列表 */}
      {!loading && !error && (
        <>
          {/* 结果统计 */}
          {filteredOrders.length > 0 && (
            <div className="flex justify-between items-center text-sm text-default-500">
              <span>
                共找到 {filteredOrders.length} 条订单
                {filteredOrders.length !== orders.length && ` (从 ${orders.length} 条中筛选)`}
              </span>
              <span>
                第 {currentPage} 页，共 {totalPages} 页
              </span>
            </div>
          )}

          {paginatedOrders.length > 0 ? (
            <div className="space-y-4">
              {paginatedOrders.map((order, index) => {
                const statusConfig = getOrderStatusConfig(order.status);
                const StatusIcon = statusConfig.icon;

                return (
                  <motion.div
                    key={order.order_id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Card className="hover:shadow-md transition-shadow">
                      <CardBody className="p-6">
                        <div className="flex flex-col lg:flex-row items-start lg:items-center gap-4">
                          {/* 订单基本信息 */}
                          <div className="flex-1 space-y-2">
                            <div className="flex items-center gap-3 flex-wrap">
                              <h3 className="font-semibold text-default-900 break-all">
                                {order.order_id}
                              </h3>
                              <Chip
                                size="sm"
                                color={statusConfig.color}
                                variant="flat"
                                startContent={<StatusIcon size={14} />}
                              >
                                {statusConfig.text}
                              </Chip>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                              <div className="flex items-center gap-2 text-default-600">
                                <Calendar size={16} />
                                <span>{order.created_at}</span>
                              </div>
                              <div className="font-medium text-default-900">
                                {order.package_name}
                              </div>
                            </div>
                          </div>

                          {/* 操作按钮 */}
                          <div className="flex flex-col gap-2">
                            <Button size="sm" variant="bordered">
                              查看详情
                            </Button>
                            {statusConfig.filterValue === 'completed' && (
                              <Button size="sm" color="primary" variant="light">
                                重新购买
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardBody>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12 text-default-400">
              <FileText size={48} className="mx-auto mb-4 opacity-50" />
              <p>
                {searchTerm || statusFilter !== 'all'
                  ? '没有找到匹配的订单'
                  : '暂无订单记录'
                }
              </p>
              {(searchTerm || statusFilter !== 'all') && (
                <Button
                  variant="light"
                  size="sm"
                  className="mt-2"
                  onPress={resetFilters}
                >
                  清除筛选条件
                </Button>
              )}
            </div>
          )}

          {/* 分页组件 */}
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
        </>
      )}
    </motion.div>
  );
};