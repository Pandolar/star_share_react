import React from 'react';
import * as LucideIcons from 'lucide-react';

// 类型定义：支持所有 lucide-react 图标名称
export type LucideIconName = keyof typeof LucideIcons;

// 动态获取 Lucide 图标组件
export const getDynamicIcon = (iconName: string, fallbackIcon: LucideIconName = 'HelpCircle') => {
  // 检查图标名称是否存在于 LucideIcons 中
  if (iconName in LucideIcons) {
    const IconComponent = LucideIcons[iconName as LucideIconName] as React.ComponentType<any>;
    return IconComponent;
  }
  
  // 如果图标不存在，返回备用图标
  console.warn(`图标 "${iconName}" 不存在于 lucide-react 中，使用备用图标 "${fallbackIcon}"`);
  const FallbackIcon = LucideIcons[fallbackIcon] as React.ComponentType<any>;
  return FallbackIcon;
};

// 渲染动态图标的组件
interface DynamicIconProps {
  iconName: string;
  fallbackIcon?: LucideIconName;
  className?: string;
  size?: number | string;
  [key: string]: any; // 支持其他 props
}

export const DynamicIcon: React.FC<DynamicIconProps> = ({ 
  iconName, 
  fallbackIcon = 'HelpCircle',
  className = '',
  size,
  ...props 
}) => {
  const IconComponent = getDynamicIcon(iconName, fallbackIcon);
  
  const iconProps = {
    className,
    ...(size && { size }),
    ...props
  };
  
  return <IconComponent {...iconProps} />;
};

// 获取所有可用的图标名称列表
export const getAvailableIconNames = (): string[] => {
  return Object.keys(LucideIcons).filter(key => 
    typeof LucideIcons[key as keyof typeof LucideIcons] === 'function'
  );
};

// 检查图标是否存在
export const isValidIconName = (iconName: string): boolean => {
  return iconName in LucideIcons && typeof LucideIcons[iconName as keyof typeof LucideIcons] === 'function';
};

// 常用图标映射（用于提供更好的默认值）
export const commonIconMappings: Record<string, LucideIconName> = {
  // 用户相关
  'user': 'User',
  'users': 'Users',
  'profile': 'UserCircle',
  'account': 'UserCog',
  
  // 通信相关
  'email': 'Mail',
  'phone': 'Phone',
  'message': 'MessageCircle',
  'chat': 'MessageSquare',
  'contact': 'Contact',
  
  // 技术相关
  'api': 'Zap',
  'code': 'Code',
  'terminal': 'Terminal',
  'database': 'Database',
  'server': 'Server',
  
  // 商业相关
  'payment': 'CreditCard',
  'billing': 'Receipt',
  'invoice': 'FileText',
  'money': 'DollarSign',
  'shop': 'ShoppingCart',
  
  // 网络相关
  'internet': 'Globe',
  'network': 'Wifi',
  'cloud': 'Cloud',
  'link': 'Link',
  
  // 功能相关
  'settings': 'Settings',
  'help': 'HelpCircle',
  'info': 'Info',
  'warning': 'AlertTriangle',
  'error': 'AlertCircle',
  'success': 'CheckCircle',
  
  // 社交媒体
  'github': 'Github',
  'twitter': 'Twitter',
  'youtube': 'Youtube',
  'linkedin': 'Linkedin',
  
  // 文件相关
  'file': 'File',
  'document': 'FileText',
  'image': 'Image',
  'video': 'Video',
  'download': 'Download',
  'upload': 'Upload',
  
  // 导航相关
  'home': 'Home',
  'menu': 'Menu',
  'search': 'Search',
  'filter': 'Filter',
  'sort': 'ArrowUpDown',
  
  // 状态相关
  'loading': 'Loader2',
  'refresh': 'RefreshCw',
  'sync': 'RotateCcw',
  'lock': 'Lock',
  'unlock': 'Unlock',
};

// 智能图标获取（支持别名映射）
export const getSmartIcon = (iconName: string, fallbackIcon: LucideIconName = 'HelpCircle') => {
  // 首先尝试直接匹配
  if (isValidIconName(iconName)) {
    return getDynamicIcon(iconName, fallbackIcon);
  }
  
  // 尝试小写匹配
  const lowerCaseIcon = iconName.toLowerCase();
  if (lowerCaseIcon in commonIconMappings) {
    return getDynamicIcon(commonIconMappings[lowerCaseIcon], fallbackIcon);
  }
  
  // 尝试驼峰式匹配
  const camelCaseIcon = iconName.charAt(0).toUpperCase() + iconName.slice(1).toLowerCase();
  if (isValidIconName(camelCaseIcon)) {
    return getDynamicIcon(camelCaseIcon, fallbackIcon);
  }
  
  // 最后使用备用图标
  console.warn(`无法找到图标 "${iconName}"，使用备用图标 "${fallbackIcon}"`);
  return getDynamicIcon(fallbackIcon, 'HelpCircle');
}; 