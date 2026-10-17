import React, { useCallback, useEffect, useRef, useState } from 'react';
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
import { CheckCircle, AlertCircle, ExternalLink, Zap } from 'lucide-react';
import { resetQuotaApi, orderUserApi, type PaymentMethod } from '../services/userApi';
import { PaymentMethodSelector, paymentMethodLabel } from './PaymentMethodSelector';
import { toast } from '../utils/toast';
import { generateQRCodeDataUrl } from '../pages/user/tabs/subscription/qrCode';
import { getCheckoutRemainingMs } from '../pages/user/tabs/subscription/checkoutExpiry';
import { useIsMobile } from '../hooks/useIsMobile';
import { UserAgreementConsent, useUserAgreementRequirement } from './UserAgreementConsent';
import { useWhiteLabel } from '../contexts/WhiteLabelContext';

interface OrderInfo {
  order_id: string;
  checkout_id: string;
  payment_url: string | null;
  qr_code: string;
  pay_type: PaymentMethod;
  payable_amount?: string | number | null;
  expires_at?: string | null;
  expires_in_seconds?: number;
}

interface ResetQuotaModalProps {
  isOpen: boolean;
  price: number;
  onClose: () => void;
  // 支付成功回调（配额已清空）。默认刷新页面。
  onSuccess?: () => void;
}

type PaymentStatus = 'confirming' | 'loading' | 'pending' | 'checking' | 'success' | 'failed';

/**
 * 付费重置配额支付弹窗。
 * 先确认金额与用户协议，再创建订单并轮询支付状态。
 */
