import { useState, useEffect } from 'react';

export const useIsMobile = (): boolean => {
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const checkIsMobile = () => {
            // 检查用户代理字符串
            const userAgent = navigator.userAgent.toLowerCase();
            const mobileKeywords = ['mobile', 'android', 'iphone', 'ipad', 'ipod', 'blackberry', 'windows phone'];
            const isMobileUserAgent = mobileKeywords.some(keyword => userAgent.includes(keyword));

            // 检查屏幕宽度（768px 通常是移动端和桌面端的分界点）
            const isMobileScreen = window.innerWidth <= 768;

            // 检查触摸设备
            const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

            // 综合判断：用户代理包含移动设备关键词 或 屏幕宽度小于768px 或 是触摸设备
            setIsMobile(isMobileUserAgent || isMobileScreen || isTouchDevice);
        };

        // 初始检查
        checkIsMobile();

        // 监听窗口大小变化
        const handleResize = () => {
            checkIsMobile();
        };

        window.addEventListener('resize', handleResize);

        // 清理事件监听器
        return () => {
            window.removeEventListener('resize', handleResize);
        };
    }, []);

    return isMobile;
}; 