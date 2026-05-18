import React from 'react';
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
} from '@heroui/react';
import { CheckCircle, AlertCircle, ExternalLink, MessageCircle } from 'lucide-react';
import { RechargeUiStatus } from './types';

interface RechargeStatusModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  status: RechargeUiStatus;
  message: string;
  raw: any;
  supportContact: string;
}

export const RechargeStatusModal: React.FC<RechargeStatusModalProps> = ({
  isOpen,
  onOpenChange,
  status,
  message,
  raw,
  supportContact,
}) => {
  return (
    <Modal isOpen={isOpen} onOpenChange={onOpenChange} size="md" hideCloseButton isDismissable={false}>
      <ModalContent>
        {(onClose) => (
          <>
            <ModalHeader className="flex items-center gap-2">
              {status === 'waiting' && '正在充值'}
              {status === 'success' && '充值成功'}
              {status === 'error' && '充值失败'}
            </ModalHeader>
            <ModalBody>
              {status === 'waiting' && (
                <div className="text-center space-y-4">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
                  <p className="text-default-800 font-medium">{message}</p>
                  <p className="text-default-500 text-sm">通常耗时约 10 ~ 60 秒，请耐心等待...</p>
                </div>
              )}
              {status === 'success' && (
                <div className="text-center space-y-4">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                    <CheckCircle className="w-8 h-8 text-green-600" />
                  </div>
                  <p className="text-default-800 font-medium">{message}</p>
                </div>
              )}
              {status === 'error' && (
                <div className="space-y-4">
                  <div className="text-center">
                    <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-2" />
                    <p className="text-red-700 font-semibold">{message}</p>
                    <p className="text-default-500 text-sm">请截图下方返回信息并发送给客服协助处理。</p>
                  </div>
                  <div className="bg-default-50 border border-default-200 rounded-lg p-3 max-h-72 overflow-auto">
                    <pre className="text-xs text-default-800 break-all whitespace-pre-wrap">
                      {JSON.stringify(raw, null, 2)}
                    </pre>
                  </div>
                </div>
              )}
            </ModalBody>
            <ModalFooter>
              {status === 'success' && (
                <>
                  <Button
                    color="primary"
                    as="a"
                    href="https://chatgpt.com/"
                    target="_blank"
                    rel="noopener noreferrer"
                    startContent={<ExternalLink className="w-4 h-4" />}
                  >
                    返回ChatGPT官网
                  </Button>
                  <Button variant="bordered" onPress={onClose}>
                    关闭
                  </Button>
                </>
              )}
              {status === 'waiting' && (
                <Button variant="bordered" isDisabled>
                  正在充值...
                </Button>
              )}
              {status === 'error' && (
                <>
                  <Button
                    variant="flat"
                    as="a"
                    href={supportContact}
                    target="_blank"
                    rel="noopener noreferrer"
                    startContent={<MessageCircle className="w-4 h-4" />}
                  >
                    联系客服
                  </Button>
                  <Button color="primary" onPress={onClose}>
                    我已截图，关闭
                  </Button>
                </>
              )}
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
};
