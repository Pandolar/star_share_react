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
import { CheckCircle, AlertCircle, QrCode, ExternalLink } from 'lucide-react';
import { orderUserApi } from '../../../../services/userApi';
import { generateQRCodeDataUrl } from './qrCode';
import { getDurationText, PackageInfo, OrderInfo } from './types';

interface PaymentModalProps {
  isOpen: boolean;
  selectedPackage: PackageInfo | null;
  orderInfo: OrderInfo | null;
  onClose: () => void;
}

type PaymentStatus = 'pending' | 'checking' | 'success' | 'failed';

export const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  selectedPackage,
  orderInfo,
  onClose,
}) => {
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('pending');
  const [qrCodeExpired, setQrCodeExpired] = useState(false);
  const [manualCheckLoading, setManualCheckLoading] = useState(false);

  const checkIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const qrTimerRef = useRef<NodeJS.Timeout | null>(null);

  const getQRCodeValue = (info?: OrderInfo | null) => {
    if (!info) return '';
    return info.qr_code || info.payment_url || '';
  };

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

  useEffect(() => {
    if (!isOpen || !orderInfo?.order_id) return;

    setPaymentStatus('pending');
    setQrCodeExpired(false);

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
          setPaymentStatus('success');
          cleanup();
          setTimeout(() => window.location.reload(), 2000);
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
        setPaymentStatus('success');
        cleanup();
        setTimeout(() => window.location.reload(), 2000);
      } else {
        setPaymentStatus('pending');
        alert('未检测到支付成功，请确认是否已完成付款。若已支付但仍无反应，请联系客服处理。');
      }
    } catch {
      setPaymentStatus('pending');
      alert('查询失败，请稍后重试或联系客服。');
    } finally {
      setManualCheckLoading(false);
    }
  };

  const handleClose = () => {
    cleanup();
    setPaymentStatus('pending');
    setQrCodeExpired(false);
    setManualCheckLoading(false);
    onClose();
  };

  const qrCodeValue = getQRCodeValue(orderInfo);

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

              {/* 支付区域 */}
              <div className="text-center">
                {paymentStatus === 'pending' && !qrCodeExpired && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-center gap-2">
                      <QrCode className="w-5 h-5 text-primary" />
                      <span className="text-base font-medium">
                        {orderInfo.pay_type === 'wxpay' ? '请使用微信扫码支付' : '请扫码支付'}
                      </span>
                    </div>
                    <p className="text-sm text-default-500">二维码 5 分钟内有效，请尽快完成支付</p>

                    {/* 二维码 */}
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

                    <p className="text-xs text-default-400">
                      请使用微信或支付宝扫描上方二维码完成支付
                    </p>

                    {/* 备选：跳转支付页链接 */}
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
                      重新下单
                    </Button>
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
                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', duration: 0.6 }}>
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
                      <h3 className="text-lg font-semibold text-danger mb-2">支付异常</h3>
                      <p className="text-default-500 text-sm">请联系客服处理</p>
                    </div>
                    <Button color="primary" variant="flat" onPress={handleClose}>
                      关闭
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}
        </ModalBody>

        <ModalFooter>
          {paymentStatus === 'pending' && !qrCodeExpired && (
            <div className="flex w-full justify-between items-center">
              <Button color="default" variant="light" onPress={handleClose}>
                取消支付
              </Button>
              <Button
                color="success"
                onPress={handleManualCheck}
                isLoading={manualCheckLoading}
              >
                我已完成支付
              </Button>
            </div>
          )}
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};
