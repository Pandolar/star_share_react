/**
 * Cookie 工具函数
 */

import { domainConfig } from '../config/domains';

export interface CookieOptions {
    days?: number;
    path?: string;
    // 当未提供时，不设置 Domain 属性，从而成为“仅当前域名”的 Host-Only Cookie
    domain?: string;
}

// 备注：过去默认把 Cookie 写到主域名（.example.com），
// 这样子域名也能读取。为了只在“当前域名”检测，改为默认写 Host-Only。
// 如果业务需要写到主域名，可在调用 setCookie 时传入 { domain: '.example.com' }。

/**
 * 设置 Cookie
 */
export const setCookie = (name: string, value: string, options: CookieOptions = {}): void => {
    const { days = 14, path = '/', domain } = options;

    const date = new Date();
    date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
    const expires = `expires=${date.toUTCString()}`;

    // 默认不带 domain，写为 Host-Only Cookie；如有需要，可显式传入 domain
    const domainPart = domain ? `; domain=${domain}` : '';
    // 对 value 做编码，避免特殊字符破坏 cookie
    document.cookie = `${name}=${encodeURIComponent(value)}; ${expires}; path=${path}${domainPart}`;
};

/**
 * 获取 Cookie 值
 */
export const getCookie = (name: string): string | null => {
    const cookieArr = document.cookie.split(';');

    for (let i = 0; i < cookieArr.length; i++) {
        const cookie = cookieArr[i].trim();
        if (cookie.startsWith(`${name}=`)) {
            try {
                return decodeURIComponent(cookie.substring(name.length + 1));
            } catch {
                return cookie.substring(name.length + 1);
            }
        }
    }

    return null;
};

/**
 * 删除 Cookie
 */
export const deleteCookie = (name: string, options: Omit<CookieOptions, 'days'> = {}): void => {
    const { path = '/', domain = domainConfig.cookieDomain } = options;
    // 同时尝试删除 host-only 与 主域名 两种形式，确保彻底清理
    const expires = 'Thu, 01 Jan 1970 00:00:00 UTC';
    // host-only
    document.cookie = `${name}=; path=${path}; expires=${expires}`;
    // 主域名
    if (domain) {
        document.cookie = `${name}=; path=${path}; expires=${expires}; domain=${domain}`;
    }
};

/**
 * 清除所有认证相关的 Cookies
 */
export const clearAuthCookies = (): void => {
    const cookieNames = ['xuserid', 'xtoken', 'xy_uuid_token', 'cas_access_token'];

    cookieNames.forEach(name => {
        deleteCookie(name);
    });
};

/**
 * 设置认证 Cookies
 */
export const setAuthCookies = (cookies: {
    xuserid?: string;
    xtoken?: string;
    xy_uuid_token?: string;
    cas_access_token?: string;
}): void => {
    const { xuserid, xtoken, xy_uuid_token, cas_access_token } = cookies;
    // 兼容性策略：同时写入“当前域名的 Host-Only Cookie”和“主域名 Cookie”
    if (xuserid) {
        setCookie('xuserid', xuserid); // host-only（当前域名）
        setCookie('xuserid', xuserid, { domain: domainConfig.cookieDomain }); // 主域名（跨子域）
    }
    if (xtoken) {
        setCookie('xtoken', xtoken);
        setCookie('xtoken', xtoken, { domain: domainConfig.cookieDomain });
    }
    if (xy_uuid_token) {
        setCookie('xy_uuid_token', xy_uuid_token);
        setCookie('xy_uuid_token', xy_uuid_token, { domain: domainConfig.cookieDomain });
    }
    if (cas_access_token) {
        setCookie('cas_access_token', cas_access_token);
        setCookie('cas_access_token', cas_access_token, { domain: domainConfig.cookieDomain });
    }
};
