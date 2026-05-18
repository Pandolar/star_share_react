import React from 'react';
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
} from '@heroui/react';
import { Play } from 'lucide-react';

interface VideoTutorialModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  videoUrl: string;
}

export const VideoTutorialModal: React.FC<VideoTutorialModalProps> = ({
  isOpen,
  onOpenChange,
  videoUrl,
}) => {
  return (
    <Modal isOpen={isOpen} onOpenChange={onOpenChange} size="5xl" hideCloseButton={false} isDismissable>
      <ModalContent
        style={{
          maxWidth: '1200px',
          width: '98vw',
          minWidth: '0',
          padding: 0,
        }}
      >
        {() => (
          <>
            <ModalHeader className="flex items-center gap-2">
              <Play className="w-6 h-6 text-primary" />
              视频教程
            </ModalHeader>
            <ModalBody className="pb-6">
              <div
                className="w-full relative bg-default-100 rounded-lg overflow-hidden"
                style={{
                  aspectRatio: '16/9',
                  minHeight: '220px',
                  maxHeight: '60vw',
                  height: 'auto',
                }}
              >
                <iframe
                  src={videoUrl}
                  title="ChatGPT Plus 充值教程"
                  className="absolute top-0 left-0 w-full h-full"
                  style={{ minHeight: '220px', border: 0 }}
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                />
              </div>
              <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>提示：</strong>观看完整视频教程，了解详细的充值操作流程，确保充值成功。
                </p>
              </div>
            </ModalBody>
          </>
        )}
      </ModalContent>
    </Modal>
  );
};