export const ResetQuotaModal: React.FC<ResetQuotaModalProps> = ({
  isOpen,
  price,
  onClose,
  onSuccess,
}) => {
  const isMobileDevice = useIsMobile();
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('confirming');
  const [orderInfo, setOrderInfo] = useState<OrderInfo | null>(null);
  const [qrCodeExpired, setQrCodeExpired] = useState(false);
  const [manualCheckLoading, setManualCheckLoading] = useState(false);
  const [createError, setCreateError] = useState('');
  const [agreementAccepted, setAgreementAccepted] = useState(true);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('wxpay');
  const [isSwitching, setIsSwitching] = useState(false);
  const { isRequired: isAgreementRequired } = useUserAgreementRequirement();
  const { payment_methods: paymentMethods } = useWhiteLabel();

  const checkIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const qrTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestRef = useRef(0);
  const settledRef = useRef(false);
  const activeCheckoutRef = useRef<string | null>(null);
  const deadlineRef = useRef(0);
  const onSuccessRef = useRef(onSuccess);
  onSuccessRef.current = onSuccess;
  const methodsRef = useRef(paymentMethods);
  methodsRef.current = paymentMethods;

  const cleanup = useCallback(() => {
    if (checkIntervalRef.current) {
      clearInterval(checkIntervalRef.current);
      checkIntervalRef.current = null;
    }
    if (qrTimerRef.current) {
      clearTimeout(qrTimerRef.current);
      qrTimerRef.current = null;
    }
  }, []);

  const finishSuccess = useCallback(() => {
    if (settledRef.current) return;
    settledRef.current = true;
    requestRef.current += 1;
    setPaymentStatus('success');
    cleanup();
    setTimeout(() => {
      if (onSuccessRef.current) onSuccessRef.current();
      else window.location.reload();
    }, 1800);
  }, [cleanup]);

  useEffect(() => {
    if (!isOpen) {
      requestRef.current += 1;
      activeCheckoutRef.current = null;
      settledRef.current = true;
      cleanup();
      return;
    }
    requestRef.current += 1;
    settledRef.current = false;
    activeCheckoutRef.current = null;
    setPaymentStatus('confirming');
    setOrderInfo(null);
    setPaymentMethod(methodsRef.current[0] || 'wxpay');
    setQrCodeExpired(false);
    setCreateError('');
    setAgreementAccepted(true);
  }, [isOpen, cleanup]);

  useEffect(() => {
    if (paymentStatus === 'confirming' && !paymentMethods.includes(paymentMethod)) setPaymentMethod(paymentMethods[0] || 'wxpay');
  }, [paymentMethods, paymentMethod, paymentStatus]);

  const createResetOrder = async () => {
    if (!paymentMethods[0]) {
      toast.warning('当前暂未开放在线支付');
      return;
    }
    if (isAgreementRequired && !agreementAccepted) {
      toast.warning('请先勾选同意《用户协议》');
      return;
    }
    const requestId = ++requestRef.current;
    setPaymentStatus('loading');
    setOrderInfo(null);
    setQrCodeExpired(false);
    setCreateError('');
    try {
      const isAndroid = /android/i.test(navigator.userAgent);
      const response = await resetQuotaApi.createOrder({ device: isMobileDevice ? 'mobile' : 'pc', payment_method: paymentMethod });
      if (requestRef.current !== requestId || !isOpen || settledRef.current) return;
      if (response.code === 20000 && response.data?.order_id && response.data.checkout_id) {
        activeCheckoutRef.current = response.data.checkout_id;
        deadlineRef.current = Date.now() + getCheckoutRemainingMs(response.data);
        setPaymentMethod(response.data.pay_type);
        setOrderInfo(response.data);
        setPaymentStatus('pending');
        if (isAndroid && response.data.payment_url) window.open(response.data.payment_url, '_blank');
      } else {
        setCreateError(response.msg || '创建订单失败');
        setPaymentStatus('failed');
      }
    } catch (requestError) {
      if (requestRef.current !== requestId || !isOpen || settledRef.current) return;
      setCreateError(requestError instanceof Error ? requestError.message : '网络错误');
      setPaymentStatus('failed');
    }
  };
  const handlePaymentMethodChange = async (method: PaymentMethod) => {
    if (!orderInfo?.checkout_id || method === paymentMethod || isSwitching || settledRef.current) return;
    const checkoutId = orderInfo.checkout_id;
    const requestId = ++requestRef.current;
    setIsSwitching(true);
    try {
      const response = await orderUserApi.getCheckoutPayment(checkoutId, method, false, isMobileDevice ? 'mobile' : 'pc');
      if (requestRef.current !== requestId || activeCheckoutRef.current !== checkoutId || settledRef.current || !isOpen) return;
      if (response.code === 20000 && response.data) {
        setPaymentMethod(response.data.pay_type);
        setOrderInfo({ ...orderInfo, ...response.data, qr_code: response.data.qr_code || '' });
      } else toast.error(response.msg || '切换支付方式失败');
    } catch { if (requestRef.current === requestId && isOpen) toast.error('切换支付方式失败，请稍后重试'); }
    finally { if (requestRef.current === requestId) setIsSwitching(false); }
  };

  // 拿到订单后开始轮询 + 二维码过期计时
  useEffect(() => {
    if (!isOpen || !orderInfo?.checkout_id) return;
    const checkoutId = orderInfo.checkout_id;
    activeCheckoutRef.current = checkoutId;
    qrTimerRef.current = setTimeout(() => {
      setQrCodeExpired(true);
      cleanup();
    }, Math.max(0, deadlineRef.current - Date.now()));
    checkIntervalRef.current = setInterval(async () => {
      if (settledRef.current || activeCheckoutRef.current !== checkoutId) return;
      try {
        const response = await orderUserApi.getCheckoutStatus(checkoutId);
        if (settledRef.current || activeCheckoutRef.current !== checkoutId) return;
        if (response.data?.paid) finishSuccess();
        else if (response.data?.expires_in_seconds === 0 || (response.data?.orders.length && response.data.orders.every((item) => item.status === 'failed'))) setQrCodeExpired(true);
      } catch { /* 网络异常时继续轮询 */ }
    }, 1500);
    return cleanup;
  }, [isOpen, orderInfo?.checkout_id, finishSuccess, cleanup]);

  const handleManualCheck = async () => {
    if (!orderInfo?.checkout_id || isSwitching) return;
    const requestId = requestRef.current;
    const checkoutId = orderInfo.checkout_id;
    try {
      setManualCheckLoading(true);
      setPaymentStatus('checking');
      const status = await orderUserApi.getCheckoutStatus(checkoutId);
      if (requestRef.current !== requestId || activeCheckoutRef.current !== checkoutId || settledRef.current || !isOpen) return;
      const pendingIds = status.data?.orders.filter((item) => item.status === 'pending').map((item) => item.order_id) || [];
      await Promise.all(pendingIds.map((id) => orderUserApi.forceGetPayStatus(id)));
      const refreshed = await orderUserApi.getCheckoutStatus(checkoutId);
      if (requestRef.current !== requestId || activeCheckoutRef.current !== checkoutId || settledRef.current || !isOpen) return;
      if (refreshed.data?.paid) finishSuccess();
      else { setPaymentStatus('pending'); toast.warning('未检测到支付成功，请确认是否已完成付款。若已支付但仍无反应，请联系客服处理。'); }
    } catch {
      if (requestRef.current === requestId && isOpen) { setPaymentStatus('pending'); toast.error('查询失败，请稍后重试或联系客服。'); }
    } finally {
      if (requestRef.current === requestId && isOpen) setManualCheckLoading(false);
    }
  };

  const handleClose = () => {
    requestRef.current += 1;
    activeCheckoutRef.current = null;
    settledRef.current = true;
    cleanup();
    setPaymentStatus('loading');
    setOrderInfo(null);
    setIsSwitching(false);
    setQrCodeExpired(false);
    setManualCheckLoading(false);
    setCreateError('');
    onClose();
  };

  const qrCodeValue = orderInfo?.qr_code || orderInfo?.payment_url || '';
  const activeMethodEnabled = Boolean(orderInfo && paymentMethods.includes(orderInfo.pay_type));

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
                    <span className="text-2xl font-bold text-primary">¥{orderInfo?.payable_amount ?? price}</span>
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
              {paymentStatus === 'confirming' && (
                <div className="mx-auto max-w-sm space-y-3 py-4 text-left">
                  <p className="text-sm leading-6 text-default-500">确认金额后继续，下一步将生成 5 分钟有效的支付二维码。</p>
                  <PaymentMethodSelector methods={paymentMethods} value={paymentMethod} onChange={setPaymentMethod} />
                  <UserAgreementConsent isSelected={agreementAccepted} onValueChange={setAgreementAccepted} />
                </div>
              )}
              {paymentStatus === 'loading' && (
                <div className="space-y-4 py-6">
                  <Spinner size="lg" color="primary" />
                  <p className="text-default-600">正在创建订单...</p>
                </div>
              )}

              {paymentStatus === 'pending' && !qrCodeExpired && orderInfo && (
                <div className="space-y-4">
                  <PaymentMethodSelector methods={paymentMethods} value={paymentMethod} onChange={handlePaymentMethodChange} isDisabled={isSwitching || manualCheckLoading} isLoading={isSwitching} />
                  {!activeMethodEnabled && <p className="rounded-lg bg-warning-50 px-4 py-3 text-sm text-warning-700">当前支付方式已关闭，请选择其他可用方式。</p>}
                  {!isSwitching && activeMethodEnabled && <>
                    <p className="text-sm text-default-500">二维码 5 分钟内有效，请尽快完成支付。</p>
                    {qrCodeValue && (
                      <div className="flex justify-center">
                        <Card className="p-4 sm:p-6 relative shadow-sm">
                          <motion.img src={generateQRCodeDataUrl(qrCodeValue)} alt="支付二维码" className="w-44 h-44 sm:w-52 sm:h-52" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 }} />
                        </Card>
                      </div>
                    )}
                    {orderInfo.payment_url && (
                      <a href={orderInfo.payment_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
                        <ExternalLink size={14} />
                        无法扫码？点击跳转{paymentMethodLabel(orderInfo.pay_type)}支付页面
                      </a>
                    )}
                  </>}
                </div>
              )}

              {paymentStatus === 'pending' && qrCodeExpired && activeMethodEnabled && (
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
          {paymentStatus === 'confirming' && (
            <div className="flex w-full items-center justify-end gap-2">
              <Button variant="light" onPress={handleClose}>取消</Button>
              <Button color="warning" isDisabled={isAgreementRequired && !agreementAccepted} onPress={() => void createResetOrder()}>继续支付</Button>
            </div>
          )}
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
