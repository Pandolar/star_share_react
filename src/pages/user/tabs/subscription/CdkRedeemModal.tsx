import React, { useEffect, useState } from 'react';
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Input,
} from '@heroui/react';
import { motion } from 'framer-motion';
import { CheckCircle, AlertCircle } from 'lucide-react';
import { exchangeUserApi } from '../../../../services/userApi';
import { celebrateSuccess } from '../../../../utils/confetti';

interface CdkRedeemModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialCdk?: string;
}

export const CdkRedeemModal: React.FC<CdkRedeemModalProps> = ({ isOpen, onClose, initialCdk }) => {
  const [cdkValue, setCdkValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'failed'>('idle');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (isOpen) {
      setCdkValue(initialCdk || '');
      setStatus('idle');
      setMessage('');
      setLoading(false);
    }
  }, [isOpen, initialCdk]);

  useEffect(() => {
    if (status === 'success') celebrateSuccess();
  }, [status]);

  const handleRedeem = async () => {
    const cdk = cdkValue.trim();
    if (!cdk) {
      setStatus('failed');
      setMessage('请输入有效的CDK');
      return;
    }
    try {
      setLoading(true);
      setStatus('idle');
      setMessage('');
      const res = await exchangeUserApi.exchangeCdk(cdk);
      if (res.code === 20000) {
        setStatus('success');
        setMessage('兑换成功，正在刷新页面...');
        setTimeout(() => window.location.reload(), 2500);
      } else {
        setStatus('failed');
        setMessage(res.msg || '兑换失败');
      }
    } catch (err) {
      setStatus('failed');
      setMessage(err instanceof Error ? err.message : '兑换失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="md"
      scrollBehavior="inside"
      classNames={{
        base: 'max-h-[80vh]',
        body: 'py-6',
        footer: 'sticky bottom-0 bg-background border-t border-divider',
      }}
    >
      <ModalContent>
        <ModalHeader>
          <div>
            <h2 className="text-xl font-bold">兑换激活码 CDK</h2>
            <p className="text-sm text-default-500 mt-1">输入您获得的 CDK 激活码，兑换相应权益</p>
          </div>
        </ModalHeader>
        <ModalBody>
          {status === 'success' ? (
            <div className="text-center space-y-4 py-4">
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', duration: 0.6 }}>
                <CheckCircle className="w-16 h-16 mx-auto text-success" />
              </motion.div>
              <p className="text-success font-semibold">{message || '兑换成功'}</p>
            </div>
          ) : (
            <div className="space-y-4">
              <Input
                label="激活码"
                placeholder="请输入CDK，例如：XXXX-XXXX-XXXX"
                value={cdkValue}
                onValueChange={setCdkValue}
                isDisabled={loading}
                isRequired
              />
              {status === 'failed' && (
                <div className="flex items-center gap-2 text-danger text-sm">
                  <AlertCircle className="w-4 h-4" />
                  <span>{message}</span>
                </div>
              )}
              <div className="flex md:hidden justify-end">
                <Button variant="light" size="sm" onPress={handleRedeem} isLoading={loading}>
                  确认兑换
                </Button>
              </div>
            </div>
          )}
        </ModalBody>
        <ModalFooter>
          {status !== 'success' ? (
            <>
              <Button variant="light" onPress={onClose} isDisabled={loading}>
                取消
              </Button>
              <Button variant="light" onPress={handleRedeem} isLoading={loading}>
                确认兑换
              </Button>
            </>
          ) : (
            <Button color="primary" onPress={onClose}>
              关闭
            </Button>
          )}
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};
