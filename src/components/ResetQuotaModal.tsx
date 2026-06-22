import React, { useEffect, useRef, useState } from 'react';
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Card,
  CardBody,
  Chip,
  Spinner,
} from '@heroui/react';
import { motion } from 'framer-motion';
import { CheckCircle, AlertCircle, QrCode, ExternalLink, Zap } from 'lucide-react';
import { resetQuotaApi, orderUserApi } from '../services/userApi';
import { toast } from '../utils/toast';
import { generateQRCodeDataUrl } from '../pages/user/tabs/subscription/qrCode';
import { useIsMobile } from '../hooks/useIsMobile';

interface OrderInfo {
  order_id: string;
  payment_url: string | null;
  qr_code: string;
  pay_type: string;
}

interface ResetQuotaModalProps {
  isOpen: boolean;
  price: number;
  onClose: () => void;
  // 支付成功回调（配额已清空）。默认刷新页面。
  onSuccess?: () => void;
}

type PaymentStatus = 'loading' | 'pending' | 'checking' | 'success' | 'failed';

/**
 * 付费重置配额支付弹窗。
 * 打开即创建重置订单，展示二维码并轮询支付状态；支付成功后服务端会清空该用户本周期配额。
 */
export const ResetQuotaModal: React.FC<ResetQuotaModalProps> = ({
  isOpen,
  price,
  onClose,
  onSuccess,
}) => {
  const isMobileDevice = useIsMobile();
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('loading');
  const [orderInfo, setOrderInfo] = useState<OrderInfo | null>(null);
  const [qrCodeExpired, setQrCodeExpired] = useState(false);
  const [manualCheckLoading, setManualCheckLoading] = useState(false);
  const [createError, setCreateError] = useState('');

  const checkIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const qrTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cleanup = () => {
    if (checkIntervalRef.current) {
      clearInterval(checkIntervalRef.current);
      checkIntervalRef.current = null;
    }
    if (qrTimerRef.current) {
      clearTimeout(qrTimerRef.current);
      qrTimerRef.current = null;
    }
  };

  const finishSuccess = () => {
    setPaymentStatus('success');
    cleanup();
    setTimeout(() => {
      if (onSuccess) onSuccess();
      else window.location.reload();
    }, 1800);
  };

  // 打开弹窗时创建订单
  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;

    const create = async () => {
      setPaymentStatus('loading');
      setOrderInfo(null);
      setQrCodeExpired(false);
      setCreateError('');
      try {
        const isAndroid = /android/i.test(navigator.userAgent);
        const requestData = isMobileDevice ? { device: 'mobile' } : {};
        const response = await resetQuotaApi.createOrder(requestData);
        if (cancelled) return;
        if (response.code === 20000 && response.data?.order_id) {
          setOrderInfo(response.data);
          setPaymentStatus('pending');
          if (isAndroid && response.data.payment_url) {
            window.open(response.data.payment_url, '_blank');
          }
        } else {
          setCreateError(response.msg || '创建订单失败');
          setPaymentStatus('failed');
        }
      } catch (err) {
        if (cancelled) return;
        setCreateError(err instanceof Error ? err.message : '网络错误');
        setPaymentStatus('failed');
      }
    };

    create();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // 拿到订单后开始轮询 + 二维码过期计时
  useEffect(() => {
    if (!isOpen || !orderInfo?.order_id) return;

    qrTimerRef.current = setTimeout(() => {
      setQrCodeExpired(true);
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
        checkIntervalRef.current = null;
      }
    }, 5 * 60 * 1000);

    checkIntervalRef.current = setInterval(async () => {
      try {
        const response = await orderUserApi.getPayStatus(orderInfo.order_id);
        const data = response.data as { success?: boolean } | undefined;
        if (data && data.success === true) {
          finishSuccess();
        }
      } catch {
        // 网络异常时继续轮询
      }
    }, 1500);

    return cleanup;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, orderInfo?.order_id]);

  const handleManualCheck = async () => {
    if (!orderInfo?.order_id) return;
    try {
      setManualCheckLoading(true);
      setPaymentStatus('checking');
      const response = await orderUserApi.forceGetPayStatus(orderInfo.order_id);
      const data = response.data as { success?: boolean } | undefined;
      if (data && data.success === true) {
        finishSuccess();
      } else {
        setPaymentStatus('pending');
        toast.warning('未检测到支付成功，请确认是否已完成付款。若已支付但仍无反应，请联系客服处理。');
      }
    } catch {
      setPaymentStatus('pending');
      toast.error('查询失败，请稍后重试或联系客服。');
    } finally {
      setManualCheckLoading(false);
    }
  };

  const handleClose = () => {
    cleanup();
    setPaymentStatus('loading');
    setOrderInfo(null);
    setQrCodeExpired(false);
    setManualCheckLoading(false);
    setCreateError('');
    onClose();
  };

  const qrCodeValue = orderInfo?.qr_code || orderInfo?.payment_url || '';

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      size="lg"
      scrollBehavior="inside"
      hideCloseButton={paymentStatus === 'success'}
      classNames={{
        base: 'max-h-[92vh] mx-2 sm:mx-0',
        body: 'py-4 sm:py-6 overflow-y-auto',
        footer: 'border-t border-divider bg-background sticky bottom-0',
      }}
    >
      <ModalContent>
        <ModalHeader>
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Zap className="w-5 h-5 text-warning" />
              付费重置配额
            </h2>
            <p className="text-sm text-default-500 mt-1">支付成功后立即清空本周期已用配额，恢复可用次数</p>
          </div>
        </ModalHeader>

        <ModalBody>
          <div className="space-y-6">
            {/* 订单摘要 */}
            <Card>
              <CardBody className="p-4">
                <div className="space-y-3">
                  {orderInfo && (
                    <div className="flex justify-between items-center">
                      <span className="text-default-500">订单号</span>
                      <code className="text-xs bg-default-100 px-2 py-1 rounded font-mono">
                        {orderInfo.order_id}
                      </code>
                    </div>
                  )}
                  <div className="flex justify-between items-center">
                    <span className="text-default-500">支付金额</span>
                    <span className="text-2xl font-bold text-primary">¥{price}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-default-500">说明</span>
                    <span className="font-medium text-sm">立即重置当前周期配额</span>
                  </div>
                </div>
              </CardBody>
            </Card>

            {/* 支付区域 */}
            <div className="text-center">
              {paymentStatus === 'loading' && (
                <div className="space-y-4 py-6">
                  <Spinner size="lg" color="primary" />
                  <p className="text-default-600">正在创建订单...</p>
                </div>
              )}

              {paymentStatus === 'pending' && !qrCodeExpired && orderInfo && (
                <div className="space-y-4">
                  <div className="flex items-center justify-center gap-2">
                    <QrCode className="w-5 h-5 text-primary" />
                    <span className="text-base font-medium">
                      {orderInfo.pay_type === 'wxpay' ? '请使用微信扫码支付' : '请扫码支付'}
                    </span>
                  </div>
                  <p className="text-sm text-default-500">二维码 5 分钟内有效，请尽快完成支付</p>

                  {qrCodeValue && (
                    <div className="flex justify-center">
                      <Card className="p-4 sm:p-6 relative shadow-sm">
                        <motion.img
                          src={generateQRCodeDataUrl(qrCodeValue)}
                          alt="支付二维码"
                          className="w-44 h-44 sm:w-52 sm:h-52"
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: 0.2 }}
                        />
                      </Card>
                    </div>
                  )}

                  {orderInfo.payment_url && (
                    <a
                      href={orderInfo.payment_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                    >
                      <ExternalLink size={14} />
                      无法扫码？点击跳转支付页面
                    </a>
                  )}
                </div>
              )}

              {paymentStatus === 'pending' && qrCodeExpired && (
                <div className="space-y-4">
                  <div className="flex justify-center">
                    <Card className="p-4 sm:p-6 relative shadow-sm">
                      {qrCodeValue && (
                        <img
                          src={generateQRCodeDataUrl(qrCodeValue)}
                          alt="支付二维码（已过期）"
                          className="w-44 h-44 sm:w-52 sm:h-52 opacity-20 grayscale"
                        />
                      )}
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Chip color="danger" variant="solid" size="lg" className="shadow-lg">
                          已过期
                        </Chip>
                      </div>
                    </Card>
                  </div>
                  <p className="text-danger font-medium">二维码已过期</p>
                  <Button color="primary" onPress={handleClose}>
                    关闭
                  </Button>
                </div>
              )}

              {paymentStatus === 'checking' && (
                <div className="space-y-4 py-6">
                  <Spinner size="lg" color="primary" />
                  <p className="text-default-600">正在确认支付结果...</p>
                </div>
              )}

              {paymentStatus === 'success' && (
                <div className="space-y-6 py-4">
                  <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', duration: 0.6 }}>
                    <CheckCircle className="w-20 h-20 mx-auto text-success" />
                  </motion.div>
                  <div>
                    <h3 className="text-2xl font-bold text-success mb-2">重置成功！</h3>
                    <p className="text-default-500">配额已清空，页面即将刷新...</p>
                  </div>
                </div>
              )}

              {paymentStatus === 'failed' && (
                <div className="space-y-4 py-6">
                  <AlertCircle className="w-12 h-12 mx-auto text-danger" />
                  <div>
                    <h3 className="text-lg font-semibold text-danger mb-2">下单失败</h3>
                    <p className="text-default-500 text-sm">{createError || '请稍后重试或联系客服'}</p>
                  </div>
                  <Button color="primary" variant="flat" onPress={handleClose}>
                    关闭
                  </Button>
                </div>
              )}
            </div>
          </div>
        </ModalBody>

        <ModalFooter>
          {paymentStatus === 'pending' && !qrCodeExpired && (
            <div className="flex w-full justify-between items-center">
              <Button color="default" variant="light" onPress={handleClose}>
                取消支付
              </Button>
              <Button color="success" onPress={handleManualCheck} isLoading={manualCheckLoading}>
                我已完成支付
              </Button>
            </div>
          )}
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default ResetQuotaModal;
