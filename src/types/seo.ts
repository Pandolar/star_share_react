// 简化的SEO配置类型

export interface SEOConfig {
    // 基础SEO信息
    title: string;
    description: string;
    keywords?: string;

    // Open Graph基础标签
    ogTitle?: string;
    ogDescription?: string;
    ogImage?: string;

    // 技术SEO
    canonical?: string;
    robots?: string;
} 