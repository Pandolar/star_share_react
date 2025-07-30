import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Spinner } from '@heroui/react';
import { isAuthenticated } from '../config';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // 简单检查本地是否有token
    setIsLoading(false);
  }, []);

  if (isLoading) {
    return (
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        minHeight: '100vh',
        flexDirection: 'column',
        gap: '16px'
      }}>
        <Spinner size="lg" color="primary" />
        <div style={{ color: '#6b7280', fontSize: '14px' }}>验证登录状态...</div>
      </div>
    );
  }

  if (!isAuthenticated()) {
    return <Navigate to="/admin/login" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;