import { SEOConfig } from '../types/seo';

// 基础SEO配置
export const baseSEOConfig: SEOConfig = {
    title: 'NiceAIGC - 智能AI解决方案平台',
    description: 'NiceAIGC为用户提供智能、高效、便捷的AI解决方案。包含最新AI模型、原生应用和技术更新。',
    keywords: 'AIGC, ChatGPT, Claude, Gemini, DeepSeek, 智能平台, 智能AI解决方案',

    // Open Graph配置
    ogTitle: 'NiceAIGC - 智能AI解决方案平台',
    ogDescription: '探索最新AI模型与应用，提升您的创作与工作效率',
    ogImage: '/favicon.ico',

    // 技术SEO
    robots: 'index, follow'
};

// 首页SEO配置
export const homeSEOConfig: SEOConfig = {
    title: 'NiceAIGC - 智能AI解决方案平台 | 最新AI模型与应用',
    description: '探索NiceAIGC智能AI平台，获取最新AI模型、原生应用和技术更新。提供GPT、Claude、Midjourney等主流AI工具，助力您的创作与工作效率。',
    keywords: 'NiceAIGC, AI平台, GPT, Claude, Midjourney, AI模型, 人工智能工具, 智能创作, AI应用',

    ogTitle: 'NiceAIGC - 智能AI解决方案平台',
    ogDescription: '探索最新AI模型与应用，提升您的创作与工作效率',
    ogImage: '/favicon.ico',

    robots: 'index, follow'
}; 