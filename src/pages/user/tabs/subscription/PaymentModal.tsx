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
  Switch,
} from '@heroui/react';
import { motion } from 'framer-motion';
import { CheckCircle, AlertCircle, QrCode, ExternalLink, ReceiptText } from 'lucide-react';
import { orderUserApi, type InvoiceEligibility } from '../../../../services/userApi';
import { toast } from '../../../../utils/toast';
import { generateQRCodeDataUrl } from './qrCode';
import { getDurationText, PackageInfo, OrderInfo } from './types';

interface PaymentModalProps {
  isOpen: boolean;
  selectedPackage: PackageInfo | null;
  ordinaryOrder: OrderInfo | null;
  invoiceOrder: OrderInfo | null;
  creatingInvoiceOrder: boolean;
  onCreateInvoiceOrder: () => Promise<OrderInfo | null>;
  onClose: () => void;
}

type PaymentStatus = 'pending' | 'checking' | 'success' | 'failed';
const CHECKOUT_EXPIRY_MS = 60 * 60 * 1000;
const getInvoiceUnavailableText = (reason?: string | null) => ({
  invoice_disabled: '开票功能暂未开放',
  below_threshold: '当前套餐金额未达到开票门槛',
  email_unbound: '请先绑定邮箱后再开票',
  email_not_allowed: '当前邮箱不符合开票要求，请联系客服',
  billing_profile_missing: '请先完善开票主体信息',
  non_self_site: '开票仅在自营站点可用',
}[reason || 'invoice_disabled'] || '当前账户暂不满足开票条件');

