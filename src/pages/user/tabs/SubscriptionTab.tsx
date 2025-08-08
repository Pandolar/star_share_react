/**
 * 订阅套餐Tab页面
 * 显示用户当前订阅和可用套餐
 */
import React, { useState, useEffect, useMemo } from 'react';
import {
  Card,
  CardBody,
  Button,
  Chip,
  Spinner,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Tab,
  Tabs,
  Input
} from '@heroui/react';
import { motion, AnimatePresence } from 'framer-motion';
import { Package, Star, Crown, AlertCircle, CheckCircle, QrCode, Calendar, Timer } from 'lucide-react';
import { packageUserApi, orderUserApi, exchangeUserApi } from '../../../services/userApi';
import QRCodeGenerator from 'qrcode-generator';

interface PackageInfo {
  id: number;
  package_name: string;
  category: string;
  price: number;
  duration: number;
  introduce: string;
  level: string;
  priority: number;
  remarks: string;
  status: number;
}

interface OrderInfo {
  success: boolean;
  trade_no: string;
  order_id: string;
  payment_url: string | null;
  qr_code: string;
  channel: string;
  pay_type: string;
}

type SubscriptionType = 'weekly' | 'monthly' | 'quarterly' | 'yearly' | 'more';

interface SubscriptionCategory {
  key: SubscriptionType;
  label: string;
  icon: React.ReactNode;
  description: string;
}

