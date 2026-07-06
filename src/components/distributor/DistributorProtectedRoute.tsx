import React, { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import distributorApiService from '../../services/distributorApi';

interface DistributorProtectedRouteProps {
    children: React.ReactNode;
}

/**
 * 分销商路由保护组件
 * 未登录时自动跳转到分销商登录页
 */
const DistributorProtectedRoute: React.FC<DistributorProtectedRouteProps> = ({ children }) => {
    const isLoggedIn = distributorApiService.isLoggedIn();

    useEffect(() => {
        // 定期检查 dtoken 有效性（可选）
        if (isLoggedIn) {
            const interval = setInterval(() => {
                if (!distributorApiService.isLoggedIn()) {
                    window.location.href = '/distributor/login';
                }
            }, 60000); // 每分钟检查一次

            return () => clearInterval(interval);
        }
    }, [isLoggedIn]);

    if (!isLoggedIn) {
        return <Navigate to="/distributor/login" replace />;
    }

    return <>{children}</>;
};

export default DistributorProtectedRoute;
