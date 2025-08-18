import React, { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Spinner } from '@heroui/react';
import { useAdminAuth } from '../../hooks/useAdminAuth';

interface AdminProtectedRouteProps {
    children: React.ReactNode;
}

const AdminProtectedRoute: React.FC<AdminProtectedRouteProps> = ({ children }) => {
    const { isAuthenticated, isLoading, checkAuth } = useAdminAuth();
    const location = useLocation();

    useEffect(() => {

        // 如果在admin路径下且未认证，重新检查
        if (location.pathname.startsWith('/star-admin') && !isAuthenticated && !isLoading) {
            checkAuth();
        }
    }, [location.pathname, isAuthenticated, isLoading, checkAuth]);


    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center">
                    <Spinner size="lg" color="primary" />
                    <p className="mt-4 text-gray-600">验证身份中...</p>
                </div>
            </div>
        );
    }

    if (!isAuthenticated) {
        return <Navigate to="/star-admin/login" replace />;
    }

    return <>{children}</>;
};

export default AdminProtectedRoute; 