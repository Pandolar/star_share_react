/**
 * 通用加载组件
 * 提供统一的加载状态显示
 */
import React from 'react';
import { Spinner } from '@heroui/react';

interface LoadingSpinnerProps {
  /** 加载提示文本 */
  text?: string;
  /** 尺寸大小 */
  size?: 'sm' | 'md' | 'lg';
  /** 是否全屏显示 */
  fullScreen?: boolean;
  /** 自定义类名 */
  className?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  text = '加载中...',
  size = 'md',
  fullScreen = false,
  className = ''
}) => {
  const containerClass = fullScreen 
    ? 'flex-center min-h-screen bg-white/80 backdrop-blur-sm' 
    : 'flex-center p-8';

  return (
    <div className={`${containerClass} ${className}`}>
      <div className="flex-center flex-col gap-4">
        <Spinner size={size} color="primary" />
        {text && (
          <p 
            className="text-sm text-default-500"
            style={{ fontSize: '14px', color: 'var(--color-default-500)' }}
          >
            {text}
          </p>
        )}
      </div>
    </div>
  );
};

export default LoadingSpinner;