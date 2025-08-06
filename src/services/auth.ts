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
    try {
        const response = await fetch(domainConfig.userInfoApiUrl, {
            method: 'GET',
            headers: {
                'xuserid': xuserid,
                'xtoken': xtoken,
            },
        });

        return await response.json();
    } catch (error) {
        throw error;
    }
};

/**
 * 获取登录 URL
 */
export const getLoginUrl = async (fromUrl: string, domain: string): Promise<LoginUrlResponse> => {
    try {
        const response = await fetch(
            `${domainConfig.loginApiUrl}?from_url=${encodeURIComponent(fromUrl)}&domain=${encodeURIComponent(domain)}`
        );

        return await response.json();
    } catch (error) {
        throw error;
    }
};

/**
 * 跳转到登录页面
 */
export const redirectToLogin = async (): Promise<void> => {
    const fromUrl = getLoginCallbackUrl();
    const domain = 'share';

    try {
        const result = await getLoginUrl(fromUrl, domain);

        if (result.code === 20000 && result.data) {
            window.location.href = result.data;
        } else {
            // 如果获取登录URL失败，跳转到默认登录页面
            window.location.href = domainConfig.loginPath;
        }
    } catch (error) {
        // 如果请求失败，跳转到默认登录页面
        window.location.href = domainConfig.loginPath;
    }
};

/**
 * 根据域名进行跳转
 */
export const redirectByDomain = (domain: string): void => {
    const targetUrl = getRedirectTarget(domain);
    window.location.href = targetUrl;
}; 