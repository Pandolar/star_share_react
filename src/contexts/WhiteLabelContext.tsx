import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { siteModeApi } from '../services/userApi';

/**
 * 白牌（分销商反代）模式全局状态
 *
 * 启动时调用 /u/get_site_mode，依据当前访问域名判断站点模式：
 * - normal     自营模式（默认）：完整功能
 * - whitelabel 白牌模式：隐藏品牌名/客服/邀请/微信登录/支付，套餐不显示价格，仅可兑换码激活
 *
 * 所有需要按模式裁剪的组件通过 useWhiteLabel() 读取 isWhiteLabel。
 */
interface WhiteLabelState {
    isWhiteLabel: boolean;
    loading: boolean;
    notice: string;
    noticeId: string;
    enableRegister: boolean;
    purchaseUrl: string;
    customerServiceUrl: string;
}

const defaultState: WhiteLabelState = {
    isWhiteLabel: false,
    loading: true,
    notice: '',
    noticeId: '',
    enableRegister: true,
    purchaseUrl: '',
    customerServiceUrl: '',
};

const WhiteLabelContext = createContext<WhiteLabelState>(defaultState);

export const useWhiteLabel = (): WhiteLabelState => useContext(WhiteLabelContext);

// 同步读取的快照：供 React 树之外（如 axios 拦截器、SDK 初始化）判断使用
let whiteLabelSnapshot = false;
export const getWhiteLabelSnapshot = (): boolean => whiteLabelSnapshot;

interface WhiteLabelProviderProps {
    children: ReactNode;
}

export const WhiteLabelProvider: React.FC<WhiteLabelProviderProps> = ({ children }) => {
    const [state, setState] = useState<WhiteLabelState>(defaultState);

    useEffect(() => {
        let mounted = true;
        (async () => {
            try {
                const res = await siteModeApi.getSiteMode();
                if (!mounted) return;
                if (res.code === 20000 && res.data) {
                    const isWL = res.data.mode === 'whitelabel' || !!res.data.is_white_label;
                    whiteLabelSnapshot = isWL;
                    // 白牌模式：中性化浏览器标签标题，避免暴露自营品牌
                    if (isWL) {
                        try {
                            document.title = '会员中心';
                        } catch {
                            /* noop */
                        }
                    }
                    setState({
                        isWhiteLabel: isWL,
                        loading: false,
                        notice: res.data.notice || '',
                        noticeId: res.data.notice_id || '',
                        enableRegister: res.data.enable_register !== false,
                        purchaseUrl: res.data.purchase_url || '',
                        customerServiceUrl: res.data.customer_service_url || '',
                    });
                    return;
                }
                // 异常响应：安全降级为自营模式
                setState({ ...defaultState, loading: false });
            } catch {
                // 网络错误：安全降级为自营模式，避免白屏
                if (mounted) setState({ ...defaultState, loading: false });
            }
        })();
        return () => {
            mounted = false;
        };
    }, []);

    return <WhiteLabelContext.Provider value={state}>{children}</WhiteLabelContext.Provider>;
};
