import { useState, useEffect } from 'react';

// 移动端/桌面端布局分界点（宽度，单位 px）。
// 仅以视口宽度为准：触摸屏台式机、带 "Mobile" 关键字的桌面浏览器等不应被误判为移动端竖排。
const MOBILE_BREAKPOINT = 768;

const getIsMobile = (): boolean => {
    if (typeof window === 'undefined') return false;
    // 优先使用 matchMedia（更稳定，避免某些浏览器 innerWidth 在缩放/初始化时的偏差）
    if (typeof window.matchMedia === 'function') {
        return window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT}px)`).matches;
    }
    return window.innerWidth <= MOBILE_BREAKPOINT;
};

export const useIsMobile = (): boolean => {
    // 初始值直接按当前视口宽度计算，避免首帧用错误的默认值导致布局闪烁
    const [isMobile, setIsMobile] = useState<boolean>(getIsMobile);

    useEffect(() => {
        if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
            // 退化路径：监听 resize
            const onResize = () => setIsMobile(getIsMobile());
            onResize();
            window.addEventListener('resize', onResize);
            return () => window.removeEventListener('resize', onResize);
        }

        const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT}px)`);
        const onChange = () => setIsMobile(mql.matches);
        // 同步一次，防止挂载前宽度已变化
        onChange();

        // Safari < 14 不支持 addEventListener('change')，需兼容 addListener
        if (typeof mql.addEventListener === 'function') {
            mql.addEventListener('change', onChange);
            return () => mql.removeEventListener('change', onChange);
        }
        mql.addListener(onChange);
        return () => mql.removeListener(onChange);
    }, []);

    return isMobile;
};
