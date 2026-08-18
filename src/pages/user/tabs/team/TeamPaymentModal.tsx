import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Button, Card, CardBody, Chip, Modal, ModalBody, ModalContent, ModalFooter, ModalHeader, Progress, Spinner, Switch, Tooltip } from '@heroui/react';
import { motion } from 'framer-motion';
import { CheckCircle2, Clock3, ExternalLink, QrCode, ReceiptText, RefreshCw, TriangleAlert, UserRoundCog } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { orderUserApi, teamUserApi, type InvoiceEligibility, type TeamCheckout } from '../../../../services/userApi';
import { celebrateSuccess } from '../../../../utils/confetti';
import { getCheckoutRemainingMs } from '../subscription/checkoutExpiry';
import { generateQRCodeDataUrl } from '../subscription/qrCode';

interface TeamPaymentModalProps {
  isOpen: boolean;
  checkout: TeamCheckout | null;
  onClose: () => void;
  onSuccess: () => void | Promise<void>;
  onExpired: () => void | Promise<void>;
  onCreateInvoiceOrder: () => Promise<TeamCheckout | null>;
}

type PaymentState = 'pending' | 'success' | 'expired' | 'failed';

const ACTION_LABELS: Record<string, string> = {
  initial: '创建团队',
  change: '调整团队订阅',
  renewal: '续费团队',
};

const formatCountdown = (remainingMs: number) => {
  const seconds = Math.max(0, Math.ceil(remainingMs / 1000));
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
};
const INVOICE_REASON: Record<string, string> = {
  invoice_disabled: '开票功能暂未开放',
  below_threshold: '当前团队订单金额未达到开票门槛',
  email_unbound: '请先绑定邮箱后再申请开票',
  email_not_allowed: '当前邮箱不符合开票要求，请联系客服',
  billing_profile_missing: '请先完善开票主体信息',
  non_self_site: '开票仅在自营站点可用',
};

