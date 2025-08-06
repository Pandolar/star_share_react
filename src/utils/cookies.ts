/**
 * Cookie 工具函数
 */

import { domainConfig } from '../config/domains';

export interface CookieOptions {
    days?: number;
    path?: string;
    domain?: string;
}

/**
 * 设置 Cookie
 */
/**
 * 获取主域名
 * @returns {string} 主域名
 */
const getMainDomain = (): string => {
  const hostname = window.location.hostname;
  // 排除 localhost 等情况
  if (hostname.includes('localhost') || !hostname.includes('.')) {
    return hostname;
  }
  const parts = hostname.split('.').slice(-2);
  return parts.join('.');
};

/**
 * 设置 Cookie
 */
export const setCookie = (name: string, value: string, options: CookieOptions = {}): void => {
    const { days = 14, path = '/' } = options;
    const domain = options.domain || getMainDomain();

    const date = new Date();
    date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
    const expires = `expires=${date.toUTCString()}`;

    document.cookie = `${name}=${value}; ${expires}; path=${path}; domain=${domain}`;
};

/**
 * 获取 Cookie 值
 */
export const getCookie = (name: string): string | null => {
    const cookieArr = document.cookie.split(';');

    for (let i = 0; i < cookieArr.length; i++) {
        const cookie = cookieArr[i].trim();
        if (cookie.startsWith(`${name}=`)) {
            return cookie.substring(name.length + 1);
        }
    }

    return null;
};

/**
 * 删除 Cookie
 */
export const deleteCookie = (name: string, options: Omit<CookieOptions, 'days'> = {}): void => {
    const { path = '/', domain = domainConfig.cookieDomain } = options;
    document.cookie = `${name}=; path=${path}; expires=Thu, 01 Jan 1970 00:00:00 UTC; domain=${domain}`;
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
    console.log('setAuthCookies', cookies);
    if (xuserid) setCookie('xuserid', xuserid);
    if (xtoken) setCookie('xtoken', xtoken);
    if (xy_uuid_token) setCookie('xy_uuid_token', xy_uuid_token);
    if (cas_access_token) setCookie('cas_access_token', cas_access_token);
}; 