/**
 * 认证服务
 */

import { domainConfig, getLoginCallbackUrl, getRedirectTarget } from '../config/domains';

export interface UserInfo {
    code: number;
    msg?: string;
    data?: any;
}

export interface LoginUrlResponse {
    code: number;
    msg?: string;
    data?: string;
}

/**
 * 获取用户信息
 */
export const getUserInfo = async (xuserid: string, xtoken: string): Promise<UserInfo> => {
    const response = await fetch(domainConfig.userInfoApiUrl, {
        method: 'GET',
        headers: { xuserid, xtoken },
    });
    return await response.json();
};

/**
 * 获取登录 URL
 */
export const getLoginUrl = async (fromUrl: string, domain: string): Promise<LoginUrlResponse> => {
    const response = await fetch(
        `${domainConfig.loginApiUrl}?from_url=${encodeURIComponent(fromUrl)}&domain=${encodeURIComponent(domain)}`
    );
    return await response.json();
};

/**
 * 跳转到登录页面
 */
export const redirectToLogin = async (): Promise<void> => {
    const fromUrl = getLoginCallbackUrl();
    try {
        const result = await getLoginUrl(fromUrl, 'share');
        if (result.code === 20000 && result.data) {
            window.location.href = result.data;
            return;
        }
    } catch {
        // fall through to default
    }
    window.location.href = domainConfig.loginPath;
};

/**
 * 根据域名进行跳转
 */
export const redirectByDomain = (domain: string): void => {
    window.location.href = getRedirectTarget(domain);
};
