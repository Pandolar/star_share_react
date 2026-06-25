/**
 * Chatwoot 配置管理
 * 从后端 API 获取配置，覆盖默认值
 */

// 默认配置（降级使用）
let chatwootBaseUrl = 'https://chatwoot.foxaigc.com';
let chatwootWebsiteToken = 'ZRAa6tfs39gTE5Mn3R3KDHVj';
let configLoaded = false;

/**
 * 从后端加载 Chatwoot 配置
 */
export async function loadChatwootConfig(): Promise<void> {
    if (configLoaded) return;

    try {
        const response = await fetch('/u/get_public_info');
        if (response.ok) {
            const result = await response.json();
            if (result.code === 20000 && result.data) {
                if (result.data.chatwoot_base_url) {
                    chatwootBaseUrl = result.data.chatwoot_base_url;
                }
                if (result.data.chatwoot_website_token) {
                    chatwootWebsiteToken = result.data.chatwoot_website_token;
                }
                configLoaded = true;
            }
        }
    } catch (error) {
        console.warn('Failed to load Chatwoot config from backend, using default:', error);
    }
}

/**
 * 获取 Chatwoot Base URL
 */
export function getChatwootBaseUrl(): string {
    return chatwootBaseUrl;
}

/**
 * 获取 Chatwoot Website Token
 */
export function getChatwootWebsiteToken(): string {
    return chatwootWebsiteToken;
}

/**
 * 重置配置（用于测试）
 */
export function resetChatwootConfig(): void {
    configLoaded = false;
}
