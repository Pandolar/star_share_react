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
  Spinner,
  Switch,
  Input,
  Chip,
  Tooltip,
} from '@heroui/react';
import { motion } from 'framer-motion';
import { CheckCircle, AlertCircle, QrCode, ExternalLink, ReceiptText, UserRoundCog, TicketPercent } from 'lucide-react';
import { orderUserApi, type InvoiceEligibility } from '../../../../services/userApi';
import { toast } from '../../../../utils/toast';
import { generateQRCodeDataUrl } from './qrCode';
import { getDurationText, PackageInfo, OrderInfo } from './types';
import { useWhiteLabel } from '../../../../contexts/WhiteLabelContext';
import { useNavigate } from 'react-router-dom';

interface PaymentModalProps {
  isOpen: boolean;
  selectedPackage: PackageInfo | null;
  ordinaryOrder: OrderInfo | null;
  invoiceOrder: OrderInfo | null;
  creatingInvoiceOrder: boolean;
  onCreateInvoiceOrder: () => Promise<OrderInfo | null>;
  promotionActionLoading: boolean;
  onApplyPromotionCode: (promotionCode: string) => Promise<OrderInfo | null>;
  onClose: () => void;
}

type PaymentStatus = 'pending' | 'checking' | 'success' | 'failed';
const CHECKOUT_EXPIRY_MS = 5 * 60 * 1000;
const getInvoiceUnavailableText = (reason?: string | null) => ({
  invoice_disabled: '开票功能暂未开放',
  below_threshold: '当前套餐金额未达到开票门槛',
  email_unbound: '请先绑定邮箱后再开票',
  email_not_allowed: '当前邮箱不符合开票要求，请联系客服',
  billing_profile_missing: '请先完善开票主体信息',
  non_self_site: '开票仅在自营站点可用',
}[reason || 'invoice_disabled'] || '当前账户暂不满足开票条件');

const getInvoiceSwitchTooltip = (eligibility: InvoiceEligibility | null) => (
  eligibility?.reason === 'below_threshold'
    ? `当前套餐金额未达到开票门槛。最低开票金额为 ${eligibility.min_package_amount} 元`
    : '请选择是否开票，若未选择开票并完成支付，后续无法补开。'
);

const getInvoiceProfileAction = (reason?: string | null) => {
  if (reason === 'email_unbound') return { label: '去绑定邮箱', openEdit: 'email' };
  if (reason === 'billing_profile_missing') return { label: '去完善开票信息', openEdit: 'billing_profile' };
  return null;
};

const getInvoicePriceLabel = (surchargeRate?: string | number | null) => {
  const points = Number(surchargeRate) * 100;
  if (!Number.isFinite(points)) return '开票价';
  return `开票价(加${Number(points.toFixed(4))}个点)`;
};