export const SubscriptionTab: React.FC = () => {
  const [packages, setPackages] = useState<PackageInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [selectedPackage, setSelectedPackage] = useState<PackageInfo | null>(null);
  const [orderInfo, setOrderInfo] = useState<OrderInfo | null>(null);
  const [orderLoading, setOrderLoading] = useState(false);
  const [paymentModal, setPaymentModal] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<'pending' | 'checking' | 'success' | 'failed'>('pending');
  const [checkInterval, setCheckInterval] = useState<NodeJS.Timeout | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<SubscriptionType>('monthly');
  const [qrCodeExpired, setQrCodeExpired] = useState(false);
  const [qrCodeTimer, setQrCodeTimer] = useState<NodeJS.Timeout | null>(null);

  // 兑换CDK弹窗与状态
  const [redeemModal, setRedeemModal] = useState(false);
  const [cdkValue, setCdkValue] = useState('');
  const [redeemLoading, setRedeemLoading] = useState(false);
  const [redeemStatus, setRedeemStatus] = useState<'idle' | 'success' | 'failed'>('idle');
  const [redeemMessage, setRedeemMessage] = useState<string>('');

  // 套餐分类配置
  const subscriptionCategories: SubscriptionCategory[] = useMemo(() => [
    {
      key: 'weekly',
      label: '周订阅',
      icon: <Calendar className="w-6 h-6" />,
      description: '7天体验'
    },
    {
      key: 'monthly',
      label: '月订阅',
      icon: <Package className="w-6 h-6" />,
      description: '30天经济'
    },
    {
      key: 'quarterly',
      label: '季订阅',
      icon: <Star className="w-6 h-6" />,
      description: '90天优惠'
    },
    {
      key: 'yearly',
      label: '年订阅',
      icon: <Crown className="w-6 h-6" />,
      description: '365天超值'
    },
    {
      key: 'more',
      label: '更多',
      icon: <Timer className="w-6 h-6" />,
      description: '其他时长'
    }
  ], []);

  // 根据时长分类套餐
  const categorizePackage = (duration: number): SubscriptionType => {
    if (duration === 7) return 'weekly';
    if (duration >= 30 && duration <= 31) return 'monthly';
    if (duration >= 90 && duration <= 93) return 'quarterly';
    if (duration >= 364 && duration <= 366) return 'yearly';
    return 'more';
  };

  // 分组套餐
  const groupedPackages = useMemo(() => {
    const groups: Record<SubscriptionType, PackageInfo[]> = {
      weekly: [],
      monthly: [],
      quarterly: [],
      yearly: [],
      more: []
    };

    packages.forEach(pkg => {
      const category = categorizePackage(pkg.duration);
      groups[category].push(pkg);
    });

    Object.keys(groups).forEach(key => {
      groups[key as SubscriptionType].sort((a, b) => a.priority - b.priority);
    });

    return groups;
  }, [packages]);

  // 可用的分类
  const availableCategories = useMemo(() => {
    return subscriptionCategories.filter(category =>
      groupedPackages[category.key].length > 0
    );
  }, [groupedPackages, subscriptionCategories]);

  // 计算日均价格（保留1位小数，四舍五入）
  const calculateDailyPrice = (price: number, duration: number): string => {
    if (duration <= 0) return '0.0';
    const dailyPrice = price / duration;
    return (Math.round(dailyPrice * 10) / 10).toString();
  };

  // 获取套餐列表
  const fetchPackages = React.useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const response = await packageUserApi.getPackages();

      if (response.code === 20000) {
        const sortedPackages = (response.data || []).sort((a, b) => a.priority - b.priority);
        setPackages(sortedPackages);

        const firstAvailableCategory = subscriptionCategories.find(category =>
          sortedPackages.some(pkg => categorizePackage(pkg.duration) === category.key)
        );
        if (firstAvailableCategory) {
          setSelectedCategory(firstAvailableCategory.key);
        }
      } else {
        setError(response.msg || '获取套餐列表失败');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '网络错误');
    } finally {
      setLoading(false);
    }
  }, [subscriptionCategories]);

  // 创建订单
  const createOrder = async (packageId: number) => {
    try {
      setOrderLoading(true);
      const response = await orderUserApi.createOrder(packageId);

      if (response.code === 20000) {
        setOrderInfo(response.data);
        setPaymentModal(true);
        setPaymentStatus('pending');
        setQrCodeExpired(false);
        startPaymentStatusCheck(response.data.order_id);
        startQrCodeTimer();
      } else {
        alert(response.msg || '创建订单失败');
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : '网络错误');
    } finally {
      setOrderLoading(false);
    }
  };

  // 开始二维码计时器
  const startQrCodeTimer = () => {
    if (qrCodeTimer) {
      clearTimeout(qrCodeTimer);
    }
    const timer = setTimeout(() => {
      setQrCodeExpired(true);
      // 二维码过期时停止支付状态检查
      if (checkInterval) {
        clearInterval(checkInterval);
        setCheckInterval(null);
      }
    }, 5 * 60 * 1000);
    setQrCodeTimer(timer);
  };

  // 开始检查支付状态
  const startPaymentStatusCheck = (orderId: string) => {
    if (checkInterval) {
      clearInterval(checkInterval);
    }

    const interval = setInterval(async () => {
      try {
        const response = await orderUserApi.getPayStatus(orderId);

        // 只判断 data.success 是否为 true
        if (response.data && (response.data as { success?: boolean }).success === true) {
          setPaymentStatus('success');
          clearInterval(interval);
          if (qrCodeTimer) {
            clearTimeout(qrCodeTimer);
          }
          setTimeout(() => {
            window.location.reload();
          }, 2000);
        } else if (response.data && (response.data as { success?: boolean }).success === false) {
          // 继续检查，什么都不做
        } else {
          setPaymentStatus('failed');
          clearInterval(interval);
        }
      } catch (err) {
      }
    }, 1500);

    setCheckInterval(interval);
  };

  // 生成二维码
  const generateQRCode = (text: string): string => {
    const qr = QRCodeGenerator(0, 'M');
    qr.addData(text);
    qr.make();
    return qr.createDataURL(8, 4);
  };

  // 获取时长描述
  const getDurationText = (duration: number) => {
    if (duration === 7) return '1周';
    if (duration >= 30 && duration <= 31) return '1个月';
    if (duration >= 90 && duration <= 93) return '1季度';
    if (duration >= 364 && duration <= 366) return '1年';
    return `${duration}天`;
  };

  // 关闭支付弹窗
  const closePaymentModal = () => {
    if (checkInterval) {
      clearInterval(checkInterval);
      setCheckInterval(null);
    }
    if (qrCodeTimer) {
      clearTimeout(qrCodeTimer);
      setQrCodeTimer(null);
    }
    setPaymentModal(false);
    setOrderInfo(null);
    setPaymentStatus('pending');
    setQrCodeExpired(false);
  };

  // 计算最受欢迎的套餐
  const getMostPopularPackage = (categoryPackages: PackageInfo[]) => {
    if (categoryPackages.length <= 1) return null;
    const sortedByPrice = [...categoryPackages].sort((a, b) => a.price - b.price);
    const middleIndex = Math.floor(sortedByPrice.length / 2);
    return sortedByPrice[middleIndex];
  };

  // 打开兑换弹窗
  const openRedeemModal = () => {
    setRedeemModal(true);
    setCdkValue('');
    setRedeemStatus('idle');
    setRedeemMessage('');
  };

  // 关闭兑换弹窗
  const closeRedeemModal = () => {
    setRedeemModal(false);
    setCdkValue('');
    setRedeemLoading(false);
    setRedeemStatus('idle');
    setRedeemMessage('');
  };

  // 提交兑换CDK
  const handleRedeemCdk = async () => {
    const cdk = cdkValue.trim();
    if (!cdk) return;
    try {
      setRedeemLoading(true);
      setRedeemStatus('idle');
      setRedeemMessage('');

      // 调用兑换接口，接口头部将自动携带 xuserid 与 xtoken
      const res = await exchangeUserApi.exchangeCdk(cdk);

      if (res.code === 20000) {
        setRedeemStatus('success');
        setRedeemMessage('兑换成功，正在刷新页面...');
        // 成功后短暂提示并刷新
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } else {
        // 按照约定：非20000为失败，提示msg
        setRedeemStatus('failed');
        setRedeemMessage(res.msg || '兑换失败');
      }
    } catch (err) {
      // 当后端返回非20000时，底层会抛出异常，err.message包含msg
      const msg = err instanceof Error ? err.message : '兑换失败，请稍后重试';
      setRedeemStatus('failed');
      setRedeemMessage(msg);
    } finally {
      setRedeemLoading(false);
    }
  };

  useEffect(() => {
    fetchPackages();

    return () => {
      if (checkInterval) {
        clearInterval(checkInterval);
      }
      if (qrCodeTimer) {
        clearTimeout(qrCodeTimer);
      }
    };
  }, [checkInterval, fetchPackages, qrCodeTimer]);

  return (
    <div
      className="subscription-tab-wrapper"
      style={{
        width: '100%',
        fontFamily: 'inherit',
        lineHeight: 'inherit',
        fontSize: 'inherit',
        color: 'inherit'
      }}
    >
      {/* 内部样式重置和隔离 */}
      <style>{`
        .subscription-tab-wrapper * {
          box-sizing: border-box;
        }
        
        .subscription-tab-wrapper .subscription-card {
          all: unset;
          display: flex;
          flex-direction: column;
          position: relative;
          background: white;
          border-radius: 12px;
          border: 1px solid #e5e7eb;
          transition: all 0.3s ease;
          overflow: hidden;
          height: 100%;
        }
        
        .subscription-tab-wrapper .subscription-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
          border-color: #3b82f6;
        }
        
        .subscription-tab-wrapper .subscription-card.popular {
          border: 1px solid #3b82f6;
          position: relative;
        }
        
        .subscription-tab-wrapper .subscription-card.popular::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 4px;
          background: linear-gradient(90deg, #3b82f6, #1d4ed8);
        }
        
        .subscription-tab-wrapper .popular-badge {
          position: absolute;
          top: 0;
          left: 50%;
          transform: translateX(-50%);
          background: #3b82f6;
          color: white;
          padding: 4px 12px;
          border-radius: 0 0 8px 8px;
          font-size: 11px;
          font-weight: 600;
          white-space: nowrap;
          z-index: 10;
          box-shadow: 0 2px 8px rgba(59, 130, 246, 0.3);
        }
        
        .subscription-tab-wrapper .card-body {
          padding: 24px;
          display: flex;
          flex-direction: column;
          height: 100%;
          min-height: 420px;
        }
        
        .subscription-tab-wrapper .package-header {
          text-align: center;
          margin-bottom: 20px;
        }
        
        .subscription-tab-wrapper .package-title {
          font-size: 20px;
          font-weight: 700;
          margin: 0 0 12px 0;
          color: #1f2937;
          line-height: 1.2;
        }
        
        .subscription-tab-wrapper .package-badges {
          display: flex;
          justify-content: center;
          gap: 8px;
          flex-wrap: wrap;
        }
        
        .subscription-tab-wrapper .package-price {
          text-align: center;
          margin: 20px 0;
          padding: 16px;
          background: #f8fafc;
          border-radius: 8px;
        }
        
        .subscription-tab-wrapper .price-main {
          display: flex;
          align-items: baseline;
          justify-content: center;
          gap: 4px;
          margin-bottom: 8px;
        }
        
        .subscription-tab-wrapper .price-amount {
          font-size: 32px;
          font-weight: 800;
          color: #3b82f6;
          line-height: 1;
        }
        
        .subscription-tab-wrapper .price-unit {
          font-size: 14px;
          color: #6b7280;
          font-weight: 500;
        }
        
        .subscription-tab-wrapper .price-daily {
          font-size: 13px;
          color: #9ca3af;
          margin: 0;
          font-weight: 400;
        }
        
        .subscription-tab-wrapper .package-description {
          flex: 1;
          margin: 16px 0 24px 0;
        }
        
        .subscription-tab-wrapper .description-box {
          background: #f9fafb;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          padding: 16px;
          min-height: 80px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .subscription-tab-wrapper .description-text {
          font-size: 14px;
          color: #4b5563;
          line-height: 1.5;
          text-align: center;
          margin: 0;
        }
        
        .subscription-tab-wrapper .subscribe-button {
          margin-top: auto;
        }
        
        .subscription-tab-wrapper .hero-button {
          width: 100%;
          height: 44px;
          border-radius: 8px;
          font-weight: 600;
          font-size: 14px;
          transition: all 0.2s ease;
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }
        
        .subscription-tab-wrapper .hero-button.primary {
          background: #3b82f6;
          color: white;
        }
        
        .subscription-tab-wrapper .hero-button.primary:hover {
          background: #2563eb;
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
        }
        
        .subscription-tab-wrapper .hero-button.secondary {
          background: white;
          color: #374151;
          border: 1px solid #d1d5db;
        }
        
        .subscription-tab-wrapper .hero-button.secondary:hover {
          background: #f9fafb;
          border-color: #9ca3af;
        }
        
        .subscription-tab-wrapper .hero-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          transform: none !important;
        }
        
        .subscription-tab-wrapper .loading-spinner {
          width: 16px;
          height: 16px;
          border: 2px solid transparent;
          border-top: 2px solid currentColor;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }
        
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
        
        .subscription-tab-wrapper .divider {
          height: 1px;
          background: #e5e7eb;
          margin: 16px 0;
          border: none;
        }
      `}</style>

      {/* 页面标题 + 操作入口 */}
      <div className="flex items-center justify-between mb-8">
        <div className="text-left">
          <h1 className="text-3xl font-bold text-foreground mb-2">订阅套餐</h1>
          <p className="text-default-500 max-w-md">选择适合您的订阅方案，享受优质服务</p>
        </div>
        <div className="flex items-center gap-3">
          <Button color="primary" variant="flat" onPress={openRedeemModal}>
            兑换激活码
          </Button>
        </div>
      </div>

      {/* 加载状态 */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-16">
          <Spinner size="lg" color="primary" />
          <p className="text-default-500 mt-4">正在加载套餐信息...</p>
        </div>
      )}

      {/* 错误状态 */}
      {error && (
        <div className="max-w-md mx-auto">
          <Card>
            <CardBody className="text-center p-8">
              <AlertCircle className="w-12 h-12 text-danger mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-danger mb-2">加载失败</h3>
              <p className="text-default-600 text-sm mb-4">{error}</p>
              <Button color="danger" variant="light" onPress={fetchPackages}>
                重新加载
              </Button>
            </CardBody>
          </Card>
        </div>
      )}

      {/* 分类标签页 */}
      {!loading && !error && availableCategories.length > 0 && (
        <div className="mb-8">
          <Tabs
            selectedKey={selectedCategory}
            onSelectionChange={(key) => setSelectedCategory(key as SubscriptionType)}
            variant="underlined"
            color="primary"
            classNames={{
              base: "w-full",
              tabList: "gap-6 w-full relative rounded-none p-0 border-b border-divider",
              cursor: "w-full bg-primary",
              tab: "max-w-fit px-3 h-16",
              tabContent: "group-data-[selected=true]:text-primary"
            }}
          >
            {availableCategories.map((category) => (
              <Tab
                key={category.key}
                title={
                  <div className="flex items-center gap-3 py-1">
                    <div className="flex-shrink-0 text-primary">{category.icon}</div>
                    <div className="flex flex-col items-start">
                      <span className="font-medium text-base">{category.label}</span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-default-500">{category.description}</span>
                        <Chip size="sm" variant="flat" color="primary" className="h-5 text-xs px-1.5">
                          {groupedPackages[category.key].length}
                        </Chip>
                      </div>
                    </div>
                  </div>
                }
              />
            ))}
          </Tabs>
        </div>
      )}

      {/* 套餐列表 - 重构版本 */}
      {!loading && !error && availableCategories.length > 0 && (
        <AnimatePresence mode="wait">
          <motion.div
            key={selectedCategory}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 max-w-6xl mx-auto"
          >
            {groupedPackages[selectedCategory].map((pkg, index) => {
              const mostPopular = getMostPopularPackage(groupedPackages[selectedCategory]);
              const isPopular = mostPopular?.id === pkg.id;
              const dailyPrice = calculateDailyPrice(pkg.price, pkg.duration);

              return (
                <motion.div
                  key={pkg.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1, duration: 0.4 }}
                  className="relative h-full"
                >
                  <div className={`subscription-card ${isPopular ? 'popular' : ''}`}>
                    {/* 推荐标签 */}
                    {isPopular && (
                      <div className="popular-badge">
                        最受欢迎
                      </div>
                    )}

                    <div className="card-body">
                      {/* 套餐标题 */}
                      <div className="package-header">
                        <h3 className="package-title">
                          {pkg.package_name}
                        </h3>
                        <div className="package-badges">
                          <Chip
                            size="sm"
                            color="default"
                            variant="flat"
                          >
                            {pkg.level}
                          </Chip>
                          <Chip
                            size="sm"
                            variant="bordered"
                            startContent={<Timer className="w-3 h-3" />}
                          >
                            {getDurationText(pkg.duration)}
                          </Chip>
                        </div>
                      </div>

                      <div className="divider" />

                      {/* 价格信息 */}
                      <div className="package-price">
                        <div className="price-main">
                          <span className="price-amount">¥{pkg.price}</span>
                          <span className="price-unit">/ {getDurationText(pkg.duration)}</span>
                        </div>
                        <p className="price-daily">
                          约 ¥{dailyPrice} / 天
                        </p>
                      </div>

                      {/* 套餐描述 */}
                      <div className="package-description">
                        <div className="description-box">
                          <p className="description-text">
                            {pkg.introduce || '暂无详细描述'}
                          </p>
                        </div>
                      </div>

                      {/* 订阅按钮 */}
                      <div className="subscribe-button">
                        <button
                          className={`hero-button ${isPopular ? 'primary' : 'secondary'}`}
                          disabled={pkg.status !== 1 || (orderLoading && selectedPackage?.id === pkg.id)}
                          onClick={() => {
                            setSelectedPackage(pkg);
                            createOrder(pkg.id);
                          }}
                        >
                          {orderLoading && selectedPackage?.id === pkg.id ? (
                            <>
                              <div className="loading-spinner" />
                              处理中...
                            </>
                          ) : (
                            pkg.status === 1 ? '立即订阅' : '暂不可用'
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        </AnimatePresence>
      )}

      {/* 空状态 */}
      {!loading && !error && packages.length === 0 && (
        <div className="text-center py-16">
          <Package className="w-16 h-16 mx-auto mb-4 text-default-300" />
          <h3 className="text-xl font-semibold text-default-600 mb-2">暂无可用套餐</h3>
          <p className="text-default-400">请稍后再试或联系客服</p>
        </div>
      )}

      {/* 支付弹窗 */}
      <Modal
        isOpen={paymentModal}
        onClose={closePaymentModal}
        size="lg"
        hideCloseButton={paymentStatus === 'success'}
        classNames={{
          base: "max-h-[90vh]",
          body: "py-6",
        }}
      >
        <ModalContent>
          <ModalHeader>
            <div>
              <h2 className="text-xl font-bold">完成支付</h2>
              {selectedPackage && (
                <p className="text-sm text-default-500 mt-1">{selectedPackage.package_name}</p>
              )}
            </div>
          </ModalHeader>

          <ModalBody>
            {orderInfo && (
              <div className="space-y-6">
                {/* 订单摘要 */}
                <Card>
                  <CardBody className="p-4">
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-default-500">订单号</span>
                        <code className="text-xs bg-default-100 px-2 py-1 rounded font-mono">
                          {orderInfo.order_id}
                        </code>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-default-500">支付金额</span>
                        <span className="text-2xl font-bold text-primary">¥{selectedPackage?.price}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-default-500">套餐时长</span>
                        <span className="font-medium">
                          {selectedPackage ? getDurationText(selectedPackage.duration) : ''}
                        </span>
                      </div>
                    </div>
                  </CardBody>
                </Card>

                {/* 支付状态 */}
                <div className="text-center">
                  {paymentStatus === 'pending' && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-center gap-3">
                        <QrCode className="w-6 h-6 text-primary" />
                        <span className="text-lg font-medium">
                          {orderInfo.pay_type === 'wxpay' ? '请使用微信扫码支付' : '请扫码支付'}
                        </span>
                      </div>
                      <div className="text-sm text-default-500 space-y-1">
                        <p>二维码5分钟内有效</p>
                        {qrCodeExpired && (
                          <p className="text-danger font-medium">二维码已过期，请重新创建订单</p>
                        )}
                      </div>
                    </div>
                  )}

                  {paymentStatus === 'checking' && (
                    <div className="space-y-4">
                      <Spinner size="lg" color="primary" />
                      <p className="text-default-600">正在确认支付结果...</p>
                    </div>
                  )}

                  {paymentStatus === 'success' && (
                    <div className="space-y-6">
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", duration: 0.6 }}
                      >
                        <CheckCircle className="w-20 h-20 mx-auto text-success" />
                      </motion.div>
                      <div>
                        <h3 className="text-2xl font-bold text-success mb-2">支付成功！</h3>
                        <p className="text-default-500">页面即将刷新，请稍等...</p>
                      </div>
                    </div>
                  )}

                  {paymentStatus === 'failed' && (
                    <div className="space-y-4">
                      <AlertCircle className="w-12 h-12 mx-auto text-danger" />
                      <div>
                        <h3 className="text-lg font-semibold text-danger mb-2">支付失败</h3>
                        <p className="text-default-500 text-sm">请重试或联系客服</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* 二维码 */}
                {orderInfo.qr_code && paymentStatus === 'pending' && (
                  <div className="flex justify-center">
                    <Card className="p-6 relative">
                      <motion.img
                        src={generateQRCode(orderInfo.qr_code)}
                        alt="支付二维码"
                        className={`w-48 h-48 transition-all duration-500 ${qrCodeExpired ? 'opacity-30 grayscale' : ''
                          }`}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.2 }}
                      />
                      {qrCodeExpired && (
                        <motion.div
                          className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-20 rounded-lg"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ duration: 0.3 }}
                        >
                          <Chip color="danger" variant="solid" className="shadow-lg">
                            已过期
                          </Chip>
                        </motion.div>
                      )}
                    </Card>
                  </div>
                )}
              </div>
            )}
          </ModalBody>

          <ModalFooter>
            {paymentStatus !== 'success' && (
              <Button
                color="danger"
                variant="light"
                onPress={closePaymentModal}
              >
                取消支付
              </Button>
            )}
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* 兑换激活码弹窗 */}
      <Modal
        isOpen={redeemModal}
        onClose={closeRedeemModal}
        size="md"
        classNames={{
          base: 'max-h-[80vh]'
        }}
      >
        <ModalContent>
          <ModalHeader>
            <div>
              <h2 className="text-xl font-bold">兑换激活码 CDK</h2>
              <p className="text-sm text-default-500 mt-1">输入您获得的 CDK 激活码，兑换相应权益</p>
            </div>
          </ModalHeader>
          <ModalBody>
            {redeemStatus === 'success' ? (
              <div className="text-center space-y-4 py-4">
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', duration: 0.6 }}>
                  <CheckCircle className="w-16 h-16 mx-auto text-success" />
                </motion.div>
                <p className="text-success font-semibold">{redeemMessage || '兑换成功'}</p>
              </div>
            ) : (
              <div className="space-y-4">
                <Input
                  label="激活码"
                  placeholder="请输入CDK，例如：XXXX-XXXX-XXXX"
                  value={cdkValue}
                  onValueChange={setCdkValue}
                  isDisabled={redeemLoading}
                  isRequired
                />
                {redeemStatus === 'failed' && (
                  <div className="flex items-center gap-2 text-danger text-sm">
                    <AlertCircle className="w-4 h-4" />
                    <span>{redeemMessage}</span>
                  </div>
                )}
              </div>
            )}
          </ModalBody>
          <ModalFooter>
            {redeemStatus !== 'success' ? (
              <>
                <Button variant="light" onPress={closeRedeemModal} isDisabled={redeemLoading}>
                  取消
                </Button>
                <Button color="primary" onPress={handleRedeemCdk} isLoading={redeemLoading} isDisabled={!cdkValue.trim()}>
                  确认兑换
                </Button>
              </>
            ) : (
              <Button color="primary" onPress={closeRedeemModal}>
                关闭
              </Button>
            )}
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
};