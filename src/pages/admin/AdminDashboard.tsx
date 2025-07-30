import React, { useState, useEffect } from 'react';
import { 
  Card, 
  CardBody, 
  CardHeader,
  Button, 
  Chip, 
  Divider,
  Progress,
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  Avatar,
  Tabs,
  Tab
} from '@heroui/react';
import { 
  Users, 
  Package, 
  Key, 
  Settings,
  TrendingUp,
  RefreshCw,
  Eye,
  Calendar,
  DollarSign,
  Activity,
  ShoppingCart,
  Zap,
  ArrowUpRight,
  ArrowDownRight,
  BarChart3
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

interface DashboardStats {
  totalUsers: number;
  totalPackages: number;
  totalCDK: number;
  activeUsers: number;
  todayRevenue: number;
  monthlyRevenue: number;
  yearlyRevenue: number;
  revenueGrowth: number;
  userGrowth: number;
}

interface RecentActivity {
  id: string;
  type: 'user' | 'order' | 'package' | 'cdk';
  title: string;
  description: string;
  time: string;
  status: 'success' | 'warning' | 'danger';
}

const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    totalPackages: 0,
    totalCDK: 0,
    activeUsers: 0,
    todayRevenue: 0,
    monthlyRevenue: 0,
    yearlyRevenue: 0,
    revenueGrowth: 0,
    userGrowth: 0,
  });
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);

  // 模拟数据加载
  useEffect(() => {
    const loadDashboardData = async () => {
      setLoading(true);
      // 模拟API调用延迟
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // 模拟数据
      setStats({
        totalUsers: 1248,
        totalPackages: 12,
        totalCDK: 350,
        activeUsers: 89,
        todayRevenue: 2580,
        monthlyRevenue: 45600,
        yearlyRevenue: 546000,
        revenueGrowth: 12.5,
        userGrowth: 8.3,
      });

      setRecentActivity([
        {
          id: '1',
          type: 'user',
          title: '新用户注册',
          description: 'user@example.com 注册了账户',
          time: '5分钟前',
          status: 'success'
        },
        {
          id: '2',
          type: 'order',
          title: '新订单',
          description: '用户购买了高级套餐',
          time: '15分钟前',
          status: 'success'
        },
        {
          id: '3',
          type: 'cdk',
          title: 'CDK使用',
          description: 'CDK-ABC123 被激活使用',
          time: '30分钟前',
          status: 'warning'
        },
        {
          id: '4',
          type: 'package',
          title: '套餐更新',
          description: '基础套餐价格已调整',
          time: '1小时前',
          status: 'success'
        }
      ]);
      
      setLoading(false);
    };

    loadDashboardData();
  }, []);

  const handleRefresh = () => {
    setLoading(true);
    setTimeout(() => setLoading(false), 1000);
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 0.3 }
    }
  };

  const statsCards = [
    {
      title: '总用户数',
      value: stats.totalUsers,
      growth: stats.userGrowth,
      icon: <Users size={24} />,
      gradient: 'from-blue-500 to-blue-600',
      color: 'primary',
      path: '/admin/users'
    },
    {
      title: '套餐总数',
      value: stats.totalPackages,
      growth: 5.2,
      icon: <Package size={24} />,
      gradient: 'from-green-500 to-green-600',
      color: 'success',
      path: '/admin/packages'
    },
    {
      title: 'CDK总数',
      value: stats.totalCDK,
      growth: -2.1,
      icon: <Key size={24} />,
      gradient: 'from-orange-500 to-orange-600',
      color: 'warning',
      path: '/admin/cdk'
    },
    {
      title: '活跃用户',
      value: stats.activeUsers,
      growth: 15.6,
      icon: <Activity size={24} />,
      gradient: 'from-purple-500 to-purple-600',
      color: 'secondary',
      path: '/admin/users'
    },
  ];

  const revenueCards = [
    {
      title: '今日收入',
      value: stats.todayRevenue,
      growth: stats.revenueGrowth,
      prefix: '¥',
      precision: 2,
      gradient: 'from-emerald-500 to-emerald-600',
    },
    {
      title: '月度收入',
      value: stats.monthlyRevenue,
      growth: 18.2,
      prefix: '¥',
      precision: 2,
      gradient: 'from-cyan-500 to-cyan-600',
    },
    {
      title: '年度收入',
      value: stats.yearlyRevenue,
      growth: 25.4,
      prefix: '¥',
      precision: 2,
      gradient: 'from-indigo-500 to-indigo-600',
    }
  ];

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'user': return <Users size={16} />;
      case 'order': return <ShoppingCart size={16} />;
      case 'package': return <Package size={16} />;
      case 'cdk': return <Key size={16} />;
      default: return <Activity size={16} />;
    }
  };

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent mb-2">
            仪表盘总览
          </h1>
          <p className="text-gray-600 flex items-center gap-2">
            <Calendar size={16} />
            欢迎回来，管理员！今天是 {new Date().toLocaleDateString('zh-CN', { 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric',
              weekday: 'long'
            })}
          </p>
        </div>
        <Button
          color="primary"
          variant="shadow"
          startContent={<RefreshCw size={16} />}
          onClick={handleRefresh}
          isLoading={loading}
          className="bg-gradient-to-r from-blue-500 to-purple-600"
        >
          刷新数据
        </Button>
      </div>

      {/* 主要统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statsCards.map((card, index) => (
          <motion.div
            key={index}
            variants={cardVariants}
            initial="hidden"
            animate="visible"
            transition={{ delay: index * 0.1 }}
          >
            <Card 
              isPressable
              className="bg-gradient-to-br from-white to-gray-50 border-0 shadow-lg hover:shadow-xl transition-all duration-300"
              onPress={() => navigate(card.path)}
            >
              <CardBody className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className={`p-3 rounded-2xl bg-gradient-to-r ${card.gradient} text-white shadow-lg`}>
                    {card.icon}
                  </div>
                  <div className="flex items-center gap-1">
                    {card.growth > 0 ? (
                      <ArrowUpRight size={16} className="text-green-500" />
                    ) : (
                      <ArrowDownRight size={16} className="text-red-500" />
                    )}
                    <span className={`text-xs font-medium ${card.growth > 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {Math.abs(card.growth)}%
                    </span>
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-gray-600 font-medium">
                    {card.title}
                  </p>
                  <p className="text-2xl font-bold text-gray-900">
                    {loading ? (
                      <div className="h-8 bg-gray-200 rounded animate-pulse"></div>
                    ) : (
                      card.value.toLocaleString()
                    )}
                  </p>
                </div>
              </CardBody>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* 收入统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {revenueCards.map((card, index) => (
          <motion.div
            key={index}
            variants={cardVariants}
            initial="hidden"
            animate="visible"
            transition={{ delay: 0.4 + index * 0.1 }}
          >
            <Card className="bg-gradient-to-br from-white to-gray-50 border-0 shadow-lg">
              <CardBody className="p-6 text-center">
                <div className={`inline-flex p-3 rounded-2xl bg-gradient-to-r ${card.gradient} text-white shadow-lg mb-4`}>
                  <DollarSign size={24} />
                </div>
                <p className="text-sm text-gray-600 font-medium mb-2">
                  {card.title}
                </p>
                <div className="space-y-2">
                  <p className="text-3xl font-bold text-gray-900">
                    {loading ? (
                      <div className="h-8 bg-gray-200 rounded animate-pulse mx-auto max-w-20"></div>
                    ) : (
                      `${card.prefix}${card.value.toFixed(card.precision)}`
                    )}
                  </p>
                  <div className="flex items-center justify-center gap-1">
                    {card.growth > 0 ? (
                      <ArrowUpRight size={14} className="text-green-500" />
                    ) : (
                      <ArrowDownRight size={14} className="text-red-500" />
                    )}
                    <span className={`text-xs ${card.growth > 0 ? 'text-green-500' : 'text-red-500'}`}>
                      较上期 {Math.abs(card.growth)}%
                    </span>
                  </div>
                </div>
              </CardBody>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* 详细信息区域 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 快速操作 */}
        <motion.div
          variants={cardVariants}
          initial="hidden"
          animate="visible"
          transition={{ delay: 0.8 }}
        >
          <Card className="bg-gradient-to-br from-white to-gray-50 border-0 shadow-lg">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-gradient-to-r from-blue-500 to-purple-600 text-white">
                  <Zap size={18} />
                </div>
                <h3 className="text-lg font-bold text-gray-900">快速操作</h3>
              </div>
            </CardHeader>
            <CardBody className="pt-0">
              <div className="space-y-3">
                <Button
                  color="primary"
                  variant="flat"
                  size="lg"
                  fullWidth
                  startContent={<Users size={18} />}
                  onPress={() => navigate('/admin/users')}
                  className="justify-start"
                >
                  用户管理
                </Button>
                <Button
                  color="success"
                  variant="flat"
                  size="lg"
                  fullWidth
                  startContent={<Package size={18} />}
                  onPress={() => navigate('/admin/packages')}
                  className="justify-start"
                >
                  套餐管理
                </Button>
                <Button
                  color="warning"
                  variant="flat"
                  size="lg"
                  fullWidth
                  startContent={<Key size={18} />}
                  onPress={() => navigate('/admin/cdk')}
                  className="justify-start"
                >
                  CDK管理
                </Button>
                <Button
                  color="secondary"
                  variant="flat"
                  size="lg"
                  fullWidth
                  startContent={<Settings size={18} />}
                  onPress={() => navigate('/admin/config')}
                  className="justify-start"
                >
                  系统配置
                </Button>
              </div>
            </CardBody>
          </Card>
        </motion.div>

        {/* 最近活动 */}
        <motion.div
          variants={cardVariants}
          initial="hidden"
          animate="visible"
          transition={{ delay: 1.0 }}
          className="lg:col-span-2"
        >
          <Card className="bg-gradient-to-br from-white to-gray-50 border-0 shadow-lg">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-gradient-to-r from-green-500 to-emerald-600 text-white">
                    <Activity size={18} />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900">最近活动</h3>
                </div>
                <Button
                  size="sm"
                  variant="light"
                  color="primary"
                  endContent={<ArrowUpRight size={14} />}
                >
                  查看全部
                </Button>
              </div>
            </CardHeader>
            <CardBody className="pt-0">
              <div className="space-y-4">
                {recentActivity.map((activity) => (
                  <div key={activity.id} className="flex items-start gap-3 p-3 rounded-lg bg-white border border-gray-100">
                    <div className={`p-2 rounded-lg ${
                      activity.status === 'success' ? 'bg-green-100 text-green-600' :
                      activity.status === 'warning' ? 'bg-orange-100 text-orange-600' :
                      'bg-red-100 text-red-600'
                    }`}>
                      {getActivityIcon(activity.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {activity.title}
                      </p>
                      <p className="text-xs text-gray-600 truncate">
                        {activity.description}
                      </p>
                    </div>
                    <div className="flex-shrink-0">
                      <p className="text-xs text-gray-500">{activity.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardBody>
          </Card>
        </motion.div>
      </div>

      {/* 系统状态 */}
      <motion.div
        variants={cardVariants}
        initial="hidden"
        animate="visible"
        transition={{ delay: 1.2 }}
      >
        <Card className="bg-gradient-to-br from-white to-gray-50 border-0 shadow-lg">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-600 text-white">
                <Eye size={18} />
              </div>
              <h3 className="text-lg font-bold text-gray-900">系统状态</h3>
            </div>
          </CardHeader>
          <CardBody className="pt-0">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="flex flex-col items-center p-4 rounded-lg bg-white border border-gray-100">
                <Chip color="success" size="sm" variant="flat" className="mb-2">
                  正常运行
                </Chip>
                <p className="text-sm font-medium text-gray-900">API服务</p>
                <Progress 
                  value={98} 
                  color="success" 
                  size="sm" 
                  className="mt-2 w-full"
                  formatOptions={{style: "percent"}}
                />
              </div>
              <div className="flex flex-col items-center p-4 rounded-lg bg-white border border-gray-100">
                <Chip color="success" size="sm" variant="flat" className="mb-2">
                  连接正常
                </Chip>
                <p className="text-sm font-medium text-gray-900">数据库</p>
                <Progress 
                  value={95} 
                  color="success" 
                  size="sm" 
                  className="mt-2 w-full"
                  formatOptions={{style: "percent"}}
                />
              </div>
              <div className="flex flex-col items-center p-4 rounded-lg bg-white border border-gray-100">
                <Chip color="success" size="sm" variant="flat" className="mb-2">
                  运行正常
                </Chip>
                <p className="text-sm font-medium text-gray-900">支付系统</p>
                <Progress 
                  value={99} 
                  color="success" 
                  size="sm" 
                  className="mt-2 w-full"
                  formatOptions={{style: "percent"}}
                />
              </div>
              <div className="flex flex-col items-center p-4 rounded-lg bg-white border border-gray-100">
                <Chip color="warning" size="sm" variant="flat" className="mb-2">
                  负载中等
                </Chip>
                <p className="text-sm font-medium text-gray-900">服务器</p>
                <Progress 
                  value={75} 
                  color="warning" 
                  size="sm" 
                  className="mt-2 w-full"
                  formatOptions={{style: "percent"}}
                />
              </div>
            </div>
            
            <Divider className="my-4" />
            
            <div className="flex items-center justify-center gap-2 text-gray-600">
              <Calendar size={16} />
              <span className="text-sm">
                最后更新: {new Date().toLocaleString('zh-CN')}
              </span>
            </div>
          </CardBody>
        </Card>
      </motion.div>
    </div>
  );
};

export default AdminDashboard;