export const TeamPaymentModal: React.FC<TeamPaymentModalProps> = ({
  isOpen,
  checkout,
  onClose,
  onSuccess,
  onExpired,
  onCreateInvoiceOrder,
}) => {
  const navigate = useNavigate();
  const [paymentState, setPaymentState] = useState<PaymentState>('pending');
  const [remainingMs, setRemainingMs] = useState(0);
  const [manualChecking, setManualChecking] = useState(false);
  const [invoiceSelected, setInvoiceSelected] = useState(false);
  const [invoiceEligibility, setInvoiceEligibility] = useState<InvoiceEligibility | null>(null);
  const [invoiceEligibilityLoading, setInvoiceEligibilityLoading] = useState(false);
  const [invoiceCreationFailed, setInvoiceCreationFailed] = useState(false);
  const settledRef = useRef(false);

  const finishSuccess = useCallback(async () => {
    if (settledRef.current) return;
    settledRef.current = true;
    setPaymentState('success');
    celebrateSuccess();
    await onSuccess();
  }, [onSuccess]);

  const finishExpired = useCallback(async () => {
    if (settledRef.current) return;
    settledRef.current = true;
    setPaymentState('expired');
    await onExpired();
  }, [onExpired]);

  const checkStatus = useCallback(async () => {
    if (!checkout?.checkout_id || settledRef.current) return;
    try {
      const response = await orderUserApi.getCheckoutStatus(checkout.checkout_id);
      if (response.code !== 20000 || !response.data) return;
      if (response.data.paid) {
        await finishSuccess();
        return;
      }
      const order = response.data.orders.find((item) => item.order_id === checkout.order_id);
      if (order?.status === 'failed' || response.data.expires_in_seconds === 0) {
        await finishExpired();
      }
    } catch {
      // A transient polling failure must not replace the recoverable payment state.
    }
  }, [checkout, finishExpired, finishSuccess]);

  useEffect(() => {
    if (!isOpen || !checkout) return;
    settledRef.current = false;
    setPaymentState('pending');
    setManualChecking(false);
    const initialRemaining = getCheckoutRemainingMs(checkout);
    const deadline = Date.now() + initialRemaining;
    setRemainingMs(initialRemaining);

    const countdown = window.setInterval(() => {
      const next = Math.max(0, deadline - Date.now());
      setRemainingMs(next);
      if (next === 0) void finishExpired();
    }, 1000);
    return () => window.clearInterval(countdown);
  }, [checkout, finishExpired, isOpen]);

  useEffect(() => {
    if (!isOpen || !checkout) return;
    setInvoiceSelected(Boolean(checkout.invoice_requested));
    setInvoiceCreationFailed(false);
    setInvoiceEligibility(null);
    setInvoiceEligibilityLoading(true);
    let cancelled = false;
    void teamUserApi.getInvoiceEligibility(checkout.package_id, checkout.seat_count)
      .then((response) => {
        if (!cancelled) setInvoiceEligibility(response.code === 20000 ? response.data || null : null);
      })
      .catch(() => {
        if (!cancelled) setInvoiceEligibility(null);
      })
      .finally(() => {
        if (!cancelled) setInvoiceEligibilityLoading(false);
      });
    return () => { cancelled = true; };
  }, [checkout, isOpen]);

  useEffect(() => {
    if (!isOpen || !checkout?.checkout_id || paymentState !== 'pending') return;
    void checkStatus();
    const polling = window.setInterval(() => void checkStatus(), 1800);
    return () => window.clearInterval(polling);
  }, [checkStatus, checkout?.checkout_id, isOpen, paymentState]);

  const handleInvoiceSwitch = async (selected: boolean) => {
    if (!selected) {
      setInvoiceSelected(false);
      return;
    }
    setInvoiceSelected(true);
    if (checkout?.invoice_requested || !invoiceEligibility?.eligible) return;
    setInvoiceCreationFailed(false);
    const created = await onCreateInvoiceOrder();
    if (!created) setInvoiceCreationFailed(true);
  };

  const goToInvoiceProfile = (openEdit: 'email' | 'billing_profile') => {
    onClose();
    navigate('/user-center?tab=profile', { state: { openEdit } });
  };

  const handleManualCheck = async () => {
    if (!checkout) return;
    setManualChecking(true);
    try {
      await orderUserApi.forceGetPayStatus(checkout.order_id);
      await checkStatus();
    } catch {
      setPaymentState('failed');
    } finally {
      setManualChecking(false);
    }
  };

  const qrCodeValue = checkout?.qr_code || checkout?.payment_url || '';
  const actionLabel = ACTION_LABELS[checkout?.action || 'initial'];
  const totalMinutes = 5 * 60 * 1000;
  const progressValue = Math.max(0, Math.min(100, (remainingMs / totalMinutes) * 100));
  const invoicePoints = Number(checkout?.invoice_snapshot?.surcharge_rate || invoiceEligibility?.surcharge_rate || 0) * 100;
  const paymentReady = !invoiceSelected || Boolean(checkout?.invoice_requested);
  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg" placement="center" scrollBehavior="inside">
      <ModalContent>
        <ModalHeader className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success-50 text-success-600">
            <QrCode className="h-5 w-5" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2 text-lg font-semibold">团队订阅付款{checkout?.invoice_requested && <Chip size="sm" color="primary" variant="flat">开票订单</Chip>}</div>
            <div className="text-xs font-normal text-default-500">{actionLabel}</div>
          </div>
        </ModalHeader>
        <ModalBody className="pb-5">
          {paymentState === 'success' ? (
            <motion.div
              className="flex min-h-[320px] flex-col items-center justify-center gap-4 text-center"
              initial={{ opacity: 0, scale: 0.94 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              <CheckCircle2 className="h-20 w-20 text-success" />
              <div>
                <h3 className="text-2xl font-bold text-success">支付成功</h3>
                <p className="mt-2 text-sm text-default-500">团队订阅状态已更新</p>
              </div>
            </motion.div>
          ) : paymentState === 'expired' ? (
            <div className="flex min-h-[280px] flex-col items-center justify-center gap-4 text-center">
              <TriangleAlert className="h-14 w-14 text-warning" />
              <div>
                <h3 className="text-xl font-semibold">支付订单已失效</h3>
                <p className="mt-2 text-sm text-default-500">关闭后可重新生成新的 5 分钟支付订单</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <Card shadow="none" className="border border-default-200 bg-default-50">
                <CardBody className="grid gap-3 p-4 sm:grid-cols-3">
                  <div>
                    <p className="text-xs text-default-500">团队套餐</p>
                    <p className="mt-1 font-semibold">{checkout?.package_name || `套餐 #${checkout?.package_id}`}</p>
                  </div>
                  <div>
                    <p className="text-xs text-default-500">席位数量</p>
                    <p className="mt-1 font-semibold">{checkout?.seat_count} 席</p>
                  </div>
                  <div>
                    <p className="text-xs text-default-500">{checkout?.invoice_requested ? `开票价（加 ${Number(invoicePoints.toFixed(4))} 个点）` : '应付金额'}</p>
                    <p className="mt-1 font-semibold text-danger">¥{checkout?.payable_amount || '--'}</p>
                  </div>
                </CardBody>
              </Card>
              {checkout?.invoice_requested && checkout.invoice_snapshot && (
                <Card shadow="none" className="border border-primary-200 bg-primary-50/30">
                  <CardBody className="gap-2 p-4 text-sm">
                    <div className="flex items-center gap-2 font-medium text-primary"><ReceiptText className="h-4 w-4" />开票信息</div>
                    <div className="grid gap-2 sm:grid-cols-2">
                      <p>团队折后金额：¥{checkout.invoice_snapshot.base_amount}</p>
                      <p>开票加点：¥{checkout.invoice_snapshot.surcharge_amount}</p>
                      <p>发票抬头：{checkout.invoice_snapshot.title}</p>
                      <p>税号：{checkout.invoice_snapshot.tax_number}</p>
                      <p className="sm:col-span-2">接收邮箱：{checkout.invoice_snapshot.email} · 预计支付后 {checkout.invoice_snapshot.delivery_workdays} 个工作日发送</p>
                    </div>
                  </CardBody>
                </Card>
              )}
              {invoiceSelected && !checkout?.invoice_requested && (
                <div className="space-y-3 rounded-lg border border-primary-200 bg-primary-50/30 p-4 text-sm">
                  {invoiceEligibilityLoading ? (
                    <div className="flex items-center gap-2 text-default-500"><Spinner size="sm" />正在检查开票主体信息...</div>
                  ) : invoiceEligibility?.eligible ? (
                    <div className="flex items-start gap-2 text-primary-700"><ReceiptText className="mt-0.5 h-4 w-4 shrink-0" /><span>已确认开票主体：{invoiceEligibility.billing_profile?.title}，税号 {invoiceEligibility.billing_profile?.tax_number}，支付后按 {invoiceEligibility.delivery_workdays} 个工作日发送。</span></div>
                  ) : invoiceEligibility ? (
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-start gap-2 text-warning-700"><UserRoundCog className="mt-0.5 h-4 w-4 shrink-0" /><span>{INVOICE_REASON[invoiceEligibility.reason || ''] || '当前订单无法开票'}</span></div>
                      {invoiceEligibility.reason === 'email_unbound' && <Button size="sm" color="warning" variant="flat" onPress={() => goToInvoiceProfile('email')}>去绑定邮箱</Button>}
                      {invoiceEligibility.reason === 'billing_profile_missing' && <Button size="sm" color="warning" variant="flat" onPress={() => goToInvoiceProfile('billing_profile')}>去完善开票信息</Button>}
                    </div>
                  ) : invoiceCreationFailed ? <p className="text-danger">开票订单生成失败，请关闭后重试。</p> : <p className="text-danger">开票资格查询失败，请稍后重试。</p>}
                </div>
              )}


              {paymentReady && (
                <div className="flex flex-col items-center gap-3 py-1">
                  {qrCodeValue ? (
                    <Card className="p-4 shadow-sm">
                      <motion.img
                        key={checkout?.order_id}
                        src={generateQRCodeDataUrl(qrCodeValue)}
                        alt="团队订阅支付二维码"
                        className="h-48 w-48 sm:h-52 sm:w-52"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                      />
                    </Card>
                  ) : (
                    <div className="flex h-52 w-52 items-center justify-center rounded-lg border border-dashed border-default-300 text-center text-sm text-default-500">支付链接暂不可用<br />请关闭后重新生成</div>
                  )}
                  <div className="flex items-center gap-2">
                    <Clock3 className="h-4 w-4 text-warning-600" />
                    <span className="text-sm text-default-600">请在 {formatCountdown(remainingMs)} 内完成支付</span>
                    {paymentState === 'failed' && <Chip size="sm" color="warning" variant="flat">查询失败，可重试</Chip>}
                  </div>
                  <Progress aria-label="支付订单剩余时间" value={progressValue} color={progressValue < 20 ? 'warning' : 'primary'} size="sm" className="max-w-sm" />
                  {checkout?.payment_url && <Button as="a" href={checkout.payment_url} target="_blank" rel="noopener noreferrer" variant="flat" color="primary" endContent={<ExternalLink className="h-4 w-4" />}>打开支付页面</Button>}
                </div>
              )}
            </div>
          )}
        </ModalBody>
        <ModalFooter>
          {paymentState === 'pending' && (
            <Tooltip content="未选择开票并完成支付后，无法补开" placement="top-start">
              <span className="inline-flex">
                <Switch
                  size="sm"
                  isSelected={invoiceSelected}
                  isDisabled={invoiceEligibilityLoading || Boolean(checkout?.invoice_requested)}
                  onValueChange={(selected) => void handleInvoiceSwitch(selected)}
                  aria-label="是否开票"
                >
                  是否开票
                </Switch>
              </span>
            </Tooltip>
          )}
          <div className="ml-auto flex items-center gap-2">
            <Button variant="light" onPress={onClose}>{paymentState === 'success' ? '完成' : '稍后支付'}</Button>
            {(paymentState === 'pending' || paymentState === 'failed') && (
              <Button color="success" onPress={handleManualCheck} isLoading={manualChecking} isDisabled={!paymentReady} startContent={!manualChecking && <RefreshCw className="h-4 w-4" />}>我已完成支付</Button>
            )}
          </div>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};
