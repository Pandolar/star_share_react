import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Spinner } from '@heroui/react';
import { useAdminAuth } from '../../contexts/AdminAuthContext';

interface AdminProtectedRouteProps {
    children: React.ReactNode;
}

const AdminProtectedRoute: React.FC<AdminProtectedRouteProps> = ({ children }) => {
    const { isAuthenticated, isLoading, principal } = useAdminAuth();
    const location = useLocation();

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-default-50">
                <div className="text-center">
                    <Spinner size="lg" color="primary" />
                    <p className="mt-4 text-default-600">验证身份中...</p>
                </div>
            </div>
        );
    }

    if (!isAuthenticated) {
        return <Navigate to="/star-admin/login" replace state={{ from: location.pathname }} />;
    }

    if (principal?.must_change_password && location.pathname !== '/star-admin/security') {
        return <Navigate to="/star-admin/security?forcePassword=1" replace />;
    }

    return <>{children}</>;
};

export default AdminProtectedRoute;