import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Button,
  Card,
  CardBody,
  Chip,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  Progress,
} from '@heroui/react';
import { motion } from 'framer-motion';
import {
  CheckCircle2,
  Clock3,
  ExternalLink,
  QrCode,
  RefreshCw,
  TriangleAlert,
} from 'lucide-react';
import { orderUserApi, TeamCheckout } from '../../../../services/userApi';
import { celebrateSuccess } from '../../../../utils/confetti';
import { getCheckoutRemainingMs } from '../subscription/checkoutExpiry';
import { generateQRCodeDataUrl } from '../subscription/qrCode';

interface TeamPaymentModalProps {
  isOpen: boolean;
  checkout: TeamCheckout | null;
  onClose: () => void;
  onSuccess: () => void | Promise<void>;
  onExpired: () => void | Promise<void>;
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

export const TeamPaymentModal: React.FC<TeamPaymentModalProps> = ({
  isOpen,
  checkout,
  onClose,
  onSuccess,
  onExpired,
}) => {
  const [paymentState, setPaymentState] = useState<PaymentState>('pending');
  const [remainingMs, setRemainingMs] = useState(0);
  const [manualChecking, setManualChecking] = useState(false);
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
    if (!isOpen || !checkout?.checkout_id || paymentState !== 'pending') return;
    void checkStatus();
    const polling = window.setInterval(() => void checkStatus(), 1800);
    return () => window.clearInterval(polling);
  }, [checkStatus, checkout?.checkout_id, isOpen, paymentState]);

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

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg" placement="center" scrollBehavior="inside">
      <ModalContent>
        <ModalHeader className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success-50 text-success-600">
            <QrCode className="h-5 w-5" />
          </div>
          <div>
            <div className="text-lg font-semibold">团队订阅付款</div>
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
                    <p className="text-xs text-default-500">应付金额</p>
                    <p className="mt-1 font-semibold text-danger">¥{checkout?.payable_amount || '--'}</p>
                  </div>
                </CardBody>
              </Card>

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
                  <div className="flex h-52 w-52 items-center justify-center rounded-lg border border-dashed border-default-300 text-center text-sm text-default-500">
                    支付链接暂不可用<br />请关闭后重新生成
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Clock3 className="h-4 w-4 text-warning-600" />
                  <span className="text-sm text-default-600">请在 {formatCountdown(remainingMs)} 内完成支付</span>
                  {paymentState === 'failed' && <Chip size="sm" color="warning" variant="flat">查询失败，可重试</Chip>}
                </div>
                <Progress
                  aria-label="支付订单剩余时间"
                  value={progressValue}
                  color={progressValue < 20 ? 'warning' : 'primary'}
                  size="sm"
                  className="max-w-sm"
                />
                {checkout?.payment_url && (
                  <Button
                    as="a"
                    href={checkout.payment_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    variant="flat"
                    color="primary"
                    endContent={<ExternalLink className="h-4 w-4" />}
                  >
                    打开支付页面
                  </Button>
                )}
              </div>
            </div>
          )}
        </ModalBody>
        <ModalFooter>
          <Button variant="light" onPress={onClose}>
            {paymentState === 'success' ? '完成' : '稍后支付'}
          </Button>
          {(paymentState === 'pending' || paymentState === 'failed') && (
            <Button
              color="success"
              onPress={handleManualCheck}
              isLoading={manualChecking}
              startContent={!manualChecking && <RefreshCw className="h-4 w-4" />}
            >
              我已完成支付
            </Button>
          )}
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};
