/**
 * 退出登录确认弹窗组件
 */
import React from 'react';
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button
} from '@heroui/react';
import { LogOut, AlertTriangle } from 'lucide-react';
import { motion } from 'framer-motion';

interface LogoutConfirmModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

export const LogoutConfirmModal: React.FC<LogoutConfirmModalProps> = ({
  isOpen,
  onOpenChange,
  onConfirm
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      size="md"
      placement="center"
      classNames={{
        backdrop: "bg-black/50 backdrop-blur-sm",
        base: "border-none shadow-2xl",
        header: "border-b border-gray-200",
        footer: "border-t border-gray-200",
      }}
    >
      <ModalContent>
        {(onClose) => (
          <>
            <ModalHeader className="flex flex-col gap-1 text-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", duration: 0.3 }}
                className="flex justify-center mb-2"
              >
                <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6 text-orange-600" />
                </div>
              </motion.div>
              <h3 className="text-xl font-semibold text-gray-900">确认退出登录</h3>
            </ModalHeader>
            
            <ModalBody className="text-center">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.1 }}
              >
                <p className="text-gray-600 mb-3">
                  您确定要退出登录吗？
                </p>
                <p className="text-sm text-gray-500">
                  这将清除您的登录状态并跳转到主页
                </p>
              </motion.div>
            </ModalBody>
            
            <ModalFooter className="justify-center gap-3">
              <Button
                variant="light"
                onPress={onClose}
                className="min-w-[100px] font-medium"
              >
                取消
              </Button>
              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Button
                  color="danger"
                  variant="solid"
                  onPress={() => {
                    onConfirm();
                    onClose();
                  }}
                  className="min-w-[100px] font-medium"
                  startContent={<LogOut size={16} />}
                >
                  退出登录
                </Button>
              </motion.div>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
}; 