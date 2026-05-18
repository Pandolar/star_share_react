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
import { CheckCircle, AlertCircle, QrCode } from 'lucide-react';
import { orderUserApi } from '../../../../services/userApi';
import { useIsMobile } from '../../../../hooks/useIsMobile';
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
  const isMobileDevice = useIsMobile();
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('pending');
  const [qrCodeExpired, setQrCodeExpired] = useState(false);
  const [manualCheckLoading, setManualCheckLoading] = useState(false);
  const [showInlineQRCode, setShowInlineQRCode] = useState(false);

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

  // 弹窗打开 + 有订单时，启动状态检查 + 二维码 5 分钟过期计时
  useEffect(() => {
    if (!isOpen || !orderInfo?.order_id) return;

    setPaymentStatus('pending');
    setQrCodeExpired(false);
    setShowInlineQRCode(false);

    // 5 分钟二维码过期
    qrTimerRef.current = setTimeout(() => {
      setQrCodeExpired(true);
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
        checkIntervalRef.current = null;
      }
    }, 5 * 60 * 1000);

    // 轮询支付状态
    checkIntervalRef.current = setInterval(async () => {
      try {
        const response = await orderUserApi.getPayStatus(orderInfo.order_id);
        const data = response.data as { success?: boolean } | undefined;
        if (data && data.success === true) {
          setPaymentStatus('success');
          if (checkIntervalRef.current) {
            clearInterval(checkIntervalRef.current);
            checkIntervalRef.current = null;
          }
          if (qrTimerRef.current) clearTimeout(qrTimerRef.current);
          setTimeout(() => window.location.reload(), 2000);
        } else if (data && data.success === false) {
          // 继续轮询
        } else {
          setPaymentStatus('failed');
          if (checkIntervalRef.current) {
            clearInterval(checkIntervalRef.current);
            checkIntervalRef.current = null;
          }
        }
      } catch {
        // 忽略，继续下次轮询
      }
    }, 1500);

    return cleanup;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, orderInfo?.order_id]);

  const handleManualCheck = async () => {
    if (!orderInfo?.order_id) return;
    try {
      setManualCheckLoading(true);
      const response = await orderUserApi.forceGetPayStatus(orderInfo.order_id);
      const data = response.data as { success?: boolean } | undefined;
      if (data && data.success === true) {
        setPaymentStatus('success');
        cleanup();
        setTimeout(() => window.location.reload(), 2000);
      } else {
        alert('请确认是否已支付，若确认支付但仍无反应，请联系客服，我们会加急处理您的问题');
      }
    } catch {
      alert('请确认是否已支付，若确认支付但仍无反应，请联系客服，我们会加急处理您的问题');
    } finally {
      setManualCheckLoading(false);
    }
  };

  const handleClose = () => {
    cleanup();
    setPaymentStatus('pending');
    setQrCodeExpired(false);
    setShowInlineQRCode(false);
    setManualCheckLoading(false);
    onClose();
  };

  const handleOpenPaymentWindow = () => {
    if (!orderInfo?.payment_url) return;
    window.open(orderInfo.payment_url, '_blank');
  };

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

              {/* 支付状态 */}
              <div className="text-center">
                {paymentStatus === 'pending' && (
                  <div className="space-y-3">
                    {isMobileDevice ? (
                      <div className="space-y-4">
                        <div className="flex items-center justify-center gap-2">
                          <QrCode className="w-5 h-5 text-primary" />
                          <span className="text-base font-medium">
                            可直接在本页扫码支付，也可新窗口打开支付页
                          </span>
                        </div>
                        <div className="text-sm text-default-500 space-y-2">
                          <p>若当前设备无法弹出新窗口，请直接在本页显示二维码支付。</p>
                        </div>

                        <div className="flex flex-wrap gap-3 justify-center">
                          {getQRCodeValue(orderInfo) && (
                            <Button
                              color="secondary"
                              variant={showInlineQRCode ? 'solid' : 'flat'}
                              onPress={() => setShowInlineQRCode((s) => !s)}
                              className="min-w-40"
                            >
                              {showInlineQRCode ? '二维码已显示，请直接扫码付款' : '直接显示二维码'}
                            </Button>
                          )}
                          {orderInfo?.payment_url && (
                            <Button color="primary" variant="flat" onPress={handleOpenPaymentWindow} className="min-w-32">
                              新窗口支付
                            </Button>
                          )}
                          <Button
                            color="success"
                            variant="flat"
                            onPress={() => {
                              setPaymentStatus('success');
                              setTimeout(() => window.location.reload(), 1000);
                            }}
                            className="min-w-20"
                          >
                            已支付
                          </Button>
                          <Button color="default" variant="light" onPress={handleClose} className="min-w-20">
                            未支付
                          </Button>
                        </div>

                        {showInlineQRCode && getQRCodeValue(orderInfo) && (
                          <div className="rounded-2xl border border-primary/15 bg-default-50 px-4 py-5">
                            <div className="flex justify-center">
                              <Card className="p-4 relative shadow-sm">
                                <motion.img
                                  src={generateQRCodeDataUrl(getQRCodeValue(orderInfo))}
                                  alt="支付二维码"
                                  className={`w-40 h-40 sm:w-48 sm:h-48 transition-all duration-500 ${qrCodeExpired ? 'opacity-30 grayscale' : ''}`}
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
                            <p className="mt-3 text-xs leading-6 text-default-500 text-center">
                              当前设备若无法直接拉起支付页面，可截图保存该二维码后，在微信或支付宝内识别扫码支付。
                            </p>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="flex items-center justify-center gap-2">
                          <QrCode className="w-5 h-5 text-primary" />
                          <span className="text-base font-medium">
                            {orderInfo.pay_type === 'wxpay' ? '请使用微信扫码支付' : '请扫码支付'}
                          </span>
                        </div>
                        <div className="text-sm text-default-500">
                          <p className="mb-1">二维码5分钟内有效</p>
                          {qrCodeExpired && (
                            <p className="text-danger font-medium">二维码已过期，请重新创建订单</p>
                          )}
                        </div>

                        <div className="mt-3">
                          <Button
                            size="sm"
                            variant="light"
                            color="primary"
                            onPress={handleManualCheck}
                            isLoading={manualCheckLoading}
                            isDisabled={qrCodeExpired}
                            className="text-xs h-8"
                          >
                            付款后没有反应？请点这里
                          </Button>
                        </div>
                      </div>
                    )}
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
                      <h3 className="text-lg font-semibold text-danger mb-2">支付失败</h3>
                      <p className="text-default-500 text-sm">请重试或联系客服</p>
                    </div>
                  </div>
                )}
              </div>

              {/* 二维码 - 仅桌面端显示 */}
              {orderInfo.qr_code && paymentStatus === 'pending' && !isMobileDevice && (
                <div className="flex justify-center px-2">
                  <Card className="p-4 sm:p-6 relative max-w-full">
                    <motion.img
                      src={generateQRCodeDataUrl(getQRCodeValue(orderInfo))}
                      alt="支付二维码"
                      className={`w-40 h-40 sm:w-48 sm:h-48 transition-all duration-500 max-w-full ${qrCodeExpired ? 'opacity-30 grayscale' : ''}`}
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
            <Button color="danger" variant="light" onPress={handleClose}>
              取消支付
            </Button>
          )}
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};
