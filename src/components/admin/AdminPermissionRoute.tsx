import React from 'react';
import { Alert, Button } from '@heroui/react';
import { ShieldX } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAdminAuth } from '../../contexts/AdminAuthContext';

interface AdminPermissionRouteProps {
  permission?: string;
  anyOf?: string[];
  children: React.ReactNode;
}

const AdminPermissionRoute: React.FC<AdminPermissionRouteProps> = ({ permission, anyOf, children }) => {
  const { can, canAny } = useAdminAuth();
  const navigate = useNavigate();
  const allowed = permission ? can(permission) : Boolean(anyOf?.length && canAny(...anyOf));
  if (allowed) return <>{children}</>;
  return (
    <div className="mx-auto max-w-xl py-16">
      <Alert
        color="danger"
        variant="flat"
        title="无权访问此页面"
        description={`当前管理员缺少权限：${permission || anyOf?.join(' / ') || '-'}`}
        startContent={<ShieldX className="h-5 w-5" />}
        endContent={<Button size="sm" color="danger" variant="flat" onPress={() => navigate('/star-admin')}>返回可用首页</Button>}
      />
    </div>
  );
};

export default AdminPermissionRoute;