export const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  selectedPackage,
  ordinaryOrder,
  invoiceOrder,
  creatingInvoiceOrder,
  onCreateInvoiceOrder,
  promotionActionLoading,
  onApplyPromotionCode,
  onClose,
}) => {
  const { enablePromotionCode } = useWhiteLabel();
  const navigate = useNavigate();
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('pending');
  const [qrCodeExpired, setQrCodeExpired] = useState(false);
  const [manualCheckLoading, setManualCheckLoading] = useState(false);
  const [eligibility, setEligibility] = useState<InvoiceEligibility | null>(null);
  const [eligibilityLoading, setEligibilityLoading] = useState(false);
  const [invoiceSelected, setInvoiceSelected] = useState(false);
  const [invoiceCreationFailed, setInvoiceCreationFailed] = useState(false);
  const [invoiceFeatureAvailable, setInvoiceFeatureAvailable] = useState(false);
  const [promotionPanelOpen, setPromotionPanelOpen] = useState(false);
  const [promotionCodeInput, setPromotionCodeInput] = useState('');

  const checkIntervalRef = useRef<number | undefined>(undefined);
  const qrTimerRef = useRef<number | undefined>(undefined);
  const checkoutIdRef = useRef<string | undefined>(undefined);
  const invoicePanelRef = useRef<HTMLDivElement | null>(null);
  const activeOrder = invoiceSelected && invoiceOrder ? invoiceOrder : ordinaryOrder;
  const checkoutId = ordinaryOrder?.checkout_id;
  const activePromotion = ordinaryOrder?.promotion_snapshot || null;

  const cleanup = () => {
    clearInterval(checkIntervalRef.current);
    clearTimeout(qrTimerRef.current);
    checkIntervalRef.current = undefined;
    qrTimerRef.current = undefined;
  };

  checkoutIdRef.current = checkoutId;

  useEffect(() => {
    if (!isOpen || !checkoutId) return;
    setPaymentStatus('pending');
    setQrCodeExpired(false);
    setInvoiceSelected(false);
    setInvoiceCreationFailed(false);
    setEligibility(null);
    setInvoiceFeatureAvailable(false);
    setPromotionPanelOpen(false);
    setPromotionCodeInput(ordinaryOrder?.promotion_code || '');
    void (async () => {
      if (!selectedPackage) return;
      try {
        const response = await orderUserApi.getInvoiceEligibility(
          selectedPackage.id,
          ordinaryOrder?.promotion_code || undefined,
          checkoutId,
        );
        if (response.code === 20000 && response.data) {
          setEligibility(response.data);
          setInvoiceFeatureAvailable(response.data.reason !== 'invoice_disabled' && response.data.reason !== 'non_self_site');
        }
      } catch {
        setInvoiceFeatureAvailable(false);
      }
    })();

    const expiresAtMs = ordinaryOrder?.expires_at ? new Date(ordinaryOrder.expires_at).getTime() : Number.NaN;
    const remainingMs = Number.isFinite(expiresAtMs)
      ? expiresAtMs - Date.now()
      : Math.max(0, ordinaryOrder?.expires_in_seconds ?? CHECKOUT_EXPIRY_MS / 1000) * 1000;
    if (remainingMs <= 0) {
      setQrCodeExpired(true);
      return cleanup;
    }
    qrTimerRef.current = window.setTimeout(() => {
      setQrCodeExpired(true);
      clearInterval(checkIntervalRef.current);
      checkIntervalRef.current = undefined;
    }, remainingMs);

    checkIntervalRef.current = window.setInterval(async () => {
      const polledCheckoutId = checkoutId;
      try {
        const response = await orderUserApi.getCheckoutStatus(polledCheckoutId);
        if (checkoutIdRef.current !== polledCheckoutId) return;
        if (response.code === 20000 && response.data?.paid) {
          setPaymentStatus('success');
          cleanup();
          setTimeout(() => window.location.reload(), 2000);
        } else if (response.code === 20000 && response.data?.orders?.length && response.data.orders.every((order) => order.status === 'failed')) {
          setQrCodeExpired(true);
          cleanup();
        }
      } catch {
        // Transient failures do not stop checkout polling.
      }
    }, 1500);

    return cleanup;
  }, [isOpen, checkoutId, selectedPackage, ordinaryOrder?.expires_at, ordinaryOrder?.expires_in_seconds, ordinaryOrder?.promotion_code]);

  useEffect(() => {
    if (!invoiceSelected) return;
    const frame = window.requestAnimationFrame(() => {
      invoicePanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [invoiceSelected, eligibilityLoading, eligibility?.reason, invoiceOrder?.order_id]);

  const loadEligibility = async (): Promise<InvoiceEligibility | null> => {
    if (!selectedPackage) return null;
    setEligibilityLoading(true);
    try {
      const response = await orderUserApi.getInvoiceEligibility(
        selectedPackage.id,
        ordinaryOrder?.promotion_code || undefined,
        checkoutId,
      );
      if (response.code === 20000) {
        const nextEligibility = response.data || null;
        setEligibility(nextEligibility);
        setInvoiceFeatureAvailable(Boolean(nextEligibility && nextEligibility.reason !== 'invoice_disabled' && nextEligibility.reason !== 'non_self_site'));
        return nextEligibility;
      }
      toast.warning(response.msg || '无法查询开票资格');
    } catch {
      toast.error('无法查询开票资格，请稍后重试');
    } finally {
      setEligibilityLoading(false);
    }
    return null;
  };

  const goToInvoiceProfile = (openEdit: 'email' | 'billing_profile') => {
    cleanup();
    if (checkoutId && ordinaryOrder?.promotion_snapshot) {
      void orderUserApi.cancelCheckout(checkoutId).catch(() => undefined);
    }
    onClose();
    navigate('/user-center?tab=profile', { state: { openEdit } });
  };

  const handleInvoiceSwitch = async (selected: boolean) => {
    if (!selected) {
      setInvoiceSelected(false);
      setInvoiceCreationFailed(false);
      return;
    }

    setInvoiceSelected(true);
    setInvoiceCreationFailed(false);
    if (invoiceOrder) return;

    const currentEligibility = eligibility || await loadEligibility();
    if (!currentEligibility?.eligible) return;

    const createdOrder = await onCreateInvoiceOrder();
    if (!createdOrder) setInvoiceCreationFailed(true);
  };

  const handleApplyPromotion = async () => {
    const code = promotionCodeInput.trim().toUpperCase();
    if (!code) {
      toast.warning('请输入优惠码');
      return;
    }
    const nextOrder = await onApplyPromotionCode(code);
    if (nextOrder) {
      setPromotionCodeInput(nextOrder.promotion_code || code);
      setPromotionPanelOpen(false);
    }
  };

  const handleRemovePromotion = async () => {
    const nextOrder = await onApplyPromotionCode('');
    if (nextOrder) {
      setPromotionCodeInput('');
      setPromotionPanelOpen(false);
    }
  };

  const handleManualCheck = async () => {
    if (!checkoutId) return;
    setManualCheckLoading(true);
    setPaymentStatus('checking');
    try {
      for (const order of [ordinaryOrder, invoiceOrder]) {
        if (order?.order_id) await orderUserApi.forceGetPayStatus(order.order_id);
      }
      const response = await orderUserApi.getCheckoutStatus(checkoutId);
      if (response.code === 20000 && response.data?.paid) {
        setPaymentStatus('success');
        cleanup();
        setTimeout(() => window.location.reload(), 2000);
      } else if (response.code === 20000 && response.data?.orders?.length && response.data.orders.every((order) => order.status === 'failed')) {
        setPaymentStatus('pending');
        setQrCodeExpired(true);
        cleanup();
        toast.warning('本次结账已过期，请重新下单。');
      } else {
        setPaymentStatus('pending');
        toast.warning('未检测到支付成功，请确认是否已完成付款。');
      }
    } catch {
      setPaymentStatus('pending');
      toast.error('查询失败，请稍后重试或联系客服。');
    } finally {
      setManualCheckLoading(false);
    }
  };

  const closeModal = () => {
    cleanup();
    setPaymentStatus('pending');
    setQrCodeExpired(false);
    setInvoiceSelected(false);
    setInvoiceCreationFailed(false);
    setPromotionPanelOpen(false);
    onClose();
  };

  const handleClose = () => {
    if (checkoutId && activePromotion && paymentStatus === 'pending') {
      void orderUserApi.cancelCheckout(checkoutId).catch(() => undefined);
    }
    closeModal();
  };

  const handleExpiredClose = () => {
    closeModal();
  };

  const qrCodeValue = activeOrder?.qr_code || activeOrder?.payment_url || '';
  const invoiceProfileAction = getInvoiceProfileAction(eligibility?.reason);

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="lg" scrollBehavior="inside" hideCloseButton={paymentStatus === 'success'} classNames={{ base: 'max-h-[92vh] mx-2 sm:mx-0', body: 'py-4 sm:py-6 overflow-y-auto', footer: 'border-t border-divider bg-background sticky bottom-0' }}>
      <ModalContent>
        <ModalHeader className="flex items-start justify-between gap-3 pr-12">
          <div>
            <h2 className="text-xl font-bold">完成支付</h2>
            {selectedPackage && <p className="mt-1 text-sm text-default-500">{selectedPackage.package_name}</p>}
          </div>
          {enablePromotionCode && paymentStatus === 'pending' && !qrCodeExpired && (
            <Button
              size="sm"
              color={activePromotion ? 'success' : 'secondary'}
              variant="flat"
              startContent={<TicketPercent className="h-4 w-4" />}
              onPress={() => setPromotionPanelOpen((current) => !current)}
              aria-label="使用优惠码"
            >
              {activePromotion ? `已优惠 ¥${activePromotion.discount_amount}` : '使用优惠码'}
            </Button>
          )}
        </ModalHeader>
        <ModalBody>
          {promotionPanelOpen && enablePromotionCode && paymentStatus === 'pending' && !qrCodeExpired && (
            <Card shadow="none" className="w-full min-w-0 shrink-0 border border-secondary-200 bg-secondary-50/40">
              <CardBody className="w-full min-w-0 gap-3 p-3">
                <div className="flex items-center gap-2 text-sm font-medium text-secondary-700">
                  <TicketPercent className="h-4 w-4 shrink-0" />
                  使用优惠码
                </div>
                <div className="flex w-full min-w-0 flex-col gap-2 sm:flex-row sm:items-start">
                  <Input
                    size="sm"
                    label="优惠码"
                    placeholder="请输入优惠码"
                    value={promotionCodeInput}
                    onValueChange={(value) => setPromotionCodeInput(value.toUpperCase())}
                    onKeyDown={(event) => event.key === 'Enter' && void handleApplyPromotion()}
                    className="min-w-0 flex-1"
                    description="使用成功后会按优惠价生成新的5分钟支付二维码"
                  />
                  <div className="flex shrink-0 gap-2 sm:pt-1">
                    {activePromotion && (
                      <Button size="sm" variant="light" onPress={handleRemovePromotion} isDisabled={promotionActionLoading}>
                        不使用优惠
                      </Button>
                    )}
                    <Button size="sm" color="secondary" onPress={handleApplyPromotion} isLoading={promotionActionLoading}>
                      使用
                    </Button>
                  </div>
                </div>
              </CardBody>
            </Card>
          )}

          {activeOrder && (
            <div className="space-y-6">
              <Card>
                <CardBody className="space-y-3 p-4">
                  <div className="flex items-center justify-between"><span className="text-default-500">订单号</span><code className="rounded bg-default-100 px-2 py-1 font-mono text-xs">{activeOrder.order_id}</code></div>
                  {activePromotion && (
                    <>
                      <div className="flex items-center justify-between text-sm"><span className="text-default-500">套餐原价</span><span className="text-default-400 line-through">¥{activePromotion.original_amount}</span></div>
                      <div className="flex items-center justify-between text-sm"><span className="flex items-center gap-2 text-default-500">优惠码 <Chip size="sm" color="success" variant="flat">{activePromotion.code}</Chip></span><span className="font-medium text-success">-¥{activePromotion.discount_amount}</span></div>
                    </>
                  )}
                  <div className="flex items-center justify-between"><span className="text-default-500">{activeOrder.invoice_requested ? getInvoicePriceLabel(activeOrder.invoice_snapshot?.surcharge_rate || eligibility?.surcharge_rate) : '支付金额'}</span><span className="text-2xl font-bold text-primary">¥{activeOrder.payable_amount || selectedPackage?.price}</span></div>
                  <div className="flex items-center justify-between"><span className="text-default-500">套餐时长</span><span className="font-medium">{selectedPackage ? getDurationText(selectedPackage.duration) : ''}</span></div>
                </CardBody>
              </Card>

              <div className="text-center">
                {paymentStatus === 'pending' && !qrCodeExpired && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-center gap-2"><QrCode className="h-5 w-5 text-primary" /><span className="text-base font-medium">{activeOrder.pay_type === 'wxpay' ? '请使用微信扫码支付' : '请扫码支付'}</span></div>
                    <p className="text-sm text-default-500">本次结账 5 分钟内有效，请尽快完成支付</p>
                    {qrCodeValue && <div className="flex justify-center"><Card className="relative p-4 shadow-sm sm:p-6"><motion.img key={activeOrder.order_id} src={generateQRCodeDataUrl(qrCodeValue)} alt="支付二维码" className="h-44 w-44 sm:h-52 sm:w-52" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} /></Card></div>}
                    {activeOrder.payment_url && <a href={activeOrder.payment_url} target="_blank" rel="noopener noreferrer"><Button variant="flat" color="primary" endContent={<ExternalLink className="h-4 w-4" />}>打开支付页面</Button></a>}
                  </div>
                )}

                {paymentStatus === 'pending' && !qrCodeExpired && invoiceFeatureAvailable && invoiceSelected && (
                  <div ref={invoicePanelRef} className="mt-5 rounded-lg border border-divider bg-default-50 p-3 text-left">
                    {eligibilityLoading && (
                      <div className="flex items-center gap-2 text-sm text-default-500">
                        <Spinner size="sm" />正在检查开票条件...
                      </div>
                    )}
                    {!eligibilityLoading && !eligibility && (
                      <div className="flex items-start gap-2 text-sm text-warning-700">
                        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                        <span>暂时无法查询开票资格，请关闭开关后重试。</span>
                      </div>
                    )}
                    {!eligibilityLoading && eligibility && !eligibility.eligible && (
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-start gap-2 text-sm text-warning-700">
                          <UserRoundCog className="mt-0.5 h-4 w-4 shrink-0" />
                          <span>{getInvoiceUnavailableText(eligibility.reason)}{invoiceProfileAction ? '，完善后返回即可开票。' : '。'}</span>
                        </div>
                        {invoiceProfileAction && (
                          <Button size="sm" color="warning" variant="flat" onPress={() => goToInvoiceProfile(invoiceProfileAction.openEdit as 'email' | 'billing_profile')}>
                            {invoiceProfileAction.label}
                          </Button>
                        )}
                      </div>
                    )}
                    {!eligibilityLoading && eligibility?.eligible && (
                      <div className="space-y-3">
                        <div className="flex items-start gap-2">
                          <ReceiptText className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                          <div>
                            <p className="text-sm font-medium text-default-700">开票信息</p>
                            <p className="text-xs text-default-500">{getInvoicePriceLabel(eligibility.surcharge_rate)}：¥{eligibility.payable_amount}，预计 {eligibility.delivery_workdays} 个工作日内发送至邮箱</p>
                          </div>
                        </div>
                        {invoiceOrder ? (
                          <div className="space-y-1 rounded-lg bg-primary/5 p-3 text-sm">
                            <p>套餐原价：¥{invoiceOrder.base_amount}</p>
                            {invoiceOrder.promotion_snapshot && <p className="text-success">优惠码 {invoiceOrder.promotion_snapshot.code}：-¥{invoiceOrder.promotion_snapshot.discount_amount}</p>}
                            {invoiceOrder.invoice_snapshot?.base_amount && invoiceOrder.promotion_snapshot && <p>优惠后金额：¥{invoiceOrder.invoice_snapshot.base_amount}</p>}
                            <p className="font-medium text-primary">{getInvoicePriceLabel(invoiceOrder.invoice_snapshot?.surcharge_rate || eligibility.surcharge_rate)}：¥{invoiceOrder.payable_amount}</p>
                            <p>抬头：{invoiceOrder.invoice_snapshot?.title}</p>
                            <p>税号：{invoiceOrder.invoice_snapshot?.tax_number}</p>
                            <p>接收邮箱：{invoiceOrder.invoice_snapshot?.email}</p>
                          </div>
                        ) : invoiceCreationFailed ? (
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex items-start gap-2 text-sm text-warning-700">
                              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                              <span>开票订单生成失败，请重试。</span>
                            </div>
                            <Button size="sm" color="warning" variant="flat" onPress={() => void handleInvoiceSwitch(true)}>重试</Button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-sm text-default-500">
                            <Spinner size="sm" />{creatingInvoiceOrder ? '正在生成开票二维码...' : '正在准备开票二维码...'}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
                {paymentStatus === 'pending' && qrCodeExpired && <div className="space-y-4"><AlertCircle className="mx-auto h-12 w-12 text-danger" /><p className="font-medium text-danger">本次结账已过期，请重新下单</p><Button color="primary" onPress={handleExpiredClose}>重新下单</Button></div>}
                {paymentStatus === 'checking' && <div className="space-y-4"><Spinner size="lg" color="primary" /><p>正在确认支付结果...</p></div>}
                {paymentStatus === 'success' && <div className="space-y-6"><CheckCircle className="mx-auto h-20 w-20 text-success" /><div><h3 className="mb-2 text-2xl font-bold text-success">支付成功！</h3><p className="text-default-500">页面即将刷新，请稍等...</p></div></div>}
                {paymentStatus === 'failed' && <div className="space-y-4"><AlertCircle className="mx-auto h-12 w-12 text-danger" /><p>支付异常，请联系客服处理</p></div>}
              </div>
            </div>
          )}
        </ModalBody>
        <ModalFooter>
          {paymentStatus === 'pending' && !qrCodeExpired && (
            <div className="flex w-full flex-wrap items-center justify-between gap-2">
              {invoiceFeatureAvailable ? (
                <Tooltip
                  content={getInvoiceSwitchTooltip(eligibility)}
                  placement="top-start"
                >
                  <span className="inline-flex">
                    <Switch
                      size="sm"
                      isSelected={invoiceSelected}
                      isDisabled={creatingInvoiceOrder || promotionActionLoading || eligibilityLoading || eligibility?.reason === 'below_threshold'}
                      onValueChange={handleInvoiceSwitch}
                      aria-label="是否开票"
                      classNames={{ label: 'text-xs text-default-500' }}
                    >
                      是否开票
                    </Switch>
                  </span>
                </Tooltip>
              ) : <span />}
              <div className="ml-auto flex items-center gap-2">
                <Button variant="light" onPress={handleClose}>取消支付</Button>
                <Button color="success" onPress={handleManualCheck} isLoading={manualCheckLoading}>我已完成支付</Button>
              </div>
            </div>
          )}
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};
