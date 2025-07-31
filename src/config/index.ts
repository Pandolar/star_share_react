/**
 * 配置文件导出入口
 */

import { domainConfig } from './domains';

// 导出域名相关配置
export * from './domains';

// 应用配置
const config = {
    // API 配置
    api: {
        baseURL: '',
        adminPath: '',
        timeout: 10000,
    },

    // 应用配置
    app: {
        title: 'Star Share',
        description: 'AI模型服务平台',
        version: '1.0.0',
        environment: process.env.NODE_ENV || 'development',
    },

    // 路由配置
    routes: {
        home: '/',
        admin: '/admin',
        adminLogin: '/admin/login',
    },

    // 存储配置
    storage: {
        tokenKey: 'admin_token',
        userKey: 'admin_user',
    },

    // 业务配置
    business: {
        // 轮播图自动播放间隔 (毫秒)
        carouselInterval: 3000,
        // 分页默认大小
        pageSize: 10,
        // 上传文件最大大小 (MB)
        maxFileSize: 10,
    },

    // 外部链接配置
    links: {
        openPlatform: `https://api.${domainConfig.mainDomain}/`,
        chatService: `https://share.${domainConfig.mainDomain}/`,
        plusService: `https://goplus.${domainConfig.mainDomain}/`,
        apiDocumentation: `https://api.${domainConfig.mainDomain}/`,
    },

    // postMessage 通信配置（简化版）
    postMessage: {
        // 使用通用目标，无需校验 origin
        enabled: true,
        // 退出登录跳转策略
        logoutRedirect: {
            // 'auto': 自动获取当前页面地址，用户中心跳转到主域名根路径
            // 'custom': 使用自定义URL
            // 'current': 跳转到当前完整地址
            strategy: 'auto',
            // 自定义URL（仅当strategy为'custom'时使用）
            customUrl: '/',
        },
        // 保留兼容性配置
        logoutTargets: ['*'],
        defaultTarget: '*',
    },

    // 开发配置
    development: {
        enableMockAPI: false,
        enableDebugMode: true,
        logLevel: 'info',
    },
};

// 导出配置
export default config;

// 导出特定配置模块
export const { api, app, routes, storage, business, links, postMessage, development } = config;

// 辅助函数：获取完整的管理员API URL
export const getAdminApiUrl = (path: string): string => {
    const baseUrl = api.baseURL.endsWith('/') ? api.baseURL.slice(0, -1) : api.baseURL;
    const adminPath = api.adminPath ? (api.adminPath.startsWith('/') ? api.adminPath : `/${api.adminPath}`) : '';
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return `${baseUrl}${adminPath}${cleanPath}`;
};

// 辅助函数：判断是否为开发环境
export const isDevelopment = (): boolean => {
    return app.environment === 'development';
};

// 辅助函数：判断是否为生产环境
export const isProduction = (): boolean => {
    return app.environment === 'production';
};

// 辅助函数：获取存储的token
export const getStoredToken = (): string | null => {
    return localStorage.getItem(storage.tokenKey);
};

// 辅助函数：设置存储的token
export const setStoredToken = (token: string): void => {
    localStorage.setItem(storage.tokenKey, token);
};

// 辅助函数：清除存储的token
export const clearStoredToken = (): void => {
    localStorage.removeItem(storage.tokenKey);
    localStorage.removeItem(storage.userKey);
};

// 辅助函数：检查是否已登录
export const isAuthenticated = (): boolean => {
    return !!getStoredToken();
};