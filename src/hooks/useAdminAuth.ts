import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import adminApiService from '../services/adminApi';

interface UseAdminAuthReturn {
    isAuthenticated: boolean;
    isLoading: boolean;
    checkAuth: () => Promise<boolean>;
    logout: () => void;
}

export const useAdminAuth = (): UseAdminAuthReturn => {
    const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const navigate = useNavigate();

    const checkAuth = async (): Promise<boolean> => {
        const token = localStorage.getItem('admin_token');

        if (!token) {
            setIsAuthenticated(false);
            setIsLoading(false);
            return false;
        }


        try {
            const response = await adminApiService.checkToken();

            if (response.code === 20000) {
                setIsAuthenticated(true);
                setIsLoading(false);
                return true;
            } else {
                // token失效
                localStorage.removeItem('admin_token');
                setIsAuthenticated(false);
                setIsLoading(false);
                return false;
            }
        } catch (error) {
            // Token验证失败
            localStorage.removeItem('admin_token');
            setIsAuthenticated(false);
            setIsLoading(false);
            return false;
        }
    };

    const logout = () => {
        adminApiService.logout();
        setIsAuthenticated(false);
        navigate('/star-admin/login');
    };

    useEffect(() => {
        checkAuth();
    }, []); // 只在组件挂载时检查一次

    return {
        isAuthenticated,
        isLoading,
        checkAuth,
        logout,
    };
}; 