import React from 'react';
import * as LucideIcons from 'lucide-react';

type LucideIconName = keyof typeof LucideIcons;

interface DynamicIconProps {
  iconName: string;
  fallbackIcon?: LucideIconName;
  className?: string;
  size?: number | string;
  [key: string]: any;
}

export const DynamicIcon: React.FC<DynamicIconProps> = ({
  iconName,
  fallbackIcon = 'HelpCircle',
  className = '',
  size,
  ...props
}) => {
  const IconComponent = (iconName in LucideIcons
    ? LucideIcons[iconName as LucideIconName]
    : LucideIcons[fallbackIcon]) as React.ComponentType<any>;

  return <IconComponent className={className} {...(size && { size })} {...props} />;
};
