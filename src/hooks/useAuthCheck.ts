/**
 * 用户认证状态检查Hook
 * 检查cookie中的xuserid和xtoken，以及接口返回的code
 */
import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { showMessage } from '../utils/toast';

interface AuthCheckOptions {
    // 是否在组件挂载时立即检查
    checkOnMount?: boolean;
    // 检查失败时是否显示倒计时
    showCountdown?: boolean;
    // 倒计时秒数
    countdownSeconds?: number;
}

export const useAuthCheck = (options: AuthCheckOptions = {}) => {
    const {
        checkOnMount = true,
        showCountdown = true,
        countdownSeconds = 3
    } = options;

    const navigate = useNavigate();
    const [isChecking, setIsChecking] = useState(false);
    const [isAuthenticated, setIsAuthenticated] = useState(true);
    const [countdown, setCountdown] = useState(0);

    // 检查cookie中的认证信息
    const checkCookieAuth = useCallback((): boolean => {
        const xuserid = document.cookie
            .split('; ')
            .find(row => row.startsWith('xuserid='))
            ?.split('=')[1];

        const xtoken = document.cookie
            .split('; ')
            .find(row => row.startsWith('xtoken='))
            ?.split('=')[1];

        return !!(xuserid && xtoken);
    }, []);

    // 处理认证失败
    const handleAuthFailure = useCallback((message: string = '登录状态已过期，请重新登录') => {
        setIsAuthenticated(false);

        if (showCountdown) {
            let timeLeft = countdownSeconds;
            setCountdown(timeLeft);

            // 显示初始提示，持续时间设为倒计时时长，确保用户能看到完整提示
            showMessage.warning(`${message}，${timeLeft}秒后将返回首页`);

            const timer = setInterval(() => {
                timeLeft -= 1;
                setCountdown(timeLeft);

                if (timeLeft <= 0) {
                    clearInterval(timer);
                    navigate('/', { replace: true });
                }
                // 移除每秒的重复提示，只在页面上显示倒计时
            }, 1000);

            return () => clearInterval(timer);
        } else {
            showMessage.error(message);
            navigate('/', { replace: true });
        }
    }, [navigate, showCountdown, countdownSeconds]);

    // 检查接口响应的code
    const checkApiResponse = useCallback((response: any): boolean => {
        if (response && response.code !== undefined && response.code !== 20000) {
            handleAuthFailure('接口返回错误，请重新登录');
            return false;
        }
        return true;
    }, [handleAuthFailure]);

    // 执行完整的认证检查
    const performAuthCheck = useCallback(async (): Promise<boolean> => {
        setIsChecking(true);

        try {
            // 检查cookie
            if (!checkCookieAuth()) {
                handleAuthFailure('未找到登录凭证');
                return false;
            }

            setIsAuthenticated(true);
            return true;
        } catch (error) {
            handleAuthFailure('认证检查失败');
            return false;
        } finally {
            setIsChecking(false);
        }
    }, [checkCookieAuth, handleAuthFailure]);

    // 组件挂载时检查认证状态
    useEffect(() => {
        if (checkOnMount) {
            performAuthCheck();
        }
    }, [checkOnMount, performAuthCheck]);

    return {
        isAuthenticated,
        isChecking,
        countdown,
        checkCookieAuth,
        checkApiResponse,
        performAuthCheck,
        handleAuthFailure
    };
}; 