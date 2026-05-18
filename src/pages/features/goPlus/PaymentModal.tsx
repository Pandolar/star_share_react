import React from 'react';
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Textarea,
} from '@heroui/react';
import { AlertCircle, Clock8, Tag } from 'lucide-react';
import { generateQRCodeDataUrl } from './qrCode';
import { formatRemainingTime, OrderInfo } from './types';

interface PaymentModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  orderInfo: OrderInfo | null;
  isQrCodeExpired: boolean;
  remainingTime: number;
  cdkInput: string;
  isCdkLoading: boolean;
  onCdkInputChange: (value: string) => void;
  onPerformCdkRecharge: () => void;
  onCancel: () => void;
  onRefreshPage: () => void;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  onOpenChange,
  orderInfo,
  isQrCodeExpired,
  remainingTime,
  cdkInput,
  isCdkLoading,
  onCdkInputChange,
  onPerformCdkRecharge,
  onCancel,
  onRefreshPage,
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      size="lg"
      hideCloseButton
      isDismissable={false}
    >
      <ModalContent>
        {() => (
          <>
            <ModalHeader className="flex flex-col gap-1">扫码支付</ModalHeader>
            <ModalBody className="text-center">
              {orderInfo && (
                <div className="space-y-6">
                  {/* 二维码区域 */}
                  <div className="relative bg-default-50 p-6 rounded-lg inline-block mx-auto">
                    <img
                      src={generateQRCodeDataUrl(orderInfo.qr_code)}
                      alt="支付二维码"
                      className={`w-48 h-48 mx-auto transition-opacity duration-300 ${isQrCodeExpired ? 'opacity-50' : 'opacity-100'}`}
                    />
                    {isQrCodeExpired && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center bg-white bg-opacity-80 rounded-lg">
                        <div className="text-center p-4">
                          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-2" />
                          <h3 className="text-lg font-semibold text-red-700 mb-1">二维码已过期</h3>
                          <p className="text-sm text-default-600">请刷新页面重新获取</p>
                        </div>
                      </div>
                    )}
                    {!isQrCodeExpired && (
                      <div className="absolute -bottom-4 left-1/2 transform -translate-x-1/2 bg-yellow-400 text-yellow-900 text-xs px-4 py-1.5 rounded-full flex items-center shadow-lg border border-yellow-300 font-semibold transition-all duration-300">
                        <Clock8 className="w-4 h-4 mr-2 text-yellow-700" />
                        <span>
                          剩余时间：<span className="font-bold">{formatRemainingTime(remainingTime)}</span>
                        </span>
                      </div>
                    )}
                  </div>

                  {/* 订单信息卡片 */}
                  <div className="bg-white rounded-xl shadow-sm border border-default-100 overflow-hidden">
                    <div className="p-5 space-y-4">
                      <div className="flex items-center justify-between pb-3 border-b border-default-100">
                        <div className="flex items-center text-default-700">
                          <Tag className="w-4 h-4 mr-2 text-primary" />
                          <span>订单信息</span>
                        </div>
                        <span
                          className={`text-base font-semibold px-4 py-2 rounded-full ${
                            orderInfo.pay_type === 'wxpay'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-blue-100 text-blue-700'
                          }`}
                        >
                          {orderInfo.pay_type === 'wxpay' ? '微信支付' : '支付宝'}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="flex flex-col items-start">
                          <span className="text-xs text-default-500 mb-1">订单号</span>
                          <span className="text-sm font-medium text-default-900 truncate max-w-[150px]">
                            {orderInfo.order_id}
                          </span>
                        </div>
                        <div className="flex flex-col items-start">
                          <span className="text-xs text-default-500 mb-1">套餐名称</span>
                          <span className="text-sm font-medium text-default-900">{orderInfo.package_name}</span>
                        </div>
                        <div className="flex flex-col items-start col-span-2 pt-2">
                          <span className="text-xs text-default-500 mb-1">订单金额</span>
                          <span className="text-xl font-bold text-default-900">{orderInfo.price}元</span>
                        </div>
                      </div>
                      <div
                        className={`p-3 rounded-lg text-sm ${
                          isQrCodeExpired ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-800'
                        }`}
                      >
                        {isQrCodeExpired
                          ? '二维码已过期，请刷新页面重新创建订单'
                          : `请使用${orderInfo.pay_type === 'wxpay' ? '微信' : '支付宝'}扫码支付，支付完成后会自动跳转`}
                      </div>
                    </div>
                  </div>

                  {/* CDK 兑换码 */}
                  <div className="bg-orange-50 rounded-xl shadow-sm border border-orange-200 overflow-hidden">
                    <div className="p-5 space-y-4">
                      <div className="space-y-3">
                        <Textarea
                          label="CDK兑换码"
                          placeholder="如果您已购买了CDK兑换码，可直接进行兑换"
                          value={cdkInput}
                          onChange={(e) => onCdkInputChange(e.target.value)}
                          minRows={1}
                          maxRows={2}
                          className="w-full"
                          variant="bordered"
                          isDisabled={isCdkLoading}
                        />
                        <Button
                          color="warning"
                          onPress={onPerformCdkRecharge}
                          isLoading={isCdkLoading}
                          className="w-full !bg-orange-600 !text-white hover:!bg-orange-700"
                          isDisabled={!cdkInput.trim() || isCdkLoading}
                        >
                          {isCdkLoading ? 'CDK兑换中...' : '使用CDK兑换码'}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </ModalBody>
            <ModalFooter>
              <Button color="danger" variant="bordered" onPress={onCancel}>
                取消支付
              </Button>
              {isQrCodeExpired && (
                <Button color="primary" onPress={onRefreshPage}>
                  刷新页面
                </Button>
              )}
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
};
