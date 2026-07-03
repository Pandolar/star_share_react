/**
 * 订阅套餐Tab页面
 * 显示用户当前订阅和可用套餐
 */
import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardBody, Button, Chip, Input, Spinner, Tab, Tabs } from '@heroui/react';
import { motion, AnimatePresence } from 'framer-motion';
import { Package, Star, Crown, AlertCircle, Calendar, Timer, ChevronDown, Info } from 'lucide-react';
import { packageUserApi, orderUserApi } from '../../../services/userApi';
import { toast } from '../../../utils/toast';
import { useIsMobile } from '../../../hooks/useIsMobile';
import { useWhiteLabel } from '../../../contexts/WhiteLabelContext';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { PaymentModal } from './subscription/PaymentModal';
import { CdkRedeemModal } from './subscription/CdkRedeemModal';
import {
  PackageInfo,
  OrderInfo,
  SubscriptionType,
  SubscriptionCategory,
  categorizePackage,
  getDurationText,
  calculateMonthlyPrice,
  shouldShowMonthlyPrice,
} from './subscription/types';

export const SubscriptionTab: React.FC = () => {
  const [packages, setPackages] = useState<PackageInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedPackage, setSelectedPackage] = useState<PackageInfo | null>(null);
  const [orderInfo, setOrderInfo] = useState<OrderInfo | null>(null);
  const [orderLoading, setOrderLoading] = useState(false);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<SubscriptionType>('yearly');
  const [showSubscriptionGuide, setShowSubscriptionGuide] = useState(false);
  const [redeemModalOpen, setRedeemModalOpen] = useState(false);

  const isMobileDevice = useIsMobile();
  const { isWhiteLabel, purchaseUrl, subscriptionNotice } = useWhiteLabel();

  const [cdkCode, setCdkCode] = useState('');

  const subscriptionCategories: SubscriptionCategory[] = useMemo(
    () => [
      { key: 'yearly', label: '年订阅', icon: <Crown className="w-6 h-6" />, description: '365天超值' },
      { key: 'quarterly', label: '季订阅', icon: <Star className="w-6 h-6" />, description: '90天优惠' },
      { key: 'monthly', label: '月订阅', icon: <Package className="w-6 h-6" />, description: '30天经济' },
      { key: 'weekly', label: '周订阅', icon: <Calendar className="w-6 h-6" />, description: '7天体验' },
      { key: 'more', label: '更多', icon: <Timer className="w-6 h-6" />, description: '其他时长' },
    ],
    []
  );

  const groupedPackages = useMemo(() => {
    const groups: Record<SubscriptionType, PackageInfo[]> = {
      weekly: [],
      monthly: [],
      quarterly: [],
      yearly: [],
      more: [],
    };
    packages.forEach((pkg) => {
      groups[categorizePackage(pkg.duration)].push(pkg);
    });
    Object.keys(groups).forEach((key) => {
      groups[key as SubscriptionType].sort((a, b) => a.priority - b.priority);
    });
    return groups;
  }, [packages]);

  const allPackages = useMemo(() => [...packages].sort((a, b) => a.priority - b.priority), [packages]);

  const availableCategories = useMemo(
    () => subscriptionCategories.filter((c) => groupedPackages[c.key].length > 0),
    [groupedPackages, subscriptionCategories]
  );

  const fetchPackages = React.useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const response = await packageUserApi.getPackages();
      if (response.code === 20000) {
        const sortedPackages = (response.data || []).sort((a, b) => a.priority - b.priority);
        setPackages(sortedPackages);
        const firstAvailableCategory = subscriptionCategories.find((c) =>
          sortedPackages.some((p) => categorizePackage(p.duration) === c.key)
        );
        if (firstAvailableCategory) setSelectedCategory(firstAvailableCategory.key);
      } else {
        setError(response.msg || '获取套餐列表失败');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '网络错误');
    } finally {
      setLoading(false);
    }
  }, [subscriptionCategories]);

  useEffect(() => {
    fetchPackages();
  }, [fetchPackages]);

  // 创建订单
  const createOrder = async (pkg: PackageInfo) => {
    try {
      setOrderLoading(true);
      setSelectedPackage(pkg);

      const isAndroid = /android/i.test(navigator.userAgent);
      const requestData = isMobileDevice ? { device: 'mobile' } : {};
      const response = await orderUserApi.createOrder(pkg.id, requestData);

      if (response.code === 20000) {
        setOrderInfo(response.data);
        setPaymentModalOpen(true);

        // 仅 Android 尝试弹出支付页（Android 浏览器通常不拦截）
        if (isAndroid && response.data.payment_url) {
          window.open(response.data.payment_url, '_blank');
        }
      } else {
        toast.error(response.msg || '创建订单失败');
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '网络错误');
    } finally {
      setOrderLoading(false);
    }
  };

  const getMostPopularPackage = (categoryPackages: PackageInfo[]) => {
    if (categoryPackages.length <= 1) return null;
    const sortedByPrice = [...categoryPackages].sort((a, b) => a.price - b.price);
    return sortedByPrice[Math.floor(sortedByPrice.length / 2)];
  };

  return (
    <div
      className="subscription-tab-wrapper"
      style={{
        width: '100%',
        fontFamily: 'inherit',
        lineHeight: 'inherit',
        fontSize: 'inherit',
        color: 'inherit',
      }}
    >
      {/* 内部样式重置和隔离 */}
      <style>{`
        .subscription-tab-wrapper * { box-sizing: border-box; }
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
          top: 0; left: 0; right: 0;
          height: 4px;
          background: #3b82f6;
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
        .subscription-tab-wrapper .package-header { text-align: center; margin-bottom: 20px; }
        .subscription-tab-wrapper .package-title {
          font-size: 20px;
          font-weight: 700;
          margin: 0 0 12px 0;
          color: #1f2937;
          line-height: 1.2;
        }
        .subscription-tab-wrapper .package-badges {
          display: flex; justify-content: center; gap: 8px; flex-wrap: wrap;
        }
        .subscription-tab-wrapper .package-price {
          text-align: center; margin: 20px 0; padding: 16px;
          background: #f8fafc; border-radius: 8px;
        }
        .subscription-tab-wrapper .price-main {
          display: flex; align-items: baseline; justify-content: center; gap: 4px; margin-bottom: 8px;
        }
        .subscription-tab-wrapper .price-amount {
          font-size: 32px; font-weight: 800; color: #3b82f6; line-height: 1;
        }
        .subscription-tab-wrapper .price-unit { font-size: 14px; color: #6b7280; font-weight: 500; }
        .subscription-tab-wrapper .price-daily { font-size: 13px; color: #9ca3af; margin: 0; font-weight: 400; }
        .subscription-tab-wrapper .package-description { flex: 1; margin: 16px 0 24px 0; }
        .subscription-tab-wrapper .description-box {
          background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px;
          padding: 16px; min-height: 80px;
          display: flex; align-items: center; justify-content: center;
        }
        .subscription-tab-wrapper .description-text {
          font-size: 14px; color: #4b5563; line-height: 1.5; text-align: center; margin: 0;
        }
        .subscription-tab-wrapper .subscribe-button { margin-top: auto; }
        .subscription-tab-wrapper .hero-button {
          width: 100%; height: 44px; border-radius: 8px;
          font-weight: 600; font-size: 14px;
          transition: all 0.2s ease;
          border: none; cursor: pointer;
          display: flex; align-items: center; justify-content: center; gap: 8px;
        }
        .subscription-tab-wrapper .hero-button.primary { background: #3b82f6; color: white; }
        .subscription-tab-wrapper .hero-button.primary:hover {
          background: #2563eb; transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
        }
        .subscription-tab-wrapper .hero-button.secondary {
          background: white; color: #374151; border: 1px solid #d1d5db;
        }
        .subscription-tab-wrapper .hero-button.secondary:hover {
          background: #f9fafb; border-color: #9ca3af;
        }
        .subscription-tab-wrapper .hero-button:disabled {
          opacity: 0.5; cursor: not-allowed; transform: none !important;
        }
        .subscription-tab-wrapper .loading-spinner {
          width: 16px; height: 16px;
          border: 2px solid transparent;
          border-top: 2px solid currentColor;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        .subscription-tab-wrapper .divider {
          height: 1px; background: #e5e7eb; margin: 16px 0; border: none;
        }
        .subscription-tab-wrapper [data-slot="tabList"] {
          backdrop-filter: blur(8px);
          background: rgba(255, 255, 255, 0.95);
        }
        .subscription-tab-wrapper [data-slot="tab"]:not([data-selected="true"]):hover {
          background: rgba(59, 130, 246, 0.08);
          transform: translateY(-1px);
          box-shadow: 0 2px 8px rgba(30, 104, 224, 0.15);
        }
        .subscription-tab-wrapper [data-slot="cursor"] {
          background: linear-gradient(135deg, rgba(59, 130, 246, 0.08) 0%, rgba(59, 130, 246, 0.12) 100%);
          border: 1px solid rgba(29, 89, 185, 0.15);
          backdrop-filter: blur(4px);
        }
      `}</style>

      {/* 页面标题 + 操作入口 */}
      <div className="flex items-center justify-between mb-8 gap-4 flex-wrap">
        <div className="text-left">
          <h1 className="text-3xl font-bold text-foreground mb-2">订阅套餐</h1>
          <p className="text-default-500 max-w-md">选择适合您的订阅方案，享受优质服务</p>
        </div>
        {!isWhiteLabel && (
          <div className="flex items-center gap-3">
            <Button color="primary" variant="flat" onPress={() => setRedeemModalOpen(true)}>
              兑换激活码
            </Button>
          </div>
        )}
      </div>

      {/* 白牌模式：兑换卡片 */}
      {isWhiteLabel && (
        <Card className="mb-6">
          <CardBody className="p-5 sm:p-6">
            <div className="flex items-start gap-4 mb-4">
              <div className="w-10 h-10 rounded-xl bg-warning/10 flex items-center justify-center flex-shrink-0">
                <Package className="w-5 h-5 text-warning" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-lg text-default-900 mb-1">兑换激活码</h3>
                <p className="text-sm text-default-500">输入您获得的激活码，即可开通对应套餐</p>
              </div>
            </div>
            <div className="flex gap-3 items-start">
              <Input
                value={cdkCode}
                onChange={(e) => setCdkCode(e.target.value.toUpperCase())}
                placeholder="请输入激活码（如：ABCD-1234-EFGH）"
                className="flex-1"
              />
              <Button
                color="primary"
                isDisabled={!cdkCode.trim()}
                onPress={() => {
                  setRedeemModalOpen(true);
                }}
                className="px-6"
              >
                兑换
              </Button>
            </div>
            {purchaseUrl && (
              <div className="mt-4 pt-4 border-t border-default-100">
                <Button
                  color="primary"
                  variant="flat"
                  size="sm"
                  onPress={() => window.open(purchaseUrl, '_blank')}
                  className="w-full sm:w-auto"
                >
                  购买激活码
                </Button>
              </div>
            )}
          </CardBody>
        </Card>
      )}

      {/* 订阅说明：白牌模式下隐藏（白牌无自营订阅规则，统一走兑换激活码） */}
      {!isWhiteLabel && (
      <Card className="mb-6 border border-primary/10 bg-primary/5 shadow-sm">
        <CardBody className="p-4 sm:p-5">
          <button
            type="button"
            onClick={() => setShowSubscriptionGuide((p) => !p)}
            className="w-full flex items-center justify-between gap-4 text-left"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                <Info className="w-4 h-4 text-primary" />
              </div>
              <div>
                <div className="font-semibold text-default-900">订阅说明</div>
                <div className="text-sm text-default-500">购买前展开查看套餐购买相关规则(必读)</div>
              </div>
            </div>
            <ChevronDown className={`w-4 h-4 text-default-500 transition-transform ${showSubscriptionGuide ? 'rotate-180' : ''}`} />
          </button>
          {showSubscriptionGuide && (
            <div className="mt-4 rounded-xl bg-white/80 border border-default-100 px-4 py-3 text-sm leading-7">
              {subscriptionNotice ? (
                // 使用配置的订阅说明（React Markdown 渲染，与公告一致）
                <div className="prose prose-sm max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 [&_strong]:text-default-900 [&_strong]:font-semibold">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {subscriptionNotice}
                  </ReactMarkdown>
                </div>
              ) : (
                // 降级：配置为空时显示默认说明
                <div className="text-default-700">
                  {isWhiteLabel ? (
                    <>
                      <div>1. 若您已有订阅套餐，不可再次兑换<strong className="font-semibold text-default-900">更低</strong>等级套餐。</div>
                      <div>2. 兑换同等级套餐将直接<strong className="font-semibold text-default-900">叠加延期</strong>。</div>
                      <div>3. 兑换更高等级套餐后将<strong className="font-semibold text-default-900">自动冻结低等级套餐</strong>，待高等级套餐过期后将自动解冻。</div>
                      <div>4. 请通过右上角【兑换激活码】使用您获得的激活码开通对应套餐。</div>
                    </>
                  ) : (
                    <>
                      <div>1. 若您已有订阅套餐，不可再次订阅<strong className="font-semibold text-default-900">更低</strong>等级套餐。</div>
                      <div>2. 订阅同等级套餐将直接<strong className="font-semibold text-default-900">叠加延期</strong>。</div>
                      <div>3. 订阅更高等级套餐后将<strong className="font-semibold text-default-900">自动冻结低等级套餐</strong>，待高等级套餐过期后将自动解冻。</div>
                      <div>4. 如果您有激活码/CDK/兑换码，可直接在右上角【兑换激活码】直接兑换。</div>
                      <div>5. 单笔订单金额<strong className="font-semibold text-default-900">超100元且30天内</strong>可联系客服进行开票，支持高校或企业抬头。</div>
                    </>
                  )}
                </div>
              )}
            </div>
          )}
        </CardBody>
      </Card>
      )}

      {loading && (
        <div className="flex flex-col items-center justify-center py-16">
          <Spinner size="lg" color="primary" />
          <p className="text-default-500 mt-4">正在加载套餐信息...</p>
        </div>
      )}

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

      {/* 桌面端 Tabs */}
      {!loading && !error && availableCategories.length > 0 && !isMobileDevice && (
        <div className="mb-8">
          <Tabs
            selectedKey={selectedCategory}
            onSelectionChange={(key) => setSelectedCategory(key as SubscriptionType)}
            variant="light"
            color="primary"
            size="lg"
            classNames={{
              base: 'w-full',
              tabList: 'gap-4 w-full justify-center bg-content1 rounded-xl p-2 shadow-sm border border-divider/20',
              cursor: 'w-full bg-primary/10 rounded-lg border border-primary/20 shadow-sm',
              tab: 'px-4 py-3 h-auto min-h-0 data-[selected=true]:bg-transparent data-[hover-unselected=true]:bg-primary/5 rounded-lg transition-all duration-200',
              tabContent: 'group-data-[selected=true]:text-primary font-medium',
            }}
          >
            {availableCategories.map((category) => (
              <Tab
                key={category.key}
                title={
                  <div className="flex items-center gap-2.5">
                    <div className="flex-shrink-0 w-5 h-5 transition-colors duration-200 group-data-[selected=true]:text-primary text-default-500">
                      {category.icon}
                    </div>
                    <div className="flex flex-col items-start gap-0.5">
                      <span className="text-lg font-extrabold leading-none">{category.label}</span>
                      <div className="flex items-center gap-1.5 opacity-80">
                        <span className="text-xs text-default-400 leading-none">{category.description}</span>
                      </div>
                    </div>
                  </div>
                }
              />
            ))}
          </Tabs>
        </div>
      )}

      {/* 桌面端套餐列表 */}
      {!loading && !error && availableCategories.length > 0 && !isMobileDevice && (
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
              const monthlyPrice = calculateMonthlyPrice(pkg.price, pkg.duration);
              const showMonthlyPrice = shouldShowMonthlyPrice(pkg.duration);

              return (
                <motion.div
                  key={pkg.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1, duration: 0.4 }}
                  className="relative h-full"
                >
                  <div className={`subscription-card ${isPopular ? 'popular' : ''}`}>
                    {isPopular && <div className="popular-badge">最受欢迎</div>}
                    <div className="card-body">
                      <div className="package-header">
                        <h3 className="package-title">{pkg.package_name}</h3>
                        <div className="package-badges">
                          <Chip size="sm" color="default" variant="flat">{pkg.level}</Chip>
                          <Chip size="sm" variant="bordered" startContent={<Timer className="w-3 h-3" />}>
                            {getDurationText(pkg.duration)}
                          </Chip>
                        </div>
                      </div>
                      <div className="divider" />
                      {!isWhiteLabel && (
                      <div className="package-price">
                        {showMonthlyPrice ? (
                          <>
                            <div className="price-main">
                              <span className="price-amount">≈¥{monthlyPrice}</span>
                              <span className="price-unit">/ 月</span>
                            </div>
                            <p className="price-daily">共 ¥{pkg.price} / {getDurationText(pkg.duration)}</p>
                          </>
                        ) : (
                          <div className="price-main">
                            <span className="price-amount">¥{pkg.price}</span>
                            <span className="price-unit">/ {getDurationText(pkg.duration)}</span>
                          </div>
                        )}
                      </div>
                      )}
                      <div className="package-description">
                        <div className="description-box">
                          <p className="description-text">{pkg.introduce || '暂无详细描述'}</p>
                        </div>
                      </div>
                      <div className="subscribe-button">
                        {isWhiteLabel ? (
                          <button
                            className={`hero-button ${isPopular ? 'primary' : 'secondary'}`}
                            disabled={pkg.status !== 1}
                            onClick={() => setRedeemModalOpen(true)}
                          >
                            {pkg.status === 1 ? '使用兑换码激活' : '暂不可用'}
                          </button>
                        ) : (
                          <button
                            className={`hero-button ${isPopular ? 'primary' : 'secondary'}`}
                            disabled={pkg.status !== 1 || (orderLoading && selectedPackage?.id === pkg.id)}
                            onClick={() => createOrder(pkg)}
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
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        </AnimatePresence>
      )}

      {/* 移动端套餐列表 */}
      {!loading && !error && packages.length > 0 && isMobileDevice && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="grid gap-4 grid-cols-1 max-w-2xl mx-auto"
        >
          {allPackages.map((pkg, index) => {
            const monthlyPrice = calculateMonthlyPrice(pkg.price, pkg.duration);
            const showMonthlyPrice = shouldShowMonthlyPrice(pkg.duration);
            return (
              <motion.div
                key={pkg.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05, duration: 0.3 }}
                className="relative"
              >
                <div className="subscription-card">
                  <div className="card-body" style={{ minHeight: 'auto', padding: '20px' }}>
                    <div className="package-header" style={{ marginBottom: '16px' }}>
                      <h3 className="package-title" style={{ fontSize: '18px', marginBottom: '8px' }}>
                        {pkg.package_name}
                      </h3>
                      <div className="package-badges" style={{ gap: '6px' }}>
                        <Chip size="sm" color="default" variant="flat">{pkg.level}</Chip>
                        <Chip size="sm" variant="bordered" startContent={<Timer className="w-3 h-3" />}>
                          {getDurationText(pkg.duration)}
                        </Chip>
                      </div>
                    </div>
                    {!isWhiteLabel && (
                      <div className="package-price" style={{ margin: '16px 0' }}>
                        {showMonthlyPrice ? (
                          <>
                            <div className="price-main">
                              <span className="price-amount" style={{ fontSize: '28px' }}>≈¥{monthlyPrice}</span>
                              <span className="price-unit">/ 月</span>
                            </div>
                            <p className="price-daily">共 ¥{pkg.price} / {getDurationText(pkg.duration)}</p>
                          </>
                        ) : (
                          <div className="price-main">
                            <span className="price-amount" style={{ fontSize: '28px' }}>¥{pkg.price}</span>
                            <span className="price-unit">/ {getDurationText(pkg.duration)}</span>
                          </div>
                        )}
                      </div>
                    )}
                    <div className="package-description" style={{ margin: '12px 0 20px 0' }}>
                      <div className="description-box" style={{ minHeight: '60px', padding: '12px' }}>
                        <p className="description-text" style={{ fontSize: '13px' }}>
                          {pkg.introduce || '暂无详细描述'}
                        </p>
                      </div>
                    </div>
                    <div className="subscribe-button">
                      {isWhiteLabel ? (
                        <button
                          className="hero-button primary"
                          disabled={pkg.status !== 1}
                          onClick={() => setRedeemModalOpen(true)}
                          style={{ height: '40px', fontSize: '14px' }}
                        >
                          {pkg.status === 1 ? '兑换激活码' : '暂不可用'}
                        </button>
                      ) : (
                        <button
                          className="hero-button primary"
                          disabled={pkg.status !== 1 || (orderLoading && selectedPackage?.id === pkg.id)}
                          onClick={() => createOrder(pkg)}
                          style={{ height: '40px', fontSize: '14px' }}
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
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      )}

      {/* 空状态 */}
      {!loading && !error && packages.length === 0 && (
        <div className="text-center py-16">
          <Package className="w-16 h-16 mx-auto mb-4 text-default-300" />
          <h3 className="text-xl font-semibold text-default-600 mb-2">暂无可用套餐</h3>
          <p className="text-default-400">请稍后再试或联系客服</p>
        </div>
      )}

      <PaymentModal
        isOpen={paymentModalOpen}
        selectedPackage={selectedPackage}
        orderInfo={orderInfo}
        onClose={() => {
          setPaymentModalOpen(false);
          setOrderInfo(null);
          setSelectedPackage(null);
        }}
      />

      <CdkRedeemModal
        isOpen={redeemModalOpen}
        onClose={() => {
          setRedeemModalOpen(false);
          setCdkCode('');
        }}
        initialCdk={cdkCode}
      />
    </div>
  );
};
