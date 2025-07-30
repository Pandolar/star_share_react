/**
 * 通用状态标签组件
 * 提供统一的状态显示样式
 */
import React from 'react';
import { Chip } from '@heroui/react';

export type StatusType = 'active' | 'inactive' | 'pending' | 'success' | 'warning' | 'danger';

interface StatusChipProps {
  /** 状态类型 */
  status: StatusType;
  /** 显示文本 */
  text: string;
  /** 尺寸大小 */
  size?: 'sm' | 'md' | 'lg';
  /** 变体样式 */
  variant?: 'solid' | 'bordered' | 'light' | 'flat' | 'faded' | 'shadow';
}

// 状态映射配置
const statusConfig: Record<StatusType, {
  color: 'success' | 'warning' | 'danger' | 'default' | 'primary' | 'secondary';
  defaultText: string;
}> = {
  active: { color: 'success', defaultText: '活跃' },
  inactive: { color: 'default', defaultText: '非活跃' },
  pending: { color: 'warning', defaultText: '待处理' },
  success: { color: 'success', defaultText: '成功' },
  warning: { color: 'warning', defaultText: '警告' },
  danger: { color: 'danger', defaultText: '错误' }
};

export const StatusChip: React.FC<StatusChipProps> = ({
  status,
  text,
  size = 'sm',
  variant = 'flat'
}) => {
  const config = statusConfig[status];
  
  return (
    <Chip
      color={config.color}
      size={size}
      variant={variant}
      className="transition-fast"
    >
      {text || config.defaultText}
    </Chip>
  );
};

export default StatusChip;