export const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  selectedPackage,
  ordinaryOrder,
  invoiceOrder,
  creatingInvoiceOrder,
  onCreateInvoiceOrder,
  onClose,
}) => {
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('pending');
  const [qrCodeExpired, setQrCodeExpired] = useState(false);
  const [manualCheckLoading, setManualCheckLoading] = useState(false);
  const [eligibility, setEligibility] = useState<InvoiceEligibility | null>(null);
  const [eligibilityLoading, setEligibilityLoading] = useState(false);
  const [invoiceSelected, setInvoiceSelected] = useState(false);
  const [invoiceConfirmed, setInvoiceConfirmed] = useState(false);

  const checkIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const qrTimerRef = useRef<NodeJS.Timeout | null>(null);
  const activeOrder = invoiceSelected && invoiceOrder ? invoiceOrder : ordinaryOrder;
  const checkoutId = ordinaryOrder?.checkout_id;

  const cleanup = () => {
    if (checkIntervalRef.current) clearInterval(checkIntervalRef.current);
    if (qrTimerRef.current) clearTimeout(qrTimerRef.current);
    checkIntervalRef.current = null;
    qrTimerRef.current = null;
  };

  useEffect(() => {
    if (!isOpen || !checkoutId) return;
    setPaymentStatus('pending');
    setQrCodeExpired(false);
    setInvoiceSelected(false);
    setInvoiceConfirmed(false);
    setEligibility(null);

    qrTimerRef.current = setTimeout(() => {
      setQrCodeExpired(true);
      if (checkIntervalRef.current) clearInterval(checkIntervalRef.current);
      checkIntervalRef.current = null;
    }, CHECKOUT_EXPIRY_MS);

    checkIntervalRef.current = setInterval(async () => {
      try {
        const response = await orderUserApi.getCheckoutStatus(checkoutId);
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
  }, [isOpen, checkoutId]);

  const loadEligibility = async () => {
    if (!selectedPackage) return;
    setEligibilityLoading(true);
    try {
      const response = await orderUserApi.getInvoiceEligibility(selectedPackage.id);
      if (response.code === 20000) {
        setEligibility(response.data || null);
      } else {
        toast.warning(response.msg || '无法查询开票资格');
      }
    } catch {
      toast.error('无法查询开票资格，请稍后重试');
    } finally {
      setEligibilityLoading(false);
    }
  };

  const handleInvoiceSwitch = async (selected: boolean) => {
    setInvoiceSelected(selected);
    if (!selected || invoiceOrder) return;
    setInvoiceConfirmed(false);
    if (!eligibility) await loadEligibility();
  };

  const confirmInvoice = async () => {
    if (!eligibility?.eligible) {
      toast.warning(getInvoiceUnavailableText(eligibility?.reason));
      return;
    }
    const createdOrder = await onCreateInvoiceOrder();
    if (createdOrder) setInvoiceConfirmed(true);
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

  const handleClose = () => {
    cleanup();
    setPaymentStatus('pending');
    setQrCodeExpired(false);
    setInvoiceSelected(false);
    setInvoiceConfirmed(false);
    onClose();
  };

  const qrCodeValue = activeOrder?.qr_code || activeOrder?.payment_url || '';

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="lg" scrollBehavior="inside" hideCloseButton={paymentStatus === 'success'} classNames={{ base: 'max-h-[92vh] mx-2 sm:mx-0', body: 'py-4 sm:py-6 overflow-y-auto', footer: 'border-t border-divider bg-background sticky bottom-0' }}>
      <ModalContent>
        <ModalHeader><div><h2 className="text-xl font-bold">完成支付</h2>{selectedPackage && <p className="text-sm text-default-500 mt-1">{selectedPackage.package_name}</p>}</div></ModalHeader>
        <ModalBody>
          {activeOrder && (
            <div className="space-y-6">
              <Card><CardBody className="p-4 space-y-3">
                <div className="flex justify-between items-center"><span className="text-default-500">支付方式</span><Chip size="sm" color={activeOrder.invoice_requested ? 'primary' : 'default'} variant="flat">{activeOrder.invoice_requested ? '开票订单' : '普通订单'}</Chip></div>
                <div className="flex justify-between items-center"><span className="text-default-500">订单号</span><code className="text-xs bg-default-100 px-2 py-1 rounded font-mono">{activeOrder.order_id}</code></div>
                <div className="flex justify-between items-center"><span className="text-default-500">支付金额</span><span className="text-2xl font-bold text-primary">¥{activeOrder.payable_amount || selectedPackage?.price}</span></div>
                <div className="flex justify-between items-center"><span className="text-default-500">套餐时长</span><span className="font-medium">{selectedPackage ? getDurationText(selectedPackage.duration) : ''}</span></div>
              </CardBody></Card>

              {paymentStatus === 'pending' && !qrCodeExpired && (
                <Card className="border border-primary/20"><CardBody className="p-4 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2"><ReceiptText className="w-5 h-5 text-primary" /><div><p className="font-medium">需要开票</p><p className="text-xs text-default-500">确认后生成开票二维码，可随时切回普通二维码。</p></div></div>
                    <Switch isSelected={invoiceSelected} isDisabled={creatingInvoiceOrder || eligibilityLoading} onValueChange={handleInvoiceSwitch} aria-label="需要开票" />
                  </div>
                  {invoiceSelected && invoiceOrder ? (
                    <div className="rounded-lg bg-primary/5 p-3 text-sm space-y-1"><p>套餐原价：¥{invoiceOrder.base_amount}</p><p>开票服务费：¥{invoiceOrder.invoice_snapshot?.surcharge_amount}</p><p>最终支付：¥{invoiceOrder.payable_amount}</p><p>抬头：{invoiceOrder.invoice_snapshot?.title}</p><p>税号：{invoiceOrder.invoice_snapshot?.tax_number}</p><p>接收邮箱：{invoiceOrder.invoice_snapshot?.email}</p></div>
                  ) : invoiceSelected && eligibilityLoading ? <Spinner size="sm" /> : invoiceSelected && eligibility ? (
                    <div className="rounded-lg bg-primary/5 p-3 text-sm space-y-2">
                      <p>套餐原价：¥{eligibility.base_amount}</p><p>开票服务费：¥{eligibility.surcharge_amount}</p><p>最终支付：¥{eligibility.payable_amount}</p><p>抬头：{eligibility.billing_profile?.title || '-'}</p><p>税号：{eligibility.billing_profile?.tax_number || '-'}</p><p>接收邮箱：{eligibility.email || '-'}</p>
                      {!eligibility.eligible && <p className="text-warning-700">{getInvoiceUnavailableText(eligibility.reason)}</p>}
                      {eligibility.eligible && <Button color="primary" size="sm" onPress={confirmInvoice} isLoading={creatingInvoiceOrder}>确认并生成开票二维码</Button>}
                    </div>
                  ) : null}
                  {invoiceConfirmed && <p className="text-xs text-success">开票二维码已生成。</p>}
                </CardBody></Card>
              )}

              <div className="text-center">
                {paymentStatus === 'pending' && !qrCodeExpired && <div className="space-y-4"><div className="flex items-center justify-center gap-2"><QrCode className="w-5 h-5 text-primary" /><span className="text-base font-medium">{activeOrder.pay_type === 'wxpay' ? '请使用微信扫码支付' : '请扫码支付'}</span></div><p className="text-sm text-default-500">本次结账 60 分钟内有效，请尽快完成支付</p>{qrCodeValue && <div className="flex justify-center"><Card className="p-4 sm:p-6 relative shadow-sm"><motion.img key={activeOrder.order_id} src={generateQRCodeDataUrl(qrCodeValue)} alt="支付二维码" className="w-44 h-44 sm:w-52 sm:h-52" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} /></Card></div>}{activeOrder.payment_url && <a href={activeOrder.payment_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm text-primary hover:underline"><ExternalLink size={14} />无法扫码？点击跳转支付页面</a>}</div>}
                {paymentStatus === 'pending' && qrCodeExpired && <div className="space-y-4"><AlertCircle className="w-12 h-12 mx-auto text-danger" /><p className="text-danger font-medium">本次结账已过期，请重新下单</p><Button color="primary" onPress={handleClose}>重新下单</Button></div>}
                {paymentStatus === 'checking' && <div className="space-y-4"><Spinner size="lg" color="primary" /><p>正在确认支付结果...</p></div>}
                {paymentStatus === 'success' && <div className="space-y-6"><CheckCircle className="w-20 h-20 mx-auto text-success" /><div><h3 className="text-2xl font-bold text-success mb-2">支付成功！</h3><p className="text-default-500">页面即将刷新，请稍等...</p></div></div>}
                {paymentStatus === 'failed' && <div className="space-y-4"><AlertCircle className="w-12 h-12 mx-auto text-danger" /><p>支付异常，请联系客服处理</p></div>}
              </div>
            </div>
          )}
        </ModalBody>
        <ModalFooter>{paymentStatus === 'pending' && !qrCodeExpired && <div className="flex w-full justify-between items-center"><Button variant="light" onPress={handleClose}>取消支付</Button><Button color="success" onPress={handleManualCheck} isLoading={manualCheckLoading}>我已完成支付</Button></div>}</ModalFooter>
      </ModalContent>
    </Modal>
  );
};
