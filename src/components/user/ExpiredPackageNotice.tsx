import React from 'react';
import { Alert, Button } from '@heroui/react';
import { useNavigate } from 'react-router-dom';

export interface ExpiredPackageInfo {
  name: string;
  level?: string;
  expires_at: string;
  expired_days?: number;
}

export default function ExpiredPackageNotice({ expired }: { expired?: ExpiredPackageInfo | null }): React.ReactElement | null {
  const navigate = useNavigate();
  if (!expired) return null;
  const date = new Date(expired.expires_at);
  const formatted = Number.isNaN(date.getTime())
    ? expired.expires_at
    : new Intl.DateTimeFormat('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
  return (
    <Alert
      color="warning"
      variant="flat"
      className="mb-4"
      title="套餐已过期"
      description={`您的「${expired.name}」套餐已于 ${formatted} 过期，续费后即可恢复使用。`}
      endContent={<Button size="sm" color="warning" onPress={() => navigate('/user-center?tab=subscription')}>去续费</Button>}
    />
  );
}
