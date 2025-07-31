/**
 * 域名配置文件
 * 在这里修改所有相关的域名设置
 */

export interface DomainConfig {
    // 主域名设置
    mainDomain: string;
    cookieDomain: string;

    // API 端点
    apiBaseUrl: string;
    loginApiUrl: string;
    userInfoApiUrl: string;

    // 静态资源域名
    staticDomain: string;

    // 跳转目标域名配置
    redirectTargets: Record<string, string>;

    // 默认跳转路径
    defaultRedirectPath: string;

    // 登录相关路径
    loginPath: string;
    callbackPath: string;

    // Casdoor 域名
    casdoorDomain: string;
}

/**
 * 默认域名配置
 * 修改这里的值来更改域名设置
 */
export const domainConfig: DomainConfig = {
    // 主域名
    mainDomain: 'niceaigc.com',

    // Cookie 作用域域名
    cookieDomain: '.niceaigc.com',

    // API 基础URL
    apiBaseUrl: 'https://niceaigc.com',

    // 登录API URL
    loginApiUrl: 'https://niceaigc.com/u/login',

    // 用户信息API URL
    userInfoApiUrl: 'https://niceaigc.com/u/get_user_info',

    // 静态资源域名
    staticDomain: 'https://niceaigc.com',

    // 跳转目标域名配置
    redirectTargets: {
        'share': 'https://share.niceaigc.com/',
        'zz': 'aa',
        // 在这里添加更多跳转目标
        // 'admin': 'https://admin.niceaigc.com/',
        // 'api': 'https://api.niceaigc.com/',
    },

    // 默认跳转路径（当没有指定domain参数时）
    defaultRedirectPath: '/',

    // 登录页面路径
    loginPath: '/admin/login',

    // 回调处理路径
    callbackPath: '/handle_callback',

    // Casdoor 域名
    casdoorDomain: 'https://casdoor.niceaigc.com',
};

/**
 * 获取完整的API URL
 */
export const getApiUrl = (endpoint: string): string => {
    return `${domainConfig.apiBaseUrl}${endpoint}`;
};

/**
 * 获取静态资源URL
 */
export const getStaticUrl = (path: string): string => {
    return `${domainConfig.staticDomain}${path}`;
};

/**
 * 获取跳转目标URL
 */
export const getRedirectTarget = (domain: string): string => {
    return domainConfig.redirectTargets[domain] || domainConfig.defaultRedirectPath;
};

/**
 * 获取登录回调URL
 */
export const getLoginCallbackUrl = (): string => {
    return getStaticUrl(domainConfig.callbackPath);
};

/**
 * 获取 Casdoor 注销 URL
 */
export const getCasdoorLogoutUrl = (redirectUri: string, casAccessToken?: string): string => {
    let logoutUrl = `${domainConfig.casdoorDomain}/api/logout?post_logout_redirect_uri=${encodeURIComponent(redirectUri)}`;

    if (casAccessToken) {
        logoutUrl += `&id_token_hint=${encodeURIComponent(casAccessToken)}`;
    }

    return logoutUrl;
}; 